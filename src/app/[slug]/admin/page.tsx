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
  clusterId: string | null
  changelog: string | null
  _count: { upvotes: number }
  author: { name: string | null; image: string | null } | null
}

const STATUSES = ['UNDER_REVIEW', 'PLANNED', 'IN_PROGRESS', 'DONE'] as const

const statusLabels: Record<string, string> = {
  UNDER_REVIEW: 'Under Review',
  PLANNED: 'Planned',
  IN_PROGRESS: 'In Progress',
  DONE: 'Done',
}

const statusColors: Record<string, string> = {
  UNDER_REVIEW: 'bg-gray-100 border-gray-200',
  PLANNED: 'bg-blue-50 border-blue-200',
  IN_PROGRESS: 'bg-yellow-50 border-yellow-200',
  DONE: 'bg-green-50 border-green-200',
}

const statusHeaderColors: Record<string, string> = {
  UNDER_REVIEW: 'text-gray-600',
  PLANNED: 'text-blue-600',
  IN_PROGRESS: 'text-yellow-700',
  DONE: 'text-green-700',
}

export default function AdminPage() {
  const { slug } = useParams<{ slug: string }>()
  const { data: session, status } = useSession()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [clustering, setClustering] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') signIn('github')
  }, [status])

  async function fetchPosts() {
    const res = await fetch(`/api/posts?slug=${slug}`)
    const data = await res.json()
    if (Array.isArray(data)) setPosts(data)
    setLoading(false)
  }

  useEffect(() => {
    if (session) fetchPosts()
  }, [session, slug])

  async function handleStatusChange(postId: string, newStatus: string) {
    setPosts(prev =>
      prev.map(p => (p.id === postId ? { ...p, status: newStatus } : p))
    )
    const res = await fetch(`/api/posts/${postId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    if (!res.ok) {
      setError('Failed to update status. Are you an admin?')
      fetchPosts()
    } else {
      const updated = await res.json()
      setPosts(prev => prev.map(p => (p.id === postId ? { ...p, ...updated } : p)))
    }
  }

  async function handleCluster(postId: string) {
    setClustering(postId)
    const res = await fetch(`/api/posts/${postId}/cluster`, { method: 'POST' })
    const data = await res.json()
    if (res.ok) {
      await fetchPosts()
    } else {
      setError('Clustering failed.')
    }
    setClustering(null)
  }

  if (status === 'loading' || loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading...</p>
      </main>
    )
  }

  const postsByStatus = STATUSES.reduce((acc, s) => {
    acc[s] = posts.filter(p => p.status === s)
    return acc
  }, {} as Record<string, Post[]>)

  // count cluster siblings
  const clusterCounts = posts.reduce((acc, p) => {
    if (p.clusterId) {
      acc[p.clusterId] = (acc[p.clusterId] ?? 0) + 1
    }
    return acc
  }, {} as Record<string, number>)

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{slug} — Admin</h1>
            <p className="text-sm text-gray-500 mt-1">
              Use the dropdown to update status. Click cluster to find similar posts.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href={`/${slug}`}
              className="text-sm text-gray-500 hover:text-black"
            >
              ← Public board
            </a>
            <span className="text-sm text-gray-500">{session?.user?.name}</span>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="grid grid-cols-4 gap-4">
          {STATUSES.map(s => (
            <div key={s} className={`rounded-xl border p-4 space-y-3 ${statusColors[s]}`}>
              <div className="flex items-center justify-between">
                <h2 className={`font-semibold text-sm ${statusHeaderColors[s]}`}>
                  {statusLabels[s]}
                </h2>
                <span className="text-xs text-gray-400 font-medium">
                  {postsByStatus[s].length}
                </span>
              </div>

              {postsByStatus[s].length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">No posts</p>
              )}

              {postsByStatus[s].map(post => (
                <div key={post.id} className="bg-white rounded-lg shadow-sm p-3 space-y-2">
                  <p className="text-sm font-medium text-gray-900">{post.title}</p>

                  {post.description && (
                    <p className="text-xs text-gray-500 line-clamp-2">{post.description}</p>
                  )}

                  {/* Cluster badge */}
                  {post.clusterId && clusterCounts[post.clusterId] > 1 && (
                    <span className="inline-block text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                      Similar to {clusterCounts[post.clusterId] - 1} other post{clusterCounts[post.clusterId] - 1 > 1 ? 's' : ''}
                    </span>
                  )}

                  {/* Changelog preview */}
                  {post.changelog && (
                    <p className="text-xs text-green-700 bg-green-50 rounded p-2 italic">
                      {post.changelog}
                    </p>
                  )}

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-gray-400">▲ {post._count.upvotes}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleCluster(post.id)}
                        disabled={clustering === post.id}
                        className="text-xs border border-gray-200 rounded px-1.5 py-0.5 text-gray-500 hover:border-purple-400 hover:text-purple-600 disabled:opacity-50"
                      >
                        {clustering === post.id ? '...' : 'cluster'}
                      </button>
                      <select
                        value={post.status}
                        onChange={e => handleStatusChange(post.id, e.target.value)}
                        className="text-xs border border-gray-200 rounded px-1 py-0.5 bg-white text-gray-600 focus:outline-none focus:ring-1 focus:ring-black"
                      >
                        {STATUSES.map(st => (
                          <option key={st} value={st}>
                            {statusLabels[st]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}