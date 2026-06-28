'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import Link from 'next/link'

interface Request {
  id: string
  store_name: string
  contact_name: string
  phone: string | null
  email: string | null
  address: string | null
  billable_name: string | null
  billable_address: string | null
  cert_authority_number: string | null
  resale_cert_url: string | null
  message: string | null
  status: string
  created_at: string
}

const labelStyle = { fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: '#777777', marginBottom: 4 }
const valueStyle = { fontSize: 14, color: '#0a0a0a' }

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div>
      <p style={labelStyle}>{label}</p>
      <p style={valueStyle}>{value}</p>
    </div>
  )
}

export default function RequestDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [req, setReq] = useState<Request | null>(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.from('store_order_requests').select('*').eq('id', id).single()
      .then(({ data }) => { setReq(data); setLoading(false) })
  }, [id])

  async function updateStatus(status: 'approved' | 'rejected' | 'reviewed') {
    setActing(true)
    const supabase = createClient()
    const { error } = await supabase.from('store_order_requests').update({ status }).eq('id', id)
    if (error) { toast.error(error.message); setActing(false); return }
    toast.success(`Request marked as ${status}`)
    router.push('/admin/stores')
  }

  async function convertToStore() {
    if (!req) return
    setActing(true)
    const supabase = createClient()

    const { data: store, error } = await supabase
      .from('stores')
      .insert({
        name: req.store_name,
        address: req.address ?? null,
        active: true,
        notes: req.message ?? null,
      })
      .select()
      .single()

    if (error || !store) { toast.error(error?.message ?? 'Failed'); setActing(false); return }

    if (req.contact_name || req.phone || req.email) {
      await supabase.from('store_contacts').insert({
        store_id: store.id,
        name: req.contact_name,
        phone: req.phone ?? null,
        email: req.email ?? null,
        is_default: true,
      })
    }

    await supabase.from('store_order_requests').update({ status: 'approved' }).eq('id', id)

    toast.success('Store created from request')
    router.push(`/admin/stores/${store.id}`)
  }

  if (loading) return <div className="p-8 text-sm" style={{ color: '#777' }}>Loading...</div>
  if (!req) return <div className="p-8 text-sm" style={{ color: '#777' }}>Request not found.</div>

  const isNew = req.status === 'new'

  return (
    <div>
      <Link href="/admin/stores" className="flex items-center gap-1.5 text-xs mb-6" style={{ color: '#777777' }}>
        <ArrowLeft size={12} /> Back to Stores
      </Link>

      <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
        <div>
          <p className="text-xs tracking-widest uppercase mb-1" style={{ color: '#e63946' }}>Wholesale Request</p>
          <h1 className="text-2xl font-bold" style={{ color: '#0a0a0a', fontFamily: 'Georgia, serif' }}>{req.store_name}</h1>
          <p className="text-xs mt-1" style={{ color: '#777' }}>
            Received {new Date(req.created_at).toLocaleDateString()} · Status:{' '}
            <span style={{ color: isNew ? '#e63946' : '#2a7a2a', fontWeight: 600 }}>{req.status}</span>
          </p>
        </div>

        {isNew && (
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={convertToStore}
              disabled={acting}
              className="px-4 py-2 text-xs tracking-widest uppercase font-semibold disabled:opacity-40"
              style={{ background: '#1E3A1E', color: '#ffffff' }}
            >
              {acting ? '...' : 'Approve & Create Store'}
            </button>
            <button
              onClick={() => updateStatus('reviewed')}
              disabled={acting}
              className="px-4 py-2 text-xs tracking-widest uppercase font-semibold disabled:opacity-40"
              style={{ background: '#f5f2ea', color: '#0a0a0a', border: '1px solid #c8c4b8' }}
            >
              Mark Reviewed
            </button>
            <button
              onClick={() => updateStatus('rejected')}
              disabled={acting}
              className="px-4 py-2 text-xs tracking-widest uppercase font-semibold disabled:opacity-40"
              style={{ background: '#f5f2ea', color: '#e63946', border: '1px solid #e63946' }}
            >
              Reject
            </button>
          </div>
        )}
      </div>

      <div className="grid gap-8" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
        {/* Store Info */}
        <div style={{ border: '1px solid #e2ddd0', padding: 24 }}>
          <p className="text-xs tracking-widest uppercase mb-4 font-semibold" style={{ color: '#0a0a0a' }}>Store Info</p>
          <div className="space-y-4">
            <Field label="Store Name" value={req.store_name} />
            <Field label="Address" value={req.address} />
            <Field label="Notes / Message" value={req.message} />
          </div>
        </div>

        {/* Contact */}
        <div style={{ border: '1px solid #e2ddd0', padding: 24 }}>
          <p className="text-xs tracking-widest uppercase mb-4 font-semibold" style={{ color: '#0a0a0a' }}>Contact</p>
          <div className="space-y-4">
            <Field label="Contact Name" value={req.contact_name} />
            <Field label="Phone" value={req.phone} />
            <Field label="Email" value={req.email} />
          </div>
        </div>

        {/* Billing & Tax */}
        <div style={{ border: '1px solid #e2ddd0', padding: 24 }}>
          <p className="text-xs tracking-widest uppercase mb-4 font-semibold" style={{ color: '#0a0a0a' }}>Billing & Tax</p>
          <div className="space-y-4">
            <Field label="Billable Name" value={req.billable_name} />
            <Field label="Billable Address" value={req.billable_address} />
            <Field label="Certificate of Authority #" value={req.cert_authority_number} />
            {req.resale_cert_url && (
              <div>
                <p style={labelStyle}>Resale Certificate</p>
                {req.resale_cert_url.match(/\.(jpg|jpeg|png|webp|gif)$/i) ? (
                  <a href={req.resale_cert_url} target="_blank" rel="noopener noreferrer">
                    <img src={req.resale_cert_url} alt="Resale Certificate" style={{ maxWidth: 200, border: '1px solid #e2ddd0', marginTop: 4 }} />
                  </a>
                ) : (
                  <a href={req.resale_cert_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs" style={{ color: '#e63946', marginTop: 4 }}>
                    View PDF <ExternalLink size={11} />
                  </a>
                )}
              </div>
            )}
            {!req.billable_name && !req.cert_authority_number && !req.resale_cert_url && (
              <p style={{ color: '#999', fontSize: 13 }}>No billing/tax info provided</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
