// app/(public)/wholesale/page.tsx
import type { Metadata } from 'next'
import WholesaleForm from '@/components/public/WholesaleForm'

export const metadata: Metadata = { title: 'Wholesale' }

const HOW_IT_WORKS = [
  {
    num: '01',
    title: 'Submit Inquiry',
    body: 'Fill out the form below with your store details — location, contact info, and any questions.',
  },
  {
    num: '02',
    title: "We'll Reach Out",
    body: 'Our team contacts you within 48 hours to discuss logistics, quantities, and delivery schedule.',
  },
  {
    num: '03',
    title: 'Start Selling',
    body: 'We deliver fresh batches on a rolling cycle. You pay only for what sells — zero waste risk.',
  },
]

export default function WholesalePage() {
  return (
    <main>
      {/* ── Header ── */}
      <section
        style={{
          paddingTop: 110,
          paddingBottom: 64,
          background: 'var(--ink)',
          color: 'var(--paper)',
          textAlign: 'center',
        }}
      >
        <div className="container">
          <p
            className="t-label"
            style={{ color: 'var(--seaweed-mid)', marginBottom: 16 }}
          >
            For Stores &amp; Partners
          </p>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              color: 'var(--paper)',
              marginBottom: 20,
            }}
          >
            Stock Your Store
          </h1>
          <p
            className="t-body"
            style={{
              color: 'rgba(250,248,243,0.65)',
              maxWidth: 560,
              marginInline: 'auto',
            }}
          >
            Bring fresh handcrafted onigiri to your customers. We partner with NYC stores
            on a rolling delivery cycle — fresh every day.
            <br />
            <strong style={{ fontSize: '1.25em' }}>Pay for what you sell!*</strong>
          </p>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="section" style={{ background: 'var(--paper-warm)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <p className="t-label" style={{ marginBottom: 12 }}>Process</p>
            <h2>How It Works</h2>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 24,
            }}
          >
            {HOW_IT_WORKS.map(step => (
              <div
                key={step.num}
                style={{
                  background: 'var(--surface)',
                  border: '1.5px solid var(--border)',
                  padding: '32px 28px',
                }}
              >
                <p
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 'var(--text-4xl)',
                    color: 'var(--border)',
                    lineHeight: 1,
                    marginBottom: 16,
                  }}
                >
                  {step.num}
                </p>
                <h3 style={{ marginBottom: 10 }}>{step.title}</h3>
                <p className="t-body-sm" style={{ color: 'var(--ink-60)' }}>
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Inquiry form ── */}
      <section className="section">
        <div className="container" style={{ maxWidth: 640 }}>
          <div style={{ marginBottom: 40 }}>
            <p className="t-label" style={{ marginBottom: 12 }}>Apply</p>
            <h2>Get In Touch</h2>
          </div>
          <WholesaleForm />
        </div>
      </section>
    </main>
  )
}
