import 'dotenv/config';
import bcrypt from 'bcryptjs';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/index.js';

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL or DIRECT_URL is required to seed the database.');
}

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await bcrypt.hash('Password@123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@ceylonspices.com' },
    update: {},
    create: {
      name: 'M. L. Umaima',
      email: 'admin@ceylonspices.com',
      role: 'ADMIN',
      passwordHash,
    },
  });

  await prisma.user.upsert({
    where: { email: 'manager@ceylonspices.com' },
    update: {},
    create: {
      name: 'Sarah Smith',
      email: 'manager@ceylonspices.com',
      role: 'MANAGER',
      passwordHash,
    },
  });

  await prisma.user.upsert({
    where: { email: 'staff@ceylonspices.com' },
    update: {},
    create: {
      name: 'John Doe',
      email: 'staff@ceylonspices.com',
      role: 'STAFF',
      passwordHash,
    },
  });

  const kandySupplier = await prisma.supplier.upsert({
    where: { supplierId: 1 },
    update: {},
    create: {
      name: 'Kandy Highland Growers',
      country: 'Sri Lanka',
      contactEmail: 'orders@kandyhighland.example.com',
      phone: '+94 81 223 4410',
      paymentTerms: 'Net 30',
      onTimeRate: 94.0,
      accuracyRate: 97.5,
    },
  });

  await prisma.supplier.upsert({
    where: { supplierId: 2 },
    update: {},
    create: {
      name: 'Matale Organic Estates',
      country: 'Sri Lanka',
      contactEmail: 'supply@mataleorganic.example.com',
      phone: '+94 66 222 8890',
      paymentTerms: 'Net 45',
      onTimeRate: 96.0,
      accuracyRate: 98.5,
    },
  });

  const euCustomer = await prisma.customer.upsert({
    where: { customerId: 1 },
    update: {},
    create: {
      name: 'European Spice Traders',
      country: 'Germany',
      contactEmail: 'import@eurospices.example.com',
      phone: '+49 40 5550 1122',
      creditLimit: 120000,
      balance: 24500,
    },
  });

  await prisma.customer.upsert({
    where: { customerId: 2 },
    update: {},
    create: {
      name: 'US Organic Foods',
      country: 'United States',
      contactEmail: 'purchasing@usorganic.example.com',
      phone: '+1 212 555 0194',
      creditLimit: 95000,
      balance: 14200,
    },
  });

  const cinnamon = await prisma.product.upsert({
    where: { sku: 'SKU-CIN-01' },
    update: {},
    create: {
      sku: 'SKU-CIN-01',
      name: 'Ceylon Alba Cinnamon',
      category: 'Cinnamon',
      description: 'Export-grade Alba Ceylon cinnamon quills (HS 0906.11)',
      unitPrice: 38.5,
      costPrice: 24.0,
      stockQty: 850,
      reorderLevel: 200,
      valuationMethod: 'FIFO',
    },
  });

  await prisma.product.upsert({
    where: { sku: 'SKU-PEP-04' },
    update: {},
    create: {
      sku: 'SKU-PEP-04',
      name: 'Organic Black Pepper',
      category: 'Pepper',
      description: 'Sun-dried Sri Lankan organic black peppercorns',
      unitPrice: 22.0,
      costPrice: 13.5,
      stockQty: 120,
      reorderLevel: 180,
      valuationMethod: 'FIFO',
    },
  });

  await prisma.product.upsert({
    where: { sku: 'SKU-CRD-02' },
    update: {},
    create: {
      sku: 'SKU-CRD-02',
      name: 'Green Cardamom',
      category: 'Cardamom',
      description: 'Hand-picked green cardamom pods from Kandy',
      unitPrice: 54.0,
      costPrice: 36.0,
      stockQty: 190,
      reorderLevel: 220,
      valuationMethod: 'WEIGHTED_AVERAGE',
    },
  });

  const existingBatch = await prisma.stockBatch.findFirst({
    where: { productId: cinnamon.productId },
  });

  if (!existingBatch) {
    await prisma.stockBatch.create({
      data: {
        productId: cinnamon.productId,
        initialQty: 850,
        remainingQty: 850,
        unitCost: 24.0,
      },
    });
  }

  await prisma.transaction.upsert({
    where: { txnNumber: 'IMP-2026-0001' },
    update: {},
    create: {
      txnNumber: 'IMP-2026-0001',
      type: 'IMPORT',
      status: 'DELIVERED',
      totalValue: 12000.0,
      hsCode: '0906.11',
      originCountry: 'Sri Lanka',
      destinationCountry: 'Colombo Warehouse',
      dutyRate: 0,
      dutyAmount: 0,
      incoterms: 'EXW',
      carrier: 'Lanka Inland Freight',
      trackingNumber: 'LIF-2026-8841',
      userId: admin.userId,
      supplierId: kandySupplier.supplierId,
      orderItems: {
        create: [
          {
            productId: cinnamon.productId,
            quantity: 500,
            unitPrice: 24.0,
            lineTotal: 12000.0,
          },
        ],
      },
    },
  });

  await prisma.transaction.upsert({
    where: { txnNumber: 'EXP-2026-0001' },
    update: {},
    create: {
      txnNumber: 'EXP-2026-0001',
      type: 'EXPORT',
      status: 'AT_CUSTOMS',
      totalValue: 19250.0,
      hsCode: '0906.11',
      originCountry: 'Sri Lanka',
      destinationCountry: 'Germany',
      dutyRate: 0,
      dutyAmount: 0,
      incoterms: 'FOB Colombo',
      carrier: 'Maersk Line',
      trackingNumber: 'MAEU9081726',
      userId: admin.userId,
      customerId: euCustomer.customerId,
      orderItems: {
        create: [
          {
            productId: cinnamon.productId,
            quantity: 500,
            unitPrice: 38.5,
            lineTotal: 19250.0,
          },
        ],
      },
    },
  });

  console.log('Seeded Ceylon Spices BIMS users, suppliers, customers, products, and transactions.');
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
