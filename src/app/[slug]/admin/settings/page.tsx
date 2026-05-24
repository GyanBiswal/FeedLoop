'use client'

import { useEffect, useState } from 'react'
import { useSession, signIn } from 'next-auth/react'
import { useParams } from 'next/navigation'

export default function SettingsPage() {
  const { slug } = useParams<{ slug: string }>()
  const { data: session, status } = useSession()
  const [webhookUrl, setWebhookUrl] = useState('')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') signIn('github')
  }, [status])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await fetch('/api/webhooks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: webhookUrl, workspaceSlug: slug }),
    })
    setSaved(true)
    setSaving(false)
  }

  if (status === 'loading') {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <a href={`/${slug}/admin`} className="text-sm text-gray-500 hover:text-black">
            ← Admin
          </a>
        </div>

        <div className="bg-white rounded-xl shadow p-6 space-y-4">
          <h2 className="font-semibold text-gray-800">Webhook</h2>
          <p className="text-sm text-gray-500">
            We'll POST to this URL whenever a post status changes.
          </p>
          <form onSubmit={handleSave} className="space-y-3">
            <input
              type="url"
              placeholder="https://your-site.com/webhook"
              value={webhookUrl}
              onChange={e => setWebhookUrl(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
            {saved && <p className="text-green-600 text-sm">✅ Webhook saved!</p>}
            <button
              type="submit"
              disabled={saving}
              className="bg-black text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save webhook'}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}