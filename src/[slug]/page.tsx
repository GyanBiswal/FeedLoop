import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'

export default async function WorkspacePage({
  params,
}: {
  params: { slug: string }
}) {
  const workspace = await prisma.workspace.findUnique({
    where: { slug: params.slug },
  })

  if (!workspace) notFound()

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">{workspace.name}</h1>
          
            href={`/${workspace.slug}/admin`}
            className="text-sm text-gray-500 hover:text-black"
          >
            Admin →
          </a>
        </div>
        <p className="text-gray-500 text-sm">No feedback yet. Be the first to submit!</p>
      </div>
    </main>
  )
}