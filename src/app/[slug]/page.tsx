'use client'

import { useEffect, useState } from 'react'
import { useSession, signIn } from 'next-auth/react'
import { useParams } from 'next/navigation'

type Post = {
  id: string
  title: string
  description: string | null
  status: string
  createdAt: string
  _count: { upvotes: number }
  author: { name: string | null; image: string | null } | null
}

export default function WorkspacePage() {
  const { slug } = useParams<{ slug: string }>()
  const { data: session } = useSession()
  const [posts, setPosts] = useState<Post[]>([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [upvoted, setUpvoted] = useState<Record<string, boolean>>({})

  async function fetchPosts() {
    const res = await fetch(`/api/posts?slug=${slug}`)
    const data = await res.json()
    if (Array.isArray(data)) setPosts(data)
  }

  useEffect(() => {
    fetchPosts()
  }, [slug])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, workspaceSlug: slug }),
    })
    setTitle('')
    setDescription('')
    await fetchPosts()
    setSubmitting(false)
  }

  async function handleUpvote(postId: string) {
    if (!session) {
      signIn('github')
      return
    }
    // optimistic update
    setUpvoted(prev => ({ ...prev, [postId]: !prev[postId] }))
    setPosts(prev =>
      prev.map(p =>
        p.id === postId
          ? {
              ...p,
              _count: {
                upvotes: upvoted[postId]
                  ? p._count.upvotes - 1
                  : p._count.upvotes + 1,
              },
            }
          : p
      )
    )
    await fetch(`/api/posts/${postId}/upvote`, { method: 'POST' })
  }

  const statusColors: Record<string, string> = {
    UNDER_REVIEW: 'bg-gray-100 text-gray-600',
    PLANNED: 'bg-blue-100 text-blue-600',
    IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
    DONE: 'bg-green-100 text-green-700',
  }

  const statusLabels: Record<string, string> = {
    UNDER_REVIEW: 'Under Review',
    PLANNED: 'Planned',
    IN_PROGRESS: 'In Progress',
    DONE: 'Done',
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto space-y-8">

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">{slug}</h1>
          <div className="flex items-center gap-3">
            {session ? (
              <span className="text-sm text-gray-500">{session.user?.name}</span>
            ) : (
              <button
                onClick={() => signIn('github')}
                className="text-sm text-gray-500 hover:text-black"
              >
                Sign in
              </button>
            )}
            <a
              href={`/${slug}/admin`}
              className="text-sm text-gray-500 hover:text-black"
            >
              Admin →
            </a>
          </div>
        </div>

        {/* Submit form */}
        <div className="bg-white rounded-xl shadow p-6 space-y-3">
          <h2 className="font-semibold text-gray-800">Submit feedback</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="text"
              placeholder="Short title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black text-stone-900"
            />
            <textarea
              placeholder="More details (optional)"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black text-stone-900"
            />
            <button
              type="submit"
              disabled={submitting}
              className="bg-black text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit'}
            </button>
          </form>
        </div>

        {/* Post list */}
        <div className="space-y-3">
          {posts.length === 0 && (
            <p className="text-gray-400 text-sm text-center py-8">
              No feedback yet. Be the first!
            </p>
          )}
          {posts.map(post => (
            <div
              key={post.id}
              className="bg-white rounded-xl shadow p-5 flex items-start gap-4"
            >
              <button
                onClick={() => handleUpvote(post.id)}
                className={`flex flex-col items-center px-3 py-2 rounded-lg border transition ${
                  upvoted[post.id]
                    ? 'bg-black text-white border-black'
                    : 'border-gray-200 text-gray-500 hover:border-black hover:text-black'
                }`}
              >
                <span className="text-xs">▲</span>
                <span className="text-sm font-semibold">{post._count.upvotes}</span>
              </button>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-gray-900">{post.title}</h3>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[post.status]}`}
                  >
                    {statusLabels[post.status]}
                  </span>
                </div>
                {post.description && (
                  <p className="text-sm text-gray-500">{post.description}</p>
                )}
                <p className="text-xs text-gray-400">
                  {post.author?.name ?? 'Anonymous'} ·{' '}
                  {new Date(post.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </main>
  )
}