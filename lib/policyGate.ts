export interface CartItem {
  sku: string;
  name: string;
  priceINR: number;
  quantity: number;
}

export interface CatalogProduct {
  sku: string;
  name: string;
  priceINR: number;
  stock: number;
  category: string;
  description: string;
}

export const CATALOG: CatalogProduct[] = [
  {
    sku: 'SKU-KB-01',
    name: 'Tactile Mechanical Keyboard',
    priceINR: 2499,
    stock: 12,
    category: 'Peripherals',
    description: 'Hot-swappable mechanical switches with RGB backlight'
  },
  {
    sku: 'SKU-MS-02',
    name: 'Precision Wireless Mouse',
    priceINR: 1199,
    stock: 8,
    category: 'Peripherals',
    description: 'Ergonomic 2.4GHz + Bluetooth multi-device mouse'
  },
  {
    sku: 'SKU-MAT-03',
    name: 'Desk Leather Mat XL',
    priceINR: 699,
    stock: 0, // Intentionally 0 to demo graceful failure handling
    category: 'Accessories',
    description: 'Waterproof extended desk surface blotter'
  }
];

export interface PolicyValidationResult {
  allowed: boolean;
  reason?: string;
  originalTotalINR: number;
  discountedTotalINR: number;
  discountAppliedINR: number;
  suggestedAction?: string;
}

export function evaluatePolicyGate(
  items: CartItem[],
  maxBudgetINR: number
): PolicyValidationResult {
  let originalTotalINR = 0;

  for (const item of items) {
    const product = CATALOG.find((p) => p.sku === item.sku);
    
    // Stock gate check
    if (!product || product.stock < item.quantity) {
      return {
        allowed: false,
        reason: `INSUFFICIENT_STOCK: Item ${item.sku} (${item.name}) is currently out of stock.`,
        originalTotalINR: 0,
        discountedTotalINR: 0,
        discountAppliedINR: 0,
        suggestedAction: 'REMOVE_OUT_OF_STOCK_ITEM_OR_FIND_ALTERNATIVE',
      };
    }
    originalTotalINR += product.priceINR * item.quantity;
  }

  // Dynamic Bundle Rule: If 2 or more distinct SKUs are present, offer 10% discount
  let discountAppliedINR = 0;
  if (items.length >= 2) {
    discountAppliedINR = Math.round(originalTotalINR * 0.10);
  }

  const finalTotalINR = originalTotalINR - discountAppliedINR;

  // Budget gate check
  if (finalTotalINR > maxBudgetINR) {
    return {
      allowed: false,
      reason: `BUDGET_EXCEEDED: Total ₹${finalTotalINR} exceeds buyer cap of ₹${maxBudgetINR}.`,
      originalTotalINR,
      discountedTotalINR: finalTotalINR,
      discountAppliedINR,
      suggestedAction: 'REDUCE_QUANTITY_OR_INCREASE_SPEND_CAP',
    };
  }

  return {
    allowed: true,
    originalTotalINR,
    discountedTotalINR: finalTotalINR,
    discountAppliedINR,
  };
}