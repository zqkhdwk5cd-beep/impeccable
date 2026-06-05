import React from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard, Smartphone, ShoppingCart, Tag, Users, FileText,
  BarChart3, Search, Settings, HardDrive, Lock, Store, ChevronLeft
} from 'lucide-react'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'لوحة التحكم', exact: true },
  { to: '/devices', icon: Smartphone, label: 'المخزون' },
  { to: '/purchases/new', icon: ShoppingCart, label: 'إضافة شراء' },
  { to: '/sell', icon: Tag, label: 'بيع جهاز' },
  { to: '/contacts', icon: Users, label: 'العملاء والبائعين' },
  { to: '/invoices', icon: FileText, label: 'الفواتير' },
  { to: '/reports', icon: BarChart3, label: 'التقارير' },
  { to: '/search', icon: Search, label: 'البحث' },
  { to: '/private', icon: Lock, label: 'Private' },
  { to: '/settings', icon: Settings, label: 'الإعدادات' },
  { to: '/backups', icon: HardDrive, label: 'النسخ الاحتياطي' },
]

interface Props {
  open: boolean
  onToggle: () => void
}

export default function Sidebar({ open, onToggle }: Props) {
  const { user } = useAuth()

  return (
    <aside
      className={`flex flex-col bg-slate-900 text-white transition-all duration-300 ${open ? 'w-64' : 'w-16'} flex-shrink-0`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-700">
        <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center flex-shrink-0">
          <Store className="w-5 h-5 text-white" />
        </div>
        {open && (
          <div className="overflow-hidden">
            <div className="font-bold text-base leading-tight">Team Store</div>
            <div className="text-xs text-slate-400">إدارة الأجهزة</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {open && <span className="truncate">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User info */}
      {open && user && (
        <div className="border-t border-slate-700 p-4">
          <div className="text-sm font-medium text-white truncate">{user.name}</div>
          <div className="text-xs text-slate-400">{user.role === 'admin' ? 'مدير' : 'موظف'}</div>
        </div>
      )}
    </aside>
  )
}
