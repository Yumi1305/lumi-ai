import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(req: NextRequest) {
  const { tasks, profile } = await req.json()
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey || !Array.isArray(tasks) || !tasks.length) return NextResponse.json({})

  const anthropic = new Anthropic({ apiKey })

  const profileCtx = profile ? [
    profile.name ? `The user's name is ${profile.name}.` : '',
    profile.about || '',
    profile.lumiNotes || '',
  ].filter(Boolean).join(' ') : ''

  const system = `You are Lumi, a warm AI companion helping a student plan their day.
${profileCtx ? `What you know about this user: ${profileCtx}` : ''}

Create a realistic, encouraging study schedule for the tasks given. Return ONLY valid JSON:
{
  "greeting": "1-2 warm sentences addressing the user by name if known",
  "blocks": [
    { "time": "e.g. 10:00 AM", "task": "task or break name", "note": "one short practical or encouraging sentence" }
  ],
  "closing": "1 warm closing sentence with encouragement"
}

Guidelines:
- Start around mid-morning unless context suggests otherwise
- Pomodoro-friendly durations (25–50 min per work block)
- Include 5–10 min breaks between tasks, longer break after 3–4 blocks
- Maximum 8 blocks total
- Be warm and personal, not clinical or robotic`

  try {
    const res = await anthropic.messages.create({
      model: 'claude-opus-4-8',
      system,
      messages: [{
        role: 'user',
        content: `My tasks for today:\n${(tasks as string[]).map((t, i) => `${i + 1}. ${t}`).join('\n')}`,
      }],
      max_tokens: 700,
    })

    const text = res.content[0]?.type === 'text' ? res.content[0].text : ''
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return NextResponse.json({})
    return NextResponse.json(JSON.parse(match[0]))
  } catch {
    return NextResponse.json({}, { status: 500 })
  }
}
