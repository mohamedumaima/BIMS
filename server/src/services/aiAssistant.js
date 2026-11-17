import { randomUUID } from 'node:crypto';
import { GoogleGenAI } from '@google/genai';
import { env } from '../config/env.js';
import { memoryStore } from './dataStore.js';

/**
 * Builds an RBAC-filtered snapshot of live platform data according to the user's role
 * and the RBAC module permissions table.
 */
export function buildRbacDataContext(user) {
  const role = user?.role || 'STAFF';
  const rolePerm =
    memoryStore.permissions.find((p) => p.role === role) ||
    memoryStore.permissions[2];

  const canViewFinance =
    role === 'ADMIN' ||
    role === 'MANAGER' ||
    (rolePerm.financeEnabled && rolePerm.finance !== 'Restricted');

  const canEditTradeDocs =
    role === 'ADMIN' ||
    role === 'MANAGER' ||
    rolePerm.tradeDocs === 'Edit & View';

  const context = {
    currentUser: {
      name: user?.name || 'BIMS User',
      role,
      permissions: {
        inventory: rolePerm.inventory,
        tradeDocs: rolePerm.tradeDocs,
        finance: rolePerm.finance,
        canDeleteRecords: role === 'ADMIN' || role === 'MANAGER',
        canApprovePurchaseOrders: role === 'ADMIN' || role === 'MANAGER',
        canManageUsers: role === 'ADMIN',
      },
    },
    inventorySpices: memoryStore.products.map((p) => ({
      sku: p.sku,
      name: p.name,
      category: p.category,
      hsCode: p.hsCode,
      stockQtyKg: p.stockQty,
      reorderLevelKg: p.reorderLevel,
      status: p.badge,
      exportPriceUsdPerKg: `$${p.unitPrice}`,
      localPriceLkrPerKg: `Rs. ${Number(p.unitPriceLkr).toLocaleString()}`,
    })),
    shipments: memoryStore.transactions.map((t) => ({
      txnNumber: t.txnNumber,
      title: t.title,
      type: t.type,
      status: t.status,
      hsCode: t.hsCode,
      incoterms: t.incoterms,
      destination: t.destinationCountry,
      partner: t.partnerName,
      declaredValue:
        t.currency === 'LKR'
          ? `Rs. ${Number(t.totalValue).toLocaleString()}`
          : `$${Number(t.totalValue).toLocaleString()} USD`,
    })),
    sriLankanSuppliersLkr: memoryStore.suppliers.map((s) => ({
      name: s.name,
      region: s.country,
      onTimeRate: `${s.onTimeRate}%`,
      paymentTerms: s.paymentTerms,
      outstandingBalanceLkr: `Rs. ${Number(s.balance).toLocaleString()}`,
    })),
    purchaseOrdersLkr: memoryStore.purchaseOrders.map((po) => ({
      poNumber: po.poNumber,
      supplier: po.supplierName,
      spice: po.productName,
      qtyKg: po.orderedQty,
      totalLkr: `Rs. ${Number(po.totalAmount).toLocaleString()}`,
      status: po.status,
    })),
    internationalBuyersUsd: memoryStore.customers
      .filter((c) => c.marketType === 'INTERNATIONAL')
      .map((c) => ({
        name: c.name,
        country: c.country,
        creditLimitUsd: `$${Number(c.creditLimit).toLocaleString()}`,
        balanceUsd: `$${Number(c.balance).toLocaleString()}`,
        utilization: `${c.utilization}%`,
      })),
    localBuyersLkr: memoryStore.customers
      .filter((c) => c.marketType === 'LOCAL')
      .map((c) => ({
        name: c.name,
        region: c.country,
        creditLimitLkr: `Rs. ${Number(c.creditLimit).toLocaleString()}`,
        balanceLkr: `Rs. ${Number(c.balance).toLocaleString()}`,
        utilization: `${c.utilization}%`,
      })),
    canViewFinance,
    canEditTradeDocs,
  };

  if (canViewFinance) {
    context.executiveFinance = {
      internationalExportRevenueUsd: '$485,000 USD',
      domesticLocalRevenueLkr: 'Rs. 68,500,000 LKR',
      operatingExpensesUsd: '$210,000 USD',
      domesticExpensesLkr: 'Rs. 34,200,000 LKR',
      fifoInventoryValuationUsd: '$142,000 USD',
      fifoInventoryValuationLkr: 'Rs. 42,600,000 LKR',
      inventoryTurnoverRatio: '88%',
    };
  }

  if (role === 'ADMIN') {
    context.systemUsers = memoryStore.users.map((u) => ({
      name: u.name,
      email: u.email,
      role: u.role,
      activeSessions: u.sessions,
    }));
  }

  return context;
}

/**
 * Generates an accurate, RBAC-aware local answer when GEMINI_API_KEY is not yet configured.
 */
function generateLocalRbacFallbackReply(prompt, context) {
  const q = (prompt || '').toLowerCase();
  const { role } = context.currentUser;

  if (
    !context.canViewFinance &&
    (q.includes('revenue') ||
      q.includes('profit') ||
      q.includes('margin') ||
      q.includes('expense') ||
      q.includes('financial'))
  ) {
    return `Access Notice (${role} Role): Executive financial KPIs (Revenue, Expenses, and Net Profit Margin) are restricted for Staff accounts under current RBAC permissions. Please contact a Manager or Administrator, or ask me about Inventory Stock, Spice Prices, Suppliers (LKR), Buyers (USD/LKR), or Shipment Tracking!`;
  }

  if (q.includes('low stock') || q.includes('reorder') || q.includes('alert') || q.includes('inventory') || q.includes('spice')) {
    const lowItems = context.inventorySpices.filter((p) => p.status === 'Low Stock');
    const allList = context.inventorySpices
      .map(
        (p) =>
          `• ${p.name} (${p.sku}): ${p.stockQtyKg} kg [${p.status}] — Export: ${p.exportPriceUsdPerKg}/kg | Local: ${p.localPriceLkrPerKg}/kg`
      )
      .join('\n');
    return `Here is the live Sri Lankan Spice Inventory (${context.inventorySpices.length} varieties):\n${allList}\n\nLow-Stock Reorder Alerts: ${
      lowItems.map((i) => `${i.name} (${i.stockQtyKg} kg)`).join(', ') || 'None'
    }.`;
  }

  if (q.includes('supplier') || q.includes('cardamom') || q.includes('po') || q.includes('purchase')) {
    const supList = context.sriLankanSuppliersLkr
      .map(
        (s) =>
          `• ${s.name} (${s.region}) — On-time: ${s.onTimeRate}, Balance: ${s.outstandingBalanceLkr}`
      )
      .join('\n');
    const pendingPos = context.purchaseOrdersLkr
      .filter((p) => p.status === 'PENDING_APPROVAL')
      .map((p) => `${p.poNumber} (${p.supplier} — ${p.totalLkr})`)
      .join(', ');
    return `Sri Lankan Domestic Suppliers (settled in LKR):\n${supList}\n\nPending PO Approvals: ${pendingPos || 'None'}.`;
  }

  if (q.includes('international') || q.includes('local') || q.includes('buyer') || q.includes('customer') || q.includes('invoice')) {
    const intl = context.internationalBuyersUsd
      .map((c) => `• ${c.name} (${c.country}): Balance ${c.balanceUsd} / Limit ${c.creditLimitUsd}`)
      .join('\n');
    const loc = context.localBuyersLkr
      .map((c) => `• ${c.name} (${c.region}): Balance ${c.balanceLkr} / Limit ${c.creditLimitLkr}`)
      .join('\n');
    return `International Buyers (USD $):\n${intl}\n\nLocal Sri Lankan Buyers (LKR Rs.):\n${loc}`;
  }

  if (q.includes('shipment') || q.includes('export') || q.includes('import') || q.includes('customs')) {
    const shipList = context.shipments
      .map(
        (t) =>
          `• ${t.txnNumber} (${t.title}): ${t.status} | ${t.incoterms} | HS ${t.hsCode} | Value: ${t.declaredValue}`
      )
      .join('\n');
    return `Active Import/Export Shipments:\n${shipList}`;
  }

  if (context.canViewFinance && (q.includes('revenue') || q.includes('kpi') || q.includes('report') || q.includes('margin') || q.includes('trend'))) {
    const f = context.executiveFinance;
    return `Executive Financial Summary (${role} Access):\n• International Export Revenue: ${f.internationalExportRevenueUsd}\n• Local Domestic Revenue: ${f.domesticLocalRevenueLkr}\n• Operating Expenses: ${f.operatingExpensesUsd} (Local: ${f.domesticExpensesLkr})\n• FIFO Inventory Valuation: ${f.fifoInventoryValuationUsd} (${f.fifoInventoryValuationLkr})\n• Inventory Turnover Ratio: ${f.inventoryTurnoverRatio}`;
  }

  return `Hello ${context.currentUser.name} (${role})! I have live access to your authorized Ceylon Spices BIMS data:\n• ${context.inventorySpices.length} Sri Lankan spices (priced in USD $ for export & LKR Rs. for local)\n• ${context.internationalBuyersUsd.length} International Buyers (USD $) & ${context.localBuyersLkr.length} Local Buyers (LKR Rs.)\n• ${context.sriLankanSuppliersLkr.length} Sri Lankan Suppliers & ${context.purchaseOrdersLkr.length} Purchase Orders (LKR Rs.)\n• ${context.shipments.length} Active Import/Export Shipments\n\nAsk me about low-stock spices, supplier PO approvals, international vs. local buyer balances, or trade shipments!`;
}

let cachedClientKey = '';
let cachedClient = null;
const MAX_CHAT_SESSIONS = 100;
const MAX_HISTORY_TURNS = 12;
const chatSessionHistory = new Map();

function getGeminiClient(apiKey) {
  if (!cachedClient || cachedClientKey !== apiKey) {
    cachedClient = new GoogleGenAI({ apiKey });
    cachedClientKey = apiKey;
  }
  return cachedClient;
}

/**
 * Picks the lowest-latency thinking config supported by the active model.
 * Pre-3.5 models (such as gemini-3.1-flash-lite) support thinkingBudget: 0 for
 * zero-reasoning latency; 3.5+ models use thinkingLevel instead.
 */
function buildThinkingConfig(model) {
  if (env.geminiThinkingLevel) {
    return { thinkingLevel: env.geminiThinkingLevel.toUpperCase() };
  }
  const normalized = (model || '').toLowerCase();
  if (
    normalized.includes('3.1-flash') ||
    normalized.includes('3-flash') ||
    normalized.includes('2.5')
  ) {
    return { thinkingBudget: 0 };
  }
  if (
    normalized.includes('3.5-flash-lite') ||
    normalized.includes('3.6-flash')
  ) {
    return { thinkingLevel: 'MINIMAL' };
  }
  return { thinkingLevel: 'LOW' };
}

/**
 * Formats the RBAC-filtered context as compact pipe-delimited lines to cut
 * prompt token size and reduce Gemini time-to-first-token latency.
 */
function formatCompactRbacContext(context) {
  const { currentUser } = context;
  const p = currentUser.permissions;
  const lines = [
    `USER: ${currentUser.name} | Role=${currentUser.role} | Inv=${p.inventory} | Docs=${p.tradeDocs} | Fin=${p.finance} | CanApprovePO=${p.canApprovePurchaseOrders} | CanDelete=${p.canDeleteRecords} | CanManageUsers=${p.canManageUsers}`,
    `SPICES: ${context.inventorySpices
      .map(
        (s) =>
          `${s.sku}|${s.name}|${s.category}|HS:${s.hsCode}|Stock:${s.stockQtyKg}kg|Reorder:${s.reorderLevelKg}kg|${s.status}|Export:${s.exportPriceUsdPerKg}/kg|Local:${s.localPriceLkrPerKg}/kg`
      )
      .join(' ; ')}`,
    `SHIPMENTS: ${context.shipments
      .map(
        (t) =>
          `${t.txnNumber}|${t.title}|${t.type}|${t.status}|${t.incoterms}|HS:${t.hsCode}|${t.destination}|${t.partner}|${t.declaredValue}`
      )
      .join(' ; ')}`,
    `SUPPLIERS_LKR: ${context.sriLankanSuppliersLkr
      .map(
        (s) =>
          `${s.name}|${s.region}|OnTime:${s.onTimeRate}|Terms:${s.paymentTerms}|Bal:${s.outstandingBalanceLkr}`
      )
      .join(' ; ')}`,
    `PO_LKR: ${context.purchaseOrdersLkr
      .map(
        (po) =>
          `${po.poNumber}|${po.supplier}|${po.spice}|${po.qtyKg}kg|${po.totalLkr}|${po.status}`
      )
      .join(' ; ')}`,
    `INTL_BUYERS_USD: ${context.internationalBuyersUsd
      .map(
        (b) =>
          `${b.name}|${b.country}|Bal:${b.balanceUsd}|Limit:${b.creditLimitUsd}|Util:${b.utilization}`
      )
      .join(' ; ')}`,
    `LOCAL_BUYERS_LKR: ${context.localBuyersLkr
      .map(
        (b) =>
          `${b.name}|${b.region}|Bal:${b.balanceLkr}|Limit:${b.creditLimitLkr}|Util:${b.utilization}`
      )
      .join(' ; ')}`,
  ];

  if (context.executiveFinance) {
    const f = context.executiveFinance;
    lines.push(
      `EXEC_FINANCE: ExportRev=${f.internationalExportRevenueUsd}|LocalRev=${f.domesticLocalRevenueLkr}|OpExp=${f.operatingExpensesUsd}|LocalExp=${f.domesticExpensesLkr}|FIFO_Val=${f.fifoInventoryValuationUsd} (${f.fifoInventoryValuationLkr})|Turnover=${f.inventoryTurnoverRatio}`
    );
  } else {
    lines.push('EXEC_FINANCE: RESTRICTED');
  }

  if (context.systemUsers) {
    lines.push(
      `USERS: ${context.systemUsers
        .map((u) => `${u.name}|${u.email}|${u.role}|Sessions:${u.activeSessions}`)
        .join(' ; ')}`
    );
  }

  return lines.join('\n');
}

function saveSessionHistory(sessionId, scopeKey, history) {
  if (chatSessionHistory.has(sessionId)) {
    chatSessionHistory.delete(sessionId);
  } else if (chatSessionHistory.size >= MAX_CHAT_SESSIONS) {
    const oldestKey = chatSessionHistory.keys().next().value;
    chatSessionHistory.delete(oldestKey);
  }
  chatSessionHistory.set(sessionId, {
    scopeKey,
    turns: history.slice(-MAX_HISTORY_TURNS),
  });
}

export async function askBimsAiAssistant({ user, message, previousInteractionId }) {
  const context = buildRbacDataContext(user);
  const apiKey = (env.geminiApiKey || process.env.GEMINI_API_KEY || '').trim();
  const model = env.geminiModel;

  if (!apiKey || env.nodeEnv === 'test') {
    return {
      reply: generateLocalRbacFallbackReply(message, context),
      interactionId: null,
      provider: apiKey
        ? 'bims-rbac-engine (test mode)'
        : 'bims-rbac-engine (set GEMINI_API_KEY in server/.env for live Gemini AI)',
      role: context.currentUser.role,
      geminiConfigured: Boolean(apiKey),
    };
  }

  const systemInstruction = `You are the official Ceylon Spices BIMS AI Assistant for an International & Domestic Spice Import-Export ERP in Sri Lanka.
Strict RBAC & Currency Rules:
1. Answer ONLY using the authorized live data below.
2. International Buyers and Export Declarations use US Dollars (USD $).
3. Local Sri Lankan Buyers, Sri Lankan Suppliers, and Domestic Purchase Orders use Sri Lankan Rupees (LKR Rs.).
4. If the user's role is STAFF and they ask for restricted Executive Finance metrics (Revenue, Expenses, Net Margin) or User Management data not in their context, politely explain that executive financial data is restricted for Staff accounts and their ${context.currentUser.role} role does not have permission.
5. Reply directly in plain, readable text with concise bullet points (never output raw JSON).

${formatCompactRbacContext(context)}`;

  const scopeKey = `${context.currentUser.role}:${context.currentUser.name}`;
  const priorSession =
    previousInteractionId && chatSessionHistory.get(previousInteractionId);
  const priorTurns =
    priorSession && priorSession.scopeKey === scopeKey ? priorSession.turns : [];
  const contents = [
    ...priorTurns,
    { role: 'user', parts: [{ text: message }] },
  ];

  try {
    const client = getGeminiClient(apiKey);
    const response = await client.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction,
        thinkingConfig: buildThinkingConfig(model),
      },
    });

    const reply =
      (response.text || '').trim() ||
      generateLocalRbacFallbackReply(message, context);
    const sessionId =
      priorSession && priorSession.scopeKey === scopeKey
        ? previousInteractionId
        : randomUUID();

    saveSessionHistory(sessionId, scopeKey, [
      ...contents,
      { role: 'model', parts: [{ text: reply }] },
    ]);

    return {
      reply,
      interactionId: sessionId,
      provider: model,
      role: context.currentUser.role,
      geminiConfigured: true,
    };
  } catch (err) {
    return {
      reply: `${generateLocalRbacFallbackReply(message, context)}\n\n(Note: Gemini API call returned "${err.message}" — served via BIMS RBAC Engine.)`,
      interactionId: null,
      provider: 'bims-rbac-fallback',
      role: context.currentUser.role,
      geminiConfigured: Boolean(apiKey),
    };
  }
}
