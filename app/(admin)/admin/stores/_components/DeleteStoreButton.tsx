'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function DeleteStoreButton({ storeId, storeName }: { storeId: string; storeName: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!window.confirm(`Remove "${storeName}"? This cannot be undone.`)) return
    setLoading(true)
    const supabase = createClient()
    await supabase.from('stores').delete().eq('id', storeId)
    router.refresh()
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      title="Remove store"
      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c8c4b8', padding: 4, display: 'flex', alignItems: 'center' }}
      onMouseEnter={e => (e.currentTarget.style.color = '#e63946')}
      onMouseLeave={e => (e.currentTarget.style.color = '#c8c4b8')}
    >
      <Trash2 size={14} />
    </button>
  )
}
