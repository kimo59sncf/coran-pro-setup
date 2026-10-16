/** Mic capture producing 16 kHz mono WAV snapshots of everything recorded so far (browser only). */
export function encodeWav(chunks: readonly Float32Array[], inRate: number, outRate = 16000): Blob {
  const ratio = inRate / outRate;
  const total = chunks.reduce((s, c) => s + c.length, 0);
  const flat = new Float32Array(total);
  let o = 0; for (const c of chunks) { flat.set(c, o); o += c.length; }
  const len = Math.floor(total / ratio);
  const buf = new ArrayBuffer(44 + len * 2);
  const v = new DataView(buf);
  const tag = (p: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(p + i, s.charCodeAt(i)); };
  tag(0, "RIFF"); v.setUint32(4, 36 + len * 2, true); tag(8, "WAVE"); tag(12, "fmt ");
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, outRate, true); v.setUint32(28, outRate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  tag(36, "data"); v.setUint32(40, len * 2, true);
  for (let i = 0; i < len; i++) {
    const s = Math.max(-1, Math.min(1, flat[Math.floor(i * ratio)] ?? 0));
    v.setInt16(44 + i * 2, s * (s < 0 ? 32768 : 32767), true);
  }
  return new Blob([buf], { type: "audio/wav" });
}

export type Recorder = { snapshot: () => File | null; level: () => number; stop: () => Promise<File | null> };

export async function startRecorder(): Promise<Recorder> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  const ctx = new AudioContext();
  await ctx.resume();
  const src = ctx.createMediaStreamSource(stream);
  const node = ctx.createScriptProcessor(4096, 1, 1);
  const chunks: Float32Array[] = [];
  let lvl = 0;
  node.onaudioprocess = (e) => {
    const d = new Float32Array(e.inputBuffer.getChannelData(0));
    chunks.push(d);
    let sum = 0; for (const x of d) sum += x * x;
    lvl = Math.min(1, Math.sqrt(sum / d.length) * 8);
  };
  src.connect(node); node.connect(ctx.destination);
  const snap = () => {
    if (chunks.length < 4) return null;
    return new File([encodeWav(chunks, ctx.sampleRate)], "recitation.wav", { type: "audio/wav" });
  };
  return {
    snapshot: snap,
    level: () => lvl,
    async stop() {
      stream.getTracks().forEach((t) => t.stop());
      node.disconnect(); src.disconnect(); node.onaudioprocess = null;
      const f = snap();
      await ctx.close();
      return f;
    },
  };
}
