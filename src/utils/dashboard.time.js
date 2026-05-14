// src/utils/dashboard.time.js

export const EAT_OFFSET_MS = 3 * 60 * 60 * 1000

export function getPeriodRange(period) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
  
  switch (period) {
    case 'Week':
      const weekStart = new Date(today)
      weekStart.setDate(today.getDate() - today.getDay())
      return { start: weekStart.toISOString().split('T')[0], end: today.toISOString().split('T')[0] }
      
    case 'Month':
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      return { start: monthStart.toISOString().split('T')[0], end: monthEnd.toISOString().split('T')[0] }
      
    default:
      return { start: today.toISOString().split('T')[0], end: today.toISOString().split('T')[0] }
  }
}

export function getSelectedDayRange(selectedDay, periodData) {
  if (!selectedDay || !periodData?.transactions?.length) return null
  
  const dayTransactions = periodData.transactions.filter(t => 
    new Date(t.date).toDateString() === selectedDay
  )
  
  return {
    transactions: dayTransactions,
    total: dayTransactions.reduce((s, t) => s + (t.type === 'sale' ? t.amount : -t.amount), 0)
  }
}
