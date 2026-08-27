import { NextResponse } from 'next/server';
import { getAuditLogs } from '@/lib/auditLogger';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ logs: getAuditLogs() });
}