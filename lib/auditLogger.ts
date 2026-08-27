import crypto from 'crypto';

export interface AuditRecord {
  id: string;
  timestamp: string;
  eventType: string;
  buyerAgentId: string;
  orderId?: string;
  amountINR?: number;
  discountINR?: number;
  status: 'APPROVED' | 'REJECTED' | 'PAYMENT_PENDING' | 'PAYMENT_CAPTURED';
  hash: string;
  reason?: string;
  suggestedAction?: string;
}

// In-memory ledger for persistent demo session
const globalForLedger = global as unknown as { auditLedger: AuditRecord[] };
export const auditLedger = globalForLedger.auditLedger || [];
if (process.env.NODE_ENV !== 'production') globalForLedger.auditLedger = auditLedger;

export function logAuditEntry(
  entry: Omit<AuditRecord, 'id' | 'timestamp' | 'hash'>
): AuditRecord {
  const id = `aud_${crypto.randomUUID().slice(0, 8)}`;
  const timestamp = new Date().toISOString();

  const prevHash = auditLedger.length > 0 ? auditLedger[0].hash : '0000000000000000';
  const rawPayload = `${id}|${timestamp}|${entry.eventType}|${entry.buyerAgentId}|${entry.status}|${prevHash}`;
  const hash = crypto.createHash('sha256').update(rawPayload).digest('hex');

  const record: AuditRecord = {
    id,
    timestamp,
    ...entry,
    hash,
  };

  auditLedger.unshift(record); // Prepend so newest is always first
  return record;
}

export function getAuditLogs(): AuditRecord[] {
  return auditLedger;
}