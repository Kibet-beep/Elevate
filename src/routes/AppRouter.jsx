import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
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
import Suppliers from "../pages/settings/Suppliers"
import ChangePassword from "../pages/settings/ChangePassword"
import Support from "../pages/settings/Support"
import Float from "../pages/settings/Float"
import SalesReport from "../pages/settings/salesReport"
import ProfitLossReport from "../pages/settings/profitlossreport"
import AddTransfer from "../pages/transactions/AddTransfer"
import AuthGuard from "./AuthGuard"



export default function AppRouter() {
  return (
  <BrowserRouter>
  <Routes>
    {/* Public routes */}
    <Route path="/" element={<SignIn />} />
    <Route path="/signup" element={<SignUp />} />
    <Route path="/forgot-password" element={<ForgotPassword />} />
    <Route path="/auth/callback" element={<AuthCallback />} />

    {/* Protected routes */}
    <Route path="/onboarding" element={<AuthGuard><AddEmployees /></AuthGuard>} />
    <Route path="/onboarding/done" element={<AuthGuard><Done /></AuthGuard>} />
    <Route path="/dashboard" element={<AuthGuard><Dashboard /></AuthGuard>} />
    <Route path="/inventory" element={<AuthGuard><Inventory /></AuthGuard>} />
    <Route path="/inventory/new-stock" element={<AuthGuard><NewStock /></AuthGuard>} />
    <Route path="/inventory/product/:id" element={<AuthGuard><ProductDetail /></AuthGuard>} />
    <Route path="/inventory/stocktake" element={<AuthGuard><StockTake /></AuthGuard>} />
    <Route path="/transactions" element={<AuthGuard><Transactions /></AuthGuard>} />
    <Route path="/transactions/add-sale" element={<AuthGuard><AddSale /></AuthGuard>} />
    <Route path="/transactions/add-expense" element={<AuthGuard><AddExpense /></AuthGuard>} />
    <Route path="/transactions/sale" element={<AuthGuard><AddSale /></AuthGuard>} />
    <Route path="/transactions/expense" element={<AuthGuard><AddExpense /></AuthGuard>} />
    <Route path="/transactions/transfer" element={<AuthGuard><AddTransfer /></AuthGuard>} />
    <Route path="/settings" element={<AuthGuard><Settings /></AuthGuard>} />
    <Route path="/settings/business" element={<AuthGuard><Business /></AuthGuard>} />
    <Route path="/settings/general" element={<AuthGuard><General /></AuthGuard>} />
    <Route path="/settings/employees" element={<AuthGuard><Employees /></AuthGuard>} />
    <Route path="/settings/suppliers" element={<AuthGuard><Suppliers /></AuthGuard>} />
    <Route path="/settings/password" element={<AuthGuard><ChangePassword /></AuthGuard>} />
    <Route path="/settings/support" element={<AuthGuard><Support /></AuthGuard>} />
    <Route path="/settings/float" element={<AuthGuard><Float /></AuthGuard>} />
    <Route path="/settings/reports/sales" element={<AuthGuard><SalesReport /></AuthGuard>} />
    <Route path="/settings/reports/pl" element={<AuthGuard><ProfitLossReport /></AuthGuard>} />

    {/* Fallback */}
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
</BrowserRouter>
  )
}



