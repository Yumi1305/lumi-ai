import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const SYSTEM = `You are Lumi, a warm, perceptive AI companion designed to support students and anyone seeking focus and calm. Your role is to listen deeply, reflect back what you hear, and gently guide without lecturing.

Your personality:
- Compassionate and non-judgmental — every feeling is valid
- Curious and attentive — you ask one thoughtful question at a time
- Calm and grounding — you help people slow down and feel heard
- Honest but gentle — you don't offer empty reassurance

Your response style:
- 2–4 sentences max. Never write paragraphs.
- Start by reflecting what the person shared (an opener that shows you truly heard them)
- Sometimes add a short, concrete suggestion if the mood calls for it (e.g., a breathing exercise, ambient sounds)
- End with one open, curious question — never multiple questions
- Vary your openers; never sound formulaic

Current user mood: {{MOOD}}

Safety: If the user expresses thoughts of self-harm or suicide, gently acknowledge their pain and provide the Crisis Text Line: text HOME to 741741. Do not try to handle crisis situations yourself.`

// Keyword-based mood detection mirrored from the client
const MOOD_KEYWORDS: Record<string, string[]> = {
  anxious: ['anxious','nervous','worried','worry','stress','stressed','overwhelm','overwhelmed','panic','pressure','deadline','too much','scared','afraid','can\'t focus','behind'],
  sad:     ['sad','down','depress','depressed','lonely','empty','hopeless','cry','crying','unhappy','blue','hurt','miss'],
  tired:   ['tired','exhausted','drained','sleepy','burnt','burnout','no energy','fatigue','can\'t sleep','insomnia','worn'],
  angry:   ['angry','frustrated','annoyed','mad','irritated','unfair','hate','furious','fed up'],
  happy:   ['happy','great','excited','proud','amazing','joy','wonderful','love'],
  calm:    ['calm','peaceful','better','relaxed','grateful','okay','fine','good','relieved','content','ready'],
}

function detectMood(text: string): string | null {
  const l = ' ' + text.toLowerCase() + ' '
  for (const key of ['anxious','sad','tired','angry','happy','calm']) {
    if (MOOD_KEYWORDS[key].some(w => l.includes(w))) return key
  }
  return null
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { messages, text, mood: clientMood } = body

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ reply: null, mood: clientMood }, { status: 500 })
  }

  const anthropic = new Anthropic({ apiKey })

  const detectedMood = detectMood(text) || clientMood || 'neutral'
  const systemPrompt = SYSTEM.replace('{{MOOD}}', detectedMood)

  const history = ((messages || []) as Array<{ role: string; text: string }>)
    .slice(-12)
    .map(m => ({
      role: (m.role === 'lumi' ? 'assistant' : 'user') as 'assistant' | 'user',
      content: m.text,
    }))

  try {
    const completion = await anthropic.messages.create({
      model: 'claude-opus-4-8',
      system: systemPrompt,
      messages: [
        ...history,
        { role: 'user', content: text },
      ],
      max_tokens: 180,
    })

    const reply = completion.content[0]?.type === 'text' ? completion.content[0].text.trim() : null
    return NextResponse.json({ reply, mood: detectedMood })
  } catch (err) {
    console.error('[lumi/chat]', err)
    return NextResponse.json({ reply: null, mood: detectedMood }, { status: 500 })
  }
}
