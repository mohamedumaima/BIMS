import request from 'supertest';
import { createApp } from '../src/app.js';

describe('Ceylon Spices BIMS API — Full CRUD, Dual Currency & RBAC AI Assistant', () => {
  const app = createApp();
  let adminToken = '';
  let staffToken = '';

  test('GET / returns service status', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('running');
  });

  test('GET /api/public/showcase returns Sri Lankan spices with images and dual currencies', async () => {
    const res = await request(app).get('/api/public/showcase');
    expect(res.statusCode).toBe(200);
    expect(res.body.spices.length).toBeGreaterThanOrEqual(7);
    expect(res.body.spices[0].imageUrl).toMatch(/^data:image\/svg\+xml/);
    expect(res.body.spices[0].unitPrice).toBeGreaterThan(0);
    expect(res.body.spices[0].unitPriceLkr).toBeGreaterThan(0);
  });

  test('POST /api/auth/login authenticates ADMIN and STAFF accounts', async () => {
    const adminRes = await request(app).post('/api/auth/login').send({
      email: 'admin@ceylonspices.com',
      password: 'Password@123',
    });
    expect(adminRes.statusCode).toBe(200);
    adminToken = adminRes.body.token;

    const staffRes = await request(app).post('/api/auth/login').send({
      email: 'staff@ceylonspices.com',
      password: 'Password@123',
    });
    expect(staffRes.statusCode).toBe(200);
    staffToken = staffRes.body.token;
  });

  test('Inventory CRUD (Create, Read, Update, Delete) with RBAC delete protection', async () => {
    const createRes = await request(app)
      .post('/api/inventory/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        sku: 'SKU-TEST-99',
        name: 'Ceylon Mace Blades',
        category: 'Mace',
        unitPrice: 75,
        unitPriceLkr: 22500,
        stockQty: 150,
        reorderLevel: 50,
      });
    expect(createRes.statusCode).toBe(201);
    const created = createRes.body.products.find((p) => p.sku === 'SKU-TEST-99');
    expect(created).toBeTruthy();

    const updateRes = await request(app)
      .put(`/api/inventory/products/${created.productId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Ceylon Ruby Mace Blades', stockQty: 190 });
    expect(updateRes.statusCode).toBe(200);
    const updated = updateRes.body.products.find((p) => p.productId === created.productId);
    expect(updated.name).toBe('Ceylon Ruby Mace Blades');

    // STAFF cannot delete products
    const staffDel = await request(app)
      .delete(`/api/inventory/products/${created.productId}`)
      .set('Authorization', `Bearer ${staffToken}`);
    expect(staffDel.statusCode).toBe(403);

    // ADMIN can delete products
    const adminDel = await request(app)
      .delete(`/api/inventory/products/${created.productId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminDel.statusCode).toBe(200);
  });

  test('Inventory product creation and update accept multipart device image uploads', async () => {
    const pngBytes = Buffer.from(
      '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082',
      'hex'
    );

    const createMultipart = await request(app)
      .post('/api/inventory/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('sku', 'SKU-IMG-01')
      .field('name', 'Uploaded Ceylon Ginger')
      .field('category', 'Ginger')
      .field('unitPrice', '26')
      .field('unitPriceLkr', '7800')
      .field('stockQty', '210')
      .field('reorderLevel', '90')
      .attach('image', pngBytes, { filename: 'ginger.png', contentType: 'image/png' });

    expect(createMultipart.statusCode).toBe(201);
    const created = createMultipart.body.products.find((p) => p.sku === 'SKU-IMG-01');
    expect(created).toBeTruthy();
    expect(created.imageUrl).toMatch(/^data:image\/png;base64,/);

    // Non-image files are rejected cleanly
    const badUpload = await request(app)
      .put(`/api/inventory/products/${created.productId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .field('name', 'Bad Upload Test')
      .attach('image', Buffer.from('not-an-image'), {
        filename: 'notes.txt',
        contentType: 'text/plain',
      });
    expect(badUpload.statusCode).toBe(400);

    // Clean up test SKU
    await request(app)
      .delete(`/api/inventory/products/${created.productId}`)
      .set('Authorization', `Bearer ${adminToken}`);
  });

  test('Customers separates International Buyers (USD) and Local Buyers (LKR) with full CRUD', async () => {
    const res = await request(app)
      .get('/api/customers')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.internationalBuyers.every((c) => c.currency === 'USD')).toBe(true);
    expect(res.body.localBuyers.every((c) => c.currency === 'LKR')).toBe(true);

    const addLocal = await request(app)
      .post('/api/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Jaffna Spice Traders',
        country: 'Sri Lanka (Jaffna)',
        marketType: 'LOCAL',
        creditLimit: 3500000,
        balance: 500000,
      });
    expect(addLocal.statusCode).toBe(201);
    const added = addLocal.body.localBuyers.find((c) => c.name === 'Jaffna Spice Traders');
    expect(added.currency).toBe('LKR');
  });

  test('RBAC-aware AI Assistant answers ADMIN finance queries and restricts STAFF finance queries', async () => {
    const adminChat = await request(app)
      .post('/api/assistant/chat')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ message: 'Show executive revenue and margin KPIs' });
    expect(adminChat.statusCode).toBe(200);
    expect(adminChat.body.reply).toMatch(/\$485,000 USD/);

    const staffChat = await request(app)
      .post('/api/assistant/chat')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ message: 'What is our total revenue and net profit margin?' });
    expect(staffChat.statusCode).toBe(200);
    expect(staffChat.body.reply).toMatch(/restricted for Staff accounts/i);
  });

  test('PDFKit and CSV export endpoints enforce auth and stream documents', async () => {
    const unauthPdf = await request(app).get('/api/documents/pdf/1/COMMERCIAL_INVOICE');
    expect(unauthPdf.statusCode).toBe(401);

    const pdfRes = await request(app)
      .get('/api/documents/pdf/1/COMMERCIAL_INVOICE')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(pdfRes.statusCode).toBe(200);
    expect(pdfRes.headers['content-type']).toMatch(/application\/pdf/);

    const csvRes = await request(app)
      .get('/api/reports/export/csv')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(csvRes.statusCode).toBe(200);
    expect(csvRes.headers['content-type']).toMatch(/text\/csv/);
    expect(csvRes.text).toMatch(/\$485,000/);

    const staffCsvRes = await request(app)
      .get('/api/reports/export/csv')
      .set('Authorization', `Bearer ${staffToken}`);
    expect(staffCsvRes.statusCode).toBe(200);
    expect(staffCsvRes.text).not.toMatch(/\$485,000/);
    expect(staffCsvRes.text).toMatch(/Restricted \(Manager\/Admin Only\)/);
  });

  test('Live metrics recalculate dynamically across Inventory, Shipments, Suppliers, and Customers', async () => {
    // 1. Inventory movements update fifoValuation, optimalScore, and stockAlerts
    const invBefore = await request(app)
      .get('/api/inventory')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(invBefore.statusCode).toBe(200);
    const pepperBefore = invBefore.body.stockAlerts.find((a) => a.productId === 2);
    expect(pepperBefore).toBeTruthy();

    const stockInRes = await request(app)
      .post('/api/inventory/movements')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        productId: 2,
        movementType: 'STOCK_IN',
        quantity: 300,
        unitCost: 18,
        referenceNote: 'Replenishment batch PEP-LIVE-TEST',
      });
    expect(stockInRes.statusCode).toBe(201);
    expect(stockInRes.body.fifoValuation).toBeGreaterThan(invBefore.body.fifoValuation);
    expect(stockInRes.body.optimalScore).toBeGreaterThan(invBefore.body.optimalScore);
    expect(stockInRes.body.lowStockCount).toBeLessThan(invBefore.body.lowStockCount);

    const stockOutRes = await request(app)
      .post('/api/inventory/movements')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        productId: 2,
        movementType: 'STOCK_OUT',
        quantity: 300,
        unitCost: 18,
        referenceNote: 'Revert PEP-LIVE-TEST',
      });
    expect(stockOutRes.statusCode).toBe(201);
    expect(stockOutRes.body.fifoValuation).toBe(invBefore.body.fifoValuation);
    expect(stockOutRes.body.optimalScore).toBe(invBefore.body.optimalScore);

    // 2. Shipment status update recalculates statusBreakdown and fulfillmentScore
    const shipBefore = await request(app)
      .get('/api/shipments')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(shipBefore.statusCode).toBe(200);
    const deliveredBefore = shipBefore.body.statusBreakdown.find((s) => s.status === 'DELIVERED');
    expect(deliveredBefore.percent).toBe(0);

    const shipAfter = await request(app)
      .patch('/api/shipments/3/status')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'DELIVERED' });
    expect(shipAfter.statusCode).toBe(200);
    const deliveredAfter = shipAfter.body.statusBreakdown.find((s) => s.status === 'DELIVERED');
    expect(deliveredAfter.percent).toBeGreaterThan(deliveredBefore.percent);
    expect(shipAfter.body.fulfillmentScore).toBeGreaterThan(shipBefore.body.fulfillmentScore);

    // 3. Purchase Order approval recalculates workflowStages (Manager Approval)
    const supBefore = await request(app)
      .get('/api/suppliers')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(supBefore.statusCode).toBe(200);
    const approvalBefore = supBefore.body.workflowStages.find(
      (stage) => stage.label === 'Manager Approval'
    );
    expect(approvalBefore).toBeTruthy();

    const poApproveRes = await request(app)
      .patch('/api/purchase-orders/1/status')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'APPROVED' });
    expect(poApproveRes.statusCode).toBe(200);
    const approvalAfter = poApproveRes.body.workflowStages.find(
      (stage) => stage.label === 'Manager Approval'
    );
    expect(approvalAfter.percent).toBeGreaterThan(approvalBefore.percent);

    // 4. Sales Order advancement & invoice creation update byMarket pipeline & creditUtilization
    const custBefore = await request(app)
      .get('/api/customers')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(custBefore.statusCode).toBe(200);
    const intlBefore = custBefore.body.byMarket.INTERNATIONAL;
    const localBefore = custBefore.body.byMarket.LOCAL;

    const advanceSoRes = await request(app)
      .put('/api/sales-orders/4')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'FULFILLED' });
    expect(advanceSoRes.statusCode).toBe(200);
    expect(advanceSoRes.body.byMarket.LOCAL.pipelineStages).not.toEqual(localBefore.pipelineStages);
    expect(advanceSoRes.body.byMarket.INTERNATIONAL.pipelineStages).toEqual(
      intlBefore.pipelineStages
    );

    const createInvRes = await request(app)
      .post('/api/sales-orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerId: 2,
        productName: 'Organic Black Pepper',
        quantity: 200,
        totalAmount: 25000,
        status: 'INVOICED',
        paymentStatus: 'UNPAID',
      });
    expect(createInvRes.statusCode).toBe(201);
    expect(createInvRes.body.byMarket.INTERNATIONAL.creditUtilization).toBeGreaterThan(
      intlBefore.creditUtilization
    );
    expect(createInvRes.body.byMarket.LOCAL.creditUtilization).toBe(localBefore.creditUtilization);
  });

  test('Health check reports cloud DB/media status and RBAC-protected document vault accepts images & PDFs', async () => {
    const healthRes = await request(app).get('/api/health');
    expect(healthRes.statusCode).toBe(200);
    expect(healthRes.body).toHaveProperty('databaseProvider');
    expect(healthRes.body).toHaveProperty('cloudinaryConfigured');
    expect(healthRes.body).toHaveProperty('mediaStorageProvider');

    // STAFF is blocked from uploading restricted FINANCIAL records
    const staffUpload = await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${staffToken}`)
      .field('title', 'Unauthorized Cheque')
      .field('docType', 'CHEQUE')
      .field('category', 'FINANCIAL')
      .field('accessLevel', 'MANAGER_ADMIN')
      .attach('file', Buffer.from('fake-png-bytes'), {
        filename: 'cheque.png',
        contentType: 'image/png',
      });
    expect(staffUpload.statusCode).toBe(403);

    // ADMIN uploads a cheque scan (PNG) + supplier receipt (PDF)
    const adminCheque = await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('title', 'BOC Cheque #884120')
      .field('docType', 'CHEQUE')
      .field('category', 'FINANCIAL')
      .field('accessLevel', 'MANAGER_ADMIN')
      .field('referenceNo', 'CHQ-884120')
      .field('amount', '3840000')
      .field('currency', 'LKR')
      .attach('file', Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), {
        filename: 'boc-cheque.png',
        contentType: 'image/png',
      });
    expect(adminCheque.statusCode).toBe(201);
    const uploadedDoc = adminCheque.body.documents.find((d) => d.referenceNo === 'CHQ-884120');
    expect(uploadedDoc).toBeTruthy();
    expect(uploadedDoc.filePath).toBeUndefined();
    expect(uploadedDoc.storageKey).toBeUndefined();

    // STAFF cannot list or view the MANAGER_ADMIN financial cheque
    const staffList = await request(app)
      .get('/api/documents')
      .set('Authorization', `Bearer ${staffToken}`);
    expect(staffList.statusCode).toBe(200);
    expect(staffList.body.documents.some((d) => d.docId === uploadedDoc.docId)).toBe(false);

    const staffView = await request(app)
      .get(`/api/documents/${uploadedDoc.docId}/view`)
      .set('Authorization', `Bearer ${staffToken}`);
    expect(staffView.statusCode).toBe(403);

    // ADMIN can retrieve signed/access URL and upload PDF receipt too
    const adminView = await request(app)
      .get(`/api/documents/${uploadedDoc.docId}/view`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminView.statusCode).toBe(200);
    expect(adminView.body.accessUrl).toBeTruthy();

    const pdfDocRes = await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('title', 'Packing Slip Receipt')
      .field('docType', 'RECEIPT')
      .field('category', 'TRADE')
      .field('accessLevel', 'ALL_STAFF')
      .attach('file', Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF'), {
        filename: 'receipt.pdf',
        contentType: 'application/pdf',
      });
    expect(pdfDocRes.statusCode).toBe(201);
    expect(pdfDocRes.body.summary.totalAuthorized).toBeGreaterThanOrEqual(2);

    // Update metadata (PUT CRUD) succeeds for ADMIN and fails with 403 for STAFF
    const staffEdit = await request(app)
      .put(`/api/documents/${uploadedDoc.docId}`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ title: 'Blocked Edit' });
    expect(staffEdit.statusCode).toBe(403);

    const adminEdit = await request(app)
      .put(`/api/documents/${uploadedDoc.docId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'BOC Cheque #884120 Approved', notes: 'Verified by Admin' });
    expect(adminEdit.statusCode).toBe(200);
    expect(
      adminEdit.body.documents.find((d) => d.docId === uploadedDoc.docId).title
    ).toBe('BOC Cheque #884120 Approved');

    // Cleanup test documents
    const delRes = await request(app)
      .delete(`/api/documents/${uploadedDoc.docId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(delRes.statusCode).toBe(200);
  });
});
