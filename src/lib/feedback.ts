// Simple audio + vibration feedback for the memorization recitation.

let audioCtx: AudioContext | null = null;

function ctx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AC = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext
      ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    audioCtx = new AC();
  }
  return audioCtx;
}

function tone(freq: number, duration: number, gain: number, when = 0, type: OscillatorType = "sine") {
  const c = ctx();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, c.currentTime + when);
  g.gain.exponentialRampToValueAtTime(gain, c.currentTime + when + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + when + duration);
  o.connect(g).connect(c.destination);
  o.start(c.currentTime + when);
  o.stop(c.currentTime + when + duration + 0.05);
}

export function playFeedback(kind: "correct" | "wrong" | "done") {
  if (kind === "correct") tone(880, 0.12, 0.15);
  else if (kind === "wrong") tone(180, 0.25, 0.2, 0, "sawtooth");
  else { tone(660, 0.15, 0.18); tone(880, 0.2, 0.18, 0.15); }
}

export function vibrate(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(pattern);
}

export function feedback(kind: "correct" | "wrong" | "done") {
  playFeedback(kind);
  if (kind === "correct") vibrate(15);
  else if (kind === "wrong") vibrate([40, 40, 40]);
  else vibrate([30, 30, 30]);
}
