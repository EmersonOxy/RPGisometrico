import type { EventBus } from "../core/EventBus";
export class AudioFeedback {
  private context?: AudioContext;
  private lastHover = 0;
  private lastHit = 0;
  constructor(
    bus: EventBus,
    private settings: () => { sound: boolean; volume: number },
  ) {
    bus.on("audio", (kind) => {
      const now = performance.now();
      if (kind === "hover") {
        if (now - this.lastHover < 100) return;
        this.lastHover = now;
        this.tone(340, 0.035, 0.18);
      }
      if (kind === "click") this.tone(210, 0.065, 0.35);
      if (kind === "equip") {
        this.tone(170, 0.09, 0.6);
        this.tone(460, 0.07, 0.25, 0.045);
      }
      if (kind === "coin") {
        this.tone(1100, 0.1, 0.35);
        this.tone(1450, 0.12, 0.2, 0.035);
      }
      if (kind === "pickup") {
        this.tone(550, 0.15, 0.3);
        this.tone(820, 0.18, 0.2, 0.065);
      }
      if (kind === "cast") this.tone(390, 0.16, 0.5);
    });
    bus.on("effect", (f) => {
      if (f.kind === "hit") {
        if (performance.now() - this.lastHit < 35) return;
        this.lastHit = performance.now();
        this.tone(110, 0.06, 0.8);
      } else if (f.kind === "heal") this.tone(520, 0.13, 0.3);
      else if (f.kind === "death") this.tone(65, 0.19, 0.8);
      else if (f.kind === "slash") this.tone(240, 0.07, 0.4);
      else if (f.kind === "projectile") this.tone(370, 0.08, 0.3);
    });
  }
  private tone(hz: number, duration: number, volume = 0.5, delay = 0) {
    const s = this.settings();
    if (!s.sound) return;
    try {
      this.context ??= new AudioContext();
      if (this.context.state !== "running") return;
      const t = this.context.currentTime + delay,
        osc = this.context.createOscillator(),
        gain = this.context.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(hz, t);
      osc.frequency.exponentialRampToValueAtTime(hz * 0.52, t + duration);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(s.volume * 0.12 * volume, t + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
      osc.connect(gain).connect(this.context.destination);
      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
      };
      osc.start(t);
      osc.stop(t + duration);
    } catch {}
  }
  unlock() {
    this.context ??= new AudioContext();
    void this.context.resume();
  }
}
