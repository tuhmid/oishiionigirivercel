import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { formatCurrency, formatDate, PAYMENT_LABELS } from '@/lib/utils'
import StoreDetailClient from '@/components/admin/StoreDetailClient'
import type { Store, StoreContact, Flavor, Batch } from '@/types'

export default async function StoreDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  if (id === 'new') {
    const supabase = await createClient()
    const { data: flavors } = await supabase.from('flavors').select('*').order('sort_order')
    return <StoreDetailClient store={null} flavors={(flavors ?? []) as Flavor[]} batches={[]} />
  }

  const supabase = await createClient()

  const [{ data: store }, { data: flavors }, { data: batches }] = await Promise.all([
    supabase
      .from('stores')
      .select(`
        *,
        contacts:store_contacts(*),
        allocations:store_flavor_allocations(id, flavor_id, default_qty)
      `)
      .eq('id', id)
      .single(),
    supabase.from('flavors').select('*').order('sort_order'),
    supabase
      .from('batches')
      .select(`
        *,
        items:batch_items(id, qty_delivered, qty_sold, flavor:flavors(id, name)),
        invoice:invoices(id, amount_due, paid_at, payment_method, sent_at)
      `)
      .eq('store_id', id)
      .order('delivery_date', { ascending: false }),
  ])

  if (!store) return notFound()

  // Fallback: pull cert/billing from original wholesale request if not on store record
  if (!store.resale_cert_url && !store.billable_name) {
    const { data: req } = await supabase
      .from('store_order_requests')
      .select('billable_name, billable_address, cert_authority_number, resale_cert_url')
      .ilike('store_name', store.name)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    if (req) {
      store.billable_name = req.billable_name
      store.billable_address = req.billable_address
      store.cert_authority_number = req.cert_authority_number
      store.resale_cert_url = req.resale_cert_url
    }
  }

  const normalizedBatches = (batches ?? []).map(b => ({
    ...b,
    invoice: Array.isArray(b.invoice) ? (b.invoice[0] ?? null) : b.invoice,
  }))

  const totalDeliveries = normalizedBatches.length
  const unpaid = normalizedBatches.reduce((s, b) => {
    const inv = b.invoice as { amount_due: number; paid_at: string | null } | null
    return s + (!inv?.paid_at ? Number(inv?.amount_due ?? 0) : 0)
  }, 0)

  // Schedule reminder: if delivery_days is set and the last pending batch is within 7 days
  const pendingBatches = normalizedBatches.filter(b => b.status === 'pending')
  const lastScheduledDate = pendingBatches.reduce((max, b) => b.delivery_date > max ? b.delivery_date : max, '')
  const today = new Date().toISOString().slice(0, 10)
  const daysUntilLast = lastScheduledDate
    ? Math.floor((new Date(lastScheduledDate + 'T00:00:00').getTime() - new Date(today + 'T00:00:00').getTime()) / 86400000)
    : -1
  const scheduleReminder = (store.delivery_days?.length ?? 0) > 0 && daysUntilLast >= 0 && daysUntilLast <= 7

  return (
    <div>
      <div className="mb-8">
        <p className="text-xs tracking-widest uppercase mb-1" style={{ color: '#e63946' }}>Store</p>
        <h1 className="text-2xl font-bold" style={{ color: '#0a0a0a', fontFamily: 'Georgia, serif' }}>
          {store.name}
        </h1>
        <p className="text-sm mt-1" style={{ color: '#555555' }}>{store.address}</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-px mb-8" style={{ background: '#e2ddd0' }}>
        {[
          { label: 'Total Deliveries', value: totalDeliveries },
          { label: 'Unpaid', value: formatCurrency(unpaid) },
          { label: 'Payment Method', value: store.preferred_payment_method ? PAYMENT_LABELS[store.preferred_payment_method] : '—' },
        ].map(({ label, value }) => (
          <div key={label} className="p-5" style={{ background: '#ffffff' }}>
            <p className="text-xl font-bold mb-1" style={{ color: '#0a0a0a' }}>{value}</p>
            <p className="text-xs" style={{ color: '#555555' }}>{label}</p>
          </div>
        ))}
      </div>

      <StoreDetailClient
        store={store as unknown as Store & { contacts: StoreContact[] }}
        flavors={(flavors ?? []) as Flavor[]}
        batches={normalizedBatches as unknown as Batch[]}
        scheduleReminder={scheduleReminder}
        lastScheduledDate={lastScheduledDate || undefined}
      />

      {/* Batch history */}
      <div className="mt-8" style={{ border: '1px solid #e2ddd0' }}>
        <div className="px-5 py-4" style={{ borderBottom: '1px solid #e2ddd0' }}>
          <p className="text-xs tracking-widest uppercase font-semibold" style={{ color: '#0a0a0a' }}>Batch History</p>
        </div>
        {normalizedBatches.map(batch => {
          const inv = batch.invoice as { amount_due: number; paid_at: string | null } | null
          return (
            <div key={batch.id} className="px-5 py-4" style={{ borderBottom: '1px solid #f0ece0' }}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium" style={{ color: '#0a0a0a' }}>{formatDate(batch.delivery_date)}</p>
                <div className="flex items-center gap-3">
                  {inv && (
                    <span className="text-sm font-semibold" style={{ color: inv.paid_at ? '#2a7a2a' : '#e63946' }}>
                      {inv.paid_at ? 'Paid' : `${formatCurrency(Number(inv.amount_due))} due`}
                    </span>
                  )}
                  <span className="text-xs px-2 py-0.5 rounded-sm" style={{ background: '#e2ddd0', color: '#777777' }}>
                    {batch.status}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {(batch.items as { id: string; qty_delivered: number; qty_sold: number | null; flavor: { name: string } }[])?.map(item => (
                  <span key={item.id} className="text-xs px-2 py-1" style={{ background: '#faf8f3', color: '#555555', border: '1px solid #e2ddd0' }}>
                    {item.flavor?.name}: {item.qty_sold ?? item.qty_delivered} / {item.qty_delivered}
                  </span>
                ))}
              </div>
            </div>
          )
        })}
        {normalizedBatches.length === 0 && (
          <p className="px-5 py-6 text-sm" style={{ color: '#666666' }}>No deliveries yet</p>
        )}
      </div>
    </div>
  )
}
