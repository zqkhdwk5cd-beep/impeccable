import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Menu, Search, X } from 'lucide-react'
import { api } from '../lib/api'

interface Props {
  onToggleSidebar: () => void
}

export default function TopBar({ onToggleSidebar }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const handler = setTimeout(async () => {
      if (query.trim().length >= 2) {
        setLoading(true)
        try {
          const res = await api.search.global(query)
          setResults(res)
          setShowResults(true)
        } catch {}
        setLoading(false)
      } else {
        setResults([])
        setShowResults(false)
      }
    }, 300)
    return () => clearTimeout(handler)
  }, [query])

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const handleSelect = (result: any) => {
    setQuery('')
    setShowResults(false)
    if (result.type === 'device') navigate(`/devices/${result.id}`)
    else if (result.type === 'contact') navigate(`/contacts/${result.id}`)
    else if (result.type === 'invoice') navigate(`/invoices/${result.id}`)
    else if (result.type === 'purchase' || result.type === 'sale') navigate(`/search?q=${query}`)
  }

  const typeLabels: Record<string, string> = {
    device: 'جهاز',
    contact: 'جهة اتصال',
    invoice: 'فاتورة',
    purchase: 'شراء',
    sale: 'بيع',
  }

  const typeColors: Record<string, string> = {
    device: 'bg-blue-100 text-blue-700',
    contact: 'bg-purple-100 text-purple-700',
    invoice: 'bg-green-100 text-green-700',
    purchase: 'bg-amber-100 text-amber-700',
    sale: 'bg-emerald-100 text-emerald-700',
  }

  return (
    <header className="bg-white border-b border-slate-200 px-4 h-14 flex items-center gap-4 flex-shrink-0">
      <button onClick={onToggleSidebar} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
        <Menu className="w-5 h-5" />
      </button>

      <div ref={searchRef} className="relative flex-1 max-w-xl">
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
          <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="بحث بالسريال، IMEI، رقم الموبايل، رقم الفاتورة..."
            className="flex-1 bg-transparent text-sm outline-none text-slate-700 placeholder:text-slate-400"
          />
          {query && (
            <button onClick={() => { setQuery(''); setShowResults(false) }}>
              <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
            </button>
          )}
        </div>

        {showResults && (
          <div className="absolute top-full mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
            {loading ? (
              <div className="px-4 py-3 text-sm text-slate-500">جاري البحث...</div>
            ) : results.length === 0 ? (
              <div className="px-4 py-3 text-sm text-slate-500">لا توجد نتائج</div>
            ) : (
              <ul className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {results.map((r, i) => (
                  <li key={i}>
                    <button
                      onClick={() => handleSelect(r)}
                      className="w-full px-4 py-3 text-right hover:bg-slate-50 flex items-start gap-3"
                    >
                      <span className={`badge mt-0.5 flex-shrink-0 ${typeColors[r.type] || 'bg-slate-100'}`}>
                        {typeLabels[r.type]}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-800 truncate">{r.title}</div>
                        <div className="text-xs text-slate-500 truncate">{r.subtitle}</div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="px-4 py-2 bg-slate-50 border-t border-slate-100">
              <button
                onClick={() => { navigate(`/search?q=${encodeURIComponent(query)}`); setShowResults(false) }}
                className="text-xs text-brand-600 hover:text-brand-800 font-medium"
              >
                عرض جميع النتائج ←
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
