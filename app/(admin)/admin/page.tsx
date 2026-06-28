import { createClient } from '@/lib/supabase/server'
import { formatCurrency, formatDate } from '@/lib/utils'
import Link from 'next/link'
import { Package, Truck, AlertCircle, DollarSign } from 'lucide-react'

export default async function AdminDashboard() {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const [
    { data: todayBatches },
    { data: unpaidInvoices },
    { data: lowStock },
    { data: newRequests },
    { data: recentOrders, error: ordersError },
  ] = await Promise.all([
    supabase
      .from('batches')
      .select('id, status, delivery_date, store:stores(name)')
      .eq('delivery_date', today)
      .order('created_at', { ascending: false }),
    supabase
      .from('invoices')
      .select('id, amount_due, created_at, store:stores(name)')
      .is('paid_at', null)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('flavors')
      .select('id, name')
      .eq('in_stock', false),
    supabase
      .from('store_order_requests')
      .select('id, store_name, contact_name, phone, created_at')
      .eq('status', 'new')
      .order('created_at', { ascending: false }),
    supabase
      .from('batches')
      .select('id, delivery_date, status, created_at, store:stores(name)')
      .order('created_at', { ascending: false })
      .limit(6),
  ])

  const unpaidTotal = (unpaidInvoices ?? []).reduce((s, i) => s + Number(i.amount_due), 0)

  return (
    <div>
      <div className="mb-8">
        <p className="text-xs tracking-widest uppercase mb-1" style={{ color: '#e63946' }}>Overview</p>
        <h1 className="text-2xl font-bold" style={{ color: '#0a0a0a', fontFamily: 'Georgia, serif' }}>Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: '#555555' }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px mb-10" style={{ background: '#e2ddd0' }}>
        {[
          { label: "Today's Deliveries", value: todayBatches?.length ?? 0, icon: Truck, href: '/admin/deliveries' },
          { label: 'Unpaid Invoices', value: unpaidInvoices?.length ?? 0, icon: DollarSign, href: '/admin/invoices', sub: unpaidTotal > 0 ? `${formatCurrency(unpaidTotal)} outstanding` : undefined },
          { label: 'Out of Stock', value: lowStock?.length ?? 0, icon: Package, href: '/admin/inventory', alert: (lowStock?.length ?? 0) > 0 },
          { label: 'New Store Requests', value: newRequests?.length ?? 0, icon: AlertCircle, href: '/admin/stores', alert: (newRequests?.length ?? 0) > 0 },
        ].map(({ label, value, icon: Icon, href, sub, alert }) => (
          <Link key={label} href={href} className="flex flex-col p-6 transition-colors hover:bg-[#f5f0e6]" style={{ background: '#ffffff' }}>
            <div className="flex items-center justify-between mb-4">
              <Icon size={16} style={{ color: alert ? '#e63946' : '#666666' }} />
              {alert && <span className="w-2 h-2 rounded-full" style={{ background: '#e63946' }} />}
            </div>
            <p className="text-3xl font-bold mb-1" style={{ color: alert ? '#e63946' : '#0a0a0a' }}>{value}</p>
            <p className="text-xs" style={{ color: '#555555' }}>{label}</p>
            {sub && <p className="text-xs mt-1" style={{ color: '#666666' }}>{sub}</p>}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's deliveries */}
        <div style={{ border: '1px solid #e2ddd0' }}>
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #e2ddd0' }}>
            <p className="text-xs tracking-widest uppercase font-semibold" style={{ color: '#0a0a0a' }}>Today&apos;s Deliveries</p>
            <Link href="/admin/deliveries" className="text-xs" style={{ color: '#e63946' }}>View all →</Link>
          </div>
          {(todayBatches?.length ?? 0) === 0 ? (
            <p className="px-5 py-6 text-sm" style={{ color: '#666666' }}>No deliveries today</p>
          ) : (
            <div>
              {todayBatches!.map(b => (
                <Link key={b.id} href={`/admin/deliveries/${b.id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-[#f5f0e6] transition-colors"
                  style={{ borderBottom: '1px solid #f0ece0' }}>
                  <p className="text-sm" style={{ color: '#0a0a0a' }}>{(b.store as unknown as { name: string })?.name}</p>
                  <span className="text-xs px-2 py-0.5 rounded-sm"
                    style={{ background: b.status === 'delivered' ? '#e4f0e4' : '#e8eaf5', color: b.status === 'delivered' ? '#2a7a2a' : '#4a5a9a' }}>
                    {b.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Unpaid invoices */}
        <div style={{ border: '1px solid #e2ddd0' }}>
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #e2ddd0' }}>
            <p className="text-xs tracking-widest uppercase font-semibold" style={{ color: '#0a0a0a' }}>Unpaid Invoices</p>
            <Link href="/admin/invoices" className="text-xs" style={{ color: '#e63946' }}>View all →</Link>
          </div>
          {(unpaidInvoices?.length ?? 0) === 0 ? (
            <p className="px-5 py-6 text-sm" style={{ color: '#666666' }}>All invoices paid</p>
          ) : (
            <div>
              {unpaidInvoices!.map(inv => (
                <div key={inv.id} className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid #f0ece0' }}>
                  <div>
                    <p className="text-sm" style={{ color: '#0a0a0a' }}>{(inv.store as unknown as { name: string })?.name}</p>
                    <p className="text-xs" style={{ color: '#555555' }}>{formatDate(inv.created_at)}</p>
                  </div>
                  <span className="text-sm font-semibold" style={{ color: '#e63946' }}>{formatCurrency(Number(inv.amount_due))}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent wholesale orders */}
        <div style={{ border: '1px solid #e2ddd0' }}>
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #e2ddd0' }}>
            <p className="text-xs tracking-widest uppercase font-semibold" style={{ color: '#0a0a0a' }}>Recent Wholesale Orders</p>
            <Link href="/admin/deliveries" className="text-xs" style={{ color: '#e63946' }}>View all →</Link>
          </div>
          {ordersError ? (
            <p className="px-5 py-6 text-sm font-mono" style={{ color: '#e63946' }}>{ordersError.message}</p>
          ) : (recentOrders?.length ?? 0) === 0 ? (
            <p className="px-5 py-6 text-sm" style={{ color: '#666666' }}>No batches yet</p>
          ) : (
            <div>
              {recentOrders!.map(o => {
                const storeName = (o.store as unknown as { name: string })?.name
                const statusColors: Record<string, string> = {
                  pending: '#4a5a9a', delivered: '#8a7020', returned: '#4a6a9a', invoiced: '#2a7a2a', paid: '#1a7a1a',
                }
                return (
                  <Link
                    key={o.id}
                    href={`/admin/deliveries/${o.id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-[#f5f0e6] transition-colors"
                    style={{ borderBottom: '1px solid #f0ece0' }}
                  >
                    <div>
                      <p className="text-sm" style={{ color: '#0a0a0a' }}>{storeName}</p>
                      <p className="text-xs mt-0.5" style={{ color: '#555555' }}>{formatDate(o.delivery_date)}</p>
                    </div>
                    <span className="text-xs font-semibold" style={{ color: statusColors[o.status] ?? '#666666' }}>
                      {o.status}
                    </span>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* New store requests */}
        {(newRequests?.length ?? 0) > 0 && (
          <div style={{ border: '1px solid #e63946' }}>
            <div className="px-5 py-4" style={{ borderBottom: '1px solid #f5e4e4' }}>
              <p className="text-xs tracking-widest uppercase font-semibold" style={{ color: '#e63946' }}>New Store Requests</p>
            </div>
            {newRequests!.map(r => (
              <Link key={r.id} href={`/admin/stores/requests/${r.id}`}
                className="flex items-center justify-between px-5 py-3 hover:bg-[#fce8e8] transition-colors"
                style={{ borderBottom: '1px solid #fce8e8' }}>
                <div>
                  <p className="text-sm" style={{ color: '#0a0a0a' }}>{r.store_name}</p>
                  <p className="text-xs" style={{ color: '#555555' }}>{r.contact_name} · {r.phone}</p>
                </div>
                <span className="text-xs" style={{ color: '#e63946' }}>Review →</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
