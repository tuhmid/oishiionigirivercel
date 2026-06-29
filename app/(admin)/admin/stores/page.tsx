import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, ChevronRight } from 'lucide-react'
import { PAYMENT_LABELS } from '@/lib/utils'
import DeleteStoreButton from './_components/DeleteStoreButton'

export default async function StoresPage() {
  const supabase = await createClient()

  const [{ data: stores }, { data: requests }] = await Promise.all([
    supabase
      .from('stores')
      .select('id, name, address, preferred_payment_method, active, contacts:store_contacts(id)')
      .order('name'),
    supabase
      .from('store_order_requests')
      .select('id, store_name, contact_name, phone')
      .eq('status', 'new')
      .order('created_at', { ascending: false }),
  ])

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-xs tracking-widest uppercase mb-1" style={{ color: '#e63946' }}>Management</p>
          <h1 className="text-2xl font-bold" style={{ color: '#0a0a0a', fontFamily: 'Georgia, serif' }}>Stores</h1>
        </div>
        <Link
          href="/admin/stores/new"
          className="flex items-center gap-2 px-4 py-2 text-xs tracking-widest uppercase font-semibold"
          style={{ background: '#e63946', color: '#ffffff' }}
        >
          <Plus size={14} /> Add Store
        </Link>
      </div>

      {/* New requests banner */}
      {(requests?.length ?? 0) > 0 && (
        <div className="mb-6 p-4" style={{ background: '#fce8e8', border: '1px solid #f5e4e4' }}>
          <p className="text-xs font-semibold mb-3" style={{ color: '#e63946' }}>
            {requests!.length} new wholesale inquiry{requests!.length > 1 ? 'ies' : ''}
          </p>
          <div className="space-y-2">
            {requests!.map(r => (
              <div key={r.id} className="flex items-center justify-between">
                <div>
                  <span className="text-sm" style={{ color: '#0a0a0a' }}>{r.store_name}</span>
                  <span className="text-xs ml-3" style={{ color: '#555555' }}>
                    {r.contact_name} · {r.phone}
                  </span>
                </div>
                <Link href={`/admin/stores/requests/${r.id}`} className="text-xs" style={{ color: '#e63946' }}>
                  Review →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Store list */}
      <div style={{ border: '1px solid #e2ddd0' }}>
        <div
          className="grid text-xs tracking-widest uppercase px-5 py-3"
          style={{ gridTemplateColumns: '2fr 2fr 1fr 1fr 40px 40px', color: '#666666', borderBottom: '1px solid #e2ddd0' }}
        >
          <span>Store</span>
          <span>Address</span>
          <span>Payment</span>
          <span>Status</span>
          <span />
          <span />
        </div>
        {stores?.map(store => (
          <div
            key={store.id}
            className="grid items-center px-5 py-4"
            style={{ gridTemplateColumns: '2fr 2fr 1fr 1fr 40px 40px', borderBottom: '1px solid #f0ece0', background: '#ffffff' }}
          >
            <Link href={`/admin/stores/${store.id}`} className="text-sm font-medium hover:underline" style={{ color: '#0a0a0a' }}>{store.name}</Link>
            <span className="text-xs" style={{ color: '#555555' }}>{store.address ?? '—'}</span>
            <span className="text-xs" style={{ color: '#777777' }}>
              {store.preferred_payment_method ? PAYMENT_LABELS[store.preferred_payment_method] : '—'}
            </span>
            <span className="text-xs flex items-center gap-2" style={{ color: store.active ? '#2a7a2a' : '#999999' }}>
              {store.active ? 'Active' : 'Inactive'}
              {(store as typeof store & { open_247?: boolean }).open_247 && (
                <span className="text-xs font-bold px-1.5 py-0.5" style={{ background: '#e63946', color: '#fff', letterSpacing: '0.05em', lineHeight: 1 }}>24/7</span>
              )}
            </span>
            <Link href={`/admin/stores/${store.id}`}><ChevronRight size={14} style={{ color: '#c8c4b8' }} /></Link>
            <DeleteStoreButton storeId={store.id} storeName={store.name} />
          </div>
        ))}
        {(stores?.length ?? 0) === 0 && (
          <p className="px-5 py-8 text-sm" style={{ color: '#666666' }}>No stores yet. Add your first store.</p>
        )}
      </div>
    </div>
  )
}
