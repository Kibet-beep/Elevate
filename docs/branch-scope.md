# Branch Scope Contract

## Purpose

Define one consistent branch-scope model for UI, route guards, and data writes.

## Role Scope

- `owner`
  - Can view all branches or a single branch.
  - Can perform all branch-bound operations.
- `manager`
  - Can only operate within assigned branch scope.
  - Cannot switch to all-branch mode.
- `cashier`
  - Hard-locked to assigned branch.
  - Can record sales and view branch-scoped operational data only.
  - Cannot post expenses, transfers, stock take approvals, or branch admin actions.

## Branch-Bound Entities (`branch_id` required)

- `transactions` (sale, expense)
- `transfers` (same-branch transfer in current implementation)
- `products`
- `stock_takes` and related count/approval workflow
- opening stock and historical stock/sales adjustments

## Business-Wide Entities (`branch_id` optional/null)

- global business settings
- authentication/profile metadata
- explicitly global finance baselines (only where intentionally modeled as business-wide)

## Write Rules

- Any operation that impacts branch P&L, stock, or reconciliation must include a concrete `branch_id`.
- Owner in all-branch mode must explicitly select a target branch before submitting branch-bound writes.
- Outbox payloads must carry `branch_id` and replay must validate it before insert/update.

## Enforcement Layers

- UI: disable submit when branch scope is unresolved.
- Router: role-gate paths according to role matrix.
- Sync engine: reject branch-bound writes missing `branch_id`.
- Database: enforce branch access with RLS for select/insert/update/delete.
