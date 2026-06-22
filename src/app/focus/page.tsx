'use client'

import { useState, useEffect, useRef } from 'react'
import * as audio from '@/lib/audioEngine'
import type { SoundState } from '@/lib/audioEngine'

// ---- types ----
interface BreathPhase { label: string; dur: number; scale: number }
interface LibCard { cat: string; icon: string; title: string; blurb: string; body: string[] }

// ---- constants ----
const WARMTH = 'Balanced' as const
const ACCENT = '#bd6240'

const PATTERNS: Record<string, BreathPhase[]> = {
  '478':  [{ label:'Inhale',dur:4,scale:1.5 },{ label:'Hold',dur:7,scale:1.5 },{ label:'Exhale',dur:8,scale:1.0 }],
  'box':  [{ label:'Inhale',dur:4,scale:1.5 },{ label:'Hold',dur:4,scale:1.5 },{ label:'Exhale',dur:4,scale:1.0 },{ label:'Hold',dur:4,scale:1.0 }],
  'sigh': [{ label:'Inhale',dur:4,scale:1.45 },{ label:'Inhale more',dur:2,scale:1.55 },{ label:'Exhale',dur:6,scale:1.0 }],
}
const PATTERN_META: Record<string, { label: string; hint: string }> = {
  '478':  { label:'4 · 7 · 8', hint:'Calming — great before sleep or a hard task.' },
  'box':  { label:'Box',        hint:'Balancing — used by athletes and divers to steady nerves.' },
  'sigh': { label:'Physiological sigh', hint:'Fastest way to discharge stress in real time.' },
}

const CATS = ['All','Focus','Phone','Calm','Body','Sleep']

const LIB: LibCard[] = [
  { cat:'Focus', icon:'🌱', title:'The two-minute start', blurb:'Beat the wall of starting by shrinking the first step.', body:["The hardest part of any task is the first 120 seconds. Your brain resists the imagined whole, not the actual work.","So don't commit to writing the essay — commit to opening the document and typing one ugly sentence. Tell yourself you can stop after two minutes.","Almost always, momentum takes over. And on the days it doesn't, you still moved. Starting badly beats not starting."] },
  { cat:'Focus', icon:'🎯', title:'One tab, one task', blurb:'Single-tasking is a skill you can train.', body:["Every open tab is an open loop your mind keeps checking. Close everything not tied to the next 25 minutes.","Keep a scratch note beside you. When a stray 'I should look that up' appears, write it down instead of acting on it. You'll handle it later — the thought is captured, so your focus can stay.","Work in one window, full screen. Friction toward distraction is your friend."] },
  { cat:'Focus', icon:'⏱', title:'Pomodoro, gently', blurb:'25 on, 5 off — but kinder than the rules suggest.', body:["Set a timer for 25 minutes of focus, then 5 minutes of real rest. After four rounds, take a longer break.","Treat the breaks as non-negotiable, not earned. They're what keep the focus sustainable.","If 25 feels long today, do 15. The point isn't the number — it's working in honest, bounded sprints instead of a vague endless slog."] },
  { cat:'Phone', icon:'🌫', title:'Make it boring', blurb:'Greyscale and a tidy home screen lower the pull.', body:["Colour is engineered to grab you. Turn your screen to greyscale (in accessibility settings) and the dopamine hit of apps quietly drops.","Move every tempting app off your home screen into a folder on page two. The half-second of friction breaks the autopilot tap.","Turn off all non-human notifications. If a person isn't messaging you, it can wait."] },
  { cat:'Phone', icon:'🅿️', title:'The parking spot', blurb:'Distance is the most reliable willpower.', body:["Willpower is unreliable; distance is not. Give your phone a 'parking spot' across the room or in another room while you work.","When it's an arm's reach away, you'll grab it without deciding to. When it's a walk away, you'll notice the urge before you act — and usually let it pass.","Charge it overnight outside the bedroom. Your mornings and your sleep both change."] },
  { cat:'Phone', icon:'🔁', title:"Replace, don't resist", blurb:'Swap the habit instead of fighting it.', body:["Reaching for your phone is usually a bid for a feeling — a break, a hit of novelty, relief from discomfort. Resisting the urge head-on rarely lasts.","Decide in advance what you'll reach for instead: a few slow breaths, a glass of water, a short walk, a stretch. Keep the replacement easy and physical.","Over time the cue (boredom, anxiety) stays but the routine changes. That's how habits actually shift."] },
  { cat:'Calm', icon:'🫁', title:'The 4·7·8 breath', blurb:'A portable off-switch for a racing mind.', body:["Breathe in quietly through your nose for 4. Hold for 7. Exhale slowly through your mouth for 8. Repeat four times.","The long exhale is the active ingredient — it tells your nervous system the danger has passed and slows your heart rate.","Use it before an exam, a hard conversation, or sleep. You can run it from the Breathe section above."] },
  { cat:'Calm', icon:'🖐', title:'5-4-3-2-1 grounding', blurb:'Come back to the room when your mind spirals.', body:["Name five things you can see, four you can hear, three you can feel, two you can smell, and one you can taste.","Anxiety lives in the imagined future. This walks your attention back into the present body, where the feared thing isn't actually happening.","It feels almost too simple. Do it anyway — simplicity is why it works under stress."] },
  { cat:'Body', icon:'🌀', title:'Fidget on purpose', blurb:'Restlessness is energy looking for a channel.', body:["If you can't sit still, stop trying to. Give the restlessness a deliberate outlet: a fidget toy, a stress ball, doodling, bouncing a leg.","Channelled movement actually improves focus for many people, especially with ADHD. The goal isn't stillness — it's directed attention.","Try a 'body double' too: working near someone (even on a video call) borrows their momentum and quiets the urge to bolt."] },
  { cat:'Sleep', icon:'🌙', title:'The wind-down ramp', blurb:'Sleep starts an hour before bed, not at bed.', body:["You can't sprint from a glowing screen into deep sleep. Build a 30–60 minute ramp that steps your brain down.","Dim the lights, drop the screens (or at least warm them), and do something low-stakes: a shower, light reading, slow breathing, soft sound.","Keep a notepad by the bed. If tomorrow's worries show up, write them down — on paper they stop circling, and you can rest."] },
]

const PRESETS = [
  { label:'🎧 Lofi beats',  url:'https://www.youtube.com/watch?v=jfKfPfyJRdk' },
  { label:'🌿 Nature jazz', url:'https://www.youtube.com/watch?v=DWcJFNfaw9c' },
  { label:'🎹 Calm piano',  url:'https://www.youtube.com/watch?v=4oStw0r33so' },
]

// ---- helpers ----
function buildTheme(dark: boolean) {
  const ramps = {
    Warm:     { bg:'#f1ede4', text:'#1f1d1a', muted:'#8a867e', border:'#e7e2da', field:'#faf8f3', soft:'#ece7db', card:'#fbfaf7' },
    Balanced: { bg:'#eeede9', text:'#211f1d', muted:'#86847e', border:'#e3e1db', field:'#f8f7f4', soft:'#e8e7e2', card:'#fbfbf9' },
    Cool:     { bg:'#ebedee', text:'#1d1f22', muted:'#82858b', border:'#e0e3e6', field:'#f7f8f9', soft:'#e6e8ea', card:'#fbfcfc' },
  }
  const n = ramps[WARMTH]
  if (!dark) return { bg:n.bg, text:n.text, muted:n.muted, border:n.border, card:n.card, accent:ACCENT, field:n.field, soft:n.soft, barbg:'rgba(248,247,244,.8)', overlay:'rgba(40,36,32,.4)' }
  return { bg:'#13111f', text:'#f1eefb', muted:'#928bb6', border:'rgba(255,255,255,.1)', card:'rgba(255,255,255,.04)', accent:'#ffb08c', field:'rgba(255,255,255,.05)', soft:'rgba(255,255,255,.05)', barbg:'rgba(19,17,31,.8)', overlay:'rgba(8,6,16,.55)' }
}

function parseMedia(url: string): { src: string; h: string } | null {
  if (!url) return null
  url = url.trim()
  let m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/)
  if (m) return { src:`https://www.youtube.com/embed/${m[1]}?autoplay=1&rel=0`, h:'315px' }
  m = url.match(/open\.spotify\.com\/(track|playlist|album|episode)\/([\w]+)/)
  if (m) return { src:`https://open.spotify.com/embed/${m[1]}/${m[2]}`, h: m[1]==='track' ? '152px' : '352px' }
  return null
}

// ---- component ----
export default function FocusPage() {
  const [dark, setDark] = useState<boolean | null>(null)
  const [sounds, setSounds] = useState<SoundState[]>(audio.getSounds())
  const [musicDraft, setMusicDraft] = useState('')
  const [embedSrc, setEmbedSrc] = useState('')
  const [embedH, setEmbedH] = useState('152px')
  const [musicError, setMusicError] = useState(false)
  const [pattern, setPattern] = useState<keyof typeof PATTERNS>('478')
  const [breathing, setBreathing] = useState(false)
  const [bLabel, setBLabel] = useState('Ready')
  const [bScale, setBScale] = useState(1)
  const [bDur, setBDur] = useState(0.4)
  const [bCount, setBCount] = useState(0)
  const [cat, setCat] = useState('All')
  const [openCard, setOpenCard] = useState<LibCard | null>(null)

  const btRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const bcRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const bActiveRef = useRef(false)
  const patternRef = useRef(pattern)
  patternRef.current = pattern

  useEffect(() => {
    const raw = localStorage.getItem('lumi:dark')
    setDark(raw === null ? false : raw === '1')

    // Subscribe to audio engine — sounds persist across navigation
    const unsub = audio.subscribe(() => setSounds(audio.getSounds()))
    return () => {
      unsub()
      if (btRef.current) clearTimeout(btRef.current)
      if (bcRef.current) clearInterval(bcRef.current)
      // Intentionally NOT stopping sounds here — they persist until explicitly stopped
    }
  }, [])

  // ---- music ----
  function loadMusicUrl(url: string) {
    const r = parseMedia(url)
    if (r) { setEmbedSrc(r.src); setEmbedH(r.h); setMusicError(false); setMusicDraft(url) }
    else { setMusicError(true); setEmbedSrc('') }
  }

  // ---- breathing ----
  function stepBreath(i: number) {
    if (!bActiveRef.current) return
    const pat = PATTERNS[patternRef.current]
    const step = pat[i % pat.length]
    setBLabel(step.label); setBScale(step.scale); setBDur(step.dur); setBCount(step.dur)
    if (bcRef.current) clearInterval(bcRef.current)
    let c = step.dur
    bcRef.current = setInterval(() => { c -= 1; setBCount(Math.max(c, 0)); if (c <= 0 && bcRef.current) clearInterval(bcRef.current) }, 1000)
    btRef.current = setTimeout(() => stepBreath(i + 1), step.dur * 1000)
  }

  function startBreath() { bActiveRef.current = true; setBreathing(true); stepBreath(0) }
  function stopBreath() {
    bActiveRef.current = false
    if (btRef.current) clearTimeout(btRef.current)
    if (bcRef.current) clearInterval(bcRef.current)
    setBreathing(false); setBLabel('Ready'); setBScale(1); setBDur(0.6); setBCount(0)
  }

  if (dark === null) return null

  const t = buildTheme(dark)
  const S = "var(--font-sans), 'Space Grotesk', sans-serif"
  const SE = "var(--font-serif), 'Newsreader', serif"
  const filteredCards = LIB.filter(c => cat === 'All' || c.cat === cat)

  return (
    <div style={{ minHeight: '100vh', background: t.bg, fontFamily: S, color: t.text }}>

      {/* sticky top bar */}
      <div style={{ position: 'sticky', top: 0, zIndex: 20, backdropFilter: 'blur(10px)', background: t.barbg, borderBottom: `1px solid ${t.border}` } as React.CSSProperties}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 26px' }}>
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '9px', fontSize: '13px', color: t.muted }}>
            <span style={{ fontSize: '16px' }}>‹</span> Home
          </a>
          <div style={{ display: 'flex', gap: '22px', alignItems: 'center' }}>
            <a href="#sounds" style={{ fontSize: '13px', color: t.muted }}>Sounds</a>
            <a href="#music"  style={{ fontSize: '13px', color: t.muted }}>Music</a>
            <a href="#breathe" style={{ fontSize: '13px', color: t.muted }}>Breathe</a>
            <a href="#library" style={{ fontSize: '13px', color: t.muted }}>Library</a>
            <button
              onClick={() => { const nd = !dark; localStorage.setItem('lumi:dark', nd ? '1' : '0'); setDark(nd) }}
              style={{ cursor: 'pointer', border: `1px solid ${t.border}`, background: t.card, color: t.text, borderRadius: '100px', padding: '6px 13px', fontFamily: S, fontSize: '12px' }}
            >{dark ? '☾  Dark' : '☀  Light'}</button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '36px 26px 80px' }}>

        <div style={{ marginBottom: '34px' }}>
          <div style={{ fontFamily: SE, fontWeight: 300, fontSize: '32px', lineHeight: 1.2 }}>Set your space.</div>
          <div style={{ fontSize: '14.5px', color: t.muted, marginTop: '6px', maxWidth: '520px' }}>Mix an atmosphere, cue your music, breathe, and find a few small habits that make focus easier.</div>
        </div>

        {/* ===== SOUNDS ===== */}
        <div id="sounds" style={{ scrollMarginTop: '80px', marginBottom: '46px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ fontSize: '13px', letterSpacing: '.13em', textTransform: 'uppercase', color: t.muted }}>Ambient sounds</div>
            <div onClick={() => audio.stopAllSounds()} style={{ fontSize: '12.5px', color: t.muted, cursor: 'pointer' }}>Stop all</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '13px' }}>
            {sounds.map(s => (
              <div key={s.id} onClick={() => audio.toggleSound(s.id)} style={{
                background: s.on ? (dark ? 'rgba(255,176,140,.1)' : '#fff') : t.card,
                border: `1.5px solid ${s.on ? t.accent : t.border}`,
                borderRadius: '16px', padding: '16px', cursor: 'pointer',
                transition: 'border-color .25s',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '24px' }}>{s.icon}</div>
                  <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: s.on ? t.accent : t.border }} />
                </div>
                <div style={{ fontSize: '15px', fontWeight: 500, marginTop: '12px' }}>{s.name}</div>
                <div style={{ fontSize: '11.5px', color: t.muted, marginTop: '2px' }}>{s.desc}</div>
                <input
                  type="range" min="0" max="1" step="0.01" value={s.vol}
                  onChange={e => { e.stopPropagation(); audio.setVolume(s.id, parseFloat(e.target.value)) }}
                  onClick={e => e.stopPropagation()}
                  onPointerDown={e => e.stopPropagation()}
                  style={{ width: '100%', marginTop: '14px', color: t.accent, opacity: s.on ? 1 : 0.35, background: t.border, pointerEvents: s.on ? 'auto' : 'none' } as React.CSSProperties}
                />
              </div>
            ))}
          </div>
        </div>

        {/* ===== MUSIC ===== */}
        <div id="music" style={{ scrollMarginTop: '80px', marginBottom: '46px' }}>
          <div style={{ fontSize: '13px', letterSpacing: '.13em', textTransform: 'uppercase', color: t.muted, marginBottom: '16px' }}>Your music</div>
          <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '18px', padding: '20px' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                value={musicDraft}
                onChange={e => setMusicDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') loadMusicUrl(musicDraft) }}
                placeholder="Paste a YouTube or Spotify link…"
                style={{ flex: 1, minWidth: '220px', background: t.field, border: `1px solid ${t.border}`, borderRadius: '11px', padding: '12px 15px', fontFamily: S, fontSize: '14px', color: t.text, outline: 'none' }}
              />
              <button onClick={() => loadMusicUrl(musicDraft)} style={{ cursor: 'pointer', fontFamily: S, fontSize: '14px', fontWeight: 500, color: '#fff', background: t.accent, border: 'none', borderRadius: '11px', padding: '12px 22px' }}>Load</button>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '13px', flexWrap: 'wrap' }}>
              {PRESETS.map(p => (
                <button key={p.url} onClick={() => loadMusicUrl(p.url)} style={{ cursor: 'pointer', fontFamily: S, fontSize: '12.5px', color: t.muted, background: t.soft, border: `1px solid ${t.border}`, borderRadius: '100px', padding: '8px 15px' }}>{p.label}</button>
              ))}
            </div>
            {embedSrc && (
              <div style={{ marginTop: '16px', borderRadius: '13px', overflow: 'hidden', border: `1px solid ${t.border}` }}>
                <iframe src={embedSrc} title="music" allow="autoplay; encrypted-media" style={{ width: '100%', height: embedH, border: 'none', display: 'block' }} />
              </div>
            )}
            {musicError && (
              <div style={{ marginTop: '12px', fontSize: '12.5px', color: '#c2613f' }}>That link wasn&apos;t a YouTube or Spotify URL I could read — try another.</div>
            )}
          </div>
        </div>

        {/* ===== BREATHE ===== */}
        <div id="breathe" style={{ scrollMarginTop: '80px', marginBottom: '46px' }}>
          <div style={{ fontSize: '13px', letterSpacing: '.13em', textTransform: 'uppercase', color: t.muted, marginBottom: '16px' }}>Breathe</div>
          <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '18px', padding: '28px 22px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '26px', flexWrap: 'wrap', justifyContent: 'center' }}>
              {Object.keys(PATTERN_META).map(k => {
                const active = pattern === k
                return (
                  <button key={k} onClick={() => { if (breathing) stopBreath(); setPattern(k as keyof typeof PATTERNS) }} style={{
                    cursor: 'pointer', fontFamily: S, fontSize: '13px', padding: '9px 16px',
                    borderRadius: '100px', border: `1.5px solid ${active ? t.accent : t.border}`,
                    background: active ? t.accent : 'transparent',
                    color: active ? '#fff' : t.muted, fontWeight: active ? 500 : 400,
                  }}>{PATTERN_META[k].label}</button>
                )
              })}
            </div>

            <div style={{ position: 'relative', width: '230px', height: '230px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
              <div style={{ position: 'absolute', width: '170px', height: '170px', borderRadius: '50%', border: `1px solid ${t.border}` }} />
              <div style={{
                width: '150px', height: '150px', borderRadius: '50%',
                background: 'radial-gradient(circle at 38% 32%, #ffe7cf, #ff9d7a 44%, #a072d8 88%)',
                transition: `transform ${bDur}s ease-in-out`,
                transform: `scale(${bScale})`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#3d2740',
              }}>
                <div style={{ fontSize: '18px', fontWeight: 600 }}>{bLabel}</div>
                <div style={{ fontSize: '13px', opacity: 0.7 }}>{breathing ? String(bCount) : ''}</div>
              </div>
            </div>

            <button onClick={() => breathing ? stopBreath() : startBreath()} style={{ marginTop: '18px', cursor: 'pointer', fontFamily: S, fontSize: '14px', fontWeight: 500, color: '#fff', background: t.accent, border: 'none', borderRadius: '100px', padding: '12px 30px' }}>
              {breathing ? 'Stop' : 'Begin'}
            </button>
            <div style={{ fontSize: '12.5px', color: t.muted, marginTop: '12px' }}>{PATTERN_META[pattern].hint}</div>
          </div>
        </div>

        {/* ===== LIBRARY ===== */}
        <div id="library" style={{ scrollMarginTop: '80px' }}>
          <div style={{ fontSize: '13px', letterSpacing: '.13em', textTransform: 'uppercase', color: t.muted, marginBottom: '16px' }}>Tips library</div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '18px', flexWrap: 'wrap' }}>
            {CATS.map(c => {
              const active = cat === c
              return (
                <button key={c} onClick={() => setCat(c)} style={{
                  cursor: 'pointer', fontFamily: S, fontSize: '13px', padding: '8px 16px',
                  borderRadius: '100px', border: `1px solid ${active ? t.accent : t.border}`,
                  background: active ? t.accent : 'transparent',
                  color: active ? '#fff' : t.muted, fontWeight: active ? 500 : 400,
                }}>{c}</button>
              )
            })}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '14px' }}>
            {filteredCards.map((c, i) => (
              <div key={i} onClick={() => setOpenCard(c)} style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: '16px', padding: '20px', cursor: 'pointer', animation: 'fadeUp .3s ease' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '11px' }}>
                  <div style={{ fontSize: '21px' }}>{c.icon}</div>
                  <div style={{ fontSize: '10.5px', letterSpacing: '.1em', textTransform: 'uppercase', color: t.accent }}>{c.cat}</div>
                </div>
                <div style={{ fontSize: '16.5px', fontWeight: 500, lineHeight: 1.3 }}>{c.title}</div>
                <div style={{ fontSize: '13px', color: t.muted, marginTop: '7px', lineHeight: 1.5 }}>{c.blurb}</div>
                <div style={{ fontSize: '12.5px', color: t.accent, marginTop: '12px' }}>Read →</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* reading panel */}
      {openCard && (
        <div
          onClick={() => setOpenCard(null)}
          style={{ position: 'fixed', top:0, right:0, bottom:0, left:0, background: t.overlay, backdropFilter: 'blur(5px)', zIndex: 40, display: 'flex', justifyContent: 'flex-end' } as React.CSSProperties}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ width: '100%', maxWidth: '460px', height: '100%', background: t.card, borderLeft: `1px solid ${t.border}`, padding: '34px 30px', overflowY: 'auto', animation: 'panelIn .35s cubic-bezier(.2,.8,.2,1)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
              <div style={{ fontSize: '10.5px', letterSpacing: '.12em', textTransform: 'uppercase', color: t.accent }}>{openCard.cat}</div>
              <div onClick={() => setOpenCard(null)} style={{ cursor: 'pointer', fontSize: '22px', color: t.muted, lineHeight: 1 }}>×</div>
            </div>
            <div style={{ fontSize: '25px', fontFamily: SE, fontWeight: 400, lineHeight: 1.25, marginBottom: '6px' }}>{openCard.title}</div>
            <div style={{ fontSize: '14px', color: t.muted, lineHeight: 1.5, marginBottom: '22px' }}>{openCard.blurb}</div>
            {openCard.body.map((para, i) => (
              <div key={i} style={{ fontSize: '15px', lineHeight: 1.7, marginBottom: '15px' }}>{para}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
