import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'

export default async function EmbedPage({
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
    where: { workspaceId: workspace.id },
    include: { _count: { select: { upvotes: true } } },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })

  const statusColors: Record<string, string> = {
    UNDER_REVIEW: '#6b7280',
    PLANNED: '#2563eb',
    IN_PROGRESS: '#d97706',
    DONE: '#16a34a',
  }

  const statusLabels: Record<string, string> = {
    UNDER_REVIEW: 'Under Review',
    PLANNED: 'Planned',
    IN_PROGRESS: 'In Progress',
    DONE: 'Done',
  }

  return (
    <div style={{ fontFamily: 'sans-serif', background: '#f9fafb', padding: '12px' }}>
      <p style={{ fontSize: '14px', fontWeight: 700, color: '#111827', marginBottom: '10px' }}>
        {workspace.name} — Feedback
      </p>
      {posts.map(post => (
        <div
          key={post.id}
          style={{
            background: 'white',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '8px',
            display: 'flex',
            gap: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '36px' }}>
            <span style={{ fontSize: '11px' }}>▲</span>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#374151' }}>
              {post._count.upvotes}
            </span>
          </div>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>
              {post.title}
            </span>
            <span
              style={{
                display: 'inline-block',
                fontSize: '10px',
                padding: '1px 6px',
                borderRadius: '9999px',
                marginLeft: '6px',
                background: statusColors[post.status] + '20',
                color: statusColors[post.status],
              }}
            >
              {statusLabels[post.status]}
            </span>
          </div>
        </div>
      ))}
        <a
        href={`/${slug}`}
        style={{ display: 'block', textAlign: 'center', fontSize: '11px', color: '#6b7280', marginTop: '8px' }}
        target="_blank"
        rel="noreferrer"
      >
        View all & submit feedback →
      </a>
    </div>
  )
}