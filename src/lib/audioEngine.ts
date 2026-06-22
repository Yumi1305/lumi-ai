// Module-level singleton — persists for the lifetime of the browser tab,
// surviving page navigations in the Next.js client router.

export interface SoundState {
  id: string; icon: string; name: string; desc: string; on: boolean; vol: number
}

interface SoundNode {
  out: GainNode
  src: AudioBufferSourceNode
  extra?: OscillatorNode
  stop: () => void
}

const INITIAL: SoundState[] = [
  { id:'rain',   icon:'🌧', name:'Rain',   desc:'Steady rainfall',      on:false, vol:0.5 },
  { id:'waves',  icon:'🌊', name:'Ocean',  desc:'Slow rolling waves',   on:false, vol:0.5 },
  { id:'forest', icon:'🐦', name:'Forest', desc:'Birdsong & leaves',    on:false, vol:0.5 },
  { id:'wind',   icon:'🍃', name:'Wind',   desc:'Soft moving air',      on:false, vol:0.45 },
  { id:'fire',   icon:'🔥', name:'Fire',   desc:'Crackling embers',     on:false, vol:0.5 },
  { id:'hush',   icon:'⚪', name:'Hush',   desc:'Warm brown noise',     on:false, vol:0.4 },
]

let sounds: SoundState[] = INITIAL.map(s => ({ ...s }))
let ac: AudioContext | null = null
const nodes: Record<string, SoundNode> = {}
const subscribers = new Set<() => void>()
let birdInterval: ReturnType<typeof setInterval> | null = null
let fireInterval: ReturnType<typeof setInterval> | null = null

function notify() {
  subscribers.forEach(fn => fn())
}

export function subscribe(fn: () => void): () => void {
  subscribers.add(fn)
  return () => subscribers.delete(fn)
}

export function getSounds(): SoundState[] {
  return sounds
}

function getAC(): AudioContext {
  if (!ac) {
    const WA = (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext || AudioContext
    ac = new WA()
  }
  if (ac.state === 'suspended') ac.resume()
  return ac
}

function noiseBuffer(type: 'white' | 'brown'): AudioBuffer {
  const ctx = getAC()
  const len = ctx.sampleRate * 2
  const buf = ctx.createBuffer(1, len, ctx.sampleRate)
  const d = buf.getChannelData(0)
  let last = 0
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1
    if (type === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.2 }
    else d[i] = w
  }
  return buf
}

function startBirds(out: GainNode) {
  const ctx = getAC()
  const chirp = () => {
    const t = ctx.currentTime
    const o = ctx.createOscillator(); const g = ctx.createGain()
    o.type = 'sine'
    const base = 1400 + Math.random() * 1400
    o.frequency.setValueAtTime(base, t)
    o.frequency.exponentialRampToValueAtTime(base * 1.5, t + 0.08)
    o.frequency.exponentialRampToValueAtTime(base * 0.9, t + 0.16)
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(0.06, t + 0.02)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.2)
    o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.22)
  }
  birdInterval = setInterval(() => {
    if (Math.random() < 0.6) { chirp(); if (Math.random() < 0.4) setTimeout(chirp, 140) }
  }, 900)
}

function startCrackle(out: GainNode) {
  const ctx = getAC()
  fireInterval = setInterval(() => {
    const t = ctx.currentTime
    const o = ctx.createBufferSource(); o.buffer = noiseBuffer('white')
    const g = ctx.createGain(); const f = ctx.createBiquadFilter()
    f.type = 'bandpass'; f.frequency.value = 1500 + Math.random() * 1500
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(0.08 * Math.random(), t + 0.005)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.09)
    o.connect(f); f.connect(g); g.connect(out); o.start(t); o.stop(t + 0.1)
  }, 110)
}

function startSoundNode(id: string, vol: number): SoundNode {
  const ctx = getAC()
  const out = ctx.createGain(); out.gain.value = 0; out.connect(ctx.destination)

  const ramp = (g: number) => {
    out.gain.cancelScheduledValues(ctx.currentTime)
    out.gain.setValueAtTime(out.gain.value, ctx.currentTime)
    out.gain.linearRampToValueAtTime(g, ctx.currentTime + 0.6)
  }

  const src = ctx.createBufferSource(); src.loop = true
  const f = ctx.createBiquadFilter()
  let extra: OscillatorNode | undefined

  if (id === 'rain') {
    src.buffer = noiseBuffer('white'); f.type = 'highpass'; f.frequency.value = 700
    const f2 = ctx.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = 8000
    src.connect(f); f.connect(f2); f2.connect(out)
  } else if (id === 'hush') {
    src.buffer = noiseBuffer('brown'); f.type = 'lowpass'; f.frequency.value = 1200
    src.connect(f); f.connect(out)
  } else if (id === 'wind') {
    src.buffer = noiseBuffer('brown'); f.type = 'lowpass'; f.frequency.value = 600
    const lfo = ctx.createOscillator(); const lg = ctx.createGain()
    lfo.frequency.value = 0.08; lg.gain.value = 300
    lfo.connect(lg); lg.connect(f.frequency); lfo.start()
    src.connect(f); f.connect(out); extra = lfo
  } else if (id === 'waves') {
    src.buffer = noiseBuffer('brown'); f.type = 'lowpass'; f.frequency.value = 500
    const swell = ctx.createGain(); swell.gain.value = 0.4
    const lfo = ctx.createOscillator(); const lg = ctx.createGain()
    lfo.frequency.value = 0.12; lg.gain.value = 0.4
    lfo.connect(lg); lg.connect(swell.gain); lfo.start()
    src.connect(f); f.connect(swell); swell.connect(out); extra = lfo
  } else if (id === 'fire') {
    src.buffer = noiseBuffer('brown'); f.type = 'lowpass'; f.frequency.value = 1000
    src.connect(f); f.connect(out); startCrackle(out)
  } else if (id === 'forest') {
    src.buffer = noiseBuffer('brown'); f.type = 'lowpass'; f.frequency.value = 3000
    const g = ctx.createGain(); g.gain.value = 0.12
    src.connect(f); f.connect(g); g.connect(out); startBirds(out)
  }

  src.start()
  ramp(vol)

  return {
    out, src, extra,
    stop: () => {
      ramp(0)
      setTimeout(() => {
        try { src.stop() } catch {}
        if (id === 'fire' && fireInterval) { clearInterval(fireInterval); fireInterval = null }
        if (id === 'forest' && birdInterval) { clearInterval(birdInterval); birdInterval = null }
        if (extra) { try { extra.stop() } catch {} }
        try { out.disconnect() } catch {}
      }, 700)
    },
  }
}

export function toggleSound(id: string) {
  const s = sounds.find(x => x.id === id)
  if (!s) return
  if (s.on) {
    nodes[id]?.stop()
    delete nodes[id]
    sounds = sounds.map(x => x.id === id ? { ...x, on: false } : x)
  } else {
    nodes[id] = startSoundNode(id, s.vol)
    sounds = sounds.map(x => x.id === id ? { ...x, on: true } : x)
  }
  notify()
}

export function setVolume(id: string, vol: number) {
  sounds = sounds.map(x => x.id === id ? { ...x, vol } : x)
  const node = nodes[id]
  const s = sounds.find(x => x.id === id)
  if (s?.on && node && ac) {
    const g = node.out.gain
    g.cancelScheduledValues(ac.currentTime)
    g.setValueAtTime(g.value, ac.currentTime)
    g.linearRampToValueAtTime(vol, ac.currentTime + 0.1)
  }
  notify()
}

export function stopAllSounds() {
  Object.values(nodes).forEach(n => { try { n.stop() } catch {} })
  Object.keys(nodes).forEach(k => delete nodes[k])
  if (birdInterval) { clearInterval(birdInterval); birdInterval = null }
  if (fireInterval) { clearInterval(fireInterval); fireInterval = null }
  sounds = sounds.map(s => ({ ...s, on: false }))
  notify()
}

export function hasAnySoundOn(): boolean {
  return sounds.some(s => s.on)
}
