import twilio from 'twilio'

const configured = !!(
  process.env.TWILIO_ACCOUNT_SID &&
  process.env.TWILIO_AUTH_TOKEN &&
  process.env.TWILIO_PHONE_NUMBER
)

const client = configured
  ? twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!)
  : null

const FROM = process.env.TWILIO_PHONE_NUMBER

export async function sendOrderReceiptSMS({
  to,
  storeName,
  batchId,
  deliveryDate,
  items,
}: {
  to: string
  storeName: string
  batchId: string
  deliveryDate: string
  items: { flavor: string; qty: number }[]
}) {
  if (!configured || !client) return null

  const lines = [
    `OISHII ONIGIRI — Delivery Receipt`,
    `Store: ${storeName}`,
    `Date: ${deliveryDate}`,
    `Receipt #${batchId.slice(0, 8).toUpperCase()}`,
    ``,
    ...items.map(i => `• ${i.flavor}: ${i.qty} units`),
    ``,
    `Total: ${items.reduce((s, i) => s + i.qty, 0)} units on consignment`,
    `Pay only for what you sell. We'll collect unsold items on our next visit.`,
  ]

  return client.messages.create({ from: FROM!, to, body: lines.join('\n') })
}

export async function sendInvoiceSMS({
  to,
  storeName,
  invoiceId,
  amountDue,
  deliveryDate,
}: {
  to: string
  storeName: string
  invoiceId: string
  amountDue: number
  deliveryDate: string
}) {
  if (!configured || !client) return null

  return client.messages.create({
    from: FROM!,
    to,
    body: [
      `OISHII ONIGIRI — Invoice`,
      `Store: ${storeName}`,
      `Delivery: ${deliveryDate}`,
      `Amount Due: $${amountDue.toFixed(2)}`,
      `Invoice #${invoiceId.slice(0, 8).toUpperCase()}`,
      `Thank you!`,
    ].join('\n'),
  })
}
