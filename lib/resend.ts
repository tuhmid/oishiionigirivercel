import { Resend } from 'resend'

const configured = !!(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL)
const resend = configured ? new Resend(process.env.RESEND_API_KEY!) : null
const FROM = process.env.RESEND_FROM_EMAIL ?? ''

const baseStyle = `font-family:sans-serif;max-width:600px;margin:0 auto;background:#faf8f3;color:#0a0a0a;padding:32px;border:1px solid #e2ddd0;`
const headStyle = `color:#1E3A1E;letter-spacing:0.15em;font-size:18px;font-weight:700;margin:0 0 4px;`
const mutedStyle = `color:#777777;font-size:13px;margin:0 0 24px;`
const tableStyle = `width:100%;border-collapse:collapse;margin:20px 0;font-size:14px;`
const thStyle = `text-align:left;padding:8px 0;border-bottom:2px solid #e2ddd0;color:#555555;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;`
const tdStyle = `padding:8px 0;border-bottom:1px solid #f0ece0;`
const totalStyle = `font-size:18px;font-weight:700;color:#1E3A1E;`

export async function sendOrderReceiptEmail({
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
  const totalUnits = items.reduce((s, i) => s + i.qty, 0)
  const rows = items
    .map(i => `<tr><td style="${tdStyle}">${i.flavor}</td><td style="${tdStyle}">${i.qty} units</td></tr>`)
    .join('')

  if (!configured || !resend) return null

  return resend.emails.send({
    from: FROM,
    to,
    subject: `Delivery Receipt — OISHII ONIGIRI · ${deliveryDate}`,
    html: `
      <div style="${baseStyle}">
        <h1 style="${headStyle}">OISHII ONIGIRI</h1>
        <p style="${mutedStyle}">Delivery Receipt</p>
        <p style="margin:0 0 4px;font-size:14px;">Store: <strong>${storeName}</strong></p>
        <p style="margin:0 0 24px;font-size:14px;color:#555555;">Delivery Date: ${deliveryDate}</p>
        <table style="${tableStyle}">
          <thead>
            <tr>
              <th style="${thStyle}">Flavor</th>
              <th style="${thStyle}">Qty on Consignment</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div style="padding-top:16px;border-top:2px solid #1E3A1E;display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:13px;color:#555555;">Total units delivered</span>
          <span style="${totalStyle}">${totalUnits} units</span>
        </div>
        <div style="margin-top:24px;padding:16px;background:#f0ece0;font-size:12px;color:#555555;">
          <strong>Consignment Terms:</strong> These items are delivered on consignment.
          You pay only for what you sell. Unsold items will be collected on the next delivery visit.
        </div>
        <p style="margin-top:24px;font-size:11px;color:#aaaaaa;">Receipt #${batchId.slice(0, 8).toUpperCase()} · 276 Chestnut St, Brooklyn NY 11208</p>
      </div>
    `,
  })
}

export async function sendInvoiceEmail({
  to,
  storeName,
  invoiceId,
  amountDue,
  items,
  deliveryDate,
}: {
  to: string
  storeName: string
  invoiceId: string
  amountDue: number
  items: { flavor: string; qty: number; price: number }[]
  deliveryDate: string
}) {
  const itemRows = items
    .map(i => `
      <tr>
        <td style="${tdStyle}">${i.flavor}</td>
        <td style="${tdStyle}">${i.qty}</td>
        <td style="${tdStyle}">$${i.price.toFixed(2)}</td>
        <td style="${tdStyle};font-weight:600;">$${(i.qty * i.price).toFixed(2)}</td>
      </tr>`)
    .join('')

  if (!configured || !resend) return null

  return resend.emails.send({
    from: FROM,
    to,
    subject: `Invoice from OISHII ONIGIRI — ${deliveryDate}`,
    html: `
      <div style="${baseStyle}">
        <h1 style="${headStyle}">OISHII ONIGIRI</h1>
        <p style="${mutedStyle}">Invoice</p>
        <p style="margin:0 0 4px;font-size:14px;">Store: <strong>${storeName}</strong></p>
        <p style="margin:0 0 24px;font-size:14px;color:#555555;">Delivery Date: ${deliveryDate}</p>
        <table style="${tableStyle}">
          <thead>
            <tr>
              <th style="${thStyle}">Flavor</th>
              <th style="${thStyle}">Qty Sold</th>
              <th style="${thStyle}">Unit Price</th>
              <th style="${thStyle}">Total</th>
            </tr>
          </thead>
          <tbody>${itemRows}</tbody>
        </table>
        <div style="padding-top:16px;border-top:2px solid #1E3A1E;text-align:right;">
          <span style="${totalStyle}">Amount Due: $${amountDue.toFixed(2)}</span>
        </div>
        <p style="margin-top:24px;font-size:11px;color:#aaaaaa;">Invoice #${invoiceId.slice(0, 8).toUpperCase()} · 276 Chestnut St, Brooklyn NY 11208</p>
      </div>
    `,
  })
}
