# Sale Flow Audit

This note tracks how a sale moves through the app today and which screens react immediately to that write.

## Current Write Path

- `AddSale.jsx` calls `recordSale()` from `src/services/saleEntryService.ts`.
- `recordSale()` inserts a sale transaction into local RxDB (`db.transactions`).
- `recordSale()` also decrements local product quantities in `db.products` and persists matching inventory movements for branch recalculation.
- The sale transaction includes `sale_items`, so downstream consumers can render item-level detail.

## What Updates Immediately

- `Dashboard.jsx` reads live transactions through `useTodayActivity()` and `useDashboardContext()`.
- `Transactions.jsx` reads live transactions through `useTransactions()`.
- `salesReport.jsx` reads from the same live transaction and product hooks.
- `profitlossreport.jsx` also reads from the same live transaction and product hooks.
- `Inventory.jsx` and `ProductDetail.jsx` now see reduced quantities because the sale service updates local product stock immediately.

Because those screens subscribe to RxDB collections, a newly keyed sale appears there as soon as the local transaction is written.

## What Is Still Separate

- The inventory recalculation logic still lives in `src/services/inventoryService.ts`.
- Historical inventory flows that use inventory movements remain distinct from the sale entry form.

## Screen-by-Screen Status

### Dashboard

- Connected to live RxDB transactions.
- Sale appears immediately in today’s activity and summary totals.

### Inventory

- Reads products from `useProducts()`.
- Stock numbers now decrease immediately when a sale is saved.

### Transactions

- Reads transactions from `useTransactions()`.
- Sale appears immediately after the local transaction insert.

### Sales Report

- Reads live transactions and products.
- Sale appears immediately in report totals and rows.

### Profit & Loss

- Reads live transactions and products.
- Sale appears immediately in revenue and margin calculations.

### Product Detail

- Reads products from `useProducts()`.
- Sale history can be derived from transactions, and the displayed stock now tracks the sale write path immediately.

## Conclusion

The transaction/report side was already connected and is still reactive. The sale flow now also updates product stock immediately and writes matching inventory movements, so inventory-facing screens reflect the sale without waiting for a separate update.