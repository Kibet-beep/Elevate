# Architecture Audit: All Pages

## Summary

| Metric | Count | Status |
|---|---|---|
| Total pages audited | 33 | — |
| Pages with direct Supabase calls | Still present on several pages; see remaining lists below | ⚠️ |
| Pages following recommended pattern | 17 | ✅ |
| Service layer | Present | ✅ |
| Repository layer | Present | ✅ |
| RxDB integration | Present | ✅ |
| Sync engine | Present | ✅ |

---

## Compliant Pages

| Page | Status | Notes |
|---|---|---|
| Support.jsx | ✅ | Static page, no data fetching |
| Employees.jsx | ✅ | Navigation/routing only, no Supabase calls |
| Dashboard.jsx | ✅ | Uses local RxDB-backed dashboard hooks and services |
| Products.jsx | ✅ | Uses `useProducts()` backed by `src/services/productsService.js` |
| Transactions.jsx | ✅ | Uses `useTransactions()` backed by `src/services/transactionsService.js` |
| AddSale.jsx | ✅ | Uses `src/services/saleEntryService.ts` for sale creation |
| AddExpense.jsx | ✅ | Uses `src/services/expenseService.ts` for expense creation |
| Branches.jsx | ✅ | Uses `src/services/branchesService.js` over `src/repositories/branchesRepository.js` for branch CRUD |
| BranchEmployees.jsx | ✅ | Uses `src/services/branchEmployeesService.js` for loading, create, status toggle, and delete flows |
| EmployeeDetail.jsx | ✅ | Uses `src/services/employeeDetailService.js` for load, save, and delete flows |
| OpeningStock.jsx | ✅ | Uses `src/services/inventoryService.ts` routed through repository-backed data access |
| Business.jsx | ✅ | Uses `src/services/businessService.js` backed by `src/repositories/businessesRepository.js` |
| BusinessSettings.jsx | ✅ | Uses `src/services/settingsService.js` backed by `src/repositories/businessesRepository.js` |
| General.jsx | ✅ | Uses `src/services/settingsService.js` backed by `src/repositories/businessesRepository.js` |
| Float.jsx | ✅ | Uses `src/services/floatService.js` backed by `src/repositories/floatRepository.js` |
| Suppliers.jsx | ✅ | Uses `src/services/supplierService.js` backed by `src/repositories/suppliersRepository.js` |
| BranchDetail.jsx | ✅ | Uses `src/services/branchDetailService.js` over `src/repositories/branchesRepository.js` and local branch assignment reads |

---

## Non-Compliant Pages — Grouped by Category

### Auth Pages (5 pages)
> These will remain direct-to-Supabase by design (auth requires internet). No refactoring needed.

| Page | Direct Calls | Issue |
|---|---|---|
| SignIn.jsx | supabase.auth.signInWithPassword() | Auth called directly in component |
| SignUp.jsx | supabase.auth.signUp(), businesses.insert(), users.insert() | Multi-step signup bypasses service layer |
| ForgotPassword.jsx | supabase.auth.resetPasswordForEmail() | Auth called directly |
| ResetPassword.jsx | supabase.auth.updateUser() | Auth called directly |
| AuthCallback.jsx | supabase.auth.getSession(), users.select() | Callback logic mixed with component |

### Inventory Pages (4 pages remaining)

| Page | Direct Calls | Issue |
|---|---|---|
| Inventory.jsx | products.select() | Direct query even with cache manager present |
| NewStock.jsx | suppliers.select(), products.select() | Multiple table access |
| ProductDetail.jsx | products (select/update), stock_entries.select(), sale_items.select() | 3 different table queries in one component |
| StockTake.jsx | Imports supabase | Likely direct calls |

### Transaction Pages (1 page remaining)

| Page | Direct Calls | Issue |
|---|---|---|
| AddTransfer.jsx | users.select(), float_baseline, transactions, transfers | 4 table queries in one page |

### Settings / Business Pages (2 pages)

| Page | Direct Calls | Issue |
|---|---|---|
| ChangePassword.jsx | supabase.auth.updateUser() | Auth called directly |
| HistoricalSales.jsx | float_baseline, products.select(), transactions.select() | 3 table queries |

### Reports Pages (2 pages)

| Page | Direct Calls | Issue |
|---|---|---|
| SalesReport.jsx | supabase.auth.getUser(), users.select() | Auth + user queries in component |
| ProfitLossReport.jsx | supabase.auth.getUser(), users.select() | Auth + user queries in component |

### Onboarding Pages (2 pages)

| Page | Direct Calls | Issue |
|---|---|---|
| AddEmployees.jsx | supabase.auth.getSession() + Edge Functions | Uses functions (better) but still direct auth |
| Done.jsx | supabase.auth.signOut() | Auth called directly |

---

### What This Means

The architecture is now mixed rather than uniformly broken. Several pages already use the service/repository/RxDB path, while others still call Supabase directly.

```text
React Component → Service → Repository → RxDB when available → Render immediately
                                      ↓
                        (Sync to Supabase in background when online)
```

The pages already on the recommended path are `Products.jsx`, `Transactions.jsx`, `Dashboard.jsx`, `AddSale.jsx`, `AddExpense.jsx`, `Branches.jsx`, `BranchEmployees.jsx`, `EmployeeDetail.jsx`, `OpeningStock.jsx`, `Business.jsx`, `BusinessSettings.jsx`, and `General.jsx`, plus the two non-data pages `Support.jsx` and `Employees.jsx`.

### Problems the current pattern creates:
- Offline doesn't work — no local database, app fails without internet
- Network latency — every interaction waits for a Supabase round-trip
- Data loss — failed requests lose unsaved data
- No optimistic UI — no instant feedback while syncing
- No conflict resolution — changes on multiple devices collide
- Hard to test — can't mock or test without a real database connection
- Scaling nightmare — business logic is still scattered across several components

---

## What Exists (Keep and Build On)

| Asset | What it does | Keep? |
|---|---|---|
| `src/repositories/` | Data access wrappers for products, transactions, stock entries, branches, businesses, float baseline, users, suppliers | ✅ Yes |
| `src/services/` | Business logic / mutation layer, including products, transactions, sales, expenses, inventory, dashboard, settings | ✅ Yes |
| `src/lib/db.js` | RxDB setup, schemas, and replication entry points | ✅ Yes |
| `src/lib/supabase-replication.js` | Supabase-backed RxDB replication implementation | ✅ Yes |
| `src/lib/sync.js` | Auto-resync and sync-status metadata helpers | ✅ Yes |
| useCache() / cacheManager.js | In-memory cache coordination | ✅ Yes |
| useInstantAuth() | Instant auth | ✅ Yes |
| Zustand (useAppStore.js) | State management (auth only currently) | ✅ Yes, expand it |

---

## What Is Missing (Needs Building)

| Missing | Priority |
|---|---|
| Sync status UI (WhatsApp-style ticks) | 🟡 High |
| Remaining direct-call pages | 🔴 High |
| Page-level tests or smoke checks for the new service path | 🟡 Medium |

---

## Refactoring Scope

The remaining direct-call pages still need to be refactored to use the service/repository layer.

Auth pages are exempt — SignIn, SignUp, ForgotPassword, ResetPassword, AuthCallback, and Done all require internet and can stay direct to Supabase.

The refactoring is internal only — no UI/UX changes visible to the user. The only visible additions are:
- Sync indicator ticks (1 grey → 2 grey → 2 green)
- Optimistic UI updates (instant feedback)
- Offline badge when app is offline but still functional

---

## Progress

- **In progress:** migrating the remaining direct-call pages to the service/repository path.
- **Completed now:** created `src/repositories/` skeleton with:
    - [src/repositories/productsRepository.js](src/repositories/productsRepository.js)
    - [src/repositories/transactionsRepository.js](src/repositories/transactionsRepository.js)
    - [src/repositories/stockEntriesRepository.js](src/repositories/stockEntriesRepository.js)
    - [src/repositories/branchesRepository.js](src/repositories/branchesRepository.js)
    - [src/repositories/usersRepository.js](src/repositories/usersRepository.js)
    - [src/repositories/suppliersRepository.js](src/repositories/suppliersRepository.js)
    - [src/repositories/transfersRepository.js](src/repositories/transfersRepository.js)

- **Notes:** The new repository modules prefer the local RxDB collections (via `getDb()`) and fall back to server calls through `src/lib/supabase.js` when RxDB is unavailable. Use these as canonical data access points for pages during refactor.

- **Completed this step:** reviewed the audit against the current repo state and updated the document to distinguish implemented layers from remaining work.
- **Completed this step:** added [src/services/productsService.js](src/services/productsService.js) and routed [src/hooks/useProducts.js](src/hooks/useProducts.js) through the service layer for initial product loading.
- **Completed this step:** cleaned up [src/pages/inventory/Products.jsx](src/pages/inventory/Products.jsx) to rely on the service-backed hook without the old debug logging.
- **Completed this step:** added [src/services/transactionsService.js](src/services/transactionsService.js) and routed [src/hooks/useTransactions.js](src/hooks/useTransactions.js) through the service layer for initial transaction loading.
- **Completed this step:** refactored the dashboard service layer to read from local RxDB instead of Supabase, keeping [src/pages/dashboard/Dashboard.jsx](src/pages/dashboard/Dashboard.jsx) on the recommended path.
- **Completed this step:** added [src/services/saleEntryService.ts](src/services/saleEntryService.ts) and routed [src/pages/transactions/AddSale.jsx](src/pages/transactions/AddSale.jsx) through the service layer for sale creation.
- **Completed this step:** added [src/services/expenseService.ts](src/services/expenseService.ts) and routed [src/pages/transactions/AddExpense.jsx](src/pages/transactions/AddExpense.jsx) through the service layer for expense creation.
- **Completed this step:** added [src/services/transferService.ts](src/services/transferService.ts) and routed [src/pages/transactions/AddTransfer.jsx](src/pages/transactions/AddTransfer.jsx) through the service layer for transfer creation and cost tracking.
- **Completed this step:** added [src/services/branchesService.js](src/services/branchesService.js) and routed [src/pages/settings/Branches.jsx](src/pages/settings/Branches.jsx) through the service layer for branch create, update, activate, and archive flows.
- **Completed this step:** added [src/services/branchEmployeesService.js](src/services/branchEmployeesService.js) and routed [src/pages/settings/BranchEmployees.jsx](src/pages/settings/BranchEmployees.jsx) through the service layer for employee loading, branch assignment, and activation flows.
- **Completed this step:** added [src/services/employeeDetailService.js](src/services/employeeDetailService.js) and routed [src/pages/settings/EmployeeDetail.jsx](src/pages/settings/EmployeeDetail.jsx) through the service layer for employee detail load, save, and delete flows.
- **Completed this step:** refactored [src/services/inventoryService.ts](src/services/inventoryService.ts) to use repository-backed data access for opening baseline and inventory movement operations used by [src/pages/settings/OpeningStock.jsx](src/pages/settings/OpeningStock.jsx).
- **Completed this step:** added [src/repositories/businessesRepository.js](src/repositories/businessesRepository.js) and routed [src/services/businessService.js](src/services/businessService.js), [src/services/settingsService.js](src/services/settingsService.js), and [src/pages/settings/BusinessSettings.jsx](src/pages/settings/BusinessSettings.jsx) through the repository-backed business settings path.
- **Completed this step:** routed [src/services/supplierService.js](src/services/supplierService.js) through [src/repositories/suppliersRepository.js](src/repositories/suppliersRepository.js) so [src/pages/settings/Suppliers.jsx](src/pages/settings/Suppliers.jsx) now uses the repository-backed supplier path.
- **Completed this step:** added [src/services/branchDetailService.js](src/services/branchDetailService.js) and routed [src/pages/settings/BranchDetail.jsx](src/pages/settings/BranchDetail.jsx) through the repository-backed branch detail path.

---

## Remaining work (next steps)

The remaining work is best executed as a strict migration queue. Prioritize mutation-heavy and cross-table pages first so each migration proves the full service→repository→RxDB pattern.

Migration queue (strict order):

1. ~~`src/pages/transactions/AddTransfer.jsx`~~ — **✅ COMPLETED** — transfer flow (users, float baseline, transactions, transfers). Service handles mutation flow, touches multiple tables.
2. ~~`src/pages/inventory/Inventory.jsx`~~ — **✅ COMPLETED** — catalog listing, already uses `useProducts()` hook backed by products service/repository. Cleaned up debug logs.
3. ~~`src/pages/inventory/NewStock.jsx`~~ — **✅ COMPLETED** — suppliers + products access; now uses `getAllProducts()` from repository and `recordStockReceipt()` service.
4. ~~`src/pages/inventory/ProductDetail.jsx`~~ — **✅ COMPLETED** — already uses `useProducts()` hook; refactored mutations to use `productDetailService` (update, deactivate, branch assign).
5. ~~`src/pages/inventory/StockTake.jsx`~~ — **✅ COMPLETED** — uses `getAllProducts()` from repository and `stockTakeService` (start, submit counts, approve).
6. Settings / Business pages (grouped, migrate in this order):
    - ~~`src/pages/settings/Business.jsx`~~ — **✅ COMPLETED** — business details now flow through `businessService` backed by `businessesRepository`.
    - ~~`src/pages/settings/BusinessSettings.jsx`~~ — **✅ COMPLETED** — business identity and operational settings now flow through `settingsService` backed by `businessesRepository`.
    - ~~`src/pages/settings/General.jsx`~~ — **✅ COMPLETED** — general preferences now flow through `settingsService` backed by `businessesRepository`.
    - ~~`src/pages/settings/Float.jsx`~~ — **✅ COMPLETED** — opening balances now flow through `floatService` backed by `floatRepository`.
    - ~~`src/pages/settings/Suppliers.jsx`~~ — **✅ COMPLETED** — supplier CRUD now goes through `supplierService` backed by `suppliersRepository`.
    - ~~`src/pages/settings/Branches.jsx`~~ — **✅ COMPLETED** — branch CRUD now goes through `branchesService` and `branchesRepository`.
7. Employee & branch admin pages (grouped):
    - ~~`src/pages/settings/BranchDetail.jsx`~~ — **✅ COMPLETED** — branch profile and assignment reads now flow through `branchDetailService`.
    - ~~`src/pages/settings/BranchEmployees.jsx`~~ — **✅ COMPLETED** — branch employee loading, add, and status flows now flow through `branchEmployeesService`.
    - ~~`src/pages/settings/EmployeeDetail.jsx`~~ — **✅ COMPLETED** — employee detail load, save, and delete flows now flow through `employeeDetailService`.
8. Stock baseline & reporting pages:
    - ~~`src/pages/settings/OpeningStock.jsx`~~ — **✅ COMPLETED** — opening baseline flow now runs through repository-backed inventory service operations.
    - `src/pages/settings/HistoricalSales.jsx`
9. Reports (read + auth calls):
    - `src/pages/settings/SalesReport.jsx`
    - `src/pages/settings/ProfitLossReport.jsx`
10. Onboarding screens (lower priority — direct auth interactions allowed as needed):
    - `src/pages/onboarding/AddEmployees.jsx`
    - `src/pages/onboarding/Done.jsx`

Notes:
- For each migration, create a thin `src/services/*Service.js` adapter that calls repositories and handles validation/optimistic UI.
- Add a short smoke test per migrated page that: (a) renders the page with mocked RxDB, (b) verifies initial data loads from repository, (c) verifies a mutation call invokes the service and writes to RxDB.
- Add UI indicators (sync ticks / offline badge) as pages are migrated so users can see sync state progressively.


---

### Done this session

- Scaffolded repository wrappers for: `products`, `transactions`, `stock_entries`, `branches`, `users`, `suppliers`, `transfers`.
- Added services: `productsService`, `transactionsService`, `transferService`, `saleEntryService`, `expenseService`, `stockEntriesService`, `productDetailService`, `stockTakeService`.
- Migrated inventory pages: Inventory.jsx, NewStock.jsx, ProductDetail.jsx, StockTake.jsx — all now use service/repository layers.
- Migrated transaction pages: AddTransfer.jsx, AddSale.jsx, AddExpense.jsx — all now use service/repository layers.
- Migrated settings pages: Branches.jsx, Business.jsx, BusinessSettings.jsx, General.jsx — all now use repository-backed services.
- Cleaned up debug logs and direct RxDB/Supabase calls.

### Remaining work

- Migrate settings/business pages (6 pages).
- Migrate employee/branch admin pages (4 pages).
- Migrate stock baseline & reporting pages (2 pages).
- Migrate reports (2 pages).
- Migrate onboarding (2 pages).
- Add sync-status hooks and UI indicators.
- Add tests or smoke checks for repository-to-service integration.


