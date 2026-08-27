import { NextResponse } from 'next/server';
import { CATALOG } from '@/lib/policyGate';

export async function POST(req: Request) {
  try {
    const { prompt, maxBudgetINR } = await req.json();
    const cleanPrompt = (prompt || '').toLowerCase();

    const selectedItems: Array<{ sku: string; name: string; priceINR: number; quantity: number }> = [];

    // Semantic intent parser over catalog items
    if (cleanPrompt.includes('keyboard') || cleanPrompt.includes('typing') || cleanPrompt.includes('coding') || cleanPrompt.includes('setup') || cleanPrompt.includes('all')) {
      const kb = CATALOG.find(c => c.sku === 'SKU-KB-01');
      if (kb) selectedItems.push({ sku: kb.sku, name: kb.name, priceINR: kb.priceINR, quantity: 1 });
    }

    if (cleanPrompt.includes('mouse') || cleanPrompt.includes('precision') || cleanPrompt.includes('setup') || cleanPrompt.includes('all')) {
      const ms = CATALOG.find(c => c.sku === 'SKU-MS-02');
      if (ms) selectedItems.push({ sku: ms.sku, name: ms.name, priceINR: ms.priceINR, quantity: 1 });
    }

    if (cleanPrompt.includes('mat') || cleanPrompt.includes('pad') || cleanPrompt.includes('leather')) {
      const mat = CATALOG.find(c => c.sku === 'SKU-MAT-03');
      if (mat) selectedItems.push({ sku: mat.sku, name: mat.name, priceINR: mat.priceINR, quantity: 1 });
    }

    // Default fallback if query is general
    if (selectedItems.length === 0) {
      const kb = CATALOG.find(c => c.sku === 'SKU-KB-01')!;
      selectedItems.push({ sku: kb.sku, name: kb.name, priceINR: kb.priceINR, quantity: 1 });
    }

    return NextResponse.json({
      intent: 'CHECKOUT_INTENT_RESOLVED',
      reasoning: `Extracted ${selectedItems.length} candidate items matching natural language intent: "${prompt}"`,
      extractedItems: selectedItems,
      suggestedBudget: maxBudgetINR || 4000
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}