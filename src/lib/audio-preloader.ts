/** Prepares one official verse without playing or overlapping the active verse. */
export class AudioPreloader {
  private generation = 0;
  private prepared: { key: string; audio: HTMLAudioElement; url: string } | null = null;
  private pendingKey: string | null = null;

  constructor(private resolve: (url: string) => Promise<string>, private create = () => new Audio()) {}

  prepare(key: string) {
    if (this.prepared?.key === key || this.pendingKey === key) return;
    this.clear();
    const generation = this.generation;
    this.pendingKey = key;
    void this.resolve(key).catch(() => key).then((url) => {
      if (generation !== this.generation) {
        if (url.startsWith("blob:")) URL.revokeObjectURL(url);
        return;
      }
      this.pendingKey = null;
      const audio = this.create();
      audio.preload = "auto";
      audio.src = url;
      this.prepared = { key, audio, url };
      audio.load();
    });
  }

  take(key: string) {
    const ready = this.prepared?.key === key ? this.prepared : null;
    if (ready) this.prepared = null;
    this.clear();
    return ready;
  }

  clear() {
    this.generation++;
    this.pendingKey = null;
    const ready = this.prepared;
    this.prepared = null;
    if (!ready) return;
    ready.audio.pause();
    ready.audio.removeAttribute("src");
    ready.audio.load();
    if (ready.url.startsWith("blob:")) URL.revokeObjectURL(ready.url);
  }
}