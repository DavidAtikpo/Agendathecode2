export type MeetingCloudRecorderStop = () => void;

function floatTo16BitPCM(input: Float32Array): Int16Array {
  const out = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i] ?? 0));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function transcribePcmChunk(
  pcm: Int16Array,
  languageCode: string,
): Promise<string> {
  const res = await fetch('/api/speech/transcribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      audio: arrayBufferToBase64(pcm.buffer),
      encoding: 'LINEAR16',
      sampleRateHertz: 16000,
      languageCode,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : 'Transcription failed');
  }
  return typeof data.transcript === 'string' ? data.transcript.trim() : '';
}

export async function isMeetingCloudRecorderAvailable(): Promise<boolean> {
  try {
    const res = await fetch('/api/speech/config', { credentials: 'include' });
    if (!res.ok) return false;
    const data = await res.json();
    return data?.enabled === true;
  } catch {
    return false;
  }
}

/** Micro continu + blocs PCM vers Google Speech (évite les coupures Web Speech API). */
export async function startMeetingCloudRecorder(options: {
  languageCode: string;
  onTranscript: (display: string, committed: string) => void;
  onError?: (message: string) => void;
}): Promise<MeetingCloudRecorderStop | null> {
  const sampleRate = 16000;
  const chunkSeconds = 8;
  const samplesPerChunk = sampleRate * chunkSeconds;

  let committed = '';
  const buffer: number[] = [];
  let stopped = false;
  let processing = false;
  const queue: Int16Array[] = [];

  const flushQueue = async () => {
    if (processing) return;
    processing = true;
    while (queue.length > 0 && !stopped) {
      const chunk = queue.shift()!;
      try {
        const text = await transcribePcmChunk(chunk, options.languageCode);
        if (text) {
          committed = committed ? `${committed} ${text}` : text;
          options.onTranscript(committed, committed);
        }
      } catch (err) {
        options.onError?.(err instanceof Error ? err.message : 'Transcription error');
      }
    }
    processing = false;
  };

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: false,
      autoGainControl: true,
    },
  });
  const audioContext = new AudioContext({ sampleRate });
  const source = audioContext.createMediaStreamSource(stream);
  const processor = audioContext.createScriptProcessor(4096, 1, 1);

  processor.onaudioprocess = (event) => {
    if (stopped) return;
    const input = event.inputBuffer.getChannelData(0);
    const pcm = floatTo16BitPCM(input);
    for (let i = 0; i < pcm.length; i++) buffer.push(pcm[i]!);

    while (buffer.length >= samplesPerChunk) {
      const slice = buffer.splice(0, samplesPerChunk);
      queue.push(Int16Array.from(slice));
      void flushQueue();
    }
  };

  source.connect(processor);
  processor.connect(audioContext.destination);

  return () => {
    stopped = true;
    processor.disconnect();
    source.disconnect();
    void audioContext.close();
    for (const track of stream.getTracks()) track.stop();

    if (buffer.length >= sampleRate * 2) {
      queue.push(Int16Array.from(buffer.splice(0)));
    }
    void flushQueue().then(() => {
      options.onTranscript(committed, committed);
    });
  };
}
