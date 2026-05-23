import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const workspaceSlug = searchParams.get('slug')

  if (!workspaceSlug) {
    return NextResponse.json({ error: 'Slug is required' }, { status: 400 })
  }

  const workspace = await prisma.workspace.findUnique({
    where: { slug: workspaceSlug },
  })

  if (!workspace) {
    return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
  }

  const posts = await prisma.post.findMany({
    where: { workspaceId: workspace.id },
    include: {
      author: { select: { name: true, image: true } },
      _count: { select: { upvotes: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(posts)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)

  const { title, description, workspaceSlug } = await req.json()

  if (!title || !workspaceSlug) {
    return NextResponse.json(
      { error: 'Title and workspaceSlug are required' },
      { status: 400 }
    )
  }

  const workspace = await prisma.workspace.findUnique({
    where: { slug: workspaceSlug },
  })

  if (!workspace) {
    return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
  }

  const post = await prisma.post.create({
    data: {
      title,
      description,
      workspaceId: workspace.id,
      authorId: session?.user?.id ?? null,
    },
  })

  return NextResponse.json(post)
}