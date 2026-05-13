import type { Participant, Session } from '@/stores/workout'

export const AVATAR_POOL: ReadonlyArray<string> = [
  '🐱',
  '🐶',
  '🐸',
  '🦊',
  '🐯',
  '🐻',
  '🐨',
  '🐰',
  '🐼',
  '🦁',
]

export const COLOR_POOL: ReadonlyArray<string> = [
  '#ff5406',
  '#00b33f',
  '#5856de',
  '#00a9dd',
  '#ff3d8a',
  '#ffb800',
  '#ff6d00',
  '#0d9488',
  '#8b5cf6',
]

function rng(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648
    return s / 2147483648
  }
}

function genSessionBpm(base: number, peak: number, durationS: number, seed: number): number[] {
  const r = rng(seed)
  const out: number[] = []
  for (let i = 0; i < durationS; i++) {
    const t = i / durationS
    let env: number
    if (t < 0.1) env = 80 + (base - 80) * (t / 0.1)
    else if (t < 0.5) env = base + (peak - base) * ((t - 0.1) / 0.4)
    else if (t < 0.85) env = peak - 5 * Math.sin(t * 16)
    else env = peak - (peak - 95) * ((t - 0.85) / 0.15)
    const noise = (r() - 0.5) * 8
    const wobble = Math.sin(i / 7) * 3 + Math.sin(i / 23) * 5
    out.push(Math.round(env + noise + wobble))
  }
  return out
}

export type SeedBundle = {
  participants: Participant[]
  sessions: Record<string, Session>
}

export function buildSeed(now = Date.now()): SeedBundle {
  const participants: Participant[] = [
    {
      id: 'seed-olena',
      name: 'Olena',
      avatar: '🦊',
      color: '#ff5406',
      yob: 1987,
      weight: 62,
      sex: 'F',
      ble: [],
      hiddenAt: null,
      createdAt: now - 60 * 86400000,
    },
    {
      id: 'seed-ivan',
      name: 'Ivan',
      avatar: '🐻',
      color: '#5856de',
      yob: 1992,
      weight: 84,
      sex: 'M',
      ble: [],
      hiddenAt: null,
      createdAt: now - 50 * 86400000,
    },
    {
      id: 'seed-maria',
      name: 'Maria',
      avatar: '🐱',
      color: '#00b33f',
      yob: 1995,
      weight: 58,
      sex: 'F',
      ble: [],
      hiddenAt: null,
      createdAt: now - 40 * 86400000,
    },
    {
      id: 'seed-andrii',
      name: 'Andrii',
      avatar: '🦁',
      color: '#00a9dd',
      yob: 1989,
      weight: 78,
      sex: 'M',
      ble: [],
      hiddenAt: null,
      createdAt: now - 30 * 86400000,
    },
    {
      id: 'seed-sofia',
      name: 'Sofia',
      avatar: '🐰',
      color: '#ff3d8a',
      yob: 1998,
      weight: 55,
      sex: 'F',
      ble: [],
      hiddenAt: null,
      createdAt: now - 20 * 86400000,
    },
    {
      id: 'seed-yurii',
      name: 'Yurii',
      avatar: '🐸',
      color: '#ffb800',
      yob: 1985,
      weight: 88,
      sex: 'M',
      ble: [],
      hiddenAt: null,
      createdAt: now - 10 * 86400000,
    },
    {
      id: 'seed-bohdan',
      name: 'Bohdan',
      avatar: '🐨',
      color: '#8b5cf6',
      yob: 1990,
      weight: 75,
      sex: 'M',
      ble: [],
      hiddenAt: now - 3 * 86400000,
      createdAt: now - 80 * 86400000,
    },
    {
      id: 'seed-iryna',
      name: 'Iryna',
      avatar: '🐼',
      color: '#0d9488',
      yob: 1993,
      weight: 64,
      sex: 'F',
      ble: [],
      hiddenAt: now - 14 * 86400000,
      createdAt: now - 90 * 86400000,
    },
  ]

  const sessions: Record<string, Session> = {}
  const sessionBlueprints: Array<{
    daysAgo: number
    durationMin: number
    base: number
    peak: number
    participantIds: string[]
  }> = [
    {
      daysAgo: 0,
      durationMin: 45,
      base: 132,
      peak: 178,
      participantIds: ['seed-olena', 'seed-ivan', 'seed-maria'],
    },
    {
      daysAgo: 3,
      durationMin: 38,
      base: 128,
      peak: 172,
      participantIds: ['seed-olena', 'seed-ivan', 'seed-andrii', 'seed-yurii'],
    },
    {
      daysAgo: 5,
      durationMin: 52,
      base: 138,
      peak: 181,
      participantIds: ['seed-olena', 'seed-maria', 'seed-andrii'],
    },
    {
      daysAgo: 7,
      durationMin: 41,
      base: 130,
      peak: 169,
      participantIds: ['seed-ivan', 'seed-maria'],
    },
    {
      daysAgo: 14,
      durationMin: 62,
      base: 140,
      peak: 181,
      participantIds: ['seed-olena', 'seed-ivan', 'seed-maria', 'seed-yurii'],
    },
  ]

  for (let i = 0; i < sessionBlueprints.length; i++) {
    const b = sessionBlueprints[i]
    const durationS = b.durationMin * 60
    const startedAt = now - b.daysAgo * 86400000 - durationS * 1000
    const endedAt = startedAt + durationS * 1000
    const id = `seed-session-${i}`
    const bpmSeries: Record<string, number[]> = {}
    b.participantIds.forEach((pid, idx) => {
      bpmSeries[pid] = genSessionBpm(b.base + idx * 3, b.peak + idx * 2, durationS, i * 17 + idx)
    })
    sessions[id] = {
      id,
      startedAt,
      endedAt,
      participantIds: b.participantIds,
      bpmSeries,
    }
  }

  return { participants, sessions }
}
