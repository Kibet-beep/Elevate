// src/features/dashboard/utils/dashboard.time.js

export const EAT_OFFSET_MS = 3 * 60 * 60 * 1000

export function getTodayStartEAT() {
  const now = new Date()
  // Convert to EAT timezone (UTC+3)
  const eatNow = new Date(now.getTime() + EAT_OFFSET_MS)
  // Set to start of day in EAT
  eatNow.setHours(0, 0, 0, 0)
  // Convert back to UTC for ISO string
  const utcStart = new Date(eatNow.getTime() - EAT_OFFSET_MS)
  return utcStart.toISOString().split('T')[0]
}

export function getPeriodRange(period) {
  const now = new Date()
  // Convert to EAT timezone (UTC+3)
  const eatNow = new Date(now.getTime() + EAT_OFFSET_MS)
  const eatToday = new Date(eatNow.getFullYear(), eatNow.getMonth(), eatNow.getDate(), 23, 59, 59, 999)
  
  switch (period) {
    case 'Week':
      const weekStart = new Date(eatToday)
      weekStart.setDate(eatToday.getDate() - eatToday.getDay())
      // Convert back to UTC for ISO strings
      const utcWeekStart = new Date(weekStart.getTime() - EAT_OFFSET_MS)
      const utcWeekEnd = new Date(eatToday.getTime() - EAT_OFFSET_MS)
      return { start: utcWeekStart.toISOString().split('T')[0], end: utcWeekEnd.toISOString().split('T')[0] };
      
    case 'Month':
      const monthStart = new Date(eatToday.getFullYear(), eatToday.getMonth(), 1)
      const monthEnd = new Date(eatToday.getFullYear(), eatToday.getMonth() + 1, 0)
      // Convert back to UTC for ISO strings
      const utcMonthStart = new Date(monthStart.getTime() - EAT_OFFSET_MS)
      const utcMonthEnd = new Date(monthEnd.getTime() - EAT_OFFSET_MS)
      return { start: utcMonthStart.toISOString().split('T')[0], end: utcMonthEnd.toISOString().split('T')[0] };
      
    default:
      const utcToday = new Date(eatToday.getTime() - EAT_OFFSET_MS)
      return { start: utcToday.toISOString().split('T')[0], end: utcToday.toISOString().split('T')[0] };
  }
}

export function toTransactionDateEAT(dateKey) {
  // Convert YYYY-MM-DD to proper ISO timestamp in EAT
  if (!dateKey) return null
  
  const [year, month, day] = dateKey.split('-').map(Number)
  const date = new Date(year, month - 1, day, 12, 0, 0) // Midday to avoid timezone edge cases
  return date.toISOString()
}

export function getSelectedDayRange(selectedDay, periodData) {
  if (!selectedDay || !periodData?.transactions?.length) return null
  
  const dayTransactions = periodData.transactions.filter(t => 
    new Date(t.date).toDateString() === selectedDay
  )
  
  return {
    transactions: dayTransactions,
    total: dayTransactions.reduce((s, t) => s + (t.type === 'sale' ? t.amount : -t.amount), 0)
  };
}
