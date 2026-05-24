import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type WorkspaceMember = {
  userId: string
  role: string
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { url, workspaceSlug } = await req.json()

  if (!url || !workspaceSlug) {
    return NextResponse.json(
      { error: 'url and workspaceSlug are required' },
      { status: 400 }
    )
  }

  const workspace = await prisma.workspace.findUnique({
    where: { slug: workspaceSlug },
    include: { members: true },
  })

  if (!workspace) {
    return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
  }

  const member = workspace.members.find(
    (m: WorkspaceMember) => m.userId === session.user.id
  )
  if (!member || member.role === 'MEMBER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const webhook = await prisma.webhook.create({
    data: {
      url,
      workspaceId: workspace.id,
    },
  })

  return NextResponse.json(webhook)
}