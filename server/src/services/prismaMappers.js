import { USD_TO_LKR_RATE, makeSpiceSvg } from '../config/defaultSeedData.js';
import { syncProductMetrics } from './metrics.js';

export function mapUser(row) {
  if (!row) return null;
  return {
    userId: row.userId,
    name: row.name,
    email: row.email,
    role: row.role,
    passwordHash: row.passwordHash,
    isActive: row.isActive,
    sessions: row.sessions ?? 1,
    authorityLevel: row.authorityLevel ?? (row.role === 'STAFF' ? 2 : 3),
    createdAt:
      row.createdAt instanceof Date
        ? row.createdAt.toISOString()
        : row.createdAt,
  };
}

export function mapPublicUser(row) {
  if (!row) return null;
  const mapped = mapUser(row);
  const { passwordHash: _pw, ...pub } = mapped;
  return pub;
}

export function mapProduct(row) {
  const unitPrice = Number(row.unitPrice || 0);
  const costPrice = Number(row.costPrice || 0);
  const defaultSvg = makeSpiceSvg({
    bg1: '#4c1d95',
    bg2: '#7c3aed',
    accent: '#22c55e',
    title: (row.name || 'Ceylon Spice').slice(0, 14),
    code: (row.sku || `SKU-${row.productId}`).slice(-6),
  });

  return syncProductMetrics({
    productId: row.productId,
    sku: row.sku,
    name: row.name,
    category: row.category,
    hsCode: row.hsCode || '0910.99',
    originRegion: row.originRegion || 'Kandy & Matale',
    description: row.description || '',
    imageUrl: row.imageUrl || defaultSvg,
    imagePublicId: row.imagePublicId || null,
    unitPrice,
    unitPriceLkr: Number(
      row.unitPriceLkr || Math.round(unitPrice * USD_TO_LKR_RATE)
    ),
    costPrice,
    costPriceLkr: Number(
      row.costPriceLkr || Math.round(costPrice * USD_TO_LKR_RATE)
    ),
    stockQty: Number(row.stockQty || 0),
    reorderLevel: Number(row.reorderLevel || 150),
    dots: row.dots ?? 2,
    valuationMethod: row.valuationMethod || 'FIFO',
  });
}

export function mapInventoryLog(row) {
  const productName = row.product?.name || row.productName || 'Spice SKU';
  const unitCost = Number(row.unitCost || 0);
  return {
    logId: row.logId,
    productId: row.productId,
    productName,
    movementType: row.movementType,
    quantity: Number(row.quantity || 0),
    unitCost,
    unitCostLkr: Number(
      row.unitCostLkr || Math.round(unitCost * USD_TO_LKR_RATE)
    ),
    referenceNote: row.referenceNote || '',
    logDate:
      row.logDate instanceof Date
        ? row.logDate.toISOString().slice(0, 16).replace('T', ' ')
        : row.logDate || 'Recent time',
  };
}

export function mapSupplier(row) {
  return {
    supplierId: row.supplierId,
    name: row.name,
    country: row.country,
    currency: row.currency || 'LKR',
    contactEmail: row.contactEmail,
    phone: row.phone || '+94 81 220 0000',
    paymentTerms: row.paymentTerms,
    balance: Number(row.balance || 0),
    onTimeRate: Number(row.onTimeRate || 0),
    accuracyRate: Number(row.accuracyRate || 0),
    reliabilityDots: row.reliabilityDots ?? 4,
    featured: Boolean(row.featured),
  };
}

export function mapPurchaseOrder(row) {
  return {
    poId: row.poId,
    poNumber: row.poNumber,
    supplierId: row.supplierId,
    supplierName: row.supplier?.name || row.supplierName || 'Sri Lankan Supplier',
    productName: row.productName || 'Ceylon Alba Cinnamon',
    orderedQty: Number(row.orderedQty || 0),
    currency: row.currency || 'LKR',
    totalAmount: Number(row.totalAmount || 0),
    status: row.status,
    expectedDate:
      row.expectedDate instanceof Date
        ? row.expectedDate.toISOString().slice(0, 10)
        : row.expectedDate || '2026-12-10',
  };
}

export function mapCustomer(row) {
  const creditLimit = Number(row.creditLimit || 0);
  const balance = Number(row.balance || 0);
  return {
    customerId: row.customerId,
    name: row.name,
    country: row.country,
    marketType: row.marketType || 'INTERNATIONAL',
    currency: row.currency || (row.marketType === 'LOCAL' ? 'LKR' : 'USD'),
    contactEmail: row.contactEmail,
    phone: row.phone || '',
    creditLimit,
    balance,
    utilization: Math.min(
      100,
      Math.round((balance / Math.max(creditLimit, 1)) * 100)
    ),
    tier: row.tier || 'Enterprise',
    featured: Boolean(row.featured),
  };
}

export function mapSalesOrder(row) {
  return {
    soId: row.soId,
    soNumber: row.soNumber,
    invoiceCode: row.invoiceCode || row.soNumber.replace('SO-', 'INV-'),
    customerId: row.customerId,
    customerName: row.customer?.name || row.customerName || 'Buyer',
    marketType: row.marketType || row.customer?.marketType || 'INTERNATIONAL',
    currency: row.currency || 'USD',
    productName: row.productName || 'Ceylon Alba Cinnamon',
    quantity: Number(row.quantity || 0),
    totalAmount: Number(row.totalAmount || 0),
    status: row.status,
    paymentStatus: row.paymentStatus,
  };
}

export function mapCommunication(row) {
  return {
    commId: row.commId,
    customerId: row.customerId,
    customerName: row.customer?.name || row.customerName || 'Customer',
    sender: row.senderLabel || row.sender || 'Customer Query',
    prompt: row.subject || row.prompt || '',
    reply: row.notes || row.reply || '',
    attachments: row.attachments || [],
    loggedAt:
      row.loggedAt instanceof Date
        ? row.loggedAt.toISOString().slice(0, 16).replace('T', ' ')
        : row.loggedAt || 'Just now',
  };
}

export function mapTransaction(row) {
  return {
    txnId: row.txnId,
    txnNumber: row.txnNumber,
    title: row.title || row.shippingNotes || row.txnNumber,
    type: row.type,
    currency: row.currency || 'USD',
    status: row.status,
    badge:
      row.badge ||
      (row.type === 'IMPORT'
        ? `Local Procurement (${row.currency || 'LKR'})`
        : 'Active Inspection'),
    hsCode: row.hsCode || '0906.11',
    incoterms: row.incoterms || 'FOB Colombo',
    dutyRate: Number(row.dutyRate || 0),
    dutyAmount: Number(row.dutyAmount || 0),
    originCountry: row.originCountry || 'Sri Lanka',
    destinationCountry: row.destinationCountry || 'USA',
    carrier: row.carrier || 'Maersk Line',
    trackingNumber: row.trackingNumber || '',
    totalValue: Number(row.totalValue || 0),
    partnerName:
      row.partnerName ||
      row.customer?.name ||
      row.supplier?.name ||
      'Trade Partner',
    txnDate:
      row.txnDate instanceof Date
        ? row.txnDate.toISOString().slice(0, 10)
        : row.txnDate || new Date().toISOString().slice(0, 10),
  };
}

export function mapDocument(row) {
  return {
    docId: row.docId,
    txnId: row.txnId ?? null,
    docType: row.docType,
    category: row.category || 'FINANCIAL',
    accessLevel: row.accessLevel || 'MANAGER_ADMIN',
    title: row.title || row.fileName,
    referenceNo: row.referenceNo || null,
    amount: row.amount != null ? Number(row.amount) : null,
    currency: row.currency || null,
    fileName: row.fileName,
    filePath: row.filePath,
    storageKey: row.storageKey || null,
    storageProvider: row.storageProvider || 'CLOUDINARY',
    resourceType: row.resourceType || 'auto',
    deliveryType: row.deliveryType || 'authenticated',
    fileFormat: row.fileFormat || null,
    mimeType: row.mimeType || 'application/octet-stream',
    fileSizeBytes: Number(row.fileSizeBytes || 0),
    notes: row.notes || '',
    generatedDate:
      row.generatedDate instanceof Date
        ? row.generatedDate.toISOString()
        : row.generatedDate || new Date().toISOString(),
    uploadedById: row.uploadedById ?? null,
    uploadedByName: row.uploadedBy?.name || row.uploadedByName || 'Team Member',
  };
}

/**
 * Strips storage secrets/paths from API list payloads until the caller explicitly
 * passes RBAC checks on the document view/access endpoint.
 */
export function sanitizeDocumentSummary(doc) {
  const { filePath: _fp, storageKey: _sk, ...safe } = doc;
  return safe;
}

/**
 * Checks whether the current user is permitted to view/open a stored document
 * according to their role, document accessLevel, and RBAC module permissions.
 */
export function canUserAccessDocument(user, doc, permissions = []) {
  const role = user?.role || 'STAFF';
  if (role === 'ADMIN') return true;

  const access = doc?.accessLevel || 'MANAGER_ADMIN';
  if (access === 'ADMIN_ONLY') return false;

  const rolePerm = permissions.find((p) => p.role === role);
  if (doc?.category === 'FINANCIAL') {
    if (rolePerm && (!rolePerm.financeEnabled || rolePerm.finance === 'Restricted')) {
      return false;
    }
  }

  if (role === 'MANAGER') {
    return access === 'ALL_STAFF' || access === 'MANAGER_ADMIN';
  }

  return access === 'ALL_STAFF';
}
