const SOUND_ENABLED_KEY = 'smart_study_sound_enabled_v1';

export type SfxType =
  | 'click'
  | 'flip'
  | 'correct'
  | 'wrong'
  | 'complete'
  | 'levelUp';

let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as {webkitAudioContext?: typeof AudioContext})
      .webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedAudioCtx) {
    try {
      sharedAudioCtx = new AudioCtx();
    } catch {
      return null;
    }
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

export function isSoundEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const val = localStorage.getItem(SOUND_ENABLED_KEY);
    return val === null ? true : val === 'true';
  } catch {
    return true;
  }
}

export function setSoundEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(SOUND_ENABLED_KEY, enabled ? 'true' : 'false');
  } catch {
    // Ignore storage quota errors
  }
  if (!enabled && typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Ignore synthesis cancel errors
    }
  }
}

function scheduleTone(
  ctx: AudioContext,
  freqStart: number,
  freqEnd: number,
  startOffsetSec: number,
  durationSec: number,
  waveform: OscillatorType,
  peakGain: number,
): void {
  const now = ctx.currentTime + startOffsetSec;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = waveform;
  osc.frequency.setValueAtTime(freqStart, now);
  if (freqEnd !== freqStart) {
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(40, freqEnd),
      now + durationSec,
    );
  }
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(peakGain, now + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + durationSec + 0.02);
}

export function playSfx(type: SfxType): void {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    switch (type) {
      case 'click':
        scheduleTone(ctx, 680, 440, 0, 0.045, 'sine', 0.05);
        break;
      case 'flip':
        scheduleTone(ctx, 320, 620, 0, 0.065, 'triangle', 0.055);
        break;
      case 'correct':
        scheduleTone(ctx, 523.25, 523.25, 0, 0.11, 'sine', 0.08);
        scheduleTone(ctx, 659.25, 659.25, 0.075, 0.12, 'sine', 0.09);
        scheduleTone(ctx, 783.99, 783.99, 0.15, 0.18, 'triangle', 0.08);
        break;
      case 'wrong':
        scheduleTone(ctx, 230, 195, 0, 0.12, 'triangle', 0.075);
        scheduleTone(ctx, 185, 145, 0.11, 0.16, 'triangle', 0.07);
        break;
      case 'complete':
        scheduleTone(ctx, 523.25, 523.25, 0, 0.1, 'sine', 0.08);
        scheduleTone(ctx, 659.25, 659.25, 0.08, 0.1, 'sine', 0.085);
        scheduleTone(ctx, 783.99, 783.99, 0.16, 0.11, 'sine', 0.09);
        scheduleTone(ctx, 1046.5, 1046.5, 0.25, 0.24, 'triangle', 0.095);
        break;
      case 'levelUp':
        scheduleTone(ctx, 523.25, 523.25, 0, 0.1, 'triangle', 0.09);
        scheduleTone(ctx, 659.25, 659.25, 0.08, 0.1, 'triangle', 0.09);
        scheduleTone(ctx, 783.99, 783.99, 0.16, 0.1, 'triangle', 0.095);
        scheduleTone(ctx, 1046.5, 1046.5, 0.24, 0.14, 'triangle', 0.1);
        scheduleTone(ctx, 1318.51, 1318.51, 0.36, 0.3, 'sine', 0.1);
        break;
    }
  } catch {
    // Ignore audio scheduling failure
  }
}

export function cleanTextForJapaneseSpeech(rawText: string): string {
  if (!rawText) return '';
  return rawText
    .replace(/\{([^|{}]+)\|[^|{}]+\}/g, '$1')
    .replace(/[*_`~#[\]()]/g, ' ')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function speakJapanese(rawText: string, rate = 0.9): boolean {
  if (!isSoundEnabled()) return false;
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return false;
  }
  const clean = cleanTextForJapaneseSpeech(rawText);
  if (!clean) return false;

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = 'ja-JP';
    utterance.rate = rate;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const jaVoice = voices.find((v) =>
      v.lang.toLowerCase().startsWith('ja'),
    );
    if (jaVoice) {
      utterance.voice = jaVoice;
    }

    window.speechSynthesis.speak(utterance);
    return true;
  } catch {
    return false;
  }
}
