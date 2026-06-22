import { NextRequest, NextResponse } from 'next/server'

// 0.7 = slow, 1.0 = default, 1.3 = fast
const VOICE_SPEED = 0.9

export async function POST(req: NextRequest) {
  const { text, voiceId } = await req.json()
  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'no key' }, { status: 500 })

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      model_id: 'eleven_turbo_v2_5',
      voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.3, speed: VOICE_SPEED },
    }),
  })

  if (!res.ok) return NextResponse.json({ error: 'elevenlabs error' }, { status: 500 })
  const buffer = await res.arrayBuffer()
  return new NextResponse(buffer, { headers: { 'Content-Type': 'audio/mpeg' } })
}
