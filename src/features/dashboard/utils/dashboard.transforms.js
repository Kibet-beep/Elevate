// src/features/dashboard/utils/dashboard.transforms.js

export function enrichTransactions(txns) {
  return txns.map((t) => {
    if (t.type === "sale") {
      const amount =
        t.sale_items?.reduce((s, i) => s + (i.total_amount || 0), 0) || 0;

      const name =
        t.sale_items?.length > 1
          ? `${t.sale_items[0].products?.name} +${t.sale_items.length - 1} more`
          : t.sale_items?.[0]?.products?.name || "Sale";

      return {
        ...t,
        amount,
        display_name: name,
      };
    }

    if (t.type === "expense") {
      const expensesArray = t.expenses || [];
      const amount = expensesArray.reduce((s, e) => s + (e.amount || 0), 0);
      const name = expensesArray[0]?.category || "Expense";

      return {
        ...t,
        amount,
        display_name: name,
      };
    }

    // Explicit fallback for unknown types - no silent misclassification
    return {
      ...t,
      amount: t.amount || 0,
      display_name: t.display_name || "Transaction",
    };
  });
}

export function computeSummary(transactions) {
  const totalSales = transactions
    .filter(t => t.type === 'sale')
    .reduce((s, t) => s + (t.amount || 0), 0);

  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((s, t) => s + (t.amount || 0), 0);

  return {
    totalSales,
    totalExpenses,
    net: totalSales - totalExpenses,
  };
}

export function computeAccountBalance(txns, expenses, account) {
  const salesIn = txns.filter(t => t.type === 'sale' && t.payment_account === account)
    .reduce((s, t) => s + (t.sale_items?.reduce((a, i) => a + i.total_amount, 0) || 0), 0);
  
  const expOut = expenses.filter(t => t.type === 'expense' && t.payment_account === account)
    .reduce((s, e) => {
      const expenseAmount = e.expenses?.reduce((sum, ex) => sum + (ex.amount || 0), 0) || 0;
      return s + expenseAmount;
    }, 0);
  
  const transfersOut = txns.filter(t => t.type === 'transfer' && t.from_account === account)
    .reduce((s, t) => s + t.amount + t.transaction_cost, 0);
  
  const transfersIn = txns.filter(t => t.type === 'transfer' && t.to_account === account)
    .reduce((s, t) => s + t.amount, 0);
  
  // Get opening balance from float_baseline or default to 0
  const openingBalance = 0; // TODO: fetch from float_baseline table
  
  return openingBalance + salesIn - expOut - transfersOut + transfersIn;
}

export function buildPendingActions(transactions) {
  // TODO: Implement pending actions once lifecycle_state is added to transactions table
  return [];
}
