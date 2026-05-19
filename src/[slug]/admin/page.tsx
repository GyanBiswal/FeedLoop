import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { notFound, redirect } from 'next/navigation'

export default async function AdminPage({
  params,
}: {
  params: { slug: string }
}) {
  const session = await getServerSession()
  if (!session?.user?.email) redirect(`/api/auth/signin`)

  const workspace = await prisma.workspace.findUnique({
    where: { slug: params.slug },
    include: { members: { include: { user: true } } },
  })

  if (!workspace) notFound()

  const member = workspace.members.find(
    m => m.user.email === session.user?.email
  )

  if (!member || member.role === 'MEMBER') {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">You are not an admin of this workspace.</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">{workspace.name} — Admin</h1>
        <p className="text-gray-500 text-sm">No posts yet.</p>
      </div>
    </main>
  )
}