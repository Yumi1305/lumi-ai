'use client'

import { useState, useEffect } from 'react'

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
function hexDarken(hex: string, amt = 0.28): string {
  const n = parseInt(hex.replace('#', ''), 16)
  const clamp = (v: number) => Math.max(0, Math.min(255, v))
  const r = clamp((n >> 16) - Math.round(255 * amt))
  const g = clamp(((n >> 8) & 0xff) - Math.round(255 * amt))
  const b = clamp((n & 0xff) - Math.round(255 * amt))
  return `rgb(${r},${g},${b})`
}

// ---- theme ----
function buildTheme(dark: boolean) {
  if (!dark) return {
    bg: '#eeede9', text: '#211f1d', muted: '#86847e', border: '#e3e1db',
    card: '#ffffff', accent: ACCENT, field: '#f8f7f4', overlay: 'rgba(40,36,32,.45)',
    // room
    wall: 'linear-gradient(160deg, #f0e9db 0%, #e8dfd0 60%, #dfd5c4 100%)',
    wallDark: 'radial-gradient(ellipse at 60% 10%, rgba(255,190,120,.07) 0%, transparent 55%), linear-gradient(160deg, #302858 0%, #241e48 60%, #180e30 100%)',
    floor: 'linear-gradient(to bottom, #d4b888 0%, #c0a070 100%)',
    floorDark: 'linear-gradient(to bottom, rgba(255,255,255,.04) 0%, rgba(255,255,255,.07) 100%)',
    shelfBack: 'linear-gradient(to bottom, #ddd0b8 0%, #cfc0a0 100%)',
    shelfBackDark: 'linear-gradient(to bottom, rgba(255,255,255,.05) 0%, rgba(255,255,255,.02) 100%)',
    plankTop: 'linear-gradient(to bottom, #c8a870 0%, #b89050 100%)',
    plankFront: 'linear-gradient(to bottom, #9a7038 0%, #7a5020 100%)',
    plankTopDark: 'linear-gradient(to bottom, rgba(255,255,255,.14) 0%, rgba(255,255,255,.08) 100%)',
    plankFrontDark: 'linear-gradient(to bottom, rgba(0,0,0,.35) 0%, rgba(0,0,0,.5) 100%)',
    shelfSide: '#a87848',
    shelfSideDark: 'rgba(255,255,255,.06)',
    win: 'linear-gradient(145deg, #c8dcf0 0%, #d8eafa 100%)',
    winDark: 'linear-gradient(145deg, #1a2848 0%, #0e1c38 100%)',
  }
  return {
    bg: '#13111f', text: '#f1eefb', muted: '#928bb6', border: 'rgba(255,255,255,.1)',
    card: 'rgba(255,255,255,.04)', accent: '#ffb08c', field: 'rgba(255,255,255,.05)',
    overlay: 'rgba(10,8,20,.6)',
    wall: '', wallDark: 'radial-gradient(ellipse at 60% 10%, rgba(255,190,120,.07) 0%, transparent 55%), linear-gradient(160deg, #302858 0%, #241e48 60%, #180e30 100%)',
    floor: '', floorDark: 'linear-gradient(to bottom, rgba(255,255,255,.03) 0%, rgba(255,255,255,.06) 100%)',
    shelfBack: '', shelfBackDark: 'linear-gradient(to bottom, rgba(255,255,255,.05) 0%, rgba(255,255,255,.02) 100%)',
    plankTop: '', plankFront: '',
    plankTopDark: 'linear-gradient(to bottom, rgba(255,255,255,.14) 0%, rgba(255,255,255,.08) 100%)',
    plankFrontDark: 'linear-gradient(to bottom, rgba(0,0,0,.35) 0%, rgba(0,0,0,.5) 100%)',
    shelfSide: '', shelfSideDark: 'rgba(255,255,255,.06)',
    win: '', winDark: 'linear-gradient(145deg, #1a2848 0%, #0e1c38 100%)',
  }
}

// ---- BookSpine ----
function BookSpine({ book, onClick, dark }: { book: Book; onClick: () => void; dark: boolean }) {
  const h = spineHeight(book.id)
  const [hovered, setHovered] = useState(false)
  const edgeColor = hexDarken(book.color, 0.3)

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        width: '44px', height: `${h}px`, flexShrink: 0,
        cursor: 'pointer',
        transform: hovered ? 'translateY(-22px)' : 'translateY(0)',
        transition: 'transform .28s cubic-bezier(.2,.8,.2,1)',
      }}
    >
      {/* Spine face */}
      <div style={{
        position: 'absolute', inset: 0,
        background: book.color,
        borderRadius: '3px 3px 0 0',
        overflow: 'hidden',
        boxShadow: hovered
          ? `3px 10px 32px ${dark ? 'rgba(0,0,0,.65)' : 'rgba(60,35,10,.32)'}`
          : `1px 3px 8px ${dark ? 'rgba(0,0,0,.4)' : 'rgba(60,35,10,.18)'}`,
        transition: 'box-shadow .28s ease',
      }}>
        {/* Gloss sheen */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: '38%', height: '100%', background: 'linear-gradient(to right, rgba(255,255,255,.22), transparent)', pointerEvents: 'none' }} />
        {/* Spine top band */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '6px', background: 'rgba(0,0,0,.12)' }} />
        {/* Title */}
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '10px 3px',
        }}>
          <div style={{
            writingMode: 'vertical-rl', transform: 'rotate(180deg)',
            fontSize: '9.5px', fontWeight: 600, letterSpacing: '.04em',
            color: 'rgba(255,255,255,.92)', textShadow: '0 1px 3px rgba(0,0,0,.28)',
            overflow: 'hidden', maxHeight: `${h - 20}px`,
            textAlign: 'center', lineHeight: 1.25, wordBreak: 'break-word',
            fontFamily: "'Space Grotesk', sans-serif",
          }}>{book.title}</div>
        </div>
      </div>

      {/* Book thickness edge (right side) */}
      <div style={{
        position: 'absolute', right: '-4px', top: '4px', bottom: 0, width: '4px',
        background: `linear-gradient(to right, ${edgeColor}, ${hexDarken(book.color, 0.45)})`,
        borderRadius: '0 2px 0 0',
      }} />
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
    setBooks(next); storageSet('lumi:books', next)
    setShowAdd(false)
    setDraftTitle(''); setDraftAuthor(''); setDraftNote('')
    setDraftCategory('Growth'); setDraftColor(SPINE_COLORS[0])
  }

  function deleteBook(id: string) {
    const next = books.filter(b => b.id !== id)
    setBooks(next); storageSet('lumi:books', next); setOpenBook(null)
  }

  if (dark === null) return null

  const t = buildTheme(dark)
  const S = "var(--font-sans), 'Space Grotesk', sans-serif"
  const SE = "var(--font-serif), 'Newsreader', serif"

  const rows: Book[][] = []
  for (let i = 0; i < books.length; i += BOOKS_PER_SHELF) rows.push(books.slice(i, i + BOOKS_PER_SHELF))

  const wallBg = dark ? t.wallDark : t.wall
  const floorBg = dark ? t.floorDark : t.floor
  const shelfBackBg = dark ? t.shelfBackDark : t.shelfBack
  const plankTopBg = dark ? t.plankTopDark : t.plankTop
  const plankFrontBg = dark ? t.plankFrontDark : t.plankFront

  return (
    <div style={{ minHeight: '100vh', background: t.bg, fontFamily: S, color: t.text }}>

      {/* Global keyframes */}
      <style>{`
        @keyframes panelIn { from { transform: translateX(100%) } to { transform: translateX(0) } }
        @keyframes cardIn  { from { opacity:0; transform: translateY(20px) scale(.97) } to { opacity:1; transform:none } }
        @keyframes fadeIn  { from { opacity:0 } to { opacity:1 } }
        .leaf { animation: sway 6s ease-in-out infinite alternate; transform-origin: bottom center; }
        @keyframes sway { from { transform: rotate(-4deg) } to { transform: rotate(4deg) } }
      `}</style>

      {/* top bar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        backdropFilter: 'blur(10px)',
        background: dark ? 'rgba(19,17,31,.88)' : 'rgba(248,247,244,.88)',
        borderBottom: `1px solid ${t.border}`,
      } as React.CSSProperties}>
        <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 26px' }}>
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: t.muted }}>
            <span style={{ fontSize: '16px' }}>‹</span> Home
          </a>
          <div style={{ fontFamily: SE, fontSize: '20px', color: t.text }}>
            lumi<span style={{ color: t.accent }}>.</span>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button onClick={() => setShowAdd(true)} style={{ cursor: 'pointer', fontFamily: S, fontSize: '13px', fontWeight: 500, color: '#fff', background: t.accent, border: 'none', borderRadius: '100px', padding: '8px 16px' }}>
              + Add book
            </button>
            <button onClick={() => { const nd = !dark; localStorage.setItem('lumi:dark', nd ? '1' : '0'); setDark(nd) }} style={{ cursor: 'pointer', border: `1px solid ${t.border}`, background: t.card, color: t.text, borderRadius: '100px', padding: '6px 13px', fontFamily: S, fontSize: '12px' }}>
              {dark ? '☾  Dark' : '☀  Light'}
            </button>
          </div>
        </div>
      </div>

      {/* ===== 3D ROOM SCENE ===== */}
      <div style={{
        position: 'relative', overflow: 'hidden',
        borderRadius: '0 0 28px 28px',
        marginBottom: '40px',
        minHeight: books.length === 0 ? '460px' : 'auto',
      }}>

        {/* Wall background */}
        <div style={{ position: 'absolute', inset: 0, background: wallBg, zIndex: 0 }} />

        {/* Ambient window light */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
          background: dark
            ? 'radial-gradient(ellipse at 75% 8%, rgba(180,140,255,.07) 0%, transparent 50%)'
            : 'radial-gradient(ellipse at 75% 5%, rgba(255,235,190,.65) 0%, transparent 48%)',
        }} />

        {/* Window */}
        <div style={{
          position: 'absolute', top: '28px', right: '90px', zIndex: 2,
          width: '88px', height: '110px',
          background: dark ? t.winDark : t.win,
          borderRadius: '4px 4px 0 0',
          boxShadow: dark
            ? 'inset 0 0 0 3px rgba(255,255,255,.1), 0 6px 24px rgba(0,0,0,.35)'
            : 'inset 0 0 0 3px rgba(180,155,120,.5), 0 4px 18px rgba(0,0,0,.1)',
        }}>
          <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: '2px', background: dark ? 'rgba(255,255,255,.12)' : 'rgba(180,155,120,.5)', transform: 'translateX(-50%)' }} />
          <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '2px', background: dark ? 'rgba(255,255,255,.12)' : 'rgba(180,155,120,.5)', transform: 'translateY(-50%)' }} />
          {/* Stars or clouds */}
          {dark ? (
            <>
              <div style={{ position: 'absolute', top: '18px', left: '14px', width: '4px', height: '4px', borderRadius: '50%', background: 'rgba(255,255,255,.7)' }} />
              <div style={{ position: 'absolute', top: '38px', right: '12px', width: '3px', height: '3px', borderRadius: '50%', background: 'rgba(255,255,255,.5)' }} />
              <div style={{ position: 'absolute', top: '28px', left: '30px', width: '2px', height: '2px', borderRadius: '50%', background: 'rgba(255,255,255,.4)' }} />
            </>
          ) : (
            <>
              <div style={{ position: 'absolute', bottom: '20px', left: '10px', width: '28px', height: '10px', borderRadius: '50%', background: 'rgba(255,255,255,.8)', filter: 'blur(3px)' }} />
              <div style={{ position: 'absolute', bottom: '26px', left: '22px', width: '20px', height: '8px', borderRadius: '50%', background: 'rgba(255,255,255,.9)', filter: 'blur(2px)' }} />
            </>
          )}
        </div>

        {/* Window sill */}
        <div style={{
          position: 'absolute', top: '137px', right: '82px', zIndex: 2,
          width: '104px', height: '10px',
          background: dark ? 'rgba(255,255,255,.1)' : 'linear-gradient(to bottom, #f0e6d0, #ddd0b8)',
          borderRadius: '2px',
          boxShadow: '0 2px 6px rgba(0,0,0,.12)',
        }} />

        {/* Plant — bottom left */}
        <div style={{ position: 'absolute', bottom: 0, left: '50px', zIndex: 3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* Leaves */}
          <div style={{ position: 'relative', width: '60px', marginBottom: '-6px' }}>
            {[
              { l: 5, t: 40, w: 26, h: 42, rot: -35, color: dark ? '#3a6640' : '#5a9a60' },
              { l: 20, t: 24, w: 22, h: 36, rot: 5, color: dark ? '#4a7450' : '#6aaa70' },
              { l: 8, t: 12, w: 20, h: 34, rot: -55, color: dark ? '#447848' : '#64a268' },
              { l: 26, t: 8, w: 18, h: 30, rot: 30, color: dark ? '#3e6e44' : '#5e9864' },
              { l: 16, t: 0, w: 16, h: 28, rot: -10, color: dark ? '#4a7a50' : '#6aae72' },
            ].map((leaf, i) => (
              <div key={i} className="leaf" style={{
                position: 'absolute', left: leaf.l, top: leaf.t,
                width: leaf.w, height: leaf.h,
                background: leaf.color,
                borderRadius: '50% 50% 40% 40% / 60% 60% 40% 40%',
                transform: `rotate(${leaf.rot}deg)`,
                animationDelay: `${i * 0.4}s`,
                boxShadow: '0 3px 10px rgba(0,0,0,.18)',
              }} />
            ))}
          </div>
          {/* Pot */}
          <div style={{
            width: '38px', height: '32px', flexShrink: 0, zIndex: 4,
            background: dark ? 'linear-gradient(to bottom, #8a6040, #6a4828)' : 'linear-gradient(to bottom, #c08050, #9a6038)',
            borderRadius: '0 0 14px 14px',
            boxShadow: '0 4px 12px rgba(0,0,0,.2)',
            position: 'relative',
          }}>
            <div style={{ position: 'absolute', top: 0, left: '-4px', right: '-4px', height: '7px', background: dark ? '#9a7050' : '#d09060', borderRadius: '4px 4px 0 0' }} />
          </div>
        </div>

        {/* Small framed picture on wall */}
        <div style={{
          position: 'absolute', top: '38px', left: '100px', zIndex: 2,
          width: '64px', height: '52px',
          background: dark ? 'rgba(255,255,255,.06)' : 'rgba(255,255,255,.8)',
          border: dark ? '3px solid rgba(255,255,255,.15)' : '3px solid #d8c8a8',
          borderRadius: '3px',
          boxShadow: '0 4px 14px rgba(0,0,0,.15)',
          overflow: 'hidden',
        }}>
          {/* Abstract art */}
          <div style={{ position: 'absolute', inset: 0, background: dark ? 'linear-gradient(135deg, #3a2858 0%, #1a3048 100%)' : 'linear-gradient(135deg, #f0e8d8 0%, #d8e8f0 100%)' }} />
          <div style={{ position: 'absolute', bottom: '6px', left: '8px', width: '26px', height: '28px', borderRadius: '50%', background: dark ? 'rgba(180,140,255,.3)' : 'rgba(100,140,200,.25)', filter: 'blur(4px)' }} />
          <div style={{ position: 'absolute', top: '8px', right: '6px', width: '20px', height: '20px', borderRadius: '50%', background: dark ? 'rgba(255,160,100,.25)' : 'rgba(200,120,80,.2)', filter: 'blur(3px)' }} />
        </div>

        {/* Floor strip */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 2,
          height: '60px',
          background: floorBg,
          borderTop: dark ? '1px solid rgba(255,255,255,.06)' : '1px solid rgba(160,120,70,.25)',
        }}>
          {/* Floor boards */}
          {[18, 38, 55].map(y => (
            <div key={y} style={{ position: 'absolute', top: y, left: 0, right: 0, height: '1px', background: dark ? 'rgba(255,255,255,.04)' : 'rgba(0,0,0,.06)' }} />
          ))}
        </div>

        {/* Edge vignette */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none', background: 'radial-gradient(ellipse at 50% 50%, transparent 45%, rgba(0,0,0,.16) 100%)' }} />

        {/* ===== SHELF UNIT ===== */}
        <div style={{
          position: 'relative', zIndex: 3,
          maxWidth: '900px', margin: '0 auto',
          paddingTop: '52px', paddingBottom: '60px',
          paddingLeft: '26px', paddingRight: '26px',
        }}>

          {/* Title in room */}
          {books.length > 0 && (
            <div style={{ marginBottom: '28px' }}>
              <div style={{ fontFamily: SE, fontWeight: 300, fontSize: '34px', lineHeight: 1.2, color: dark ? '#f1eefb' : '#2a2018', textShadow: dark ? 'none' : '0 1px 4px rgba(255,255,255,.6)' }}>
                Your shelf.
              </div>
              <div style={{ fontSize: '13.5px', color: dark ? 'rgba(241,238,251,.5)' : 'rgba(42,32,24,.5)', marginTop: '5px' }}>
                {books.length} book{books.length !== 1 ? 's' : ''}{books.filter(b => b.note).length > 0 ? ` · ${books.filter(b => b.note).length} with notes` : ''}
              </div>
            </div>
          )}

          {books.length > 0 ? (
            // Shelf unit with back panel
            <div style={{
              background: shelfBackBg,
              borderRadius: '10px 10px 4px 4px',
              padding: '0 16px',
              boxShadow: dark
                ? 'inset 0 0 40px rgba(0,0,0,.3), 0 8px 40px rgba(0,0,0,.4)'
                : 'inset 0 0 40px rgba(100,70,30,.06), 0 8px 40px rgba(80,50,20,.18)',
              // Left and right wood sides via border
              borderLeft: dark ? '14px solid rgba(255,255,255,.06)' : '14px solid #9a7040',
              borderRight: dark ? '14px solid rgba(255,255,255,.04)' : '14px solid #7a5828',
              position: 'relative',
            }}>
              {rows.map((row, ri) => (
                <div key={ri} style={{ paddingTop: '24px' }}>
                  {/* Books row */}
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '5px', minHeight: '180px' }}>
                    {row.map(book => (
                      <BookSpine key={book.id} book={book} dark={dark} onClick={() => setOpenBook(book)} />
                    ))}
                  </div>

                  {/* Shelf plank with 3D depth */}
                  <div style={{ position: 'relative', height: '20px', marginTop: '0' }}>
                    {/* Top face */}
                    <div style={{
                      position: 'absolute', top: 0, left: '-16px', right: '-16px', height: '9px',
                      background: plankTopBg,
                      boxShadow: dark ? 'none' : 'inset 0 -1px 0 rgba(0,0,0,.08)',
                    }} />
                    {/* Front face */}
                    <div style={{
                      position: 'absolute', bottom: 0, left: '-16px', right: '-16px', height: '11px',
                      background: plankFrontBg,
                      boxShadow: `0 5px 14px ${dark ? 'rgba(0,0,0,.45)' : 'rgba(60,35,10,.22)'}`,
                    }} />
                  </div>

                  {ri < rows.length - 1 && <div style={{ height: '10px' }} />}
                </div>
              ))}
              <div style={{ height: '20px' }} />
            </div>
          ) : (
            /* Empty state */
            <div style={{ textAlign: 'center', paddingTop: '30px', paddingBottom: '20px' }}>
              <div style={{ fontFamily: SE, fontWeight: 300, fontSize: '32px', color: dark ? '#f1eefb' : '#2a2018', textShadow: dark ? 'none' : '0 1px 4px rgba(255,255,255,.6)', marginBottom: '10px' }}>
                Your shelf is waiting.
              </div>
              <div style={{ fontSize: '14px', color: dark ? 'rgba(241,238,251,.5)' : 'rgba(42,32,24,.5)', lineHeight: 1.6, maxWidth: '340px', margin: '0 auto 28px' }}>
                Add books you&apos;ve read during your Lumi sessions — each one becomes a memory.
              </div>
              <button
                onClick={() => setShowAdd(true)}
                style={{ cursor: 'pointer', fontFamily: S, fontSize: '14px', fontWeight: 500, color: '#fff', background: ACCENT, border: 'none', borderRadius: '100px', padding: '12px 28px', boxShadow: '0 4px 16px rgba(189,98,64,.35)' }}
              >+ Add your first book</button>

              {/* Empty shelf illustration */}
              <div style={{ marginTop: '40px', background: shelfBackBg, borderRadius: '10px 10px 4px 4px', padding: '20px 16px 0', borderLeft: dark ? '14px solid rgba(255,255,255,.06)' : '14px solid #9a7040', borderRight: dark ? '14px solid rgba(255,255,255,.04)' : '14px solid #7a5828' }}>
                <div style={{ height: '56px' }} />
                <div style={{ position: 'relative', height: '20px' }}>
                  <div style={{ position: 'absolute', top: 0, left: '-16px', right: '-16px', height: '9px', background: plankTopBg }} />
                  <div style={{ position: 'absolute', bottom: 0, left: '-16px', right: '-16px', height: '11px', background: plankFrontBg, boxShadow: `0 5px 14px ${dark ? 'rgba(0,0,0,.45)' : 'rgba(60,35,10,.22)'}` }} />
                </div>
                <div style={{ height: '20px' }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===== BOOK DETAIL PANEL ===== */}
      {openBook && (
        <div onClick={() => setOpenBook(null)} style={{ position: 'fixed', top:0, right:0, bottom:0, left:0, background: t.overlay, backdropFilter: 'blur(5px)', zIndex: 40, display: 'flex', justifyContent: 'flex-end' } as React.CSSProperties}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '420px', height: '100%', background: dark ? '#1c1830' : '#fff', borderLeft: `1px solid ${t.border}`, padding: '32px 28px', overflowY: 'auto', display: 'flex', flexDirection: 'column', animation: 'panelIn .35s cubic-bezier(.2,.8,.2,1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{ width: '14px', height: '32px', borderRadius: '3px 0 0 3px', background: openBook.color, boxShadow: `2px 0 8px rgba(0,0,0,.15)` }} />
                <div style={{ fontSize: '10.5px', letterSpacing: '.12em', textTransform: 'uppercase', color: t.accent }}>{openBook.category}</div>
              </div>
              <div onClick={() => setOpenBook(null)} style={{ cursor: 'pointer', fontSize: '22px', color: t.muted, lineHeight: 1 }}>×</div>
            </div>
            <div style={{ fontFamily: SE, fontSize: '26px', fontWeight: 400, lineHeight: 1.25, color: t.text }}>{openBook.title}</div>
            {openBook.author && <div style={{ fontSize: '14.5px', color: t.muted, marginTop: '6px' }}>by {openBook.author}</div>}
            <div style={{ fontSize: '11.5px', color: t.muted, marginTop: '10px', marginBottom: '28px' }}>Added {fmtDate(openBook.addedAt)}</div>
            {openBook.note ? (
              <>
                <div style={{ fontSize: '10.5px', letterSpacing: '.12em', textTransform: 'uppercase', color: t.muted, marginBottom: '10px' }}>What it gave you</div>
                <div style={{ fontSize: '15.5px', fontFamily: SE, fontStyle: 'italic', lineHeight: 1.7, color: t.text, background: dark ? 'rgba(255,255,255,.04)' : '#faf9f6', border: `1px solid ${t.border}`, borderRadius: '13px', padding: '18px 20px' }}>
                  &ldquo;{openBook.note}&rdquo;
                </div>
              </>
            ) : (
              <div style={{ fontSize: '13.5px', color: t.muted, fontStyle: 'italic' }}>No note added yet.</div>
            )}
            <div style={{ flex: 1 }} />
            <button onClick={() => deleteBook(openBook.id)} style={{ marginTop: '40px', cursor: 'pointer', fontFamily: S, fontSize: '12.5px', color: t.muted, background: 'transparent', border: `1px solid ${t.border}`, borderRadius: '100px', padding: '9px 18px', alignSelf: 'flex-start' }}>
              Remove from shelf
            </button>
          </div>
        </div>
      )}

      {/* ===== ADD BOOK OVERLAY ===== */}
      {showAdd && (
        <div onClick={() => setShowAdd(false)} style={{ position: 'fixed', top:0, right:0, bottom:0, left:0, background: t.overlay, backdropFilter: 'blur(7px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' } as React.CSSProperties}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '460px', background: dark ? '#1c1830' : '#fff', border: `1px solid ${t.border}`, borderRadius: '22px', padding: '32px 30px', animation: 'cardIn .4s cubic-bezier(.2,.8,.2,1)', boxShadow: '0 24px 70px rgba(20,16,12,.22)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ fontFamily: SE, fontWeight: 300, fontSize: '25px', color: t.text, marginBottom: '22px' }}>Add a book</div>

            <div style={{ fontSize: '11px', letterSpacing: '.12em', textTransform: 'uppercase', color: t.muted, marginBottom: '7px' }}>Title *</div>
            <input value={draftTitle} onChange={e => setDraftTitle(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addBook() }} placeholder="e.g. Atomic Habits" autoFocus style={{ width: '100%', fontFamily: S, fontSize: '15px', color: t.text, background: t.field, border: `1px solid ${t.border}`, borderRadius: '11px', padding: '12px 15px', outline: 'none', marginBottom: '16px' }} />

            <div style={{ fontSize: '11px', letterSpacing: '.12em', textTransform: 'uppercase', color: t.muted, marginBottom: '7px' }}>Author</div>
            <input value={draftAuthor} onChange={e => setDraftAuthor(e.target.value)} placeholder="e.g. James Clear" style={{ width: '100%', fontFamily: S, fontSize: '15px', color: t.text, background: t.field, border: `1px solid ${t.border}`, borderRadius: '11px', padding: '12px 15px', outline: 'none', marginBottom: '16px' }} />

            <div style={{ fontSize: '11px', letterSpacing: '.12em', textTransform: 'uppercase', color: t.muted, marginBottom: '10px' }}>Category</div>
            <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap', marginBottom: '18px' }}>
              {CATEGORIES.map(c => {
                const active = draftCategory === c
                return <button key={c} onClick={() => setDraftCategory(c)} style={{ cursor: 'pointer', fontFamily: S, fontSize: '12.5px', padding: '7px 14px', borderRadius: '100px', border: `1.5px solid ${active ? t.accent : t.border}`, background: active ? t.accent : 'transparent', color: active ? '#fff' : t.muted, fontWeight: active ? 500 : 400 }}>{c}</button>
              })}
            </div>

            <div style={{ fontSize: '11px', letterSpacing: '.12em', textTransform: 'uppercase', color: t.muted, marginBottom: '7px' }}>What did this book give you?</div>
            <textarea value={draftNote} onChange={e => setDraftNote(e.target.value)} placeholder="A sentence or a feeling — anything it left you with." rows={3} style={{ width: '100%', fontFamily: S, fontSize: '14px', color: t.text, background: t.field, border: `1px solid ${t.border}`, borderRadius: '11px', padding: '12px 15px', outline: 'none', resize: 'none', lineHeight: 1.55, marginBottom: '18px' }} />

            <div style={{ fontSize: '11px', letterSpacing: '.12em', textTransform: 'uppercase', color: t.muted, marginBottom: '10px' }}>Spine colour</div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
              {SPINE_COLORS.map(c => (
                <div key={c} onClick={() => setDraftColor(c)} style={{ width: '28px', height: '28px', borderRadius: '8px', background: c, cursor: 'pointer', outline: draftColor === c ? `3px solid ${t.text}` : '3px solid transparent', outlineOffset: '2px', transition: 'outline .15s' }} />
              ))}
            </div>

            {/* Preview */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', marginBottom: '24px' }}>
              <div style={{ position: 'relative', width: '44px', height: '120px', flexShrink: 0 }}>
                <div style={{ position: 'absolute', inset: 0, background: draftColor, borderRadius: '3px 3px 0 0', overflow: 'hidden', boxShadow: '2px 4px 12px rgba(0,0,0,.18)' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, width: '38%', height: '100%', background: 'linear-gradient(to right, rgba(255,255,255,.2), transparent)' }} />
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 3px' }}>
                    <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontSize: '9px', fontWeight: 600, color: 'rgba(255,255,255,.9)', overflow: 'hidden', maxHeight: '100px', textAlign: 'center', lineHeight: 1.2, wordBreak: 'break-word', fontFamily: "'Space Grotesk', sans-serif" }}>
                      {draftTitle || 'Title'}
                    </div>
                  </div>
                </div>
                <div style={{ position: 'absolute', right: '-4px', top: '4px', bottom: 0, width: '4px', background: hexDarken(draftColor), borderRadius: '0 2px 0 0' }} />
              </div>
              <div style={{ fontSize: '13px', color: t.muted, lineHeight: 1.5 }}>This is how your<br />book will look.</div>
            </div>

            <button onClick={addBook} disabled={!draftTitle.trim()} style={{ width: '100%', cursor: draftTitle.trim() ? 'pointer' : 'not-allowed', fontFamily: S, fontSize: '14.5px', fontWeight: 500, color: '#fff', background: draftTitle.trim() ? t.accent : t.muted, border: 'none', borderRadius: '13px', padding: '14px', transition: 'background .2s' }}>
              Add to shelf →
            </button>
            <div onClick={() => setShowAdd(false)} style={{ marginTop: '11px', textAlign: 'center', fontSize: '12.5px', color: t.muted, cursor: 'pointer' }}>Cancel</div>
          </div>
        </div>
      )}
    </div>
  )
}
