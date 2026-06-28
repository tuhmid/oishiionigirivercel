import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendOrderReceiptEmail } from '@/lib/resend'
import { sendOrderReceiptSMS } from '@/lib/twilio'

export async function POST(req: NextRequest) {
  try {
    const { batch_id } = await req.json()
    const supabase = await createClient()

    // Fetch batch with items, store, and default contact
    const { data: batch, error } = await supabase
      .from('batches')
      .select(`
        id, delivery_date,
        store:stores(id, name, contacts:store_contacts(*)),
        items:batch_items(qty_delivered, flavor:flavors(name))
      `)
      .eq('id', batch_id)
      .single()

    if (error || !batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
    }

    const store = batch.store as unknown as {
      id: string; name: string
      contacts: Array<{ id: string; name: string; phone: string | null; email: string | null; is_default: boolean }>
    }
    const items = (batch.items as unknown as { qty_delivered: number; flavor: { name: string } }[])
      .map(i => ({ flavor: i.flavor.name, qty: i.qty_delivered }))

    const defaultContact = store.contacts.find(c => c.is_default) ?? store.contacts[0]

    // Fire sends in background — never block delivery marking on email/SMS
    const sends: Promise<unknown>[] = []
    if (defaultContact?.email) {
      sends.push(sendOrderReceiptEmail({
        to: defaultContact.email,
        storeName: store.name,
        batchId: batch_id,
        deliveryDate: batch.delivery_date,
        items,
      }).catch(() => null))
    }
    if (defaultContact?.phone) {
      sends.push(sendOrderReceiptSMS({
        to: defaultContact.phone,
        storeName: store.name,
        batchId: batch_id,
        deliveryDate: batch.delivery_date,
        items,
      }).catch(() => null))
    }
    // Don't await sends — mark delivered regardless
    Promise.all(sends).catch(() => null)

    const { error: updateError } = await supabase
      .from('batches')
      .update({ status: 'delivered' })
      .eq('id', batch_id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, sent: sends.length > 0 })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
