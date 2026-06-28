import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { WHOLESALE_PRICE } from '@/lib/pricing'
import PrintButton from '@/components/admin/PrintButton'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Invoice' }

export default async function InvoicePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: invoice } = await supabase
    .from('invoices')
    .select(`
      id, amount_due, amount_paid, payment_method, paid_at,
      store:stores(name, address, preferred_payment_method),
      batch:batches(id, delivery_date, items:batch_items(qty_sold, qty_delivered, flavor:flavors(name)))
    `)
    .eq('id', id)
    .maybeSingle()

  if (!invoice) return notFound()

  const store = invoice.store as unknown as { name: string; address: string | null; preferred_payment_method: string | null }
  const batch = invoice.batch as unknown as {
    delivery_date: string
    items: { qty_sold: number | null; qty_delivered: number; flavor: { name: string } }[]
  }
  const lineItems = batch.items.filter(i => (i.qty_sold ?? 0) > 0)
  const invoiceNum = id.slice(0, 8).toUpperCase()

  return (
    <>
      <style>{`
        @media print {
          .admin-layout-wrap { display: none !important; }
          .receipt-no-print { display: none !important; }
          .receipt-root { margin: 0; padding: 16px; }
        }
        .receipt-root {
          font-family: 'Courier New', monospace;
          color: #000;
          padding: 32px;
          max-width: 480px;
        }
        .r-brand { font-size: 20px; font-weight: bold; letter-spacing: 0.15em; border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 16px; }
        .r-type { font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 20px; }
        .r-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #666; margin-bottom: 2px; }
        .r-value { font-size: 14px; margin-bottom: 12px; }
        .r-divider { border: none; border-top: 1px dashed #000; margin: 16px 0; }
        .r-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .r-table th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; padding-bottom: 8px; border-bottom: 1px solid #000; }
        .r-table th.right { text-align: right; }
        .r-table td { padding: 6px 0; border-bottom: 1px dashed #eee; }
        .r-table td.right { text-align: right; }
        .r-total td { font-weight: bold; border-top: 2px solid #000 !important; border-bottom: none !important; padding-top: 10px; }
        .r-badge { display: inline-block; padding: 4px 10px; font-size: 11px; font-weight: bold; letter-spacing: 0.1em; }
        .r-paid { background: #e4f0e4; color: #1a7a1a; }
        .r-unpaid { background: #f5e4e4; color: #8a0000; }
        .r-payment-box { border: 1px solid #000; padding: 10px; margin-top: 16px; font-size: 11px; }
        .r-footer { font-size: 10px; text-align: center; color: #555; margin-top: 24px; line-height: 1.8; }
      `}</style>

      <div className="receipt-root">
        <div className="r-brand">OISHII ONIGIRI</div>
        <p className="r-type">Invoice</p>

        <p className="r-label">Store</p>
        <p className="r-value">{store.name}</p>

        {store.address && (
          <>
            <p className="r-label">Address</p>
            <p className="r-value">{store.address}</p>
          </>
        )}

        <p className="r-label">Delivery Date</p>
        <p className="r-value">{batch.delivery_date}</p>

        <p className="r-label">Invoice #</p>
        <p className="r-value">{invoiceNum}</p>

        <p className="r-label">Status</p>
        <p className="r-value">
          <span className={`r-badge ${invoice.paid_at ? 'r-paid' : 'r-unpaid'}`}>
            {invoice.paid_at ? 'PAID' : 'UNPAID'}
          </span>
        </p>

        <hr className="r-divider" />

        <table className="r-table">
          <thead>
            <tr>
              <th>Flavor</th>
              <th>Qty</th>
              <th className="right">Unit</th>
              <th className="right">Total</th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map((item, i) => (
              <tr key={i}>
                <td>{item.flavor.name}</td>
                <td>{item.qty_sold}</td>
                <td className="right">${WHOLESALE_PRICE.toFixed(2)}</td>
                <td className="right">${((item.qty_sold ?? 0) * WHOLESALE_PRICE).toFixed(2)}</td>
              </tr>
            ))}
            <tr className="r-total">
              <td colSpan={3}>Amount Due</td>
              <td className="right">${Number(invoice.amount_due).toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        {!invoice.paid_at && store.preferred_payment_method && (
          <div className="r-payment-box">
            Preferred payment: <strong style={{ textTransform: 'uppercase' }}>{store.preferred_payment_method}</strong>
          </div>
        )}

        <div className="r-footer">
          OISHII ONIGIRI · Brooklyn, NY<br />
          oishiionigiri.com · Thank you!
        </div>

        <div className="receipt-no-print" style={{ marginTop: 32 }}>
          <PrintButton />
        </div>
      </div>
    </>
  )
}
