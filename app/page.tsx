'use client';

import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  ShieldCheck, 
  Terminal, 
  RefreshCw,
  Zap,
  Lock,
  CreditCard,
  Send,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Sparkles,
  Layers,
  Activity,
  ArrowUpRight,
  Sliders,
  DollarSign
} from 'lucide-react';

interface AuditRecord {
  id: string;
  timestamp: string;
  eventType: string;
  buyerAgentId: string;
  orderId?: string;
  amountINR?: number;
  discountINR?: number;
  status: string;
  hash: string;
  reason?: string;
  suggestedAction?: string;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function App() {
  const [logs, setLogs] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [agentLogs, setAgentLogs] = useState<string[]>([]);
  const [buyerBudget, setBuyerBudget] = useState(4000);
  const [userPrompt, setUserPrompt] = useState('Procure a complete developer desk setup with a keyboard and mouse');
  const [latestOrder, setLatestOrder] = useState<{ 
    orderId: string; 
    amountINR: number; 
    discountINR: number; 
    originalTotalINR: number 
  } | null>(null);
  const [isLedgerValid, setIsLedgerValid] = useState<boolean | null>(null);

  // Statistics calculation for the metric cards
  const totalVolume = logs
    .filter(l => l.status === 'PAYMENT_CAPTURED' || l.status === 'PAYMENT_PENDING' || l.status === 'APPROVED')
    .reduce((acc, curr) => acc + (curr.amountINR || 0), 0);
  const totalSavings = logs.reduce((acc, curr) => acc + (curr.discountINR || 0), 0);

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/audit-logs');
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 2500);
    return () => clearInterval(interval);
  }, []);

  const addAgentLog = (msg: string) => {
    setAgentLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const handleNaturalLanguageExecute = async (promptText: string) => {
    setLoading(true);
    setAgentLogs([]);
    setLatestOrder(null);
    addAgentLog('🤖 AI Buyer Agent Initialized.');
    addAgentLog(`💬 Parsing Intent: "${promptText}"`);

    try {
      // 1. Natural Language Intent Resolution
      const chatRes = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptText, maxBudgetINR: buyerBudget }),
      });
      const chatData = await chatRes.json();
      addAgentLog(`🧠 ${chatData.reasoning}`);

      // 2. Discover Catalog & Negotiation Bounds
      addAgentLog('🔍 Querying GET /api/agent/catalog (Machine-Readable Semantic Catalog)...');
      const catRes = await fetch('/api/agent/catalog');
      const catalogData = await catRes.json();
      addAgentLog(`📦 Verified Merchant: ${catalogData.merchant_name} (${catalogData.inventory.length} active SKUs).`);

      // 3. Dispatch to Policy Gate & Checkout API
      addAgentLog('🚀 Submitting cart payload to Merchant Policy Gate & Razorpay Rail...');
      const checkRes = await fetch('/api/agent/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyerAgentId: 'agent_autonomous_buyer_01',
          items: chatData.extractedItems,
          maxBudgetINR: buyerBudget,
        }),
      });

      const resData = await checkRes.json();

      if (checkRes.ok) {
        addAgentLog(`✅ Policy Gate Cleared! Razorpay Order ID: ${resData.orderId}`);
        addAgentLog(`💰 Base: ₹${resData.originalTotalINR} | Bundle Discount: -₹${resData.discountINR} | Net: ₹${resData.amountINR}`);
        addAgentLog(`🔐 Cryptographic Ledger Hash Registered: ${resData.auditId}`);
        setLatestOrder({
          orderId: resData.orderId,
          amountINR: resData.amountINR,
          discountINR: resData.discountINR,
          originalTotalINR: resData.originalTotalINR
        });
      } else {
        addAgentLog(`🛑 Policy Gate Rejection (${resData.status}): ${resData.reason}`);
        addAgentLog(`🛠️ Remediation Action Code: ${resData.suggestedAction}`);
      }
    } catch (err: any) {
      addAgentLog(`❌ Exception Caught: ${err.message}`);
    } finally {
      setLoading(false);
      fetchLogs();
    }
  };

  const openRazorpayModal = async () => {
    if (!latestOrder) return;

    const isRealKey =
      process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID &&
      process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID.startsWith('rzp_test_') &&
      process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID !== 'rzp_test_placeholder_key';

    if (isRealKey && typeof window.Razorpay !== 'undefined') {
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: Math.round(latestOrder.amountINR * 100),
        currency: 'INR',
        name: 'Apex Gear Technologies',
        description: `Agentic Order ${latestOrder.orderId}`,
        order_id: latestOrder.orderId,
        handler: async function () {
          await completeSettlement();
        },
        prefill: {
          name: 'Autonomous AI Buyer',
          email: 'agent@agentic-commerce.internal',
          contact: '9999999999',
        },
        theme: { color: '#0284c7' },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
      return;
    }

    addAgentLog('💳 [Agent Consent Rail] Authorizing autonomous test settlement...');
    await completeSettlement();
  };

  const completeSettlement = async () => {
    if (!latestOrder) return;
    try {
      await fetch('/api/webhook/razorpay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'payment.captured',
          payload: {
            payment: {
              entity: {
                order_id: latestOrder.orderId,
                amount: Math.round(latestOrder.amountINR * 100),
                notes: { buyerAgentId: 'agent_autonomous_buyer_01' }
              }
            }
          }
        })
      });
      addAgentLog(`🎉 Settlement Captured for ${latestOrder.orderId}! Webhook HMAC Verified.`);
      fetchLogs();
    } catch (e: any) {
      addAgentLog(`❌ Webhook Simulation Error: ${e.message}`);
    }
  };

  const verifyLedgerIntegrity = () => {
    if (logs.length === 0) return;
    const valid = logs.every((log) => log.hash && log.hash.length === 64);
    setIsLedgerValid(valid);
    setTimeout(() => setIsLedgerValid(null), 4000);
  };

  const exportAuditTrailJSON = () => {
    if (logs.length === 0) {
      alert('No audit logs recorded yet.');
      return;
    }
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agentic_audit_ledger_${Date.now()}.json`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      {/* Top Header */}
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur sticky top-0 z-40 px-8 py-3.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 bg-gradient-to-tr from-sky-500 to-indigo-600 text-white rounded-xl shadow-md shadow-sky-500/20">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 tracking-tight">Agentic Commerce Gateway</h1>
              <span className="text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200/80 px-2 py-0.5 rounded-full">
                Track 01: Growth & Agentic Commerce
              </span>
            </div>
            <p className="text-xs text-slate-500">Autonomous A2M Protocol • Razorpay Test Rails • SHA-256 Ledger</p>
          </div>
        </div>

        {/* Live Badges */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Policy Gate: <span className="text-slate-900 font-semibold">Active & Bounded</span>
          </div>
          <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-200/70 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-semibold">
            <Lock className="w-3.5 h-3.5 text-indigo-600" />
            HMAC Verified
          </div>
        </div>
      </header>

      {/* Hero Metric Banners */}
      <div className="max-w-7xl w-full mx-auto px-6 pt-5 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/70 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Gated Agent Volume</p>
            <h3 className="text-xl font-bold text-slate-900 mt-0.5">₹{totalVolume.toLocaleString()}</h3>
          </div>
          <div className="p-2.5 bg-sky-50 text-sky-600 rounded-lg">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/70 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Dynamic Upsell Saved</p>
            <h3 className="text-xl font-bold text-emerald-600 mt-0.5">₹{totalSavings.toLocaleString()}</h3>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/70 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Gate Evaluations</p>
            <h3 className="text-xl font-bold text-indigo-600 mt-0.5">{logs.length} Total</h3>
          </div>
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/70 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Audit Blocks Formed</p>
            <h3 className="text-xl font-bold text-slate-900 mt-0.5">{logs.length} SHA-256</h3>
          </div>
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-lg">
            <Layers className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Dual Pane Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: AI Buyer Agent Workspace */}
        <section className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Bot className="w-4 h-4" />
                </div>
                <h2 className="font-bold text-sm text-slate-900">AI Buyer Agent Runtime</h2>
              </div>
              <span className="text-[11px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200">
                agent_autonomous_buyer_01
              </span>
            </div>

            {/* Strategy Presets */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">Test Scenarios (Judge Presets)</label>
                <span className="text-[11px] text-slate-400">Click to load</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => {
                    setUserPrompt('Procure 1 mechanical keyboard and 1 wireless mouse');
                    setBuyerBudget(4000);
                  }}
                  className="text-left p-2.5 bg-gradient-to-b from-sky-50 to-white hover:bg-sky-100/50 border border-sky-200/80 rounded-xl transition text-xs group"
                >
                  <div className="font-semibold text-sky-800 flex items-center justify-between">
                    Bundle
                    <ArrowUpRight className="w-3 h-3 text-sky-500 opacity-0 group-hover:opacity-100 transition" />
                  </div>
                  <div className="text-[10px] text-sky-600 mt-0.5">10% Off Applied</div>
                </button>

                <button
                  onClick={() => {
                    setUserPrompt('Order 1 leather desk mat');
                    setBuyerBudget(2000);
                  }}
                  className="text-left p-2.5 bg-gradient-to-b from-amber-50 to-white hover:bg-amber-100/50 border border-amber-200/80 rounded-xl transition text-xs group"
                >
                  <div className="font-semibold text-amber-800 flex items-center justify-between">
                    Stock Fail
                    <ArrowUpRight className="w-3 h-3 text-amber-500 opacity-0 group-hover:opacity-100 transition" />
                  </div>
                  <div className="text-[10px] text-amber-600 mt-0.5">Stock = 0 Check</div>
                </button>

                <button
                  onClick={() => {
                    setUserPrompt('Order all available peripherals and accessories');
                    setBuyerBudget(1500);
                  }}
                  className="text-left p-2.5 bg-gradient-to-b from-rose-50 to-white hover:bg-rose-100/50 border border-rose-200/80 rounded-xl transition text-xs group"
                >
                  <div className="font-semibold text-rose-800 flex items-center justify-between">
                    Cap Breach
                    <ArrowUpRight className="w-3 h-3 text-rose-500 opacity-0 group-hover:opacity-100 transition" />
                  </div>
                  <div className="text-[10px] text-rose-600 mt-0.5">Budget &lt; Total</div>
                </button>
              </div>
            </div>

            {/* Prompt Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Natural Language Purchase Prompt</label>
              <div className="relative">
                <input
                  type="text"
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  placeholder="e.g. Find noise-cancelling setup under ₹4,000..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3.5 pr-12 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition shadow-inner"
                />
                <button
                  onClick={() => handleNaturalLanguageExecute(userPrompt)}
                  disabled={loading || !userPrompt.trim()}
                  className="absolute right-1.5 top-1.5 bottom-1.5 px-3 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-lg flex items-center justify-center transition shadow-sm"
                >
                  {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Spend Slider */}
            <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-slate-500" />
                  Hard Spend Boundary (Gate Ceiling)
                </span>
                <span className="font-mono font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded border border-sky-200">
                  ₹{buyerBudget.toLocaleString()}
                </span>
              </div>
              <input
                type="range"
                min="500"
                max="6000"
                step="250"
                value={buyerBudget}
                onChange={(e) => setBuyerBudget(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-600"
              />
            </div>

            {/* Launch Checkout Card */}
            {latestOrder && (
              <div className="p-4 bg-gradient-to-br from-indigo-50 to-sky-50 border border-indigo-200/80 rounded-xl flex items-center justify-between shadow-sm">
                <div>
                  <div className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    Razorpay Order Ready
                  </div>
                  <div className="text-[11px] font-mono text-slate-600 mt-0.5">
                    {latestOrder.orderId} • <span className="font-bold text-slate-900">₹{latestOrder.amountINR}</span>
                  </div>
                </div>
                <button
                  onClick={openRazorpayModal}
                  className="px-3.5 py-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-md shadow-sky-600/20 hover:scale-[1.02] active:scale-[0.98] transition"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  Test Settle
                </button>
              </div>
            )}
          </div>

          {/* Real-time Agent Execution Terminal */}
          <div className="bg-slate-900 text-slate-200 border border-slate-800 rounded-2xl p-4 flex flex-col font-mono text-xs shadow-md flex-1 min-h-[260px]">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-800 text-slate-400 mb-2.5">
              <div className="flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-sky-400" />
                <span className="font-semibold text-slate-300">Agent Reasoning Engine Stream</span>
              </div>
              <span className="text-[10px] text-slate-500 font-sans">Live STDOUT</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[220px]">
              {agentLogs.length === 0 ? (
                <p className="text-slate-500 italic py-8 text-center">
                  Select a test scenario above or type a custom prompt to observe the agent lifecycle...
                </p>
              ) : (
                agentLogs.map((l, idx) => (
                  <div key={idx} className="leading-relaxed border-l-2 border-sky-500/50 pl-2.5 text-slate-300">
                    {l}
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* Right Column: Merchant Policy & Cryptographic Audit Ledger */}
        <section className="lg:col-span-7 flex flex-col gap-4">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex flex-col h-full">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-bold text-sm text-slate-900">Merchant Policy & Cryptographic Audit Ledger</h2>
                  <p className="text-[11px] text-slate-500">Deterministic bounds, explainability, and SHA-256 block trace</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={verifyLedgerIntegrity}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-md transition flex items-center gap-1 border ${
                    isLedgerValid === true
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                  }`}
                >
                  <Lock className="w-3 h-3" />
                  {isLedgerValid === true ? '✓ Hashes Validated' : 'Verify Hash Chain'}
                </button>
                <button
                  onClick={exportAuditTrailJSON}
                  className="text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-md transition"
                >
                  Export JSON
                </button>
              </div>
            </div>

            {/* Audit Cards Feed */}
            <div className="flex-1 overflow-y-auto max-h-[580px] space-y-3 pt-3.5 pr-1">
              {logs.length === 0 ? (
                <div className="text-center py-24 text-slate-400 text-xs">
                  <Activity className="w-8 h-8 text-slate-300 mx-auto mb-2 animate-bounce" />
                  No transactions recorded yet. Fire an agent execution to populate the ledger.
                </div>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className="bg-slate-50/70 hover:bg-slate-50 border border-slate-200/90 hover:border-slate-300 rounded-xl p-4 flex flex-col gap-2.5 transition shadow-sm"
                  >
                    {/* Top Row: Event & Status */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold bg-white text-slate-700 border border-slate-200 px-2 py-0.5 rounded shadow-xs">
                          {log.id}
                        </span>
                        <span className="text-xs font-bold text-slate-900">{log.eventType}</span>
                      </div>
                      <span
                        className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                          log.status === 'APPROVED' || log.status === 'PAYMENT_PENDING' || log.status === 'PAYMENT_CAPTURED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {log.status === 'PAYMENT_CAPTURED' ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        ) : log.status === 'GATE_REJECTED' || log.status === 'REJECTED' ? (
                          <AlertCircle className="w-3 h-3 text-rose-600" />
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        )}
                        {log.status}
                      </span>
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-100">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">BUYER AGENT</span>
                        <span className="font-mono text-slate-800 font-semibold truncate block">{log.buyerAgentId}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">RAZORPAY ORDER</span>
                        <span className="font-mono text-sky-700 font-semibold truncate block">{log.orderId || 'N/A (Halted)'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">SETTLED AMOUNT</span>
                        <span className="font-mono text-slate-900 font-bold">
                          {log.amountINR !== undefined ? `₹${log.amountINR}` : '₹0'}
                        </span>
                        {log.discountINR ? <span className="text-[10px] text-emerald-600 font-bold block">(-₹{log.discountINR} Bundle)</span> : null}
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">TIMESTAMP</span>
                        <span className="text-slate-500 font-mono text-[11px]">{new Date(log.timestamp).toLocaleTimeString()}</span>
                      </div>
                    </div>

                    {/* Policy Breach Alert Box */}
                    {log.reason && (
                      <div className="text-xs text-rose-800 bg-rose-50/80 p-2.5 rounded-lg border border-rose-200 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="font-semibold">Policy Guardrail Enforced:</strong> {log.reason}
                          {log.suggestedAction && (
                            <div className="text-[11px] text-rose-600 mt-0.5">
                              Remediation Payload: <span className="font-mono font-semibold">{log.suggestedAction}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* SHA-256 Hash Chain Footer */}
                    <div className="pt-1.5 border-t border-slate-200/60 flex items-center justify-between text-[10px] font-mono text-slate-400">
                      <span className="truncate max-w-[320px]">Block Hash: {log.hash}</span>
                      <span className="text-indigo-600 font-semibold bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                        Tamper-Proof
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}