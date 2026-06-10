import React, { useState, useEffect, useRef, useCallback } from 'react';
import { collection, doc, getDoc, setDoc, updateDoc, onSnapshot, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Phone, PhoneOff, Mic, MicOff, Loader2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface VoiceCallProps {
  currentUser: 'abbas' | 'fatima';
  otherUser: 'abbas' | 'fatima';
}

export interface VoiceCallHandle {
  startCall: () => Promise<void>;
}

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
  iceCandidatePoolSize: 10,
};

type CallStatus = 'idle' | 'calling' | 'incoming' | 'connected' | 'ended';

const VoiceCall = React.forwardRef<VoiceCallHandle, VoiceCallProps>(({ currentUser, otherUser }, ref) => {
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [callDuration, setCallDuration] = useState(0);

  const callStatusRef = useRef<CallStatus>('idle');
  const callIdRef = useRef<string | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const iceUnsubRef = useRef<(() => void) | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const ringtoneRef = useRef<HTMLAudioElement>(null);
  const callTimeoutRef = useRef<any>(null);
  const durationTimerRef = useRef<any>(null);
  const listenerUnsubRef = useRef<(() => void) | null>(null);

  const setStatus = (s: CallStatus) => {
    callStatusRef.current = s;
    setCallStatus(s);
  };

  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(t);
    }
  }, [error]);

  useEffect(() => {
    if (callStatus === 'incoming') {
      ringtoneRef.current?.play().catch(() => {});
    } else {
      ringtoneRef.current?.pause();
      if (ringtoneRef.current) ringtoneRef.current.currentTime = 0;
    }
    if (callStatus === 'connected') {
      setCallDuration(0);
      durationTimerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
    } else {
      clearInterval(durationTimerRef.current);
    }
    return () => clearInterval(durationTimerRef.current);
  }, [callStatus]);

  const cleanupCall = useCallback(async (deleteFirestore = true) => {
    clearTimeout(callTimeoutRef.current);
    clearInterval(durationTimerRef.current);

    if (iceUnsubRef.current) { iceUnsubRef.current(); iceUnsubRef.current = null; }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.ontrack = null;
      peerConnectionRef.current.onicecandidate = null;
      peerConnectionRef.current.onconnectionstatechange = null;
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;

    if (deleteFirestore && callIdRef.current) {
      try {
        const callRef = doc(db, 'calls', callIdRef.current);
        const snap = await getDoc(callRef);
        if (snap.exists()) await deleteDoc(callRef);
      } catch {}
    }

    callIdRef.current = null;
    setStatus('ended');
    setIsMuted(false);
    setCallDuration(0);

    setTimeout(() => setStatus('idle'), 2000);
  }, []);

  const getMedia = useCallback(async (): Promise<MediaStream | null> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      return stream;
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('تم رفض إذن الميكروفون — يرجى السماح به من إعدادات المتصفح.');
      } else if (err.name === 'NotFoundError') {
        setError('لم يُعثر على ميكروفون — يرجى توصيل ميكروفون والمحاولة مرة أخرى.');
      } else {
        setError('تعذّر الوصول للميكروفون: ' + (err.message || 'خطأ غير متوقع'));
      }
      await cleanupCall(false);
      return null;
    }
  }, [cleanupCall]);

  const createPC = useCallback((stream: MediaStream, id: string, role: 'caller' | 'answerer') => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionRef.current = pc;

    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    pc.ontrack = (e) => {
      if (remoteAudioRef.current) remoteAudioRef.current.srcObject = e.streams[0];
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === 'connected') {
        setStatus('connected');
      } else if (state === 'failed' || state === 'disconnected') {
        setError('انقطع الاتصال — يرجى التحقق من الإنترنت.');
        cleanupCall(true);
      }
    };

    const localCol = role === 'caller' ? 'callerCandidates' : 'answerCandidates';
    const remoteCol = role === 'caller' ? 'answerCandidates' : 'callerCandidates';

    pc.onicecandidate = async (e) => {
      if (!e.candidate || !id) return;
      try {
        const candId = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        await setDoc(doc(db, 'calls', id, localCol, candId), e.candidate.toJSON());
      } catch {}
    };

    const unsub = onSnapshot(collection(doc(db, 'calls', id), remoteCol), (snap) => {
      snap.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(change.doc.data()));
          } catch {}
        }
      });
    });

    iceUnsubRef.current = unsub;
    return pc;
  }, [cleanupCall]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'calls'), (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        const data = change.doc.data();
        const id = change.doc.id;
        const status = callStatusRef.current;

        if (change.type === 'removed') {
          if (callIdRef.current === id && status !== 'idle' && status !== 'ended') {
            await cleanupCall(false);
          }
          return;
        }

        if (data.status === 'ended' && callIdRef.current === id && status !== 'idle' && status !== 'ended') {
          await cleanupCall(false);
          return;
        }

        if (data.target === currentUser && data.type === 'offer' && status === 'idle') {
          callIdRef.current = id;
          setStatus('incoming');
          return;
        }

        if (data.caller === currentUser && data.type === 'answer' && status === 'calling' && callIdRef.current === id) {
          const pc = peerConnectionRef.current;
          if (pc && !pc.currentRemoteDescription) {
            try {
              await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
            } catch (e) {
              setError('فشل الاتصال — يرجى المحاولة مرة أخرى.');
              await cleanupCall(true);
            }
          }
        }
      });
    });
    listenerUnsubRef.current = unsub;
    return () => { unsub(); };
  }, [currentUser, cleanupCall]);

  useEffect(() => {
    return () => {
      listenerUnsubRef.current?.();
      cleanupCall(false);
    };
  }, [cleanupCall]);

  const startCall = useCallback(async () => {
    if (callStatusRef.current !== 'idle') return;
    setStatus('calling');

    const stream = await getMedia();
    if (!stream) return;

    const callRef = doc(collection(db, 'calls'));
    const id = callRef.id;
    callIdRef.current = id;

    const pc = createPC(stream, id, 'caller');

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    await setDoc(callRef, {
      caller: currentUser,
      target: otherUser,
      type: 'offer',
      sdp: offer.toJSON(),
      status: 'pending',
      timestamp: new Date(),
    });

    callTimeoutRef.current = setTimeout(() => {
      if (callStatusRef.current === 'calling') {
        setError('لا يوجد رد — تأكد أن الطرف الآخر متصل.');
        cleanupCall(true);
      }
    }, 40000);
  }, [currentUser, otherUser, getMedia, createPC, cleanupCall]);

  React.useImperativeHandle(ref, () => ({ startCall }), [startCall]);

  const answerCall = useCallback(async () => {
    const id = callIdRef.current;
    if (!id) return;
    setStatus('connected');

    const stream = await getMedia();
    if (!stream) return;

    const pc = createPC(stream, id, 'answerer');

    const callSnap = await getDoc(doc(db, 'calls', id));
    if (!callSnap.exists()) { await cleanupCall(false); return; }

    const offerSdp = callSnap.data()?.sdp;
    await pc.setRemoteDescription(new RTCSessionDescription(offerSdp));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    await updateDoc(doc(db, 'calls', id), {
      type: 'answer',
      sdp: answer.toJSON(),
      status: 'connected',
      caller: callSnap.data()?.caller,
    });
  }, [getMedia, createPC, cleanupCall]);

  const handleEndCall = useCallback(() => cleanupCall(true), [cleanupCall]);

  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return;
    const enabled = !isMuted;
    localStreamRef.current.getAudioTracks().forEach(t => (t.enabled = !enabled));
    setIsMuted(enabled);
  }, [isMuted]);

  const formatDuration = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const otherName = otherUser === 'abbas' ? 'عباس' : 'فاطمة';

  return (
    <div className="fixed bottom-20 right-4 z-50 flex flex-col items-end gap-2">
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-rose-500/90 backdrop-blur-md text-white p-3 pr-4 rounded-2xl shadow-lg flex items-start gap-3 max-w-xs text-right"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="text-sm font-medium leading-relaxed">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {callStatus !== 'idle' && callStatus !== 'ended' && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.85 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="bg-black/85 backdrop-blur-xl p-4 rounded-3xl border border-white/10 shadow-2xl min-w-[280px]"
          >
            {callStatus === 'calling' && (
              <div className="flex items-center gap-3 text-white">
                <Loader2 className="w-5 h-5 animate-spin text-purple-400 flex-shrink-0" />
                <span className="text-sm font-medium flex-1">جاري الاتصال بـ {otherName}…</span>
                <button onClick={handleEndCall} className="w-10 h-10 bg-rose-500 hover:bg-rose-600 rounded-full flex items-center justify-center transition-colors active:scale-90">
                  <PhoneOff className="w-5 h-5" />
                </button>
              </div>
            )}

            {callStatus === 'incoming' && (
              <div className="flex items-center gap-3 text-white">
                <div className="w-9 h-9 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                  <Phone className="w-4 h-4 text-purple-400 animate-pulse" />
                </div>
                <span className="text-sm font-medium flex-1">مكالمة من {otherName}</span>
                <button onClick={answerCall} className="w-10 h-10 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center transition-colors active:scale-90">
                  <Phone className="w-5 h-5" />
                </button>
                <button onClick={handleEndCall} className="w-10 h-10 bg-rose-500 hover:bg-rose-600 rounded-full flex items-center justify-center transition-colors active:scale-90">
                  <PhoneOff className="w-5 h-5" />
                </button>
              </div>
            )}

            {callStatus === 'connected' && (
              <div className="flex items-center gap-3 text-white">
                <div className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{otherName}</p>
                  <p className="text-xs text-white/50">{formatDuration(callDuration)}</p>
                </div>
                <button onClick={toggleMute} className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors active:scale-90 ${isMuted ? 'bg-rose-500/80 hover:bg-rose-500' : 'bg-white/10 hover:bg-white/20'}`}>
                  {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
                <button onClick={handleEndCall} className="w-10 h-10 bg-rose-500 hover:bg-rose-600 rounded-full flex items-center justify-center transition-colors active:scale-90">
                  <PhoneOff className="w-5 h-5" />
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />
      <audio
        ref={ringtoneRef}
        src="data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA="
        loop
        className="hidden"
      />
    </div>
  );
});

VoiceCall.displayName = 'VoiceCall';
export default VoiceCall;
