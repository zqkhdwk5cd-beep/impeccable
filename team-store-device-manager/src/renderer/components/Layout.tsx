import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'

interface Props {
  children: React.ReactNode
}

export default function Layout({ children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      <div className="print-app-shell">
        <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      </div>
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="print-app-shell">
          <TopBar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        </div>
        <main className="flex-1 overflow-y-auto p-6 print-main">
          {children}
        </main>
      </div>
    </div>
  )
}
