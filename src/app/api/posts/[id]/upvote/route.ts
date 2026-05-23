import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const post = await prisma.post.findUnique({
    where: { id },
  })

  if (!post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  }

  const existing = await prisma.upvote.findUnique({
    where: {
      userId_postId: {
        userId: session.user.id,
        postId: id,
      },
    },
  })

  if (existing) {
    await prisma.upvote.delete({ where: { id: existing.id } })
    return NextResponse.json({ upvoted: false })
  }

  await prisma.upvote.create({
    data: {
      userId: session.user.id,
      postId: id,
    },
  })

  return NextResponse.json({ upvoted: true })
}