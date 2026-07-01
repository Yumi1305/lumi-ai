import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(req: NextRequest) {
  const { messages } = await req.json()
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({})

  const history = ((messages || []) as Array<{ role: string; text: string }>)
    .slice(-24)
    .map(m => ({
      role: (m.role === 'lumi' ? 'assistant' : 'user') as 'user' | 'assistant',
      content: m.text,
    }))

  if (history.length < 6) return NextResponse.json({})

  const anthropic = new Anthropic({ apiKey })

  try {
    const res = await anthropic.messages.create({
      model: 'claude-opus-4-8',
      system: `You are extracting key information about a user from their conversation with Lumi (a wellness AI companion).
Return ONLY a valid JSON object. Omit any field you don't have clear evidence for.
{
  "name": "first name if mentioned",
  "notes": "2-3 warm sentences summarizing who this person is, what they're working through, and what seems to help them",
  "topics": ["short recurring topic phrases, max 5"]
}`,
      messages: [
        ...history,
        { role: 'user', content: 'Based on our conversation, summarize what you know about me. Return JSON only.' },
      ],
      max_tokens: 300,
    })

    const text = res.content[0]?.type === 'text' ? res.content[0].text : ''
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return NextResponse.json({})
    return NextResponse.json(JSON.parse(match[0]))
  } catch {
    return NextResponse.json({})
  }
}
