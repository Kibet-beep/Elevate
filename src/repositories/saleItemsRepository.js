// src/repositories/saleItemsRepository.js
import { getDb } from '../lib/db'
import { supabase } from '../lib/supabase'

export async function insertSaleItems(items) {
  const db = await getDb().catch(() => null)
  if (db && db.sale_items) {
    const toInsert = items.map(i => ({ ...i, _modified: Date.now() }))
    await db.sale_items.bulkInsert(toInsert)
    return toInsert
  }

  const { error, data } = await supabase.from('sale_items').insert(items)
  if (error) throw error
  return data
}

export default {
  insertSaleItems,
}
