import React, { useState, useEffect, useRef, useCallback } from 'react';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, onSnapshot, deleteDoc, serverTimestamp } from 'firebase/firestore';
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

const ICE_SERVERS: RTCConfiguration = {
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

const CALL_TIMEOUT_MS = 40000;
const STALE_CALL_MS = 60000;

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
  const callTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const listenerUnsubRef = useRef<(() => void) | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const remoteDescSetRef = useRef(false);

  const setStatus = (s: CallStatus) => {
    callStatusRef.current = s;
    setCallStatus(s);
  };

  // Auto-dismiss errors
  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(t);
    }
  }, [error]);

  // Ringtone + duration timer
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
    } else if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
    return () => {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    };
  }, [callStatus]);

  // Delete ICE candidate subcollections for a given call document
  const deleteSubcollection = useCallback(async (callId: string, subName: string) => {
    try {
      const subRef = collection(doc(db, 'calls', callId), subName);
      const snap = await getDocs(subRef);
      const deletes = snap.docs.map(d => deleteDoc(d.ref));
      await Promise.all(deletes);
    } catch {}
  }, []);

  const cleanupCall = useCallback(async (deleteFirestore = true) => {
    if (callTimeoutRef.current) { clearTimeout(callTimeoutRef.current); callTimeoutRef.current = null; }
    if (durationTimerRef.current) { clearInterval(durationTimerRef.current); durationTimerRef.current = null; }
    if (iceUnsubRef.current) { iceUnsubRef.current(); iceUnsubRef.current = null; }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.ontrack = null;
      peerConnectionRef.current.onicecandidate = null;
      peerConnectionRef.current.onconnectionstatechange = null;
      peerConnectionRef.current.oniceconnectionstatechange = null;
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;

    pendingCandidatesRef.current = [];
    remoteDescSetRef.current = false;

    if (deleteFirestore && callIdRef.current) {
      const id = callIdRef.current;
      try {
        await deleteSubcollection(id, 'callerCandidates');
        await deleteSubcollection(id, 'answerCandidates');
        const callRef = doc(db, 'calls', id);
        const snap = await getDoc(callRef);
        if (snap.exists()) await deleteDoc(callRef);
      } catch {}
    }

    callIdRef.current = null;
    setStatus('ended');
    setIsMuted(false);
    setCallDuration(0);
    setTimeout(() => setStatus('idle'), 2000);
  }, [deleteSubcollection]);

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

  // Flush any ICE candidates that arrived before remote description was set
  const flushPendingCandidates = useCallback(async () => {
    const pc = peerConnectionRef.current;
    if (!pc) return;
    const pending = pendingCandidatesRef.current;
    pendingCandidatesRef.current = [];
    for (const candidate of pending) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {}
    }
  }, []);

  const createPC = useCallback((stream: MediaStream, id: string, role: 'caller' | 'answerer') => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionRef.current = pc;
    remoteDescSetRef.current = false;
    pendingCandidatesRef.current = [];

    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    pc.ontrack = (e) => {
      if (remoteAudioRef.current && e.streams[0]) {
        remoteAudioRef.current.srcObject = e.streams[0];
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === 'connected') {
        if (callTimeoutRef.current) { clearTimeout(callTimeoutRef.current); callTimeoutRef.current = null; }
        setStatus('connected');
      } else if (state === 'failed') {
        setError('فشل الاتصال — يرجى التحقق من الإنترنت والمحاولة مرة أخرى.');
        cleanupCall(true);
      } else if (state === 'disconnected') {
        // Brief disconnection is normal; wait before cleaning up
        callTimeoutRef.current = setTimeout(() => {
          if (peerConnectionRef.current?.connectionState === 'disconnected') {
            setError('انقطع الاتصال.');
            cleanupCall(true);
          }
        }, 5000);
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'failed') {
        pc.restartIce();
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

    // Listen for remote ICE candidates; queue if remote description not yet set
    const unsub = onSnapshot(collection(doc(db, 'calls', id), remoteCol), (snap) => {
      snap.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
          const candidateData = change.doc.data() as RTCIceCandidateInit;
          if (remoteDescSetRef.current) {
            try { await pc.addIceCandidate(new RTCIceCandidate(candidateData)); } catch {}
          } else {
            pendingCandidatesRef.current.push(candidateData);
          }
        }
      });
    });

    iceUnsubRef.current = unsub;
    return pc;
  }, [cleanupCall]);

  // Listen for incoming calls and answer signals
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'calls'), (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        const data = change.doc.data();
        const id = change.doc.id;
        const status = callStatusRef.current;

        // Call document deleted — end the call
        if (change.type === 'removed') {
          if (callIdRef.current === id && status !== 'idle' && status !== 'ended') {
            await cleanupCall(false);
          }
          return;
        }

        // Call marked as ended
        if (data.status === 'ended' && callIdRef.current === id && status !== 'idle' && status !== 'ended') {
          await cleanupCall(false);
          return;
        }

        // Incoming call: someone is calling us
        if (data.target === currentUser && data.type === 'offer' && data.status === 'pending' && status === 'idle') {
          // Skip stale calls (older than 60 seconds)
          const callTime = data.createdAt?.toDate?.() || data.createdAt;
          if (callTime && (Date.now() - new Date(callTime).getTime() > STALE_CALL_MS)) {
            try { await deleteDoc(doc(db, 'calls', id)); } catch {}
            return;
          }
          callIdRef.current = id;
          setStatus('incoming');
          return;
        }

        // We are the caller and the other side answered
        if (data.caller === currentUser && data.type === 'answer' && status === 'calling' && callIdRef.current === id) {
          const pc = peerConnectionRef.current;
          if (pc && !pc.currentRemoteDescription && data.sdp) {
            try {
              await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
              remoteDescSetRef.current = true;
              await flushPendingCandidates();
            } catch {
              setError('فشل الاتصال — يرجى المحاولة مرة أخرى.');
              await cleanupCall(true);
            }
          }
        }
      });
    });
    listenerUnsubRef.current = unsub;
    return () => { unsub(); };
  }, [currentUser, cleanupCall, flushPendingCandidates]);

  // Cleanup on unmount
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

    try {
      const pc = createPC(stream, id, 'caller');

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      await setDoc(callRef, {
        caller: currentUser,
        target: otherUser,
        type: 'offer',
        sdp: { type: offer.type, sdp: offer.sdp },
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      callTimeoutRef.current = setTimeout(() => {
        if (callStatusRef.current === 'calling') {
          setError('لا يوجد رد — تأكد أن الطرف الآخر متصل.');
          cleanupCall(true);
        }
      }, CALL_TIMEOUT_MS);
    } catch (err) {
      setError('فشل بدء الاتصال — حاول مرة ثانية.');
      await cleanupCall(true);
    }
  }, [currentUser, otherUser, getMedia, createPC, cleanupCall]);

  React.useImperativeHandle(ref, () => ({ startCall }), [startCall]);

  const answerCall = useCallback(async () => {
    const id = callIdRef.current;
    if (!id) return;

    const stream = await getMedia();
    if (!stream) return;

    try {
      const pc = createPC(stream, id, 'answerer');

      const callSnap = await getDoc(doc(db, 'calls', id));
      if (!callSnap.exists()) { await cleanupCall(false); return; }

      const offerSdp = callSnap.data()?.sdp;
      if (!offerSdp) { setError('بيانات الاتصال مفقودة.'); await cleanupCall(true); return; }

      await pc.setRemoteDescription(new RTCSessionDescription(offerSdp));
      remoteDescSetRef.current = true;
      await flushPendingCandidates();

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      await updateDoc(doc(db, 'calls', id), {
        type: 'answer',
        sdp: { type: answer.type, sdp: answer.sdp },
        status: 'connected',
        caller: callSnap.data()?.caller,
      });
      // Status will be set to 'connected' by onconnectionstatechange when WebRTC actually connects
    } catch (err) {
      setError('فشل الرد على الاتصال — حاول مرة ثانية.');
      await cleanupCall(true);
    }
  }, [getMedia, createPC, cleanupCall, flushPendingCandidates]);

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
