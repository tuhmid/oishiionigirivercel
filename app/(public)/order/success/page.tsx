// app/(public)/order/success/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'

export const metadata: Metadata = { title: 'Order Confirmed' }

export default async function OrderSuccessPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  // Square appends ?referenceId=... on redirect — capture for display if present
  const params = await searchParams
  const referenceId = params.referenceId ?? params.orderId ?? null

  return (
    <main
      style={{
        minHeight: '100svh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '40px var(--gutter)',
        background: 'var(--paper)',
      }}
    >
      <div style={{ maxWidth: 480, width: '100%' }}>
        <Image
          src="/logo.png"
          alt="OISHII ONIGIRI"
          width={80}
          height={80}
          style={{ margin: '0 auto 24px', objectFit: 'contain', animation: 'mascot-float 3s ease-in-out infinite' }}
        />

        <div style={{ marginBottom: 16 }}>
          <span className="badge badge-green" style={{ display: 'inline-flex' }}>
            <span className="badge-dot" />
            Order Confirmed
          </span>
        </div>

        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-4xl)',
            marginBottom: 16,
          }}
        >
          Thank You!
        </h1>

        <p className="t-body" style={{ color: 'var(--ink-60)', marginBottom: 32 }}>
          Your order has been placed and payment received. We&apos;ll be in touch to
          confirm pickup or delivery details.
        </p>

        <div
          style={{
            background: 'var(--surface)',
            border: '1.5px solid var(--border)',
            padding: 24,
            textAlign: 'left',
            marginBottom: 32,
          }}
        >
          <p className="t-label" style={{ marginBottom: 12, color: 'var(--ink-40)' }}>
            What&apos;s next
          </p>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: 8, listStyle: 'none', padding: 0, margin: 0 }}>
            <li className="t-body-sm">✓ Check your email for a Square receipt</li>
            <li className="t-body-sm">✓ We&apos;ll reach out shortly to confirm details</li>
            <li className="t-body-sm">✓ Pickup or delivery arranged by our team</li>
            <li className="t-body-sm">✓ Keep refrigerated — enjoy within 2 days</li>
          </ul>
          {referenceId && (
            <p
              style={{
                marginTop: 16,
                fontFamily: 'var(--font-mono)',
                fontSize: 'var(--text-2xs)',
                color: 'var(--ink-20)',
              }}
            >
              Order ref: {referenceId}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Link href="/order" className="btn btn-green btn-full">Order Again</Link>
          <Link href="/" className="btn btn-outline btn-full">Back to Home</Link>
        </div>

        <p style={{ marginTop: 24, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--ink-20)' }}>
          276 Chestnut Street · Brooklyn 11208 · Keep refrigerated
        </p>
      </div>
    </main>
  )
}
