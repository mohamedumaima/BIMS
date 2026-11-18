import { createInitialSeedData } from '../config/defaultSeedData.js';

/**
 * Seeds all Ceylon Spices BIMS tables idempotently into PostgreSQL (local or Supabase).
 */
export async function seedPrismaDatabase(prisma) {
  const seed = createInitialSeedData();

  const userIdMap = new Map();
  for (const u of seed.users) {
    const record = await prisma.user.upsert({
      where: { email: u.email.toLowerCase() },
      update: {},
      create: {
        name: u.name,
        email: u.email.toLowerCase(),
        role: u.role,
        passwordHash: u.passwordHash,
        isActive: u.isActive,
        sessions: u.sessions ?? 1,
        authorityLevel: u.authorityLevel ?? 2,
      },
    });
    userIdMap.set(u.userId, record.userId);
  }
  const adminUserId = userIdMap.get(1) || null;

  for (const perm of seed.permissions) {
    await prisma.rolePermission.upsert({
      where: { role: perm.role },
      update: {},
      create: {
        role: perm.role,
        label: perm.label,
        inventory: perm.inventory,
        tradeDocs: perm.tradeDocs,
        finance: perm.finance,
        inventoryEnabled: perm.inventoryEnabled,
        tradeDocsEnabled: perm.tradeDocsEnabled,
        financeEnabled: perm.financeEnabled,
      },
    });
  }

  if ((await prisma.securityLog.count()) === 0) {
    await prisma.securityLog.createMany({
      data: seed.securityLogs.map((l) => ({
        text: l.text,
        timeLabel: l.time,
        active: Boolean(l.active),
      })),
    });
  }

  const supplierIdMap = new Map();
  for (const s of seed.suppliers) {
    let record = await prisma.supplier.findFirst({ where: { name: s.name } });
    if (!record) {
      record = await prisma.supplier.create({
        data: {
          name: s.name,
          country: s.country,
          currency: s.currency || 'LKR',
          contactEmail: s.contactEmail,
          phone: s.phone || null,
          paymentTerms: s.paymentTerms,
          balance: s.balance,
          onTimeRate: s.onTimeRate,
          accuracyRate: s.accuracyRate,
          reliabilityDots: s.reliabilityDots ?? 4,
          featured: Boolean(s.featured),
        },
      });
    }
    supplierIdMap.set(s.supplierId, record.supplierId);
  }

  const customerIdMap = new Map();
  for (const c of seed.customers) {
    let record = await prisma.customer.findFirst({ where: { name: c.name } });
    if (!record) {
      record = await prisma.customer.create({
        data: {
          name: c.name,
          country: c.country,
          marketType: c.marketType,
          currency: c.currency,
          contactEmail: c.contactEmail,
          phone: c.phone || null,
          creditLimit: c.creditLimit,
          balance: c.balance,
          tier: c.tier || 'Enterprise',
          featured: Boolean(c.featured),
        },
      });
    }
    customerIdMap.set(c.customerId, record.customerId);
  }

  const productIdMap = new Map();
  for (const p of seed.products) {
    const record = await prisma.product.upsert({
      where: { sku: p.sku },
      update: {},
      create: {
        sku: p.sku,
        name: p.name,
        category: p.category,
        hsCode: p.hsCode || null,
        originRegion: p.originRegion || null,
        description: p.description || null,
        imageUrl: p.imageUrl || null,
        unitPrice: p.unitPrice,
        unitPriceLkr: p.unitPriceLkr,
        costPrice: p.costPrice,
        costPriceLkr: p.costPriceLkr,
        stockQty: p.stockQty,
        reorderLevel: p.reorderLevel,
        dots: p.dots ?? 2,
        valuationMethod: p.valuationMethod || 'FIFO',
      },
    });
    productIdMap.set(p.productId, record.productId);
  }

  if ((await prisma.inventoryLog.count()) === 0) {
    for (const log of seed.inventoryLogs) {
      const productId = productIdMap.get(log.productId);
      if (!productId) continue;
      await prisma.inventoryLog.create({
        data: {
          productId,
          movementType: log.movementType,
          quantity: log.quantity,
          unitCost: log.unitCost,
          unitCostLkr: log.unitCostLkr,
          referenceNote: log.referenceNote,
          userId: adminUserId,
        },
      });
    }
  }

  for (const po of seed.purchaseOrders) {
    const supplierId = supplierIdMap.get(po.supplierId);
    if (!supplierId) continue;
    await prisma.purchaseOrder.upsert({
      where: { poNumber: po.poNumber },
      update: {},
      create: {
        poNumber: po.poNumber,
        supplierId,
        createdById: adminUserId,
        productName: po.productName,
        orderedQty: po.orderedQty,
        currency: po.currency || 'LKR',
        status: po.status,
        totalAmount: po.totalAmount,
        expectedDate: po.expectedDate ? new Date(po.expectedDate) : null,
      },
    });
  }

  for (const so of seed.salesOrders) {
    const customerId = customerIdMap.get(so.customerId);
    if (!customerId) continue;
    await prisma.salesOrder.upsert({
      where: { soNumber: so.soNumber },
      update: {},
      create: {
        soNumber: so.soNumber,
        invoiceCode: so.invoiceCode,
        customerId,
        createdById: adminUserId,
        marketType: so.marketType,
        currency: so.currency,
        productName: so.productName,
        quantity: so.quantity,
        status: so.status,
        totalAmount: so.totalAmount,
        paymentStatus: so.paymentStatus,
      },
    });
  }

  if ((await prisma.communicationLog.count()) === 0) {
    for (const comm of seed.communications) {
      const customerId = customerIdMap.get(comm.customerId);
      if (!customerId) continue;
      await prisma.communicationLog.create({
        data: {
          customerId,
          userId: adminUserId,
          senderLabel: comm.sender,
          channel: 'EMAIL',
          subject: comm.prompt,
          notes: comm.reply,
          attachments: comm.attachments || [],
        },
      });
    }
  }

  for (const txn of seed.transactions) {
    await prisma.transaction.upsert({
      where: { txnNumber: txn.txnNumber },
      update: {},
      create: {
        txnNumber: txn.txnNumber,
        title: txn.title,
        type: txn.type,
        status: txn.status,
        badge: txn.badge,
        currency: txn.currency,
        txnDate: txn.txnDate ? new Date(txn.txnDate) : new Date(),
        totalValue: txn.totalValue,
        hsCode: txn.hsCode,
        originCountry: txn.originCountry,
        destinationCountry: txn.destinationCountry,
        dutyRate: txn.dutyRate,
        dutyAmount: txn.dutyAmount,
        incoterms: txn.incoterms,
        carrier: txn.carrier,
        trackingNumber: txn.trackingNumber,
        partnerName: txn.partnerName,
        userId: adminUserId,
      },
    });
  }
}
