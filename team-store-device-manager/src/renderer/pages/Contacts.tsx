import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import toast from 'react-hot-toast'
import { Search, UserPlus, Eye, Users } from 'lucide-react'

const TYPE_LABELS: Record<string, string> = { seller: 'بائع', buyer: 'مشتري', both: 'بائع ومشتري' }
const TYPE_COLORS: Record<string, string> = { seller: 'bg-orange-100 text-orange-700', buyer: 'bg-blue-100 text-blue-700', both: 'bg-purple-100 text-purple-700' }

export default function ContactsPage() {
  const navigate = useNavigate()
  const [contacts, setContacts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', secondary_phone: '', address: '', national_id: '', contact_type: 'both', notes: '' })

  const load = () => {
    api.contacts.getAll().then(setContacts).catch((e) => toast.error(e.message)).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const filtered = contacts.filter((c) => {
    if (typeFilter && c.contact_type !== typeFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return c.name?.toLowerCase().includes(q) || c.phone?.includes(q) || c.national_id?.includes(q)
    }
    return true
  })

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.phone) return toast.error('الاسم والهاتف مطلوبان')
    try {
      await api.contacts.create(form)
      toast.success('تم إضافة جهة الاتصال')
      setShowForm(false)
      setForm({ name: '', phone: '', secondary_phone: '', address: '', national_id: '', contact_type: 'both', notes: '' })
      load()
    } catch (err: any) { toast.error(err.message) }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">العملاء والبائعين</h1>
          <p className="text-slate-500 text-sm mt-1">{contacts.length} جهة اتصال</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary"><UserPlus className="w-4 h-4" /> إضافة جهة اتصال</button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="card mb-4">
          <div className="card-header"><h3 className="font-semibold">إضافة جهة اتصال جديدة</h3></div>
          <form onSubmit={handleCreate} className="card-body space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div><label className="label">الاسم *</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" /></div>
              <div><label className="label">رقم الهاتف *</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input" dir="ltr" /></div>
              <div><label className="label">رقم ثانوي</label><input value={form.secondary_phone} onChange={(e) => setForm({ ...form, secondary_phone: e.target.value })} className="input" dir="ltr" /></div>
              <div><label className="label">النوع</label>
                <select value={form.contact_type} onChange={(e) => setForm({ ...form, contact_type: e.target.value })} className="input">
                  <option value="buyer">مشتري</option><option value="seller">بائع</option><option value="both">بائع ومشتري</option>
                </select>
              </div>
              <div><label className="label">الرقم القومي</label><input value={form.national_id} onChange={(e) => setForm({ ...form, national_id: e.target.value })} className="input" dir="ltr" /></div>
              <div><label className="label">العنوان</label><input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="input" /></div>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary">حفظ</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">إلغاء</button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="card p-4 mb-4 flex items-center gap-4">
        <div className="flex items-center gap-2 flex-1">
          <Search className="w-4 h-4 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} className="input" placeholder="بحث بالاسم أو الهاتف..." />
        </div>
        <div className="flex gap-2">
          {[{ value: '', label: 'الكل' }, { value: 'buyer', label: 'مشترين' }, { value: 'seller', label: 'بائعين' }, { value: 'both', label: 'كليهما' }].map((f) => (
            <button key={f.value} onClick={() => setTypeFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${typeFilter === f.value ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div className="p-8 text-center text-slate-400">جاري التحميل...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400">لا توجد جهات اتصال</div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr><th>الاسم</th><th>الهاتف</th><th>هاتف ثانوي</th><th>النوع</th><th>الرقم القومي</th><th>العنوان</th><th>إجراءات</th></tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="cursor-pointer" onClick={() => navigate(`/contacts/${c.id}`)}>
                    <td className="font-medium">{c.name}</td>
                    <td className="font-mono text-sm">{c.phone}</td>
                    <td className="font-mono text-sm">{c.secondary_phone || '-'}</td>
                    <td><span className={`badge ${TYPE_COLORS[c.contact_type]}`}>{TYPE_LABELS[c.contact_type]}</span></td>
                    <td className="font-mono text-xs">{c.national_id || '-'}</td>
                    <td className="text-sm">{c.address || '-'}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => navigate(`/contacts/${c.id}`)} className="btn-ghost btn-sm p-1"><Eye className="w-3.5 h-3.5" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
