# Architecture Audit: All Pages

## Summary

| Metric | Count | Status |
|---|---|---|
| Total pages audited | 33 | — |
| Pages with direct Supabase calls | 30 | ❌ |
| Pages following recommended pattern | 1 | ✅ |
| Service layer | 0 | ❌ MISSING |
| Repository layer | 0 | ❌ MISSING |
| RxDB integration | 0 | ❌ MISSING |
| Sync engine | 0 | ❌ MISSING |

---

## Compliant Pages

| Page | Status | Notes |
|---|---|---|
| Support.jsx | ✅ | Static page, no data fetching |
| Employees.jsx | ✅ | Navigation/routing only, no Supabase calls |

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

### Inventory Pages (5 pages)

| Page | Direct Calls | Issue |
|---|---|---|
| Inventory.jsx | products.select() | Direct query even with cache manager present |
| Products.jsx | Cache-based but calls Supabase for hydration | Bypasses service layer |
| NewStock.jsx | suppliers.select(), products.select() | Multiple table access |
| ProductDetail.jsx | products (select/update), stock_entries.select(), sale_items.select() | 3 different table queries in one component |
| StockTake.jsx | Imports supabase | Likely direct calls |

### Transaction Pages (4 pages)

| Page | Direct Calls | Issue |
|---|---|---|
| Transactions.jsx | transactions.select() | Direct query with complex filtering |
| AddSale.jsx | products.select(), custom insert logic | Multiple Supabase operations in component |
| AddExpense.jsx | transactions.insert(), expenses.insert() | Transaction creation logic in component |
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

## What This Means

### Current (bad) pattern — what 30 pages do:

```text
React Component → supabase.from("products").select() → Wait for network → Render
```

### Target (correct) pattern:

```text
React Component → Service → RxDB (instant local query) → Render immediately
                                    ↓
                        (Sync to Supabase in background when online)
```

### Problems the current pattern creates:
- Offline doesn't work — no local database, app fails without internet
- Network latency — every interaction waits for a Supabase round-trip
- Data loss — failed requests lose unsaved data
- No optimistic UI — no instant feedback while syncing
- No conflict resolution — changes on multiple devices collide
- Hard to test — can't mock or test without a real database connection
- Scaling nightmare — business logic scattered across 30 components

---

## What Exists (Keep and Build On)

| Asset | What it does | Keep? |
|---|---|---|
| useCache() | In-memory caching (lost on app close) | ✅ Yes |
| usePersistentStorage() | localStorage (not reactive) | ✅ Yes |
| cacheManager.js | Cache coordination | ✅ Yes |
| useInstantAuth() | Instant auth | ✅ Yes |
| Zustand (useAppStore.js) | State management (auth only currently) | ✅ Yes, expand it |

---

## What Is Missing (Needs Building)

| Missing | Priority |
|---|---|
| src/services/ directory | 🔴 Critical |
| src/repositories/ directory | 🔴 Critical |
| src/db/ (RxDB setup + schemas) | 🔴 Critical |
| Sync engine (offline change tracking) | 🔴 Critical |
| Conflict resolution (last-write-wins by timestamp) | 🔴 Critical |
| Sync status UI (WhatsApp-style ticks) | 🟡 High |

---

## Refactoring Scope

All 30 non-compliant pages need to be refactored to use the service/repository layer.

Auth pages are exempt — SignIn, SignUp, ForgotPassword, ResetPassword, AuthCallback, and Done all require internet and can stay direct to Supabase.

The refactoring is internal only — no UI/UX changes visible to the user. The only visible additions are:
- Sync indicator ticks (1 grey → 2 grey → 2 green)
- Optimistic UI updates (instant feedback)
- Offline badge when app is offline but still functional
