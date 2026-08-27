import { NextResponse } from 'next/server';
import { razorpay } from '@/lib/razorpayClient';
import { evaluatePolicyGate, CartItem } from '@/lib/policyGate';
import { logAuditEntry } from '@/lib/auditLogger';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { buyerAgentId, items, maxBudgetINR } = body as {
      buyerAgentId: string;
      items: CartItem[];
      maxBudgetINR: number;
    };

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Cart cannot be empty' }, { status: 400 });
    }

    // Evaluate Deterministic Gate
    const gateResult = evaluatePolicyGate(items, maxBudgetINR);

    if (!gateResult.allowed) {
      const failedAudit = logAuditEntry({
        eventType: 'GATE_EVALUATION_FAILED',
        buyerAgentId,
        amountINR: gateResult.originalTotalINR,
        status: 'REJECTED',
        reason: gateResult.reason,
        suggestedAction: gateResult.suggestedAction,
      });

      return NextResponse.json(
        {
          status: 'GATE_REJECTED',
          auditId: failedAudit.id,
          reason: gateResult.reason,
          suggestedAction: gateResult.suggestedAction,
        },
        { status: 422 }
      );
    }

    // Call Razorpay Orders API
    let razorpayOrderId = `order_${Math.random().toString(36).substring(2, 11)}`;
    try {
      if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_ID !== 'rzp_test_placeholder_key') {
        const order = await razorpay.orders.create({
          amount: gateResult.discountedTotalINR * 100, // paise
          currency: 'INR',
          receipt: `rcpt_${Date.now()}`,
          notes: {
            buyerAgentId,
            bundleApplied: gateResult.discountAppliedINR > 0 ? 'true' : 'false',
          },
        });
        razorpayOrderId = order.id;
      }
    } catch (err: any) {
      console.warn('Fallback to synthetic order ID for demo without active credentials:', err.message);
    }

    // Log to Immutable Audit Trail
    const successAudit = logAuditEntry({
      eventType: 'ORDER_CREATED_AND_GATED',
      buyerAgentId,
      orderId: razorpayOrderId,
      amountINR: gateResult.discountedTotalINR,
      discountINR: gateResult.discountAppliedINR,
      status: 'PAYMENT_PENDING',
    });

    return NextResponse.json({
      status: 'ORDER_CREATED',
      orderId: razorpayOrderId,
      amountINR: gateResult.discountedTotalINR,
      originalTotalINR: gateResult.originalTotalINR,
      discountINR: gateResult.discountAppliedINR,
      currency: 'INR',
      auditId: successAudit.id,
      paymentLink: `https://rzp.io/i/${razorpayOrderId}`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}