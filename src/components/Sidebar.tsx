import { useState, useEffect } from 'react'
import { APP_CONFIG } from '../types'

type Menu = { id: string; label: string; icon: string }

export function Sidebar({
  activeMenu,
  setActiveMenu,
  sidebarOpen,
  setSidebarOpen,
  supabaseUrl,
  menus,
  appSettings: propSettings,
}: {
  activeMenu: string
  setActiveMenu: (s: string) => void
  sidebarOpen: boolean
  setSidebarOpen: (b: boolean) => void
  supabaseUrl: string
  menus: Menu[]
  appSettings?: any
}) {
  const [appSettings, setAppSettings] = useState<any>(propSettings || {})

  useEffect(() => {
    const load = () => {
      try {
        const s = localStorage.getItem('mrh_app_settings')
        if (s) setAppSettings({ ...JSON.parse(s), ...propSettings })
        else if (propSettings) setAppSettings(propSettings)
      } catch {}
    }
    load()
    const interval = setInterval(load, 1000)
    return () => clearInterval(interval)
  }, [propSettings])

  const companyName = appSettings.company_name || ''
  const logoUrl = appSettings.logo_url || ''
  const hasCustomBranding = !!(logoUrl || companyName)

  return (
    <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-slate-900 text-white fixed h-full z-20 flex flex-col transition-all`}>
      <div className="p-4 border-b border-slate-700 flex justify-between items-center">
        {sidebarOpen && (
          <div className="min-w-0 flex-1">
            {hasCustomBranding ? (
              <div className="flex items-center gap-2">
                {logoUrl ? <img src={logoUrl} alt="Logo" className="w-8 h-8 object-contain bg-white rounded p-1" /> : <div className="w-8 h-8 bg-white rounded flex items-center justify-center text-blue-900 font-black text-[10px]">MRH</div>}
                <div className="min-w-0">
                  <div className="font-bold text-sm leading-tight truncate">{companyName || 'PT MRH DigitalHub'}</div>
                  <div className="text-[10px] text-slate-400 truncate">{appSettings.company_tagline_1 || 'Construction Safety'}</div>
                </div>
              </div>
            ) : (
              <div>
                <div className="font-bold text-sm leading-tight">{APP_CONFIG.APP_NAME}</div>
                <div className="text-[11px] text-slate-400 leading-tight">{APP_CONFIG.VERSION} - PERMANEN</div>
              </div>
            )}
          </div>
        )}
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="bg-slate-800 p-2 rounded flex-shrink-0">
          {sidebarOpen ? '◀' : '▶'}
        </button>
      </div>

      <nav className="flex-1 p-2 space-y-1 mt-2 overflow-auto">
        {menus.map((m) => (
          <button
            key={m.id}
            onClick={() => setActiveMenu(m.id)}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded text-xs ${activeMenu === m.id ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
          >
            <span>{m.icon}</span>
            {sidebarOpen && <span className="truncate">{m.label}</span>}
          </button>
        ))}
      </nav>

      <div className="p-2 border-t border-slate-700">
        {/* FIX 4: LIVE DIHILANGKAN - Sesuai request Bapak - Kosongkan footer */}
        {sidebarOpen && (
          <div className="text-[10px] text-slate-500 p-2 text-center">
            {companyName ? companyName : 'PERMANEN - NO EXPIRY'}
          </div>
        )}
      </div>
    </aside>
  )
}
