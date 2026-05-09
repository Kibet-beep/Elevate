// src/utils/dashboard.transforms.js

export function enrichTransactions(txns) {
  return txns.map(t => {
    if (t.type === 'sale') {
      const amount = t.sale_items?.reduce((s, i) => s + i.total_amount, 0) || 0
      const name = t.sale_items?.length > 1
        ? `${t.sale_items[0].products?.name} +${t.sale_items.length - 1} more`
        : t.sale_items?.[0]?.products?.name || 'Sale'
      return { ...t, amount, display_name: name }
    } else {
      const amount = t.expense?.amount || 0
      const name = t.expense?.category || 'Expense'
      return { ...t, amount, display_name: name }
    }
  })
}

export function computeSummary(txns, expenses) {
  const sales = txns.filter(t => t.type === 'sale').reduce((s, t) => s + t.amount, 0)
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
  
  return {
    totalSales: sales,
    totalExpenses,
    net: sales - totalExpenses
  }
}

export function computeAccountBalance(txns, expenses, account) {
  const salesIn = txns.filter(t => t.type === 'sale' && t.payment_account === account)
    .reduce((s, t) => s + (t.sale_items?.reduce((a, i) => a + i.total_amount, 0) || 0), 0)
  
  const expOut = expenses.filter(t => t.type === 'expense' && t.payment_account === account)
    .reduce((s, e) => s + e.amount, 0), 0)
  
  const transfersOut = txns.filter(t => t.type === 'transfer' && t.from_account === account)
    .reduce((s, t) => s + t.amount + t.transaction_cost, 0), 0)
  
  const transfersIn = txns.filter(t => t.type === 'transfer' && t.to_account === account)
    .reduce((s, t) => s + t.amount, 0), 0)
  
  // Get opening balance from float_baseline or default to 0
  const openingBalance = 0 // TODO: fetch from float_baseline table
  
  return openingBalance + salesIn - expOut - transfersOut + transfersIn
}

export function buildPendingActions(txns, expenses) {
  const pendingSales = txns
    .filter(t => t.type === 'sale' && t.lifecycle_state === 'pending')
    .map(t => ({
      id: t.id,
      type: 'sale',
      amount: t.sale_items?.reduce((s, i) => s + i.total_amount, 0) || 0,
      description: t.sale_items?.length > 1
        ? `${t.sale_items[0].products?.name} +${t.sale_items.length - 1} more`
        : t.sale_items?.[0]?.products?.name || 'Sale',
      date: t.date,
      account: t.payment_account
    }))
  
  const pendingExpenses = expenses
    .filter(t => t.lifecycle_state === 'pending')
    .map(t => ({
      id: t.id,
      type: 'expense',
      amount: t.amount,
      description: t.category,
      date: t.date,
      account: t.payment_account
    }))
  
  return [...pendingSales, ...pendingExpenses]
}
