'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending:   { bg: '#e8eaf5', text: '#4a5a9a' },
  delivered: { bg: '#e4f0e4', text: '#2a7a2a' },
  returned:  { bg: '#f0f0e0', text: '#7a7a2a' },
  invoiced:  { bg: '#f5e4e4', text: '#8a3a3a' },
  paid:      { bg: '#e4f0e4', text: '#1a7a1a' },
}

interface BatchRow {
  id: string
  status: string
  delivery_date: string
  totalUnits: number
  invoice: { id: string; amount_due: number; paid_at: string | null } | null
}

export interface StoreGroup {
  storeId: string
  storeName: string
  storeAddress: string | null
  batches: BatchRow[]
}

export default function DeliveriesClient({ groups }: { groups: StoreGroup[] }) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const toggle = (storeId: string) =>
    setCollapsed(prev => {
      const next = new Set(prev)
      next.has(storeId) ? next.delete(storeId) : next.add(storeId)
      return next
    })

  return (
    <div style={{ border: '1px solid #e2ddd0' }}>
      {groups.length === 0 && (
        <p className="px-5 py-8 text-sm" style={{ color: '#666666' }}>No deliveries yet.</p>
      )}
      {groups.map((group, gi) => {
        const isCollapsed = collapsed.has(group.storeId)
        const pendingCount = group.batches.filter(b => b.status === 'pending').length
        const unpaidTotal = group.batches.reduce((s, b) => s + (!b.invoice?.paid_at && b.invoice ? Number(b.invoice.amount_due) : 0), 0)

        return (
          <div key={group.storeId} style={{ borderBottom: gi < groups.length - 1 ? '2px solid #e2ddd0' : undefined }}>
            {/* Store header row — clickable to collapse */}
            <button
              onClick={() => toggle(group.storeId)}
              className="w-full flex items-center justify-between px-5 py-3 text-left transition-colors hover:bg-[#f5f0e6]"
              style={{ background: '#faf8f3' }}
            >
              <div className="flex items-center gap-3">
                {isCollapsed
                  ? <ChevronRight size={14} style={{ color: '#888888', flexShrink: 0 }} />
                  : <ChevronDown size={14} style={{ color: '#888888', flexShrink: 0 }} />
                }
                <div>
                  <span className="text-sm font-semibold" style={{ color: '#0a0a0a' }}>
                    {group.storeName}
                  </span>
                  {group.storeAddress && (
                    <p className="text-xs mt-0.5" style={{ color: '#888888' }}>{group.storeAddress}</p>
                  )}
                </div>
                <span className="text-xs" style={{ color: '#777777' }}>
                  {group.batches.length} batch{group.batches.length !== 1 ? 'es' : ''}
                </span>
                {pendingCount > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-sm" style={{ background: '#e8eaf5', color: '#4a5a9a' }}>
                    {pendingCount} pending
                  </span>
                )}
                {unpaidTotal > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-sm" style={{ background: '#f5e4e4', color: '#e63946' }}>
                    {formatCurrency(unpaidTotal)} unpaid
                  </span>
                )}
              </div>
              <Link
                href={`/admin/stores/${group.storeId}`}
                onClick={e => e.stopPropagation()}
                className="text-xs tracking-widest uppercase"
                style={{ color: '#888888' }}
              >
                View store →
              </Link>
            </button>

            {/* Batch rows */}
            {!isCollapsed && (
              <>
                <div
                  className="grid text-xs tracking-widest uppercase px-5 py-2"
                  style={{ gridTemplateColumns: '1.5fr 1fr 1fr 1fr', color: '#c8c4b8', background: '#ffffff', borderTop: '1px solid #f0ece0' }}
                >
                  <span>Delivery Date</span>
                  <span>Status</span>
                  <span>Units</span>
                  <span>Invoice</span>
                </div>
                {group.batches.map(batch => {
                  const statusColor = STATUS_COLORS[batch.status] ?? STATUS_COLORS.pending
                  return (
                    <Link
                      key={batch.id}
                      href={`/admin/deliveries/${batch.id}`}
                      className="grid items-center px-5 py-3 transition-colors hover:bg-[#f5f0e6]"
                      style={{ gridTemplateColumns: '1.5fr 1fr 1fr 1fr', borderTop: '1px solid #f0ece0', background: '#ffffff' }}
                    >
                      <span className="text-xs" style={{ color: '#555555' }}>{formatDate(batch.delivery_date)}</span>
                      <span className="text-xs px-2 py-0.5 w-fit rounded-sm" style={{ background: statusColor.bg, color: statusColor.text }}>
                        {batch.status}
                      </span>
                      <span className="text-xs" style={{ color: '#555555' }}>{batch.totalUnits} pcs</span>
                      <span className="text-sm" style={{ color: batch.invoice?.paid_at ? '#2a7a2a' : (batch.invoice ? '#e63946' : '#666666') }}>
                        {batch.invoice
                          ? (batch.invoice.paid_at ? 'Paid' : formatCurrency(Number(batch.invoice.amount_due)))
                          : '—'}
                      </span>
                    </Link>
                  )
                })}
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}
