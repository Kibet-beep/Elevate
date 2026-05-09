// src/queries/products.ts
import { supabase } from '../lib/supabase'

export interface ProductQuery {
  businessId: string
  branchId?: string
  includeInactive?: boolean
  category?: string
  search?: string
}

export async function fetchProducts(query: ProductQuery) {
  const { businessId, branchId, includeInactive = false, category, search } = query

  let supabaseQuery = supabase
    .from('products')
    .select('*')
    .eq('business_id', businessId)

  if (branchId) {
    supabaseQuery = supabaseQuery.eq('branch_id', branchId)
  }

  if (!includeInactive) {
    supabaseQuery = supabaseQuery.eq('is_active', true)
  }

  if (category) {
    supabaseQuery = supabaseQuery.eq('category', category)
  }

  if (search) {
    supabaseQuery = supabaseQuery.or(`name.ilike.%${search}%,sku_id.ilike.%${search}%`)
  }

  const { data, error } = await supabaseQuery.order('name', { ascending: true })

  if (error) throw error

  return data || []
}

export async function fetchProductById(businessId: string, productId: string) {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('business_id', businessId)
    .eq('id', productId)
    .single()

  if (error) throw error

  return data
}

export async function fetchProductCategories(businessId: string) {
  const { data, error } = await supabase
    .from('products')
    .select('category')
    .eq('business_id', businessId)
    .eq('is_active', true)
    .not('category', 'is', null)

  if (error) throw error

  const categories = [...new Set((data || []).map(p => p.category).filter(Boolean))]
  return categories.sort()
}

export async function updateProductPrices(
  businessId: string,
  productId: string,
  buyingPrice?: number,
  sellingPrice?: number
) {
  const updateData: any = {}
  if (buyingPrice !== undefined) updateData.buying_price = buyingPrice
  if (sellingPrice !== undefined) updateData.selling_price = sellingPrice

  if (Object.keys(updateData).length === 0) {
    throw new Error('No price updates provided')
  }

  const { data, error } = await supabase
    .from('products')
    .update(updateData)
    .eq('business_id', businessId)
    .eq('id', productId)
    .select()
    .single()

  if (error) throw error

  return data
}
