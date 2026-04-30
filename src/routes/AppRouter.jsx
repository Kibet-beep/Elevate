import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { UserProvider } from "../context/UserContext"
import SignIn from "../pages/auth/SignIn"
import SignUp from "../pages/auth/SignUp"
import ForgotPassword from "../pages/auth/ForgotPassword"
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
import { ROLES } from "../lib/roles"

export default function AppRouter() {
  return (
    <BrowserRouter>
      <UserProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/auth/callback" element={<AuthCallback />} />

          {/* Protected routes */}
          {/* Onboarding - Owner only */}
          <Route
            path="/onboarding"
            element={
              <AuthGuard>
                <RoleGuard requiredRoles={[ROLES.OWNER]}>
                  <AddEmployees />
                </RoleGuard>
              </AuthGuard>
            }
          />
          <Route
            path="/onboarding/done"
            element={
              <AuthGuard>
                <RoleGuard requiredRoles={[ROLES.OWNER]}>
                  <Done />
                </RoleGuard>
              </AuthGuard>
            }
          />

          {/* Dashboard - All roles */}
          <Route
            path="/dashboard"
            element={
              <AuthGuard>
                <Dashboard />
              </AuthGuard>
            }
          />

          {/* Inventory */}
          <Route
            path="/inventory"
            element={
              <AuthGuard>
                <Inventory />
              </AuthGuard>
            }
          />
          <Route
            path="/inventory/new-stock"
            element={
              <AuthGuard>
                <RoleGuard requiredRoles={[ROLES.OWNER, ROLES.MANAGER]}>
                  <NewStock />
                </RoleGuard>
              </AuthGuard>
            }
          />
          <Route
            path="/inventory/product/:id"
            element={
              <AuthGuard>
                <ProductDetail />
              </AuthGuard>
            }
          />
          <Route
            path="/inventory/stocktake"
            element={
              <AuthGuard>
                <RoleGuard requiredRoles={[ROLES.OWNER, ROLES.MANAGER]}>
                  <StockTake />
                </RoleGuard>
              </AuthGuard>
            }
          />

          {/* Transactions */}
          <Route
            path="/transactions"
            element={
              <AuthGuard>
                <Transactions />
              </AuthGuard>
            }
          />
          <Route
            path="/transactions/add-sale"
            element={
              <AuthGuard>
                <AddSale />
              </AuthGuard>
            }
          />
          <Route
            path="/transactions/add-expense"
            element={
              <AuthGuard>
                <RoleGuard requiredRoles={[ROLES.OWNER, ROLES.MANAGER]}>
                  <AddExpense />
                </RoleGuard>
              </AuthGuard>
            }
          />
          <Route
            path="/transactions/sale"
            element={
              <AuthGuard>
                <AddSale />
              </AuthGuard>
            }
          />
          <Route
            path="/transactions/expense"
            element={
              <AuthGuard>
                <RoleGuard requiredRoles={[ROLES.OWNER, ROLES.MANAGER]}>
                  <AddExpense />
                </RoleGuard>
              </AuthGuard>
            }
          />
          <Route
            path="/transactions/transfer"
            element={
              <AuthGuard>
                <RoleGuard requiredRoles={[ROLES.OWNER, ROLES.MANAGER]}>
                  <AddTransfer />
                </RoleGuard>
              </AuthGuard>
            }
          />

          {/* Settings */}
          <Route
            path="/settings"
            element={
              <AuthGuard>
                <Settings />
              </AuthGuard>
            }
          />
          <Route
            path="/settings/business"
            element={
              <AuthGuard>
                <RoleGuard requiredRoles={[ROLES.OWNER]}>
                  <Business />
                </RoleGuard>
              </AuthGuard>
            }
          />
          <Route
            path="/settings/general"
            element={
              <AuthGuard>
                <RoleGuard requiredRoles={[ROLES.OWNER]}>
                  <General />
                </RoleGuard>
              </AuthGuard>
            }
          />
          <Route
            path="/settings/employees"
            element={
              <AuthGuard>
                <RoleGuard requiredRoles={[ROLES.OWNER, ROLES.MANAGER]}>
                  <Employees />
                </RoleGuard>
              </AuthGuard>
            }
          />
          <Route
            path="/settings/employees/:id"
            element={
              <AuthGuard>
                <RoleGuard requiredRoles={[ROLES.OWNER, ROLES.MANAGER]}>
                  <EmployeeDetails />
                </RoleGuard>
              </AuthGuard>
            }
          />
          <Route
            path="/settings/suppliers"
            element={
              <AuthGuard>
                <RoleGuard requiredRoles={[ROLES.OWNER, ROLES.MANAGER]}>
                  <Suppliers />
                </RoleGuard>
              </AuthGuard>
            }
          />
          <Route
            path="/settings/password"
            element={
              <AuthGuard>
                <ChangePassword />
              </AuthGuard>
            }
          />
          <Route
            path="/settings/support"
            element={
              <AuthGuard>
                <RoleGuard requiredRoles={[ROLES.OWNER]}>
                  <Support />
                </RoleGuard>
              </AuthGuard>
            }
          />
          <Route
            path="/settings/float"
            element={
              <AuthGuard>
                <RoleGuard requiredRoles={[ROLES.OWNER]}>
                  <Float />
                </RoleGuard>
              </AuthGuard>
            }
          />
          <Route
            path="/settings/reports/sales"
            element={
              <AuthGuard>
                <RoleGuard requiredRoles={[ROLES.OWNER, ROLES.MANAGER]}>
                  <SalesReport />
                </RoleGuard>
              </AuthGuard>
            }
          />
          <Route
            path="/settings/reports/pl"
            element={
              <AuthGuard>
                <RoleGuard requiredRoles={[ROLES.OWNER, ROLES.MANAGER]}>
                  <ProfitLossReport />
                </RoleGuard>
              </AuthGuard>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </UserProvider>
    </BrowserRouter>
  )
}



