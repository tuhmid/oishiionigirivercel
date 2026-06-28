'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate, PAYMENT_LABELS } from '@/lib/utils'
import { WHOLESALE_PRICE } from '@/lib/pricing'
import { Mail, MessageSquare, Check, ChevronDown, ChevronUp, Printer } from 'lucide-react'
import type { StoreContact } from '@/types'
import { useRouter } from 'next/navigation'

interface InvoiceRow {
  id: string
  amount_due: number
  amount_paid: number
  payment_method: string | null
  paid_at: string | null
  sent_via: string | null
  sent_at: string | null
  created_at: string
  store: {
    id: string
    name: string
    preferred_payment_method: string | null
    contacts: StoreContact[]
  }
  batch: {
    id: string
    delivery_date: string
    items: { qty_sold: number | null; flavor: { name: string } }[]
  }
}

export default function InvoicesClient({ invoices: initial }: { invoices: InvoiceRow[] }) {
  const [invoices, setInvoices] = useState(initial)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [sendModal, setSendModal] = useState<{ invoiceId: string; contacts: StoreContact[] } | null>(null)
  const [selectedContact, setSelectedContact] = useState<string>('')
  const [sendVia, setSendVia] = useState<'email' | 'sms'>('sms')
  const [sending, setSending] = useState(false)
  const [markingPaid, setMarkingPaid] = useState<string | null>(null)
  const router = useRouter()

  const openSend = (invoice: InvoiceRow) => {
    const defaultContact = invoice.store.contacts.find(c => c.is_default) ?? invoice.store.contacts[0]
    setSelectedContact(defaultContact?.id ?? '')
    setSendModal({ invoiceId: invoice.id, contacts: invoice.store.contacts })
  }

  const handleSend = async () => {
    if (!sendModal || !selectedContact) { toast.error('Select a contact'); return }
    setSending(true)
    const res = await fetch('/api/invoices/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoice_id: sendModal.invoiceId, contact_id: selectedContact, via: sendVia }),
    })
    const { error } = await res.json()
    if (error) { toast.error(error); setSending(false); return }
    toast.success(`Invoice sent via ${sendVia}`)
    setSendModal(null)
    setInvoices(prev => prev.map(inv =>
      inv.id === sendModal.invoiceId ? { ...inv, sent_via: sendVia, sent_at: new Date().toISOString() } : inv
    ))
    setSending(false)
  }

  const markPaid = async (invoiceId: string, paymentMethod: string) => {
    setMarkingPaid(invoiceId)
    const supabase = createClient()
    const { error } = await supabase
      .from('invoices')
      .update({ paid_at: new Date().toISOString(), payment_method: paymentMethod, amount_paid: invoices.find(i => i.id === invoiceId)?.amount_due })
      .eq('id', invoiceId)

    if (error) { toast.error(error.message); setMarkingPaid(null); return }

    await supabase.from('batches').update({ status: 'paid' }).eq('id', invoices.find(i => i.id === invoiceId)?.batch.id)

    setInvoices(prev => prev.map(inv =>
      inv.id === invoiceId ? { ...inv, paid_at: new Date().toISOString(), payment_method: paymentMethod } : inv
    ))
    toast.success('Marked as paid')
    setMarkingPaid(null)
    router.refresh()
  }

  const unpaid = invoices.filter(i => !i.paid_at)
  const paid = invoices.filter(i => i.paid_at)

  const InvoiceRow = ({ inv }: { inv: InvoiceRow }) => {
    const isExpanded = expanded === inv.id
    const lineItems = inv.batch.items.filter(i => (i.qty_sold ?? 0) > 0)

    return (
      <div style={{ borderBottom: '1px solid #f0ece0' }}>
        <div
          className="grid items-center px-5 py-4 cursor-pointer transition-colors"
          style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr auto', background: isExpanded ? '#f5f0e6' : '#ffffff' }}
          onClick={() => setExpanded(isExpanded ? null : inv.id)}
          onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.background = '#f0ece0' }}
          onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.background = '#ffffff' }}
        >
          <div>
            <p className="text-sm font-medium" style={{ color: '#0a0a0a' }}>{inv.store.name}</p>
            <p className="text-xs mt-0.5" style={{ color: '#555555' }}>{formatDate(inv.batch.delivery_date)}</p>
          </div>
          <span className="text-sm font-semibold" style={{ color: inv.paid_at ? '#2a7a2a' : '#e63946' }}>
            {formatCurrency(Number(inv.amount_due))}
          </span>
          <span className="text-xs" style={{ color: '#555555' }}>
            {inv.payment_method ? PAYMENT_LABELS[inv.payment_method] : inv.store.preferred_payment_method ? PAYMENT_LABELS[inv.store.preferred_payment_method] : '—'}
          </span>
          <div>
            {inv.paid_at ? (
              <span className="flex items-center gap-1 text-xs" style={{ color: '#2a7a2a' }}>
                <Check size={12} /> Paid {formatDate(inv.paid_at)}
              </span>
            ) : (
              <span className="text-xs px-2 py-0.5 rounded-sm" style={{ background: '#f5e4e4', color: '#e63946' }}>Unpaid</span>
            )}
          </div>
          {isExpanded ? <ChevronUp size={14} style={{ color: '#666666' }} /> : <ChevronDown size={14} style={{ color: '#666666' }} />}
        </div>

        {isExpanded && (
          <div className="px-5 pb-5" style={{ background: '#faf8f3', borderTop: '1px solid #e2ddd0' }}>
            {/* Line items */}
            <div className="mt-4 mb-4">
              {lineItems.map((item, i) => (
                <div key={i} className="flex justify-between py-2" style={{ borderBottom: '1px solid #e8e4d8' }}>
                  <span className="text-sm" style={{ color: '#777777' }}>{item.flavor.name}</span>
                  <span className="text-sm" style={{ color: '#0a0a0a' }}>
                    {item.qty_sold} × ${WHOLESALE_PRICE.toFixed(2)} = {formatCurrency(Number(item.qty_sold) * WHOLESALE_PRICE)}
                  </span>
                </div>
              ))}
              <div className="flex justify-between pt-3">
                <span className="text-sm font-semibold" style={{ color: '#0a0a0a' }}>Total</span>
                <span className="text-sm font-bold" style={{ color: '#e63946' }}>{formatCurrency(Number(inv.amount_due))}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 mt-4">
              <a
                href={`/admin/invoices/${inv.id}/print`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 text-xs tracking-widest uppercase font-semibold"
                style={{ border: '1px solid #c8c4b8', color: '#555555' }}
              >
                <Printer size={12} /> Print Invoice
              </a>
              {!inv.paid_at && (
                <>
                  <button
                    onClick={() => openSend(inv)}
                    className="flex items-center gap-2 px-4 py-2 text-xs tracking-widest uppercase font-semibold"
                    style={{ border: '1px solid #c8c4b8', color: '#0a0a0a' }}
                  >
                    <Mail size={12} /> Send Invoice
                  </button>

                  {/* Mark paid dropdown */}
                  {Object.entries(PAYMENT_LABELS).map(([method, label]) => (
                    <button
                      key={method}
                      onClick={() => markPaid(inv.id, method)}
                      disabled={markingPaid === inv.id}
                      className="flex items-center gap-2 px-4 py-2 text-xs tracking-widest uppercase font-semibold disabled:opacity-40"
                      style={{ background: '#e4f0e4', color: '#2a7a2a' }}
                    >
                      <Check size={12} /> Paid · {label}
                    </button>
                  ))}
                </>
              )}

              {inv.sent_at && (
                <span className="flex items-center gap-1 text-xs" style={{ color: '#555555' }}>
                  <MessageSquare size={10} />
                  Sent via {inv.sent_via} on {formatDate(inv.sent_at)}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      {/* Summary */}
      <div className="grid grid-cols-2 gap-px mb-6" style={{ background: '#e2ddd0' }}>
        <div className="p-5" style={{ background: '#ffffff' }}>
          <p className="text-2xl font-bold" style={{ color: '#e63946' }}>
            {formatCurrency(unpaid.reduce((s, i) => s + Number(i.amount_due), 0))}
          </p>
          <p className="text-xs mt-1" style={{ color: '#555555' }}>{unpaid.length} unpaid invoice{unpaid.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="p-5" style={{ background: '#ffffff' }}>
          <p className="text-2xl font-bold" style={{ color: '#2a7a2a' }}>
            {formatCurrency(paid.reduce((s, i) => s + Number(i.amount_due), 0))}
          </p>
          <p className="text-xs mt-1" style={{ color: '#555555' }}>{paid.length} paid this period</p>
        </div>
      </div>

      {/* Unpaid */}
      {unpaid.length > 0 && (
        <div style={{ border: '1px solid #e2ddd0' }} className="mb-6">
          <div className="px-5 py-3" style={{ borderBottom: '1px solid #e2ddd0' }}>
            <p className="text-xs tracking-widest uppercase font-semibold" style={{ color: '#e63946' }}>Unpaid</p>
          </div>
          <div
            className="grid text-xs tracking-widest uppercase px-5 py-2"
            style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr auto', color: '#c8c4b8', borderBottom: '1px solid #f0ece0' }}
          >
            <span>Store</span><span>Amount</span><span>Method</span><span>Status</span><span />
          </div>
          {unpaid.map(inv => <InvoiceRow key={inv.id} inv={inv} />)}
        </div>
      )}

      {/* Paid */}
      {paid.length > 0 && (
        <div style={{ border: '1px solid #e2ddd0' }}>
          <div className="px-5 py-3" style={{ borderBottom: '1px solid #e2ddd0' }}>
            <p className="text-xs tracking-widest uppercase font-semibold" style={{ color: '#555555' }}>Paid</p>
          </div>
          {paid.map(inv => <InvoiceRow key={inv.id} inv={inv} />)}
        </div>
      )}

      {/* Send modal */}
      {sendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.8)' }}>
          <div className="w-full max-w-sm p-6" style={{ background: '#ffffff', border: '1px solid #c8c4b8' }}>
            <p className="text-sm font-semibold mb-5" style={{ color: '#0a0a0a' }}>Send Invoice</p>

            <div className="mb-4">
              <label className="text-xs tracking-widest uppercase block mb-2" style={{ color: '#555555' }}>Contact</label>
              <select
                value={selectedContact}
                onChange={e => setSelectedContact(e.target.value)}
                className="w-full"
                style={{ background: '#f5f2ea', border: '1px solid #c8c4b8', color: '#0a0a0a', padding: '10px 12px', fontSize: '13px', outline: 'none' }}
              >
                {sendModal.contacts.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}{c.role ? ` (${c.role})` : ''} — {c.phone ?? c.email ?? 'no contact info'}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-6">
              <label className="text-xs tracking-widest uppercase block mb-2" style={{ color: '#555555' }}>Send Via</label>
              <div className="grid grid-cols-2 gap-2">
                {(['sms', 'email'] as const).map(via => (
                  <button
                    key={via}
                    onClick={() => setSendVia(via)}
                    className="flex items-center gap-2 px-4 py-3 text-xs tracking-widest uppercase font-semibold"
                    style={{
                      border: `1px solid ${sendVia === via ? '#e63946' : '#c8c4b8'}`,
                      color: sendVia === via ? '#e63946' : '#555555',
                      background: sendVia === via ? '#fce8e8' : 'transparent',
                    }}
                  >
                    {via === 'sms' ? <MessageSquare size={12} /> : <Mail size={12} />}
                    {via.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSend}
                disabled={sending}
                className="flex-1 py-3 text-xs tracking-widest uppercase font-semibold disabled:opacity-40"
                style={{ background: '#e63946', color: '#ffffff' }}
              >
                {sending ? 'Sending...' : 'Send'}
              </button>
              <button
                onClick={() => setSendModal(null)}
                className="px-5 py-3 text-xs"
                style={{ border: '1px solid #c8c4b8', color: '#555555' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
