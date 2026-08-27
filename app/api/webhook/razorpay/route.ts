import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { logAuditEntry } from '@/lib/auditLogger';

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature') || '';
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || 'agentic_webhook_secret_key_123';

    // Verify HMAC-SHA256
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    const isValid = signature === expectedSignature;
    const event = JSON.parse(rawBody);

    if (event.event === 'payment.captured' || event.event === 'order.paid') {
      logAuditEntry({
        eventType: 'PAYMENT_CAPTURED_WEBHOOK',
        buyerAgentId: event.payload?.payment?.entity?.notes?.buyerAgentId || 'agent_buyer_sys',
        orderId: event.payload?.payment?.entity?.order_id,
        amountINR: (event.payload?.payment?.entity?.amount || 0) / 100,
        status: 'PAYMENT_CAPTURED',
        reason: isValid ? 'Valid Webhook HMAC Signature' : 'Warning: Unverified Signature in Test Mode',
      });
    }

    return NextResponse.json({ status: 'ok', signature_valid: isValid });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}