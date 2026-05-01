import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { Suspense, useEffect } from "react"
import { UserProvider } from "../context/UserContext"
import { useInstantAuth } from "../hooks/useInstantAuth"
import { useInstantNavigation } from "../hooks/useInstantNavigation"
import SignIn from "../pages/auth/SignIn"
import SignUp from "../pages/auth/SignUp"
import ForgotPassword from "../pages/auth/ForgotPassword"
import ResetPassword from "../pages/auth/ResetPassword"
import AuthCallback from "../pages/auth/AuthCallback"
import AddEmployees from "../pages/onboarding/AddEmployees"
import Done from "../pages/onboarding/Done"
import Dashboard from "../pages/dashboard/Dashboard"
import Inventory from "../pages/inventory/Inventory"
import NewStock from "../pages/inventory/NewStock"
import ProductDetail from "../pages/inventory/ProductDetail"
import StockTake from "../pages/inventory/StockTake"
import Transactions from "../pages/transactions/Transactions"
import AddSale from "../pages/transactions/AddSale"
import AddExpense from "../pages/transactions/AddExpense"
import Settings from "../pages/settings/Settings"
import Business from "../pages/settings/Business"
import General from "../pages/settings/General"
import Employees from "../pages/settings/Employees"
import EmployeeDetails from "../pages/settings/EmployeeDetails"
import Suppliers from "../pages/settings/Suppliers"
import ChangePassword from "../pages/settings/ChangePassword"
import Support from "../pages/settings/Support"
import Float from "../pages/settings/Float"
import SalesReport from "../pages/settings/salesReport"
import ProfitLossReport from "../pages/settings/profitlossreport"
import AddTransfer from "../pages/transactions/AddTransfer"
import AuthGuard from "./AuthGuard"
import RoleGuard from "./RoleGuard"
import OnboardingGuard from "../components/OnboardingGuard"
import { ROLES } from "../lib/roles"

// Instant loading fallback component
const InstantLoadingFallback = () => (
  <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-zinc-700 border-t-emerald-500 rounded-full animate-spin" />
  </div>
)

function AppRouterContent() {
  const { user, loading: authLoading, initialized } = useInstantAuth()
  const { preloadLikelyPages } = useInstantNavigation()

  // Pre-load likely pages based on current route
  useEffect(() => {
    if (!authLoading && user) {
      const currentPath = window.location.pathname
      preloadLikelyPages(currentPath)
    }
  }, [authLoading, user, preloadLikelyPages])

  // Show instant loading or content
  if (authLoading && !initialized) {
    return <InstantLoadingFallback />
  }

  return (
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
      <Route
        path="/transactions/add-expense"
        element={
          <AuthGuard>
            <RoleGuard roles={[ROLES.OWNER, ROLES.MANAGER]}>
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
        path="/settings/employees/:id"
        element={
          <AuthGuard>
            <RoleGuard roles={[ROLES.OWNER, ROLES.MANAGER]}>
              <Suspense fallback={<InstantLoadingFallback />}>
                <EmployeeDetails />
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

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
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
