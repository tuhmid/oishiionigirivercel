'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { GripVertical, FileText, Receipt, Clock, MapPin } from 'lucide-react'

interface StopData {
  storeId: string
  storeName: string
  address: string | null
  hours: Record<string, { open: string; close: string }> | null
  open247: boolean
  batchId: string
  scheduledTime: string | null
  invoiceId: string | null
  invoiceAmount: number | null
  invoicePaid: boolean
}

export interface RouteDay {
  date: string
  stops: StopData[]
  routePlanId: string | undefined
}

function dayLabel(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'short', day: 'numeric',
  })
}

export default function RoutesClient({ days: initialDays }: { days: RouteDay[] }) {
  const [days, setDays] = useState(initialDays)
  const router = useRouter()
  const [dragging, setDragging] = useState<{ date: string; idx: number } | null>(null)
  const [saving, setSaving] = useState<string | null>(null)

  const persistOrder = async (date: string, routePlanId: string | undefined, updatedDays: RouteDay[]) => {
    const day = updatedDays.find(d => d.date === date)
    if (!day) return
    setSaving(date)
    const supabase = createClient()
    const stops = day.stops.map((s, i) => ({
      store_id: s.storeId,
      store_name: s.storeName,
      address: s.address,
      hours: s.hours,
      scheduled_time: s.scheduledTime,
      order_index: i,
    }))
    if (routePlanId) {
      await supabase.from('route_plans').update({ stops }).eq('id', routePlanId)
    } else {
      const { data } = await supabase
        .from('route_plans')
        .insert({ planned_date: date, stops })
        .select('id')
        .single()
      if (data) {
        setDays(prev => prev.map(d => d.date === date ? { ...d, routePlanId: data.id } : d))
      }
    }
    setSaving(null)
  }

  const handleDragStart = (date: string, idx: number) => setDragging({ date, idx })

  const handleDragOver = (e: React.DragEvent, date: string, toIdx: number) => {
    e.preventDefault()
    if (!dragging || dragging.date !== date || dragging.idx === toIdx) return
    const fromIdx = dragging.idx
    setDays(prev => prev.map(day => {
      if (day.date !== date) return day
      const next = [...day.stops]
      const [moved] = next.splice(fromIdx, 1)
      next.splice(toIdx, 0, moved)
      return { ...day, stops: next }
    }))
    setDragging({ date, idx: toIdx })
  }

  const handleDragEnd = (date: string, routePlanId: string | undefined) => {
    if (!dragging) return
    setDragging(null)
    setDays(current => {
      persistOrder(date, routePlanId, current)
      return current
    })
  }

  const updateTime = (date: string, idx: number, time: string) => {
    setDays(prev => prev.map(day => {
      if (day.date !== date) return day
      const next = [...day.stops]
      next[idx] = { ...next[idx], scheduledTime: time || null }
      return { ...day, stops: next }
    }))
  }

  const saveTimes = (date: string, routePlanId: string | undefined) => {
    setDays(current => {
      persistOrder(date, routePlanId, current).then(() => toast.success('Times saved'))
      return current
    })
  }

  if (days.length === 0) {
    return (
      <div className="px-5 py-10 text-center" style={{ border: '1px solid #e2ddd0' }}>
        <p className="text-sm" style={{ color: '#666666' }}>No pending batches.</p>
        <p className="text-xs mt-1" style={{ color: '#999999' }}>
          Open a store, go to the Schedule tab, and generate batches for the next 4 weeks.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {days.map(day => (
        <div key={day.date} style={{ border: '1px solid #e2ddd0' }}>
          {/* Day header */}
          <div
            className="flex items-center justify-between px-5 py-3"
            style={{ background: '#faf8f3', borderBottom: '1px solid #e2ddd0' }}
          >
            <div>
              <p className="text-sm font-semibold" style={{ color: '#0a0a0a' }}>{dayLabel(day.date)}</p>
              <p className="text-xs mt-0.5" style={{ color: '#777777' }}>
                {day.stops.length} stop{day.stops.length !== 1 ? 's' : ''}
                {day.routePlanId && <span className="ml-2" style={{ color: '#4a7a4a' }}>· order saved</span>}
                {saving === day.date && <span className="ml-2" style={{ color: '#aaaaaa' }}>· saving…</span>}
              </p>
            </div>
            <button
              onClick={() => saveTimes(day.date, day.routePlanId)}
              disabled={saving === day.date}
              className="text-xs tracking-widest uppercase px-3 py-1.5 transition-colors disabled:opacity-40 hover:bg-[#f0ece0]"
              style={{ border: '1px solid #c8c4b8', color: '#555555' }}
            >
              Save Times
            </button>
          </div>

          {/* Column header */}
          <div
            className="grid text-xs tracking-widest uppercase px-4 py-2"
            style={{
              gridTemplateColumns: '20px 28px 1fr 90px auto',
              gap: '10px',
              color: '#c8c4b8',
              borderBottom: '1px solid #f0ece0',
            }}
          >
            <span />
            <span>#</span>
            <span>Store</span>
            <span>Arrive</span>
            <span>Docs</span>
          </div>

          {day.stops.map((stop, idx) => {
            const jsDay = new Date(day.date + 'T12:00:00')
              .toLocaleDateString('en-US', { weekday: 'short' })
              .toLowerCase()
              .slice(0, 3)
            const todayHours = stop.hours?.[jsDay]
            const isActive = dragging?.date === day.date && dragging?.idx === idx

            return (
              <div
                key={stop.storeId}
                draggable
                onDragStart={() => handleDragStart(day.date, idx)}
                onDragOver={e => handleDragOver(e, day.date, idx)}
                onDragEnd={() => handleDragEnd(day.date, day.routePlanId)}
                className="grid items-center px-4 py-3"
                style={{
                  gridTemplateColumns: '20px 28px 1fr 90px auto',
                  gap: '10px',
                  borderTop: '1px solid #f0ece0',
                  background: isActive ? '#ece7d9' : '#ffffff',
                  opacity: isActive ? 0.6 : 1,
                  cursor: 'grab',
                  userSelect: 'none',
                }}
              >
                <GripVertical size={13} style={{ color: '#c8c4b8', flexShrink: 0 }} />

                <span
                  className="text-center font-bold select-none"
                  style={{ color: '#c8c4b8', fontFamily: 'Georgia, serif', fontSize: 16 }}
                >
                  {idx + 1}
                </span>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p
                      className="text-sm font-medium truncate hover:underline"
                      style={{ color: '#0a0a0a', cursor: 'pointer' }}
                      onClick={e => { e.stopPropagation(); router.push(`/admin/deliveries/${stop.batchId}`) }}
                    >
                      {stop.storeName}
                    </p>
                    {stop.open247 && (
                      <span className="text-xs font-bold px-1.5 py-0.5 shrink-0" style={{ background: '#e63946', color: '#fff', letterSpacing: '0.05em', lineHeight: 1 }}>24/7</span>
                    )}
                  </div>
                  {stop.address && (
                    <p className="flex items-center gap-1 text-xs mt-0.5 truncate" style={{ color: '#777777' }}>
                      <MapPin size={10} style={{ flexShrink: 0 }} />
                      {stop.address}
                    </p>
                  )}
                  {todayHours && (
                    <p className="flex items-center gap-1 text-xs mt-0.5" style={{ color: '#4a7a4a' }}>
                      <Clock size={10} style={{ flexShrink: 0 }} />
                      {todayHours.open} – {todayHours.close}
                    </p>
                  )}
                </div>

                <input
                  type="time"
                  value={stop.scheduledTime ?? ''}
                  onChange={e => updateTime(day.date, idx, e.target.value)}
                  style={{
                    background: '#f5f2ea',
                    border: '1px solid #c8c4b8',
                    color: '#0a0a0a',
                    padding: '5px 7px',
                    fontSize: '12px',
                    outline: 'none',
                    width: '100%',
                  }}
                />

                <div className="flex items-center gap-1.5 shrink-0">
                  <a
                    href={`/admin/deliveries/${stop.batchId}/receipt`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Print delivery receipt"
                    className="flex items-center gap-1 px-2 py-1.5 text-xs tracking-widest uppercase font-semibold transition-colors hover:bg-[#f5f0e6]"
                    style={{ border: '1px solid #c8c4b8', color: '#555555' }}
                    onClick={e => e.stopPropagation()}
                  >
                    <Receipt size={11} /> Receipt
                  </a>
                  {stop.invoiceId && (
                    <a
                      href={`/admin/invoices/${stop.invoiceId}/print`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`Invoice $${Number(stop.invoiceAmount).toFixed(2)}${stop.invoicePaid ? ' · paid' : ' · unpaid'}`}
                      className="flex items-center gap-1 px-2 py-1.5 text-xs tracking-widest uppercase font-semibold transition-colors"
                      style={{
                        border: `1px solid ${stop.invoicePaid ? '#a0c4a0' : '#e63946'}`,
                        color: stop.invoicePaid ? '#4a7a4a' : '#e63946',
                      }}
                      onClick={e => e.stopPropagation()}
                    >
                      <FileText size={11} /> Invoice
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
