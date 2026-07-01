'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

// ---- types ----
interface Message {
  role: 'lumi' | 'me'
  text: string
  mood: string
}

type SR = { prototype: SpeechRecognition; new(): SpeechRecognition }

interface MoodDef {
  line: string
  grad: string
  g1: string
  g2: string
  breath: string
  kw: string[]
}

interface LumiProfile {
  name?: string
  about?: string
  lumiNotes?: string
  lumiTopics?: string[]
  updatedAt?: number
}

// ---- constants ----
const MOODS: Record<string, MoodDef> = {
  neutral: { line:"I'm here with you.", grad:'radial-gradient(circle at 36% 30%,#ffe7cf 0%,#ff9d7a 36%,#a072d8 80%,#6c4fb0 100%)', g1:'rgba(255,157,122,.32)', g2:'rgba(160,114,216,.30)', breath:'7s', kw:[] },
  calm:    { line:"You seem settled — that's lovely to feel.", grad:'radial-gradient(circle at 36% 30%,#fff0c4 0%,#ffce78 38%,#7ec8a0 82%,#4fa07a 100%)', g1:'rgba(255,206,120,.30)', g2:'rgba(126,200,160,.32)', breath:'8s', kw:['calm','peaceful','better','relaxed','grateful','okay','fine','good','relieved','content','ready'] },
  happy:   { line:"I can feel some lightness in you.", grad:'radial-gradient(circle at 36% 30%,#fff4c0 0%,#ffd166 38%,#ff9d7a 82%,#e0728a 100%)', g1:'rgba(255,209,102,.34)', g2:'rgba(255,157,122,.30)', breath:'6.5s', kw:['happy','great','excited','proud','amazing','joy','wonderful','love'] },
  anxious: { line:"That sounds like a lot to hold right now.", grad:'radial-gradient(circle at 36% 30%,#dfeaff 0%,#9db8ee 40%,#8a72d8 82%,#5f4fb0 100%)', g1:'rgba(157,184,238,.34)', g2:'rgba(138,114,216,.30)', breath:'9s', kw:['anxious','nervous','worried','worry','stress','stressed','overwhelm','overwhelmed','panic','pressure','deadline','too much','scared','afraid','can\'t focus','behind'] },
  sad:     { line:"I'm sorry it feels heavy. I'm right here.", grad:'radial-gradient(circle at 36% 30%,#e7ecff 0%,#9aa6e0 42%,#6f74c0 84%,#4a4f96 100%)', g1:'rgba(154,166,224,.30)', g2:'rgba(111,116,192,.30)', breath:'9.5s', kw:['sad','down','depress','depressed','lonely','empty','hopeless','cry','crying','unhappy','blue','hurt','miss'] },
  tired:   { line:"It sounds like you're running low.", grad:'radial-gradient(circle at 36% 30%,#efe7ff 0%,#c9b8ee 42%,#9a8ad0 84%,#6f5fb0 100%)', g1:'rgba(201,184,238,.30)', g2:'rgba(154,138,208,.30)', breath:'10s', kw:['tired','exhausted','drained','sleepy','burnt','burnout','no energy','fatigue','can\'t sleep','insomnia','worn'] },
  angry:   { line:"That frustration makes sense.", grad:'radial-gradient(circle at 36% 30%,#ffe0cf 0%,#ff9a7a 38%,#e0728a 82%,#b04f6f 100%)', g1:'rgba(255,154,122,.32)', g2:'rgba(224,114,138,.30)', breath:'7.5s', kw:['angry','frustrated','annoyed','mad','irritated','unfair','hate','furious','fed up'] },
}

const SAMPLES = [
  "I have a big exam tomorrow and I can't seem to start studying.",
  "I keep picking up my phone every few minutes and losing focus.",
  "I'm just really tired and everything feels like too much today.",
  "I finished a big task and actually feel pretty good about it.",
  "I feel anxious about how much work I have left this week.",
]

const VOICES = [
  { id: 'nova',    name: 'Nova',    desc: 'warm' },
  { id: 'shimmer', name: 'Shimmer', desc: 'soft' },
  { id: 'verse',   name: 'Verse',   desc: 'calm' },
  { id: 'fable',   name: 'Fable',   desc: 'bright' },
  { id: 'onyx',    name: 'Onyx',    desc: 'deep' },
]
const DEFAULT_VOICE = 'nova'

const EXIT_PHRASES = [
  "okay i'm ready", "i'm ready now", "ready now", "i'm good now",
  "goodbye lumi", "goodbye", "that's all", "i'm done", "end conversation", "stop talking",
]

const BARS = [0,1,2,3,4,5,6].map(i => ({ d: (i * 0.11).toFixed(2) + 's' }))

// ---- helpers ----
function storageGet<T>(key: string): T | null {
  try { return JSON.parse(localStorage.getItem(key) || 'null') } catch { return null }
}
function storageSet(key: string, val: unknown) {
  try { localStorage.setItem(key, JSON.stringify(val)) } catch {}
}

// ---- local fallback AI ----
function detectMood(text: string): string | null {
  const l = ' ' + text.toLowerCase() + ' '
  for (const key of ['anxious','sad','tired','angry','happy','calm']) {
    if (MOODS[key].kw.some(w => l.includes(w))) return key
  }
  return null
}

function topicOf(text: string): string | null {
  const l = text.toLowerCase()
  if (/(exam|test|study|studying|assignment|essay|homework|class|grade|revis)/.test(l)) return 'study'
  if (/(phone|scroll|instagram|tiktok|social|distract|notif)/.test(l)) return 'phone'
  if (/(sleep|tired|insomnia|awake|rest)/.test(l)) return 'sleep'
  if (/(work|job|project|deadline|boss|meeting)/.test(l)) return 'work'
  if (/(friend|family|partner|relationship|alone|lonely|people)/.test(l)) return 'people'
  return null
}

function reflect(text: string, mood: string): string {
  const opens: Record<string, string[]> = {
    anxious: ["It makes sense that this feels heavy — there's a lot riding on it.","I hear the pressure in that. Your mind is trying to protect you by spinning.","Anxiety often shows up right before something that matters to us."],
    sad:     ["Thank you for telling me that. It's okay to feel low.","That sounds genuinely hard, and you don't have to carry it alone.","I'm glad you said it out loud. Heaviness is lighter when it's shared."],
    tired:   ["Being this drained is your body asking for something.","You've clearly been pushing hard. Tiredness is information, not weakness.","It's okay to have less in the tank today."],
    angry:   ["That frustration is valid — it usually points at something that matters to you.","It's okay to feel that. Anger often guards a softer feeling underneath.","I get why that would get under your skin."],
    happy:   ["I love hearing that. Let's let it land for a second.","That's worth savoring — what made the difference?","Beautiful. Noticing the good is its own kind of practice."],
    calm:    ["That steadiness is something to trust.","Lovely. Let's keep that ground under you.","I'm glad you're feeling settled."],
    neutral: ["Thank you for sharing that with me.","I'm taking that in. Tell me a little more?","I hear you."],
  }
  const qByTopic: Record<string, string> = {
    study:  "When you picture starting, what's the very first small step — just opening the doc, maybe?",
    phone:  "What do you think you're reaching for when you pick it up — a break, or a feeling?",
    sleep:  "What would help your body wind down tonight, even a little?",
    work:   "What part of it feels heaviest right now?",
    people: "Who in this feels safe to lean on, even slightly?",
    _:      "What would feel kind toward yourself in this moment?",
  }
  const o = opens[mood] || opens.neutral
  const open = o[Math.floor(Math.random() * o.length)]
  const topic = topicOf(text)
  const q = qByTopic[topic || '_']
  let suggest = ''
  if (mood === 'anxious' || mood === 'angry') suggest = " If it helps, we could slow things down with one long 4·7·8 breath together first."
  if (mood === 'tired') suggest = " A few minutes of soft rain in the background might take the edge off."
  return open + suggest + ' ' + q
}


// ---- theme ----
const WARMTH = 'Balanced' as const
const ACCENT = '#bd6240'
type Ramp = { bg: [string, string]; text: string; muted: string; border: string; field: string }
const RAMPS: Record<string, Ramp> = {
  Warm:     { bg:['#f6f3ed','#efece6'], text:'#1f1d1a', muted:'#8a867e', border:'#e7e2da', field:'#f4f1ea' },
  Balanced: { bg:['#f5f4f1','#e9e8e4'], text:'#211f1d', muted:'#86847e', border:'#e6e4df', field:'#f1f0ec' },
  Cool:     { bg:['#f3f4f5','#e6e8ea'], text:'#1d1f22', muted:'#82858b', border:'#e3e6ea', field:'#eef0f2' },
}
function buildTheme(dark: boolean) {
  const n = RAMPS[WARMTH]
  if (!dark) return { bg:`radial-gradient(120% 80% at 50% 0%, ${n.bg[0]}, ${n.bg[1]})`, text:n.text, muted:n.muted, border:n.border, card:'#ffffff', accent:ACCENT, field:n.field, meBub:ACCENT, lumiBub:'#ffffff' }
  return { bg:'radial-gradient(120% 80% at 50% 0%, #221d3a, #110e22)', text:'#f1eefb', muted:'#928bb6', border:'rgba(255,255,255,.12)', card:'rgba(34,29,58,.7)', accent:'#ffb08c', field:'rgba(255,255,255,.06)', meBub:'rgba(255,176,140,.92)', lumiBub:'rgba(255,255,255,.05)' }
}

// ---- component ----
export default function CompanionPage() {
  const [dark, setDark] = useState<boolean | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [listening, setListening] = useState(false)
  const [thinking, setThinking] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [interim, setInterim] = useState('')
  const [mood, setMood] = useState('neutral')
  const [voiceConvMode, setVoiceConvModeState] = useState(false)
  const [selectedVoice, setSelectedVoiceState] = useState(DEFAULT_VOICE)
  const [profile, setProfile] = useState<LumiProfile>({})
  const [showProfile, setShowProfile] = useState(false)

  const transcriptRef = useRef<HTMLDivElement>(null)
  const recRef = useRef<InstanceType<SR> | null>(null)
  const fbRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const idleRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const interimRef = useRef('')
  const lastInputModeRef = useRef<'voice' | 'text'>('text')
  const voiceConvModeRef = useRef(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const selectedVoiceRef = useRef(DEFAULT_VOICE)
  const profileRef = useRef<LumiProfile>({})
  // sentence-level TTS queue for streaming
  const ttsQueueRef = useRef<string[]>([])
  const ttsDrainingRef = useRef(false)
  const streamDoneRef = useRef(true)
  const onVoiceTurnDoneRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight
    }
  }, [messages, thinking])

  useEffect(() => {
    const raw = localStorage.getItem('lumi:dark')
    setDark(raw === null ? false : raw === '1')
    const savedVoice = localStorage.getItem('lumi:voice')
    if (savedVoice) { selectedVoiceRef.current = savedVoice; setSelectedVoiceState(savedVoice) }
    const savedProfile = storageGet<LumiProfile>('lumi:profile')
    if (savedProfile) { profileRef.current = savedProfile; setProfile(savedProfile) }

    let msgs = storageGet<Message[]>('lumi:chat') || []
    const goal = storageGet<{ text: string }>('lumi:goal')
    if (msgs.length === 0) {
      const h = new Date().getHours()
      const greet = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
      const opener = goal?.text
        ? `${greet}. Earlier you set out to "${goal.text}." Before you dive in — how are you actually feeling about it?`
        : `${greet}. I'm Lumi — it's good to see you. How are you feeling right now?`
      msgs = [{ role: 'lumi', text: opener, mood: 'neutral' }]
      storageSet('lumi:chat', msgs)
    }
    const lastMoodMsg = [...msgs].reverse().find(m => m.role === 'me' && m.mood)
    setMessages(msgs)
    setMood(lastMoodMsg?.mood || 'neutral')
    armIdle()
    return () => {
      if (idleRef.current) clearTimeout(idleRef.current)
      if (fbRef.current) clearInterval(fbRef.current)
      if (recRef.current) { try { recRef.current.stop() } catch {} }
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const armIdle = useCallback(() => {
    if (idleRef.current) clearTimeout(idleRef.current)
    idleRef.current = setTimeout(() => {
      setListening(prev => { if (prev) { armIdle(); return prev } return prev })
      setThinking(prev => { if (prev) { armIdle(); return prev } return prev })
      pushLumi("I'm still here, no rush. Whenever you're ready — what's present for you right now?", 'neutral')
    }, 75000)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function setVoiceConvMode(active: boolean) {
    voiceConvModeRef.current = active
    setVoiceConvModeState(active)
  }

  function isExitPhrase(text: string): boolean {
    const l = text.toLowerCase().trim()
    return EXIT_PHRASES.some(p => l.includes(p))
  }

  function pickVoice(id: string) {
    selectedVoiceRef.current = id
    setSelectedVoiceState(id)
    localStorage.setItem('lumi:voice', id)
  }

  function updateProfileField(key: 'name' | 'about', value: string) {
    const updated = { ...profileRef.current, [key]: value }
    profileRef.current = updated
    setProfile(updated)
    storageSet('lumi:profile', updated)
  }

  function clearChat() {
    const h = new Date().getHours()
    const greet = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
    const opener = `${greet}. I'm Lumi — it's good to see you. How are you feeling right now?`
    const initial = [{ role: 'lumi' as const, text: opener, mood: 'neutral' }]
    setMessages(initial)
    storageSet('lumi:chat', initial)
    setMood('neutral')
    setShowProfile(false)
  }

  function runProfileUpdate(msgs: Message[]) {
    const lumiCount = msgs.filter(m => m.role === 'lumi').length
    if (lumiCount < 4) return
    fetch('/api/remember', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: msgs }),
    }).then(r => r.json()).then(data => {
      if (!data.notes && !data.name) return
      setProfile(prev => {
        const updated: LumiProfile = {
          ...prev,
          ...(data.notes ? { lumiNotes: data.notes } : {}),
          ...(data.topics ? { lumiTopics: data.topics } : {}),
          ...(data.name && !prev.name ? { name: data.name } : {}),
          updatedAt: Date.now(),
        }
        profileRef.current = updated
        storageSet('lumi:profile', updated)
        return updated
      })
    }).catch(() => {})
  }

  // Fetch TTS audio as a buffer (does not play it)
  async function fetchTTSBuffer(text: string): Promise<ArrayBuffer | null> {
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voiceId: selectedVoiceRef.current }),
      })
      if (!res.ok) return null
      return await res.arrayBuffer()
    } catch {
      return null
    }
  }

  // Play a pre-fetched audio buffer; falls back to web speech if null
  async function playBuffer(buffer: ArrayBuffer | null, fallbackText: string): Promise<void> {
    if (!buffer) return webSpeakLumiP(fallbackText)
    return new Promise(async (resolve) => {
      if (audioRef.current) {
        audioRef.current.onended = null; audioRef.current.onerror = null
        audioRef.current.pause(); audioRef.current = null
      }
      try {
        const url = URL.createObjectURL(new Blob([buffer], { type: 'audio/mpeg' }))
        const audio = new Audio(url)
        audioRef.current = audio
        audio.onended = () => { audioRef.current = null; URL.revokeObjectURL(url); resolve() }
        audio.onerror = () => { audioRef.current = null; URL.revokeObjectURL(url); webSpeakLumiP(fallbackText).then(resolve) }
        await audio.play()
      } catch {
        webSpeakLumiP(fallbackText).then(resolve)
      }
    })
  }

  function webSpeakLumiP(text: string): Promise<void> {
    return new Promise(resolve => {
      if (typeof window === 'undefined' || !window.speechSynthesis) { resolve(); return }
      const utt = new SpeechSynthesisUtterance(text)
      utt.rate = 0.92; utt.pitch = 1.05; utt.volume = 1
      utt.onend = () => resolve()
      utt.onerror = () => resolve()
      const trySpeak = () => {
        const voices = window.speechSynthesis.getVoices()
        const preferred = voices.find(v =>
          v.name.includes('Samantha') || v.name.includes('Karen') ||
          v.name.includes('Moira') || (v.lang.startsWith('en') && !v.name.includes('Google'))
        )
        if (preferred) utt.voice = preferred
        window.speechSynthesis.speak(utt)
      }
      if (window.speechSynthesis.getVoices().length > 0) trySpeak()
      else window.speechSynthesis.onvoiceschanged = trySpeak
    })
  }

  // Drains the TTS queue with lookahead: fetches the next sentence's audio
  // while the current one is still playing, so transitions are seamless.
  async function drainTTSQueue() {
    if (ttsDrainingRef.current) return
    ttsDrainingRef.current = true
    setSpeaking(true)

    let prefetchedText: string | null = null
    let prefetchedPromise: Promise<ArrayBuffer | null> | null = null

    while (ttsQueueRef.current.length > 0 || !streamDoneRef.current) {
      if (ttsQueueRef.current.length === 0) {
        await new Promise(r => setTimeout(r, 40))
        continue
      }

      const sentence = ttsQueueRef.current.shift()!

      // Use prefetched buffer if it matches, otherwise fetch fresh
      const bufferPromise = (prefetchedText === sentence && prefetchedPromise)
        ? prefetchedPromise
        : fetchTTSBuffer(sentence)
      prefetchedText = null; prefetchedPromise = null

      // Immediately kick off the next fetch in parallel
      if (ttsQueueRef.current.length > 0) {
        prefetchedText = ttsQueueRef.current[0]
        prefetchedPromise = fetchTTSBuffer(ttsQueueRef.current[0])
      }

      const buffer = await bufferPromise

      // If more sentences arrived while we were fetching, start the next prefetch now
      if (!prefetchedPromise && ttsQueueRef.current.length > 0) {
        prefetchedText = ttsQueueRef.current[0]
        prefetchedPromise = fetchTTSBuffer(ttsQueueRef.current[0])
      }

      await playBuffer(buffer, sentence)

      if (!voiceConvModeRef.current && lastInputModeRef.current === 'voice') break
    }

    ttsQueueRef.current = []
    ttsDrainingRef.current = false
    setSpeaking(false)
    const cb = onVoiceTurnDoneRef.current
    onVoiceTurnDoneRef.current = null
    cb?.()
  }

  function enqueueTTS(sentence: string) {
    ttsQueueRef.current.push(sentence)
    if (!ttsDrainingRef.current) drainTTSQueue().catch(() => { ttsDrainingRef.current = false; setSpeaking(false) })
  }

  // Single-shot speak for non-streaming use (greetings, farewell, idle prompts)
  async function speakLumi(text: string, onDone?: () => void) {
    if (typeof window === 'undefined') return
    ttsQueueRef.current = []
    ttsDrainingRef.current = false
    if (audioRef.current) {
      audioRef.current.onended = null; audioRef.current.onerror = null
      audioRef.current.pause(); audioRef.current = null
    }
    window.speechSynthesis?.cancel()
    setSpeaking(true)
    const buffer = await fetchTTSBuffer(text)
    await playBuffer(buffer, text)
    setSpeaking(false)
    onDone?.()
  }

  function stopSpeaking() {
    ttsQueueRef.current = []
    ttsDrainingRef.current = false
    streamDoneRef.current = true
    if (audioRef.current) {
      audioRef.current.onended = null; audioRef.current.onerror = null
      audioRef.current.pause(); audioRef.current = null
    }
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel()
    setSpeaking(false)
  }

  function cancelVoice() {
    if (recRef.current) {
      recRef.current.onend = null
      try { recRef.current.stop() } catch {}
      recRef.current = null
    }
    if (fbRef.current) clearInterval(fbRef.current)
    setListening(false)
    interimRef.current = ''
    setInterim('')
  }

  function pushLumi(text: string, moodKey: string) {
    setMessages(prev => {
      const next = [...prev, { role: 'lumi' as const, text, mood: moodKey || 'neutral' }]
      storageSet('lumi:chat', next)
      return next
    })
    armIdle()
  }

  async function sendMessage(text: string, mode: 'voice' | 'text' = 'text') {
    text = (text || '').trim()
    if (!text) return
    lastInputModeRef.current = mode
    const detectedMood = detectMood(text) || mood || 'neutral'
    const snapshot = messages

    setMessages(prev => {
      const next = [...prev, { role: 'me' as const, text, mood: detectedMood }]
      storageSet('lumi:chat', next)
      return next
    })
    setDraft('')
    setMood(detectedMood)
    setThinking(true)
    if (idleRef.current) clearTimeout(idleRef.current)

    // Reset TTS queue state for this turn
    ttsQueueRef.current = []
    ttsDrainingRef.current = false
    streamDoneRef.current = false
    // After all sentences play, restart listening (startVoice is hoisted; ref avoids stale closure)
    onVoiceTurnDoneRef.current = mode === 'voice'
      ? () => { if (voiceConvModeRef.current) startVoice() }
      : null

    let sentenceBuffer = ''
    let serverMood = detectedMood
    let gotText = false

    function flushSentences(final = false) {
      // Extract complete sentences (ending with . ! ?) from buffer
      const re = /[^.!?]*[.!?]+["']?\s*/g
      let lastIndex = 0; let m: RegExpExecArray | null
      while ((m = re.exec(sentenceBuffer)) !== null) {
        const sentence = m[0].trim()
        lastIndex = re.lastIndex
        if (!sentence) continue
        setMessages(prev => {
          const next = [...prev, { role: 'lumi' as const, text: sentence, mood: serverMood }]
          storageSet('lumi:chat', next)
          return next
        })
        if (mode === 'voice') enqueueTTS(sentence)
      }
      sentenceBuffer = sentenceBuffer.slice(lastIndex)
      // On final flush, emit anything left (no terminal punctuation)
      if (final && sentenceBuffer.trim()) {
        const tail = sentenceBuffer.trim()
        setMessages(prev => {
          const next = [...prev, { role: 'lumi' as const, text: tail, mood: serverMood }]
          storageSet('lumi:chat', next)
          return next
        })
        if (mode === 'voice') enqueueTTS(tail)
        sentenceBuffer = ''
      }
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: snapshot, text, mood: detectedMood, profile: profileRef.current }),
      })
      if (!res.ok || !res.body) throw new Error('stream error')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let evtBuf = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        evtBuf += decoder.decode(value, { stream: true })
        const lines = evtBuf.split('\n')
        evtBuf = lines.pop() || ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (raw === '[DONE]') continue
          try {
            const parsed = JSON.parse(raw)
            if (parsed.mood) serverMood = parsed.mood
            if (!parsed.text) continue
            if (!gotText) { gotText = true; setThinking(false) }
            sentenceBuffer += parsed.text
            flushSentences()
          } catch {}
        }
      }
    } catch {}

    setThinking(false)
    flushSentences(true)
    streamDoneRef.current = true

    if (!gotText) {
      // Fallback to local reflection if stream returned nothing
      const fallback = reflect(text, detectedMood)
      pushLumi(fallback, detectedMood)
      if (mode === 'voice') {
        speakLumi(fallback, () => { if (voiceConvModeRef.current) startVoice() })
        return
      }
    }

    armIdle()
    setTimeout(() => {
      setMessages(current => {
        const lumiCount = current.filter(m => m.role === 'lumi').length
        if (lumiCount >= 4 && Date.now() - (profileRef.current.updatedAt || 0) > 300000) {
          runProfileUpdate(current)
        }
        return current
      })
    }, 200)
  }

  function startVoice() {
    setListening(true)
    interimRef.current = ''
    setInterim('')
    const SRClass = (typeof window !== 'undefined')
      ? (window.SpeechRecognition || window.webkitSpeechRecognition) as SR | undefined
      : undefined
    if (SRClass) {
      try {
        const r = new SRClass()
        r.lang = 'en-US'
        r.interimResults = true
        r.continuous = false
        r.onresult = (e: SpeechRecognitionEvent) => {
          let s = ''
          for (let i = 0; i < e.results.length; i++) s += e.results[i][0].transcript
          interimRef.current = s
          setInterim(s)
          setDraft(s)
        }
        r.onerror = () => {
          recRef.current = null
          if (voiceConvModeRef.current) setTimeout(() => { if (voiceConvModeRef.current) startVoice() }, 800)
          else fallbackVoice()
        }
        r.onend = () => {
          const t = interimRef.current.trim()
          recRef.current = null
          setListening(false)
          if (t) {
            if (isExitPhrase(t)) {
              setVoiceConvMode(false)
              speakLumi("Take care. I'm here whenever you need me.")
            } else {
              sendMessage(t, 'voice')
            }
          } else if (voiceConvModeRef.current) {
            // Nothing heard — wait briefly then restart
            setTimeout(() => { if (voiceConvModeRef.current) startVoice() }, 600)
          }
        }
        recRef.current = r
        r.start()
        return
      } catch {}
    }
    if (!voiceConvModeRef.current) fallbackVoice()
    else setListening(false)
  }

  function fallbackVoice() {
    const phrase = SAMPLES[Math.floor(Math.random() * SAMPLES.length)]
    let i = 0
    if (fbRef.current) clearInterval(fbRef.current)
    fbRef.current = setInterval(() => {
      i += 1
      const slice = phrase.slice(0, i)
      interimRef.current = slice
      setInterim(slice)
      setDraft(slice)
      if (i >= phrase.length) { if (fbRef.current) clearInterval(fbRef.current) }
    }, 38)
  }

  function orbClick() {
    if (voiceConvModeRef.current) {
      // Exit conversation mode
      setVoiceConvMode(false)
      if (speaking) stopSpeaking()
      if (listening) cancelVoice()
    } else {
      // Enter conversation mode
      setVoiceConvMode(true)
      startVoice()
    }
  }

  if (dark === null) return null

  const t = buildTheme(dark)
  const mood_def = MOODS[mood] || MOODS.neutral

  const S = "var(--font-sans), 'Space Grotesk', sans-serif"
  const SE = "var(--font-serif), 'Newsreader', serif"

  let statusText = 'Tap the orb to start a voice conversation'
  if (listening) statusText = interim ? `"${interim}"` : "Listening… I'm here"
  else if (thinking) statusText = 'Lumi is reflecting…'
  else if (speaking) statusText = 'Lumi is speaking…'
  else if (voiceConvMode) statusText = 'Starting…'

  const moodLine = voiceConvMode
    ? (listening
        ? 'Say "goodbye" or tap the orb to end'
        : speaking
        ? 'Tap the orb to stop'
        : thinking
        ? 'One moment…'
        : 'Conversation active')
    : mood_def.line

  const micBg = listening ? '#d4574e' : speaking ? t.accent : voiceConvMode ? t.accent : (dark ? 'rgba(255,255,255,.14)' : '#4a463f')
  const micIcon = listening ? '■' : speaking ? '◼' : '🎙'

  return (
    <div
      style={{ '--g1': mood_def.g1, '--g2': mood_def.g2 } as React.CSSProperties}
    >
      <div style={{
        height: '100vh', background: t.bg, fontFamily: S,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>

        {/* top bar */}
        <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 26px', maxWidth: '1080px', width: '100%', margin: '0 auto' }}>
          <a href="/" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '9px', fontSize: '13px', color: t.muted }}>
            <span style={{ fontSize: '16px' }}>‹</span> Home
          </a>
          <div style={{ fontFamily: SE, fontSize: '20px', color: t.text }}>
            lumi<span style={{ color: t.accent }}>.</span>
          </div>
          <div style={{ flex: 1, display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setShowProfile(true)}
              style={{ cursor: 'pointer', border: `1px solid ${t.border}`, background: t.card, color: t.text, borderRadius: '100px', padding: '6px 13px', fontFamily: S, fontSize: '12px' }}
            >✦ Memory</button>
            <button
              onClick={() => { const nd = !dark; localStorage.setItem('lumi:dark', nd ? '1' : '0'); setDark(nd) }}
              style={{ cursor: 'pointer', border: `1px solid ${t.border}`, background: t.card, color: t.text, borderRadius: '100px', padding: '6px 13px', fontFamily: S, fontSize: '12px' }}
            >{dark ? '☾  Dark' : '☀  Light'}</button>
          </div>
        </div>

        {/* orb hero */}
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '13px', padding: '8px 20px 14px' }}>
          <div onClick={orbClick} style={{ position: 'relative', width: '172px', height: '172px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', animation: 'floatyChat 9s ease-in-out infinite' }}>
            <div style={{ position: 'absolute', width: '172px', height: '172px', borderRadius: '50%', border: `1px solid ${mood_def.g2}`, animation: 'ringPulseChat 4s ease-out infinite' }} />
            {(listening || voiceConvMode) && (
              <div style={{ position: 'absolute', width: '172px', height: '172px', borderRadius: '50%', border: `1px solid ${mood_def.g2}`, animation: 'ringPulseChat 4s ease-out infinite 1.3s' }} />
            )}
            <div style={{
              position: 'relative', width: '128px', height: '128px', borderRadius: '50%',
              background: mood_def.grad,
              animation: `breatheChat ${mood_def.breath} ease-in-out infinite, glowO ${mood_def.breath} ease-in-out infinite`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ display: 'flex', gap: '40px', marginBottom: '7px', alignItems: 'center', position: 'relative' }}>
                <div style={{ position: 'absolute', left: '-7px', top: '17px', width: '13px', height: '7px', borderRadius: '50%', background: 'rgba(255,120,120,.42)', filter: 'blur(1px)' }} />
                <div style={{ position: 'absolute', right: '-7px', top: '17px', width: '13px', height: '7px', borderRadius: '50%', background: 'rgba(255,120,120,.42)', filter: 'blur(1px)' }} />
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#3d2740', animation: 'blink 6s ease-in-out infinite' }} />
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#3d2740', animation: 'blink 6s ease-in-out infinite' }} />
              </div>
              <div style={{
                width: '20px', height: '9px', border: '0 solid #3d2740',
                borderBottomWidth: '3px', borderRadius: '0 0 24px 24px',
                borderLeftWidth: '3px', borderRightWidth: '3px',
                borderLeftColor: 'transparent', borderRightColor: 'transparent',
              } as React.CSSProperties} />
            </div>
          </div>

          {/* waveform while listening or speaking */}
          {(listening || speaking) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', height: '26px' }}>
              {BARS.map((b, i) => (
                <div key={i} style={{
                  width: '4px', height: '26px', borderRadius: '4px',
                  background: speaking ? mood_def.g1.replace(/,.+\)/, ',1)') : t.accent,
                  transformOrigin: 'center', animation: `wave .9s ease-in-out infinite`,
                  animationDelay: b.d,
                }} />
              ))}
            </div>
          )}

          <div style={{ textAlign: 'center', minHeight: '24px' }}>
            <div style={{ fontSize: '14.5px', color: t.text }}>{statusText}</div>
            <div style={{ fontSize: '12px', color: t.muted, marginTop: '3px' }}>{moodLine}</div>
          </div>

          {/* voice picker — only visible when not in active conversation */}
          {!voiceConvMode && !listening && !speaking && (
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
              <span style={{ fontSize: '11px', color: t.muted, marginRight: '2px' }}>Voice</span>
              {VOICES.map(v => (
                <button
                  key={v.id}
                  onClick={() => pickVoice(v.id)}
                  style={{
                    cursor: 'pointer',
                    border: `1px solid ${selectedVoice === v.id ? t.accent : t.border}`,
                    background: selectedVoice === v.id ? t.accent + '18' : t.card,
                    color: selectedVoice === v.id ? t.accent : t.muted,
                    borderRadius: '100px', padding: '3px 11px', fontFamily: S, fontSize: '11px',
                  }}
                >
                  {v.name} <span style={{ opacity: 0.6 }}>· {v.desc}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* transcript */}
        <div ref={transcriptRef} style={{ flex: 1, overflowY: 'auto', padding: '6px 20px 10px' }}>
          <div style={{ maxWidth: '680px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {messages.map((m, i) => {
              const isLumi = m.role === 'lumi'
              return (
                <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', animation: 'msgIn .35s ease', ...(isLumi ? {} : { justifyContent: 'flex-end' }) }}>
                  {isLumi && (
                    <div style={{ width: '30px', height: '30px', flexShrink: 0, borderRadius: '50%', background: mood_def.grad, marginTop: '2px' }} />
                  )}
                  <div style={{
                    maxWidth: '76%', padding: '13px 16px', fontSize: '14.5px', lineHeight: 1.55,
                    ...(isLumi
                      ? { background: t.lumiBub, border: `1px solid ${t.border}`, color: t.text, borderRadius: '16px 16px 16px 5px' }
                      : { background: t.meBub, color: '#fff', borderRadius: '16px 16px 5px 16px' }
                    ),
                  }}>{m.text}</div>
                </div>
              )
            })}

            {thinking && (
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <div style={{ width: '30px', height: '30px', flexShrink: 0, borderRadius: '50%', background: mood_def.grad }} />
                <div style={{ background: t.lumiBub, border: `1px solid ${t.border}`, borderRadius: '16px 16px 16px 5px', padding: '14px 16px', display: 'flex', gap: '5px' }}>
                  {[0, .2, .4].map((delay, i) => (
                    <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: t.muted, animation: `dot 1.2s infinite ${delay}s` }} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* input bar */}
        <div style={{ flexShrink: 0, padding: '14px 20px 22px', background: `linear-gradient(0deg, ${t.bg.includes('#') ? t.bg.split(',')[0].replace(/.*\(/, '') : 'transparent'} 60%, transparent)` }}>
          <div style={{ maxWidth: '680px', margin: '0 auto', display: 'flex', gap: '10px', alignItems: 'center', background: t.card, border: `1px solid ${t.border}`, borderRadius: '100px', padding: '7px 7px 7px 20px' }}>
            <input
              value={draft}
              onChange={e => { if (speaking) stopSpeaking(); setDraft(e.target.value) }}
              onKeyDown={e => { if (e.key === 'Enter') { sendMessage(draft, 'text') } }}
              placeholder={listening ? 'Listening…' : "Tell Lumi what's on your mind…"}
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontFamily: S, fontSize: '15px', color: t.text }}
            />
            <button
              onClick={orbClick}
              title={voiceConvMode ? 'Tap to end conversation' : 'Tap to start voice conversation'}
              style={{ cursor: 'pointer', width: '42px', height: '42px', flexShrink: 0, borderRadius: '50%', border: 'none', background: micBg, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '17px' }}
            >
              {micIcon}
            </button>
            <button onClick={() => sendMessage(draft)} style={{ cursor: 'pointer', width: '42px', height: '42px', flexShrink: 0, borderRadius: '50%', border: 'none', background: t.accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
              ↑
            </button>
          </div>
        </div>
      </div>

      {/* ===== MEMORY PANEL ===== */}
      {showProfile && (
        <div
          onClick={() => setShowProfile(false)}
          style={{ position: 'fixed', inset: 0, background: dark ? 'rgba(10,8,20,.6)' : 'rgba(40,36,32,.45)', backdropFilter: 'blur(5px)', zIndex: 60, display: 'flex', justifyContent: 'flex-end' } as React.CSSProperties}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: '360px', height: '100%',
              background: dark ? '#1c1830' : '#ffffff',
              borderLeft: `1px solid ${t.border}`,
              padding: '28px 24px',
              overflowY: 'auto',
              display: 'flex', flexDirection: 'column', gap: '22px',
              animation: 'msgIn .3s ease',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontFamily: SE, fontSize: '21px', color: t.text }}>Memory</div>
              <div onClick={() => setShowProfile(false)} style={{ cursor: 'pointer', fontSize: '22px', color: t.muted, lineHeight: 1 }}>×</div>
            </div>

            <div style={{ fontSize: '13px', color: t.muted, lineHeight: 1.6 }}>
              Lumi uses this every session — like a CLAUDE.md for your conversations.
            </div>

            <div>
              <div style={{ fontSize: '10.5px', letterSpacing: '.1em', textTransform: 'uppercase', color: t.muted, marginBottom: '7px' }}>Your name</div>
              <input
                value={profile.name || ''}
                onChange={e => updateProfileField('name', e.target.value)}
                placeholder="What should Lumi call you?"
                style={{ width: '100%', boxSizing: 'border-box', fontFamily: S, fontSize: '14px', color: t.text, background: t.field, border: `1px solid ${t.border}`, borderRadius: '10px', padding: '10px 13px', outline: 'none' }}
              />
            </div>

            <div>
              <div style={{ fontSize: '10.5px', letterSpacing: '.1em', textTransform: 'uppercase', color: t.muted, marginBottom: '7px' }}>Tell Lumi about yourself</div>
              <textarea
                value={profile.about || ''}
                onChange={e => updateProfileField('about', e.target.value)}
                placeholder="What's going on in your life? What do you want Lumi to always know?"
                rows={4}
                style={{ width: '100%', boxSizing: 'border-box', fontFamily: S, fontSize: '14px', color: t.text, background: t.field, border: `1px solid ${t.border}`, borderRadius: '10px', padding: '10px 13px', outline: 'none', resize: 'none', lineHeight: 1.55 }}
              />
            </div>

            <div>
              <div style={{ fontSize: '10.5px', letterSpacing: '.1em', textTransform: 'uppercase', color: t.muted, marginBottom: '7px' }}>Lumi remembers</div>
              {profile.lumiNotes ? (
                <>
                  <div style={{ fontSize: '13.5px', color: t.text, background: t.field, border: `1px solid ${t.border}`, borderRadius: '10px', padding: '12px 14px', lineHeight: 1.7 }}>
                    {profile.lumiNotes}
                  </div>
                  {profile.updatedAt && (
                    <div style={{ fontSize: '11px', color: t.muted, marginTop: '5px' }}>
                      Updated {new Date(profile.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  )}
                </>
              ) : (
                <div style={{ fontSize: '13px', color: t.muted, fontStyle: 'italic', lineHeight: 1.6, background: t.field, border: `1px solid ${t.border}`, borderRadius: '10px', padding: '12px 14px' }}>
                  After a few conversations, Lumi will start building a picture of you here.
                </div>
              )}
            </div>

            <div style={{ flex: 1 }} />

            <button
              onClick={clearChat}
              style={{ cursor: 'pointer', fontFamily: S, fontSize: '12.5px', color: t.muted, background: 'transparent', border: `1px solid ${t.border}`, borderRadius: '100px', padding: '9px 18px', alignSelf: 'flex-start' }}
            >↺ Clear conversation</button>
          </div>
        </div>
      )}
    </div>
  )
}
