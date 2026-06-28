'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'

interface Store { id: string; name: string }
interface Flavor { id: string; name: string }

const inputStyle = {
  background: '#f5f2ea', border: '1px solid #c8c4b8',
  color: '#0a0a0a', padding: '10px 12px', fontSize: '13px',
  width: '100%', outline: 'none',
}

export default function NewDeliveryPage() {
  const router = useRouter()
  const [stores, setStores] = useState<Store[]>([])
  const [flavors, setFlavors] = useState<Flavor[]>([])
  const [storeId, setStoreId] = useState('')
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [qtys, setQtys] = useState<Record<string, number>>({})
  const [saving, setSaving] = useState(false)

  // Load stores + flavors on mount
  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from('stores').select('id, name').eq('active', true).order('name'),
      supabase.from('flavors').select('id, name').eq('in_stock', true).order('sort_order'),
    ]).then(([{ data: s }, { data: f }]) => {
      setStores(s ?? [])
      setFlavors(f ?? [])
    })
  }, [])

  // When store changes, load its allocations
  useEffect(() => {
    if (!storeId) { setQtys({}); return }
    const supabase = createClient()
    supabase
      .from('store_flavor_allocations')
      .select('flavor_id, default_qty')
      .eq('store_id', storeId)
      .then(({ data }) => {
        const map: Record<string, number> = {}
        data?.forEach(a => { map[a.flavor_id] = a.default_qty })
        setQtys(map)
      })
  }, [storeId])

  const totalUnits = Object.values(qtys).reduce((s, q) => s + (q || 0), 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!storeId) { toast.error('Select a store'); return }
    if (totalUnits === 0) { toast.error('Add at least one item'); return }

    setSaving(true)
    const supabase = createClient()

    const { data: batch, error } = await supabase
      .from('batches')
      .insert({ store_id: storeId, delivery_date: deliveryDate, notes: notes || null, status: 'pending' })
      .select()
      .single()

    if (error || !batch) {
      toast.error(error?.message ?? 'Failed to create batch')
      setSaving(false)
      return
    }

    const items = flavors
      .filter(f => (qtys[f.id] ?? 0) > 0)
      .map(f => ({ batch_id: batch.id, flavor_id: f.id, qty_delivered: qtys[f.id] }))

    const { error: itemsError } = await supabase.from('batch_items').insert(items)

    if (itemsError) {
      toast.error('Batch created but failed to save items')
      setSaving(false)
      return
    }

    toast.success('Batch created')
    router.push(`/admin/deliveries/${batch.id}`)
  }

  return (
    <div>
      <div className="mb-8">
        <Link
          href="/admin/deliveries"
          className="flex items-center gap-1.5 text-xs mb-4"
          style={{ color: '#777777' }}
        >
          <ArrowLeft size={12} /> Back to Deliveries
        </Link>
        <p className="text-xs tracking-widest uppercase mb-1" style={{ color: '#e63946' }}>New</p>
        <h1 className="text-2xl font-bold" style={{ color: '#0a0a0a', fontFamily: 'Georgia, serif' }}>
          Create Batch
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="max-w-lg space-y-5">
        {/* Store */}
        <div>
          <label className="text-xs tracking-widest uppercase block mb-1.5" style={{ color: '#555555' }}>
            Store <span style={{ color: '#e63946' }}>*</span>
          </label>
          <select
            value={storeId}
            onChange={e => setStoreId(e.target.value)}
            required
            style={{ ...inputStyle, cursor: 'pointer' }}
          >
            <option value="">— select a store —</option>
            {stores.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* Delivery date */}
        <div>
          <label className="text-xs tracking-widest uppercase block mb-1.5" style={{ color: '#555555' }}>
            Delivery Date <span style={{ color: '#e63946' }}>*</span>
          </label>
          <input
            type="date"
            value={deliveryDate}
            onChange={e => setDeliveryDate(e.target.value)}
            required
            style={inputStyle}
          />
        </div>

        {/* Flavors */}
        {flavors.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs tracking-widest uppercase" style={{ color: '#555555' }}>
                Items
              </label>
              {storeId && (
                <span className="text-xs" style={{ color: '#777777' }}>
                  Pre-loaded from store allocations · {totalUnits} units total
                </span>
              )}
            </div>
            <div className="space-y-2">
              {flavors.map(f => (
                <div
                  key={f.id}
                  className="flex items-center justify-between p-3"
                  style={{ background: '#f5f2ea', border: '1px solid #e2ddd0' }}
                >
                  <div>
                    <p className="text-sm" style={{ color: '#0a0a0a' }}>{f.name}</p>
                    <p className="text-xs" style={{ color: '#777777' }}>$3.00 / unit (wholesale)</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setQtys(p => ({ ...p, [f.id]: Math.max(0, (p[f.id] ?? 0) - 3) }))}
                      className="w-7 h-7 flex items-center justify-center text-base"
                      style={{ border: '1px solid #c8c4b8', color: '#777777', background: '#ffffff' }}
                    >−</button>
                    <input
                      type="number"
                      min={0}
                      step={3}
                      value={qtys[f.id] ?? 0}
                      onChange={e => setQtys(p => ({ ...p, [f.id]: Math.max(0, Number(e.target.value)) }))}
                      style={{ ...inputStyle, width: 56, textAlign: 'center', padding: '6px 4px' }}
                    />
                    <button
                      type="button"
                      onClick={() => setQtys(p => ({ ...p, [f.id]: (p[f.id] ?? 0) + 3 }))}
                      className="w-7 h-7 flex items-center justify-center text-base"
                      style={{ border: '1px solid #c8c4b8', color: '#0a0a0a', background: '#ffffff' }}
                    >+</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="text-xs tracking-widest uppercase block mb-1.5" style={{ color: '#555555' }}>
            Notes
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            placeholder="Any special instructions for this delivery..."
            style={{ ...inputStyle, resize: 'none' }}
          />
        </div>

        <button
          type="submit"
          disabled={saving || totalUnits === 0 || !storeId}
          className="px-6 py-3 text-xs tracking-widest uppercase font-semibold disabled:opacity-40"
          style={{ background: '#e63946', color: '#ffffff' }}
        >
          {saving ? 'Creating...' : `Create Batch · ${totalUnits} units`}
        </button>
      </form>
    </div>
  )
}
