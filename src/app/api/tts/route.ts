import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const VALID_VOICES = ['nova', 'shimmer', 'verse', 'fable', 'onyx', 'echo'] as const
type Voice = typeof VALID_VOICES[number]

export async function POST(req: NextRequest) {
  const { text, voiceId } = await req.json()

  // .env.local uses OPENAI-API-KEY (dash, not underscore)
  const apiKey = process.env['OPENAI_API_KEY']
  if (!apiKey) return NextResponse.json({ error: 'no key' }, { status: 500 })

  const voice: Voice = VALID_VOICES.includes(voiceId as Voice) ? voiceId : 'nova'

  const client = new OpenAI({ apiKey })

  // tts-1 is the fast streaming TTS model; tts-1-hd is higher quality but slower
  const response = await client.audio.speech.create({
    model: 'tts-1',
    input: text,
    voice,
    speed: 1.0,
    response_format: 'mp3',
  })

  const buffer = await response.arrayBuffer()
  return new NextResponse(buffer, { headers: { 'Content-Type': 'audio/mpeg' } })
}
