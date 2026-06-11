import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

export async function requestMicrophone(): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({ audio: true });
}

export function createRecorder(stream: MediaStream): {
  recorder: MediaRecorder;
  getChunks: () => Blob[];
} {
  const chunks: Blob[] = [];
  const recorder = new MediaRecorder(stream);
  recorder.ondataavailable = (e) => chunks.push(e.data);
  return { recorder, getChunks: () => chunks };
}

export function buildAudioBlob(chunks: Blob[]): Blob {
  return new Blob(chunks, { type: 'audio/webm' });
}

export async function uploadAudio(blob: Blob, path: string): Promise<string> {
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, blob);
  return getDownloadURL(storageRef);
}
