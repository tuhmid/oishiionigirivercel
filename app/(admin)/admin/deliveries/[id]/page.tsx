import { createClient } from '@/lib/supabase/server'
import BatchDetailClient from '@/components/admin/BatchDetailClient'
import { notFound } from 'next/navigation'

export default async function BatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: batch, error } = await supabase
    .from('batches')
    .select(`
      id, store_id, delivery_date, return_date, status, notes, created_at,
      store:stores(id, name, address, contacts:store_contacts(*)),
      items:batch_items(id, flavor_id, qty_delivered, qty_sold, flavor:flavors(id, name)),
      invoice:invoices(id, amount_due, paid_at, sent_at, sent_via)
    `)
    .eq('id', id)
    .maybeSingle()

  if (error || !batch) return notFound()

  // Supabase returns one-to-one relations as arrays — normalize invoice to single
  const normalized = {
    ...batch,
    invoice: Array.isArray(batch.invoice)
      ? (batch.invoice[0] ?? null)
      : (batch.invoice ?? null),
  }

  return <BatchDetailClient batch={normalized as never} />
}
