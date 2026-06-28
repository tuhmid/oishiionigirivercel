import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendInvoiceEmail } from '@/lib/resend'
import { sendInvoiceSMS } from '@/lib/twilio'
import { WHOLESALE_PRICE } from '@/lib/pricing'

export async function POST(req: NextRequest) {
  try {
    const { invoice_id, contact_id, via } = await req.json()
    const supabase = await createClient()

    // Fetch invoice with related data
    const { data: invoice } = await supabase
      .from('invoices')
      .select(`
        *,
        store:stores(name),
        batch:batches(delivery_date),
        items:batch_items(qty_sold, flavor:flavors(name))
      `)
      .eq('id', invoice_id)
      .single()

    if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

    const { data: contact } = await supabase
      .from('store_contacts')
      .select('*')
      .eq('id', contact_id)
      .single()

    if (!contact) return NextResponse.json({ error: 'Contact not found' }, { status: 404 })

    const storeName = invoice.store?.name ?? 'Store'
    const deliveryDate = invoice.batch?.delivery_date ?? ''
    const items = (invoice.items ?? [])
      .filter((i: { qty_sold: number | null }) => i.qty_sold !== null && i.qty_sold > 0)
      .map((i: { qty_sold: number; flavor: { name: string } }) => ({
        flavor: i.flavor?.name ?? '',
        qty: i.qty_sold,
        price: WHOLESALE_PRICE,
      }))

    if (via === 'email') {
      if (!contact.email) return NextResponse.json({ error: 'No email for this contact' }, { status: 400 })
      await sendInvoiceEmail({
        to: contact.email,
        storeName,
        invoiceId: invoice_id,
        amountDue: Number(invoice.amount_due),
        items,
        deliveryDate,
      })
    } else if (via === 'sms') {
      if (!contact.phone) return NextResponse.json({ error: 'No phone for this contact' }, { status: 400 })
      await sendInvoiceSMS({
        to: contact.phone,
        storeName,
        invoiceId: invoice_id,
        amountDue: Number(invoice.amount_due),
        deliveryDate,
      })
    }

    await supabase
      .from('invoices')
      .update({ sent_via: via, sent_to_contact_id: contact_id, sent_at: new Date().toISOString() })
      .eq('id', invoice_id)

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
