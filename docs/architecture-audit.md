# Architecture Audit: All Pages

## Summary

| Metric | Count | Status |
|---|---|---|
| Total pages audited | 33 | — |
| Pages with direct Supabase calls | Still present on several pages; see remaining lists below | ⚠️ |
| Pages following recommended pattern | 6 | ✅ |
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
| Products.jsx | ✅ | Uses `useProducts()` backed by `src/services/productsService.js` |
| Transactions.jsx | ✅ | Uses `useTransactions()` backed by `src/services/transactionsService.js` |
| AddSale.jsx | ✅ | Uses `src/services/saleEntryService.ts` for sale creation |
| AddExpense.jsx | ✅ | Uses `src/services/expenseService.ts` for expense creation |

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

### Dashboard (1 page)

| Page | Direct Calls | Issue |
|---|---|---|
| Dashboard.jsx | transactions.select(), manual data aggregation | Multiple raw Supabase queries |

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

### Settings / Business Pages (14 pages)

| Page | Direct Calls | Issue |
|---|---|---|
| Business.jsx | businesses.select(), .update() | CRUD directly in component |
| BusinessSettings.jsx | businesses.select(), .update() | CRUD directly in component |
| General.jsx | businesses.select(), .update() | Settings update in component |
| Float.jsx | float_baseline.select(), .upsert() | Direct upsert logic in component |
| Suppliers.jsx | suppliers.select(), .insert(), .update() | Full CRUD in component |
| Branches.jsx | branches.select(), .insert(), .update() | Full CRUD in component |
| BranchDetail.jsx | branches.select(), user_branch_assignments.select() | Multi-table reads |
| BranchEmployees.jsx | Supabase import + direct calls | Employee management queries |
| EmployeeDetail.jsx | users.select(), user_branch_assignments.select() | Employee edit in component |
| EmployeeDetails.jsx | users.select() | Duplicate employee view doing same thing |
| ChangePassword.jsx | supabase.auth.updateUser() | Auth called directly |
| OpeningStock.jsx | products.select() | Cache manager present but bypassed |
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

The pages already on the recommended path are `Products.jsx`, `Transactions.jsx`, `AddSale.jsx`, and `AddExpense.jsx`, plus the two non-data pages `Support.jsx` and `Employees.jsx`.

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
| `src/repositories/` | Data access wrappers for products, transactions, stock entries, branches, users, suppliers | ✅ Yes |
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
| Transfer flow service/repository wrapper | 🔴 High |
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
- **Completed this step:** added [src/services/saleEntryService.ts](src/services/saleEntryService.ts) and routed [src/pages/transactions/AddSale.jsx](src/pages/transactions/AddSale.jsx) through the service layer for sale creation.
- **Completed this step:** added [src/services/expenseService.ts](src/services/expenseService.ts) and routed [src/pages/transactions/AddExpense.jsx](src/pages/transactions/AddExpense.jsx) through the service layer for expense creation.
- **Completed this step:** added [src/services/transferService.ts](src/services/transferService.ts) and routed [src/pages/transactions/AddTransfer.jsx](src/pages/transactions/AddTransfer.jsx) through the service layer for transfer creation and cost tracking.

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
    - `src/pages/settings/Business.jsx`
    - `src/pages/settings/BusinessSettings.jsx`
    - `src/pages/settings/General.jsx`
    - `src/pages/settings/Float.jsx`
    - `src/pages/settings/Suppliers.jsx`
    - `src/pages/settings/Branches.jsx`
7. Employee & branch admin pages (grouped):
    - `src/pages/settings/BranchDetail.jsx`
    - `src/pages/settings/BranchEmployees.jsx`
    - `src/pages/settings/EmployeeDetail.jsx`
    - `src/pages/settings/EmployeeDetails.jsx`
8. Stock baseline & reporting pages:
    - `src/pages/settings/OpeningStock.jsx`
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
- Cleaned up debug logs and direct RxDB/Supabase calls.

### Remaining work

- Migrate settings/business pages (6 pages).
- Migrate employee/branch admin pages (4 pages).
- Migrate stock baseline & reporting pages (2 pages).
- Migrate reports (2 pages).
- Migrate onboarding (2 pages).
- Add sync-status hooks and UI indicators.
- Add tests or smoke checks for repository-to-service integration.


