'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Printer, Send, Check, ArrowLeft } from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'
import { WHOLESALE_PRICE } from '@/lib/pricing'

interface BatchItem {
  id: string
  flavor_id: string
  qty_delivered: number
  qty_sold: number | null
  flavor: { id: string; name: string }
}

interface BatchContact {
  id: string; name: string
  phone: string | null; email: string | null; is_default: boolean
}

interface Batch {
  id: string
  store_id: string
  delivery_date: string
  return_date: string | null
  status: string
  notes: string | null
  store: { id: string; name: string; address: string | null; contacts: BatchContact[] }
  items: BatchItem[]
  invoice: { id: string; amount_due: number; paid_at: string | null; sent_at: string | null } | null
}

const STATUS_STEPS = ['pending', 'delivered', 'returned', 'invoiced', 'paid']
const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending Delivery',
  delivered: 'Delivered',
  returned: 'Sales Recorded',
  invoiced: 'Invoiced',
  paid: 'Paid',
}
const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending:   { bg: '#e8eaf5', text: '#4a5a9a' },
  delivered: { bg: '#f5f0d0', text: '#8a7020' },
  returned:  { bg: '#e0eaf5', text: '#4a6a9a' },
  invoiced:  { bg: '#e4f0e4', text: '#2a7a2a' },
  paid:      { bg: '#e4f0e4', text: '#1a7a1a' },
}

const inputStyle = {
  background: '#f5f2ea', border: '1px solid #c8c4b8',
  color: '#0a0a0a', padding: '8px 10px', fontSize: '13px', outline: 'none',
}

export default function BatchDetailClient({ batch: initial }: { batch: Batch }) {
  const router = useRouter()
  const [batch, setBatch] = useState(initial)
  const [soldQtys, setSoldQtys] = useState<Record<string, number>>(
    Object.fromEntries(initial.items.map(i => [i.id, i.qty_sold ?? 0]))
  )
  const [loading, setLoading] = useState<string | null>(null)

  const statusColor = STATUS_COLORS[batch.status] ?? STATUS_COLORS.pending
  const stepIndex = STATUS_STEPS.indexOf(batch.status)

  // ── Mark Delivered ────────────────────────────────────────────────
  async function markDelivered() {
    setLoading('deliver')
    const res = await fetch('/api/receipts/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batch_id: batch.id }),
    })
    const { error } = await res.json()
    if (error) { toast.error(error); setLoading(null); return }
    toast.success('Marked as delivered · Receipt sent')
    setBatch(b => ({ ...b, status: 'delivered' }))
    setLoading(null)
    router.refresh()
  }

  // ── Record Sales ──────────────────────────────────────────────────
  async function recordSales() {
    setLoading('sales')
    const supabase = createClient()

    for (const item of batch.items) {
      await supabase
        .from('batch_items')
        .update({ qty_sold: soldQtys[item.id] ?? 0 })
        .eq('id', item.id)
    }

    const { error } = await supabase
      .from('batches')
      .update({ status: 'returned', return_date: new Date().toISOString().split('T')[0] })
      .eq('id', batch.id)

    if (error) { toast.error(error.message); setLoading(null); return }

    toast.success('Sales recorded')
    setBatch(b => ({
      ...b,
      status: 'returned',
      items: b.items.map(i => ({ ...i, qty_sold: soldQtys[i.id] ?? 0 })),
    }))
    setLoading(null)
    router.refresh()
  }

  // ── Step Back ─────────────────────────────────────────────────────
  async function stepBack() {
    if (stepIndex === 0) return

    const warnings: Partial<Record<string, string>> = {
      delivered: 'Revert to Pending? The receipt has already been sent to the store.',
      returned:  'Revert to Delivered? All recorded sales quantities will be cleared.',
      invoiced:  'Revert to Sales Recorded? The generated invoice will be deleted.',
      paid:      'Revert to Invoiced? The payment record will be cleared.',
    }
    const msg = warnings[batch.status]
    if (msg && !window.confirm(msg)) return

    setLoading('back')
    const supabase = createClient()

    if (batch.status === 'delivered') {
      await supabase.from('batches').update({ status: 'pending' }).eq('id', batch.id)
      setBatch(b => ({ ...b, status: 'pending' }))

    } else if (batch.status === 'returned') {
      await Promise.all(batch.items.map(item =>
        supabase.from('batch_items').update({ qty_sold: null }).eq('id', item.id)
      ))
      await supabase.from('batches').update({ status: 'delivered', return_date: null }).eq('id', batch.id)
      setSoldQtys(Object.fromEntries(batch.items.map(i => [i.id, 0])))
      setBatch(b => ({
        ...b, status: 'delivered', return_date: null,
        items: b.items.map(i => ({ ...i, qty_sold: null })),
      }))

    } else if (batch.status === 'invoiced' && batch.invoice) {
      await supabase.from('invoices').delete().eq('id', batch.invoice.id)
      await supabase.from('batches').update({ status: 'returned' }).eq('id', batch.id)
      setBatch(b => ({ ...b, status: 'returned', invoice: null }))

    } else if (batch.status === 'paid' && batch.invoice) {
      await supabase.from('invoices')
        .update({ paid_at: null, payment_method: null, amount_paid: 0 })
        .eq('id', batch.invoice.id)
      await supabase.from('batches').update({ status: 'invoiced' }).eq('id', batch.id)
      setBatch(b => ({ ...b, status: 'invoiced', invoice: b.invoice ? { ...b.invoice, paid_at: null } : null }))
    }

    toast.success('Reverted to previous step')
    setLoading(null)
    router.refresh()
  }

  // ── Generate Invoice ──────────────────────────────────────────────
  async function generateInvoice() {
    setLoading('invoice')
    const supabase = createClient()

    const amountDue = batch.items.reduce((sum, item) => {
      return sum + ((item.qty_sold ?? 0) * Number(WHOLESALE_PRICE))
    }, 0)

    if (amountDue === 0) {
      toast.error('No sold items to invoice')
      setLoading(null)
      return
    }

    const { data: invoice, error } = await supabase
      .from('invoices')
      .insert({ batch_id: batch.id, store_id: batch.store_id, amount_due: amountDue })
      .select()
      .single()

    if (error || !invoice) { toast.error(error?.message ?? 'Failed'); setLoading(null); return }

    await supabase.from('batches').update({ status: 'invoiced' }).eq('id', batch.id)

    toast.success(`Invoice created · ${formatCurrency(amountDue)}`)
    setBatch(b => ({ ...b, status: 'invoiced', invoice: { id: invoice.id, amount_due: amountDue, paid_at: null, sent_at: null } }))
    setLoading(null)
    router.refresh()
  }

  const invoiceTotal = batch.items.reduce((sum, item) => {
    return sum + ((item.qty_sold ?? 0) * Number(WHOLESALE_PRICE))
  }, 0)

  return (
    <div>
      {/* Back */}
      <Link href="/admin/deliveries" className="flex items-center gap-1.5 text-xs mb-6" style={{ color: '#777777' }}>
        <ArrowLeft size={12} /> All Deliveries
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <p className="text-xs tracking-widest uppercase mb-1" style={{ color: '#e63946' }}>Batch</p>
          <h1 className="text-2xl font-bold" style={{ color: '#0a0a0a', fontFamily: 'Georgia, serif' }}>
            {batch.store.name}
          </h1>
          <p className="text-sm mt-1" style={{ color: '#555555' }}>
            {formatDate(batch.delivery_date)}
            {batch.store.address ? ` · ${batch.store.address}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="px-3 py-1 text-xs font-semibold tracking-wide"
            style={{ background: statusColor.bg, color: statusColor.text }}
          >
            {STATUS_LABELS[batch.status] ?? batch.status}
          </span>
          {stepIndex > 0 && (
            <button
              onClick={stepBack}
              disabled={loading === 'back'}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs tracking-widest uppercase font-semibold disabled:opacity-40 transition-colors hover:bg-[#f5f0e6]"
              style={{ border: '1px solid #c8c4b8', color: '#555555' }}
              title={`Revert to ${STATUS_LABELS[STATUS_STEPS[stepIndex - 1]]}`}
            >
              <ArrowLeft size={12} /> Back
            </button>
          )}
          <Link
            href={`/admin/deliveries/${batch.id}/receipt`}
            target="_blank"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs tracking-widest uppercase font-semibold"
            style={{ border: '1px solid #c8c4b8', color: '#555555' }}
          >
            <Printer size={12} /> Receipt
          </Link>
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-0 mb-8">
        {STATUS_STEPS.map((s, i) => (
          <div key={s} className="flex items-center flex-1">
            <div
              className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold flex-shrink-0"
              style={{
                background: i <= stepIndex ? '#e63946' : '#e2ddd0',
                color: i <= stepIndex ? '#ffffff' : '#aaaaaa',
              }}
            >
              {i < stepIndex ? <Check size={10} /> : i + 1}
            </div>
            <div className="text-xs ml-1 mr-2 hidden sm:block" style={{ color: i <= stepIndex ? '#0a0a0a' : '#aaaaaa' }}>
              {STATUS_LABELS[s]}
            </div>
            {i < STATUS_STEPS.length - 1 && (
              <div className="flex-1 h-px" style={{ background: i < stepIndex ? '#e63946' : '#e2ddd0' }} />
            )}
          </div>
        ))}
      </div>

      {/* Items table */}
      <div className="mb-6" style={{ border: '1px solid #e2ddd0' }}>
        <div
          className="grid text-xs tracking-widest uppercase px-4 py-2.5"
          style={{
            gridTemplateColumns: batch.status === 'pending' || batch.status === 'delivered'
              ? '1fr 1fr'
              : '1fr 1fr 1fr 1fr',
            color: '#888888',
            borderBottom: '1px solid #e2ddd0',
            background: '#f5f2ea',
          }}
        >
          <span>Flavor</span>
          <span>Delivered</span>
          {(batch.status !== 'pending' && batch.status !== 'delivered') && <span>Sold</span>}
          {(batch.status !== 'pending' && batch.status !== 'delivered') && <span>Amount</span>}
        </div>
        {batch.items.map(item => (
          <div
            key={item.id}
            className="grid items-center px-4 py-3"
            style={{
              gridTemplateColumns: batch.status === 'pending' || batch.status === 'delivered'
                ? '1fr 1fr'
                : '1fr 1fr 1fr 1fr',
              borderBottom: '1px solid #f0ece0',
            }}
          >
            <span className="text-sm font-medium" style={{ color: '#0a0a0a' }}>{item.flavor.name}</span>
            <span className="text-sm" style={{ color: '#555555' }}>{item.qty_delivered}</span>
            {(batch.status !== 'pending' && batch.status !== 'delivered') && (
              <span className="text-sm" style={{ color: '#0a0a0a' }}>{item.qty_sold ?? '—'}</span>
            )}
            {(batch.status !== 'pending' && batch.status !== 'delivered') && (
              <span className="text-sm font-semibold" style={{ color: '#2a7a2a' }}>
                {item.qty_sold ? formatCurrency(item.qty_sold * Number(WHOLESALE_PRICE)) : '—'}
              </span>
            )}
          </div>
        ))}
        {/* Total row */}
        <div
          className="grid px-4 py-3"
          style={{
            gridTemplateColumns: batch.status === 'pending' || batch.status === 'delivered'
              ? '1fr 1fr'
              : '1fr 1fr 1fr 1fr',
            background: '#f5f2ea',
            borderTop: '1px solid #e2ddd0',
          }}
        >
          <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#555555' }}>Total</span>
          <span className="text-sm font-bold" style={{ color: '#0a0a0a' }}>
            {batch.items.reduce((s, i) => s + i.qty_delivered, 0)} units
          </span>
          {(batch.status !== 'pending' && batch.status !== 'delivered') && (
            <span className="text-sm font-bold" style={{ color: '#0a0a0a' }}>
              {batch.items.reduce((s, i) => s + (i.qty_sold ?? 0), 0)} sold
            </span>
          )}
          {(batch.status !== 'pending' && batch.status !== 'delivered') && (
            <span className="text-sm font-bold" style={{ color: '#2a7a2a' }}>
              {formatCurrency(invoiceTotal)}
            </span>
          )}
        </div>
      </div>

      {/* ── Status-gated actions ── */}

      {/* PENDING: Mark as Delivered */}
      {batch.status === 'pending' && (
        <div className="p-5" style={{ background: '#faf8f3', border: '1px solid #e2ddd0' }}>
          <p className="text-xs tracking-widest uppercase font-semibold mb-2" style={{ color: '#555555' }}>
            Ready to deliver?
          </p>
          <p className="text-sm mb-4" style={{ color: '#777777' }}>
            This will send the order receipt to{' '}
            <strong style={{ color: '#0a0a0a' }}>
              {batch.store.contacts.find(c => c.is_default)?.name ?? batch.store.contacts[0]?.name ?? 'the store'}
            </strong>{' '}
            via SMS and email, and mark the batch as delivered.
          </p>
          <button
            onClick={markDelivered}
            disabled={loading === 'deliver'}
            className="flex items-center gap-2 px-6 py-3 text-xs tracking-widest uppercase font-semibold disabled:opacity-40"
            style={{ background: '#e63946', color: '#ffffff' }}
          >
            <Send size={12} />
            {loading === 'deliver' ? 'Sending receipt...' : 'Mark Delivered · Send Receipt'}
          </button>
        </div>
      )}

      {/* DELIVERED: Record sold quantities */}
      {batch.status === 'delivered' && (
        <div className="p-5" style={{ background: '#faf8f3', border: '1px solid #e2ddd0' }}>
          <p className="text-xs tracking-widest uppercase font-semibold mb-1" style={{ color: '#555555' }}>
            Record Sales
          </p>
          <p className="text-sm mb-4" style={{ color: '#777777' }}>
            Enter how many of each flavor were sold (from driver tally).
          </p>
          <div className="space-y-2 mb-4">
            {batch.items.map(item => (
              <div key={item.id} className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm" style={{ color: '#0a0a0a' }}>{item.flavor.name}</p>
                  <p className="text-xs" style={{ color: '#777777' }}>
                    {item.qty_delivered} delivered · max sold = {item.qty_delivered}
                  </p>
                </div>
                <input
                  type="number"
                  min={0}
                  max={item.qty_delivered}
                  value={soldQtys[item.id] ?? 0}
                  onChange={e => setSoldQtys(p => ({
                    ...p,
                    [item.id]: Math.min(item.qty_delivered, Math.max(0, Number(e.target.value)))
                  }))}
                  style={{ ...inputStyle, width: 72, textAlign: 'center' }}
                />
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between mb-4 pt-3" style={{ borderTop: '1px solid #e2ddd0' }}>
            <span className="text-sm" style={{ color: '#555555' }}>Invoice total</span>
            <span className="text-base font-bold" style={{ color: '#0a0a0a' }}>
              {formatCurrency(
                batch.items.reduce((sum, item) => sum + ((soldQtys[item.id] ?? 0) * Number(WHOLESALE_PRICE)), 0)
              )}
            </span>
          </div>
          <button
            onClick={recordSales}
            disabled={loading === 'sales'}
            className="px-6 py-3 text-xs tracking-widest uppercase font-semibold disabled:opacity-40"
            style={{ background: '#e63946', color: '#ffffff' }}
          >
            {loading === 'sales' ? 'Saving...' : 'Record Sales & Mark Returned'}
          </button>
        </div>
      )}

      {/* RETURNED: Generate Invoice */}
      {batch.status === 'returned' && !batch.invoice && (
        <div className="p-5" style={{ background: '#faf8f3', border: '1px solid #e2ddd0' }}>
          <p className="text-xs tracking-widest uppercase font-semibold mb-1" style={{ color: '#555555' }}>
            Ready to Invoice
          </p>
          <p className="text-sm mb-4" style={{ color: '#777777' }}>
            Generate an invoice for <strong style={{ color: '#0a0a0a' }}>{formatCurrency(invoiceTotal)}</strong>.
            You can send it to the store from the Invoices page.
          </p>
          <button
            onClick={generateInvoice}
            disabled={loading === 'invoice'}
            className="px-6 py-3 text-xs tracking-widest uppercase font-semibold disabled:opacity-40"
            style={{ background: '#1E3A1E', color: '#ffffff' }}
          >
            {loading === 'invoice' ? 'Creating invoice...' : `Generate Invoice · ${formatCurrency(invoiceTotal)}`}
          </button>
        </div>
      )}

      {/* INVOICED / PAID: Show invoice summary */}
      {batch.invoice && (
        <div className="p-5" style={{ background: '#e4f0e4', border: '1px solid #b8d8b8' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs tracking-widest uppercase font-semibold mb-1" style={{ color: '#2a7a2a' }}>
                {batch.invoice.paid_at ? 'Paid' : 'Invoice Created'}
              </p>
              <p className="text-lg font-bold" style={{ color: '#0a0a0a' }}>
                {formatCurrency(Number(batch.invoice.amount_due))}
              </p>
              {batch.invoice.sent_at && (
                <p className="text-xs mt-1" style={{ color: '#555555' }}>
                  Sent {formatDate(batch.invoice.sent_at)}
                </p>
              )}
            </div>
            <Link
              href={`/admin/invoices`}
              className="px-4 py-2 text-xs tracking-widest uppercase font-semibold"
              style={{ background: '#2a7a2a', color: '#ffffff' }}
            >
              View Invoice →
            </Link>
          </div>
        </div>
      )}

      {/* Notes */}
      {batch.notes && (
        <div className="mt-6 p-4" style={{ background: '#f5f2ea', border: '1px solid #e2ddd0' }}>
          <p className="text-xs tracking-widest uppercase mb-1" style={{ color: '#888888' }}>Notes</p>
          <p className="text-sm" style={{ color: '#555555' }}>{batch.notes}</p>
        </div>
      )}
    </div>
  )
}
