import { NextRequest, NextResponse } from 'next/server'
import { SquareClient, SquareEnvironment } from 'square'
import { createClient } from '@/lib/supabase/server'
import { randomUUID } from 'crypto'
import { RETAIL_PRICE } from '@/lib/pricing'

export async function POST(req: NextRequest) {
  try {
    const squareClient = new SquareClient({
      token: process.env.SQUARE_ACCESS_TOKEN!,
      environment: process.env.SQUARE_ENVIRONMENT === 'production'
        ? SquareEnvironment.Production
        : SquareEnvironment.Sandbox,
    })
    const body = await req.json()
    const { customer_name, customer_email, customer_phone, type, delivery_address, notes, tip_amount, items } = body

    const supabase = await createClient()

    const flavorIds = items.map((i: { flavor_id: string }) => i.flavor_id)
    const { data: flavors } = await supabase
      .from('flavors')
      .select('id, name')
      .in('id', flavorIds)

    if (!flavors) return NextResponse.json({ error: 'Failed to fetch flavors' }, { status: 500 })

    const flavorMap = Object.fromEntries(flavors.map((f) => [f.id, f]))

    const lineItems = items.map((item: { flavor_id: string; quantity: number }) => ({
      name: `OISHII ONIGIRI — ${flavorMap[item.flavor_id]?.name ?? 'Onigiri'}`,
      quantity: String(item.quantity),
      basePriceMoney: {
        amount: BigInt(Math.round(RETAIL_PRICE * 100)),
        currency: 'USD',
      },
    }))

    if (tip_amount && tip_amount > 0) {
      lineItems.push({
        name: 'Tip',
        quantity: '1',
        basePriceMoney: {
          amount: BigInt(Math.round(tip_amount * 100)),
          currency: 'USD',
        },
      })
    }

    const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_URL

    const result = await squareClient.checkout.paymentLinks.create({
      idempotencyKey: randomUUID(),
      order: {
        locationId: process.env.SQUARE_LOCATION_ID!,
        lineItems,
        metadata: Object.fromEntries(
          Object.entries({
            customer_name: customer_name || null,
            customer_phone: customer_phone || null,
            type: type || 'pickup',
            delivery_address: delivery_address || null,
            notes: notes || null,
            customer_email: customer_email || null,
          }).filter(([, v]) => v !== null)
        ),
      },
      checkoutOptions: {
        redirectUrl: `${origin}/order/success`,
        askForShippingAddress: false,
      },
      prePopulatedData: {
        ...(customer_email ? { buyerEmail: customer_email } : {}),
        ...(customer_phone ? { buyerPhoneNumber: customer_phone } : {}),
        ...(customer_name ? {
          buyerAddress: {
            firstName: customer_name.split(' ').slice(0, -1).join(' ') || customer_name,
            lastName: customer_name.split(' ').slice(-1)[0] || '',
          },
        } : {}),
      },
    })

    const url = result.paymentLink?.url
    if (!url) return NextResponse.json({ error: 'Square did not return a checkout URL' }, { status: 500 })

    return NextResponse.json({ url })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
