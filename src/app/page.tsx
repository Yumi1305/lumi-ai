'use client'

import { useState, useEffect, useRef } from 'react'

// ---- types ----
interface Goal {
  text: string
  durationMin: number
  createdAt: number
  nudged: boolean
}

// ---- constants ----
const ACCENT = '#bd6240'
const WARMTH = 'Balanced' as const
const NUDGE_AFTER_SEC = 30 // demo value; set to goal duration in production

const QUOTES = [
  'Almost everything will work again if you unplug it — including you.',
  'You are the sky. Everything else is just the weather.',
  'Little by little, one travels far.',
  'The quieter you become, the more you can hear.',
  'Rest is not idleness; it is the soil that grows everything.',
]

// ---- helpers ----
function storageGet<T>(key: string): T | null {
  if (typeof window === 'undefined') return null
  try { return JSON.parse(localStorage.getItem(key) || 'null') } catch { return null }
}
function storageSet(key: string, val: unknown) {
  try { localStorage.setItem(key, JSON.stringify(val)) } catch {}
}
function fmt(s: number): string {
  s = Math.max(0, Math.floor(s))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// ---- theme ----
type Ramp = { bg: [string, string, string]; text: string; muted: string; border: string; quote: string; field: string }
const RAMPS: Record<'Warm' | 'Balanced' | 'Cool', Ramp> = {
  Warm:     { bg: ['#f6f3ed','#efece6','#e9e5dc'], text:'#1f1d1a', muted:'#8a867e', border:'#e7e2da', quote:'#8a857b', field:'#f4f1ea' },
  Balanced: { bg: ['#f5f4f1','#edecea','#e7e6e2'], text:'#211f1d', muted:'#86847e', border:'#e6e4df', quote:'#88857d', field:'#f1f0ec' },
  Cool:     { bg: ['#f3f4f5','#eceef0','#e4e7ea'], text:'#1d1f22', muted:'#82858b', border:'#e3e6ea', quote:'#83868c', field:'#eef0f2' },
}

function buildTheme(dark: boolean) {
  const n = RAMPS[WARMTH]
  const h = ACCENT.replace('#', '')
  const [ar, ag, ab] = [0,2,4].map(i => parseInt(h.slice(i, i+2), 16))
  const mix = (c: number) => Math.round(c * 0.32 + 255 * 0.68)
  if (!dark) return {
    bg: `radial-gradient(130% 90% at 50% 0%, ${n.bg[0]} 0%, ${n.bg[1]} 55%, ${n.bg[2]} 100%)`,
    text: n.text, muted: n.muted, border: n.border, card: '#ffffff', accent: ACCENT,
    quote: n.quote, ring: `rgb(${mix(ar)},${mix(ag)},${mix(ab)})`,
    overlay: 'rgba(40,36,32,.42)', field: n.field,
  }
  return {
    bg: 'radial-gradient(125% 85% at 50% 0%, #2c2552 0%, #1a1733 46%, #110e22 100%)',
    text: '#f1eefb', muted: '#928bb6', border: 'rgba(255,255,255,.11)', card: 'rgba(34,29,58,.72)',
    accent: '#ffb08c', quote: '#a59fc7', ring: 'rgba(184,164,255,.42)',
    overlay: 'rgba(10,8,20,.55)', field: 'rgba(255,255,255,.06)',
  }
}

// ---- component ----
export default function HomePage() {
  const [dark, setDark] = useState<boolean | null>(null)
  const [goal, setGoal] = useState<Goal | null>(null)
  const [showIntake, setShowIntake] = useState(false)
  const [showNudge, setShowNudge] = useState(false)
  const [draftGoal, setDraftGoal] = useState('')
  const [draftDuration, setDraftDuration] = useState(120)
  const [now, setNow] = useState(Date.now())
  const [quote, setQuote] = useState('')

  // Stable ref so the interval can read current state without stale closures
  const stateRef = useRef({ showIntake: false, showNudge: false, goal: null as Goal | null })
  stateRef.current = { showIntake, showNudge, goal }

  useEffect(() => {
    const raw = localStorage.getItem('lumi:dark')
    const g = storageGet<Goal>('lumi:goal')
    const today = new Date().toDateString()
    const fresh = !!g && new Date(g.createdAt).toDateString() === today
    setDark(raw === null ? false : raw === '1')
    setGoal(fresh ? g : null)
    setShowIntake(!fresh)
    setDraftGoal(fresh && g ? g.text : '')
    setDraftDuration(fresh && g ? g.durationMin : 120)
    setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)])
  }, [])

  // 1s clock — guards against restarting overlay animations
  useEffect(() => {
    const timer = setInterval(() => {
      const { showIntake, showNudge, goal } = stateRef.current
      if (showIntake || showNudge) return
      if (!goal) return
      const elapsed = (Date.now() - goal.createdAt) / 1000
      if (elapsed >= NUDGE_AFTER_SEC && !goal.nudged) {
        setShowNudge(true)
        setNow(Date.now())
        return
      }
      setNow(Date.now())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Wait for client hydration to avoid theme flash
  if (dark === null) return null

  const t = buildTheme(dark)
  const elapsed = goal ? (now - goal.createdAt) / 1000 : 0
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const intentionMeta = goal
    ? `Today's intention · ${fmt(elapsed)} / ${goal.durationMin}:00`
    : 'Set an intention to begin'
  const goalText = goal ? goal.text : 'No intention set yet — tap Edit'
  const nudgeText = `You set out to "${goal?.text ?? 'continue'}". Do you feel ready to begin now?`

  const durs = [
    { label: '30 min', m: 30 },
    { label: '1 hour', m: 60 },
    { label: '2 hours', m: 120 },
    { label: 'Open-ended', m: 0 },
  ]

  function saveGoal() {
    const text = draftGoal.trim() || 'Be present and focused'
    const newGoal: Goal = { text, durationMin: draftDuration || 120, createdAt: Date.now(), nudged: false }
    storageSet('lumi:goal', newGoal)
    setGoal(newGoal)
    setShowIntake(false)
    setShowNudge(false)
  }

  function nudgeYes() {
    if (goal) { const ng = { ...goal, nudged: true }; storageSet('lumi:goal', ng); setGoal(ng) }
    setShowNudge(false)
    window.location.href = '/companion'
  }

  function nudgeLater() {
    if (goal) { const ng = { ...goal, nudged: true, createdAt: Date.now() }; storageSet('lumi:goal', ng); setGoal(ng) }
    setShowNudge(false)
  }

  const S = "var(--font-sans), 'Space Grotesk', sans-serif"
  const SE = "var(--font-serif), 'Newsreader', serif"

  return (
    <div style={{
      minHeight: '100vh', background: t.bg, fontFamily: S,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '26px 24px 40px', position: 'relative', color: t.text,
    }}>
      <div style={{ width: '100%', maxWidth: '760px', display: 'flex', flexDirection: 'column', flex: 1 }}>

        {/* top bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontFamily: SE, fontSize: '23px', color: t.text, letterSpacing: '.01em' }}>
            lumi<span style={{ color: t.accent }}>.</span>
          </div>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <a href="/focus#sounds" style={{ fontSize: '13px', color: t.muted }}>Sounds</a>
            <a href="/focus#library" style={{ fontSize: '13px', color: t.muted }}>Library</a>
            <a href="/shelf" style={{ fontSize: '13px', color: t.muted }}>Shelf</a>
            <a href="/companion" style={{ fontSize: '13px', color: t.muted }}>Talk to Lumi</a>
            <button
              onClick={() => { const nd = !dark; localStorage.setItem('lumi:dark', nd ? '1' : '0'); setDark(nd) }}
              style={{
                cursor: 'pointer', border: `1px solid ${t.border}`, background: t.card, color: t.text,
                borderRadius: '100px', padding: '7px 14px', fontFamily: S, fontSize: '12.5px',
                display: 'flex', alignItems: 'center', gap: '7px',
              }}
            >{dark ? '☾  Dark' : '☀  Light'}</button>
          </div>
        </div>

        {/* intention bar */}
        <div style={{
          marginTop: '22px', display: 'flex', alignItems: 'center', gap: '13px',
          background: t.card, border: `1px solid ${t.border}`, borderRadius: '15px', padding: '13px 17px',
        }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '11px', background: t.accent,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, color: '#fff', fontSize: '15px',
          }}>→</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '10.5px', letterSpacing: '.13em', textTransform: 'uppercase', color: t.muted }}>{intentionMeta}</div>
            <div style={{ fontSize: '14.5px', color: t.text, marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{goalText}</div>
          </div>
          <button
            onClick={() => { setShowIntake(true); setDraftGoal(goal?.text ?? ''); setDraftDuration(goal?.durationMin ?? 120) }}
            style={{
              cursor: 'pointer', fontFamily: S, fontSize: '12px', color: t.muted,
              background: 'transparent', border: `1px solid ${t.border}`, borderRadius: '100px', padding: '6px 12px',
            }}
          >Edit</button>
        </div>

        {/* centerpiece */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', textAlign: 'center', gap: '28px', padding: '36px 0',
        }}>
          <div style={{ fontFamily: SE, fontWeight: 300, fontSize: '30px', lineHeight: 1.3, color: t.text, maxWidth: '340px' }}>
            How are you<br />arriving today?
          </div>

          {/* orb */}
          <a href="/companion" style={{
            position: 'relative', width: '230px', height: '230px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'floaty 9s ease-in-out infinite', cursor: 'pointer',
          }}>
            <div style={{
              position: 'absolute', width: '230px', height: '230px', borderRadius: '50%',
              border: `1px solid ${t.ring}`, animation: 'ringPulse 4.5s ease-out infinite',
            }} />
            <div style={{
              position: 'relative', width: '166px', height: '166px', borderRadius: '50%',
              background: 'radial-gradient(circle at 36% 30%, #ffe7cf 0%, #ff9d7a 36%, #a072d8 80%, #6c4fb0 100%)',
              animation: 'breathe 7s ease-in-out infinite, glowL 7s ease-in-out infinite',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            }}>
              {/* face */}
              <div style={{ display: 'flex', gap: '52px', marginBottom: '9px', alignItems: 'center', position: 'relative' }}>
                <div style={{ position: 'absolute', left: '-9px', top: '22px', width: '16px', height: '9px', borderRadius: '50%', background: 'rgba(255,120,120,.45)', filter: 'blur(1px)' }} />
                <div style={{ position: 'absolute', right: '-9px', top: '22px', width: '16px', height: '9px', borderRadius: '50%', background: 'rgba(255,120,120,.45)', filter: 'blur(1px)' }} />
                <div style={{ width: '13px', height: '13px', borderRadius: '50%', background: '#3d2740', animation: 'blink 6s ease-in-out infinite' }} />
                <div style={{ width: '13px', height: '13px', borderRadius: '50%', background: '#3d2740', animation: 'blink 6s ease-in-out infinite' }} />
              </div>
              {/* smile */}
              <div style={{
                width: '26px', height: '12px', border: '0 solid #3d2740',
                borderBottomWidth: '3.5px', borderRadius: '0 0 30px 30px',
                borderLeftWidth: '3.5px', borderRightWidth: '3.5px',
                borderLeftColor: 'transparent', borderRightColor: 'transparent',
              } as React.CSSProperties} />
            </div>
          </a>

          <div>
            <div style={{ fontSize: '15px', color: t.text, fontWeight: 500 }}>Tap to talk — I'm listening</div>
            <div style={{ fontSize: '12.5px', color: t.muted, marginTop: '5px' }}>or type if you'd rather not speak</div>
          </div>
        </div>

        {/* quick tiles */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '11px' }}>
          {[
            { href: '/focus#sounds', icon: '🌧', title: 'Sounds', sub: 'Rain · forest' },
            { href: '/focus#music',  icon: '♫',  title: 'Music',  sub: 'Spotify · YT' },
            { href: '/focus#breathe',icon: '◐',  title: 'Breathe',sub: '4·7·8 · box' },
            { href: '/focus#library',icon: '✦',  title: 'Library',sub: 'Focus · phone' },
            { href: '/shelf',        icon: '📚',  title: 'Shelf',  sub: 'Books I\'ve read' },
          ].map(tile => (
            <a key={tile.href} href={tile.href} style={{
              background: t.card, border: `1px solid ${t.border}`,
              borderRadius: '14px', padding: '15px 14px', display: 'block',
            }}>
              <div style={{ fontSize: '18px', marginBottom: '7px' }}>{tile.icon}</div>
              <div style={{ fontSize: '13px', color: t.text, fontWeight: 500 }}>{tile.title}</div>
              <div style={{ fontSize: '11px', color: t.muted, marginTop: '2px' }}>{tile.sub}</div>
            </a>
          ))}
        </div>

        <div style={{ marginTop: '20px', textAlign: 'center', fontFamily: SE, fontStyle: 'italic', fontSize: '15px', color: t.quote }}>
          {quote}
        </div>
      </div>

      {/* ===== GOAL INTAKE OVERLAY ===== */}
      {showIntake && (
        <div style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, left: 0,
          background: t.overlay, backdropFilter: 'blur(7px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '24px', zIndex: 50, animation: 'overlayIn .5s ease both',
        } as React.CSSProperties}>
          <div style={{
            width: '100%', maxWidth: '440px', background: t.card,
            border: `1px solid ${t.border}`, borderRadius: '22px', padding: '32px 30px',
            animation: 'cardIn .45s cubic-bezier(.2,.8,.2,1)',
            boxShadow: '0 24px 70px rgba(20,16,12,.22)',
          }}>
            <div style={{ fontSize: '11px', letterSpacing: '.14em', textTransform: 'uppercase', color: t.muted, marginBottom: '10px' }}>{greeting}</div>
            <div style={{ fontFamily: SE, fontWeight: 300, fontSize: '25px', lineHeight: 1.25, color: t.text, marginBottom: '7px' }}>
              What do you want from<br />this time together?
            </div>
            <div style={{ fontSize: '13.5px', lineHeight: 1.55, color: t.muted, marginBottom: '20px' }}>
              A goal, a feeling, anything. I&apos;ll check in with you a little later.
            </div>

            <input
              value={draftGoal}
              onChange={e => setDraftGoal(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveGoal() }}
              placeholder="e.g. finish my essay, or just feel calm"
              style={{
                width: '100%', fontFamily: S, fontSize: '15px', color: t.text,
                background: t.field, border: `1px solid ${t.border}`,
                borderRadius: '13px', padding: '14px 16px', outline: 'none',
              }}
            />

            <div style={{ fontSize: '11px', letterSpacing: '.12em', textTransform: 'uppercase', color: t.muted, margin: '20px 0 9px' }}>
              For how long?
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {durs.map(d => {
                const active = draftDuration === d.m
                return (
                  <button key={d.m} onClick={() => setDraftDuration(d.m)} style={{
                    cursor: 'pointer', fontFamily: S, fontSize: '13px', padding: '9px 15px',
                    borderRadius: '100px', border: `1.5px solid ${active ? t.accent : t.border}`,
                    background: active ? t.accent : 'transparent',
                    color: active ? '#fff' : t.muted, fontWeight: active ? 500 : 400,
                  }}>{d.label}</button>
                )
              })}
            </div>

            <button onClick={saveGoal} style={{
              marginTop: '24px', width: '100%', cursor: 'pointer', fontFamily: S,
              fontSize: '14.5px', fontWeight: 500, color: '#fff',
              background: t.accent, border: 'none', borderRadius: '13px', padding: '14px',
            }}>Begin →</button>
            <div onClick={() => setShowIntake(false)} style={{
              marginTop: '12px', textAlign: 'center', fontSize: '12.5px', color: t.muted, cursor: 'pointer',
            }}>Skip for now</div>
          </div>
        </div>
      )}

      {/* ===== GENTLE NUDGE ===== */}
      {showNudge && (
        <div style={{
          position: 'fixed', left: '50%', bottom: '28px',
          width: 'calc(100% - 40px)', maxWidth: '430px',
          background: t.card, border: `1px solid ${t.border}`, borderRadius: '18px',
          padding: '18px 20px', boxShadow: '0 18px 50px rgba(20,16,12,.2)',
          zIndex: 40, animation: 'nudgeIn .5s cubic-bezier(.2,.8,.2,1) both',
          display: 'flex', gap: '14px', alignItems: 'center',
        } as React.CSSProperties}>
          {/* mini orb */}
          <div style={{
            width: '42px', height: '42px', flexShrink: 0, borderRadius: '50%',
            background: 'radial-gradient(circle at 36% 30%, #ffe7cf, #ff9d7a 42%, #a072d8 86%)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3px',
          }}>
            <div style={{ display: 'flex', gap: '11px' }}>
              <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#3d2740' }} />
              <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#3d2740' }} />
            </div>
            <div style={{
              width: '9px', height: '4px', border: '0 solid #3d2740',
              borderBottomWidth: '2px', borderRadius: '0 0 12px 12px',
            } as React.CSSProperties} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '14px', color: t.text, lineHeight: 1.4 }}>{nudgeText}</div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '11px' }}>
              <button onClick={nudgeYes} style={{
                cursor: 'pointer', fontFamily: S, fontSize: '12.5px', fontWeight: 500,
                color: '#fff', background: t.accent, border: 'none', borderRadius: '100px', padding: '7px 15px',
              }}>Yes, I&apos;m ready</button>
              <button onClick={nudgeLater} style={{
                cursor: 'pointer', fontFamily: S, fontSize: '12.5px', color: t.muted,
                background: 'transparent', border: `1px solid ${t.border}`, borderRadius: '100px', padding: '7px 15px',
              }}>A little longer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
