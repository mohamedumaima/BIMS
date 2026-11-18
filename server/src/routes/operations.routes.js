import { Router } from 'express';
import {
  addCustomer,
  addInventoryMovement,
  addProduct,
  addPurchaseOrder,
  addSalesInvoice,
  addShipment,
  addSupplier,
  addUserAccount,
  changePurchaseOrderStatus,
  chatWithAssistant,
  downloadTradeDocumentPdf,
  editCustomer,
  editDocument,
  editProduct,
  editPurchaseOrder,
  editSalesInvoice,
  editShipment,
  editSupplier,
  editUserAccount,
  exportReportCsv,
  exportReportPdf,
  getAssistantStatus,
  getCustomers,
  getDashboard,
  getDocuments,
  getInventory,
  getPublicCatalog,
  getShipments,
  getSuppliers,
  getUsersSettings,
  removeCustomer,
  removeDocument,
  removeProduct,
  removePurchaseOrder,
  removeSalesInvoice,
  removeShipment,
  removeSupplier,
  removeUserAccount,
  updateRolePermission,
  updateShipmentStatus,
  uploadDocument,
  viewDocumentAccess,
} from '../controllers/operations.controller.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { uploadMemory, uploadProductImage } from '../middleware/upload.js';

const router = Router();

// Public showcase endpoint for the Landing Homepage
router.get('/public/showcase', getPublicCatalog);

router.get('/dashboard', authenticate, getDashboard);

// Inventory CRUD (Create/Read/Update for all authenticated users; Delete for ADMIN/MANAGER)
router.get('/inventory', authenticate, getInventory);
router.post(
  '/inventory/products',
  authenticate,
  uploadProductImage.single('image'),
  addProduct
);
router.put(
  '/inventory/products/:productId',
  authenticate,
  uploadProductImage.single('image'),
  editProduct
);
router.delete(
  '/inventory/products/:productId',
  authenticate,
  authorize('ADMIN', 'MANAGER'),
  removeProduct
);
router.post('/inventory/movements', authenticate, addInventoryMovement);

// Shipments & Trade Declarations CRUD
router.get('/shipments', authenticate, getShipments);
router.post('/shipments', authenticate, addShipment);
router.put('/shipments/:txnId', authenticate, editShipment);
router.patch('/shipments/:txnId/status', authenticate, updateShipmentStatus);
router.delete(
  '/shipments/:txnId',
  authenticate,
  authorize('ADMIN', 'MANAGER'),
  removeShipment
);
router.get('/documents/pdf/:txnId/:docType', downloadTradeDocumentPdf);

// Secure Document & Media Vault (Cloudinary + RBAC)
router.get('/documents', authenticate, getDocuments);
router.post('/documents', authenticate, uploadMemory.single('file'), uploadDocument);
router.put(
  '/documents/:docId',
  authenticate,
  authorize('ADMIN', 'MANAGER'),
  uploadMemory.single('file'),
  editDocument
);
router.get('/documents/:docId/view', authenticate, viewDocumentAccess);
router.delete(
  '/documents/:docId',
  authenticate,
  authorize('ADMIN', 'MANAGER'),
  removeDocument
);

// Suppliers & Purchase Orders CRUD (LKR)
router.get('/suppliers', authenticate, getSuppliers);
router.post('/suppliers', authenticate, addSupplier);
router.put('/suppliers/:supplierId', authenticate, editSupplier);
router.delete(
  '/suppliers/:supplierId',
  authenticate,
  authorize('ADMIN', 'MANAGER'),
  removeSupplier
);
router.post('/purchase-orders', authenticate, addPurchaseOrder);
router.put('/purchase-orders/:poId', authenticate, editPurchaseOrder);
router.patch(
  '/purchase-orders/:poId/status',
  authenticate,
  authorize('ADMIN', 'MANAGER'),
  changePurchaseOrderStatus
);
router.delete(
  '/purchase-orders/:poId',
  authenticate,
  authorize('ADMIN', 'MANAGER'),
  removePurchaseOrder
);

// Customers (International USD & Local LKR) & Sales Orders CRUD
router.get('/customers', authenticate, getCustomers);
router.post('/customers', authenticate, addCustomer);
router.put('/customers/:customerId', authenticate, editCustomer);
router.delete(
  '/customers/:customerId',
  authenticate,
  authorize('ADMIN', 'MANAGER'),
  removeCustomer
);
router.post('/sales-orders', authenticate, addSalesInvoice);
router.put('/sales-orders/:soId', authenticate, editSalesInvoice);
router.delete(
  '/sales-orders/:soId',
  authenticate,
  authorize('ADMIN', 'MANAGER'),
  removeSalesInvoice
);

// System Users & RBAC Permissions CRUD
router.get('/users', authenticate, getUsersSettings);
router.post('/users', authenticate, authorize('ADMIN'), addUserAccount);
router.put('/users/:userId', authenticate, authorize('ADMIN'), editUserAccount);
router.delete('/users/:userId', authenticate, authorize('ADMIN'), removeUserAccount);
router.patch('/users/permissions', authenticate, authorize('ADMIN', 'MANAGER'), updateRolePermission);

// RBAC-aware Gemini AI Assistant
router.get('/assistant/status', authenticate, getAssistantStatus);
router.post('/assistant/chat', authenticate, chatWithAssistant);

// Reports Export
router.get('/reports/export/pdf', exportReportPdf);
router.get('/reports/export/csv', exportReportCsv);

export default router;
