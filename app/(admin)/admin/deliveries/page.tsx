import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import DeliveriesClient from '@/components/admin/DeliveriesClient'
import type { StoreGroup } from '@/components/admin/DeliveriesClient'

export default async function DeliveriesPage() {
  const supabase = await createClient()

  const { data: batches } = await supabase
    .from('batches')
    .select(`
      id, status, delivery_date, store_id,
      store:stores(id, name, address),
      items:batch_items(qty_delivered),
      invoice:invoices(id, amount_due, paid_at)
    `)
    .order('delivery_date', { ascending: false })

  // Group by store, preserving store sort order by first-seen delivery date
  const storeMap = new Map<string, StoreGroup>()
  for (const batch of batches ?? []) {
    const store = batch.store as unknown as { id: string; name: string; address: string | null }
    const inv = (Array.isArray(batch.invoice) ? batch.invoice[0] : batch.invoice) as
      | { id: string; amount_due: number; paid_at: string | null } | null
    const totalUnits = (batch.items as { qty_delivered: number }[])?.reduce((s, i) => s + i.qty_delivered, 0) ?? 0

    if (!storeMap.has(store.id)) {
      storeMap.set(store.id, { storeId: store.id, storeName: store.name, storeAddress: store.address, batches: [] })
    }
    storeMap.get(store.id)!.batches.push({ id: batch.id, status: batch.status, delivery_date: batch.delivery_date, totalUnits, invoice: inv })
  }

  const groups = Array.from(storeMap.values())

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-xs tracking-widest uppercase mb-1" style={{ color: '#e63946' }}>Management</p>
          <h1 className="text-2xl font-bold" style={{ color: '#0a0a0a', fontFamily: 'Georgia, serif' }}>Deliveries</h1>
        </div>
        <Link
          href="/admin/deliveries/new"
          className="flex items-center gap-2 px-4 py-2 text-xs tracking-widest uppercase font-semibold"
          style={{ background: '#e63946', color: '#ffffff' }}
        >
          <Plus size={14} /> New Batch
        </Link>
      </div>

      <DeliveriesClient groups={groups} />
    </div>
  )
}
