'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Spline from '@splinetool/react-spline';

// Lazy-load Spline so it never runs on the server
// const Spline = dynamic(() => import('@splinetool/react-spline'), { ssr: false, loading: () => null })

// ---- types ----
interface Book {
  id: string
  title: string
  author: string
  note: string
  category: string
  color: string
  addedAt: number
}

// ---- constants ----
const ACCENT = '#bd6240'
const WARMTH = 'Balanced' as const

const SPINE_COLORS = [
  '#c4856a', '#8fa87e', '#7d97b8', '#a893bc',
  '#c4a96a', '#7a9688', '#c47a8a', '#a0968a',
  '#9aab88', '#b87a5a',
]

const CATEGORIES = ['Growth', 'Focus', 'Fiction', 'Science', 'Wellbeing', 'Other']

const BOOKS_PER_SHELF = 8

// ---- helpers ----
function storageGet<T>(key: string): T | null {
  try { return JSON.parse(localStorage.getItem(key) || 'null') } catch { return null }
}
function storageSet(key: string, val: unknown) {
  try { localStorage.setItem(key, JSON.stringify(val)) } catch {}
}

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

function simpleHash(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0
  return Math.abs(h)
}

function spineHeight(id: string): number {
  return 110 + (simpleHash(id) % 70)
}

function fmtDate(ms: number): string {
  return new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ---- theme ----
function buildTheme(dark: boolean) {
  const n = { bg: ['#f5f4f1', '#edecea', '#e7e6e2'], text: '#211f1d', muted: '#86847e', border: '#e6e4df', field: '#f1f0ec' }
  if (!dark) return {
    bg: `radial-gradient(130% 90% at 50% 0%, ${n.bg[0]} 0%, ${n.bg[1]} 55%, ${n.bg[2]} 100%)`,
    text: n.text, muted: n.muted, border: n.border, card: '#ffffff', accent: ACCENT,
    field: n.field, soft: '#e8e7e2', overlay: 'rgba(40,36,32,.45)',
    shelf: 'linear-gradient(to bottom, #c4a87a, #a88855)',
    shelfShadow: 'rgba(100,70,30,.18)',
    shelfBg: '#f2ece0',
  }
  return {
    bg: 'radial-gradient(125% 85% at 50% 0%, #2c2552 0%, #1a1733 46%, #110e22 100%)',
    text: '#f1eefb', muted: '#928bb6', border: 'rgba(255,255,255,.11)', card: 'rgba(34,29,58,.72)',
    accent: '#ffb08c', field: 'rgba(255,255,255,.06)', soft: 'rgba(255,255,255,.06)',
    overlay: 'rgba(10,8,20,.6)',
    shelf: 'linear-gradient(to bottom, #4a3828, #2e2218)',
    shelfShadow: 'rgba(0,0,0,.35)',
    shelfBg: 'rgba(255,255,255,.03)',
  }
}

// ---- sub-components ----
function BookSpine({ book, onClick, dark }: { book: Book; onClick: () => void; dark: boolean }) {
  const h = spineHeight(book.id)
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={`${book.title}${book.author ? ` · ${book.author}` : ''}`}
      style={{
        width: '44px', height: `${h}px`, flexShrink: 0,
        background: book.color,
        borderRadius: '3px 3px 0 0',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
        transform: hovered ? 'translateY(-10px)' : 'none',
        boxShadow: hovered
          ? `2px 6px 20px ${dark ? 'rgba(0,0,0,.5)' : 'rgba(60,40,20,.25)'}`
          : `2px 0 6px ${dark ? 'rgba(0,0,0,.35)' : 'rgba(60,40,20,.12)'}`,
        transition: 'transform .22s ease, box-shadow .22s ease',
        borderLeft: '3px solid rgba(255,255,255,.2)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Spine gloss */}
      <div style={{
        position: 'absolute', top: 0, left: 0, width: '40%', height: '100%',
        background: 'rgba(255,255,255,.1)', pointerEvents: 'none',
      }} />
      {/* Title text */}
      <div style={{
        writingMode: 'vertical-rl',
        transform: 'rotate(180deg)',
        fontSize: '9.5px',
        fontWeight: 600,
        color: 'rgba(255,255,255,.92)',
        textShadow: '0 1px 3px rgba(0,0,0,.25)',
        letterSpacing: '.04em',
        overflow: 'hidden',
        maxHeight: `${h - 16}px`,
        padding: '4px 0',
        textAlign: 'center',
        lineHeight: 1.3,
        fontFamily: "'Space Grotesk', sans-serif",
        wordBreak: 'break-word',
      }}>{book.title}</div>
    </div>
  )
}

// ---- component ----
export default function ShelfPage() {
  const [dark, setDark] = useState<boolean | null>(null)
  const [books, setBooks] = useState<Book[]>([])
  const [openBook, setOpenBook] = useState<Book | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftAuthor, setDraftAuthor] = useState('')
  const [draftNote, setDraftNote] = useState('')
  const [draftCategory, setDraftCategory] = useState('Growth')
  const [draftColor, setDraftColor] = useState(SPINE_COLORS[0])

  // Set by adding NEXT_PUBLIC_SHELF_SPLINE_SCENE=https://prod.spline.design/YOUR_SCENE_ID/scene.splinecode to .env.local
  const splineUrl = process.env.NEXT_PUBLIC_SHELF_SPLINE_SCENE

  useEffect(() => {
    const raw = localStorage.getItem('lumi:dark')
    setDark(raw === null ? false : raw === '1')
    setBooks(storageGet<Book[]>('lumi:books') || [])
  }, [])

  function addBook() {
    if (!draftTitle.trim()) return
    const book: Book = {
      id: uid(), title: draftTitle.trim(), author: draftAuthor.trim(),
      note: draftNote.trim(), category: draftCategory, color: draftColor,
      addedAt: Date.now(),
    }
    const next = [...books, book]
    setBooks(next)
    storageSet('lumi:books', next)
    setShowAdd(false)
    setDraftTitle(''); setDraftAuthor(''); setDraftNote('')
    setDraftCategory('Growth'); setDraftColor(SPINE_COLORS[0])
  }

  function deleteBook(id: string) {
    const next = books.filter(b => b.id !== id)
    setBooks(next)
    storageSet('lumi:books', next)
    setOpenBook(null)
  }

  if (dark === null) return null

  const t = buildTheme(dark)
  const S = "var(--font-sans), 'Space Grotesk', sans-serif"
  const SE = "var(--font-serif), 'Newsreader', serif"

  // Chunk books into shelf rows
  const rows: Book[][] = []
  for (let i = 0; i < books.length; i += BOOKS_PER_SHELF) rows.push(books.slice(i, i + BOOKS_PER_SHELF))

  return (
    <div style={{ minHeight: '100vh', background: t.bg, fontFamily: S, color: t.text }}>

      {/* top bar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        backdropFilter: 'blur(10px)',
        background: dark ? 'rgba(19,17,31,.85)' : 'rgba(248,247,244,.85)',
        borderBottom: `1px solid ${t.border}`,
      } as React.CSSProperties}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 26px' }}>
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: t.muted }}>
            <span style={{ fontSize: '16px' }}>‹</span> Home
          </a>
          <div style={{ fontFamily: SE, fontSize: '20px', color: t.text }}>
            lumi<span style={{ color: t.accent }}>.</span>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              onClick={() => setShowAdd(true)}
              style={{
                cursor: 'pointer', fontFamily: S, fontSize: '13px', fontWeight: 500,
                color: '#fff', background: t.accent, border: 'none',
                borderRadius: '100px', padding: '8px 16px',
              }}
            >+ Add book</button>
            <button
              onClick={() => { const nd = !dark; localStorage.setItem('lumi:dark', nd ? '1' : '0'); setDark(nd) }}
              style={{ cursor: 'pointer', border: `1px solid ${t.border}`, background: t.card, color: t.text, borderRadius: '100px', padding: '6px 13px', fontFamily: S, fontSize: '12px' }}
            >{dark ? '☾  Dark' : '☀  Light'}</button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 26px 80px' }}>

        {/* Hero — Spline scene or CSS ambient header */}
        <div style={{ position: 'relative', borderRadius: '0 0 22px 22px', overflow: 'hidden', marginBottom: '40px' }}>
          {splineUrl ? (
            <div style={{ height: '320px', width: '100%' }}>
              <Spline scene={splineUrl} style={{ width: '100%', height: '100%' }} />
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,.5) 100%)',
                display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '32px',
              }}>
                <div style={{ fontFamily: SE, fontWeight: 300, fontSize: '36px', color: '#fff', lineHeight: 1.2 }}>Your shelf.</div>
                <div style={{ fontSize: '14px', color: 'rgba(255,255,255,.75)', marginTop: '6px' }}>
                  Every book you&apos;ve read. Every idea it left with you.
                </div>
              </div>
            </div>
          ) : (
            <div style={{ padding: '44px 0 32px' }}>
              <div style={{ fontFamily: SE, fontWeight: 300, fontSize: '36px', lineHeight: 1.2 }}>Your shelf.</div>
              <div style={{ fontSize: '14.5px', color: t.muted, marginTop: '7px', maxWidth: '480px' }}>
                Every book you&apos;ve read with Lumi — and what it gave you.
              </div>
              {!splineUrl && (
                <div style={{
                  marginTop: '12px', fontSize: '11.5px', color: t.muted,
                  background: t.card, border: `1px solid ${t.border}`,
                  borderRadius: '10px', padding: '9px 13px', display: 'inline-block',
                  lineHeight: 1.5,
                }}>
                  ✦ Add a calming 3D scene: set <code style={{ fontFamily: 'monospace', fontSize: '10.5px', background: t.soft, padding: '1px 5px', borderRadius: '4px' }}>NEXT_PUBLIC_SHELF_SPLINE_SCENE</code> in <code style={{ fontFamily: 'monospace', fontSize: '10.5px', background: t.soft, padding: '1px 5px', borderRadius: '4px' }}>.env.local</code>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Count badge */}
        {books.length > 0 && (
          <div style={{ fontSize: '12px', letterSpacing: '.1em', textTransform: 'uppercase', color: t.muted, marginBottom: '28px' }}>
            {books.length} book{books.length !== 1 ? 's' : ''} on your shelf
          </div>
        )}

        {/* Bookshelf */}
        {books.length > 0 ? (
          <div style={{ background: t.shelfBg, borderRadius: '16px', padding: '0 8px 0', overflow: 'hidden' }}>
            {rows.map((row, ri) => (
              <div key={ri}>
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: '5px',
                  padding: '28px 12px 0',
                  minHeight: '170px',
                  flexWrap: 'nowrap',
                  overflowX: ri === rows.length - 1 && row.length < BOOKS_PER_SHELF ? 'visible' : 'hidden',
                }}>
                  {row.map(book => (
                    <BookSpine
                      key={book.id}
                      book={book}
                      dark={dark}
                      onClick={() => setOpenBook(book)}
                    />
                  ))}
                </div>
                {/* Shelf plank */}
                <div style={{
                  height: '14px',
                  background: t.shelf,
                  margin: '0 4px',
                  borderRadius: '0 0 3px 3px',
                  boxShadow: `0 5px 10px ${t.shelfShadow}`,
                }} />
                {ri < rows.length - 1 && <div style={{ height: '20px' }} />}
              </div>
            ))}
            <div style={{ height: '24px' }} />
          </div>
        ) : (
          /* Empty state */
          <div style={{ textAlign: 'center', padding: '20px 20px 60px' }}>
            <div style={{ fontSize: '52px', marginBottom: '18px' }}>📚</div>
            <div style={{ fontFamily: SE, fontWeight: 300, fontSize: '24px', color: t.text }}>
              Your shelf is waiting.
            </div>
            <div style={{ fontSize: '14px', color: t.muted, marginTop: '9px', maxWidth: '360px', margin: '9px auto 0', lineHeight: 1.6 }}>
              Add books you&apos;ve read during your Lumi sessions — each one becomes a memory.
            </div>
            <button
              onClick={() => setShowAdd(true)}
              style={{
                marginTop: '24px', cursor: 'pointer', fontFamily: S,
                fontSize: '14px', fontWeight: 500, color: '#fff',
                background: t.accent, border: 'none', borderRadius: '100px', padding: '12px 28px',
              }}
            >+ Add your first book</button>
            {/* Empty shelf illustration */}
            <div style={{ marginTop: '48px', background: t.shelfBg, borderRadius: '12px', padding: '28px 12px 0' }}>
              <div style={{ height: '48px' }} />
              <div style={{
                height: '14px', background: t.shelf,
                margin: '0 4px', borderRadius: '0 0 3px 3px',
                boxShadow: `0 5px 10px ${t.shelfShadow}`,
              }} />
            </div>
          </div>
        )}
      </div>

      {/* ===== BOOK DETAIL PANEL ===== */}
      {openBook && (
        <div
          onClick={() => setOpenBook(null)}
          style={{ position: 'fixed', top:0, right:0, bottom:0, left:0, background: t.overlay, backdropFilter: 'blur(5px)', zIndex: 40, display: 'flex', justifyContent: 'flex-end' } as React.CSSProperties}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ width: '100%', maxWidth: '420px', height: '100%', background: dark ? '#1c1830' : '#fff', borderLeft: `1px solid ${t.border}`, padding: '32px 28px', overflowY: 'auto', display: 'flex', flexDirection: 'column', animation: 'panelIn .35s cubic-bezier(.2,.8,.2,1)' }}
          >
            {/* Close */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{ width: '14px', height: '32px', borderRadius: '3px 0 0 3px', background: openBook.color, boxShadow: `2px 0 8px rgba(0,0,0,.15)` }} />
                <div style={{ fontSize: '10.5px', letterSpacing: '.12em', textTransform: 'uppercase', color: t.accent }}>{openBook.category}</div>
              </div>
              <div onClick={() => setOpenBook(null)} style={{ cursor: 'pointer', fontSize: '22px', color: t.muted, lineHeight: 1 }}>×</div>
            </div>

            <div style={{ fontFamily: SE, fontSize: '26px', fontWeight: 400, lineHeight: 1.25, color: t.text }}>{openBook.title}</div>
            {openBook.author && (
              <div style={{ fontSize: '14.5px', color: t.muted, marginTop: '6px' }}>by {openBook.author}</div>
            )}
            <div style={{ fontSize: '11.5px', color: t.muted, marginTop: '10px', marginBottom: '28px' }}>
              Added {fmtDate(openBook.addedAt)}
            </div>

            {openBook.note ? (
              <>
                <div style={{ fontSize: '10.5px', letterSpacing: '.12em', textTransform: 'uppercase', color: t.muted, marginBottom: '10px' }}>
                  What it gave you
                </div>
                <div style={{
                  fontSize: '15.5px', fontFamily: SE, fontStyle: 'italic', fontWeight: 400,
                  lineHeight: 1.7, color: t.text,
                  background: dark ? 'rgba(255,255,255,.04)' : '#faf9f6',
                  border: `1px solid ${t.border}`,
                  borderRadius: '13px', padding: '18px 20px',
                }}>
                  &ldquo;{openBook.note}&rdquo;
                </div>
              </>
            ) : (
              <div style={{ fontSize: '13.5px', color: t.muted, fontStyle: 'italic' }}>No note added yet.</div>
            )}

            {/* Delete button — bottom of panel */}
            <div style={{ flex: 1 }} />
            <button
              onClick={() => deleteBook(openBook.id)}
              style={{
                marginTop: '40px', cursor: 'pointer', fontFamily: S, fontSize: '12.5px',
                color: t.muted, background: 'transparent',
                border: `1px solid ${t.border}`, borderRadius: '100px', padding: '9px 18px',
                alignSelf: 'flex-start',
              }}
            >Remove from shelf</button>
          </div>
        </div>
      )}

      {/* ===== ADD BOOK OVERLAY ===== */}
      {showAdd && (
        <div
          onClick={() => setShowAdd(false)}
          style={{ position: 'fixed', top:0, right:0, bottom:0, left:0, background: t.overlay, backdropFilter: 'blur(7px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' } as React.CSSProperties}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: '460px', background: dark ? '#1c1830' : '#fff',
              border: `1px solid ${t.border}`, borderRadius: '22px', padding: '32px 30px',
              animation: 'cardIn .4s cubic-bezier(.2,.8,.2,1)',
              boxShadow: '0 24px 70px rgba(20,16,12,.22)',
              maxHeight: '90vh', overflowY: 'auto',
            }}
          >
            <div style={{ fontFamily: SE, fontWeight: 300, fontSize: '25px', color: t.text, marginBottom: '22px' }}>
              Add a book
            </div>

            {/* Title */}
            <div style={{ fontSize: '11px', letterSpacing: '.12em', textTransform: 'uppercase', color: t.muted, marginBottom: '7px' }}>Title *</div>
            <input
              value={draftTitle}
              onChange={e => setDraftTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addBook() }}
              placeholder="e.g. Atomic Habits"
              autoFocus
              style={{ width: '100%', fontFamily: S, fontSize: '15px', color: t.text, background: t.field, border: `1px solid ${t.border}`, borderRadius: '11px', padding: '12px 15px', outline: 'none', marginBottom: '16px' }}
            />

            {/* Author */}
            <div style={{ fontSize: '11px', letterSpacing: '.12em', textTransform: 'uppercase', color: t.muted, marginBottom: '7px' }}>Author</div>
            <input
              value={draftAuthor}
              onChange={e => setDraftAuthor(e.target.value)}
              placeholder="e.g. James Clear"
              style={{ width: '100%', fontFamily: S, fontSize: '15px', color: t.text, background: t.field, border: `1px solid ${t.border}`, borderRadius: '11px', padding: '12px 15px', outline: 'none', marginBottom: '16px' }}
            />

            {/* Category */}
            <div style={{ fontSize: '11px', letterSpacing: '.12em', textTransform: 'uppercase', color: t.muted, marginBottom: '10px' }}>Category</div>
            <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap', marginBottom: '18px' }}>
              {CATEGORIES.map(c => {
                const active = draftCategory === c
                return (
                  <button key={c} onClick={() => setDraftCategory(c)} style={{
                    cursor: 'pointer', fontFamily: S, fontSize: '12.5px',
                    padding: '7px 14px', borderRadius: '100px',
                    border: `1.5px solid ${active ? t.accent : t.border}`,
                    background: active ? t.accent : 'transparent',
                    color: active ? '#fff' : t.muted, fontWeight: active ? 500 : 400,
                  }}>{c}</button>
                )
              })}
            </div>

            {/* Note */}
            <div style={{ fontSize: '11px', letterSpacing: '.12em', textTransform: 'uppercase', color: t.muted, marginBottom: '7px' }}>What did this book give you?</div>
            <textarea
              value={draftNote}
              onChange={e => setDraftNote(e.target.value)}
              placeholder="A sentence or a feeling — anything it left you with."
              rows={3}
              style={{ width: '100%', fontFamily: S, fontSize: '14px', color: t.text, background: t.field, border: `1px solid ${t.border}`, borderRadius: '11px', padding: '12px 15px', outline: 'none', resize: 'none', lineHeight: 1.55, marginBottom: '18px' }}
            />

            {/* Spine color */}
            <div style={{ fontSize: '11px', letterSpacing: '.12em', textTransform: 'uppercase', color: t.muted, marginBottom: '10px' }}>Spine colour</div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
              {SPINE_COLORS.map(c => (
                <div
                  key={c}
                  onClick={() => setDraftColor(c)}
                  style={{
                    width: '28px', height: '28px', borderRadius: '8px', background: c, cursor: 'pointer',
                    outline: draftColor === c ? `3px solid ${t.text}` : '3px solid transparent',
                    outlineOffset: '2px', transition: 'outline .15s',
                  }}
                />
              ))}
            </div>

            {/* Preview spine */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', marginBottom: '24px' }}>
              <div style={{
                width: '40px', height: '120px', background: draftColor, borderRadius: '3px 3px 0 0',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '2px 0 6px rgba(0,0,0,.12)',
                borderLeft: '3px solid rgba(255,255,255,.2)',
                position: 'relative', overflow: 'hidden',
                flexShrink: 0,
              }}>
                <div style={{ position: 'absolute', top: 0, left: 0, width: '40%', height: '100%', background: 'rgba(255,255,255,.1)' }} />
                <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontSize: '9px', fontWeight: 600, color: 'rgba(255,255,255,.9)', overflow: 'hidden', maxHeight: '100px', padding: '4px 0', textAlign: 'center' }}>
                  {draftTitle || 'Title'}
                </div>
              </div>
              <div style={{ fontSize: '13px', color: t.muted, lineHeight: 1.5 }}>
                This is how your book<br />will look on the shelf.
              </div>
            </div>

            <button
              onClick={addBook}
              disabled={!draftTitle.trim()}
              style={{
                width: '100%', cursor: draftTitle.trim() ? 'pointer' : 'not-allowed',
                fontFamily: S, fontSize: '14.5px', fontWeight: 500, color: '#fff',
                background: draftTitle.trim() ? t.accent : t.muted,
                border: 'none', borderRadius: '13px', padding: '14px',
                transition: 'background .2s',
              }}
            >Add to shelf →</button>
            <div onClick={() => setShowAdd(false)} style={{ marginTop: '11px', textAlign: 'center', fontSize: '12.5px', color: t.muted, cursor: 'pointer' }}>
              Cancel
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
