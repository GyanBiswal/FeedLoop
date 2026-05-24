import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const { email, workspaceSlug } = await req.json()

  if (!email || !workspaceSlug) {
    return NextResponse.json(
      { error: 'Email and workspaceSlug are required' },
      { status: 400 }
    )
  }

  const workspace = await prisma.workspace.findUnique({
    where: { slug: workspaceSlug },
  })

  if (!workspace) {
    return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
  }

  await prisma.subscription.upsert({
    where: {
      email_workspaceId: {
        email,
        workspaceId: workspace.id,
      },
    },
    update: {},
    create: {
        email,
        workspaceId: workspace.id,
        user: {
            connect: {
            email,
            },
        },
    }
  })

  return NextResponse.json({ success: true })
}