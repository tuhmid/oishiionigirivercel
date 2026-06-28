// components/public/WholesaleForm.tsx
'use client'

import { useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

interface FormState {
  storeName: string
  contactName: string
  email: string
  phone: string
  street: string
  neighborhood: string
  billableName: string
  billableAddress: string
  certAuthorityNumber: string
  message: string
}

const INITIAL: FormState = {
  storeName: '',
  contactName: '',
  email: '',
  phone: '',
  street: '',
  neighborhood: '',
  billableName: '',
  billableAddress: '',
  certAuthorityNumber: '',
  message: '',
}

export default function WholesaleForm() {
  const [form, setForm] = useState<FormState>(INITIAL)
  const [resaleCertFile, setResaleCertFile] = useState<File | null>(null)
  const [resaleCertPreview, setResaleCertPreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setResaleCertFile(file)
    if (file && file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file)
      setResaleCertPreview(url)
    } else {
      setResaleCertPreview(null)
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const supabase = createClient()
    let resaleCertUrl: string | null = null

    // Attempt file upload to Supabase Storage (silent fail if not configured)
    if (resaleCertFile) {
      try {
        const ext = resaleCertFile.name.split('.').pop() ?? 'bin'
        const path = `resale-certs/${Date.now()}.${ext}`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('certificates')
          .upload(path, resaleCertFile, { upsert: true })
        if (!uploadError && uploadData) {
          const { data: { publicUrl } } = supabase.storage
            .from('certificates')
            .getPublicUrl(uploadData.path)
          resaleCertUrl = publicUrl
        }
      } catch {
        // Storage not configured yet — proceed without URL
      }
    }

    const address = [form.street, form.neighborhood].filter(Boolean).join(', ')

    const { error: dbError } = await supabase.from('store_order_requests').insert({
      store_name: form.storeName,
      contact_name: form.contactName,
      email: form.email,
      phone: form.phone || null,
      address: address || null,
      billable_name: form.billableName || null,
      billable_address: form.billableAddress || null,
      cert_authority_number: form.certAuthorityNumber || null,
      resale_cert_url: resaleCertUrl,
      message: form.message || null,
      status: 'pending',
    })

    setSubmitting(false)

    if (dbError) {
      setError('Something went wrong. Please try again or email us directly.')
      return
    }

    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div style={{ textAlign: 'center', padding: '56px 0' }}>
        <Image
          src="/logo.png"
          alt="OISHII ONIGIRI"
          width={72}
          height={72}
          style={{ margin: '0 auto 24px', objectFit: 'contain' }}
        />
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-3xl)', color: 'var(--ink)', marginBottom: 12 }}>
          Thank you!
        </h3>
        <p className="t-body" style={{ color: 'var(--ink-60)' }}>
          We&apos;ll be in touch within 48 hours to discuss next steps.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {error && (
        <div className="notice notice-red" role="alert">{error}</div>
      )}

      {/* ── Store info ── */}
      <div className="form-group">
        <label className="form-label form-label-required" htmlFor="ws-storeName">Store Name</label>
        <input id="ws-storeName" name="storeName" className="input" value={form.storeName} onChange={handleChange} required placeholder="The Corner Bodega" />
      </div>

      <div className="form-group">
        <label className="form-label form-label-required" htmlFor="ws-contactName">Contact Name</label>
        <input id="ws-contactName" name="contactName" className="input" value={form.contactName} onChange={handleChange} required placeholder="Jane Smith" />
      </div>

      <div className="form-group">
        <label className="form-label form-label-required" htmlFor="ws-email">Email</label>
        <input id="ws-email" name="email" type="email" className="input" value={form.email} onChange={handleChange} required placeholder="you@store.com" />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="ws-phone">Phone</label>
        <input id="ws-phone" name="phone" type="tel" className="input" value={form.phone} onChange={handleChange} placeholder="(718) 555-0100" />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="ws-street">Store Address</label>
        <input id="ws-street" name="street" className="input" value={form.street} onChange={handleChange} placeholder="123 Atlantic Ave" style={{ marginBottom: 8 }} />
        <input id="ws-neighborhood" name="neighborhood" className="input" value={form.neighborhood} onChange={handleChange} placeholder="Neighborhood (e.g. Bed-Stuy, Bushwick)" aria-label="Neighborhood" />
      </div>

      {/* ── Billing info ── */}
      <hr className="divider" />
      <p className="t-label" style={{ color: 'var(--ink-40)' }}>Billing Information</p>

      <div className="form-group">
        <label className="form-label" htmlFor="ws-billableName">Billable Name</label>
        <p className="form-hint">Legal name as it should appear on invoices</p>
        <input id="ws-billableName" name="billableName" className="input" value={form.billableName} onChange={handleChange} placeholder="Bodega LLC / Jane Smith" />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="ws-billableAddress">Billable Address</label>
        <input id="ws-billableAddress" name="billableAddress" className="input" value={form.billableAddress} onChange={handleChange} placeholder="123 Atlantic Ave, Brooklyn, NY 11201" />
      </div>

      {/* ── Tax documents ── */}
      <hr className="divider" />
      <p className="t-label" style={{ color: 'var(--ink-40)' }}>Tax & Resale Documents</p>

      <div className="form-group">
        <label className="form-label" htmlFor="ws-certAuthorityNumber">Certificate of Authority Number</label>
        <p className="form-hint">Issued by NYS Dept. of Taxation — e.g. CA-12345678</p>
        <input id="ws-certAuthorityNumber" name="certAuthorityNumber" className="input" value={form.certAuthorityNumber} onChange={handleChange} placeholder="CA-12345678" />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="ws-resaleCert">Signed Resale Certificate</label>
        <p className="form-hint">Upload a photo or PDF of your signed ST-120 resale certificate</p>
        <label
          htmlFor="ws-resaleCert"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '14px 16px',
            border: `1.5px dashed ${resaleCertFile ? 'var(--seaweed)' : 'var(--border)'}`,
            background: resaleCertFile ? 'var(--success-bg)' : 'var(--surface)',
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          <span style={{ fontSize: 20 }}>{resaleCertFile ? '✓' : '📄'}</span>
          <span className="t-body-sm" style={{ color: resaleCertFile ? 'var(--success)' : 'var(--ink-40)' }}>
            {resaleCertFile ? resaleCertFile.name : 'Take a photo or upload a file (image or PDF)'}
          </span>
        </label>
        <input
          id="ws-resaleCert"
          type="file"
          accept="image/*,application/pdf"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        {resaleCertPreview && (
          <div style={{ marginTop: 12, border: '1px solid var(--border)', padding: 4 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={resaleCertPreview} alt="Certificate preview" style={{ maxWidth: '100%', maxHeight: 240, objectFit: 'contain', display: 'block' }} />
          </div>
        )}
        {resaleCertFile && !resaleCertPreview && (
          <p className="t-body-sm" style={{ marginTop: 8, color: 'var(--ink-60)' }}>
            PDF selected: {resaleCertFile.name}
          </p>
        )}
      </div>

      {/* ── Notes ── */}
      <hr className="divider" />

      <div className="form-group">
        <label className="form-label" htmlFor="ws-message">Message / Notes</label>
        <textarea id="ws-message" name="message" className="textarea" value={form.message} onChange={handleChange} rows={4} placeholder="Tell us about your store — foot traffic, refrigeration, any questions." />
      </div>

      <button
        type="submit"
        className={`btn btn-green btn-full btn-lg${submitting ? ' loading' : ''}`}
        disabled={submitting}
      >
        {submitting ? '' : 'Submit Inquiry'}
      </button>
    </form>
  )
}
