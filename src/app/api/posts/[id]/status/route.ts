import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { groq } from '@/lib/groq'
import { resend } from '@/lib/resend'

type WorkspaceMember = {
  userId: string
  role: string
}

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
    include: {
      workspace: { include: { members: true } },
      upvotes: { include: { user: true } },
    },
  })

  if (!post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  }

  const member = post.workspace.members.find(
    (m: WorkspaceMember) => m.userId === session.user.id
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

    try {
      const subscriptions = await prisma.subscription.findMany({
        where: { workspaceId: post.workspaceId },
      })

      const upvoterEmails = post.upvotes
        .map((u: { user: { email: string } }) => u.user.email)
        .filter(Boolean) as string[]

      const allEmails = [
        ...new Set([...subscriptions.map((s: { email: string }) => s.email), ...upvoterEmails]),
      ]

      if (allEmails.length > 0) {
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL!,
          to: allEmails,
          subject: `✅ "${post.title}" has shipped!`,
          html: `
            <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
              <h2>🎉 A feature you requested just shipped!</h2>
              <h3>${post.title}</h3>
              ${changelog ? `<p>${changelog}</p>` : ''}
              <p style="color: #666;">Thanks for your feedback on ${post.workspace.name}.</p>
            </div>
          `,
        })
      }
    } catch (e) {
      console.error('Resend email error:', e)
    }
  }

  try {
    const webhooks = await prisma.webhook.findMany({
      where: { workspaceId: post.workspaceId },
    })
    for (const webhook of webhooks as { url: string }[]) {
      fetch(webhook.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'status.changed',
          postId: post.id,
          title: post.title,
          status,
          workspaceSlug: post.workspace.slug,
        }),
      }).catch((e: unknown) => console.error('Webhook error:', e))
    }
  } catch (e) {
    console.error('Webhook fetch error:', e)
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