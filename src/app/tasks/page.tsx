'use client'

import { useState, useEffect } from 'react'

interface Task {
  id: string
  text: string
  done: boolean
  createdAt: number
}

interface ScheduleBlock { time: string; task: string; note: string }
interface Schedule { greeting: string; blocks: ScheduleBlock[]; closing: string }

const ACCENT = '#bd6240'

function buildTheme(dark: boolean) {
  if (!dark) return {
    bg: '#eeede9', text: '#211f1d', muted: '#86847e', border: '#e3e1db',
    card: '#fbfbf9', accent: ACCENT, field: '#f8f7f4',
    bar: 'rgba(248,247,244,.85)',
  }
  return {
    bg: '#13111f', text: '#f1eefb', muted: '#928bb6', border: 'rgba(255,255,255,.1)',
    card: 'rgba(255,255,255,.04)', accent: '#ffb08c', field: 'rgba(255,255,255,.05)',
    bar: 'rgba(19,17,31,.85)',
  }
}

function storageGet<T>(key: string): T | null {
  if (typeof window === 'undefined') return null
  try { return JSON.parse(localStorage.getItem(key) || 'null') } catch { return null }
}
function storageSet(key: string, val: unknown) {
  try { localStorage.setItem(key, JSON.stringify(val)) } catch {}
}

export default function TasksPage() {
  const [dark, setDark] = useState<boolean | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(false)
  const [schedule, setSchedule] = useState<Schedule | null>(null)
  const [schedError, setSchedError] = useState(false)

  useEffect(() => {
    const raw = localStorage.getItem('lumi:dark')
    setDark(raw === null ? false : raw === '1')
    const saved = storageGet<Task[]>('lumi:tasks')
    if (saved) setTasks(saved)
  }, [])

  function saveTasks(next: Task[]) {
    setTasks(next)
    storageSet('lumi:tasks', next)
  }

  function addTask() {
    const text = draft.trim()
    if (!text) return
    saveTasks([...tasks, { id: crypto.randomUUID(), text, done: false, createdAt: Date.now() }])
    setDraft('')
  }

  function toggleTask(id: string) {
    saveTasks(tasks.map(item => item.id === id ? { ...item, done: !item.done } : item))
  }

  function deleteTask(id: string) {
    saveTasks(tasks.filter(item => item.id !== id))
  }

  async function generateSchedule() {
    const pending = tasks.filter(item => !item.done).map(item => item.text)
    if (!pending.length) return
    setLoading(true)
    setSchedError(false)
    setSchedule(null)
    try {
      const profile = storageGet<Record<string, string>>('lumi:profile')
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: pending, profile }),
      })
      if (!res.ok) throw new Error()
      setSchedule(await res.json())
    } catch {
      setSchedError(true)
    } finally {
      setLoading(false)
    }
  }

  if (dark === null) return null

  const th = buildTheme(dark)
  const S = "var(--font-sans), 'Space Grotesk', sans-serif"
  const SE = "var(--font-serif), 'Newsreader', serif"
  const pending = tasks.filter(item => !item.done)
  const done = tasks.filter(item => item.done)

  const chipBtn = (label: string, href: string) => (
    <a key={label} href={href} style={{ fontSize: '13px', color: th.muted }}>{label}</a>
  )

  return (
    <div style={{ minHeight: '100vh', background: th.bg, fontFamily: S, color: th.text }}>

      {/* top bar */}
      <div style={{ position: 'sticky', top: 0, zIndex: 20, backdropFilter: 'blur(10px)', background: th.bar, borderBottom: `1px solid ${th.border}` } as React.CSSProperties}>
        <div style={{ maxWidth: '760px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 26px' }}>
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '9px', fontSize: '13px', color: th.muted }}>
            <span style={{ fontSize: '16px' }}>‹</span> Home
          </a>
          <div style={{ display: 'flex', gap: '22px', alignItems: 'center' }}>
            {chipBtn('Focus', '/focus')}
            {chipBtn('Talk to Lumi', '/companion')}
            <button
              onClick={() => { const nd = !dark; localStorage.setItem('lumi:dark', nd ? '1' : '0'); setDark(nd) }}
              style={{ cursor: 'pointer', border: `1px solid ${th.border}`, background: th.card, color: th.text, borderRadius: '100px', padding: '6px 13px', fontFamily: S, fontSize: '12px' }}
            >{dark ? '☾  Dark' : '☀  Light'}</button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '36px 26px 80px' }}>

        <div style={{ marginBottom: '28px' }}>
          <div style={{ fontFamily: SE, fontWeight: 300, fontSize: '32px', lineHeight: 1.2 }}>Your tasks.</div>
          <div style={{ fontSize: '14px', color: th.muted, marginTop: '6px' }}>Capture what&apos;s on your plate. Lumi can turn it into a gentle schedule.</div>
        </div>

        {/* add task */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
          <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addTask() }}
            placeholder="Add a task…"
            style={{
              flex: 1, fontFamily: S, fontSize: '15px', color: th.text,
              background: th.field, border: `1px solid ${th.border}`,
              borderRadius: '13px', padding: '13px 16px', outline: 'none',
            }}
          />
          <button onClick={addTask} style={{
            cursor: 'pointer', fontFamily: S, fontSize: '14px', fontWeight: 500,
            color: '#fff', background: th.accent, border: 'none', borderRadius: '13px', padding: '13px 22px',
          }}>Add</button>
        </div>

        {/* pending tasks */}
        {pending.map(item => (
          <div key={item.id} style={{
            display: 'flex', alignItems: 'center', gap: '13px',
            background: th.card, border: `1px solid ${th.border}`, borderRadius: '14px',
            padding: '14px 16px', marginBottom: '8px',
          }}>
            <div
              onClick={() => toggleTask(item.id)}
              style={{
                width: '20px', height: '20px', borderRadius: '6px', flexShrink: 0,
                border: `2px solid ${th.border}`, cursor: 'pointer',
              }}
            />
            <div style={{ flex: 1, fontSize: '15px' }}>{item.text}</div>
            <div onClick={() => deleteTask(item.id)} style={{ cursor: 'pointer', color: th.muted, fontSize: '20px', lineHeight: 1, opacity: 0.5 }}>×</div>
          </div>
        ))}

        {/* done tasks */}
        {done.length > 0 && (
          <div style={{ marginTop: pending.length ? '20px' : 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ fontSize: '11px', letterSpacing: '.12em', textTransform: 'uppercase', color: th.muted }}>Completed</div>
              <div onClick={() => saveTasks(tasks.filter(i => !i.done))} style={{ fontSize: '12px', color: th.muted, cursor: 'pointer' }}>Clear</div>
            </div>
            {done.map(item => (
              <div key={item.id} style={{
                display: 'flex', alignItems: 'center', gap: '13px',
                border: `1px solid ${th.border}`, borderRadius: '14px',
                padding: '12px 16px', marginBottom: '8px', opacity: 0.5,
              }}>
                <div
                  onClick={() => toggleTask(item.id)}
                  style={{
                    width: '20px', height: '20px', borderRadius: '6px', flexShrink: 0,
                    border: `2px solid ${th.accent}`, background: th.accent, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '12px',
                  }}
                >✓</div>
                <div style={{ flex: 1, fontSize: '15px', textDecoration: 'line-through', color: th.muted }}>{item.text}</div>
                <div onClick={() => deleteTask(item.id)} style={{ cursor: 'pointer', color: th.muted, fontSize: '20px', lineHeight: 1 }}>×</div>
              </div>
            ))}
          </div>
        )}

        {tasks.length === 0 && (
          <div style={{ textAlign: 'center', color: th.muted, fontSize: '14.5px', padding: '48px 0' }}>
            Nothing here yet — add your first task above.
          </div>
        )}

        {/* schedule generator */}
        {pending.length > 0 && (
          <div style={{ marginTop: '32px' }}>
            <button
              onClick={generateSchedule}
              disabled={loading}
              style={{
                width: '100%', cursor: loading ? 'default' : 'pointer', fontFamily: S,
                fontSize: '15px', fontWeight: 500, color: '#fff',
                background: loading ? th.muted : th.accent,
                border: 'none', borderRadius: '14px', padding: '16px',
                transition: 'background .2s',
              }}
            >{loading ? 'Lumi is thinking…' : 'Generate my schedule with Lumi →'}</button>
            {schedError && (
              <div style={{ marginTop: '12px', fontSize: '13px', color: '#c2613f', textAlign: 'center' }}>
                Something went wrong — try again in a moment.
              </div>
            )}
          </div>
        )}

        {/* schedule output */}
        {schedule && (
          <div style={{ marginTop: '26px', background: th.card, border: `1px solid ${th.border}`, borderRadius: '18px', padding: '24px 22px' }}>
            <div style={{ fontSize: '10px', letterSpacing: '.14em', textTransform: 'uppercase', color: th.accent, marginBottom: '12px' }}>Your schedule</div>
            <div style={{ fontSize: '14px', color: th.muted, lineHeight: 1.65, marginBottom: '22px', fontStyle: 'italic' }}>{schedule.greeting}</div>
            {schedule.blocks.map((b, i) => (
              <div key={i} style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', color: th.accent, fontWeight: 600, whiteSpace: 'nowrap', paddingTop: '2px', minWidth: '68px' }}>{b.time}</div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 500 }}>{b.task}</div>
                  {b.note && <div style={{ fontSize: '13px', color: th.muted, marginTop: '3px', lineHeight: 1.5 }}>{b.note}</div>}
                </div>
              </div>
            ))}
            {schedule.closing && (
              <div style={{ fontSize: '13.5px', color: th.muted, lineHeight: 1.65, marginTop: '18px', borderTop: `1px solid ${th.border}`, paddingTop: '16px', fontStyle: 'italic' }}>
                {schedule.closing}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
