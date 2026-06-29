'use client'

import { useState, useRef, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Phone, Mail } from 'lucide-react'
import type { Store, Flavor, Batch, StoreContact } from '@/types'
import { PAYMENT_LABELS, DAYS, DAY_LABELS, formatDate } from '@/lib/utils'
import { WHOLESALE_PRICE } from '@/lib/pricing'

function BatchStatusBadge({ status }: { status: string }) {
  const configs: Record<string, { bg: string; color: string; label: string }> = {
    delivered: { bg: '#f5f0d0', color: '#8a7020', label: 'Delivered' },
    returned:  { bg: '#e0eaf5', color: '#4a6a9a', label: 'Return Recorded' },
    invoiced:  { bg: '#e4f0e4', color: '#2a7a2a', label: 'Invoiced' },
  }
  const cfg = configs[status] ?? { bg: '#e2ddd0', color: '#777777', label: status }
  return (
    <span
      className="text-xs px-2 py-0.5 font-semibold"
      style={{ background: cfg.bg, color: cfg.color, borderRadius: '3px' }}
    >
      {cfg.label}
    </span>
  )
}

const storeSchema = z.object({
  name: z.string().min(1, 'Required'),
  address: z.string().optional(),
  preferred_payment_method: z.enum(['cash', 'check', 'zelle', 'square']).optional(),
  notes: z.string().optional(),
})

type StoreForm = z.infer<typeof storeSchema>

interface Props {
  store: (Store & {
    contacts: StoreContact[]
    billable_name?: string | null
    billable_address?: string | null
    cert_authority_number?: string | null
    resale_cert_url?: string | null
  }) | null
  flavors: Flavor[]
  batches: Batch[]
  scheduleReminder?: boolean
  lastScheduledDate?: string
}

export default function StoreDetailClient({ store, flavors, batches, scheduleReminder, lastScheduledDate }: Props) {
  const router = useRouter()
  const [contacts, setContacts] = useState<Partial<StoreContact>[]>(store?.contacts ?? [])
  const [newContact, setNewContact] = useState({ name: '', role: '', phone: '', email: '' })
  const [saving, setSaving] = useState(false)
  const [addressSuggestions, setAddressSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const addressDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [tab, setTab] = useState<'info' | 'contacts' | 'allocations' | 'deliveries' | 'schedule'>('info')

  const [allocations, setAllocations] = useState<Record<string, number>>(
    Object.fromEntries((store?.allocations ?? []).map(a => [a.flavor_id, a.default_qty]))
  )
  const [deliveryDays, setDeliveryDays] = useState<string[]>(store?.delivery_days ?? [])
  const [open247, setOpen247] = useState<boolean>((store as Store & { open_247?: boolean })?.open_247 ?? false)
  const [generating, setGenerating] = useState(false)

  // Documents & Billing editable state
  const [billing, setBilling] = useState({
    billable_name: store?.billable_name ?? '',
    billable_address: store?.billable_address ?? '',
    cert_authority_number: store?.cert_authority_number ?? '',
  })
  const [certUrl, setCertUrl] = useState<string | null>(store?.resale_cert_url ?? null)
  const [certFile, setCertFile] = useState<File | null>(null)
  const [savingDocs, setSavingDocs] = useState(false)

  const saveDocs = async () => {
    if (!store) return
    setSavingDocs(true)
    const supabase = createClient()
    let resale_cert_url = certUrl
    if (certFile) {
      const ext = certFile.name.split('.').pop() ?? 'bin'
      const path = `resale-certs/${store.id}-${Date.now()}.${ext}`
      const { data: uploaded } = await supabase.storage.from('certificates').upload(path, certFile, { upsert: true })
      if (uploaded) {
        const { data: { publicUrl } } = supabase.storage.from('certificates').getPublicUrl(uploaded.path)
        resale_cert_url = publicUrl
        setCertUrl(publicUrl)
        setCertFile(null)
      }
    }
    const { error } = await supabase.from('stores').update({ ...billing, resale_cert_url }).eq('id', store.id)
    if (error) toast.error(error.message)
    else toast.success('Documents saved')
    setSavingDocs(false)
  }

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<StoreForm>({
    resolver: zodResolver(storeSchema),
    defaultValues: {
      name: store?.name ?? '',
      address: store?.address ?? '',
      preferred_payment_method: store?.preferred_payment_method ?? undefined,
      notes: store?.notes ?? '',
    },
  })

  const onSubmit = async (data: StoreForm) => {
    setSaving(true)
    const supabase = createClient()

    if (store) {
      const { error } = await supabase.from('stores').update({ ...data, open_247: open247 }).eq('id', store.id)
      if (error) { toast.error(error.message); setSaving(false); return }

      // Upsert allocations
      for (const [flavor_id, qty] of Object.entries(allocations)) {
        await supabase.from('store_flavor_allocations').upsert(
          { store_id: store.id, flavor_id, default_qty: qty },
          { onConflict: 'store_id,flavor_id' }
        )
      }

      toast.success('Store updated')
    } else {
      const { data: newStore, error } = await supabase.from('stores').insert({ ...data, open_247: open247 }).select().single()
      if (error || !newStore) { toast.error(error?.message ?? 'Failed'); setSaving(false); return }
      router.push(`/admin/stores/${newStore.id}`)
      return
    }
    setSaving(false)
  }

  const addContact = async () => {
    if (!newContact.name) { toast.error('Name required'); return }
    const supabase = createClient()
    const { data, error } = await supabase
      .from('store_contacts')
      .insert({ store_id: store!.id, ...newContact })
      .select()
      .single()
    if (error) { toast.error(error.message); return }
    setContacts(prev => [...prev, data])
    setNewContact({ name: '', role: '', phone: '', email: '' })
    toast.success('Contact added')
  }

  const removeContact = async (id: string) => {
    const supabase = createClient()
    await supabase.from('store_contacts').delete().eq('id', id)
    setContacts(prev => prev.filter(c => c.id !== id))
  }

  const setDefault = async (id: string) => {
    const supabase = createClient()
    await supabase.from('store_contacts').update({ is_default: false }).eq('store_id', store!.id)
    await supabase.from('store_contacts').update({ is_default: true }).eq('id', id)
    setContacts(prev => prev.map(c => ({ ...c, is_default: c.id === id })))
  }

  const saveSchedule = async () => {
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from('stores').update({ delivery_days: deliveryDays }).eq('id', store!.id)
    if (error) { toast.error(error.message) } else { toast.success('Schedule saved') }
    setSaving(false)
  }

  const generateBatches = async () => {
    if (deliveryDays.length === 0) { toast.error('No delivery days set'); return }
    setGenerating(true)
    const supabase = createClient()
    const DAY_TO_JS: Record<string, number> = { mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6, sun: 0 }
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const targetDates: string[] = []
    for (let i = 1; i <= 28; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() + i)
      if (deliveryDays.some(day => DAY_TO_JS[day] === d.getDay())) {
        targetDates.push(d.toISOString().slice(0, 10))
      }
    }
    const existingDates = new Set(batches.map(b => b.delivery_date))
    const newDates = targetDates.filter(d => !existingDates.has(d))
    if (newDates.length === 0) {
      toast.info('All scheduled dates already have batches')
      setGenerating(false)
      return
    }
    const allocationEntries = Object.entries(allocations).filter(([, qty]) => qty > 0)
    let created = 0
    for (const deliveryDate of newDates) {
      const { data: batch, error } = await supabase
        .from('batches')
        .insert({ store_id: store!.id, delivery_date: deliveryDate, status: 'pending' })
        .select('id')
        .single()
      if (error || !batch) continue
      if (allocationEntries.length > 0) {
        await supabase.from('batch_items').insert(
          allocationEntries.map(([flavor_id, qty_delivered]) => ({ batch_id: batch.id, flavor_id, qty_delivered }))
        )
      }
      created++
    }
    toast.success(`Created ${created} batch${created !== 1 ? 'es' : ''}`)
    setGenerating(false)
    router.refresh()
  }

  const fetchAddressSuggestions = useCallback((query: string) => {
    if (addressDebounce.current) clearTimeout(addressDebounce.current)
    if (!query || query.length < 4) { setAddressSuggestions([]); return }
    addressDebounce.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=us&q=${encodeURIComponent(query)}`,
          { headers: { 'Accept-Language': 'en', 'User-Agent': 'OishiiOnigiri/1.0' } }
        )
        const data = await res.json()
        setAddressSuggestions((data as { display_name: string }[]).map(r => r.display_name))
        setShowSuggestions(true)
      } catch { /* ignore */ }
    }, 400)
  }, [])

  const inputStyle = {
    background: '#f5f2ea',
    border: '1px solid #c8c4b8',
    color: '#0a0a0a',
    padding: '10px 12px',
    fontSize: '13px',
    width: '100%',
    outline: 'none',
  }

  return (
    <div>
      {/* Schedule reminder banner */}
      {scheduleReminder && (
        <div
          className="flex items-center justify-between px-4 py-3 mb-5"
          style={{ background: '#fff8e1', border: '1px solid #f5c842' }}
        >
          <div>
            <p className="text-xs font-semibold" style={{ color: '#7a5a00' }}>
              Schedule reminder
            </p>
            <p className="text-xs mt-0.5" style={{ color: '#9a7a20' }}>
              Last scheduled batch is{lastScheduledDate ? ` ${lastScheduledDate}` : ' soon'}.
              Generate the next 4 weeks to stay on schedule.
            </p>
          </div>
          <button
            onClick={() => setTab('schedule')}
            className="ml-4 px-4 py-2 text-xs tracking-widest uppercase font-semibold shrink-0"
            style={{ background: '#f5c842', color: '#3a2a00' }}
          >
            Open Schedule
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6" style={{ borderBottom: '1px solid #e2ddd0' }}>
        {(
          [
            { id: 'info',        label: 'Info' },
            { id: 'contacts',    label: 'Contacts' },
            { id: 'allocations', label: 'Allocations' },
            { id: 'schedule',    label: 'Schedule' },
            { id: 'deliveries',  label: `Deliveries (${batches.length})` },
          ] as Array<{ id: typeof tab; label: string }>
        ).map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className="px-4 py-2 text-xs tracking-widest uppercase transition-colors"
            style={{
              color: tab === id ? '#0a0a0a' : '#666666',
              borderBottom: tab === id ? '1px solid #e63946' : '1px solid transparent',
              marginBottom: '-1px',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'info' && (
        <>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-lg">
          <div>
            <label className="text-xs tracking-widest uppercase block mb-1.5" style={{ color: '#555555' }}>Store Name</label>
            <input {...register('name')} style={inputStyle} />
            {errors.name && <p className="text-xs mt-1" style={{ color: '#e63946' }}>{errors.name.message}</p>}
          </div>
          <div style={{ position: 'relative' }}>
            <label className="text-xs tracking-widest uppercase block mb-1.5" style={{ color: '#555555' }}>Address</label>
            <input
              {...register('address')}
              style={inputStyle}
              autoComplete="off"
              onChange={e => {
                register('address').onChange(e)
                fetchAddressSuggestions(e.target.value)
              }}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              onFocus={e => { if (e.target.value.length >= 4 && addressSuggestions.length > 0) setShowSuggestions(true) }}
            />
            {showSuggestions && addressSuggestions.length > 0 && (
              <div
                style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                  background: '#ffffff', border: '1px solid #c8c4b8', borderTop: 'none',
                  maxHeight: 200, overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                }}
              >
                {addressSuggestions.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    className="w-full text-left px-3 py-2 text-xs transition-colors hover:bg-[#f5f0e6]"
                    style={{ color: '#0a0a0a', borderBottom: i < addressSuggestions.length - 1 ? '1px solid #f0ece0' : 'none' }}
                    onMouseDown={() => {
                      setValue('address', s, { shouldDirty: true })
                      setShowSuggestions(false)
                      setAddressSuggestions([])
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="text-xs tracking-widest uppercase block mb-1.5" style={{ color: '#555555' }}>Payment Method</label>
            <select {...register('preferred_payment_method')} style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="">— select —</option>
              {Object.entries(PAYMENT_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs tracking-widest uppercase block mb-1.5" style={{ color: '#555555' }}>Notes</label>
            <textarea {...register('notes')} rows={3} style={{ ...inputStyle, resize: 'none' }} />
          </div>
          <div>
            <label className="text-xs tracking-widest uppercase block mb-2" style={{ color: '#555555' }}>Hours</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={open247}
                onChange={e => setOpen247(e.target.checked)}
                style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#e63946' }}
              />
              <span className="text-sm" style={{ color: '#0a0a0a' }}>Open 24/7</span>
              {open247 && (
                <span className="text-xs font-bold px-2 py-0.5" style={{ background: '#e63946', color: '#fff', letterSpacing: '0.05em' }}>24/7</span>
              )}
            </label>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 text-xs tracking-widest uppercase font-semibold disabled:opacity-40"
            style={{ background: '#e63946', color: '#ffffff' }}
          >
            {saving ? 'Saving...' : store ? 'Save Changes' : 'Create Store'}
          </button>
        </form>

        {/* Documents & Billing — editable */}
        {store && (
          <div className="max-w-lg mt-8">
            <div style={{ borderTop: '1px solid #e2ddd0', paddingTop: 24 }}>
              <p className="text-xs tracking-widest uppercase font-semibold mb-4" style={{ color: '#555555' }}>
                Documents &amp; Billing
              </p>
              <div className="space-y-4">
                <div>
                  <label className="text-xs tracking-widest uppercase block mb-1.5" style={{ color: '#555555' }}>Billable Name</label>
                  <input
                    type="text"
                    value={billing.billable_name}
                    onChange={e => setBilling(p => ({ ...p, billable_name: e.target.value }))}
                    style={inputStyle}
                    placeholder="Legal business name"
                  />
                </div>
                <div>
                  <label className="text-xs tracking-widest uppercase block mb-1.5" style={{ color: '#555555' }}>Billable Address</label>
                  <input
                    type="text"
                    value={billing.billable_address}
                    onChange={e => setBilling(p => ({ ...p, billable_address: e.target.value }))}
                    style={inputStyle}
                    placeholder="Billing address"
                  />
                </div>
                <div>
                  <label className="text-xs tracking-widest uppercase block mb-1.5" style={{ color: '#555555' }}>Certificate of Authority #</label>
                  <input
                    type="text"
                    value={billing.cert_authority_number}
                    onChange={e => setBilling(p => ({ ...p, cert_authority_number: e.target.value }))}
                    style={inputStyle}
                    placeholder="e.g. 12-345678"
                  />
                </div>
                <div>
                  <label className="text-xs tracking-widest uppercase block mb-1.5" style={{ color: '#555555' }}>Resale Certificate</label>
                  {certUrl && (
                    <div style={{ marginBottom: 10 }}>
                      {/\.(jpe?g|png|webp|gif)$/i.test(certUrl) ? (
                        <div style={{ border: '1px solid #e2ddd0', padding: 4, display: 'inline-block', marginBottom: 6 }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={certUrl} alt="Resale Certificate" style={{ maxWidth: '100%', maxHeight: 200, objectFit: 'contain', display: 'block' }} />
                        </div>
                      ) : (
                        <a href={certUrl} target="_blank" rel="noopener noreferrer" className="text-sm inline-flex items-center gap-1.5" style={{ color: '#e63946', textDecoration: 'underline', display: 'block', marginBottom: 6 }}>
                          📄 View Certificate (PDF)
                        </a>
                      )}
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={e => setCertFile(e.target.files?.[0] ?? null)}
                    style={{ fontSize: 12, color: '#555' }}
                  />
                  {certFile && <p className="text-xs mt-1" style={{ color: '#4a7a4a' }}>Ready to upload: {certFile.name}</p>}
                </div>
                <button
                  type="button"
                  onClick={saveDocs}
                  disabled={savingDocs}
                  className="px-6 py-3 text-xs tracking-widest uppercase font-semibold disabled:opacity-40"
                  style={{ background: '#1E3A1E', color: '#ffffff' }}
                >
                  {savingDocs ? 'Saving...' : 'Save Documents'}
                </button>
              </div>
            </div>
          </div>
        )}
        </>
      )}

      {tab === 'contacts' && store && (
        <div className="max-w-lg space-y-6">
          {/* Existing contacts */}
          <div className="space-y-2">
            {contacts.map(c => (
              <div
                key={c.id}
                className="flex items-center justify-between p-4"
                style={{ background: '#f5f2ea', border: '1px solid #e2ddd0' }}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium" style={{ color: '#0a0a0a' }}>{c.name}</p>
                    {c.is_default && (
                      <span className="text-xs px-1.5 py-0.5" style={{ background: '#e4f0e4', color: '#2a7a2a' }}>
                        default
                      </span>
                    )}
                  </div>
                  {c.role && <p className="text-xs mt-0.5" style={{ color: '#555555' }}>{c.role}</p>}
                  <div className="flex items-center gap-4 mt-1">
                    {c.phone && (
                      <span className="flex items-center gap-1 text-xs" style={{ color: '#777777' }}>
                        <Phone size={10} /> {c.phone}
                      </span>
                    )}
                    {c.email && (
                      <span className="flex items-center gap-1 text-xs" style={{ color: '#777777' }}>
                        <Mail size={10} /> {c.email}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!c.is_default && (
                    <button
                      onClick={() => setDefault(c.id!)}
                      className="text-xs px-2 py-1 transition-colors"
                      style={{ border: '1px solid #c8c4b8', color: '#555555' }}
                    >
                      Set default
                    </button>
                  )}
                  <button
                    onClick={() => removeContact(c.id!)}
                    className="p-1.5 transition-colors"
                    style={{ color: '#666666' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#e63946')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#666666')}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add contact form */}
          <div className="p-4 space-y-3" style={{ border: '1px solid #e2ddd0' }}>
            <p className="text-xs tracking-widest uppercase font-semibold" style={{ color: '#555555' }}>Add Contact</p>
            <div className="grid grid-cols-2 gap-3">
              <input
                placeholder="Name"
                value={newContact.name}
                onChange={e => setNewContact(p => ({ ...p, name: e.target.value }))}
                style={inputStyle}
              />
              <input
                placeholder="Role (optional)"
                value={newContact.role}
                onChange={e => setNewContact(p => ({ ...p, role: e.target.value }))}
                style={inputStyle}
              />
              <input
                placeholder="Phone"
                value={newContact.phone}
                onChange={e => setNewContact(p => ({ ...p, phone: e.target.value }))}
                style={inputStyle}
              />
              <input
                placeholder="Email (optional)"
                value={newContact.email}
                onChange={e => setNewContact(p => ({ ...p, email: e.target.value }))}
                style={inputStyle}
              />
            </div>
            <button
              onClick={addContact}
              className="flex items-center gap-2 px-4 py-2 text-xs tracking-widest uppercase font-semibold"
              style={{ border: '1px solid #c8c4b8', color: '#0a0a0a' }}
            >
              <Plus size={12} /> Add
            </button>
          </div>
        </div>
      )}

      {tab === 'allocations' && store && (
        <div className="max-w-lg space-y-4">
          <p className="text-xs" style={{ color: '#555555' }}>
            Set default quantities per flavor for this store. Must be multiples of 3.
          </p>
          <div className="space-y-2">
            {flavors.map(f => (
              <div key={f.id} className="flex items-center justify-between p-4" style={{ background: '#f5f2ea', border: '1px solid #e2ddd0' }}>
                <div>
                  <p className="text-sm" style={{ color: '#0a0a0a' }}>{f.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#555555' }}>${WHOLESALE_PRICE.toFixed(2)}/unit</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setAllocations(p => ({ ...p, [f.id]: Math.max(0, (p[f.id] ?? 0) - 3) }))}
                    className="w-7 h-7 flex items-center justify-center text-lg"
                    style={{ border: '1px solid #c8c4b8', color: '#777777' }}
                  >−</button>
                  <span className="w-8 text-center text-sm" style={{ color: '#0a0a0a' }}>
                    {allocations[f.id] ?? 0}
                  </span>
                  <button
                    onClick={() => setAllocations(p => ({ ...p, [f.id]: (p[f.id] ?? 0) + 3 }))}
                    className="w-7 h-7 flex items-center justify-center text-lg"
                    style={{ border: '1px solid #c8c4b8', color: '#0a0a0a' }}
                  >+</button>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={async () => {
              setSaving(true)
              const supabase = createClient()
              for (const [flavor_id, qty] of Object.entries(allocations)) {
                if (qty > 0) {
                  await supabase.from('store_flavor_allocations').upsert(
                    { store_id: store.id, flavor_id, default_qty: qty },
                    { onConflict: 'store_id,flavor_id' }
                  )
                } else {
                  await supabase.from('store_flavor_allocations')
                    .delete()
                    .eq('store_id', store.id)
                    .eq('flavor_id', flavor_id)
                }
              }
              toast.success('Allocations saved')
              setSaving(false)
            }}
            disabled={saving}
            className="px-6 py-3 text-xs tracking-widest uppercase font-semibold disabled:opacity-40"
            style={{ background: '#e63946', color: '#ffffff' }}
          >
            {saving ? 'Saving...' : 'Save Allocations'}
          </button>
        </div>
      )}

      {tab === 'schedule' && store && (
        <div className="max-w-lg space-y-6">
          <div>
            <p className="text-xs tracking-widest uppercase font-semibold mb-2" style={{ color: '#555555' }}>
              Delivery Days
            </p>
            <p className="text-xs mb-4" style={{ color: '#777777' }}>
              Select which days of the week this store receives deliveries.
            </p>
            <div className="flex flex-wrap gap-2">
              {DAYS.map(day => (
                <button
                  key={day}
                  onClick={() => setDeliveryDays(prev =>
                    prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
                  )}
                  className="px-4 py-2 text-xs tracking-widest uppercase font-semibold transition-colors"
                  style={{
                    border: `1px solid ${deliveryDays.includes(day) ? '#e63946' : '#c8c4b8'}`,
                    background: deliveryDays.includes(day) ? '#e63946' : 'transparent',
                    color: deliveryDays.includes(day) ? '#ffffff' : '#555555',
                  }}
                >
                  {DAY_LABELS[day]}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={saveSchedule}
            disabled={saving}
            className="px-6 py-3 text-xs tracking-widest uppercase font-semibold disabled:opacity-40"
            style={{ background: '#0a0a0a', color: '#ffffff' }}
          >
            {saving ? 'Saving...' : 'Save Schedule'}
          </button>

          <div style={{ borderTop: '1px solid #e2ddd0', paddingTop: 24 }}>
            <p className="text-xs tracking-widest uppercase font-semibold mb-2" style={{ color: '#555555' }}>
              Generate Batches
            </p>
            <p className="text-xs mb-4" style={{ color: '#777777' }}>
              Create pending batches for the next 4 weeks based on the schedule above.
              Dates that already have a batch for this store are skipped.
              Batch quantities use the store&apos;s current allocations.
            </p>
            <button
              onClick={generateBatches}
              disabled={generating || deliveryDays.length === 0}
              className="px-6 py-3 text-xs tracking-widest uppercase font-semibold disabled:opacity-40"
              style={{ background: '#e63946', color: '#ffffff' }}
            >
              {generating ? 'Generating...' : 'Generate Next 4 Weeks'}
            </button>
            {deliveryDays.length === 0 && (
              <p className="text-xs mt-2" style={{ color: '#e63946' }}>
                Save a schedule first before generating batches.
              </p>
            )}
          </div>
        </div>
      )}

      {tab === 'deliveries' && (
        <div className="space-y-4">
          {batches.length === 0 && (
            <p className="text-sm" style={{ color: '#666666' }}>No deliveries yet.</p>
          )}
          {(batches as any[]).map((batch: any) => {
            const inv = batch.invoice as {
              id: string
              amount: number
              paid: boolean
              payment_method: string | null
            } | null
            const items = batch.items as Array<{
              id: string
              qty_delivered: number
              qty_sold: number | null
              flavor: { name: string }
            }>
            const totalDelivered = items.reduce((s, i) => s + i.qty_delivered, 0)
            const totalSold = items.reduce((s, i) => s + (i.qty_sold ?? 0), 0)
            return (
              <div
                key={batch.id}
                style={{ border: '1px solid #e2ddd0', borderRadius: '6px', overflow: 'hidden' }}
              >
                {/* Header */}
                <div
                  className="flex items-center justify-between p-4"
                  style={{ background: '#f5f2ea' }}
                >
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-mono text-sm font-bold" style={{ color: '#0a0a0a' }}>
                      {formatDate(batch.created_at)}
                    </span>
                    <BatchStatusBadge status={batch.status} />
                    {inv && (
                      inv.paid
                        ? <span className="text-xs font-semibold" style={{ color: '#2a7a2a' }}>
                            Paid{inv.payment_method ? ` (${inv.payment_method})` : ''}
                          </span>
                        : <span className="text-xs font-semibold" style={{ color: '#e63946' }}>
                            Unpaid — ${Number(inv.amount).toFixed(2)}
                          </span>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-mono" style={{ color: '#0a0a0a' }}>
                      {totalDelivered} delivered
                    </div>
                    {batch.status !== 'delivered' && (
                      <div className="text-sm font-mono" style={{ color: '#2a7a2a' }}>
                        {totalSold} sold
                      </div>
                    )}
                  </div>
                </div>
                {/* Flavor breakdown grid */}
                <div
                  className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4"
                  style={{ borderTop: '1px solid #e2ddd0' }}
                >
                  {items.map(item => (
                    <div
                      key={item.id}
                      className="p-3"
                      style={{ borderRight: '1px solid #f0ece0', borderBottom: '1px solid #f0ece0' }}
                    >
                      <div className="text-xs font-semibold mb-1" style={{ color: '#0a0a0a' }}>
                        {item.flavor?.name}
                      </div>
                      <div className="flex gap-3 text-xs font-mono">
                        <span style={{ color: '#555555' }}>
                          del <strong style={{ color: '#a0a0a0' }}>{item.qty_delivered}</strong>
                        </span>
                        {item.qty_sold != null && (
                          <span style={{ color: '#2a7a2a' }}>
                            sold <strong>{item.qty_sold}</strong>
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

