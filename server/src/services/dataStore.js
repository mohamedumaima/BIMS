import bcrypt from 'bcryptjs';
import { checkDatabaseHealth, getPrisma } from '../config/db.js';
import { env } from '../config/env.js';

const DEFAULT_HASH = bcrypt.hashSync('Password@123', 10);
const USD_TO_LKR_RATE = 300;

/**
 * Generates an inline SVG data-URI product image so every Sri Lankan spice
 * displays a crisp botanical thumbnail offline and online without external link breaks.
 */
function makeSpiceSvg({ bg1, bg2, accent, title, code }) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${bg1}"/>
        <stop offset="100%" stop-color="${bg2}"/>
      </linearGradient>
    </defs>
    <rect width="160" height="160" rx="28" fill="url(#g)"/>
    <circle cx="122" cy="36" r="26" fill="${accent}" fill-opacity="0.22"/>
    <circle cx="38" cy="122" r="32" fill="#ffffff" fill-opacity="0.08"/>
    <path d="M52 108 C52 68, 92 46, 118 46 C118 76, 96 108, 52 108 Z" fill="${accent}" fill-opacity="0.88"/>
    <path d="M54 106 L108 54" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-opacity="0.75"/>
    <text x="18" y="34" fill="#ffffff" font-family="sans-serif" font-size="13" font-weight="700" opacity="0.9">${code}</text>
    <text x="18" y="140" fill="#ffffff" font-family="sans-serif" font-size="14" font-weight="700">${title}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const SPICE_IMAGES = {
  cinnamon: makeSpiceSvg({
    bg1: '#78350f',
    bg2: '#b45309',
    accent: '#fbbf24',
    title: 'Alba Cinnamon',
    code: 'CIN-01',
  }),
  pepper: makeSpiceSvg({
    bg1: '#18181b',
    bg2: '#3f3f46',
    accent: '#22c55e',
    title: 'Black Pepper',
    code: 'PEP-04',
  }),
  cardamom: makeSpiceSvg({
    bg1: '#064e3b',
    bg2: '#059669',
    accent: '#6ee7b7',
    title: 'Green Cardamom',
    code: 'CRD-02',
  }),
  cloves: makeSpiceSvg({
    bg1: '#4c1d95',
    bg2: '#7c3aed',
    accent: '#f97316',
    title: 'Ceylon Cloves',
    code: 'CLV-03',
  }),
  nutmeg: makeSpiceSvg({
    bg1: '#7c2d12',
    bg2: '#c2410c',
    accent: '#fdba74',
    title: 'Whole Nutmeg',
    code: 'NUT-05',
  }),
  turmeric: makeSpiceSvg({
    bg1: '#854d0e',
    bg2: '#eab308',
    accent: '#fef08a',
    title: 'Ceylon Turmeric',
    code: 'TUR-06',
  }),
  vanilla: makeSpiceSvg({
    bg1: '#312e81',
    bg2: '#4f46e5',
    accent: '#c4b5fd',
    title: 'Ceylon Vanilla',
    code: 'VAN-07',
  }),
};

export const memoryStore = {
  users: [
    {
      userId: 1,
      name: 'M. L. Umaima',
      email: 'admin@ceylonspices.com',
      role: 'ADMIN',
      passwordHash: DEFAULT_HASH,
      isActive: true,
      sessions: 3,
      authorityLevel: 3,
      createdAt: '2026-01-10T08:00:00.000Z',
    },
    {
      userId: 2,
      name: 'Sarah Smith',
      email: 'manager@ceylonspices.com',
      role: 'MANAGER',
      passwordHash: DEFAULT_HASH,
      isActive: true,
      sessions: 2,
      authorityLevel: 3,
      createdAt: '2026-01-14T09:30:00.000Z',
    },
    {
      userId: 3,
      name: 'John Doe',
      email: 'staff@ceylonspices.com',
      role: 'STAFF',
      passwordHash: DEFAULT_HASH,
      isActive: true,
      sessions: 1,
      authorityLevel: 2,
      createdAt: '2026-02-01T10:15:00.000Z',
    },
  ],
  permissions: [
    {
      role: 'ADMIN',
      label: 'Admin',
      inventory: 'Full Access',
      tradeDocs: 'Edit & View',
      finance: 'Full Access',
      inventoryEnabled: true,
      tradeDocsEnabled: true,
      financeEnabled: true,
    },
    {
      role: 'MANAGER',
      label: 'Manager',
      inventory: 'Full Access',
      tradeDocs: 'Edit & View',
      finance: 'Read Only',
      inventoryEnabled: true,
      tradeDocsEnabled: true,
      financeEnabled: true,
    },
    {
      role: 'STAFF',
      label: 'Staff',
      inventory: 'Full Access',
      tradeDocs: 'Read Only',
      finance: 'Restricted',
      inventoryEnabled: true,
      tradeDocsEnabled: true,
      financeEnabled: false,
    },
  ],
  securityLogs: [
    {
      id: 1,
      text: 'M. L. Umaima updated permissions',
      time: '10:45 AM',
      active: true,
    },
    {
      id: 2,
      text: 'New Login Staff John',
      time: '09:12 AM',
      active: false,
    },
    {
      id: 3,
      text: 'Session key rotated',
      time: '08:00 AM',
      active: false,
    },
  ],
  products: [
    {
      productId: 1,
      sku: 'SKU-CIN-01',
      name: 'Ceylon Alba Cinnamon',
      category: 'Cinnamon',
      hsCode: '0906.11',
      originRegion: 'Galle & Matara',
      description: 'Export-grade Alba Ceylon cinnamon quills (HS 0906.11)',
      imageUrl: SPICE_IMAGES.cinnamon,
      unitPrice: 48.0,
      unitPriceLkr: 14400,
      costPrice: 32.0,
      costPriceLkr: 9600,
      stockQty: 850,
      reorderLevel: 200,
      stockPercent: 100,
      badge: 'High Demand',
      badgeTone: 'violet',
      dots: 2,
      valuationMethod: 'FIFO',
    },
    {
      productId: 2,
      sku: 'SKU-PEP-04',
      name: 'Organic Black Pepper',
      category: 'Pepper',
      hsCode: '0904.11',
      originRegion: 'Matale & Kandy',
      description: 'Sun-dried Sri Lankan organic black peppercorns (550 GL)',
      imageUrl: SPICE_IMAGES.pepper,
      unitPrice: 28.0,
      unitPriceLkr: 8400,
      costPrice: 18.0,
      costPriceLkr: 5400,
      stockQty: 120,
      reorderLevel: 250,
      stockPercent: 12,
      badge: 'Low Stock',
      badgeTone: 'amber',
      dots: 3,
      valuationMethod: 'FIFO',
    },
    {
      productId: 3,
      sku: 'SKU-CRD-02',
      name: 'Green Cardamom',
      category: 'Cardamom',
      hsCode: '0908.31',
      originRegion: 'Knuckles Range, Kandy',
      description: 'Hand-picked aromatic green cardamom pods (7mm+ bold)',
      imageUrl: SPICE_IMAGES.cardamom,
      unitPrice: 64.0,
      unitPriceLkr: 19200,
      costPrice: 45.0,
      costPriceLkr: 13500,
      stockQty: 240,
      reorderLevel: 300,
      stockPercent: 25,
      badge: 'Moderate',
      badgeTone: 'amber',
      dots: 2,
      valuationMethod: 'WEIGHTED_AVERAGE',
    },
    {
      productId: 4,
      sku: 'SKU-CLV-03',
      name: 'Hand-Picked Ceylon Cloves',
      category: 'Cloves',
      hsCode: '0907.10',
      originRegion: 'Kandy Highlands',
      description: 'High volatile-oil whole dried flower buds',
      imageUrl: SPICE_IMAGES.cloves,
      unitPrice: 36.0,
      unitPriceLkr: 10800,
      costPrice: 24.0,
      costPriceLkr: 7200,
      stockQty: 410,
      reorderLevel: 150,
      stockPercent: 84,
      badge: 'High Demand',
      badgeTone: 'violet',
      dots: 3,
      valuationMethod: 'FIFO',
    },
    {
      productId: 5,
      sku: 'SKU-NUT-05',
      name: 'Matale Whole Nutmeg & Mace',
      category: 'Nutmeg',
      hsCode: '0908.11',
      originRegion: 'Matale Valley',
      description: 'Sun-cured whole nutmeg kernels with ruby mace blades',
      imageUrl: SPICE_IMAGES.nutmeg,
      unitPrice: 32.0,
      unitPriceLkr: 9600,
      costPrice: 21.0,
      costPriceLkr: 6300,
      stockQty: 310,
      reorderLevel: 140,
      stockPercent: 76,
      badge: 'In Stock',
      badgeTone: 'emerald',
      dots: 2,
      valuationMethod: 'FIFO',
    },
    {
      productId: 6,
      sku: 'SKU-TUR-06',
      name: 'Organic Ceylon Turmeric',
      category: 'Turmeric',
      hsCode: '0910.30',
      originRegion: 'Kurunegala & Ampara',
      description: 'High-curcumin (5.5%+) cured golden turmeric fingers',
      imageUrl: SPICE_IMAGES.turmeric,
      unitPrice: 18.0,
      unitPriceLkr: 5400,
      costPrice: 11.5,
      costPriceLkr: 3450,
      stockQty: 95,
      reorderLevel: 180,
      stockPercent: 16,
      badge: 'Low Stock',
      badgeTone: 'amber',
      dots: 3,
      valuationMethod: 'WEIGHTED_AVERAGE',
    },
    {
      productId: 7,
      sku: 'SKU-VAN-07',
      name: 'Gourmet Ceylon Vanilla Pods',
      category: 'Vanilla',
      hsCode: '0905.10',
      originRegion: 'Gampola & Kandy',
      description: 'Bourbon-type cured black vanilla beans (16cm+ supple)',
      imageUrl: SPICE_IMAGES.vanilla,
      unitPrice: 185.0,
      unitPriceLkr: 55500,
      costPrice: 130.0,
      costPriceLkr: 39000,
      stockQty: 140,
      reorderLevel: 60,
      stockPercent: 92,
      badge: 'High Demand',
      badgeTone: 'violet',
      dots: 4,
      valuationMethod: 'FIFO',
    },
  ],
  inventoryLogs: [
    {
      logId: 1,
      productId: 1,
      productName: 'Ceylon Cinnamon',
      movementType: 'STOCK_IN',
      quantity: 500,
      unitCost: 32.0,
      unitCostLkr: 9600,
      referenceNote: 'Batch #CIN-2604 received from Kandy Highland',
      logDate: 'Recent time',
    },
    {
      logId: 2,
      productId: 2,
      productName: 'Black Pepper',
      movementType: 'STOCK_OUT',
      quantity: 120,
      unitCost: 18.0,
      unitCostLkr: 5400,
      referenceNote: 'Export dispatch EXP-2026-0002',
      logDate: 'Recent time',
    },
    {
      logId: 3,
      productId: 3,
      productName: 'Green Cardamom',
      movementType: 'STOCK_IN',
      quantity: 300,
      unitCost: 45.0,
      unitCostLkr: 13500,
      referenceNote: 'Matale Organic harvest lot',
      logDate: 'Recent time',
    },
    {
      logId: 4,
      productId: 1,
      productName: 'Alba Cinnamon',
      movementType: 'STOCK_OUT',
      quantity: 45,
      unitCost: 32.0,
      unitCostLkr: 9600,
      referenceNote: 'Sample air-freight consignment',
      logDate: 'Recent time',
    },
  ],
  // Local Sri Lankan Suppliers — managed in LKR (Rs.)
  suppliers: [
    {
      supplierId: 1,
      name: 'Kandy Highland Growers',
      country: 'Sri Lanka (Kandy)',
      currency: 'LKR',
      contactEmail: 'orders@kandyhighland.lk',
      phone: '+94 81 223 4410',
      paymentTerms: 'Net 30',
      balance: 5550000,
      onTimeRate: 92,
      accuracyRate: 96,
      reliabilityDots: 4,
      featured: true,
    },
    {
      supplierId: 2,
      name: 'Matale Organic Estates',
      country: 'Sri Lanka (Matale)',
      currency: 'LKR',
      contactEmail: 'supply@mataleorganic.lk',
      phone: '+94 66 222 8890',
      paymentTerms: 'Net 45',
      balance: 8520000,
      onTimeRate: 94,
      accuracyRate: 98,
      reliabilityDots: 4,
      featured: false,
    },
    {
      supplierId: 3,
      name: 'Galle Cinnamon Co-op',
      country: 'Sri Lanka (Galle)',
      currency: 'LKR',
      contactEmail: 'export@gallecoop.lk',
      phone: '+94 91 224 1102',
      paymentTerms: 'Net 30',
      balance: 3630000,
      onTimeRate: 89,
      accuracyRate: 94,
      reliabilityDots: 3,
      featured: false,
    },
    {
      supplierId: 4,
      name: 'Kurunegala Spice Farmers Union',
      country: 'Sri Lanka (Kurunegala)',
      currency: 'LKR',
      contactEmail: 'union@kurunegalaspice.lk',
      phone: '+94 37 222 4190',
      paymentTerms: 'Net 15',
      balance: 2150000,
      onTimeRate: 91,
      accuracyRate: 95,
      reliabilityDots: 4,
      featured: false,
    },
  ],
  purchaseOrders: [
    {
      poId: 1,
      poNumber: 'PO-2026-08',
      supplierId: 2,
      supplierName: 'Matale Organic Estates',
      productName: 'Green Cardamom',
      orderedQty: 300,
      currency: 'LKR',
      totalAmount: 4050000,
      status: 'PENDING_APPROVAL',
      expectedDate: '2026-11-28',
    },
    {
      poId: 2,
      poNumber: 'PO-2026-09',
      supplierId: 3,
      supplierName: 'Galle Cinnamon Co-op',
      productName: 'Ceylon Alba Cinnamon',
      orderedQty: 400,
      currency: 'LKR',
      totalAmount: 3840000,
      status: 'PENDING_APPROVAL',
      expectedDate: '2026-12-04',
    },
    {
      poId: 3,
      poNumber: 'PO-2026-07',
      supplierId: 1,
      supplierName: 'Kandy Highland Growers',
      productName: 'Organic Black Pepper',
      orderedQty: 500,
      currency: 'LKR',
      totalAmount: 2700000,
      status: 'APPROVED',
      expectedDate: '2026-11-20',
    },
  ],
  // Separated into INTERNATIONAL Buyers (USD $) and LOCAL Sri Lankan Buyers (LKR Rs.)
  customers: [
    {
      customerId: 1,
      name: 'European Spice Traders',
      country: 'Germany',
      marketType: 'INTERNATIONAL',
      currency: 'USD',
      contactEmail: 'import@eurospices.de',
      phone: '+49 40 5550 1122',
      creditLimit: 120000,
      balance: 55200,
      utilization: 46,
      tier: 'Enterprise',
      featured: true,
    },
    {
      customerId: 2,
      name: 'US Organic Foods',
      country: 'USA',
      marketType: 'INTERNATIONAL',
      currency: 'USD',
      contactEmail: 'purchasing@usorganic.com',
      phone: '+1 212 555 0194',
      creditLimit: 95000,
      balance: 42750,
      utilization: 45,
      tier: 'Enterprise',
      featured: false,
    },
    {
      customerId: 3,
      name: 'Dubai Gourmet Imports',
      country: 'UAE',
      marketType: 'INTERNATIONAL',
      currency: 'USD',
      contactEmail: 'trade@dubaigourmet.ae',
      phone: '+971 4 312 8800',
      creditLimit: 80000,
      balance: 19600,
      utilization: 25,
      tier: 'Wholesale',
      featured: false,
    },
    {
      customerId: 4,
      name: 'Colombo Cinnamon Grand Hospitality',
      country: 'Sri Lanka (Colombo)',
      marketType: 'LOCAL',
      currency: 'LKR',
      contactEmail: 'procurement@cinnamongrand.lk',
      phone: '+94 11 243 7437',
      creditLimit: 8500000,
      balance: 2890000,
      utilization: 34,
      tier: 'Local Premier',
      featured: true,
    },
    {
      customerId: 5,
      name: 'Lanka Ayurvedic Pharmaceuticals',
      country: 'Sri Lanka (Kandy)',
      marketType: 'LOCAL',
      currency: 'LKR',
      contactEmail: 'supply@lankaayurveda.lk',
      phone: '+94 81 222 5511',
      creditLimit: 6000000,
      balance: 3120000,
      utilization: 52,
      tier: 'Local Enterprise',
      featured: false,
    },
    {
      customerId: 6,
      name: 'Galle Fort Heritage Spice Retail',
      country: 'Sri Lanka (Galle)',
      marketType: 'LOCAL',
      currency: 'LKR',
      contactEmail: 'orders@gallefortspices.lk',
      phone: '+94 91 223 4890',
      creditLimit: 4500000,
      balance: 990000,
      utilization: 22,
      tier: 'Local Retail',
      featured: false,
    },
  ],
  salesOrders: [
    {
      soId: 1,
      soNumber: 'SO-2604',
      invoiceCode: 'INV-2604',
      customerId: 1,
      customerName: 'European Spice Traders',
      marketType: 'INTERNATIONAL',
      currency: 'USD',
      productName: 'Ceylon Alba Cinnamon',
      quantity: 350,
      totalAmount: 42000,
      status: 'INVOICED',
      paymentStatus: 'PARTIAL',
    },
    {
      soId: 2,
      soNumber: 'SO-2605',
      invoiceCode: 'INV-2605',
      customerId: 2,
      customerName: 'US Organic Foods',
      marketType: 'INTERNATIONAL',
      currency: 'USD',
      productName: 'Organic Black Pepper',
      quantity: 250,
      totalAmount: 17000,
      status: 'FULFILLED',
      paymentStatus: 'PAID',
    },
    {
      soId: 3,
      soNumber: 'SO-LKR-101',
      invoiceCode: 'INV-LKR-101',
      customerId: 4,
      customerName: 'Colombo Cinnamon Grand Hospitality',
      marketType: 'LOCAL',
      currency: 'LKR',
      productName: 'Green Cardamom & Cloves',
      quantity: 180,
      totalAmount: 2650000,
      status: 'INVOICED',
      paymentStatus: 'PARTIAL',
    },
    {
      soId: 4,
      soNumber: 'SO-LKR-102',
      invoiceCode: 'INV-LKR-102',
      customerId: 5,
      customerName: 'Lanka Ayurvedic Pharmaceuticals',
      marketType: 'LOCAL',
      currency: 'LKR',
      productName: 'Organic Ceylon Turmeric',
      quantity: 400,
      totalAmount: 2160000,
      status: 'CONFIRMED',
      paymentStatus: 'UNPAID',
    },
  ],
  communications: [
    {
      commId: 1,
      customerId: 1,
      customerName: 'European Spice Traders',
      sender: 'Customer Query',
      prompt: 'Can you show me the sales invoice for European Spice Traders?',
      reply: 'Here is the invoice PDF and trade pack for European Spice Traders:',
      attachments: ['INV-2604', 'PL-2604', 'BL-2604'],
      loggedAt: 'Today, 11:20 AM',
    },
  ],
  transactions: [
    {
      txnId: 1,
      txnNumber: 'EXP-2026-0001',
      title: 'Ceylon Cinnamon to USA',
      type: 'EXPORT',
      currency: 'USD',
      status: 'IN_TRANSIT',
      badge: 'Active Inspection',
      hsCode: '0906.11',
      incoterms: 'FOB Colombo',
      dutyRate: 0,
      dutyAmount: 0,
      originCountry: 'Sri Lanka',
      destinationCountry: 'USA',
      carrier: 'Maersk Line',
      trackingNumber: 'MAEU9081726',
      totalValue: 48500,
      partnerName: 'US Organic Foods',
      txnDate: '2026-11-12',
    },
    {
      txnId: 2,
      txnNumber: 'EXP-2026-0002',
      title: 'Organic Black Pepper to Germany',
      type: 'EXPORT',
      currency: 'USD',
      status: 'AT_CUSTOMS',
      badge: 'Customs Clearance',
      hsCode: '0904.11',
      incoterms: 'CIF Hamburg',
      dutyRate: 2.5,
      dutyAmount: 850,
      originCountry: 'Sri Lanka',
      destinationCountry: 'Germany',
      carrier: 'Hapag-Lloyd',
      trackingNumber: 'HLCU4419082',
      totalValue: 34000,
      partnerName: 'European Spice Traders',
      txnDate: '2026-11-14',
    },
    {
      txnId: 3,
      txnNumber: 'IMP-2026-0003',
      title: 'Premium Cardamom Harvest Intake',
      type: 'IMPORT',
      currency: 'LKR',
      status: 'PENDING',
      badge: 'Local Procurement (LKR)',
      hsCode: '0908.31',
      incoterms: 'EXW Kandy',
      dutyRate: 0,
      dutyAmount: 0,
      originCountry: 'Sri Lanka (Knuckles)',
      destinationCountry: 'Colombo Bonded Hub',
      carrier: 'Lanka Inland Freight',
      trackingNumber: 'LIF-882910',
      totalValue: 7920000,
      partnerName: 'Matale Organic Estates',
      txnDate: '2026-11-16',
    },
  ],
};

export async function isPostgresConnected() {
  if (!env.databaseUrl || env.databaseUrl.includes('YOUR_LOCAL_PASSWORD')) {
    return false;
  }
  try {
    await checkDatabaseHealth();
    return true;
  } catch {
    return false;
  }
}

export async function findUserByEmail(email) {
  const normalized = email.trim().toLowerCase();
  if (await isPostgresConnected()) {
    const prisma = getPrisma();
    const dbUser = await prisma.user.findUnique({ where: { email: normalized } });
    if (dbUser) return dbUser;
  }
  return memoryStore.users.find((u) => u.email.toLowerCase() === normalized) || null;
}

export async function findUserById(userId) {
  const id = Number(userId);
  if (await isPostgresConnected()) {
    const prisma = getPrisma();
    const dbUser = await prisma.user.findUnique({ where: { userId: id } });
    if (dbUser) return dbUser;
  }
  return memoryStore.users.find((u) => u.userId === id) || null;
}

export async function listUsersAndSecurity() {
  const users = memoryStore.users.map(({ passwordHash: _pw, ...u }) => u);
  const ships = computeShipmentsMetrics(memoryStore.transactions);
  const sups = computeSuppliersMetrics(memoryStore.suppliers, memoryStore.purchaseOrders);
  const custs = computeCustomersMetrics(memoryStore.customers, memoryStore.salesOrders);

  return {
    users,
    permissions: memoryStore.permissions,
    securityLogs: memoryStore.securityLogs,
    securityScore: 94,
    tokenLifeHours: 8,
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

export async function createSystemUser({ name, email, password, role }) {
  const normalizedEmail = email.trim().toLowerCase();
  if (memoryStore.users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
    const err = new Error('A user with this email already exists');
    err.statusCode = 409;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password || 'Password@123', 10);
  const nextId =
    memoryStore.users.reduce((max, u) => Math.max(max, u.userId), 0) + 1;

  const newUser = {
    userId: nextId,
    name: name.trim(),
    email: normalizedEmail,
    role: role || 'STAFF',
    passwordHash,
    isActive: true,
    sessions: 1,
    authorityLevel: role === 'STAFF' ? 2 : 3,
    createdAt: new Date().toISOString(),
  };
  memoryStore.users.push(newUser);
  memoryStore.securityLogs.unshift({
    id: Date.now(),
    text: `New ${newUser.role} member ${newUser.name} added`,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    active: true,
  });

  const { passwordHash: _pw, ...publicUser } = newUser;
  return publicUser;
}

export async function updateSystemUser(userId, payload) {
  const target = memoryStore.users.find((u) => u.userId === Number(userId));
  if (!target) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  if (payload.name) target.name = payload.name.trim();
  if (payload.email) target.email = payload.email.trim().toLowerCase();
  if (payload.role) target.role = payload.role;
  if (typeof payload.isActive === 'boolean') target.isActive = payload.isActive;
  if (payload.password && payload.password.trim().length >= 6) {
    target.passwordHash = await bcrypt.hash(payload.password.trim(), 10);
  }

  memoryStore.securityLogs.unshift({
    id: Date.now(),
    text: `Updated user profile ${target.name} (${target.role})`,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    active: true,
  });

  return listUsersAndSecurity();
}

export async function deleteSystemUser(userId, requestingUserId) {
  const id = Number(userId);
  if (id === Number(requestingUserId)) {
    const err = new Error('You cannot delete your own active administrator account');
    err.statusCode = 400;
    throw err;
  }
  const idx = memoryStore.users.findIndex((u) => u.userId === id);
  if (idx === -1) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }
  const [removed] = memoryStore.users.splice(idx, 1);
  memoryStore.securityLogs.unshift({
    id: Date.now(),
    text: `Removed user ${removed.name}`,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    active: true,
  });
  return listUsersAndSecurity();
}

export function toggleRolePermission({ role, field, actorName }) {
  const target = memoryStore.permissions.find((p) => p.role === role);
  if (target && field in target) {
    target[field] = !target[field];
    memoryStore.securityLogs.unshift({
      id: Date.now(),
      text: `${actorName || 'M. L. Umaima'} updated ${role} permissions`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      active: true,
    });
  }
  return {
    permissions: memoryStore.permissions,
    securityLogs: memoryStore.securityLogs.slice(0, 6),
  };
}

function syncProductMetrics(product) {
  const qty = Number(product.stockQty || 0);
  const reorder = Math.max(Number(product.reorderLevel || 150), 1);
  const targetCap = reorder * 3;
  const pct = Math.min(100, Math.max(0, Math.round((qty / targetCap) * 100)));
  const isLow = qty <= reorder;

  product.stockPercent = pct;
  product.badge = isLow ? 'Low Stock' : pct >= 80 ? 'High Demand' : 'In Stock';
  product.badgeTone = isLow ? 'amber' : pct >= 80 ? 'violet' : 'emerald';
  return product;
}

function computeInventoryMetrics(products) {
  products.forEach(syncProductMetrics);

  const healthyCount = products.filter(
    (p) => Number(p.stockQty) > Number(p.reorderLevel || 0)
  ).length;
  const optimalScore = Math.round((healthyCount / Math.max(products.length, 1)) * 100);
  const lowStockCount = products.length - healthyCount;

  const lowItems = products.filter((p) => Number(p.stockQty) <= Number(p.reorderLevel));
  const healthyItems = products.filter((p) => Number(p.stockQty) > Number(p.reorderLevel));
  const alertOrder = [...healthyItems.slice(0, 2), ...lowItems.slice(0, 2)];
  while (alertOrder.length < 4 && alertOrder.length < products.length) {
    const next = products.find((p) => !alertOrder.includes(p));
    if (!next) break;
    alertOrder.push(next);
  }

  const stockAlerts = alertOrder.map((p) => {
    const isLow = Number(p.stockQty) <= Number(p.reorderLevel);
    return {
      productId: p.productId,
      label: p.name,
      percent: p.stockPercent,
      rightLabel: isLow ? `Low Stock ${p.stockPercent}%` : `${p.stockPercent}%`,
      tone: isLow ? 'amber' : p.stockPercent >= 90 ? 'emerald' : 'emerald-striped',
    };
  });

  const p0 = products[0];
  const p1 = products[1];
  const stockMatrix = {
    leftLabel: p0 ? p0.category || p0.name : 'Cinnamon',
    leftPercent: p0 ? p0.stockPercent : 0,
    rightLabel: p1 ? p1.category || p1.name : 'Black Pepper',
    rightPercent: p1 ? p1.stockPercent : 0,
  };

  return {
    optimalScore,
    lowStockCount,
    stockAlerts,
    stockMatrix,
  };
}

function computeShipmentsMetrics(transactions) {
  const stageRank = {
    PENDING: 1,
    IN_TRANSIT: 2,
    AT_CUSTOMS: 3,
    DELIVERED: 4,
  };
  const stageScore = {
    PENDING: 25,
    IN_TRANSIT: 60,
    AT_CUSTOMS: 85,
    DELIVERED: 100,
  };

  const active = transactions.filter((t) => t.status !== 'CANCELLED');
  const total = active.length;
  const pct = (minRank) =>
    total === 0
      ? 0
      : Math.round(
          (active.filter((t) => (stageRank[t.status] || 1) >= minRank).length / total) * 100
        );
  const countAt = (minRank) =>
    active.filter((t) => (stageRank[t.status] || 1) >= minRank).length;

  const p1 = pct(1);
  const p2 = pct(2);
  const p3 = pct(3);
  const p4 = pct(4);

  const fulfillmentScore =
    total === 0
      ? 0
      : Math.round(
          active.reduce((sum, t) => sum + (stageScore[t.status] || 25), 0) / total
        );

  return {
    fulfillmentScore,
    statusBreakdown: [
      {
        status: 'PENDING',
        label: 'Pending',
        percent: p1,
        rightLabel: `${p1}% (${countAt(1)}/${total})`,
        tone: 'emerald',
        showCheck: p1 === 100,
      },
      {
        status: 'IN_TRANSIT',
        label: 'In Transit',
        percent: p2,
        rightLabel: `${p2}% (${countAt(2)}/${total})`,
        tone: p2 > 0 ? 'emerald-striped' : 'muted',
      },
      {
        status: 'AT_CUSTOMS',
        label: 'At Customs',
        percent: p3,
        rightLabel: `${p3}% (${countAt(3)}/${total})`,
        tone: p3 > 0 ? 'amber-striped' : 'muted',
      },
      {
        status: 'DELIVERED',
        label: 'Delivered',
        percent: p4,
        rightLabel: `${p4}% (${countAt(4)}/${total})`,
        tone: p4 > 0 ? 'emerald' : 'muted',
      },
    ],
  };
}

function computeSuppliersMetrics(suppliers, purchaseOrders) {
  const stageRank = {
    DRAFT: 1,
    PENDING_APPROVAL: 1,
    APPROVED: 2,
    ORDERED: 3,
    RECEIVED: 4,
  };
  const active = purchaseOrders.filter((po) => po.status !== 'CANCELLED');
  const total = active.length;
  const pct = (minRank) =>
    total === 0
      ? 0
      : Math.round(
          (active.filter((po) => (stageRank[po.status] || 1) >= minRank).length / total) * 100
        );
  const countAt = (minRank) =>
    active.filter((po) => (stageRank[po.status] || 1) >= minRank).length;

  const p1 = pct(1);
  const p2 = pct(2);
  const p3 = pct(3);
  const p4 = pct(4);

  const performanceRating =
    suppliers.length === 0
      ? 0
      : Math.round(
          suppliers.reduce((sum, s) => sum + Number(s.onTimeRate || 0), 0) /
            suppliers.length
        );

  const totalBalance = Math.max(
    suppliers.reduce((sum, s) => sum + Number(s.balance || 0), 0),
    1
  );
  const s0 = suppliers[0];
  const s1 = suppliers[1];
  const balanceMatrix = {
    leftLabel: s0 ? s0.name.split(' ').slice(0, 2).join(' ') : 'Kandy Growers',
    leftPercent: s0 ? Math.round((Number(s0.balance || 0) / totalBalance) * 100) : 0,
    rightLabel: s1 ? s1.name.split(' ').slice(0, 2).join(' ') : 'Matale Estates',
    rightPercent: s1 ? Math.round((Number(s1.balance || 0) / totalBalance) * 100) : 0,
  };

  return {
    performanceRating,
    balanceMatrix,
    workflowStages: [
      {
        label: 'PO Drafts',
        percent: p1,
        rightLabel: `${p1}% (${countAt(1)}/${total})`,
        tone: 'emerald',
        showCheck: p1 === 100,
      },
      {
        label: 'Manager Approval',
        percent: p2,
        rightLabel: `${p2}% (${countAt(2)}/${total})`,
        tone: p2 >= 80 ? 'emerald-striped' : 'amber-striped',
      },
      {
        label: 'Payment Processing',
        percent: p3,
        rightLabel: `${p3}% (${countAt(3)}/${total})`,
        tone: p3 > 0 ? 'amber' : 'muted',
      },
      {
        label: 'Shipment Dispatch',
        percent: p4,
        rightLabel: `${p4}% (${countAt(4)}/${total})`,
        tone: p4 > 0 ? 'emerald' : 'muted',
      },
    ],
  };
}

function computeMarketCustomerMetrics(customersSubset, ordersSubset) {
  const stageRank = {
    QUOTATION: 1,
    CONFIRMED: 2,
    INVOICED: 3,
    FULFILLED: 4,
  };
  const active = ordersSubset.filter((so) => so.status !== 'CANCELLED');
  const total = active.length;
  const pct = (minRank) =>
    total === 0
      ? 0
      : Math.round(
          (active.filter((so) => (stageRank[so.status] || 1) >= minRank).length / total) * 100
        );
  const countAt = (minRank) =>
    active.filter((so) => (stageRank[so.status] || 1) >= minRank).length;

  const p1 = pct(1);
  const p2 = pct(2);
  const p3 = pct(3);
  const p4 = pct(4);

  // Use USD-equivalent normalization when combining USD + LKR in ALL view
  const sumLimit = customersSubset.reduce(
    (sum, c) =>
      sum +
      (c.currency === 'LKR'
        ? Number(c.creditLimit || 0) / USD_TO_LKR_RATE
        : Number(c.creditLimit || 0)),
    0
  );
  const sumBal = customersSubset.reduce(
    (sum, c) =>
      sum +
      (c.currency === 'LKR'
        ? Number(c.balance || 0) / USD_TO_LKR_RATE
        : Number(c.balance || 0)),
    0
  );
  const creditUtilization =
    sumLimit <= 0 ? 0 : Math.min(100, Math.round((sumBal / sumLimit) * 100));

  const c0 = customersSubset[0];
  const c1 = customersSubset[1];
  const paymentsMatrix = {
    leftLabel: c0 ? c0.name.split(' ').slice(0, 2).join(' ') : 'Buyer 1',
    leftPercent: c0 ? Number(c0.utilization || 0) : 0,
    rightLabel: c1 ? c1.name.split(' ').slice(0, 2).join(' ') : 'Buyer 2',
    rightPercent: c1 ? Number(c1.utilization || 0) : 0,
  };

  return {
    creditUtilization,
    paymentsMatrix,
    pipelineStages: [
      {
        label: 'Quotation',
        percent: p1,
        rightLabel: `${p1}% (${countAt(1)}/${total})`,
        tone: p1 > 0 ? 'emerald' : 'muted',
      },
      {
        label: 'Processing',
        percent: p2,
        rightLabel: `${p2}% (${countAt(2)}/${total})`,
        tone: p2 > 0 ? 'amber-striped' : 'muted',
      },
      {
        label: 'Invoiced',
        percent: p3,
        rightLabel: `${p3}% (${countAt(3)}/${total})`,
        tone: p3 > 0 ? 'amber' : 'muted',
      },
      {
        label: 'Fulfilled',
        percent: p4,
        rightLabel: `${p4}% (${countAt(4)}/${total})`,
        tone: p4 > 0 ? 'emerald-striped' : 'muted',
      },
    ],
  };
}

function computeCustomersMetrics(customers, salesOrders) {
  const intlCustomers = customers.filter((c) => c.marketType === 'INTERNATIONAL');
  const localCustomers = customers.filter((c) => c.marketType === 'LOCAL');
  const intlOrders = salesOrders.filter((s) => s.marketType === 'INTERNATIONAL');
  const localOrders = salesOrders.filter((s) => s.marketType === 'LOCAL');

  const allMetrics = computeMarketCustomerMetrics(customers, salesOrders);
  const intlMetrics = computeMarketCustomerMetrics(intlCustomers, intlOrders);
  const localMetrics = computeMarketCustomerMetrics(localCustomers, localOrders);

  return {
    ...allMetrics,
    byMarket: {
      ALL: allMetrics,
      INTERNATIONAL: intlMetrics,
      LOCAL: localMetrics,
    },
  };
}

function computeFifoValuationUsd(products) {
  const total = products.reduce(
    (acc, p) => acc + Number(p.stockQty || 0) * Number(p.unitPrice || 0),
    0
  );
  return total || 142000;
}

function computeFifoValuationLkr(products) {
  const total = products.reduce(
    (acc, p) =>
      acc +
      Number(p.stockQty || 0) *
        Number(p.unitPriceLkr || Number(p.unitPrice || 0) * USD_TO_LKR_RATE),
    0
  );
  return total || 42600000;
}

export async function getInventoryBundle() {
  const products = memoryStore.products;
  const metrics = computeInventoryMetrics(products);

  return {
    products,
    auditTrail: memoryStore.inventoryLogs.slice(0, 10),
    fifoValuation: computeFifoValuationUsd(products),
    fifoValuationLkr: computeFifoValuationLkr(products),
    exchangeRateLkr: USD_TO_LKR_RATE,
    optimalScore: metrics.optimalScore,
    lowStockCount: metrics.lowStockCount,
    stockAlerts: metrics.stockAlerts,
    stockMatrix: metrics.stockMatrix,
  };
}

export async function createProductSku(payload) {
  const stockQty = Number(payload.stockQty || 0);
  const reorderLevel = Number(payload.reorderLevel || 150);
  const unitPrice = Number(payload.unitPrice || 45);
  const unitPriceLkr = Number(
    payload.unitPriceLkr || Math.round(unitPrice * USD_TO_LKR_RATE)
  );
  const costPrice = Number(payload.costPrice || Math.round(unitPrice * 0.68));
  const costPriceLkr = Number(
    payload.costPriceLkr || Math.round(costPrice * USD_TO_LKR_RATE)
  );

  const isLow = stockQty <= reorderLevel;
  const nextId =
    memoryStore.products.reduce((max, p) => Math.max(max, p.productId), 0) + 1;

  const defaultSvg = makeSpiceSvg({
    bg1: '#4c1d95',
    bg2: '#7c3aed',
    accent: '#22c55e',
    title: (payload.name || 'Ceylon Spice').slice(0, 14),
    code: (payload.sku || `SKU-${nextId}`).slice(-6),
  });

  const newProduct = {
    productId: nextId,
    sku: (payload.sku || `SKU-SPC-0${nextId}`).trim().toUpperCase(),
    name: payload.name.trim(),
    category: payload.category || 'Spices',
    hsCode: payload.hsCode || '0910.99',
    originRegion: payload.originRegion || 'Kandy & Matale',
    description: payload.description || 'Authentic Sri Lankan export-grade spice batch',
    imageUrl: payload.imageUrl?.trim() ? payload.imageUrl.trim() : defaultSvg,
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
  const product = memoryStore.products.find(
    (p) => p.productId === Number(productId)
  );
  if (!product) {
    const err = new Error('Product SKU not found');
    err.statusCode = 404;
    throw err;
  }

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

  const isLow = product.stockQty <= product.reorderLevel;
  product.badge = isLow ? 'Low Stock' : 'High Demand';
  product.badgeTone = isLow ? 'amber' : 'violet';
  product.stockPercent = isLow
    ? Math.max(10, Math.round((product.stockQty / Math.max(product.reorderLevel, 1)) * 30))
    : Math.min(100, Math.round((product.stockQty / Math.max(product.reorderLevel * 2, 1)) * 100));

  return getInventoryBundle();
}

export async function deleteProductSku(productId) {
  const idx = memoryStore.products.findIndex(
    (p) => p.productId === Number(productId)
  );
  if (idx === -1) {
    const err = new Error('Product SKU not found');
    err.statusCode = 404;
    throw err;
  }
  memoryStore.products.splice(idx, 1);
  return getInventoryBundle();
}

export async function recordInventoryMovement({ productId, movementType, quantity, referenceNote }) {
  const qty = Number(quantity);
  const product = memoryStore.products.find((p) => p.productId === Number(productId));
  if (!product) {
    const err = new Error('Product not found');
    err.statusCode = 404;
    throw err;
  }

  if (movementType === 'STOCK_OUT' && product.stockQty < qty) {
    const err = new Error(`Insufficient stock for ${product.name} (Available: ${product.stockQty} kg)`);
    err.statusCode = 400;
    throw err;
  }

  product.stockQty =
    movementType === 'STOCK_OUT' ? product.stockQty - qty : product.stockQty + qty;
  const isLow = product.stockQty <= product.reorderLevel;
  product.stockPercent = isLow
    ? Math.max(10, Math.round((product.stockQty / Math.max(product.reorderLevel, 1)) * 30))
    : Math.min(100, Math.round((product.stockQty / Math.max(product.reorderLevel * 2, 1)) * 100));
  product.badge = isLow ? 'Low Stock' : 'High Demand';
  product.badgeTone = isLow ? 'amber' : 'violet';

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
  const metrics = computeShipmentsMetrics(memoryStore.transactions);
  return {
    transactions: memoryStore.transactions,
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

export async function createTradeDeclaration(payload) {
  const dutyRate = Number(payload.dutyRate || 0);
  const totalValue = Number(payload.totalValue || 18500);
  const dutyAmount = Math.round(totalValue * (dutyRate / 100));
  const type = payload.type || 'EXPORT';
  const currency = payload.currency || (type === 'EXPORT' ? 'USD' : 'LKR');
  const prefix = type === 'IMPORT' ? 'IMP' : 'EXP';
  const nextId =
    memoryStore.transactions.reduce((max, t) => Math.max(max, t.txnId), 0) + 1;

  const newTxn = {
    txnId: nextId,
    txnNumber: `${prefix}-2026-000${nextId}`,
    title: payload.title.trim(),
    type,
    currency,
    status: payload.status || 'IN_TRANSIT',
    badge:
      type === 'IMPORT'
        ? `Local Procurement (${currency})`
        : 'Active Inspection',
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
  const txn = memoryStore.transactions.find((t) => t.txnId === Number(txnId));
  if (!txn) {
    const err = new Error('Transaction declaration not found');
    err.statusCode = 404;
    throw err;
  }
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
  const idx = memoryStore.transactions.findIndex(
    (t) => t.txnId === Number(txnId)
  );
  if (idx === -1) {
    const err = new Error('Transaction declaration not found');
    err.statusCode = 404;
    throw err;
  }
  memoryStore.transactions.splice(idx, 1);
  return getShipmentsBundle();
}

export async function advanceShipmentStatus(txnId, status) {
  const txn = memoryStore.transactions.find((t) => t.txnId === Number(txnId));
  if (!txn) {
    const err = new Error('Transaction declaration not found');
    err.statusCode = 404;
    throw err;
  }
  txn.status = status;
  return getShipmentsBundle();
}

export function findTransactionById(txnId) {
  return (
    memoryStore.transactions.find((t) => t.txnId === Number(txnId)) ||
    memoryStore.transactions[0]
  );
}

export async function getSuppliersBundle() {
  const metrics = computeSuppliersMetrics(
    memoryStore.suppliers,
    memoryStore.purchaseOrders
  );
  return {
    suppliers: memoryStore.suppliers,
    purchaseOrders: memoryStore.purchaseOrders,
    performanceRating: metrics.performanceRating,
    balanceMatrix: metrics.balanceMatrix,
    currency: 'LKR',
    workflowStages: metrics.workflowStages,
  };
}

export async function createSupplierRecord(payload) {
  const nextId =
    memoryStore.suppliers.reduce((max, s) => Math.max(max, s.supplierId), 0) + 1;
  const newSupplier = {
    supplierId: nextId,
    name: payload.name.trim(),
    country: payload.country || 'Sri Lanka',
    currency: 'LKR',
    contactEmail: payload.contactEmail || 'supplier@ceylonspices.lk',
    phone: payload.phone || '+94 81 220 0000',
    paymentTerms: payload.paymentTerms || 'Net 30',
    balance: Number(payload.balance || 1800000),
    onTimeRate: Number(payload.onTimeRate || 93),
    accuracyRate: 97,
    reliabilityDots: 4,
    featured: false,
  };
  memoryStore.suppliers.unshift(newSupplier);
  return getSuppliersBundle();
}

export async function updateSupplierRecord(supplierId, payload) {
  const sup = memoryStore.suppliers.find(
    (s) => s.supplierId === Number(supplierId)
  );
  if (!sup) {
    const err = new Error('Supplier not found');
    err.statusCode = 404;
    throw err;
  }
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
  const idx = memoryStore.suppliers.findIndex(
    (s) => s.supplierId === Number(supplierId)
  );
  if (idx === -1) {
    const err = new Error('Supplier not found');
    err.statusCode = 404;
    throw err;
  }
  memoryStore.suppliers.splice(idx, 1);
  return getSuppliersBundle();
}

export async function createPurchaseOrderRecord(payload) {
  const supplier =
    memoryStore.suppliers.find((s) => s.supplierId === Number(payload.supplierId)) ||
    memoryStore.suppliers[0];
  const nextId =
    memoryStore.purchaseOrders.reduce((max, p) => Math.max(max, p.poId), 0) + 1;

  const newPo = {
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
  };
  memoryStore.purchaseOrders.unshift(newPo);
  return getSuppliersBundle();
}

export async function updatePurchaseOrderRecord(poId, payload) {
  const po = memoryStore.purchaseOrders.find((p) => p.poId === Number(poId));
  if (!po) {
    const err = new Error('Purchase order not found');
    err.statusCode = 404;
    throw err;
  }
  if (payload.productName) po.productName = payload.productName;
  if (payload.orderedQty !== undefined) po.orderedQty = Number(payload.orderedQty);
  if (payload.totalAmount !== undefined) po.totalAmount = Number(payload.totalAmount);
  if (payload.status) po.status = payload.status;
  return getSuppliersBundle();
}

export async function deletePurchaseOrderRecord(poId) {
  const idx = memoryStore.purchaseOrders.findIndex((p) => p.poId === Number(poId));
  if (idx === -1) {
    const err = new Error('Purchase order not found');
    err.statusCode = 404;
    throw err;
  }
  memoryStore.purchaseOrders.splice(idx, 1);
  return getSuppliersBundle();
}

export async function updatePurchaseOrderStatus(poId, status) {
  const po = memoryStore.purchaseOrders.find((p) => p.poId === Number(poId));
  if (po) {
    po.status = status;
  }
  return getSuppliersBundle();
}

export async function getCustomersBundle() {
  const internationalBuyers = memoryStore.customers.filter(
    (c) => c.marketType === 'INTERNATIONAL'
  );
  const localBuyers = memoryStore.customers.filter((c) => c.marketType === 'LOCAL');
  const metrics = computeCustomersMetrics(
    memoryStore.customers,
    memoryStore.salesOrders
  );

  return {
    customers: memoryStore.customers,
    internationalBuyers,
    localBuyers,
    salesOrders: memoryStore.salesOrders,
    communications: memoryStore.communications,
    creditUtilization: metrics.creditUtilization,
    paymentsMatrix: metrics.paymentsMatrix,
    pipelineStages: metrics.pipelineStages,
    byMarket: metrics.byMarket,
  };
}

export async function createCustomerRecord(payload) {
  const marketType = payload.marketType === 'LOCAL' ? 'LOCAL' : 'INTERNATIONAL';
  const currency = marketType === 'LOCAL' ? 'LKR' : 'USD';
  const defaultLimit = marketType === 'LOCAL' ? 5000000 : 100000;
  const creditLimit = Number(payload.creditLimit || defaultLimit);
  const balance = Number(payload.balance || Math.round(creditLimit * 0.25));
  const nextId =
    memoryStore.customers.reduce((max, c) => Math.max(max, c.customerId), 0) + 1;

  const newCustomer = {
    customerId: nextId,
    name: payload.name.trim(),
    country:
      payload.country || (marketType === 'LOCAL' ? 'Sri Lanka (Colombo)' : 'United Kingdom'),
    marketType,
    currency,
    contactEmail:
      payload.contactEmail ||
      (marketType === 'LOCAL' ? 'buyer@lankatrade.lk' : 'buyer@globaltrade.com'),
    phone: payload.phone || (marketType === 'LOCAL' ? '+94 11 234 5678' : '+44 20 7946 0192'),
    creditLimit,
    balance,
    utilization: Math.min(100, Math.round((balance / Math.max(creditLimit, 1)) * 100)),
    tier: payload.tier || (marketType === 'LOCAL' ? 'Local Enterprise' : 'Enterprise'),
    featured: false,
  };
  memoryStore.customers.unshift(newCustomer);
  return getCustomersBundle();
}

export async function updateCustomerRecord(customerId, payload) {
  const cust = memoryStore.customers.find(
    (c) => c.customerId === Number(customerId)
  );
  if (!cust) {
    const err = new Error('Customer not found');
    err.statusCode = 404;
    throw err;
  }
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
  const idx = memoryStore.customers.findIndex(
    (c) => c.customerId === Number(customerId)
  );
  if (idx === -1) {
    const err = new Error('Customer not found');
    err.statusCode = 404;
    throw err;
  }
  memoryStore.customers.splice(idx, 1);
  return getCustomersBundle();
}

export async function createSalesInvoiceRecord(payload) {
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

export async function updateSalesInvoiceRecord(soId, payload) {
  const so = memoryStore.salesOrders.find((s) => s.soId === Number(soId));
  if (!so) {
    const err = new Error('Sales order not found');
    err.statusCode = 404;
    throw err;
  }
  if (payload.productName) so.productName = payload.productName;
  if (payload.quantity !== undefined) so.quantity = Number(payload.quantity);
  if (payload.totalAmount !== undefined) so.totalAmount = Number(payload.totalAmount);
  if (payload.status) so.status = payload.status;
  if (payload.paymentStatus) so.paymentStatus = payload.paymentStatus;
  return getCustomersBundle();
}

export async function deleteSalesInvoiceRecord(soId) {
  const idx = memoryStore.salesOrders.findIndex((s) => s.soId === Number(soId));
  if (idx === -1) {
    const err = new Error('Sales order not found');
    err.statusCode = 404;
    throw err;
  }
  memoryStore.salesOrders.splice(idx, 1);
  return getCustomersBundle();
}

function computeExportByCountry(transactions, customers) {
  const baseline = {
    USA: 195000,
    Germany: 148000,
    UAE: 84000,
    UK: 58000,
  };
  const totals = { ...baseline };

  transactions
    .filter((t) => t.type === 'EXPORT' && t.currency === 'USD')
    .forEach((t) => {
      const country = t.destinationCountry || 'USA';
      totals[country] = (totals[country] || 0) + Number(t.totalValue || 0);
    });

  customers
    .filter((c) => c.marketType === 'INTERNATIONAL')
    .forEach((c) => {
      if (!(c.country in totals) && Number(c.balance || 0) > 0) {
        totals[c.country] = Number(c.balance);
      }
    });

  const sorted = Object.entries(totals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);
  const maxVal = Math.max(sorted[0]?.[1] || 1, 1);
  const tones = ['emerald', 'emerald-amber', 'amber', 'muted'];

  return sorted.map(([country, value], idx) => ({
    country,
    share: Math.round((value / maxVal) * 100),
    value,
    currency: 'USD',
    tone: tones[idx] || 'muted',
  }));
}

export async function getReportsAndDashboardSummary() {
  const connected = await isPostgresConnected();
  const inv = await getInventoryBundle();
  const ships = computeShipmentsMetrics(memoryStore.transactions);
  const sups = computeSuppliersMetrics(memoryStore.suppliers, memoryStore.purchaseOrders);
  const custs = computeCustomersMetrics(memoryStore.customers, memoryStore.salesOrders);
  const exportByCountry = computeExportByCountry(
    memoryStore.transactions,
    memoryStore.customers
  );

  return {
    databaseConnected: connected,
    databaseMode: connected ? 'connected (PostgreSQL 17)' : 'active (BIMS Sync Engine)',
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
      activeShipments: memoryStore.transactions.length,
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
    transactions: memoryStore.transactions,
    suppliers: memoryStore.suppliers,
    customers: memoryStore.customers,
  };
}
