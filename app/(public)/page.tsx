// app/(public)/page.tsx
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Flavor } from '@/types'
import RevealScript from './_components/RevealScript'

// Gradient palettes keyed by sort_order
const THUMB_GRADIENTS: Record<number, string> = {
  1: 'linear-gradient(135deg, #F5E6C8 0%, #E8C49A 100%)',
  2: 'linear-gradient(135deg, #F5D5C8 0%, #E8A49A 100%)',
  3: 'linear-gradient(135deg, #F5F0C8 0%, #E8D88A 100%)',
}
const THUMB_FALLBACK = 'linear-gradient(135deg, var(--paper-warm) 0%, var(--paper-tint) 100%)'

const PREVIEW_FLAVORS: Flavor[] = [
  { id: 'p1', name: 'Teriyaki Salmon', description: 'Glazed Atlantic salmon with house teriyaki, sesame seeds, and seasoned Japanese rice.', in_stock: true, stock_count: 0, sort_order: 1, image_url: null, created_at: '' },
  { id: 'p2', name: 'Spicy Tuna',      description: 'Fresh tuna with Siracha heat and Kewpie mayo on hand-seasoned Japanese rice.',         in_stock: true, stock_count: 0, sort_order: 2, image_url: null, created_at: '' },
  { id: 'p3', name: 'Egg Sando',       description: 'Creamy Japanese egg salad with Kewpie mayo, black pepper, and seasoned rice.',          in_stock: true, stock_count: 0, sort_order: 3, image_url: null, created_at: '' },
  { id: 'p4', name: 'Bulgogi Beef',    description: 'Korean-style marinated beef with sweet soy glaze on hand-seasoned Japanese rice.',      in_stock: true, stock_count: 0, sort_order: 4, image_url: null, created_at: '' },
]

export default async function HomePage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('flavors')
    .select('*')
    .eq('in_stock', true)
    .order('sort_order')
    .limit(3)

  const flavors: Flavor[] = data?.length ? data : PREVIEW_FLAVORS

  return (
    <main style={{
      backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
      backgroundSize: '48px 48px',
      backgroundColor: 'var(--paper)',
    }}>

      {/* ── 1. HERO ─────────────────────────────────────────────── */}
      <section className="hero">
        {/* Grid texture — main provides the grid; this overlay just adds the green glow mask */}
        {/* Green glow */}
        <div className="hero-mark" aria-hidden="true" />

        {/* Content above the grid */}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', width: '100%' }}>

        {/* Eyebrow */}
        <div className="hero-eyebrow">
          <span className="hero-eyebrow-line" aria-hidden="true" />
          <span className="t-label">Handcrafted · Brooklyn, NYC</span>
          <span className="hero-eyebrow-line" aria-hidden="true" />
        </div>

        {/* Mascot logo */}
        <img
          src="/logo.png"
          alt="Oishii Onigiri mascot"
          className="hero-mascot"
          width={115}
          height={115}
        />

        {/* Headline */}
        <h1 className="hero-headline">
          OISHII
          <br />
          <span style={{ color: 'var(--seaweed)' }}>ONIGIRI</span>
        </h1>

        {/* Japanese subtitle */}
        <p className="t-jp hero-jp">
          美味しいおにぎり
        </p>

        {/* Tagline */}
        <p
          className="t-body t-muted hero-tagline"
          style={{ maxWidth: 420, textAlign: 'center' }}
        >
          Premium Halal Japanese rice balls made fresh everyday. Available at select NYC locations.
        </p>

        {/* CTAs */}
        <div className="hero-ctas">
          <Link href="/order" className="btn btn-green btn-lg">
            Order Now
          </Link>
          <Link href="/wholesale" className="btn btn-outline btn-lg">
            Wholesale
          </Link>
        </div>

        {/* Halal certified stamp */}
        <img
          src="/halal-certified.png"
          alt="100% Halal Certified"
          className="hero-halal"
          width={160}
          height={160}
        />

        {/* Stats row */}
        <div className="hero-stats">
          <div style={{ textAlign: 'center' }}>
            <p
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'var(--text-2xl)',
                color: 'var(--ink)',
                lineHeight: 1,
              }}
            >
              30+
            </p>
            <p className="t-label" style={{ marginTop: 'var(--sp-1)' }}>
              NYC Stores
            </p>
          </div>
          <div style={{ width: 1, height: 32, background: 'var(--border)' }} aria-hidden="true" />
          <div style={{ textAlign: 'center' }}>
            <p
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'var(--text-2xl)',
                color: 'var(--ink)',
                lineHeight: 1,
              }}
            >
              4
            </p>
            <p className="t-label" style={{ marginTop: 'var(--sp-1)' }}>
              Flavors
            </p>
          </div>
          <div style={{ width: 1, height: 32, background: 'var(--border)' }} aria-hidden="true" />
          <div style={{ textAlign: 'center' }}>
            <p
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'var(--text-2xl)',
                color: 'var(--ink)',
                lineHeight: 1,
              }}
            >
              Fresh
            </p>
            <p className="t-label" style={{ marginTop: 'var(--sp-1)' }}>
              Everyday
            </p>
          </div>
        </div>

        {/* end content wrapper */}
        </div>
      </section>

      {/* ── PAGE CARD: wraps all content below the hero ── */}
      <div style={{
        margin: 'clamp(20px, 5vw, 64px)',
        marginTop: 0,
        border: '1.5px solid var(--border)',
        overflow: 'hidden',
      }}>

      {/* ── 2. FEATURED FLAVORS ─────────────────────────────────── */}
      <section
        className="section"
        style={{ background: 'var(--paper-warm)' }}
      >
        <div className="container">
          {/* Header */}
          <div
            className="reveal"
            style={{ textAlign: 'center', marginBottom: 'var(--sp-12)' }}
          >
            <p className="t-label" style={{ marginBottom: 'var(--sp-4)' }}>
              Fresh Today
            </p>
            <h2>The Menu</h2>
            <p
              className="t-body t-muted"
              style={{ marginTop: 'var(--sp-4)', maxWidth: 460, marginInline: 'auto' }}
            >
              Fresh ingredients, handcrafted daily in Brooklyn.
            </p>
          </div>

          {/* Cards grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 'var(--sp-6)',
            }}
          >
            {flavors.map((flavor) => (
              <article key={flavor.id} className="flavor-card reveal">
                {/* Thumb */}
                <div
                  className="flavor-card-thumb"
                  style={{
                    background:
                      THUMB_GRADIENTS[flavor.sort_order] ?? THUMB_FALLBACK,
                  }}
                >
                  <span className="flavor-card-num" aria-hidden="true">
                    {String(flavor.sort_order).padStart(2, '0')}
                  </span>
                  <div className="flavor-card-label-strip" style={{ background: 'var(--seaweed)', opacity: 0.15 }} />
                </div>

                {/* Body */}
                <div className="flavor-card-body">
                  <div className="flavor-card-top">
                    <h3 className="flavor-card-name">{flavor.name}</h3>
                    <span className="flavor-card-price">
                      $5.00
                    </span>
                  </div>
                  {flavor.description && (
                    <p className="flavor-card-desc">{flavor.description}</p>
                  )}
                  <div className="flavor-card-footer">
                    <Link href="/order" className="btn btn-green btn-sm">
                      Order
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* See full menu */}
          <div
            className="reveal"
            style={{
              textAlign: 'center',
              marginTop: 'var(--sp-12)',
            }}
          >
            <Link
              href="/order"
              className="t-green"
              style={{
                fontWeight: 700,
                fontSize: 'var(--text-sm)',
                letterSpacing: 'var(--tracking-wider)',
                textTransform: 'uppercase',
                borderBottom: '2px solid var(--seaweed)',
                paddingBottom: 2,
              }}
            >
              See full menu &amp; order &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ── 3. ABOUT ────────────────────────────────────────────── */}
      <section
        className="section"
        style={{ background: 'var(--ink)', color: 'var(--paper)' }}
      >
        <div className="container">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
              gap: 'var(--sp-16)',
              alignItems: 'center',
            }}
          >
            {/* Left — logo */}
            <div
              className="reveal"
              style={{ display: 'flex', justifyContent: 'center' }}
            >
              <img
                src="/logo.png"
                alt="Oishii Onigiri mascot"
                width={180}
                height={180}
                style={{
                  width: 180,
                  height: 180,
                  objectFit: 'contain',
                  opacity: 0.85,
                  animation: 'mascot-float 3s ease-in-out infinite',
                }}
              />
            </div>

            {/* Right — text */}
            <div className="reveal">
              <p
                className="t-label"
                style={{ color: 'var(--seaweed-mid)', marginBottom: 'var(--sp-4)' }}
              >
                Our Story
              </p>
              <h2 style={{ color: 'var(--paper)', marginBottom: 'var(--sp-6)' }}>
                Fresh Everyday
              </h2>
              <p
                className="t-body"
                style={{
                  color: 'rgba(250,248,243,0.7)',
                  maxWidth: 520,
                  lineHeight: 'var(--leading-relaxed)',
                }}
              >
                We make handcrafted Japanese rice balls from quality ingredients, fresh for
                Brooklyn&rsquo;s neighborhood stores and direct to you. Every onigiri is
                rolled by hand, packed with care, and delivered while it&rsquo;s still at
                its best.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. HOW IT WORKS ─────────────────────────────────────── */}
      <section className="section" style={{ background: 'var(--paper)' }}>
        <div className="container">
          <div
            className="reveal"
            style={{ textAlign: 'center', marginBottom: 'var(--sp-12)' }}
          >
            <p className="t-label" style={{ marginBottom: 'var(--sp-4)' }}>
              Simple Process
            </p>
            <h2>Order Yours</h2>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 'var(--sp-8)',
              marginBottom: 'var(--sp-12)',
            }}
          >
            {[
              {
                num: '01',
                title: 'Browse & Order',
                body: 'Pick your favourite flavors and place an order through our menu — easy and fast.',
              },
              {
                num: '02',
                title: 'We Prepare Fresh',
                body: 'Each onigiri is hand-rolled with quality ingredients in our Brooklyn kitchen.',
              },
              {
                num: '03',
                title: 'Pickup or Delivery',
                body: 'Collect from your nearest partner store or have them delivered to your door.',
              },
            ].map((step) => (
              <div
                key={step.num}
                className="reveal"
                style={{
                  padding: 'var(--sp-6)',
                  border: '1.5px solid var(--border)',
                  background: 'var(--surface)',
                }}
              >
                <p
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 'var(--text-4xl)',
                    color: 'var(--border)',
                    lineHeight: 1,
                    marginBottom: 'var(--sp-4)',
                  }}
                  aria-hidden="true"
                >
                  {step.num}
                </p>
                <h3 style={{ marginBottom: 'var(--sp-3)' }}>{step.title}</h3>
                <p className="t-body-sm t-muted">{step.body}</p>
              </div>
            ))}
          </div>

          <div className="reveal" style={{ textAlign: 'center' }}>
            <Link href="/order" className="btn btn-green btn-lg">
              Order Now
            </Link>
          </div>
        </div>
      </section>

      {/* ── 5. WHOLESALE CTA ────────────────────────────────────── */}
      <section
        className="section"
        style={{ background: 'var(--seaweed)', color: 'var(--paper)' }}
      >
        <div className="container" style={{ textAlign: 'center' }}>
          <div className="reveal">
            <p
              className="t-label"
              style={{ color: 'rgba(250,248,243,0.55)', marginBottom: 'var(--sp-4)' }}
            >
              B2B Wholesale
            </p>
            <h2
              style={{
                color: 'var(--paper)',
                marginBottom: 'var(--sp-6)',
              }}
            >
              Stock Your Store
            </h2>
            <p
              className="t-body"
              style={{
                color: 'rgba(250,248,243,0.7)',
                maxWidth: 520,
                marginInline: 'auto',
                marginBottom: 'var(--sp-10)',
              }}
            >
              Partner with us to bring fresh onigiri to your customers. We deliver to 30+
              NYC locations on a rolling cycle.
            </p>

            <div
              style={{
                display: 'flex',
                gap: 'var(--sp-4)',
                justifyContent: 'center',
                flexWrap: 'wrap',
              }}
            >
              <Link
                href="/wholesale"
                className="btn"
                style={{
                  background: 'transparent',
                  color: 'var(--paper)',
                  borderColor: 'var(--paper)',
                  padding: '18px var(--sp-10)',
                  fontSize: 'var(--text-base)',
                }}
              >
                Submit Inquiry
              </Link>
              <Link
                href="/wholesale"
                className="btn"
                style={{
                  background: 'transparent',
                  color: 'rgba(250,248,243,0.65)',
                  borderColor: 'transparent',
                  padding: '18px var(--sp-10)',
                  fontSize: 'var(--text-base)',
                }}
              >
                Learn More
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* end page card */}
      </div>

      {/* Scroll reveal observer */}
      <RevealScript />
    </main>
  )
}
