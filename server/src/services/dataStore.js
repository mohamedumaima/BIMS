import bcrypt from 'bcryptjs';
import { isCloudinaryConfigured } from '../config/cloudinary.js';
import { getPrisma } from '../config/db.js';
import {
  USD_TO_LKR_RATE,
  createInitialSeedData,
  makeSpiceSvg,
} from '../config/defaultSeedData.js';
import { env, isPlaceholderDatabaseUrl } from '../config/env.js';
import { getSupabaseAdmin } from '../config/supabase.js';
import {
  deleteStoredDocumentAsset,
  resolveDocumentAccessUrl,
} from '../utils/fileStorage.js';
import {
  computeCustomersMetrics,
  computeExportByCountry,
  computeFifoValuationLkr,
  computeFifoValuationUsd,
  computeInventoryMetrics,
  computeShipmentsMetrics,
  computeSuppliersMetrics,
} from './metrics.js';
import {
  canUserAccessDocument,
  mapCommunication,
  mapCustomer,
  mapDocument,
  mapInventoryLog,
  mapProduct,
  mapPublicUser,
  mapPurchaseOrder,
  mapSalesOrder,
  mapSupplier,
  mapTransaction,
  mapUser,
  sanitizeDocumentSummary,
} from './prismaMappers.js';
import { seedPrismaDatabase } from './seedService.js';

export const memoryStore = createInitialSeedData();

let seededUrlSignature = '';
let seedInFlight = null;

function buildError(message, statusCode = 400) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function requireNonEmptyString(value, fieldLabel) {
  if (typeof value !== 'string' || !value.trim()) {
    throw buildError(`${fieldLabel} is required`, 400);
  }
  return value.trim();
}

function parseNonNegativeNumber(value, fallback, fieldLabel = 'Numeric value') {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) {
    throw buildError(`${fieldLabel} must be a non-negative number`, 400);
  }
  return num;
}

async function ensurePostgresSeeded(prisma) {
  if (seededUrlSignature === env.databaseUrl) return;
  if (!seedInFlight) {
    seedInFlight = (async () => {
      const userCount = await prisma.user.count();
      if (userCount === 0) {
        await seedPrismaDatabase(prisma);
      }
      seededUrlSignature = env.databaseUrl;
    })().finally(() => {
      seedInFlight = null;
    });
  }
  await seedInFlight;
}

export async function getDatabaseStatus() {
  if (
    (env.nodeEnv === 'test' && process.env.RUN_LIVE_CLOUD_TESTS !== 'true') ||
    isPlaceholderDatabaseUrl(env.databaseUrl)
  ) {
    return {
      connected: false,
      schemaReady: false,
      provider: 'in-memory-fallback',
    };
  }

  try {
    const prisma = getPrisma();
    const rows = await prisma.$queryRaw`SELECT to_regclass('public.users')::text AS users_table`;
    const schemaReady = Boolean(rows?.[0]?.users_table);
    if (schemaReady) {
      await ensurePostgresSeeded(prisma);
    }
    return {
      connected: true,
      schemaReady,
      provider: schemaReady ? 'Supabase PostgreSQL' : 'PostgreSQL (schema pending push)',
    };
  } catch {
    return {
      connected: false,
      schemaReady: false,
      provider: 'in-memory-fallback',
    };
  }
}

export async function isPostgresConnected() {
  const state = await getDatabaseStatus();
  return state.connected && state.schemaReady;
}

async function loadPermissionsList() {
  if (await isPostgresConnected()) {
    const rows = await getPrisma().rolePermission.findMany();
    return rows.map((r) => ({
      role: r.role,
      label: r.label,
      inventory: r.inventory,
      tradeDocs: r.tradeDocs,
      finance: r.finance,
      inventoryEnabled: r.inventoryEnabled,
      tradeDocsEnabled: r.tradeDocsEnabled,
      financeEnabled: r.financeEnabled,
    }));
  }
  return memoryStore.permissions;
}

export async function getLiveRbacSnapshot() {
  if (await isPostgresConnected()) {
    const prisma = getPrisma();
    const [users, permissions, products, transactions, suppliers, purchaseOrders, customers, salesOrders, documents] =
      await Promise.all([
        prisma.user.findMany({ orderBy: { userId: 'asc' } }),
        loadPermissionsList(),
        prisma.product.findMany({ orderBy: { productId: 'asc' } }),
        prisma.transaction.findMany({
          include: { customer: true, supplier: true },
          orderBy: { txnId: 'desc' },
        }),
        prisma.supplier.findMany({ orderBy: { supplierId: 'asc' } }),
        prisma.purchaseOrder.findMany({
          include: { supplier: true },
          orderBy: { poId: 'desc' },
        }),
        prisma.customer.findMany({ orderBy: { customerId: 'asc' } }),
        prisma.salesOrder.findMany({
          include: { customer: true },
          orderBy: { soId: 'desc' },
        }),
        prisma.document.findMany({
          include: { uploadedBy: true },
          orderBy: { docId: 'desc' },
        }),
      ]);

    return {
      users: users.map(mapPublicUser),
      permissions,
      products: products.map(mapProduct),
      transactions: transactions.map(mapTransaction),
      suppliers: suppliers.map(mapSupplier),
      purchaseOrders: purchaseOrders.map(mapPurchaseOrder),
      customers: customers.map(mapCustomer),
      salesOrders: salesOrders.map(mapSalesOrder),
      documents: documents.map(mapDocument),
    };
  }

  return {
    users: memoryStore.users.map(({ passwordHash: _pw, ...u }) => u),
    permissions: memoryStore.permissions,
    products: memoryStore.products,
    transactions: memoryStore.transactions,
    suppliers: memoryStore.suppliers,
    purchaseOrders: memoryStore.purchaseOrders,
    customers: memoryStore.customers,
    salesOrders: memoryStore.salesOrders,
    documents: memoryStore.documents,
  };
}

export async function findUserByEmail(email) {
  const normalized = email.trim().toLowerCase();
  if (await isPostgresConnected()) {
    const row = await getPrisma().user.findUnique({ where: { email: normalized } });
    return mapUser(row);
  }
  return memoryStore.users.find((u) => u.email.toLowerCase() === normalized) || null;
}

export async function findUserById(userId) {
  const id = Number(userId);
  if (await isPostgresConnected()) {
    const row = await getPrisma().user.findUnique({ where: { userId: id } });
    return mapUser(row);
  }
  return memoryStore.users.find((u) => u.userId === id) || null;
}

export async function listUsersAndSecurity() {
  const dbState = await getDatabaseStatus();
  const cloudinaryReady = isCloudinaryConfigured();
  const supabaseStorageReady = Boolean(getSupabaseAdmin());

  let users;
  let permissions;
  let securityLogs;
  let transactions;
  let suppliers;
  let purchaseOrders;
  let customers;
  let salesOrders;

  if (dbState.connected && dbState.schemaReady) {
    const prisma = getPrisma();
    const [dbUsers, dbPerms, dbLogs, dbTxns, dbSups, dbPos, dbCusts, dbSos] =
      await Promise.all([
        prisma.user.findMany({ orderBy: { userId: 'asc' } }),
        loadPermissionsList(),
        prisma.securityLog.findMany({ orderBy: { id: 'desc' }, take: 12 }),
        prisma.transaction.findMany({ include: { customer: true, supplier: true } }),
        prisma.supplier.findMany({ orderBy: { supplierId: 'asc' } }),
        prisma.purchaseOrder.findMany({ include: { supplier: true } }),
        prisma.customer.findMany({ orderBy: { customerId: 'asc' } }),
        prisma.salesOrder.findMany({ include: { customer: true } }),
      ]);

    users = dbUsers.map(mapPublicUser);
    permissions = dbPerms;
    securityLogs = dbLogs.map((l) => ({
      id: l.id,
      text: l.text,
      time: l.timeLabel,
      active: l.active,
    }));
    transactions = dbTxns.map(mapTransaction);
    suppliers = dbSups.map(mapSupplier);
    purchaseOrders = dbPos.map(mapPurchaseOrder);
    customers = dbCusts.map(mapCustomer);
    salesOrders = dbSos.map(mapSalesOrder);
  } else {
    users = memoryStore.users.map(({ passwordHash: _pw, ...u }) => u);
    permissions = memoryStore.permissions;
    securityLogs = memoryStore.securityLogs;
    transactions = memoryStore.transactions;
    suppliers = memoryStore.suppliers;
    purchaseOrders = memoryStore.purchaseOrders;
    customers = memoryStore.customers;
    salesOrders = memoryStore.salesOrders;
  }

  const ships = computeShipmentsMetrics(transactions);
  const sups = computeSuppliersMetrics(suppliers, purchaseOrders);
  const custs = computeCustomersMetrics(customers, salesOrders);

  return {
    users,
    permissions,
    securityLogs,
    securityScore: 94,
    tokenLifeHours: 8,
    infrastructure: {
      databaseConnected: dbState.connected && dbState.schemaReady,
      databaseProvider: dbState.provider,
      cloudinaryConfigured: cloudinaryReady,
      supabaseStorageConfigured: supabaseStorageReady,
      mediaProvider: cloudinaryReady
        ? 'Cloudinary'
        : supabaseStorageReady
        ? 'Supabase Storage'
        : 'Local Data-URI Fallback',
    },
    overallProgress: [
      {
        label: 'Procurement',
        percent: sups.workflowStages[1]?.percent ?? 0,
        tone: sups.workflowStages[1]?.percent >= 80 ? 'emerald' : 'amber-striped',
      },
      {
        label: 'Sales Processing',
        percent: custs.pipelineStages[1]?.percent ?? 0,
        tone: 'amber-striped',
      },
      {
        label: 'Customs Clear',
        percent: ships.statusBreakdown[2]?.percent ?? 0,
        tone: 'amber',
      },
      {
        label: 'Delivered',
        percent: ships.statusBreakdown[3]?.percent ?? 0,
        tone: ships.statusBreakdown[3]?.percent > 0 ? 'emerald' : 'muted',
      },
    ],
  };
}

async function appendSecurityLog(text, active = true) {
  const timeLabel = new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  if (await isPostgresConnected()) {
    await getPrisma().securityLog.create({
      data: { text, timeLabel, active },
    });
    return;
  }
  memoryStore.securityLogs.unshift({
    id: Date.now(),
    text,
    time: timeLabel,
    active,
  });
}

export async function createSystemUser(payload = {}) {
  const { name, email, password, role } = payload;
  const cleanName = requireNonEmptyString(name, 'User name');
  const cleanEmail = requireNonEmptyString(email, 'Email address').toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    throw buildError('Invalid email address format', 400);
  }
  if (password !== undefined && password !== '' && String(password).length < 6) {
    throw buildError('Password must be at least 6 characters', 400);
  }

  const normalizedEmail = cleanEmail;
  const existing = await findUserByEmail(normalizedEmail);
  if (existing) {
    throw buildError('A user with this email already exists', 409);
  }

  const passwordHash = await bcrypt.hash(password || 'Password@123', 10);
  const assignedRole = ['ADMIN', 'MANAGER', 'STAFF'].includes(role) ? role : 'STAFF';

  if (await isPostgresConnected()) {
    const created = await getPrisma().user.create({
      data: {
        name: cleanName,
        email: normalizedEmail,
        role: assignedRole,
        passwordHash,
        isActive: true,
        sessions: 1,
        authorityLevel: assignedRole === 'STAFF' ? 2 : 3,
      },
    });
    await appendSecurityLog(`New ${created.role} member ${created.name} added`);
    return mapPublicUser(created);
  }

  const nextId =
    memoryStore.users.reduce((max, u) => Math.max(max, u.userId), 0) + 1;

  const newUser = {
    userId: nextId,
    name: cleanName,
    email: normalizedEmail,
    role: assignedRole,
    passwordHash,
    isActive: true,
    sessions: 1,
    authorityLevel: assignedRole === 'STAFF' ? 2 : 3,
    createdAt: new Date().toISOString(),
  };
  memoryStore.users.push(newUser);
  await appendSecurityLog(`New ${newUser.role} member ${newUser.name} added`);

  const { passwordHash: _pw, ...publicUser } = newUser;
  return publicUser;
}

export async function updateSystemUser(userId, payload) {
  const id = Number(userId);
  if (await isPostgresConnected()) {
    const prisma = getPrisma();
    const target = await prisma.user.findUnique({ where: { userId: id } });
    if (!target) throw buildError('User not found', 404);

    const data = {};
    if (payload.name) data.name = payload.name.trim();
    if (payload.email) data.email = payload.email.trim().toLowerCase();
    if (payload.role) {
      data.role = payload.role;
      data.authorityLevel = payload.role === 'STAFF' ? 2 : 3;
    }
    if (typeof payload.isActive === 'boolean') data.isActive = payload.isActive;
    if (payload.password && payload.password.trim().length >= 6) {
      data.passwordHash = await bcrypt.hash(payload.password.trim(), 10);
    }

    const updated = await prisma.user.update({ where: { userId: id }, data });
    await appendSecurityLog(`Updated user profile ${updated.name} (${updated.role})`);
    return listUsersAndSecurity();
  }

  const target = memoryStore.users.find((u) => u.userId === id);
  if (!target) throw buildError('User not found', 404);

  if (payload.name) target.name = payload.name.trim();
  if (payload.email) target.email = payload.email.trim().toLowerCase();
  if (payload.role) target.role = payload.role;
  if (typeof payload.isActive === 'boolean') target.isActive = payload.isActive;
  if (payload.password && payload.password.trim().length >= 6) {
    target.passwordHash = await bcrypt.hash(payload.password.trim(), 10);
  }

  await appendSecurityLog(`Updated user profile ${target.name} (${target.role})`);
  return listUsersAndSecurity();
}

export async function deleteSystemUser(userId, requestingUserId) {
  const id = Number(userId);
  if (id === Number(requestingUserId)) {
    throw buildError('You cannot delete your own active administrator account', 400);
  }

  if (await isPostgresConnected()) {
    const prisma = getPrisma();
    const target = await prisma.user.findUnique({ where: { userId: id } });
    if (!target) throw buildError('User not found', 404);
    await prisma.user.delete({ where: { userId: id } });
    await appendSecurityLog(`Removed user ${target.name}`);
    return listUsersAndSecurity();
  }

  const idx = memoryStore.users.findIndex((u) => u.userId === id);
  if (idx === -1) throw buildError('User not found', 404);

  const [removed] = memoryStore.users.splice(idx, 1);
  await appendSecurityLog(`Removed user ${removed.name}`);
  return listUsersAndSecurity();
}

function buildPermissionLabelUpdate(role, field, nextVal) {
  if (field === 'inventoryEnabled') {
    return { inventory: nextVal ? 'Full Access' : 'Restricted' };
  }
  if (field === 'tradeDocsEnabled') {
    return {
      tradeDocs: nextVal ? (role === 'STAFF' ? 'Read Only' : 'Edit & View') : 'Restricted',
    };
  }
  if (field === 'financeEnabled') {
    return {
      finance: nextVal ? (role === 'ADMIN' ? 'Full Access' : 'Read Only') : 'Restricted',
    };
  }
  return {};
}

export async function toggleRolePermission({ role, field, actorName }) {
  const allowedFields = new Set([
    'inventoryEnabled',
    'tradeDocsEnabled',
    'financeEnabled',
  ]);

  if (await isPostgresConnected()) {
    const prisma = getPrisma();
    const target = await prisma.rolePermission.findUnique({ where: { role } });
    if (target && allowedFields.has(field)) {
      const nextVal = !target[field];
      await prisma.rolePermission.update({
        where: { role },
        data: {
          [field]: nextVal,
          ...buildPermissionLabelUpdate(role, field, nextVal),
        },
      });
      await appendSecurityLog(`${actorName || 'M. L. Umaima'} updated ${role} permissions`);
    }
    const [permissions, dbLogs] = await Promise.all([
      loadPermissionsList(),
      prisma.securityLog.findMany({ orderBy: { id: 'desc' }, take: 6 }),
    ]);
    return {
      permissions,
      securityLogs: dbLogs.map((l) => ({
        id: l.id,
        text: l.text,
        time: l.timeLabel,
        active: l.active,
      })),
    };
  }

  const target = memoryStore.permissions.find((p) => p.role === role);
  if (target && allowedFields.has(field)) {
    const nextVal = !target[field];
    target[field] = nextVal;
    Object.assign(target, buildPermissionLabelUpdate(role, field, nextVal));
    await appendSecurityLog(`${actorName || 'M. L. Umaima'} updated ${role} permissions`);
  }
  return {
    permissions: memoryStore.permissions,
    securityLogs: memoryStore.securityLogs.slice(0, 6),
  };
}

export async function getInventoryBundle() {
  let products;
  let auditTrail;

  if (await isPostgresConnected()) {
    const prisma = getPrisma();
    const [dbProducts, dbLogs] = await Promise.all([
      prisma.product.findMany({ orderBy: { productId: 'asc' } }),
      prisma.inventoryLog.findMany({
        include: { product: true },
        orderBy: { logId: 'desc' },
        take: 10,
      }),
    ]);
    products = dbProducts.map(mapProduct);
    auditTrail = dbLogs.map(mapInventoryLog);
  } else {
    products = memoryStore.products;
    auditTrail = memoryStore.inventoryLogs.slice(0, 10);
  }

  const metrics = computeInventoryMetrics(products);

  return {
    products,
    auditTrail,
    fifoValuation: computeFifoValuationUsd(products),
    fifoValuationLkr: computeFifoValuationLkr(products),
    exchangeRateLkr: USD_TO_LKR_RATE,
    optimalScore: metrics.optimalScore,
    lowStockCount: metrics.lowStockCount,
    stockAlerts: metrics.stockAlerts,
    stockMatrix: metrics.stockMatrix,
  };
}

export async function createProductSku(payload = {}, userId = null) {
  const cleanName = requireNonEmptyString(payload.name, 'Product name');
  const stockQty = parseNonNegativeNumber(payload.stockQty, 0, 'Stock quantity');
  const reorderLevel = parseNonNegativeNumber(payload.reorderLevel, 150, 'Reorder level');
  const unitPrice = parseNonNegativeNumber(payload.unitPrice, 45, 'Unit price');
  const unitPriceLkr = parseNonNegativeNumber(
    payload.unitPriceLkr,
    Math.round(unitPrice * USD_TO_LKR_RATE),
    'Unit price (LKR)'
  );
  const costPrice = parseNonNegativeNumber(
    payload.costPrice,
    Math.round(unitPrice * 0.68),
    'Cost price'
  );
  const costPriceLkr = parseNonNegativeNumber(
    payload.costPriceLkr,
    Math.round(costPrice * USD_TO_LKR_RATE),
    'Cost price (LKR)'
  );

  const isLow = stockQty <= reorderLevel;
  const skuCode = (
    payload.sku || `SKU-SPC-${String(Date.now()).slice(-4)}`
  )
    .trim()
    .toUpperCase();

  const defaultSvg = makeSpiceSvg({
    bg1: '#4c1d95',
    bg2: '#7c3aed',
    accent: '#22c55e',
    title: cleanName.slice(0, 14),
    code: skuCode.slice(-6),
  });
  const imageUrl = payload.imageUrl?.trim() ? payload.imageUrl.trim() : defaultSvg;

  if (await isPostgresConnected()) {
    const prisma = getPrisma();
    const created = await prisma.product.create({
      data: {
        sku: skuCode,
        name: cleanName,
        category: payload.category || 'Spices',
        hsCode: payload.hsCode || '0910.99',
        originRegion: payload.originRegion || 'Kandy & Matale',
        description:
          payload.description || 'Authentic Sri Lankan export-grade spice batch',
        imageUrl,
        unitPrice,
        unitPriceLkr,
        costPrice,
        costPriceLkr,
        stockQty,
        reorderLevel,
        dots: isLow ? 3 : 2,
        valuationMethod: payload.valuationMethod || 'FIFO',
      },
    });

    await prisma.inventoryLog.create({
      data: {
        productId: created.productId,
        movementType: 'STOCK_IN',
        quantity: stockQty,
        unitCost: costPrice,
        unitCostLkr: costPriceLkr,
        referenceNote: 'Initial SKU catalog registration',
        userId: userId ? Number(userId) : null,
      },
    });

    return getInventoryBundle();
  }

  const nextId =
    memoryStore.products.reduce((max, p) => Math.max(max, p.productId), 0) + 1;
  const finalSku = (payload.sku || `SKU-SPC-0${nextId}`).trim().toUpperCase();
  if (memoryStore.products.some((p) => p.sku.toUpperCase() === finalSku)) {
    throw buildError('A product with that SKU already exists', 409);
  }

  const newProduct = {
    productId: nextId,
    sku: finalSku,
    name: cleanName,
    category: payload.category || 'Spices',
    hsCode: payload.hsCode || '0910.99',
    originRegion: payload.originRegion || 'Kandy & Matale',
    description:
      payload.description || 'Authentic Sri Lankan export-grade spice batch',
    imageUrl,
    unitPrice,
    unitPriceLkr,
    costPrice,
    costPriceLkr,
    stockQty,
    reorderLevel,
    stockPercent: isLow ? 18 : 88,
    badge: isLow ? 'Low Stock' : 'High Demand',
    badgeTone: isLow ? 'amber' : 'violet',
    dots: isLow ? 3 : 2,
    valuationMethod: payload.valuationMethod || 'FIFO',
  };
  memoryStore.products.unshift(newProduct);

  memoryStore.inventoryLogs.unshift({
    logId: Date.now(),
    productId: newProduct.productId,
    productName: newProduct.name,
    movementType: 'STOCK_IN',
    quantity: stockQty,
    unitCost: costPrice,
    unitCostLkr: costPriceLkr,
    referenceNote: 'Initial SKU catalog registration',
    logDate: 'Just now',
  });

  return getInventoryBundle();
}

export async function updateProductSku(productId, payload) {
  const id = Number(productId);
  if (await isPostgresConnected()) {
    const prisma = getPrisma();
    const existing = await prisma.product.findUnique({ where: { productId: id } });
    if (!existing) throw buildError('Product SKU not found', 404);

    const data = {};
    if (payload.sku) data.sku = payload.sku.trim().toUpperCase();
    if (payload.name) data.name = payload.name.trim();
    if (payload.category) data.category = payload.category.trim();
    if (payload.hsCode !== undefined) data.hsCode = payload.hsCode;
    if (payload.originRegion !== undefined) data.originRegion = payload.originRegion;
    if (payload.description !== undefined) data.description = payload.description;
    if (payload.clearImage === true || payload.clearImage === 'true') {
      data.imageUrl = makeSpiceSvg({
        bg1: '#4c1d95',
        bg2: '#7c3aed',
        accent: '#22c55e',
        title: (data.name || existing.name || 'Ceylon Spice').slice(0, 14),
        code: (data.sku || existing.sku || `SKU-${id}`).slice(-6),
      });
    } else if (payload.imageUrl?.trim()) {
      data.imageUrl = payload.imageUrl.trim();
    }
    if (payload.unitPrice !== undefined) {
      const unitPrice = Number(payload.unitPrice);
      data.unitPrice = unitPrice;
      data.unitPriceLkr = Number(
        payload.unitPriceLkr || Math.round(unitPrice * USD_TO_LKR_RATE)
      );
    }
    if (payload.unitPriceLkr !== undefined) {
      data.unitPriceLkr = Number(payload.unitPriceLkr);
    }
    if (payload.stockQty !== undefined) data.stockQty = Number(payload.stockQty);
    if (payload.reorderLevel !== undefined) {
      data.reorderLevel = Number(payload.reorderLevel);
    }

    await prisma.product.update({ where: { productId: id }, data });
    return getInventoryBundle();
  }

  const product = memoryStore.products.find((p) => p.productId === id);
  if (!product) throw buildError('Product SKU not found', 404);

  if (payload.sku) product.sku = payload.sku.trim().toUpperCase();
  if (payload.name) product.name = payload.name.trim();
  if (payload.category) product.category = payload.category.trim();
  if (payload.hsCode !== undefined) product.hsCode = payload.hsCode;
  if (payload.originRegion !== undefined) product.originRegion = payload.originRegion;
  if (payload.description !== undefined) product.description = payload.description;
  if (payload.clearImage === true || payload.clearImage === 'true') {
    product.imageUrl = makeSpiceSvg({
      bg1: '#4c1d95',
      bg2: '#7c3aed',
      accent: '#22c55e',
      title: (product.name || 'Ceylon Spice').slice(0, 14),
      code: (product.sku || `SKU-${product.productId}`).slice(-6),
    });
  } else if (payload.imageUrl?.trim()) {
    product.imageUrl = payload.imageUrl.trim();
  }
  if (payload.unitPrice !== undefined) {
    product.unitPrice = Number(payload.unitPrice);
    product.unitPriceLkr = Number(
      payload.unitPriceLkr || Math.round(product.unitPrice * USD_TO_LKR_RATE)
    );
  }
  if (payload.unitPriceLkr !== undefined) {
    product.unitPriceLkr = Number(payload.unitPriceLkr);
  }
  if (payload.stockQty !== undefined) product.stockQty = Number(payload.stockQty);
  if (payload.reorderLevel !== undefined) {
    product.reorderLevel = Number(payload.reorderLevel);
  }

  return getInventoryBundle();
}

export async function deleteProductSku(productId) {
  const id = Number(productId);
  if (await isPostgresConnected()) {
    const prisma = getPrisma();
    const existing = await prisma.product.findUnique({ where: { productId: id } });
    if (!existing) throw buildError('Product SKU not found', 404);
    await prisma.product.delete({ where: { productId: id } });
    return getInventoryBundle();
  }

  const idx = memoryStore.products.findIndex((p) => p.productId === id);
  if (idx === -1) throw buildError('Product SKU not found', 404);

  memoryStore.products.splice(idx, 1);
  return getInventoryBundle();
}

export async function recordInventoryMovement({
  productId,
  movementType,
  quantity,
  referenceNote,
  userId = null,
} = {}) {
  const id = Number(productId);
  const qty = Number(quantity);
  if (!Number.isFinite(id) || id <= 0) {
    throw buildError('Valid productId is required', 400);
  }
  if (!['STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT'].includes(movementType)) {
    throw buildError('Movement type must be STOCK_IN, STOCK_OUT, or ADJUSTMENT', 400);
  }
  if (!Number.isFinite(qty) || qty <= 0) {
    throw buildError('Movement quantity must be a positive number', 400);
  }

  if (await isPostgresConnected()) {
    const prisma = getPrisma();
    const product = await prisma.product.findUnique({ where: { productId: id } });
    if (!product) throw buildError('Product not found', 404);

    if (movementType === 'STOCK_OUT' && product.stockQty < qty) {
      throw buildError(
        `Insufficient stock for ${product.name} (Available: ${product.stockQty} kg)`,
        400
      );
    }

    const nextQty =
      movementType === 'STOCK_OUT' ? product.stockQty - qty : product.stockQty + qty;

    await prisma.$transaction([
      prisma.product.update({
        where: { productId: id },
        data: { stockQty: nextQty },
      }),
      prisma.inventoryLog.create({
        data: {
          productId: id,
          movementType,
          quantity: qty,
          unitCost: product.costPrice,
          unitCostLkr: product.costPriceLkr,
          referenceNote: referenceNote || `${movementType} recorded`,
          userId: userId ? Number(userId) : null,
        },
      }),
    ]);

    return getInventoryBundle();
  }

  const product = memoryStore.products.find((p) => p.productId === id);
  if (!product) throw buildError('Product not found', 404);

  if (movementType === 'STOCK_OUT' && product.stockQty < qty) {
    throw buildError(
      `Insufficient stock for ${product.name} (Available: ${product.stockQty} kg)`,
      400
    );
  }

  product.stockQty =
    movementType === 'STOCK_OUT' ? product.stockQty - qty : product.stockQty + qty;

  memoryStore.inventoryLogs.unshift({
    logId: Date.now(),
    productId: product.productId,
    productName: product.name,
    movementType,
    quantity: qty,
    unitCost: product.costPrice,
    unitCostLkr: product.costPriceLkr,
    referenceNote: referenceNote || `${movementType} recorded`,
    logDate: 'Just now',
  });

  return getInventoryBundle();
}

export async function getShipmentsBundle() {
  let transactions;
  if (await isPostgresConnected()) {
    const rows = await getPrisma().transaction.findMany({
      include: { customer: true, supplier: true },
      orderBy: { txnId: 'desc' },
    });
    transactions = rows.map(mapTransaction);
  } else {
    transactions = memoryStore.transactions;
  }

  const metrics = computeShipmentsMetrics(transactions);
  return {
    transactions,
    fulfillmentScore: metrics.fulfillmentScore,
    statusBreakdown: metrics.statusBreakdown,
    documentsRepository: [
      { docType: 'COMMERCIAL_INVOICE', title: 'Commercial Invoice', code: 'PDF' },
      { docType: 'PACKING_LIST', title: 'Packing List', code: 'PDF' },
      { docType: 'BILL_OF_LADING', title: 'Bill of Lading', code: 'PDF' },
      { docType: 'CERTIFICATE_OF_ORIGIN', title: 'Certificate of Origin', code: 'PDF' },
    ],
  };
}

export async function createTradeDeclaration(payload = {}, userId = null) {
  const cleanTitle = requireNonEmptyString(payload.title, 'Declaration title');
  const dutyRate = parseNonNegativeNumber(payload.dutyRate, 0, 'Duty rate');
  const totalValue = parseNonNegativeNumber(payload.totalValue, 18500, 'Declared value');
  const dutyAmount = Math.round(totalValue * (dutyRate / 100));
  const type = payload.type === 'IMPORT' ? 'IMPORT' : 'EXPORT';
  const currency = payload.currency || (type === 'EXPORT' ? 'USD' : 'LKR');
  const prefix = type === 'IMPORT' ? 'IMP' : 'EXP';
  const badge =
    type === 'IMPORT' ? `Local Procurement (${currency})` : 'Active Inspection';

  if (await isPostgresConnected()) {
    const prisma = getPrisma();
    const count = await prisma.transaction.count();
    await prisma.transaction.create({
      data: {
        txnNumber: `${prefix}-2026-${String(count + 1).padStart(4, '0')}`,
        title: cleanTitle,
        type,
        currency,
        status: payload.status || 'IN_TRANSIT',
        badge,
        hsCode: payload.hsCode || '0906.11',
        incoterms: payload.incoterms || 'FOB Colombo',
        dutyRate,
        dutyAmount,
        originCountry: payload.originCountry || 'Sri Lanka',
        destinationCountry: payload.destinationCountry || 'USA',
        carrier: payload.carrier || 'Maersk Line',
        trackingNumber:
          payload.trackingNumber ||
          `MAEU${Math.floor(1000000 + Math.random() * 9000000)}`,
        totalValue,
        partnerName: payload.partnerName || 'International Spice Buyer',
        txnDate: new Date(),
        userId: userId ? Number(userId) : null,
      },
    });
    return getShipmentsBundle();
  }

  const nextId =
    memoryStore.transactions.reduce((max, t) => Math.max(max, t.txnId), 0) + 1;

  const newTxn = {
    txnId: nextId,
    txnNumber: `${prefix}-2026-000${nextId}`,
    title: cleanTitle,
    type,
    currency,
    status: payload.status || 'IN_TRANSIT',
    badge,
    hsCode: payload.hsCode || '0906.11',
    incoterms: payload.incoterms || 'FOB Colombo',
    dutyRate,
    dutyAmount,
    originCountry: payload.originCountry || 'Sri Lanka',
    destinationCountry: payload.destinationCountry || 'USA',
    carrier: payload.carrier || 'Maersk Line',
    trackingNumber:
      payload.trackingNumber ||
      `MAEU${Math.floor(1000000 + Math.random() * 9000000)}`,
    totalValue,
    partnerName: payload.partnerName || 'International Spice Buyer',
    txnDate: new Date().toISOString().slice(0, 10),
  };

  memoryStore.transactions.unshift(newTxn);
  return getShipmentsBundle();
}

export async function updateTradeDeclaration(txnId, payload) {
  const id = Number(txnId);
  if (await isPostgresConnected()) {
    const prisma = getPrisma();
    const existing = await prisma.transaction.findUnique({ where: { txnId: id } });
    if (!existing) throw buildError('Transaction declaration not found', 404);

    const nextValue =
      payload.totalValue !== undefined
        ? Number(payload.totalValue)
        : Number(existing.totalValue);
    const nextRate =
      payload.dutyRate !== undefined
        ? Number(payload.dutyRate)
        : Number(existing.dutyRate);

    await prisma.transaction.update({
      where: { txnId: id },
      data: {
        ...(payload.title ? { title: payload.title.trim() } : {}),
        ...(payload.type ? { type: payload.type } : {}),
        ...(payload.currency ? { currency: payload.currency } : {}),
        ...(payload.status ? { status: payload.status } : {}),
        ...(payload.hsCode ? { hsCode: payload.hsCode } : {}),
        ...(payload.incoterms ? { incoterms: payload.incoterms } : {}),
        ...(payload.destinationCountry
          ? { destinationCountry: payload.destinationCountry }
          : {}),
        ...(payload.partnerName ? { partnerName: payload.partnerName } : {}),
        dutyRate: nextRate,
        totalValue: nextValue,
        dutyAmount: Math.round(nextValue * (nextRate / 100)),
      },
    });
    return getShipmentsBundle();
  }

  const txn = memoryStore.transactions.find((t) => t.txnId === id);
  if (!txn) throw buildError('Transaction declaration not found', 404);

  if (payload.title) txn.title = payload.title.trim();
  if (payload.type) txn.type = payload.type;
  if (payload.currency) txn.currency = payload.currency;
  if (payload.status) txn.status = payload.status;
  if (payload.hsCode) txn.hsCode = payload.hsCode;
  if (payload.incoterms) txn.incoterms = payload.incoterms;
  if (payload.destinationCountry) txn.destinationCountry = payload.destinationCountry;
  if (payload.partnerName) txn.partnerName = payload.partnerName;
  if (payload.dutyRate !== undefined) txn.dutyRate = Number(payload.dutyRate);
  if (payload.totalValue !== undefined) txn.totalValue = Number(payload.totalValue);
  txn.dutyAmount = Math.round(txn.totalValue * (txn.dutyRate / 100));

  return getShipmentsBundle();
}

export async function deleteTradeDeclaration(txnId) {
  const id = Number(txnId);
  if (await isPostgresConnected()) {
    const prisma = getPrisma();
    const existing = await prisma.transaction.findUnique({ where: { txnId: id } });
    if (!existing) throw buildError('Transaction declaration not found', 404);
    await prisma.transaction.delete({ where: { txnId: id } });
    return getShipmentsBundle();
  }

  const idx = memoryStore.transactions.findIndex((t) => t.txnId === id);
  if (idx === -1) throw buildError('Transaction declaration not found', 404);
  memoryStore.transactions.splice(idx, 1);
  return getShipmentsBundle();
}

export async function advanceShipmentStatus(txnId, status) {
  const id = Number(txnId);
  if (await isPostgresConnected()) {
    const prisma = getPrisma();
    const existing = await prisma.transaction.findUnique({ where: { txnId: id } });
    if (!existing) throw buildError('Transaction declaration not found', 404);
    await prisma.transaction.update({
      where: { txnId: id },
      data: { status },
    });
    return getShipmentsBundle();
  }

  const txn = memoryStore.transactions.find((t) => t.txnId === id);
  if (!txn) throw buildError('Transaction declaration not found', 404);
  txn.status = status;
  return getShipmentsBundle();
}

export async function findTransactionById(txnId) {
  const id = Number(txnId);
  if (await isPostgresConnected()) {
    const prisma = getPrisma();
    const row =
      (await prisma.transaction.findUnique({
        where: { txnId: id },
        include: { customer: true, supplier: true },
      })) ||
      (await prisma.transaction.findFirst({
        include: { customer: true, supplier: true },
      }));
    return row ? mapTransaction(row) : memoryStore.transactions[0];
  }

  return (
    memoryStore.transactions.find((t) => t.txnId === id) ||
    memoryStore.transactions[0]
  );
}

export async function getSuppliersBundle() {
  let suppliers;
  let purchaseOrders;

  if (await isPostgresConnected()) {
    const prisma = getPrisma();
    const [dbSups, dbPos] = await Promise.all([
      prisma.supplier.findMany({ orderBy: { supplierId: 'asc' } }),
      prisma.purchaseOrder.findMany({
        include: { supplier: true },
        orderBy: { poId: 'desc' },
      }),
    ]);
    suppliers = dbSups.map(mapSupplier);
    purchaseOrders = dbPos.map(mapPurchaseOrder);
  } else {
    suppliers = memoryStore.suppliers;
    purchaseOrders = memoryStore.purchaseOrders;
  }

  const metrics = computeSuppliersMetrics(suppliers, purchaseOrders);
  return {
    suppliers,
    purchaseOrders,
    performanceRating: metrics.performanceRating,
    balanceMatrix: metrics.balanceMatrix,
    currency: 'LKR',
    workflowStages: metrics.workflowStages,
  };
}

export async function createSupplierRecord(payload = {}) {
  const cleanName = requireNonEmptyString(payload.name, 'Supplier name');
  const balance = parseNonNegativeNumber(payload.balance, 1800000, 'Supplier balance');
  const onTimeRate = parseNonNegativeNumber(payload.onTimeRate, 93, 'On-time delivery rate');

  if (await isPostgresConnected()) {
    await getPrisma().supplier.create({
      data: {
        name: cleanName,
        country: payload.country || 'Sri Lanka',
        currency: 'LKR',
        contactEmail: payload.contactEmail || 'supplier@ceylonspices.lk',
        phone: payload.phone || '+94 81 220 0000',
        paymentTerms: payload.paymentTerms || 'Net 30',
        balance,
        onTimeRate,
        accuracyRate: 97,
        reliabilityDots: 4,
        featured: false,
      },
    });
    return getSuppliersBundle();
  }

  const nextId =
    memoryStore.suppliers.reduce((max, s) => Math.max(max, s.supplierId), 0) + 1;
  memoryStore.suppliers.unshift({
    supplierId: nextId,
    name: cleanName,
    country: payload.country || 'Sri Lanka',
    currency: 'LKR',
    contactEmail: payload.contactEmail || 'supplier@ceylonspices.lk',
    phone: payload.phone || '+94 81 220 0000',
    paymentTerms: payload.paymentTerms || 'Net 30',
    balance,
    onTimeRate,
    accuracyRate: 97,
    reliabilityDots: 4,
    featured: false,
  });
  return getSuppliersBundle();
}

export async function updateSupplierRecord(supplierId, payload) {
  const id = Number(supplierId);
  if (await isPostgresConnected()) {
    const prisma = getPrisma();
    const existing = await prisma.supplier.findUnique({ where: { supplierId: id } });
    if (!existing) throw buildError('Supplier not found', 404);

    await prisma.supplier.update({
      where: { supplierId: id },
      data: {
        ...(payload.name ? { name: payload.name.trim() } : {}),
        ...(payload.country ? { country: payload.country.trim() } : {}),
        ...(payload.contactEmail ? { contactEmail: payload.contactEmail.trim() } : {}),
        ...(payload.phone !== undefined ? { phone: payload.phone } : {}),
        ...(payload.paymentTerms ? { paymentTerms: payload.paymentTerms } : {}),
        ...(payload.balance !== undefined ? { balance: Number(payload.balance) } : {}),
        ...(payload.onTimeRate !== undefined
          ? { onTimeRate: Number(payload.onTimeRate) }
          : {}),
      },
    });
    return getSuppliersBundle();
  }

  const sup = memoryStore.suppliers.find((s) => s.supplierId === id);
  if (!sup) throw buildError('Supplier not found', 404);
  if (payload.name) sup.name = payload.name.trim();
  if (payload.country) sup.country = payload.country.trim();
  if (payload.contactEmail) sup.contactEmail = payload.contactEmail.trim();
  if (payload.phone !== undefined) sup.phone = payload.phone;
  if (payload.paymentTerms) sup.paymentTerms = payload.paymentTerms;
  if (payload.balance !== undefined) sup.balance = Number(payload.balance);
  if (payload.onTimeRate !== undefined) sup.onTimeRate = Number(payload.onTimeRate);
  return getSuppliersBundle();
}

export async function deleteSupplierRecord(supplierId) {
  const id = Number(supplierId);
  if (await isPostgresConnected()) {
    const prisma = getPrisma();
    const existing = await prisma.supplier.findUnique({ where: { supplierId: id } });
    if (!existing) throw buildError('Supplier not found', 404);
    try {
      await prisma.supplier.delete({ where: { supplierId: id } });
    } catch {
      throw buildError('Remove linked purchase orders before deleting this supplier', 409);
    }
    return getSuppliersBundle();
  }

  const idx = memoryStore.suppliers.findIndex((s) => s.supplierId === id);
  if (idx === -1) throw buildError('Supplier not found', 404);
  memoryStore.suppliers.splice(idx, 1);
  return getSuppliersBundle();
}

export async function createPurchaseOrderRecord(payload, userId = null) {
  if (await isPostgresConnected()) {
    const prisma = getPrisma();
    const supplier =
      (await prisma.supplier.findUnique({
        where: { supplierId: Number(payload.supplierId) },
      })) || (await prisma.supplier.findFirst());
    const count = await prisma.purchaseOrder.count();
    await prisma.purchaseOrder.create({
      data: {
        poNumber: `PO-2026-${String(count + 8).padStart(2, '0')}`,
        supplierId: supplier.supplierId,
        createdById: userId ? Number(userId) : null,
        productName: payload.productName || 'Ceylon Alba Cinnamon',
        orderedQty: Number(payload.orderedQty || 250),
        currency: 'LKR',
        totalAmount: Number(payload.totalAmount || 3250000),
        status: 'PENDING_APPROVAL',
        expectedDate: new Date(payload.expectedDate || '2026-12-10'),
      },
    });
    return getSuppliersBundle();
  }

  const supplier =
    memoryStore.suppliers.find((s) => s.supplierId === Number(payload.supplierId)) ||
    memoryStore.suppliers[0];
  const nextId =
    memoryStore.purchaseOrders.reduce((max, p) => Math.max(max, p.poId), 0) + 1;

  memoryStore.purchaseOrders.unshift({
    poId: nextId,
    poNumber: `PO-2026-${String(nextId + 7).padStart(2, '0')}`,
    supplierId: supplier.supplierId,
    supplierName: supplier.name,
    productName: payload.productName || 'Ceylon Alba Cinnamon',
    orderedQty: Number(payload.orderedQty || 250),
    currency: 'LKR',
    totalAmount: Number(payload.totalAmount || 3250000),
    status: 'PENDING_APPROVAL',
    expectedDate: payload.expectedDate || '2026-12-10',
  });
  return getSuppliersBundle();
}

export async function updatePurchaseOrderRecord(poId, payload) {
  const id = Number(poId);
  if (await isPostgresConnected()) {
    const prisma = getPrisma();
    const existing = await prisma.purchaseOrder.findUnique({ where: { poId: id } });
    if (!existing) throw buildError('Purchase order not found', 404);
    await prisma.purchaseOrder.update({
      where: { poId: id },
      data: {
        ...(payload.productName ? { productName: payload.productName } : {}),
        ...(payload.orderedQty !== undefined
          ? { orderedQty: Number(payload.orderedQty) }
          : {}),
        ...(payload.totalAmount !== undefined
          ? { totalAmount: Number(payload.totalAmount) }
          : {}),
        ...(payload.status ? { status: payload.status } : {}),
      },
    });
    return getSuppliersBundle();
  }

  const po = memoryStore.purchaseOrders.find((p) => p.poId === id);
  if (!po) throw buildError('Purchase order not found', 404);
  if (payload.productName) po.productName = payload.productName;
  if (payload.orderedQty !== undefined) po.orderedQty = Number(payload.orderedQty);
  if (payload.totalAmount !== undefined) po.totalAmount = Number(payload.totalAmount);
  if (payload.status) po.status = payload.status;
  return getSuppliersBundle();
}

export async function deletePurchaseOrderRecord(poId) {
  const id = Number(poId);
  if (await isPostgresConnected()) {
    const prisma = getPrisma();
    const existing = await prisma.purchaseOrder.findUnique({ where: { poId: id } });
    if (!existing) throw buildError('Purchase order not found', 404);
    await prisma.purchaseOrder.delete({ where: { poId: id } });
    return getSuppliersBundle();
  }

  const idx = memoryStore.purchaseOrders.findIndex((p) => p.poId === id);
  if (idx === -1) throw buildError('Purchase order not found', 404);
  memoryStore.purchaseOrders.splice(idx, 1);
  return getSuppliersBundle();
}

export async function updatePurchaseOrderStatus(poId, status) {
  const id = Number(poId);
  if (await isPostgresConnected()) {
    const prisma = getPrisma();
    const existing = await prisma.purchaseOrder.findUnique({ where: { poId: id } });
    if (existing) {
      await prisma.purchaseOrder.update({
        where: { poId: id },
        data: { status },
      });
    }
    return getSuppliersBundle();
  }

  const po = memoryStore.purchaseOrders.find((p) => p.poId === id);
  if (po) po.status = status;
  return getSuppliersBundle();
}

export async function getCustomersBundle() {
  let customers;
  let salesOrders;
  let communications;

  if (await isPostgresConnected()) {
    const prisma = getPrisma();
    const [dbCusts, dbSos, dbComms] = await Promise.all([
      prisma.customer.findMany({ orderBy: { customerId: 'asc' } }),
      prisma.salesOrder.findMany({
        include: { customer: true },
        orderBy: { soId: 'desc' },
      }),
      prisma.communicationLog.findMany({
        include: { customer: true },
        orderBy: { commId: 'desc' },
        take: 10,
      }),
    ]);
    customers = dbCusts.map(mapCustomer);
    salesOrders = dbSos.map(mapSalesOrder);
    communications = dbComms.map(mapCommunication);
  } else {
    customers = memoryStore.customers;
    salesOrders = memoryStore.salesOrders;
    communications = memoryStore.communications;
  }

  const internationalBuyers = customers.filter((c) => c.marketType === 'INTERNATIONAL');
  const localBuyers = customers.filter((c) => c.marketType === 'LOCAL');
  const metrics = computeCustomersMetrics(customers, salesOrders);

  return {
    customers,
    internationalBuyers,
    localBuyers,
    salesOrders,
    communications,
    creditUtilization: metrics.creditUtilization,
    paymentsMatrix: metrics.paymentsMatrix,
    pipelineStages: metrics.pipelineStages,
    byMarket: metrics.byMarket,
  };
}

export async function createCustomerRecord(payload = {}) {
  const cleanName = requireNonEmptyString(payload.name, 'Customer name');
  const marketType = payload.marketType === 'LOCAL' ? 'LOCAL' : 'INTERNATIONAL';
  const currency = marketType === 'LOCAL' ? 'LKR' : 'USD';
  const defaultLimit = marketType === 'LOCAL' ? 5000000 : 100000;
  const creditLimit = parseNonNegativeNumber(
    payload.creditLimit,
    defaultLimit,
    'Credit limit'
  );
  const balance = parseNonNegativeNumber(
    payload.balance,
    Math.round(creditLimit * 0.25),
    'Customer balance'
  );

  if (await isPostgresConnected()) {
    await getPrisma().customer.create({
      data: {
        name: cleanName,
        country:
          payload.country || (marketType === 'LOCAL' ? 'Sri Lanka (Colombo)' : 'United Kingdom'),
        marketType,
        currency,
        contactEmail:
          payload.contactEmail ||
          (marketType === 'LOCAL' ? 'buyer@lankatrade.lk' : 'buyer@globaltrade.com'),
        phone:
          payload.phone || (marketType === 'LOCAL' ? '+94 11 234 5678' : '+44 20 7946 0192'),
        creditLimit,
        balance,
        tier: payload.tier || (marketType === 'LOCAL' ? 'Local Enterprise' : 'Enterprise'),
        featured: false,
      },
    });
    return getCustomersBundle();
  }

  const nextId =
    memoryStore.customers.reduce((max, c) => Math.max(max, c.customerId), 0) + 1;

  memoryStore.customers.unshift({
    customerId: nextId,
    name: cleanName,
    country:
      payload.country || (marketType === 'LOCAL' ? 'Sri Lanka (Colombo)' : 'United Kingdom'),
    marketType,
    currency,
    contactEmail:
      payload.contactEmail ||
      (marketType === 'LOCAL' ? 'buyer@lankatrade.lk' : 'buyer@globaltrade.com'),
    phone:
      payload.phone || (marketType === 'LOCAL' ? '+94 11 234 5678' : '+44 20 7946 0192'),
    creditLimit,
    balance,
    utilization: Math.min(100, Math.round((balance / Math.max(creditLimit, 1)) * 100)),
    tier: payload.tier || (marketType === 'LOCAL' ? 'Local Enterprise' : 'Enterprise'),
    featured: false,
  });
  return getCustomersBundle();
}

export async function updateCustomerRecord(customerId, payload) {
  const id = Number(customerId);
  if (await isPostgresConnected()) {
    const prisma = getPrisma();
    const existing = await prisma.customer.findUnique({ where: { customerId: id } });
    if (!existing) throw buildError('Customer not found', 404);

    const data = {};
    if (payload.name) data.name = payload.name.trim();
    if (payload.country) data.country = payload.country.trim();
    if (payload.contactEmail) data.contactEmail = payload.contactEmail.trim();
    if (payload.phone !== undefined) data.phone = payload.phone;
    if (payload.marketType) {
      data.marketType = payload.marketType;
      data.currency = payload.marketType === 'LOCAL' ? 'LKR' : 'USD';
    }
    if (payload.creditLimit !== undefined) data.creditLimit = Number(payload.creditLimit);
    if (payload.balance !== undefined) data.balance = Number(payload.balance);

    await prisma.customer.update({ where: { customerId: id }, data });
    return getCustomersBundle();
  }

  const cust = memoryStore.customers.find((c) => c.customerId === id);
  if (!cust) throw buildError('Customer not found', 404);
  if (payload.name) cust.name = payload.name.trim();
  if (payload.country) cust.country = payload.country.trim();
  if (payload.contactEmail) cust.contactEmail = payload.contactEmail.trim();
  if (payload.phone !== undefined) cust.phone = payload.phone;
  if (payload.marketType) {
    cust.marketType = payload.marketType;
    cust.currency = payload.marketType === 'LOCAL' ? 'LKR' : 'USD';
  }
  if (payload.creditLimit !== undefined) cust.creditLimit = Number(payload.creditLimit);
  if (payload.balance !== undefined) cust.balance = Number(payload.balance);
  cust.utilization = Math.min(
    100,
    Math.round((cust.balance / Math.max(cust.creditLimit, 1)) * 100)
  );
  return getCustomersBundle();
}

export async function deleteCustomerRecord(customerId) {
  const id = Number(customerId);
  if (await isPostgresConnected()) {
    const prisma = getPrisma();
    const existing = await prisma.customer.findUnique({ where: { customerId: id } });
    if (!existing) throw buildError('Customer not found', 404);
    try {
      await prisma.customer.delete({ where: { customerId: id } });
    } catch {
      throw buildError('Remove linked sales orders before deleting this buyer', 409);
    }
    return getCustomersBundle();
  }

  const idx = memoryStore.customers.findIndex((c) => c.customerId === id);
  if (idx === -1) throw buildError('Customer not found', 404);
  memoryStore.customers.splice(idx, 1);
  return getCustomersBundle();
}

export async function createSalesInvoiceRecord(payload, userId = null) {
  if (await isPostgresConnected()) {
    const prisma = getPrisma();
    const customer =
      (await prisma.customer.findUnique({
        where: { customerId: Number(payload.customerId) },
      })) || (await prisma.customer.findFirst());
    const isLocal = customer.marketType === 'LOCAL';
    const currency = isLocal ? 'LKR' : 'USD';
    const amount = Number(payload.totalAmount || (isLocal ? 2450000 : 28500));
    const count = await prisma.salesOrder.count();
    const codeNum = 2604 + count;
    const soNumber = isLocal ? `SO-LKR-${codeNum}` : `SO-${codeNum}`;
    const invoiceCode = isLocal ? `INV-LKR-${codeNum}` : `INV-${codeNum}`;
    const payStatus = payload.paymentStatus || 'UNPAID';

    const ops = [
      prisma.salesOrder.create({
        data: {
          soNumber,
          invoiceCode,
          customerId: customer.customerId,
          createdById: userId ? Number(userId) : null,
          marketType: customer.marketType,
          currency,
          productName: payload.productName || 'Ceylon Alba Cinnamon',
          quantity: Number(payload.quantity || 300),
          totalAmount: amount,
          status: payload.status || 'INVOICED',
          paymentStatus: payStatus,
        },
      }),
      prisma.communicationLog.create({
        data: {
          customerId: customer.customerId,
          userId: userId ? Number(userId) : null,
          senderLabel: 'Invoice Generated',
          channel: 'EMAIL',
          subject: `Generate sales invoice ${invoiceCode} for ${customer.name}`,
          notes: `Generated ${invoiceCode} (${
            currency === 'LKR'
              ? `Rs. ${amount.toLocaleString()}`
              : `$${amount.toLocaleString()}`
          }) and attached shipping pack:`,
          attachments: [invoiceCode, `PL-${codeNum}`, `BL-${codeNum}`],
        },
      }),
    ];

    if (payStatus !== 'PAID') {
      ops.push(
        prisma.customer.update({
          where: { customerId: customer.customerId },
          data: { balance: Number(customer.balance || 0) + amount },
        })
      );
    }

    await prisma.$transaction(ops);
    return getCustomersBundle();
  }

  const customer =
    memoryStore.customers.find((c) => c.customerId === Number(payload.customerId)) ||
    memoryStore.customers[0];
  const isLocal = customer.marketType === 'LOCAL';
  const currency = isLocal ? 'LKR' : 'USD';
  const amount = Number(payload.totalAmount || (isLocal ? 2450000 : 28500));
  const nextId =
    memoryStore.salesOrders.reduce((max, s) => Math.max(max, s.soId), 0) + 1;
  const codeNum = 2603 + nextId;

  const newSo = {
    soId: nextId,
    soNumber: isLocal ? `SO-LKR-${codeNum}` : `SO-${codeNum}`,
    invoiceCode: isLocal ? `INV-LKR-${codeNum}` : `INV-${codeNum}`,
    customerId: customer.customerId,
    customerName: customer.name,
    marketType: customer.marketType,
    currency,
    productName: payload.productName || 'Ceylon Alba Cinnamon',
    quantity: Number(payload.quantity || 300),
    totalAmount: amount,
    status: payload.status || 'INVOICED',
    paymentStatus: payload.paymentStatus || 'UNPAID',
  };
  memoryStore.salesOrders.unshift(newSo);

  if (newSo.paymentStatus !== 'PAID') {
    customer.balance = Number(customer.balance || 0) + amount;
    customer.utilization = Math.min(
      100,
      Math.round((customer.balance / Math.max(Number(customer.creditLimit || 1), 1)) * 100)
    );
  }

  const formattedVal =
    currency === 'LKR'
      ? `Rs. ${amount.toLocaleString()}`
      : `$${amount.toLocaleString()}`;

  memoryStore.communications.unshift({
    commId: Date.now(),
    customerId: customer.customerId,
    customerName: customer.name,
    sender: 'Invoice Generated',
    prompt: `Generate sales invoice ${newSo.invoiceCode} for ${customer.name}`,
    reply: `Generated ${newSo.invoiceCode} (${formattedVal}) and attached shipping pack:`,
    attachments: [newSo.invoiceCode, `PL-${codeNum}`, `BL-${codeNum}`],
    loggedAt: 'Just now',
  });

  return getCustomersBundle();
}

function computeUnpaidSalesOrderImpact(order) {
  if (!order) return 0;
  if (order.paymentStatus === 'PAID' || order.status === 'CANCELLED') {
    return 0;
  }
  return Number(order.totalAmount || 0);
}

export async function updateSalesInvoiceRecord(soId, payload = {}) {
  const id = Number(soId);
  if (await isPostgresConnected()) {
    const prisma = getPrisma();
    const existing = await prisma.salesOrder.findUnique({ where: { soId: id } });
    if (!existing) throw buildError('Sales order not found', 404);

    const prevUnpaid = computeUnpaidSalesOrderImpact(existing);
    const nextAmount =
      payload.totalAmount !== undefined
        ? parseNonNegativeNumber(payload.totalAmount, Number(existing.totalAmount), 'Total amount')
        : Number(existing.totalAmount);
    const nextStatus = payload.status || existing.status;
    const nextPaymentStatus = payload.paymentStatus || existing.paymentStatus;
    const nextUnpaid = computeUnpaidSalesOrderImpact({
      totalAmount: nextAmount,
      status: nextStatus,
      paymentStatus: nextPaymentStatus,
    });
    const delta = nextUnpaid - prevUnpaid;

    const ops = [
      prisma.salesOrder.update({
        where: { soId: id },
        data: {
          ...(payload.productName ? { productName: payload.productName } : {}),
          ...(payload.quantity !== undefined ? { quantity: Number(payload.quantity) } : {}),
          ...(payload.totalAmount !== undefined ? { totalAmount: nextAmount } : {}),
          ...(payload.status ? { status: payload.status } : {}),
          ...(payload.paymentStatus ? { paymentStatus: payload.paymentStatus } : {}),
        },
      }),
    ];

    if (delta !== 0) {
      const cust = await prisma.customer.findUnique({
        where: { customerId: existing.customerId },
      });
      if (cust) {
        ops.push(
          prisma.customer.update({
            where: { customerId: cust.customerId },
            data: { balance: Math.max(0, Number(cust.balance || 0) + delta) },
          })
        );
      }
    }

    await prisma.$transaction(ops);
    return getCustomersBundle();
  }

  const so = memoryStore.salesOrders.find((s) => s.soId === id);
  if (!so) throw buildError('Sales order not found', 404);

  const prevUnpaid = computeUnpaidSalesOrderImpact(so);
  if (payload.productName) so.productName = payload.productName;
  if (payload.quantity !== undefined) so.quantity = Number(payload.quantity);
  if (payload.totalAmount !== undefined) {
    so.totalAmount = parseNonNegativeNumber(payload.totalAmount, so.totalAmount, 'Total amount');
  }
  if (payload.status) so.status = payload.status;
  if (payload.paymentStatus) so.paymentStatus = payload.paymentStatus;

  const nextUnpaid = computeUnpaidSalesOrderImpact(so);
  const delta = nextUnpaid - prevUnpaid;
  if (delta !== 0) {
    const cust = memoryStore.customers.find((c) => c.customerId === so.customerId);
    if (cust) {
      cust.balance = Math.max(0, Number(cust.balance || 0) + delta);
      cust.utilization = Math.min(
        100,
        Math.round((cust.balance / Math.max(Number(cust.creditLimit || 1), 1)) * 100)
      );
    }
  }

  return getCustomersBundle();
}

export async function deleteSalesInvoiceRecord(soId) {
  const id = Number(soId);
  if (await isPostgresConnected()) {
    const prisma = getPrisma();
    const existing = await prisma.salesOrder.findUnique({ where: { soId: id } });
    if (!existing) throw buildError('Sales order not found', 404);

    const unpaidImpact = computeUnpaidSalesOrderImpact(existing);
    const ops = [prisma.salesOrder.delete({ where: { soId: id } })];

    if (unpaidImpact > 0) {
      const cust = await prisma.customer.findUnique({
        where: { customerId: existing.customerId },
      });
      if (cust) {
        ops.push(
          prisma.customer.update({
            where: { customerId: cust.customerId },
            data: { balance: Math.max(0, Number(cust.balance || 0) - unpaidImpact) },
          })
        );
      }
    }

    await prisma.$transaction(ops);
    return getCustomersBundle();
  }

  const idx = memoryStore.salesOrders.findIndex((s) => s.soId === id);
  if (idx === -1) throw buildError('Sales order not found', 404);
  const [removed] = memoryStore.salesOrders.splice(idx, 1);

  const unpaidImpact = computeUnpaidSalesOrderImpact(removed);
  if (unpaidImpact > 0) {
    const cust = memoryStore.customers.find((c) => c.customerId === removed.customerId);
    if (cust) {
      cust.balance = Math.max(0, Number(cust.balance || 0) - unpaidImpact);
      cust.utilization = Math.min(
        100,
        Math.round((cust.balance / Math.max(Number(cust.creditLimit || 1), 1)) * 100)
      );
    }
  }

  return getCustomersBundle();
}

export async function listAuthorizedDocuments(user) {
  const permissions = await loadPermissionsList();
  let docs;

  if (await isPostgresConnected()) {
    const rows = await getPrisma().document.findMany({
      include: { uploadedBy: true },
      orderBy: { docId: 'desc' },
    });
    docs = rows.map(mapDocument);
  } else {
    docs = memoryStore.documents;
  }

  return docs
    .filter((doc) => canUserAccessDocument(user, doc, permissions))
    .map(sanitizeDocumentSummary);
}

export async function getDocumentsBundle(user) {
  const [documents, dbState, permissions] = await Promise.all([
    listAuthorizedDocuments(user),
    getDatabaseStatus(),
    loadPermissionsList(),
  ]);

  let transactions;
  if (dbState.connected && dbState.schemaReady) {
    const rows = await getPrisma().transaction.findMany({
      orderBy: { txnId: 'desc' },
      take: 30,
    });
    transactions = rows.map(mapTransaction);
  } else {
    transactions = memoryStore.transactions;
  }

  const role = user?.role || 'STAFF';
  const rolePerm = permissions.find((p) => p.role === role);
  const canViewFinance =
    role === 'ADMIN' ||
    role === 'MANAGER' ||
    Boolean(rolePerm?.financeEnabled && rolePerm?.finance !== 'Restricted');
  const isAdminOrManager = role === 'ADMIN' || role === 'MANAGER';

  const total = documents.length;
  const countByCat = (cat) => documents.filter((d) => d.category === cat).length;
  const pct = (count) => (total === 0 ? 0 : Math.round((count / total) * 100));
  const restrictedCount = documents.filter((d) => d.accessLevel !== 'ALL_STAFF').length;

  const categoryBreakdown = [
    {
      category: 'FINANCIAL',
      label: 'Financial Docs',
      percent: pct(countByCat('FINANCIAL')),
      rightLabel: `${countByCat('FINANCIAL')} files`,
      tone: countByCat('FINANCIAL') > 0 ? 'emerald' : 'muted',
    },
    {
      category: 'TRADE',
      label: 'Trade & Customs',
      percent: pct(countByCat('TRADE')),
      rightLabel: `${countByCat('TRADE')} files`,
      tone: countByCat('TRADE') > 0 ? 'emerald-striped' : 'muted',
    },
    {
      category: 'MANAGEMENT',
      label: 'Management',
      percent: pct(countByCat('MANAGEMENT')),
      rightLabel: `${countByCat('MANAGEMENT')} files`,
      tone: countByCat('MANAGEMENT') > 0 ? 'amber-striped' : 'muted',
    },
    {
      category: 'INVENTORY',
      label: 'Inventory Docs',
      percent: pct(countByCat('INVENTORY')),
      rightLabel: `${countByCat('INVENTORY')} files`,
      tone: countByCat('INVENTORY') > 0 ? 'amber' : 'muted',
    },
  ];

  const cloudinaryReady = isCloudinaryConfigured();
  const supabaseStorageReady = Boolean(getSupabaseAdmin());

  return {
    documents,
    transactions: transactions.map((t) => ({
      txnId: t.txnId,
      txnNumber: t.txnNumber,
      title: t.title,
    })),
    summary: {
      totalAuthorized: total,
      restrictedCount,
      restrictedPercent: total === 0 ? 100 : Math.round((restrictedCount / total) * 100),
      financialCount: countByCat('FINANCIAL'),
      categoryBreakdown,
    },
    capabilities: {
      role,
      canUploadOperational: true,
      canUploadFinancial: isAdminOrManager,
      canUploadManagement: isAdminOrManager,
      canViewFinance,
      canEdit: isAdminOrManager,
      canDelete: isAdminOrManager,
      canMarkAdminOnly: role === 'ADMIN',
    },
    storageProvider: cloudinaryReady
      ? 'Cloudinary Encrypted Vault'
      : supabaseStorageReady
      ? 'Supabase Storage'
      : 'Encrypted Inline Fallback',
    cloudinaryConfigured: cloudinaryReady,
    databaseProvider: dbState.provider,
  };
}

export async function createDocumentRecord({ user, fileMeta, payload }) {
  const role = user?.role || 'STAFF';
  const category = payload.category || 'FINANCIAL';
  let accessLevel = payload.accessLevel || (category === 'TRADE' ? 'ALL_STAFF' : 'MANAGER_ADMIN');

  if (accessLevel === 'ADMIN_ONLY' && role !== 'ADMIN') {
    throw buildError('Only Administrators can mark documents as Admin Only', 403);
  }
  if (
    role === 'STAFF' &&
    (category === 'FINANCIAL' || category === 'MANAGEMENT' || accessLevel !== 'ALL_STAFF')
  ) {
    throw buildError(
      'Staff role cannot upload restricted financial or management documents',
      403
    );
  }

  if (await isPostgresConnected()) {
    await getPrisma().document.create({
      data: {
        txnId: payload.txnId ? Number(payload.txnId) : null,
        docType: payload.docType || 'OTHER',
        category,
        accessLevel,
        title: (payload.title || fileMeta.originalName || 'Uploaded Document').trim(),
        referenceNo: payload.referenceNo ? payload.referenceNo.trim() : null,
        amount:
          payload.amount !== undefined && payload.amount !== ''
            ? Number(payload.amount)
            : null,
        currency: payload.currency || null,
        fileName: fileMeta.originalName,
        filePath: fileMeta.filePath,
        storageKey: fileMeta.storageKey || null,
        storageProvider: fileMeta.storageProvider || 'CLOUDINARY',
        resourceType: fileMeta.resourceType || 'auto',
        deliveryType: fileMeta.deliveryType || 'authenticated',
        fileFormat: fileMeta.fileFormat || null,
        mimeType: fileMeta.mimeType,
        fileSizeBytes: Number(fileMeta.fileSizeBytes || 0),
        notes: payload.notes ? payload.notes.trim() : null,
        uploadedById: user?.userId ? Number(user.userId) : null,
        uploadedByName: user?.name || 'BIMS User',
      },
    });
    return getDocumentsBundle(user);
  }

  const nextId =
    memoryStore.documents.reduce((max, d) => Math.max(max, d.docId), 0) + 1;
  memoryStore.documents.unshift({
    docId: nextId,
    txnId: payload.txnId ? Number(payload.txnId) : null,
    docType: payload.docType || 'OTHER',
    category,
    accessLevel,
    title: (payload.title || fileMeta.originalName || 'Uploaded Document').trim(),
    referenceNo: payload.referenceNo ? payload.referenceNo.trim() : null,
    amount:
      payload.amount !== undefined && payload.amount !== ''
        ? Number(payload.amount)
        : null,
    currency: payload.currency || null,
    fileName: fileMeta.originalName,
    filePath: fileMeta.filePath,
    storageKey: fileMeta.storageKey || null,
    storageProvider: fileMeta.storageProvider || 'CLOUDINARY',
    resourceType: fileMeta.resourceType || 'auto',
    deliveryType: fileMeta.deliveryType || 'authenticated',
    fileFormat: fileMeta.fileFormat || null,
    mimeType: fileMeta.mimeType,
    fileSizeBytes: Number(fileMeta.fileSizeBytes || 0),
    notes: payload.notes ? payload.notes.trim() : '',
    generatedDate: new Date().toISOString(),
    uploadedById: user?.userId ? Number(user.userId) : null,
    uploadedByName: user?.name || 'BIMS User',
  });

  return getDocumentsBundle(user);
}

export async function updateDocumentRecord({ user, docId, fileMeta, payload }) {
  const id = Number(docId);
  const role = user?.role || 'STAFF';

  if (payload.accessLevel === 'ADMIN_ONLY' && role !== 'ADMIN') {
    throw buildError('Only Administrators can mark documents as Admin Only', 403);
  }

  if (await isPostgresConnected()) {
    const prisma = getPrisma();
    const row = await prisma.document.findUnique({ where: { docId: id } });
    if (!row) throw buildError('Document not found', 404);
    const existing = mapDocument(row);
    if (existing.accessLevel === 'ADMIN_ONLY' && role !== 'ADMIN') {
      throw buildError('Only Administrators can modify Admin Only documents', 403);
    }

    if (fileMeta) {
      await deleteStoredDocumentAsset(existing);
    }

    await prisma.document.update({
      where: { docId: id },
      data: {
        ...(payload.title ? { title: payload.title.trim() } : {}),
        ...(payload.docType ? { docType: payload.docType } : {}),
        ...(payload.category ? { category: payload.category } : {}),
        ...(payload.accessLevel ? { accessLevel: payload.accessLevel } : {}),
        ...(payload.referenceNo !== undefined
          ? { referenceNo: payload.referenceNo ? payload.referenceNo.trim() : null }
          : {}),
        ...(payload.amount !== undefined
          ? { amount: payload.amount !== '' ? Number(payload.amount) : null }
          : {}),
        ...(payload.currency !== undefined
          ? { currency: payload.currency || null }
          : {}),
        ...(payload.txnId !== undefined
          ? { txnId: payload.txnId ? Number(payload.txnId) : null }
          : {}),
        ...(payload.notes !== undefined
          ? { notes: payload.notes ? payload.notes.trim() : null }
          : {}),
        ...(fileMeta
          ? {
              fileName: fileMeta.originalName,
              filePath: fileMeta.filePath,
              storageKey: fileMeta.storageKey || null,
              storageProvider: fileMeta.storageProvider || 'CLOUDINARY',
              resourceType: fileMeta.resourceType || 'auto',
              deliveryType: fileMeta.deliveryType || 'authenticated',
              fileFormat: fileMeta.fileFormat || null,
              mimeType: fileMeta.mimeType,
              fileSizeBytes: Number(fileMeta.fileSizeBytes || 0),
            }
          : {}),
      },
    });
    return getDocumentsBundle(user);
  }

  const doc = memoryStore.documents.find((d) => d.docId === id);
  if (!doc) throw buildError('Document not found', 404);
  if (doc.accessLevel === 'ADMIN_ONLY' && role !== 'ADMIN') {
    throw buildError('Only Administrators can modify Admin Only documents', 403);
  }

  if (fileMeta) {
    await deleteStoredDocumentAsset(doc);
    doc.fileName = fileMeta.originalName;
    doc.filePath = fileMeta.filePath;
    doc.storageKey = fileMeta.storageKey || null;
    doc.storageProvider = fileMeta.storageProvider || 'CLOUDINARY';
    doc.resourceType = fileMeta.resourceType || 'auto';
    doc.deliveryType = fileMeta.deliveryType || 'authenticated';
    doc.fileFormat = fileMeta.fileFormat || null;
    doc.mimeType = fileMeta.mimeType;
    doc.fileSizeBytes = Number(fileMeta.fileSizeBytes || 0);
  }

  if (payload.title) doc.title = payload.title.trim();
  if (payload.docType) doc.docType = payload.docType;
  if (payload.category) doc.category = payload.category;
  if (payload.accessLevel) doc.accessLevel = payload.accessLevel;
  if (payload.referenceNo !== undefined) {
    doc.referenceNo = payload.referenceNo ? payload.referenceNo.trim() : null;
  }
  if (payload.amount !== undefined) {
    doc.amount = payload.amount !== '' ? Number(payload.amount) : null;
  }
  if (payload.currency !== undefined) doc.currency = payload.currency || null;
  if (payload.txnId !== undefined) doc.txnId = payload.txnId ? Number(payload.txnId) : null;
  if (payload.notes !== undefined) doc.notes = payload.notes ? payload.notes.trim() : '';

  return getDocumentsBundle(user);
}

export async function getAuthorizedDocumentAccess(user, docId, { download = false } = {}) {
  const id = Number(docId);
  const permissions = await loadPermissionsList();
  let doc = null;

  if (await isPostgresConnected()) {
    const row = await getPrisma().document.findUnique({
      where: { docId: id },
      include: { uploadedBy: true },
    });
    doc = row ? mapDocument(row) : null;
  } else {
    doc = memoryStore.documents.find((d) => d.docId === id) || null;
  }

  if (!doc) throw buildError('Document not found', 404);
  if (!canUserAccessDocument(user, doc, permissions)) {
    throw buildError('Insufficient permissions to view this document', 403);
  }

  const accessUrl = await resolveDocumentAccessUrl(doc, {
    expiresInSeconds: 300,
    download,
  });

  return {
    document: sanitizeDocumentSummary(doc),
    accessUrl,
    expiresInSeconds: 300,
  };
}

export async function deleteDocumentRecord(user, docId) {
  const id = Number(docId);
  let target = null;

  if (await isPostgresConnected()) {
    const prisma = getPrisma();
    const row = await prisma.document.findUnique({ where: { docId: id } });
    if (!row) throw buildError('Document not found', 404);
    target = mapDocument(row);
    if (target.accessLevel === 'ADMIN_ONLY' && user?.role !== 'ADMIN') {
      throw buildError('Only Administrators can delete Admin Only documents', 403);
    }
    await deleteStoredDocumentAsset(target);
    await prisma.document.delete({ where: { docId: id } });
    return getDocumentsBundle(user);
  }

  const idx = memoryStore.documents.findIndex((d) => d.docId === id);
  if (idx === -1) throw buildError('Document not found', 404);
  target = memoryStore.documents[idx];
  if (target.accessLevel === 'ADMIN_ONLY' && user?.role !== 'ADMIN') {
    throw buildError('Only Administrators can delete Admin Only documents', 403);
  }
  await deleteStoredDocumentAsset(target);
  memoryStore.documents.splice(idx, 1);
  return getDocumentsBundle(user);
}

export async function getReportsAndDashboardSummary(user = null) {
  const [dbState, inv, permissions] = await Promise.all([
    getDatabaseStatus(),
    getInventoryBundle(),
    loadPermissionsList(),
  ]);

  const role = user?.role || 'ADMIN';
  const rolePerm = permissions.find((p) => p.role === role);
  const canViewFinance =
    !user ||
    role === 'ADMIN' ||
    Boolean(rolePerm?.financeEnabled && rolePerm?.finance !== 'Restricted');

  let transactions;
  let suppliers;
  let purchaseOrders;
  let customers;
  let salesOrders;

  if (dbState.connected && dbState.schemaReady) {
    const prisma = getPrisma();
    const [dbTxns, dbSups, dbPos, dbCusts, dbSos] = await Promise.all([
      prisma.transaction.findMany({ include: { customer: true, supplier: true } }),
      prisma.supplier.findMany({ orderBy: { supplierId: 'asc' } }),
      prisma.purchaseOrder.findMany({ include: { supplier: true } }),
      prisma.customer.findMany({ orderBy: { customerId: 'asc' } }),
      prisma.salesOrder.findMany({ include: { customer: true } }),
    ]);
    transactions = dbTxns.map(mapTransaction);
    suppliers = dbSups.map(mapSupplier);
    purchaseOrders = dbPos.map(mapPurchaseOrder);
    customers = dbCusts.map(mapCustomer);
    salesOrders = dbSos.map(mapSalesOrder);
  } else {
    transactions = memoryStore.transactions;
    suppliers = memoryStore.suppliers;
    purchaseOrders = memoryStore.purchaseOrders;
    customers = memoryStore.customers;
    salesOrders = memoryStore.salesOrders;
  }

  const ships = computeShipmentsMetrics(transactions);
  const sups = computeSuppliersMetrics(suppliers, purchaseOrders);
  const custs = computeCustomersMetrics(customers, salesOrders);
  const exportByCountry = computeExportByCountry(transactions, customers);

  return {
    databaseConnected: dbState.connected && dbState.schemaReady,
    databaseMode: dbState.connected
      ? dbState.schemaReady
        ? 'Connected (Supabase PostgreSQL)'
        : 'Connected (Schema Pending Push)'
      : 'Active (BIMS Sync Engine)',
    cloudinaryConfigured: isCloudinaryConfigured(),
    canViewFinance,
    kpis: {
      revenue: 485000,
      revenueLkr: 68500000,
      expenses: 210000,
      expensesLkr: 34200000,
      fifoValuation: inv.fifoValuation,
      fifoValuationLkr: inv.fifoValuationLkr,
      turnoverRatio: inv.optimalScore,
      fulfillmentScore: ships.fulfillmentScore,
      supplierRating: sups.performanceRating,
      creditUtilization: custs.creditUtilization,
      activeShipments: transactions.length,
    },
    stockAlerts: inv.stockAlerts,
    stockMatrix: inv.stockMatrix,
    statusBreakdown: ships.statusBreakdown,
    marginTrend: [
      { month: 'Jun', revenue: 62, margin: 34 },
      { month: 'Jul', revenue: 70, margin: 41 },
      { month: 'Aug', revenue: 66, margin: 38 },
      { month: 'Sep', revenue: 84, margin: 52 },
      { month: 'Oct', revenue: 79, margin: 49 },
      { month: 'Nov', revenue: 96, margin: 64 },
    ],
    exportByCountry,
    products: inv.products,
    transactions,
    suppliers,
    customers,
  };
}
