import { createClient } from '@/lib/supabase/server'
import InvoicesClient from '@/components/admin/InvoicesClient'

export default async function InvoicesPage() {
  const supabase = await createClient()

  const { data: invoices } = await supabase
    .from('invoices')
    .select(`
      id, amount_due, amount_paid, payment_method, paid_at,
      sent_via, sent_at, created_at,
      store:stores(id, name, preferred_payment_method, contacts:store_contacts(*)),
      batch:batches(id, delivery_date, items:batch_items(qty_sold, flavor:flavors(name)))
    `)
    .order('created_at', { ascending: false })

  const normalized = (invoices ?? []).map(inv => ({
    ...inv,
    batch: Array.isArray(inv.batch) ? inv.batch[0] : inv.batch,
  }))

  return (
    <div>
      <div className="mb-8">
        <p className="text-xs tracking-widest uppercase mb-1" style={{ color: '#e63946' }}>Management</p>
        <h1 className="text-2xl font-bold" style={{ color: '#0a0a0a', fontFamily: 'Georgia, serif' }}>Invoices</h1>
      </div>
      <InvoicesClient invoices={normalized as never} />
    </div>
  )
}
