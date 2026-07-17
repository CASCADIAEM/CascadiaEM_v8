// ==========================================
// 🔊 STANDALONE TACTICAL AUDIO SYNTH SERVICE
// ==========================================

class AudioSynthService {
  private audioCtx: AudioContext | null = null;
  private activeSirenOsc: OscillatorNode | null = null;
  private activeSirenGain: GainNode | null = null;
  private sirenIntervalId: any = null;
  private muted = false;
  private volume = parseFloat(localStorage.getItem('cascadia_volume') || '0.5');
  private soundType: 'standard' | 'cyber' | 'analog' = (localStorage.getItem('cascadia_sound_type') as any) || 'standard';

  private initContext() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  public setMuted(status: boolean) {
    this.muted = status;
    if (status) {
      this.stopSiren();
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setVolume(vol: number) {
    this.volume = vol;
    localStorage.setItem('cascadia_volume', vol.toString());
    if (this.activeSirenGain && this.audioCtx) {
      this.activeSirenGain.gain.setValueAtTime(vol * 0.08, this.audioCtx.currentTime);
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  public setSoundType(type: 'standard' | 'cyber' | 'analog') {
    this.soundType = type;
    localStorage.setItem('cascadia_sound_type', type);
  }

  public getSoundType(): 'standard' | 'cyber' | 'analog' {
    return this.soundType;
  }

  /**
   * Synthesizes the standard, crisp tactical droplet ping sound
   */
  public playDropletSound() {
    if (this.muted) return;
    try {
      const ctx = this.initContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      if (this.soundType === 'cyber') {
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(1200, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1800, ctx.currentTime + 0.08);

        gainNode.gain.setValueAtTime(this.volume * 0.1, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      } else if (this.soundType === 'analog') {
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(400, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.15);

        gainNode.gain.setValueAtTime(this.volume * 0.4, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      } else {
        // standard sine
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);

        gainNode.gain.setValueAtTime(this.volume * 0.2, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      }

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.start();
      oscillator.stop(ctx.currentTime + (this.soundType === 'cyber' ? 0.08 : (this.soundType === 'analog' ? 0.15 : 0.1)));
    } catch (e) {
      console.warn("⚠️ [AUDIO SYNTH]: Droplet sound execution stalled.", e);
    }
  }

  /**
   * Stops any currently playing emergency siren loops
   */
  public stopSiren() {
    if (this.sirenIntervalId) {
      clearInterval(this.sirenIntervalId);
      this.sirenIntervalId = null;
    }
    if (this.activeSirenGain && this.audioCtx) {
      try {
        const now = this.audioCtx.currentTime;
        this.activeSirenGain.gain.cancelScheduledValues(now);
        this.activeSirenGain.gain.setValueAtTime(this.activeSirenGain.gain.value, now);
        this.activeSirenGain.gain.linearRampToValueAtTime(0, now + 0.1);
        const gainNode = this.activeSirenGain;
        setTimeout(() => {
          try { gainNode.disconnect(); } catch (e) {}
        }, 150);
      } catch (e) {}
      this.activeSirenGain = null;
    }
    if (this.activeSirenOsc) {
      try {
        this.activeSirenOsc.stop();
        this.activeSirenOsc.disconnect();
      } catch (e) {}
      this.activeSirenOsc = null;
    }
  }

  /**
   * Synthesizes distinct, continuous emergency sirens
   */
  public startSiren(agency: 'EMS' | 'FIRE' | 'POLICE') {
    if (this.muted) return;
    try {
      const ctx = this.initContext();
      this.stopSiren();

      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(this.volume * 0.08, ctx.currentTime + 0.15);
      gainNode.connect(ctx.destination);
      this.activeSirenGain = gainNode;

      const osc = ctx.createOscillator();
      osc.connect(gainNode);
      this.activeSirenOsc = osc;

      if (agency === 'POLICE') {
        // High-speed Wail/Yelp police siren
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(550, ctx.currentTime);
        osc.start();
        
        let direction = true;
        this.sirenIntervalId = setInterval(() => {
          const now = ctx.currentTime;
          osc.frequency.cancelScheduledValues(now);
          osc.frequency.setValueAtTime(direction ? 550 : 1050, now);
          osc.frequency.exponentialRampToValueAtTime(direction ? 1050 : 550, now + 0.18);
          direction = !direction;
        }, 200);

      } else if (agency === 'FIRE') {
        // Mechanical heavy rotary fire engine siren
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.start();

        let direction = true;
        const sweep = () => {
          const now = ctx.currentTime;
          osc.frequency.cancelScheduledValues(now);
          osc.frequency.setValueAtTime(direction ? 220 : 680, now);
          osc.frequency.exponentialRampToValueAtTime(direction ? 680 : 220, now + 1.1);
          direction = !direction;
        };
        sweep();
        this.sirenIntervalId = setInterval(sweep, 1200);

      } else if (agency === 'EMS') {
        // Two-tone hi-lo ambulance horn
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.start();

        let high = true;
        this.sirenIntervalId = setInterval(() => {
          const now = ctx.currentTime;
          osc.frequency.setValueAtTime(high ? 587 : 440, now);
          high = !high;
        }, 400);
      }
    } catch (e) {
      console.warn("⚠️ [AUDIO SYNTH]: Siren loop initialization failed.", e);
    }
  }
}

export const synthService = new AudioSynthService();
