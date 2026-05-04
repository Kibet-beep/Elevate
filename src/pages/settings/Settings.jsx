// src/pages/settings/Settings.jsx
import { useNavigate } from "react-router-dom"
import { MapPin } from "lucide-react"
import FloatingBottomNav from "../../components/layout/FloatingBottomNav"
import { AppShell, UiButton, UiCard } from "../../components/ui"
import { BarChart2, Building2, ChevronRight, LifeBuoy, LockKeyhole, Package, Settings2, Shield, TrendingUp, Wallet } from "../../lib/icons"
import { useUser, useIsOwner, useIsOwnerOrManager } from "../../hooks/useRole"
import { useInstantAuth } from "../../hooks/useInstantAuth"
import { getRoleDisplayName } from "../../lib/roles"
 
export function Settings() {
  const navigate = useNavigate()
  const { user: authUser, userRole, logout } = useUser()
  const { business } = useInstantAuth()
  const isOwner = useIsOwner()
  const isOwnerOrManager = useIsOwnerOrManager()
 
  const handleSignOut = async () => {
    await logout()
    navigate("/")
  }
 
  // Dynamically build menu sections based on role
  const getMenuSections = () => {
    const sections = []

    // Admin section - Owner and Manager
    if (isOwnerOrManager) {
      sections.push({
        title: "Admin",
        items: [
          { label: "Opening stock", desc: "Set starting quantities and stock take date", path: "/settings/opening-stock", icon: Package },
          { label: "Suppliers", desc: "Manage suppliers", path: "/settings/suppliers", icon: Package },
        ]
      })
    }

    // Business section - Owner only
    if (isOwner) {
      sections.push({
        title: "Business",
        items: [
          { label: "Branches", desc: "Manage business locations", path: "/settings/branches", icon: MapPin },
          { label: "Business details", desc: "Name, location, KRA PIN", path: "/settings/business", icon: Building2 },
        ]
      })
    }

    // Accounts section - Owner only
    if (isOwner) {
      sections.push({
        title: "Accounts",
        items: [
          { label: "Float", desc: "Set your opening cash, M-Pesa and bank balances", path: "/settings/float", icon: Wallet },
        ]
      })
    }

    // Reports section - Owner and Manager
    if (isOwnerOrManager) {
      sections.push({
        title: "Reports",
        items: [
          { label: "Sales Records", desc: "Daily, weekly, monthly and quarterly sales breakdown", path: "/settings/sales-report", icon: BarChart2 },
          { label: "Profit & Loss", desc: "Revenue, COGS, gross profit and net profit by period", path: "/settings/profit-loss", icon: TrendingUp },
        ]
      })
    }

    // Preferences section - Owner only
    if (isOwner) {
      sections.push({
        title: "Preferences",
        items: [
          { label: "General", desc: "VAT rate, low stock threshold", path: "/settings/general", icon: Settings2 },
        ]
      })
    }

    // Security section - All roles
    sections.push({
      title: "Security",
      items: [
        { label: "Change password", desc: "Update your password", path: "/settings/change-password", icon: LockKeyhole },
      ]
    })

    // Help section - Owner only
    if (isOwner) {
      sections.push({
        title: "Help",
        items: [
          { label: "Contact support", desc: "Get help from the team", path: "/settings/support", icon: LifeBuoy },
        ]
      })
    }

    return sections
  }

  const menuSections = getMenuSections()
 
  return (
    <AppShell
      title="Settings"
      subtitle={business?.name}
      showHeader={false}
      right={<UiButton variant="secondary" size="sm" onClick={handleSignOut}>Sign out</UiButton>}
    >
      <div className="space-y-6">
        <UiCard className="overflow-hidden border-white/6 bg-[linear-gradient(135deg,rgba(16,185,129,0.12),rgba(39,39,42,0.92)_55%,rgba(9,9,11,0.98))] p-5 sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/15 bg-emerald-500/10 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-emerald-200">
                <Shield className="h-3.5 w-3.5" />
                Control center
              </div>
              <div>
                <p className="text-sm text-zinc-400">Signed in as {authUser?.full_name || authUser?.email}</p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-3xl">Keep the business profile, team, and policies in one place.</h2>
              </div>
            </div>
            <div className="grid gap-2 sm:min-w-56">
              {isOwner && (
                <UiButton variant="secondary" className="justify-between rounded-2xl px-4 py-3" onClick={() => navigate("/settings/business")}>Business details <ChevronRight className="h-4 w-4" /></UiButton>
              )}
              <UiButton variant="primary" className="justify-between rounded-2xl px-4 py-3" onClick={handleSignOut}>Sign out <ChevronRight className="h-4 w-4" /></UiButton>
            </div>
          </div>
        </UiCard>
 
        <UiCard className="p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0 text-emerald-300 font-bold text-lg">{(authUser?.full_name || authUser?.email || "?").charAt(0).toUpperCase()}</div>
          <div className="min-w-0">
            <p className="truncate text-white font-semibold text-sm">{authUser?.full_name}</p>
            <p className="truncate text-zinc-500 text-xs">{authUser?.email}</p>
            <span className="mt-1 inline-flex rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs capitalize text-emerald-300">{getRoleDisplayName(userRole)}</span>
          </div>
        </UiCard>
 
        <div className="grid gap-3 md:grid-cols-2">
          {menuSections.map((section) => (
            <UiCard key={section.title} className="overflow-hidden">
              <div className="border-b border-zinc-800 px-4 py-3">
                <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-zinc-500">{section.title}</p>
              </div>
              <div>
                {section.items.map((item, j) => {
                  const Icon = item.icon
                  return (
                    <button
                      key={item.label}
                      onClick={() => navigate(item.path)}
                      className={`flex w-full items-center gap-4 px-4 py-4 text-left transition-colors hover:bg-zinc-800/70 ${j < section.items.length - 1 ? "border-b border-zinc-800" : ""}`}
                    >
                      <div className="rounded-2xl border border-white/6 bg-emerald-500/10 p-3 text-emerald-300"><Icon className="h-4 w-4" /></div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white">{item.label}</p>
                        <p className="text-xs text-zinc-500">{item.desc}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-zinc-600" />
                    </button>
                  )
                })}
              </div>
            </UiCard>
          ))}
        </div>
 
        <p className="text-center text-zinc-700 text-xs">Elevate MVP · Built for Kenyan SMEs</p>
      </div>
 
      <FloatingBottomNav active="settings" />
    </AppShell>
  )
}
 
export default Settings