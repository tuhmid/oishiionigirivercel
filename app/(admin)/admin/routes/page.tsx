import { createClient } from '@/lib/supabase/server'
import RoutesClient from '@/components/admin/RoutesClient'
import type { RouteDay } from '@/components/admin/RoutesClient'

export default async function RoutesPage() {
  const supabase = await createClient()

  const { data: pendingBatches } = await supabase
    .from('batches')
    .select(`
      id, delivery_date, store_id,
      store:stores(id, name, address, hours, open_247)
    `)
    .eq('status', 'pending')
    .order('delivery_date', { ascending: true })

  const dates = [...new Set((pendingBatches ?? []).map(b => b.delivery_date))]
  const storeIds = [...new Set((pendingBatches ?? []).map(b => b.store_id))]

  const [{ data: routePlans }, { data: recentInvoices }] = await Promise.all([
    dates.length > 0
      ? supabase.from('route_plans').select('id, planned_date, stops').in('planned_date', dates)
      : Promise.resolve({ data: [] }),
    storeIds.length > 0
      ? supabase.from('invoices').select('id, store_id, amount_due, paid_at').in('store_id', storeIds).is('paid_at', null).order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
  ])

  // Latest invoice per store
  const latestInvoiceByStore = new Map<string, { id: string; amount_due: number; paid_at: string | null }>()
  for (const inv of recentInvoices ?? []) {
    if (!latestInvoiceByStore.has(inv.store_id)) latestInvoiceByStore.set(inv.store_id, inv)
  }

  const routePlanByDate = new Map((routePlans ?? []).map(rp => [rp.planned_date, rp]))

  // Group pending batches by date
  type RawStop = {
    storeId: string; storeName: string; address: string | null
    hours: Record<string, { open: string; close: string }> | null
    open247: boolean
    batchId: string; scheduledTime: string | null
    invoiceId: string | null; invoiceAmount: number | null; invoicePaid: boolean
  }
  const batchesByDate = new Map<string, RawStop[]>()
  for (const batch of pendingBatches ?? []) {
    const store = batch.store as unknown as { id: string; name: string; address: string | null; hours: Record<string, { open: string; close: string }> | null; open_247: boolean | null }
    const inv = latestInvoiceByStore.get(store.id)
    if (!batchesByDate.has(batch.delivery_date)) batchesByDate.set(batch.delivery_date, [])
    batchesByDate.get(batch.delivery_date)!.push({
      storeId: store.id,
      storeName: store.name,
      address: store.address,
      hours: store.hours,
      open247: store.open_247 ?? false,
      batchId: batch.id,
      scheduledTime: null,
      invoiceId: inv?.id ?? null,
      invoiceAmount: inv ? Number(inv.amount_due) : null,
      invoicePaid: !!inv?.paid_at,
    })
  }

  // Apply saved route plan ordering
  const routeDays: RouteDay[] = dates.map(date => {
    const rawStops = batchesByDate.get(date) ?? []
    const plan = routePlanByDate.get(date)

    let stops: RawStop[]
    if (plan) {
      const savedOrder = plan.stops as Array<{ store_id: string; scheduled_time: string | null }>
      const orderMap = new Map(savedOrder.map((s, i) => [s.store_id, { index: i, scheduledTime: s.scheduled_time }]))
      stops = [...rawStops]
        .sort((a, b) => (orderMap.get(a.storeId)?.index ?? 999) - (orderMap.get(b.storeId)?.index ?? 999))
        .map(s => ({ ...s, scheduledTime: orderMap.get(s.storeId)?.scheduledTime ?? null }))
    } else {
      stops = [...rawStops].sort((a, b) => {
        if (a.open247 !== b.open247) return a.open247 ? 1 : -1
        return a.storeName.localeCompare(b.storeName)
      })
    }

    return { date, stops, routePlanId: plan?.id }
  })

  return (
    <div>
      <div className="mb-8">
        <p className="text-xs tracking-widest uppercase mb-1" style={{ color: '#e63946' }}>Planning</p>
        <h1 className="text-2xl font-bold" style={{ color: '#0a0a0a', fontFamily: 'Georgia, serif' }}>Routes</h1>
        <p className="text-sm mt-1" style={{ color: '#555555' }}>
          {routeDays.length > 0
            ? `${routeDays.length} day${routeDays.length !== 1 ? 's' : ''} with pending deliveries`
            : 'No pending batches — schedule batches from a store page first'}
        </p>
      </div>
      <RoutesClient days={routeDays} />
    </div>
  )
}
