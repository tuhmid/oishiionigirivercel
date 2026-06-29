// components/public/OrderPageClient.tsx
'use client'

import { useState } from 'react'
import type { Flavor } from '@/types'
import { RETAIL_PRICE } from '@/lib/pricing'

type EnrichedFlavor = Flavor & {
  description: string
  ingredients: string
  allergens: string[]
  accent: string
  accentLight: string
}

export default function OrderPageClient({ flavors }: { flavors: EnrichedFlavor[] }) {
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [openIngredients, setOpenIngredients] = useState<Record<string, boolean>>({})
  const [fulfillment, setFulfillment] = useState<'pickup' | 'delivery'>('pickup')
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    notes: '',
  })
  const [tip, setTip] = useState<number>(0)
  const [customTip, setCustomTip] = useState('')
  const [tipMode, setTipMode] = useState<'0' | '1' | '2' | '3' | 'custom'>('0')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleTipMode = (mode: '0' | '1' | '2' | '3' | 'custom') => {
    setTipMode(mode)
    if (mode === 'custom') {
      setTip(parseFloat(customTip) || 0)
    } else {
      setTip(Number(mode))
      setCustomTip('')
    }
  }

  const adjustQty = (id: string, delta: number) => {
    setQuantities((prev) => ({
      ...prev,
      [id]: Math.max(0, (prev[id] ?? 0) + delta),
    }))
  }

  const toggleIngredients = (id: string) => {
    setOpenIngredients((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const selectedItems = flavors.filter((f) => (quantities[f.id] ?? 0) > 0)
  const subtotal = selectedItems.reduce(
    (sum, f) => sum + RETAIL_PRICE * (quantities[f.id] ?? 0),
    0
  )
  const total = subtotal + (fulfillment === 'pickup' ? tip : 0)

  const handleCheckout = async () => {
    setError(null)

    if (fulfillment === 'delivery') {
      window.location.href = 'https://oishiionigirinyc.square.site/?location='
      return
    }

    if (!form.name.trim()) {
      setError('Please enter your name.')
      return
    }
    if (!form.phone.trim()) {
      setError('Please enter your phone number.')
      return
    }

    setLoading(true)

    const items = flavors
      .filter((f) => (quantities[f.id] ?? 0) > 0)
      .map((f) => ({
        flavor_id: f.id,
        name: f.name,
        quantity: quantities[f.id],
      }))

    try {
      const res = await fetch('/api/square/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: form.name,
          customer_email: form.email || undefined,
          customer_phone: form.phone,
          type: fulfillment,
          notes: form.notes || undefined,
          tip_amount: tip > 0 ? tip : undefined,
          items,
        }),
      })

      if (!res.ok) {
        setError('Something went wrong. Please try again.')
        setLoading(false)
        return
      }

      const { url } = await res.json()
      window.location.href = url
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <>
      <style>{`
        .order-layout {
          display: grid;
          grid-template-columns: 1fr;
          gap: 40px;
          align-items: start;
          padding-top: 48px;
          padding-bottom: 96px;
        }
        @media (min-width: 1024px) {
          .order-layout {
            grid-template-columns: 1fr 340px;
          }
        }
        .flavor-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
        }
        @media (min-width: 640px) {
          .flavor-grid {
            grid-template-columns: 1fr 1fr;
          }
        }
        .stepper-btn:disabled {
          opacity: 0.25;
          cursor: not-allowed;
          pointer-events: none;
        }
        .order-summary .input,
        .order-summary .textarea,
        .order-summary .select {
          padding: 8px 12px;
          font-size: var(--text-sm);
        }
        .order-summary .form-label {
          font-size: var(--text-2xs);
        }
        .order-summary .btn-lg {
          padding: 12px var(--sp-6);
          font-size: var(--text-sm);
        }
        .order-summary h3 {
          font-size: var(--text-xl);
        }
        .order-summary .divider {
          margin-block: var(--sp-4);
        }
      `}</style>

      <div className="container">
        <div className="order-layout">
          {/* ── Left: Flavor grid ── */}
          <div className="flavor-grid">
            {flavors.map((flavor) => {
              const qty = quantities[flavor.id] ?? 0
              const isOpen = openIngredients[flavor.id] ?? false

              return (
                <div
                  key={flavor.id}
                  className="flavor-card"
                  style={{
                    borderColor: qty > 0 ? 'var(--seaweed)' : undefined,
                  }}
                >
                  {/* Thumb */}
                  <div
                    className="flavor-card-thumb"
                    style={{
                      background: `linear-gradient(135deg, ${flavor.accentLight}, ${flavor.accent})`,
                    }}
                  >
                    {/* Logo watermark */}
                    <img
                      src="/logo.png"
                      alt=""
                      aria-hidden="true"
                      style={{
                        width: 64,
                        height: 64,
                        objectFit: 'contain',
                        opacity: 0.15,
                        position: 'relative',
                        zIndex: 1,
                      }}
                    />

                    {/* Sort order number */}
                    <div className="flavor-card-num">
                      {String(flavor.sort_order).padStart(2, '0')}
                    </div>

                    {/* Bottom color strip */}
                    <div
                      className="flavor-card-label-strip"
                      style={{ background: flavor.accent }}
                    />

                    {/* Sold-out overlay */}
                    {!flavor.in_stock && (
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background: 'rgba(10,10,10,0.48)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          zIndex: 2,
                        }}
                      >
                        <span
                          style={{
                            fontFamily: 'var(--font-sans)',
                            fontWeight: 700,
                            fontSize: 'var(--text-xs)',
                            letterSpacing: 'var(--tracking-widest)',
                            textTransform: 'uppercase',
                            color: '#fff',
                          }}
                        >
                          Sold Out
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Body */}
                  <div className="flavor-card-body">
                    {/* Name + price */}
                    <div className="flavor-card-top">
                      <span className="flavor-card-name">{flavor.name}</span>
                      <span className="flavor-card-price">
                        ${RETAIL_PRICE.toFixed(2)}
                      </span>
                    </div>

                    {/* Status */}
                    <div>
                      {flavor.in_stock ? (
                        <span className="status status-live">
                          <span className="status-dot" />
                          Available
                        </span>
                      ) : (
                        <span className="status status-out">
                          <span className="status-dot" />
                          Sold Out
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    <p className="flavor-card-desc">{flavor.description}</p>

                    {/* Ingredients toggle */}
                    <div>
                      <button
                        type="button"
                        className={`ingredients-toggle${isOpen ? ' open' : ''}`}
                        onClick={() => toggleIngredients(flavor.id)}
                        aria-expanded={isOpen}
                      >
                        <span className="ingredients-toggle-icon">›</span>
                        Ingredients
                      </button>
                      <div
                        className={`ingredients-body${isOpen ? ' open' : ''}`}
                      >
                        <p style={{ marginBottom: flavor.allergens.length > 0 ? '10px' : 0 }}>
                          {flavor.ingredients}
                        </p>
                        {flavor.allergens.length > 0 && (
                          <div className="allergen-row">
                            {flavor.allergens.map((a) => (
                              <span key={a} className="allergen-tag">
                                {a}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer: stepper or unavailable */}
                    <div className="flavor-card-footer">
                      {flavor.in_stock && fulfillment === 'delivery' ? (
                        <span className="t-muted t-body-sm">Select on Square →</span>
                      ) : flavor.in_stock ? (
                        <div className="stepper">
                          <button
                            type="button"
                            className="stepper-btn"
                            onClick={() => adjustQty(flavor.id, -1)}
                            disabled={qty === 0}
                            aria-label={`Decrease ${flavor.name} quantity`}
                          >
                            −
                          </button>
                          <span className="stepper-value">{qty}</span>
                          <button
                            type="button"
                            className="stepper-btn"
                            onClick={() => adjustQty(flavor.id, 1)}
                            aria-label={`Increase ${flavor.name} quantity`}
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <span className="t-muted t-body-sm">Unavailable</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* ── Right: Order summary + contact form ── */}
          <div className="order-summary">
            <h3 style={{ marginBottom: '20px' }}>Your Order</h3>

            {/* Line items */}
            {selectedItems.length > 0 ? (
              <div>
                {selectedItems.map((item) => {
                  const qty = quantities[item.id] ?? 0
                  return (
                    <div key={item.id} className="order-row">
                      <div>
                        <div className="order-row-name">{item.name}</div>
                        <div className="order-row-qty">×{qty}</div>
                      </div>
                      <span className="order-row-price">
                        ${(qty * RETAIL_PRICE).toFixed(2)}
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p
                className="t-muted t-body-sm"
                style={{ paddingBlock: '12px', borderBottom: '1px solid var(--border)' }}
              >
                Add items from the menu to get started.
              </p>
            )}

            <div className="order-total" style={{ marginBottom: '12px' }}>
              <span style={{ fontWeight: 600 }}>Total</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--seaweed)' }}>
                ${total.toFixed(2)}
              </span>
            </div>

            <hr className="divider" />

            {/* Fulfillment toggle */}
            <div style={{ marginBottom: '20px' }}>
              <p className="form-label" style={{ marginBottom: '10px' }}>
                Fulfillment
              </p>
              <div style={{ display: 'flex', gap: '20px' }}>
                <label className="check-group">
                  <input
                    type="radio"
                    className="radio-input check-input"
                    name="fulfillment"
                    checked={fulfillment === 'pickup'}
                    onChange={() => setFulfillment('pickup')}
                  />
                  <span className="check-label">Pickup</span>
                </label>
                <label className="check-group">
                  <input
                    type="radio"
                    className="radio-input check-input"
                    name="fulfillment"
                    checked={fulfillment === 'delivery'}
                    onChange={() => setFulfillment('delivery')}
                  />
                  <span className="check-label">Delivery</span>
                </label>
              </div>
            </div>

            {/* Contact form fields — pickup only */}
            {fulfillment === 'pickup' && <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label htmlFor="order-name" className="form-label form-label-required">
                  Name
                </label>
                <input
                  id="order-name"
                  type="text"
                  className="input"
                  placeholder="Your name"
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  autoComplete="name"
                />
              </div>

              <div className="form-group">
                <label htmlFor="order-email" className="form-label">
                  Email
                </label>
                <input
                  id="order-email"
                  type="email"
                  className="input"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, email: e.target.value }))
                  }
                  autoComplete="email"
                />
              </div>

              <div className="form-group">
                <label htmlFor="order-phone" className="form-label form-label-required">
                  Phone
                </label>
                <input
                  id="order-phone"
                  type="tel"
                  className="input"
                  placeholder="(212) 555-0100"
                  value={form.phone}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  autoComplete="tel"
                />
              </div>

              <div className="form-group">
                <label htmlFor="order-notes" className="form-label">
                  Notes
                </label>
                <textarea
                  id="order-notes"
                  className="textarea"
                  placeholder="Allergies, timing preferences, special requests…"
                  value={form.notes}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  style={{ minHeight: '80px' }}
                />
              </div>

              {/* Tip */}
              <div>
                <p className="form-label" style={{ marginBottom: '8px' }}>Add a tip (optional)</p>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {(['0', '1', '2', '3'] as const).map((amt) => (
                    <button key={amt} type="button" onClick={() => handleTipMode(amt)}
                      style={{
                        padding: '5px 12px', fontSize: 'var(--text-xs)', border: '1px solid', borderRadius: 2,
                        borderColor: tipMode === amt ? 'var(--seaweed)' : 'var(--border)',
                        background: tipMode === amt ? 'var(--seaweed)' : 'transparent',
                        color: tipMode === amt ? '#fff' : 'var(--ink)', cursor: 'pointer',
                      }}
                    >
                      {amt === '0' ? 'No tip' : `$${amt}`}
                    </button>
                  ))}
                  <button type="button" onClick={() => handleTipMode('custom')}
                    style={{
                      padding: '5px 12px', fontSize: 'var(--text-xs)', border: '1px solid', borderRadius: 2,
                      borderColor: tipMode === 'custom' ? 'var(--seaweed)' : 'var(--border)',
                      background: tipMode === 'custom' ? 'var(--seaweed)' : 'transparent',
                      color: tipMode === 'custom' ? '#fff' : 'var(--ink)', cursor: 'pointer',
                    }}
                  >
                    Custom
                  </button>
                </div>
                {tipMode === 'custom' && (
                  <input type="number" min={0} step={0.01} className="input"
                    placeholder="Enter tip amount" value={customTip}
                    onChange={(e) => { setCustomTip(e.target.value); setTip(parseFloat(e.target.value) || 0) }}
                    style={{ marginTop: '8px', maxWidth: '160px' }}
                  />
                )}
                {tip > 0 && (
                  <p className="t-body-sm t-muted" style={{ marginTop: '6px' }}>
                    Subtotal ${subtotal.toFixed(2)} + ${tip.toFixed(2)} tip = ${total.toFixed(2)}
                  </p>
                )}
              </div>
            </div>}

            {/* Error notice */}
            {error && (
              <div className="notice notice-red" style={{ marginTop: '16px' }}>
                {error}
              </div>
            )}

            {/* Checkout button */}
            <button
              type="button"
              className={`btn btn-green btn-full btn-lg${loading ? ' loading' : ''}`}
              style={{ marginTop: '20px' }}
              disabled={fulfillment === 'pickup' ? (total === 0 || loading) : false}
              onClick={handleCheckout}
            >
              {loading ? '' : fulfillment === 'delivery' ? 'Order Delivery →' : `Checkout — $${total.toFixed(2)}`}
            </button>

            <p
              style={{
                textAlign: 'center',
                fontSize: 'var(--text-xs)',
                color: 'var(--ink-40)',
                marginTop: '8px',
              }}
            >
              Powered by Square · Secure checkout
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
