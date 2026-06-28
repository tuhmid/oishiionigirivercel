import { NextRequest, NextResponse } from 'next/server'
import { WebhooksHelper } from 'square'
import { squareClient } from '@/lib/square'
import { createClient } from '@/lib/supabase/server'
import { RETAIL_PRICE } from '@/lib/pricing'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signatureHeader = req.headers.get('x-square-hmacsha256-signature') ?? ''
  const notificationUrl = `${process.env.NEXT_PUBLIC_URL}/api/square/webhook`

  const isValid = await WebhooksHelper.verifySignature({
    requestBody: body,
    signatureHeader,
    signatureKey: process.env.SQUARE_WEBHOOK_SIGNATURE_KEY!,
    notificationUrl,
  })

  if (!isValid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const event = JSON.parse(body)

  if (event.type === 'payment.completed') {
    const payment = event.data?.object?.payment
    if (!payment) return NextResponse.json({ received: true })

    const squareOrderId: string = payment.order_id
    const squarePaymentId: string = payment.id
    const amountTotal = Number(payment.amount_money?.amount ?? 0) / 100
    const buyerEmail: string = payment.buyer_email_address ?? ''

    // Fetch the Square order to get line items + metadata
    const orderResult = await squareClient.orders.get({ orderId: squareOrderId })
    const squareOrder = orderResult.order
    const meta = squareOrder?.metadata ?? {}

    const supabase = await createClient()

    const { data: order, error } = await supabase
      .from('consumer_orders')
      .insert({
        customer_name: meta.customer_name || 'Guest',
        customer_email: meta.customer_email || buyerEmail || null,
        customer_phone: meta.customer_phone || null,
        type: meta.type || 'pickup',
        delivery_address: meta.delivery_address || null,
        notes: meta.notes || null,
        status: 'confirmed',
        square_payment_id: squarePaymentId,
        square_order_id: squareOrderId,
        total_amount: amountTotal,
      })
      .select()
      .single()

    if (error || !order) return NextResponse.json({ error: 'DB error' }, { status: 500 })

    const lineItems = squareOrder?.lineItems ?? []
    for (const item of lineItems) {
      const flavorName = item.name?.replace('OISHII ONIGIRI — ', '') ?? ''
      const { data: flavor } = await supabase
        .from('flavors')
        .select('id')
        .ilike('name', flavorName)
        .single()

      if (flavor) {
        await supabase.from('consumer_order_items').insert({
          order_id: order.id,
          flavor_id: flavor.id,
          quantity: Number(item.quantity ?? 1),
          price_at_time: RETAIL_PRICE,
        })
      }
    }
  }

  return NextResponse.json({ received: true })
}
