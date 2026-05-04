import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom"
import { Suspense, lazy, useEffect } from "react"
import { UserProvider } from "../context/UserContext"
import { useInstantAuth } from "../hooks/useInstantAuth"
import { useInstantNavigation } from "../hooks/useInstantNavigation"
import AuthGuard from "./AuthGuard"
import RoleGuard from "./RoleGuard"
import OnboardingGuard from "../components/OnboardingGuard"
import { ROLES } from "../lib/roles"
import { Capacitor } from "@capacitor/core"
import { App as CapacitorApp } from "@capacitor/app"
import Dashboard from "../pages/dashboard/Dashboard"
import Inventory from "../pages/inventory/Inventory"
import Transactions from "../pages/transactions/Transactions"
import Settings from "../pages/settings/Settings"

const SignIn = lazy(() => import("../pages/auth/SignIn"))
const SignUp = lazy(() => import("../pages/auth/SignUp"))
const ForgotPassword = lazy(() => import("../pages/auth/ForgotPassword"))
const ResetPassword = lazy(() => import("../pages/auth/ResetPassword"))
const AuthCallback = lazy(() => import("../pages/auth/AuthCallback"))
const AddEmployees = lazy(() => import("../pages/onboarding/AddEmployees"))
const Done = lazy(() => import("../pages/onboarding/Done"))
const NewStock = lazy(() => import("../pages/inventory/NewStock"))
const ProductDetail = lazy(() => import("../pages/inventory/ProductDetail"))
const StockTake = lazy(() => import("../pages/inventory/StockTake"))
const AddSale = lazy(() => import("../pages/transactions/AddSale"))
const AddExpense = lazy(() => import("../pages/transactions/AddExpense"))
const AddTransfer = lazy(() => import("../pages/transactions/AddTransfer"))
const Business = lazy(() => import("../pages/settings/Business"))
const General = lazy(() => import("../pages/settings/General"))
const Employees = lazy(() => import("../pages/settings/Employees"))
const Branches = lazy(() => import("../pages/settings/Branches"))
const BranchDetail = lazy(() => import("../pages/settings/BranchDetail"))
const BranchEmployees = lazy(() => import("../pages/settings/BranchEmployees"))
const EmployeeDetail = lazy(() => import("../pages/settings/EmployeeDetail"))
const Suppliers = lazy(() => import("../pages/settings/Suppliers"))
const ChangePassword = lazy(() => import("../pages/settings/ChangePassword"))
const Support = lazy(() => import("../pages/settings/Support"))
const Float = lazy(() => import("../pages/settings/Float"))
const SalesReport = lazy(() => import("../pages/settings/salesReport"))
const ProfitLossReport = lazy(() => import("../pages/settings/profitlossreport"))

// Instant loading fallback component
const InstantLoadingFallback = () => (
  <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-zinc-700 border-t-emerald-500 rounded-full animate-spin" />
  </div>
)

function AppRouterContent() {
  const { user, loading: authLoading, initialized } = useInstantAuth()
  const { preloadLikelyPages } = useInstantNavigation()
  const location = useLocation()
  const navigate = useNavigate()

  // Pre-load likely pages based on current route
  useEffect(() => {
    if (!authLoading && user) {
      const currentPath = window.location.pathname
      preloadLikelyPages(currentPath)
    }
  }, [authLoading, user, preloadLikelyPages])

  useEffect(() => {
    if (Capacitor.getPlatform() !== "android") return

    let handle
    const isSettingsChild = location.pathname.startsWith("/settings/") && location.pathname !== "/settings"

    const registerBackHandler = async () => {
      handle = await CapacitorApp.addListener("backButton", ({ canGoBack }) => {
        if (isSettingsChild) {
          if (window.history.length > 1) {
            navigate(-1)
          } else {
            navigate("/settings", { replace: true })
          }
          return
        }

        if (canGoBack) {
          window.history.back()
        }
      })
    }

    registerBackHandler()

    return () => {
      handle?.remove()
    }
  }, [location.pathname, navigate])

  // Show instant loading or content
  if (authLoading && !initialized) {
    return <InstantLoadingFallback />
  }

  return (
    <Suspense fallback={<InstantLoadingFallback />}>
      <Routes>
      {/* Public routes */}
      <Route path="/" element={<SignIn />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/auth/callback" element={<AuthCallback />} />

      {/* Protected routes */}
      {/* Onboarding - Owner only */}
      <Route
        path="/onboarding"
        element={
          <AuthGuard>
            <RoleGuard roles={[ROLES.OWNER]}>
              <OnboardingGuard>
                <Suspense fallback={<InstantLoadingFallback />}>
                  <AddEmployees />
                </Suspense>
              </OnboardingGuard>
            </RoleGuard>
          </AuthGuard>
        }
      />
      <Route
        path="/onboarding/done"
        element={
          <AuthGuard>
            <RoleGuard roles={[ROLES.OWNER]}>
              <OnboardingGuard>
                <Suspense fallback={<InstantLoadingFallback />}>
                  <Done />
                </Suspense>
              </OnboardingGuard>
            </RoleGuard>
          </AuthGuard>
        }
      />

      {/* Main app routes */}
      <Route
        path="/dashboard"
        element={
          <AuthGuard>
            <Suspense fallback={<InstantLoadingFallback />}>
              <Dashboard />
            </Suspense>
          </AuthGuard>
        }
      />
      <Route
        path="/inventory"
        element={
          <AuthGuard>
            <Suspense fallback={<InstantLoadingFallback />}>
              <Inventory />
            </Suspense>
          </AuthGuard>
        }
      />
      <Route
        path="/inventory/new-stock"
        element={
          <AuthGuard>
            <RoleGuard roles={[ROLES.OWNER, ROLES.MANAGER]}>
              <Suspense fallback={<InstantLoadingFallback />}>
                <NewStock />
              </Suspense>
            </RoleGuard>
          </AuthGuard>
        }
      />
      <Route
        path="/inventory/product/:id"
        element={
          <AuthGuard>
            <Suspense fallback={<InstantLoadingFallback />}>
              <ProductDetail />
            </Suspense>
          </AuthGuard>
        }
      />
      <Route
        path="/inventory/stock-take"
        element={
          <AuthGuard>
            <RoleGuard roles={[ROLES.OWNER, ROLES.MANAGER]}>
              <Suspense fallback={<InstantLoadingFallback />}>
                <StockTake />
              </Suspense>
            </RoleGuard>
          </AuthGuard>
        }
      />
      <Route path="/inventory/stocktake" element={<Navigate to="/inventory/stock-take" replace />} />
      <Route
        path="/transactions"
        element={
          <AuthGuard>
            <Suspense fallback={<InstantLoadingFallback />}>
              <Transactions />
            </Suspense>
          </AuthGuard>
        }
      />
      <Route
        path="/transactions/add-sale"
        element={
          <AuthGuard>
            <Suspense fallback={<InstantLoadingFallback />}>
              <AddSale />
            </Suspense>
          </AuthGuard>
        }
      />
      <Route path="/transactions/sale" element={<Navigate to="/transactions/add-sale" replace />} />
      <Route
        path="/transactions/add-expense"
        element={
          <AuthGuard>
            <RoleGuard roles={[ROLES.OWNER, ROLES.MANAGER, ROLES.CASHIER]}>
              <Suspense fallback={<InstantLoadingFallback />}>
                <AddExpense />
              </Suspense>
            </RoleGuard>
          </AuthGuard>
        }
      />
      <Route
        path="/transactions/transfer"
        element={
          <AuthGuard>
            <RoleGuard roles={[ROLES.OWNER, ROLES.MANAGER]}>
              <Suspense fallback={<InstantLoadingFallback />}>
                <AddTransfer />
              </Suspense>
            </RoleGuard>
          </AuthGuard>
        }
      />

      {/* Settings routes */}
      <Route
        path="/settings"
        element={
          <AuthGuard>
            <Suspense fallback={<InstantLoadingFallback />}>
              <Settings />
            </Suspense>
          </AuthGuard>
        }
      />
      <Route
        path="/settings/branches"
        element={
          <AuthGuard>
            <RoleGuard roles={[ROLES.OWNER]}>
              <Suspense fallback={<InstantLoadingFallback />}>
                <Branches />
              </Suspense>
            </RoleGuard>
          </AuthGuard>
        }
      />
      <Route
        path="/settings/branches/:id"
        element={
          <AuthGuard>
            <RoleGuard roles={[ROLES.OWNER]}>
              <Suspense fallback={<InstantLoadingFallback />}>
                <BranchDetail />
              </Suspense>
            </RoleGuard>
          </AuthGuard>
        }
      />
      <Route
        path="/settings/branch-employees"
        element={
          <AuthGuard>
            <RoleGuard roles={[ROLES.OWNER, ROLES.MANAGER]}>
              <Suspense fallback={<InstantLoadingFallback />}>
                <BranchEmployees />
              </Suspense>
            </RoleGuard>
          </AuthGuard>
        }
      />
      <Route
        path="/settings/employees/:id"
        element={
          <AuthGuard>
            <RoleGuard roles={[ROLES.OWNER, ROLES.MANAGER]}>
              <Suspense fallback={<InstantLoadingFallback />}>
                <EmployeeDetail />
              </Suspense>
            </RoleGuard>
          </AuthGuard>
        }
      />
      <Route
        path="/settings/business"
        element={
          <AuthGuard>
            <RoleGuard roles={[ROLES.OWNER, ROLES.MANAGER]}>
              <Suspense fallback={<InstantLoadingFallback />}>
                <Business />
              </Suspense>
            </RoleGuard>
          </AuthGuard>
        }
      />
      <Route
        path="/settings/general"
        element={
          <AuthGuard>
            <RoleGuard roles={[ROLES.OWNER, ROLES.MANAGER]}>
              <Suspense fallback={<InstantLoadingFallback />}>
                <General />
              </Suspense>
            </RoleGuard>
          </AuthGuard>
        }
      />
      <Route
        path="/settings/employees"
        element={
          <AuthGuard>
            <RoleGuard roles={[ROLES.OWNER, ROLES.MANAGER]}>
              <Suspense fallback={<InstantLoadingFallback />}>
                <Employees />
              </Suspense>
            </RoleGuard>
          </AuthGuard>
        }
      />
      <Route
        path="/settings/suppliers"
        element={
          <AuthGuard>
            <RoleGuard roles={[ROLES.OWNER, ROLES.MANAGER]}>
              <Suspense fallback={<InstantLoadingFallback />}>
                <Suppliers />
              </Suspense>
            </RoleGuard>
          </AuthGuard>
        }
      />
      <Route
        path="/settings/float"
        element={
          <AuthGuard>
            <RoleGuard roles={[ROLES.OWNER, ROLES.MANAGER]}>
              <Suspense fallback={<InstantLoadingFallback />}>
                <Float />
              </Suspense>
            </RoleGuard>
          </AuthGuard>
        }
      />
      <Route
        path="/settings/change-password"
        element={
          <AuthGuard>
            <Suspense fallback={<InstantLoadingFallback />}>
              <ChangePassword />
            </Suspense>
          </AuthGuard>
        }
      />
      <Route path="/settings/password" element={<Navigate to="/settings/change-password" replace />} />
      <Route
        path="/settings/support"
        element={
          <AuthGuard>
            <Suspense fallback={<InstantLoadingFallback />}>
              <Support />
            </Suspense>
          </AuthGuard>
        }
      />
      <Route
        path="/settings/sales-report"
        element={
          <AuthGuard>
            <RoleGuard roles={[ROLES.OWNER, ROLES.MANAGER]}>
              <Suspense fallback={<InstantLoadingFallback />}>
                <SalesReport />
              </Suspense>
            </RoleGuard>
          </AuthGuard>
        }
      />
      <Route path="/settings/reports/sales" element={<Navigate to="/settings/sales-report" replace />} />
      <Route
        path="/settings/profit-loss"
        element={
          <AuthGuard>
            <RoleGuard roles={[ROLES.OWNER, ROLES.MANAGER]}>
              <Suspense fallback={<InstantLoadingFallback />}>
                <ProfitLossReport />
              </Suspense>
            </RoleGuard>
          </AuthGuard>
        }
      />
      <Route path="/settings/reports/pl" element={<Navigate to="/settings/profit-loss" replace />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  )
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <UserProvider>
        <AppRouterContent />
      </UserProvider>
    </BrowserRouter>
  )
}
