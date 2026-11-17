import { env } from '../config/env.js';
import { askBimsAiAssistant, buildRbacDataContext } from '../services/aiAssistant.js';
import {
  advanceShipmentStatus,
  createCustomerRecord,
  createProductSku,
  createPurchaseOrderRecord,
  createSalesInvoiceRecord,
  createSupplierRecord,
  createSystemUser,
  createTradeDeclaration,
  deleteCustomerRecord,
  deleteProductSku,
  deletePurchaseOrderRecord,
  deleteSalesInvoiceRecord,
  deleteSupplierRecord,
  deleteSystemUser,
  deleteTradeDeclaration,
  findTransactionById,
  getCustomersBundle,
  getInventoryBundle,
  getReportsAndDashboardSummary,
  getShipmentsBundle,
  getSuppliersBundle,
  listUsersAndSecurity,
  recordInventoryMovement,
  toggleRolePermission,
  updateCustomerRecord,
  updateProductSku,
  updatePurchaseOrderRecord,
  updatePurchaseOrderStatus,
  updateSalesInvoiceRecord,
  updateSupplierRecord,
  updateSystemUser,
  updateTradeDeclaration,
} from '../services/dataStore.js';
import { storeUploadedProductImage } from '../utils/fileStorage.js';
import {
  streamAnalyticsReportPdf,
  streamTradeDocumentPdf,
} from '../utils/pdfGenerator.js';

export async function getPublicCatalog(_req, res) {
  const inv = await getInventoryBundle();
  const summary = await getReportsAndDashboardSummary();
  res.json({
    spices: inv.products,
    kpis: summary.kpis,
    exportByCountry: summary.exportByCountry,
  });
}

export async function getDashboard(_req, res) {
  const data = await getReportsAndDashboardSummary();
  res.json(data);
}

export async function getInventory(_req, res) {
  const data = await getInventoryBundle();
  res.json(data);
}

export async function addProduct(req, res) {
  const uploadedImageUrl = await storeUploadedProductImage(req.file);
  const data = await createProductSku({
    ...req.body,
    ...(uploadedImageUrl ? { imageUrl: uploadedImageUrl } : {}),
  });
  res.status(201).json(data);
}

export async function editProduct(req, res) {
  const uploadedImageUrl = await storeUploadedProductImage(req.file);
  const data = await updateProductSku(req.params.productId, {
    ...req.body,
    ...(uploadedImageUrl ? { imageUrl: uploadedImageUrl } : {}),
  });
  res.json(data);
}

export async function removeProduct(req, res) {
  const data = await deleteProductSku(req.params.productId);
  res.json(data);
}

export async function addInventoryMovement(req, res) {
  const data = await recordInventoryMovement(req.body);
  res.status(201).json(data);
}

export async function getShipments(_req, res) {
  const data = await getShipmentsBundle();
  res.json(data);
}

export async function addShipment(req, res) {
  const data = await createTradeDeclaration(req.body);
  res.status(201).json(data);
}

export async function editShipment(req, res) {
  const data = await updateTradeDeclaration(req.params.txnId, req.body);
  res.json(data);
}

export async function removeShipment(req, res) {
  const data = await deleteTradeDeclaration(req.params.txnId);
  res.json(data);
}

export async function updateShipmentStatus(req, res) {
  const data = await advanceShipmentStatus(req.params.txnId, req.body.status);
  res.json(data);
}

export async function downloadTradeDocumentPdf(req, res) {
  const { txnId, docType } = req.params;
  const txn = findTransactionById(txnId);
  streamTradeDocumentPdf(res, txn, (docType || 'COMMERCIAL_INVOICE').toUpperCase());
}

export async function getSuppliers(_req, res) {
  const data = await getSuppliersBundle();
  res.json(data);
}

export async function addSupplier(req, res) {
  const data = await createSupplierRecord(req.body);
  res.status(201).json(data);
}

export async function editSupplier(req, res) {
  const data = await updateSupplierRecord(req.params.supplierId, req.body);
  res.json(data);
}

export async function removeSupplier(req, res) {
  const data = await deleteSupplierRecord(req.params.supplierId);
  res.json(data);
}

export async function addPurchaseOrder(req, res) {
  const data = await createPurchaseOrderRecord(req.body);
  res.status(201).json(data);
}

export async function editPurchaseOrder(req, res) {
  const data = await updatePurchaseOrderRecord(req.params.poId, req.body);
  res.json(data);
}

export async function removePurchaseOrder(req, res) {
  const data = await deletePurchaseOrderRecord(req.params.poId);
  res.json(data);
}

export async function changePurchaseOrderStatus(req, res) {
  const data = await updatePurchaseOrderStatus(req.params.poId, req.body.status);
  res.json(data);
}

export async function getCustomers(_req, res) {
  const data = await getCustomersBundle();
  res.json(data);
}

export async function addCustomer(req, res) {
  const data = await createCustomerRecord(req.body);
  res.status(201).json(data);
}

export async function editCustomer(req, res) {
  const data = await updateCustomerRecord(req.params.customerId, req.body);
  res.json(data);
}

export async function removeCustomer(req, res) {
  const data = await deleteCustomerRecord(req.params.customerId);
  res.json(data);
}

export async function addSalesInvoice(req, res) {
  const data = await createSalesInvoiceRecord(req.body);
  res.status(201).json(data);
}

export async function editSalesInvoice(req, res) {
  const data = await updateSalesInvoiceRecord(req.params.soId, req.body);
  res.json(data);
}

export async function removeSalesInvoice(req, res) {
  const data = await deleteSalesInvoiceRecord(req.params.soId);
  res.json(data);
}

export async function getUsersSettings(_req, res) {
  const data = await listUsersAndSecurity();
  res.json(data);
}

export async function addUserAccount(req, res) {
  const user = await createSystemUser(req.body);
  const bundle = await listUsersAndSecurity();
  res.status(201).json({ user, ...bundle });
}

export async function editUserAccount(req, res) {
  const bundle = await updateSystemUser(req.params.userId, req.body);
  res.json(bundle);
}

export async function removeUserAccount(req, res) {
  const bundle = await deleteSystemUser(req.params.userId, req.user?.userId);
  res.json(bundle);
}

export async function updateRolePermission(req, res) {
  const data = toggleRolePermission({
    role: req.body.role,
    field: req.body.field,
    actorName: req.user?.name,
  });
  res.json(data);
}

export async function getAssistantStatus(req, res) {
  const context = buildRbacDataContext(req.user);
  const configured = Boolean((env.geminiApiKey || process.env.GEMINI_API_KEY || '').trim());
  res.json({
    geminiConfigured: configured,
    model: env.geminiModel,
    role: context.currentUser.role,
    permissions: context.currentUser.permissions,
  });
}

export async function chatWithAssistant(req, res) {
  const { message, previousInteractionId } = req.body;
  if (!message || !String(message).trim()) {
    return res.status(400).json({ error: 'Message is required' });
  }
  const result = await askBimsAiAssistant({
    user: req.user,
    message: String(message).trim(),
    previousInteractionId,
  });
  return res.json(result);
}

export async function exportReportPdf(_req, res) {
  const summary = await getReportsAndDashboardSummary();
  streamAnalyticsReportPdf(res, summary);
}

export async function exportReportCsv(_req, res) {
  const summary = await getReportsAndDashboardSummary();
  const rows = [
    ['Section', 'Item / Metric', 'Market / Category', 'Currency', 'Value / Quantity', 'Status / Share'],
    ['Financial KPI', 'International Export Revenue', 'International', 'USD', `$${summary.kpis.revenue.toLocaleString()}`, 'Active'],
    ['Financial KPI', 'Domestic Spice Revenue', 'Sri Lanka Local', 'LKR', `Rs. ${summary.kpis.revenueLkr.toLocaleString()}`, 'Active'],
    ['Financial KPI', 'FIFO Valuation (USD)', 'Global', 'USD', `$${summary.kpis.fifoValuation.toLocaleString()}`, '94% Optimal'],
    ['Financial KPI', 'FIFO Valuation (LKR)', 'Local', 'LKR', `Rs. ${summary.kpis.fifoValuationLkr.toLocaleString()}`, '94% Optimal'],
    ...summary.exportByCountry.map((c) => [
      'Export by Country',
      c.country,
      'International Destination',
      'USD',
      `$${c.value.toLocaleString()}`,
      `${c.share}%`,
    ]),
    ...summary.products.map((p) => [
      'Inventory SKU',
      `${p.sku} ${p.name}`,
      p.category,
      'USD / LKR',
      `${p.stockQty} kg ($${p.unitPrice}/kg | Rs. ${p.unitPriceLkr}/kg)`,
      p.badge,
    ]),
  ];

  const csvContent = rows
    .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    'attachment; filename="ceylon-spices-bims-report.csv"'
  );
  res.send(csvContent);
}
