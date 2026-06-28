// components/admin/LoginForm.tsx
'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    router.push('/admin')
  }

  const inputStyle: React.CSSProperties = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    color: 'var(--ink)',
    padding: '11px 14px',
    fontSize: '14px',
    width: '100%',
    outline: 'none',
    borderRadius: 'var(--radius-sm)',
    fontFamily: 'var(--font-sans)',
    transition: 'border-color var(--dur-fast) var(--ease)',
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{ background: 'var(--paper-warm)' }}
    >
      <div
        className="w-full max-w-sm"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '40px 36px',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {/* Brand header */}
        <div className="flex flex-col items-center gap-4 mb-8">
          <Image
            src="/logo.png"
            alt="OISHII ONIGIRI"
            width={64}
            height={64}
            className="object-contain"
            priority
          />
          <div className="text-center">
            <h1
              className="tracking-widest"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'var(--text-xl)',
                color: 'var(--ink)',
                letterSpacing: 'var(--tracking-wider)',
                lineHeight: 'var(--leading-tight)',
              }}
            >
              OISHII ONIGIRI
            </h1>
            <p
              className="mt-1 text-xs tracking-widest uppercase"
              style={{ color: 'var(--ink-40)', letterSpacing: 'var(--tracking-label)' }}
            >
              Admin Dashboard
            </p>
          </div>
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px solid var(--border)', marginBottom: '28px' }} />

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-xs uppercase mb-1.5"
              style={{
                color: 'var(--ink-60)',
                letterSpacing: 'var(--tracking-widest)',
                fontFamily: 'var(--font-sans)',
              }}
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              style={inputStyle}
              onFocus={e => (e.currentTarget.style.borderColor = 'var(--border-focus)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs uppercase mb-1.5"
              style={{
                color: 'var(--ink-60)',
                letterSpacing: 'var(--tracking-widest)',
                fontFamily: 'var(--font-sans)',
              }}
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              style={inputStyle}
              onFocus={e => (e.currentTarget.style.borderColor = 'var(--border-focus)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            />
          </div>

          {error && (
            <p
              className="text-xs"
              style={{
                color: 'var(--error)',
                background: 'var(--error-bg)',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                fontFamily: 'var(--font-sans)',
              }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 text-xs font-semibold uppercase tracking-widest transition-all disabled:opacity-50"
            style={{
              background: loading ? 'var(--seaweed-mid)' : 'var(--seaweed)',
              color: '#ffffff',
              borderRadius: 'var(--radius-sm)',
              letterSpacing: 'var(--tracking-label)',
              fontFamily: 'var(--font-sans)',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={e => {
              if (!loading) e.currentTarget.style.background = 'var(--seaweed-mid)'
            }}
            onMouseLeave={e => {
              if (!loading) e.currentTarget.style.background = 'var(--seaweed)'
            }}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
