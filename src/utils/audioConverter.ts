/**
 * Audio Conversion Utility for Gnani AI Prisma v3 Speech-to-Text
 *
 * Gnani Prisma v3 STT requires 16 kHz, 16-bit mono Linear PCM WAV format.
 * Browser MediaRecorder typically records in WebM/Opus (Chrome/Edge/Firefox)
 * or MP4/AAC (Safari).
 *
 * This utility uses the Web Audio API (OfflineAudioContext + decodeAudioData)
 * to resample any browser-recorded audio to 16,000 Hz single-channel mono PCM
 * and build a valid 44-byte RIFF/WAVE header.
 */

function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Encodes 32-bit float audio samples into a standard 16-bit PCM WAV ArrayBuffer.
 */
export function encodeWavPCM16(samples: Float32Array, sampleRate = 16000): ArrayBuffer {
  const numChannels = 1; // Mono
  const bytesPerSample = 2; // 16-bit = 2 bytes
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  /* RIFF chunk descriptor */
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true); // File size - 8
  writeString(view, 8, 'WAVE');

  /* 'fmt ' sub-chunk */
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat: 1 = Linear PCM
  view.setUint16(22, numChannels, true); // NumChannels = 1
  view.setUint32(24, sampleRate, true); // SampleRate = 16000
  view.setUint32(28, byteRate, true); // ByteRate = 32000
  view.setUint16(32, blockAlign, true); // BlockAlign = 2
  view.setUint16(34, 16, true); // BitsPerSample = 16

  /* 'data' sub-chunk */
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  /* Write 16-bit PCM audio samples */
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    // Clamp sample between -1.0 and 1.0
    const s = Math.max(-1, Math.min(1, samples[i]));
    // Convert Float32 [-1, 1] to Int16 [-32768, 32767]
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return buffer;
}

/**
 * Converts any browser audio Blob (WebM, Opus, Ogg, MP4) into a true
 * 16 kHz 16-bit mono Linear PCM WAV Blob compatible with Gnani AI Prisma v3.
 */
export async function convertBlobTo16kHzWav(audioBlob: Blob): Promise<Blob> {
  if (!audioBlob || audioBlob.size === 0) {
    throw new Error('Recorded audio is empty.');
  }

  const arrayBuffer = await audioBlob.arrayBuffer();

  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

  if (!AudioCtx) {
    throw new Error('Web Audio API is not supported in this browser.');
  }

  const audioContext = new AudioCtx();

  let decodedAudio: AudioBuffer;
  try {
    decodedAudio = await audioContext.decodeAudioData(arrayBuffer);
  } catch (decodeErr) {
    console.error('Failed to decode browser audio:', decodeErr);
    throw new Error('Failed to decode recorded audio format.');
  } finally {
    try {
      await audioContext.close();
    } catch {
      // ignore
    }
  }

  const targetSampleRate = 16000;
  const numChannels = 1; // Gnani Prisma v3 standard mono
  const totalSamples = Math.ceil(decodedAudio.duration * targetSampleRate);

  if (totalSamples <= 0) {
    throw new Error('Audio duration is too short or empty.');
  }

  const offlineContext = new OfflineAudioContext(
    numChannels,
    totalSamples,
    targetSampleRate
  );

  const source = offlineContext.createBufferSource();
  source.buffer = decodedAudio;
  source.connect(offlineContext.destination);
  source.start(0);

  const renderedBuffer = await offlineContext.startRendering();
  const monoChannelData = renderedBuffer.getChannelData(0);

  // Encode to true 16-bit PCM WAV
  const wavArrayBuffer = encodeWavPCM16(monoChannelData, targetSampleRate);
  return new Blob([wavArrayBuffer], { type: 'audio/wav' });
}

