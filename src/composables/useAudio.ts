import { useSettingsStore } from '@/stores/settings'

type SoundKey = 'start' | 'finish' | 'stale' | 'zone5'

let ctx: AudioContext | null = null

type WindowWithWebkit = Window & { webkitAudioContext?: typeof AudioContext }

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (ctx && ctx.state !== 'closed') {
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  }
  const w = window as WindowWithWebkit
  const Ctor = window.AudioContext ?? w.webkitAudioContext
  if (!Ctor) return null
  ctx = new Ctor()
  return ctx
}

type ToneStep = {
  freq: number
  duration: number
  delay?: number
  type?: OscillatorType
  volume?: number
}

function playSequence(steps: ToneStep[]): void {
  const c = getCtx()
  if (!c) return
  const baseAt = c.currentTime + 0.005
  for (const step of steps) {
    const start = baseAt + (step.delay ?? 0)
    const end = start + step.duration
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.type = step.type ?? 'sine'
    osc.frequency.setValueAtTime(step.freq, start)
    const peak = step.volume ?? 0.16
    gain.gain.setValueAtTime(0, start)
    gain.gain.linearRampToValueAtTime(peak, start + 0.012)
    gain.gain.exponentialRampToValueAtTime(0.0001, end)
    osc.connect(gain).connect(c.destination)
    osc.start(start)
    osc.stop(end + 0.04)
  }
}

const SEQUENCES: Record<SoundKey | 'test', ToneStep[]> = {
  // Ascending cheerful start (C5 → E5 → G5)
  start: [
    { freq: 523.25, duration: 0.16 },
    { freq: 659.25, duration: 0.18, delay: 0.16 },
    { freq: 783.99, duration: 0.26, delay: 0.34 },
  ],
  // Descending finish (E5 → C5 → G4) — like a relaxed stop chime
  finish: [
    { freq: 659.25, duration: 0.18 },
    { freq: 523.25, duration: 0.18, delay: 0.18 },
    { freq: 392.0, duration: 0.36, delay: 0.36, volume: 0.18 },
  ],
  // Soft low triangle blip — "device went quiet"
  stale: [{ freq: 220, duration: 0.32, type: 'triangle', volume: 0.18 }],
  // Two-shot high alarm — Z5 alert
  zone5: [
    { freq: 880, duration: 0.12, type: 'square', volume: 0.14 },
    { freq: 880, duration: 0.12, type: 'square', volume: 0.14, delay: 0.18 },
  ],
  // Settings test sound — neutral two-tone
  test: [
    { freq: 440, duration: 0.14 },
    { freq: 660, duration: 0.16, delay: 0.16 },
  ],
}

export function useAudio() {
  const settings = useSettingsStore()

  function play(key: SoundKey) {
    if (!settings.state.sounds[key]) return
    playSequence(SEQUENCES[key])
  }

  function playStart() {
    play('start')
  }
  function playFinish() {
    play('finish')
  }
  function playStale() {
    play('stale')
  }
  function playZone5() {
    play('zone5')
  }
  function testSound() {
    playSequence(SEQUENCES.test)
  }

  return { playStart, playFinish, playStale, playZone5, testSound }
}
