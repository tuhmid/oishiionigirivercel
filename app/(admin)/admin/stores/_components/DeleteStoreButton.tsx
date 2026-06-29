'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function DeleteStoreButton({ storeId, storeName }: { storeId: string; storeName: string }) {
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!confirming) {
      setConfirming(true)
      return
    }

    setLoading(true)
    const supabase = createClient()
    await supabase.from('stores').delete().eq('id', storeId)
    router.refresh()
  }

  const handleCancel = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setConfirming(false)
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
        <span className="text-xs" style={{ color: '#e63946' }}>Remove {storeName}?</span>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="text-xs font-semibold px-2 py-1"
          style={{ background: '#e63946', color: '#fff', border: 'none', cursor: 'pointer' }}
        >
          {loading ? '...' : 'Yes'}
        </button>
        <button
          onClick={handleCancel}
          className="text-xs px-2 py-1"
          style={{ background: 'transparent', border: '1px solid #ccc', cursor: 'pointer' }}
        >
          No
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={handleDelete}
      title="Remove store"
      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c8c4b8', padding: 4, display: 'flex', alignItems: 'center' }}
      onMouseEnter={e => (e.currentTarget.style.color = '#e63946')}
      onMouseLeave={e => (e.currentTarget.style.color = '#c8c4b8')}
    >
      <Trash2 size={14} />
    </button>
  )
}
