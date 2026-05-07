import type { NormalizedProduct } from './types';
import { num, str } from './utils';

export const ECOMMERCE_GA4_EVENTS: Record<string, string> = {
  'Product Added': 'add_to_cart',
  'Product Added to Wishlist': 'add_to_wishlist',
  'Product Removed': 'remove_from_cart',
  'Product Clicked': 'select_item',
  'Product Viewed': 'view_item',
  'Cart Viewed': 'view_cart',
  'Product List Viewed': 'view_item_list',
  'Products Searched': 'view_search_results',
  'Clicked Promotion': 'select_promotion',
  'Viewed Promotion': 'view_promotion',
  'Checkout Started': 'begin_checkout',
  'Checkout Step Completed': 'checkout_progress',
  'Payment Info Entered': 'add_payment_info',
  'Order Completed': 'purchase',
  'Order Refunded': 'refund',
  'Shipping Info Entered': 'add_shipping_info'
};

export const ECOMMERCE_META_EVENTS: Record<string, string> = {
  'Order Completed': 'Purchase',
  'Product Added': 'AddToCart',
  'Products Searched': 'Search',
  'Checkout Started': 'InitiateCheckout',
  'Payment Info Entered': 'AddPaymentInfo',
  'Product Added to Wishlist': 'AddToWishlist',
  'Product Viewed': 'ViewContent'
};

export const ECOMMERCE_TIKTOK_EVENTS: Record<string, string> = {
  'Order Completed': 'PlaceAnOrder',
  'Product Added': 'AddToCart',
  'Products Searched': 'Search',
  'Checkout Started': 'InitiateCheckout',
  'Payment Info Entered': 'AddPaymentInfo',
  'Product Added to Wishlist': 'AddToWishlist',
  'Product Viewed': 'ViewContent',
  'Product List Viewed': 'ViewContent'
};

export function normalizeProducts(payload: Record<string, unknown>): NormalizedProduct[] {
  const products = Array.isArray(payload.products) ? payload.products as Record<string, unknown>[] : [];
  if (products.length) return products.map(normalizeProduct);
  const id = payload.sku || payload.product_id || payload.id;
  if (!id && !payload.name && !payload.price) return [];
  return [normalizeProduct(payload)];
}

function normalizeProduct(p: Record<string, unknown>): NormalizedProduct {
  const price = num(p.price);
  const quantity = num(p.quantity) || 1;
  return {
    product_id: str(p.product_id || p.id, 128) || undefined,
    sku: str(p.sku, 128) || undefined,
    id: str(p.sku || p.product_id || p.id, 128) || undefined,
    name: str(p.name, 256) || undefined,
    category: str(p.category, 128) || undefined,
    brand: str(p.brand, 128) || undefined,
    variant: str(p.variant, 128) || undefined,
    price,
    quantity,
    coupon: str(p.coupon, 128) || undefined,
    position: num(p.position),
    ...p
  };
}

export function productId(p: NormalizedProduct): string | undefined {
  return str(p.sku || p.product_id || p.id, 128) || undefined;
}

export function valueFrom(payload: Record<string, unknown>): number | undefined {
  return num(payload.value) ?? num(payload.price) ?? num(payload.total) ?? num(payload.revenue);
}
