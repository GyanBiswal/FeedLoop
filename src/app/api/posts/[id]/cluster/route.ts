import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateEmbedding, cosineSimilarity } from '@/lib/embeddings'

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
    include: { workspace: { include: { members: true } } },
  })

  if (!post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  }

  const member = post.workspace.members.find(m => m.userId === session.user.id)
  if (!member || member.role === 'MEMBER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // generate embedding for this post
  const text = `${post.title} ${post.description ?? ''}`
  const embedding = await generateEmbedding(text)

  // get all other posts in workspace with embeddings
  const allPosts = await prisma.post.findMany({
    where: {
      workspaceId: post.workspaceId,
      id: { not: id },
      embedding: { isEmpty: false },
    },
  })

  // find similar posts (cosine similarity > 0.75)
  const similar = allPosts.filter(p => {
    if (!p.embedding?.length) return false
    return cosineSimilarity(embedding, p.embedding) > 0.75
  })

  // assign cluster id
  const clusterId =
    similar.length > 0
      ? (similar[0].clusterId ?? similar[0].id)
      : id

  await prisma.post.update({
    where: { id },
    data: {
      embedding,
      clusterId,
    },
  })

  return NextResponse.json({ clusterId, similarCount: similar.length })
}