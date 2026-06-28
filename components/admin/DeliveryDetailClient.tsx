'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import { WHOLESALE_PRICE } from '@/lib/pricing'
import type { Batch, Flavor, BatchItem } from '@/types'

interface StoreWithAllocations {
  id: string
  name: string
  allocations: { flavor_id: string; default_qty: number; flavor: Flavor }[]
}

interface Props {
  batch: (Batch & {
    store: { id: string; name: string }
    items: (BatchItem & { flavor: Flavor })[]
    invoice: { id: string; amount_due: number; paid_at: string | null } | null
  }) | null
  stores: StoreWithAllocations[]
  flavors: Flavor[]
}

export default function DeliveryDetailClient({ batch, stores, flavors }: Props) {
  const router = useRouter()
  const [selectedStoreId, setSelectedStoreId] = useState(batch?.store_id ?? '')
  const [deliveryDate, setDeliveryDate] = useState(batch?.delivery_date ?? new Date().toISOString().split('T')[0])
  const [quantities, setQuantities] = useState<Record<string, number>>(
    batch
      ? Object.fromEntries(batch.items.map(i => [i.flavor_id, i.qty_delivered]))
      : {}
  )
  const [soldQuantities, setSoldQuantities] = useState<Record<string, number>>(
    batch
      ? Object.fromEntries(batch.items.map(i => [i.flavor_id, i.qty_sold ?? 0]))
      : {}
  )
  const [mode, setMode] = useState<'deliver' | 'return'>(
    batch?.status === 'returned' || batch?.status === 'invoiced' || batch?.status === 'paid'
      ? 'return'
      : 'deliver'
  )
  const [saving, setSaving] = useState(false)

  const selectedStore = stores.find(s => s.id === selectedStoreId)

  const loadStoreAllocations = (storeId: string) => {
    const store = stores.find(s => s.id === storeId)
    if (!store) return
    const alloc = Object.fromEntries(store.allocations.map(a => [a.flavor_id, a.default_qty]))
    setQuantities(alloc)
    setSelectedStoreId(storeId)
  }

  const totalDelivered = Object.values(quantities).reduce((s, q) => s + q, 0)

  const computeInvoiceAmount = () => {
    return flavors.reduce((sum, f) => {
      const sold = soldQuantities[f.id] ?? 0
      return sum + sold * WHOLESALE_PRICE
    }, 0)
  }

  const handleSaveDelivery = async () => {
    if (!selectedStoreId) { toast.error('Select a store'); return }
    if (totalDelivered === 0) { toast.error('Add items to deliver'); return }
    setSaving(true)
    const supabase = createClient()

    if (!batch) {
      const { data: newBatch, error } = await supabase
        .from('batches')
        .insert({ store_id: selectedStoreId, delivery_date: deliveryDate, status: 'delivered' })
        .select()
        .single()
      if (error || !newBatch) { toast.error(error?.message ?? 'Failed'); setSaving(false); return }

      const items = Object.entries(quantities)
        .filter(([, qty]) => qty > 0)
        .map(([flavor_id, qty_delivered]) => ({ batch_id: newBatch.id, flavor_id, qty_delivered }))

      await supabase.from('batch_items').insert(items)
      toast.success('Delivery recorded')
      router.push(`/admin/deliveries/${newBatch.id}`)
    } else {
      await supabase.from('batches').update({ status: 'delivered', delivery_date: deliveryDate }).eq('id', batch.id)
      // Update quantities
      for (const item of batch.items) {
        await supabase.from('batch_items').update({ qty_delivered: quantities[item.flavor_id] ?? item.qty_delivered }).eq('id', item.id)
      }
      toast.success('Delivery updated')
    }
    setSaving(false)
  }

  const handleSaveReturn = async () => {
    if (!batch) return
    setSaving(true)
    const supabase = createClient()

    for (const item of batch.items) {
      await supabase.from('batch_items').update({ qty_sold: soldQuantities[item.flavor_id] ?? 0 }).eq('id', item.id)
    }

    const amountDue = computeInvoiceAmount()

    if (!batch.invoice) {
      await supabase.from('invoices').insert({
        batch_id: batch.id,
        store_id: batch.store_id,
        amount_due: amountDue,
      })
    } else {
      await supabase.from('invoices').update({ amount_due: amountDue }).eq('id', batch.invoice.id)
    }

    await supabase.from('batches').update({ status: 'invoiced', return_date: new Date().toISOString().split('T')[0] }).eq('id', batch.id)
    toast.success('Return recorded, invoice created')
    router.refresh()
    setSaving(false)
  }

  const inputStyle = {
    background: '#f5f2ea',
    border: '1px solid #c8c4b8',
    color: '#0a0a0a',
    padding: '10px 12px',
    fontSize: '13px',
    outline: 'none',
  }

  return (
    <div>
      <div className="mb-8">
        <p className="text-xs tracking-widest uppercase mb-1" style={{ color: '#e63946' }}>Delivery</p>
        <h1 className="text-2xl font-bold" style={{ color: '#0a0a0a', fontFamily: 'Georgia, serif' }}>
          {batch ? (batch.store as { name: string })?.name : 'New Delivery'}
        </h1>
      </div>

      {/* Mode tabs (only for existing batch) */}
      {batch && (
        <div className="flex gap-1 mb-6" style={{ borderBottom: '1px solid #e2ddd0' }}>
          {(['deliver', 'return'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="px-4 py-2 text-xs tracking-widest uppercase transition-colors"
              style={{
                color: mode === m ? '#0a0a0a' : '#666666',
                borderBottom: mode === m ? '1px solid #e63946' : '1px solid transparent',
                marginBottom: '-1px',
              }}
            >
              {m === 'deliver' ? 'Delivery Details' : 'Record Return'}
            </button>
          ))}
        </div>
      )}

      <div className="max-w-lg space-y-6">
        {/* Store selector */}
        {!batch && (
          <div>
            <label className="text-xs tracking-widest uppercase block mb-1.5" style={{ color: '#555555' }}>Store</label>
            <select
              value={selectedStoreId}
              onChange={e => loadStoreAllocations(e.target.value)}
              style={{ ...inputStyle, width: '100%', cursor: 'pointer' }}
            >
              <option value="">— select store —</option>
              {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        )}

        {/* Date */}
        <div>
          <label className="text-xs tracking-widest uppercase block mb-1.5" style={{ color: '#555555' }}>
            {mode === 'deliver' ? 'Delivery Date' : 'Return Date'}
          </label>
          <input
            type="date"
            value={deliveryDate}
            onChange={e => setDeliveryDate(e.target.value)}
            style={{ ...inputStyle, width: '100%' }}
          />
        </div>

        {/* Flavor quantities */}
        {mode === 'deliver' ? (
          <div>
            <label className="text-xs tracking-widest uppercase block mb-3" style={{ color: '#555555' }}>
              Quantities Delivered
            </label>
            <div className="space-y-2">
              {flavors.map(f => (
                <div key={f.id} className="flex items-center justify-between p-4" style={{ background: '#f5f2ea', border: '1px solid #e2ddd0' }}>
                  <div>
                    <p className="text-sm" style={{ color: '#0a0a0a' }}>{f.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#555555' }}>${WHOLESALE_PRICE.toFixed(2)} each</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setQuantities(p => ({ ...p, [f.id]: Math.max(0, (p[f.id] ?? 0) - 3) }))}
                      className="w-7 h-7 flex items-center justify-center"
                      style={{ border: '1px solid #c8c4b8', color: '#777777' }}
                    >−</button>
                    <span className="w-8 text-center text-sm font-semibold" style={{ color: '#0a0a0a' }}>
                      {quantities[f.id] ?? 0}
                    </span>
                    <button
                      onClick={() => setQuantities(p => ({ ...p, [f.id]: (p[f.id] ?? 0) + 3 }))}
                      className="w-7 h-7 flex items-center justify-center"
                      style={{ border: '1px solid #c8c4b8', color: '#0a0a0a' }}
                    >+</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-4 px-1">
              <span className="text-sm" style={{ color: '#555555' }}>Total pieces</span>
              <span className="font-semibold" style={{ color: '#0a0a0a' }}>{totalDelivered}</span>
            </div>
            <button
              onClick={handleSaveDelivery}
              disabled={saving}
              className="mt-4 w-full py-3 text-xs tracking-widest uppercase font-semibold disabled:opacity-40"
              style={{ background: '#e63946', color: '#ffffff' }}
            >
              {saving ? 'Saving...' : batch ? 'Update Delivery' : 'Record Delivery'}
            </button>
          </div>
        ) : (
          batch && (
            <div>
              <label className="text-xs tracking-widest uppercase block mb-3" style={{ color: '#555555' }}>
                Quantities Sold
              </label>
              <div className="space-y-2">
                {batch.items.map(item => {
                  const max = item.qty_delivered
                  const sold = soldQuantities[item.flavor_id] ?? item.qty_sold ?? 0
                  return (
                    <div key={item.id} className="p-4" style={{ background: '#f5f2ea', border: '1px solid #e2ddd0' }}>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm" style={{ color: '#0a0a0a' }}>{item.flavor?.name}</p>
                        <span className="text-xs" style={{ color: '#555555' }}>delivered: {max}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setSoldQuantities(p => ({ ...p, [item.flavor_id]: Math.max(0, sold - 1) }))}
                          className="w-7 h-7 flex items-center justify-center"
                          style={{ border: '1px solid #c8c4b8', color: '#777777' }}
                        >−</button>
                        <span className="w-8 text-center text-sm font-semibold" style={{ color: '#0a0a0a' }}>{sold}</span>
                        <button
                          onClick={() => setSoldQuantities(p => ({ ...p, [item.flavor_id]: Math.min(max, sold + 1) }))}
                          className="w-7 h-7 flex items-center justify-center"
                          style={{ border: '1px solid #c8c4b8', color: '#0a0a0a' }}
                        >+</button>
                        <span className="text-xs ml-auto" style={{ color: '#555555' }}>
                          {max - sold} unsold
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="flex justify-between items-center mt-4 p-4" style={{ background: '#faf8f3', border: '1px solid #e2ddd0' }}>
                <span className="text-sm" style={{ color: '#777777' }}>Invoice Amount</span>
                <span className="text-xl font-bold" style={{ color: '#e63946' }}>
                  {formatCurrency(computeInvoiceAmount())}
                </span>
              </div>

              <button
                onClick={handleSaveReturn}
                disabled={saving}
                className="mt-4 w-full py-3 text-xs tracking-widest uppercase font-semibold disabled:opacity-40"
                style={{ background: '#e63946', color: '#ffffff' }}
              >
                {saving ? 'Saving...' : 'Record Return & Generate Invoice'}
              </button>
            </div>
          )
        )}
      </div>
    </div>
  )
}
