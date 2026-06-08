import React, { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { PrivateProvider } from './context/PrivateContext'
import PrivateLock from './components/PrivateLock'
import Layout from './components/Layout'
import SetupPage from './pages/Setup'
import Dashboard from './pages/Dashboard'
import DevicesPage from './pages/Devices'
import DeviceDetail from './pages/DeviceDetail'
import AddPurchase from './pages/AddPurchase'
import SellDevice from './pages/SellDevice'
import ContactsPage from './pages/Contacts'
import ContactProfile from './pages/ContactProfile'
import InvoicesPage from './pages/Invoices'
import InvoiceDetail from './pages/InvoiceDetail'

import SearchPage from './pages/Search'
import SettingsPage from './pages/Settings'
import BackupsPage from './pages/Backups'
import PaymentsPage from './pages/Payments'

import { api } from './lib/api'

function AppRoutes() {
  const { user, login } = useAuth()
  const [hasUsers, setHasUsers] = useState<boolean | null>(null)

  useEffect(() => {
    api.auth.hasUsers()
      .then(setHasUsers)
      .catch(() => setHasUsers(false))
  }, [])

  // Auto-login as the first admin whenever hasUsers becomes true and no session exists
  useEffect(() => {
    if (hasUsers === true && !user) {
      api.auth.getFirst()
        .then((u) => { if (u) login(u) })
        .catch(() => {})
    }
  }, [hasUsers]) // eslint-disable-line react-hooks/exhaustive-deps

  if (hasUsers === null || (hasUsers === true && !user)) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="text-slate-500 text-lg font-medium animate-pulse">جاري التحميل...</div>
      </div>
    )
  }

  if (!hasUsers) {
    return (
      <SetupPage onSetup={() => setHasUsers(true)} />
    )
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/devices" replace />} />
        <Route path="/dashboard" element={<PrivateLock><Dashboard /></PrivateLock>} />
        <Route path="/devices" element={<DevicesPage />} />
        <Route path="/devices/:id" element={<DeviceDetail />} />
        <Route path="/purchases/new" element={<AddPurchase />} />
        <Route path="/sell" element={<SellDevice />} />
        <Route path="/contacts" element={<ContactsPage />} />
        <Route path="/contacts/:id" element={<ContactProfile />} />
        <Route path="/invoices" element={<InvoicesPage />} />
        <Route path="/invoices/:id" element={<InvoiceDetail />} />
        <Route path="/payments" element={<PaymentsPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/settings" element={<PrivateLock><SettingsPage /></PrivateLock>} />
        <Route path="/backups" element={<BackupsPage />} />
        <Route path="*" element={<Navigate to="/devices" replace />} />
      </Routes>
    </Layout>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <PrivateProvider>
        <AppRoutes />
      </PrivateProvider>
    </AuthProvider>
  )
}
