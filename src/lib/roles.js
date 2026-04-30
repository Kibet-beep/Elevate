// Role definitions and permission mappings
export const ROLES = {
  OWNER: "owner",
  MANAGER: "manager",
  CASHIER: "cashier",
}

// Page-level permissions
export const PAGE_PERMISSIONS = {
  // Dashboard
  "/dashboard": [ROLES.OWNER, ROLES.MANAGER, ROLES.CASHIER],
  
  // Inventory
  "/inventory": [ROLES.OWNER, ROLES.MANAGER, ROLES.CASHIER],
  "/inventory/new-stock": [ROLES.OWNER, ROLES.MANAGER],
  "/inventory/product/:id": [ROLES.OWNER, ROLES.MANAGER, ROLES.CASHIER],
  "/inventory/stocktake": [ROLES.OWNER, ROLES.MANAGER],
  
  // Transactions
  "/transactions": [ROLES.OWNER, ROLES.MANAGER, ROLES.CASHIER],
  "/transactions/add-sale": [ROLES.OWNER, ROLES.MANAGER, ROLES.CASHIER],
  "/transactions/sale": [ROLES.OWNER, ROLES.MANAGER, ROLES.CASHIER],
  "/transactions/add-expense": [ROLES.OWNER, ROLES.MANAGER],
  "/transactions/expense": [ROLES.OWNER, ROLES.MANAGER],
  "/transactions/transfer": [ROLES.OWNER, ROLES.MANAGER],
  
  // Settings
  "/settings": [ROLES.OWNER, ROLES.MANAGER, ROLES.CASHIER],
  "/settings/business": [ROLES.OWNER],
  "/settings/general": [ROLES.OWNER],
  "/settings/employees": [ROLES.OWNER, ROLES.MANAGER],
  "/settings/suppliers": [ROLES.OWNER, ROLES.MANAGER],
  "/settings/password": [ROLES.OWNER, ROLES.MANAGER, ROLES.CASHIER],
  "/settings/support": [ROLES.OWNER],
  "/settings/float": [ROLES.OWNER],
  "/settings/reports/sales": [ROLES.OWNER, ROLES.MANAGER],
  "/settings/reports/pl": [ROLES.OWNER, ROLES.MANAGER],
  
  // Onboarding
  "/onboarding": [ROLES.OWNER],
  "/onboarding/done": [ROLES.OWNER],
}

// Feature-level permissions
export const FEATURE_PERMISSIONS = {
  // Dashboard
  DASHBOARD_FULL: [ROLES.OWNER],
  DASHBOARD_LIMITED: [ROLES.MANAGER],
  DASHBOARD_PERSONAL: [ROLES.CASHIER],
  
  // Inventory
  INVENTORY_CRUD: [ROLES.OWNER, ROLES.MANAGER],
  INVENTORY_VIEW: [ROLES.OWNER, ROLES.MANAGER, ROLES.CASHIER],
  INVENTORY_CREATE: [ROLES.OWNER, ROLES.MANAGER],
  INVENTORY_UPDATE: [ROLES.OWNER, ROLES.MANAGER],
  INVENTORY_DELETE: [ROLES.OWNER, ROLES.MANAGER],
  
  // Transactions
  TRANSACTION_ADD_SALE: [ROLES.OWNER, ROLES.MANAGER, ROLES.CASHIER],
  TRANSACTION_ADD_EXPENSE: [ROLES.OWNER, ROLES.MANAGER],
  TRANSACTION_ADD_TRANSFER: [ROLES.OWNER, ROLES.MANAGER],
  TRANSACTION_VIEW_ALL: [ROLES.OWNER, ROLES.MANAGER],
  
  // Settings
  SETTINGS_BUSINESS_EDIT: [ROLES.OWNER],
  SETTINGS_BUSINESS_VIEW: [ROLES.OWNER, ROLES.MANAGER],
  SETTINGS_EMPLOYEE_MANAGE_ALL: [ROLES.OWNER],
  SETTINGS_EMPLOYEE_INVITE_CASHIER: [ROLES.OWNER, ROLES.MANAGER],
  SETTINGS_SUPPLIER_MANAGE: [ROLES.OWNER, ROLES.MANAGER],
  SETTINGS_VIEW_REPORTS: [ROLES.OWNER, ROLES.MANAGER],
  SETTINGS_FLOAT_MANAGE: [ROLES.OWNER],
  SETTINGS_SUPPORT: [ROLES.OWNER],
  SETTINGS_PASSWORD_CHANGE: [ROLES.OWNER, ROLES.MANAGER, ROLES.CASHIER],
  
  // Onboarding
  ONBOARDING_ACCESS: [ROLES.OWNER],
}

// Helper function to check if user has permission
export const hasPermission = (userRole, permission) => {
  const allowedRoles = FEATURE_PERMISSIONS[permission]
  return allowedRoles && allowedRoles.includes(userRole)
}

// Helper function to check if user can access a page
export const canAccessPage = (userRole, pathname) => {
  const allowedRoles = PAGE_PERMISSIONS[pathname]
  return allowedRoles && allowedRoles.includes(userRole)
}

// Get role display name
export const getRoleDisplayName = (role) => {
  const displayNames = {
    [ROLES.OWNER]: "Owner",
    [ROLES.MANAGER]: "Manager",
    [ROLES.CASHIER]: "Cashier",
  }
  return displayNames[role] || role
}

// Get accessible navigation items for a role
export const getNavigationItems = (userRole) => {
  const allItems = [
    { label: "Dashboard", path: "/dashboard" },
    { label: "Inventory", path: "/inventory" },
    { label: "Transactions", path: "/transactions" },
    { label: "Settings", path: "/settings" },
  ]

  return allItems.filter((item) => canAccessPage(userRole, item.path))
}
