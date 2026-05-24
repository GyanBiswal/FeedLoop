import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { Post } from '@prisma/client'

export default async function ChangelogPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const workspace = await prisma.workspace.findUnique({
    where: { slug },
  })

  if (!workspace) notFound()

  const posts = await prisma.post.findMany({
    where: {
      workspaceId: workspace.id,
      status: 'DONE',
      changelog: { not: null },
    },
    orderBy: { updatedAt: 'desc' },
  })

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{workspace.name}</h1>
            <p className="text-sm text-gray-500 mt-1">Changelog</p>
          </div>
          <a
            href={`/${slug}`}
            className="text-sm text-gray-500 hover:text-black"
          >
            ← Back to board
          </a>
        </div>

        {posts.length === 0 && (
          <p className="text-gray-400 text-sm text-center py-12">
            No shipped features yet.
          </p>
        )}

        <div className="space-y-6">
          {posts.map((post: Post) => (
            <div key={post.id} className="bg-white rounded-xl shadow p-6 space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">{post.title}</h2>
                <span className="text-xs text-gray-400">
                  {new Date(post.updatedAt).toLocaleDateString()}
                </span>
              </div>
              {post.changelog && (
                <p className="text-sm text-gray-600">{post.changelog}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}