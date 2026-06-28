import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { WHOLESALE_PRICE } from '@/lib/pricing'
import PrintButton from '@/components/admin/PrintButton'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Delivery Receipt' }

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: batch } = await supabase
    .from('batches')
    .select(`
      id, delivery_date, status, notes,
      store:stores(name, address),
      items:batch_items(qty_delivered, flavor:flavors(name))
    `)
    .eq('id', id)
    .maybeSingle()

  if (!batch) return notFound()

  const store = batch.store as unknown as { name: string; address: string | null }
  const items = batch.items as unknown as { qty_delivered: number; flavor: { name: string } }[]
  const totalUnits = items.reduce((s, i) => s + i.qty_delivered, 0)
  const receiptNum = id.slice(0, 8).toUpperCase()

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
          max-width: 420px;
        }
        .r-brand { font-size: 20px; font-weight: bold; letter-spacing: 0.15em; border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 16px; }
        .r-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #666; margin-bottom: 2px; }
        .r-value { font-size: 14px; margin-bottom: 12px; }
        .r-divider { border: none; border-top: 1px dashed #000; margin: 16px 0; }
        .r-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .r-table th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; padding-bottom: 8px; border-bottom: 1px solid #000; }
        .r-table th:last-child { text-align: right; }
        .r-table td { padding: 6px 0; border-bottom: 1px dashed #eee; }
        .r-table td:last-child { text-align: right; }
        .r-total td { font-weight: bold; border-top: 2px solid #000 !important; border-bottom: none !important; padding-top: 10px; }
        .r-consignment { font-size: 11px; border: 1px solid #000; padding: 10px; margin-top: 16px; line-height: 1.6; }
        .r-sig { margin-top: 32px; }
        .r-sig-line { border-top: 1px solid #000; margin-bottom: 4px; }
        .r-footer { font-size: 10px; text-align: center; color: #555; margin-top: 24px; line-height: 1.8; }
      `}</style>

      <div className="receipt-root">
        <div className="r-brand">OISHII ONIGIRI</div>

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

        <p className="r-label">Receipt #</p>
        <p className="r-value">{receiptNum}</p>

        <hr className="r-divider" />

        <table className="r-table">
          <thead>
            <tr>
              <th>Flavor</th>
              <th style={{ textAlign: 'right' }}>Qty</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i}>
                <td>{item.flavor.name}</td>
                <td style={{ textAlign: 'right' }}>{item.qty_delivered}</td>
              </tr>
            ))}
            <tr className="r-total">
              <td>TOTAL UNITS</td>
              <td style={{ textAlign: 'right' }}>{totalUnits}</td>
            </tr>
          </tbody>
        </table>

        <div className="r-consignment">
          <strong>CONSIGNMENT TERMS</strong><br />
          Items above are delivered on consignment. You pay only for what you sell.
          Unsold items will be collected on the next delivery visit.<br /><br />
          Unit price: ${WHOLESALE_PRICE.toFixed(2)} each
        </div>

        <div className="r-sig">
          <div className="r-sig-line" />
          <p className="r-label">Store Signature / Date</p>
        </div>

        <div className="r-sig" style={{ marginTop: 24 }}>
          <div className="r-sig-line" />
          <p className="r-label">Driver Signature</p>
        </div>

        <div className="r-footer">
          OISHII ONIGIRI · Brooklyn, NY<br />
          oishiionigiri.com · Pay for what you sell!
        </div>

        <div className="receipt-no-print" style={{ marginTop: 32 }}>
          <PrintButton />
        </div>
      </div>
    </>
  )
}
