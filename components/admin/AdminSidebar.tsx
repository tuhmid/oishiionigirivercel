'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard, Store, Truck, Package, FileText, Map, LogOut, ChevronRight,
} from 'lucide-react'

const nav = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/stores', label: 'Stores', icon: Store },
  { href: '/admin/deliveries', label: 'Deliveries', icon: Truck },
  { href: '/admin/inventory', label: 'Inventory', icon: Package },
  { href: '/admin/invoices', label: 'Invoices', icon: FileText },
  { href: '/admin/routes', label: 'Routes', icon: Map },
]

export default function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside
      className="w-56 flex flex-col py-8 px-4 shrink-0"
      style={{ background: '#ffffff', borderRight: '1px solid #e2ddd0' }}
    >
      {/* Brand */}
      <div className="px-2 mb-10">
        <p className="text-xs font-bold tracking-[0.3em] uppercase" style={{ color: '#e63946' }}>
          OISHII
        </p>
        <p className="text-xs font-bold tracking-[0.3em] uppercase mt-0.5" style={{ color: '#0a0a0a' }}>
          ONIGIRI
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col gap-1">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/admin' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm transition-colors duration-150 group"
              style={{
                background: active ? '#f0ece0' : 'transparent',
                color: active ? '#0a0a0a' : '#555555',
              }}
            >
              <Icon size={15} />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight size={12} style={{ color: '#e63946' }} />}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="flex items-center gap-3 px-3 py-2.5 text-sm transition-colors mt-4"
        style={{ color: '#666666' }}
        onMouseEnter={e => (e.currentTarget.style.color = '#e63946')}
        onMouseLeave={e => (e.currentTarget.style.color = '#666666')}
      >
        <LogOut size={15} />
        <span>Sign Out</span>
      </button>
    </aside>
  )
}
