import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { groq } from '@/lib/groq'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const { status } = await req.json()

  const validStatuses = ['UNDER_REVIEW', 'PLANNED', 'IN_PROGRESS', 'DONE']
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const post = await prisma.post.findUnique({
    where: { id },
    include: { workspace: { include: { members: true } } },
  })

  if (!post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  }

  const member = post.workspace.members.find(
    m => m.userId === session.user.id
  )

  if (!member || member.role === 'MEMBER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let changelog: string | undefined

  if (status === 'DONE' && post.status !== 'DONE') {
    try {
      const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content:
              'You are a product writer. Write a single short changelog entry (2-3 sentences max) in a friendly, user-facing tone. Do not use bullet points. Just plain prose.',
          },
          {
            role: 'user',
            content: `Write a changelog entry for this shipped feature:\nTitle: ${post.title}\nDescription: ${post.description ?? 'No description provided'}`,
          },
        ],
        max_tokens: 150,
      })
      changelog = completion.choices[0]?.message?.content ?? undefined
    } catch (e) {
      console.error('Groq changelog error:', e)
    }
  }

  const updated = await prisma.post.update({
    where: { id },
    data: {
      status,
      ...(changelog ? { changelog } : {}),
    },
  })

  return NextResponse.json(updated)
}