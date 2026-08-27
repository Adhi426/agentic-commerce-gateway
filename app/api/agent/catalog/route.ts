import { NextResponse } from 'next/server';
import { CATALOG } from '@/lib/policyGate';

export async function GET() {
  // Returns agent-readable JSON schema
  return NextResponse.json({
    protocol: 'agentic-commerce/v1',
    merchant_name: 'Apex Gear Technologies',
    currency: 'INR',
    negotiation_rules: {
      bundle_discount_threshold_items: 2,
      bundle_discount_percentage: 10,
    },
    inventory: CATALOG,
  });
}