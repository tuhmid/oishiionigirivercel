'use client'

import { useState, useRef } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2 } from 'lucide-react'
import type { Flavor } from '@/types'
import { useRouter } from 'next/navigation'

export default function InventoryClient({ flavors: initialFlavors }: { flavors: Flavor[] }) {
  const [flavors, setFlavors] = useState(initialFlavors)
  const [adding, setAdding] = useState(false)
  const [newFlavor, setNewFlavor] = useState({ name: '', description: '', stock_count: 0 })
  const [editingQty, setEditingQty] = useState<string | null>(null)
  const [qtyDraft, setQtyDraft] = useState<number>(0)
  const qtyRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const toggleStock = async (id: string, current: boolean) => {
    const supabase = createClient()
    const { error } = await supabase.from('flavors').update({ in_stock: !current }).eq('id', id)
    if (error) { toast.error(error.message); return }
    setFlavors(prev => prev.map(f => f.id === id ? { ...f, in_stock: !current } : f))
  }

  const startEditQty = (flavor: Flavor) => {
    setEditingQty(flavor.id)
    setQtyDraft(flavor.stock_count ?? 0)
    setTimeout(() => qtyRef.current?.select(), 0)
  }

  const saveQty = async (id: string) => {
    const supabase = createClient()
    const { error } = await supabase.from('flavors').update({ stock_count: qtyDraft }).eq('id', id)
    if (error) { toast.error(error.message); return }
    setFlavors(prev => prev.map(f => f.id === id ? { ...f, stock_count: qtyDraft } : f))
    setEditingQty(null)
  }

  const deleteFlavor = async (id: string) => {
    if (!confirm('Delete this flavor? This cannot be undone.')) return
    const supabase = createClient()
    await supabase.from('flavors').delete().eq('id', id)
    setFlavors(prev => prev.filter(f => f.id !== id))
    toast.success('Flavor deleted')
  }

  const addFlavor = async () => {
    if (!newFlavor.name) { toast.error('Flavor name required'); return }
    const supabase = createClient()
    const maxOrder = Math.max(...flavors.map(f => f.sort_order), 0)
    const { data, error } = await supabase
      .from('flavors')
      .insert({
        name: newFlavor.name,
        description: newFlavor.description || null,
        in_stock: true,
        stock_count: newFlavor.stock_count,
        sort_order: maxOrder + 1,
      })
      .select()
      .single()

    if (error) { toast.error(error.message); return }
    setFlavors(prev => [...prev, data])
    setNewFlavor({ name: '', description: '', stock_count: 0 })
    setAdding(false)
    router.refresh()
    toast.success('Flavor added')
  }

  const inputStyle = {
    background: '#f5f2ea',
    border: '1px solid #c8c4b8',
    color: '#0a0a0a',
    padding: '8px 10px',
    fontSize: '13px',
    outline: 'none',
  }

  const totalStock = flavors.reduce((s, f) => s + (f.stock_count ?? 0), 0)

  return (
    <div>
      {/* Summary bar */}
      <div className="flex items-center gap-6 mb-4 px-1">
        <div>
          <span className="text-2xl font-bold" style={{ color: '#0a0a0a' }}>{totalStock}</span>
          <span className="text-xs ml-2" style={{ color: '#555555' }}>total units in stock</span>
        </div>
        <div>
          <span className="text-sm font-semibold" style={{ color: flavors.some(f => !f.in_stock) ? '#e63946' : '#2a7a2a' }}>
            {flavors.filter(f => !f.in_stock).length} sold out
          </span>
        </div>
      </div>

      <div style={{ border: '1px solid #e2ddd0' }}>
        <div
          className="grid text-xs tracking-widest uppercase px-5 py-3"
          style={{ gridTemplateColumns: '2fr 3fr 80px 120px 40px', color: '#666666', borderBottom: '1px solid #e2ddd0' }}
        >
          <span>Flavor</span>
          <span>Description</span>
          <span>Qty</span>
          <span>Status</span>
          <span />
        </div>

        {flavors.map(flavor => (
          <div
            key={flavor.id}
            className="grid items-center px-5 py-4"
            style={{ gridTemplateColumns: '2fr 3fr 80px 120px 40px', borderBottom: '1px solid #f0ece0' }}
          >
            <span className="text-sm font-medium" style={{ color: '#0a0a0a' }}>{flavor.name}</span>
            <span className="text-xs" style={{ color: '#555555' }}>{flavor.description ?? '—'}</span>

            {/* Inline qty edit */}
            {editingQty === flavor.id ? (
              <input
                ref={qtyRef}
                type="number"
                min={0}
                value={qtyDraft}
                onChange={e => setQtyDraft(Math.max(0, Number(e.target.value)))}
                onBlur={() => saveQty(flavor.id)}
                onKeyDown={e => {
                  if (e.key === 'Enter') saveQty(flavor.id)
                  if (e.key === 'Escape') setEditingQty(null)
                }}
                style={{ ...inputStyle, width: 60, textAlign: 'center', padding: '4px 6px' }}
              />
            ) : (
              <button
                onClick={() => startEditQty(flavor)}
                className="text-sm font-mono text-left w-fit px-2 py-0.5 rounded transition-colors hover:bg-[#f0ece0]"
                style={{ color: (flavor.stock_count ?? 0) === 0 ? '#e63946' : '#0a0a0a' }}
                title="Click to edit"
              >
                {flavor.stock_count ?? 0}
              </button>
            )}

            <button
              onClick={() => toggleStock(flavor.id, flavor.in_stock)}
              className="flex items-center gap-1.5 text-xs w-fit px-2 py-1 rounded-sm transition-colors"
              style={{
                background: flavor.in_stock ? '#e4f0e4' : '#e2ddd0',
                color: flavor.in_stock ? '#2a7a2a' : '#555555',
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: flavor.in_stock ? '#2a7a2a' : '#666666' }} />
              {flavor.in_stock ? 'In Stock' : 'Sold Out'}
            </button>

            <button
              onClick={() => deleteFlavor(flavor.id)}
              className="p-1 transition-colors"
              style={{ color: '#c8c4b8' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#e63946')}
              onMouseLeave={e => (e.currentTarget.style.color = '#c8c4b8')}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}

        {/* Add flavor row */}
        {adding ? (
          <div className="grid items-center gap-3 px-5 py-4" style={{ gridTemplateColumns: '2fr 3fr 80px auto', borderBottom: '1px solid #f0ece0' }}>
            <input
              placeholder="Flavor name"
              value={newFlavor.name}
              onChange={e => setNewFlavor(p => ({ ...p, name: e.target.value }))}
              style={{ ...inputStyle, width: '100%' }}
            />
            <input
              placeholder="Description (optional)"
              value={newFlavor.description}
              onChange={e => setNewFlavor(p => ({ ...p, description: e.target.value }))}
              style={{ ...inputStyle, width: '100%' }}
            />
            <input
              type="number"
              min={0}
              placeholder="Qty"
              value={newFlavor.stock_count || ''}
              onChange={e => setNewFlavor(p => ({ ...p, stock_count: Math.max(0, Number(e.target.value)) }))}
              style={{ ...inputStyle, width: '100%', textAlign: 'center' }}
            />
            <div className="flex gap-2">
              <button
                onClick={addFlavor}
                className="px-4 py-2 text-xs tracking-widest uppercase font-semibold"
                style={{ background: '#e63946', color: '#ffffff' }}
              >
                Add
              </button>
              <button
                onClick={() => setAdding(false)}
                className="px-3 py-2 text-xs"
                style={{ color: '#555555', border: '1px solid #c8c4b8' }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-2 px-5 py-4 text-sm w-full transition-colors hover:text-[#e63946]"
            style={{ color: '#666666' }}
          >
            <Plus size={14} /> Add New Flavor
          </button>
        )}
      </div>
    </div>
  )
}
