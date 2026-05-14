// src/services/productsService.js
import { getAllProducts, getProductById } from '../repositories/productsRepository'

export async function listProducts(filters = {}) {
  return getAllProducts(filters)
}

export async function fetchProduct(productId) {
  if (!productId) return null
  return getProductById(productId)
}

export default {
  listProducts,
  fetchProduct,
}
