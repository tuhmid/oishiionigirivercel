import { createClient } from '@/lib/supabase/server'
import type { Flavor } from '@/types'
import InventoryClient from '@/components/admin/InventoryClient'

export default async function InventoryPage() {
  const supabase = await createClient()
  const { data: flavors } = await supabase.from('flavors').select('*').order('sort_order')

  return (
    <div>
      <div className="mb-8">
        <p className="text-xs tracking-widest uppercase mb-1" style={{ color: '#e63946' }}>Management</p>
        <h1 className="text-2xl font-bold" style={{ color: '#0a0a0a', fontFamily: 'Georgia, serif' }}>Inventory</h1>
        <p className="text-sm mt-1" style={{ color: '#555555' }}>Manage flavors and availability</p>
      </div>
      <InventoryClient flavors={(flavors ?? []) as Flavor[]} />
    </div>
  )
}
