import { USD_TO_LKR_RATE } from '../config/defaultSeedData.js';

export function syncProductMetrics(product) {
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

export function computeInventoryMetrics(products) {
  products.forEach(syncProductMetrics);

  const healthyCount = products.filter(
    (p) => Number(p.stockQty) > Number(p.reorderLevel || 0)
  ).length;
  const optimalScore = Math.round(
    (healthyCount / Math.max(products.length, 1)) * 100
  );
  const lowStockCount = products.length - healthyCount;

  const lowItems = products.filter(
    (p) => Number(p.stockQty) <= Number(p.reorderLevel)
  );
  const healthyItems = products.filter(
    (p) => Number(p.stockQty) > Number(p.reorderLevel)
  );
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
      tone: isLow
        ? 'amber'
        : p.stockPercent >= 90
        ? 'emerald'
        : 'emerald-striped',
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

export function computeShipmentsMetrics(transactions) {
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
          (active.filter((t) => (stageRank[t.status] || 1) >= minRank).length /
            total) *
            100
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
          active.reduce((sum, t) => sum + (stageScore[t.status] || 25), 0) /
            total
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

export function computeSuppliersMetrics(suppliers, purchaseOrders) {
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
          (active.filter((po) => (stageRank[po.status] || 1) >= minRank).length /
            total) *
            100
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
    leftPercent: s0
      ? Math.round((Number(s0.balance || 0) / totalBalance) * 100)
      : 0,
    rightLabel: s1
      ? s1.name.split(' ').slice(0, 2).join(' ')
      : 'Matale Estates',
    rightPercent: s1
      ? Math.round((Number(s1.balance || 0) / totalBalance) * 100)
      : 0,
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

export function computeMarketCustomerMetrics(customersSubset, ordersSubset) {
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
          (active.filter((so) => (stageRank[so.status] || 1) >= minRank).length /
            total) *
            100
        );
  const countAt = (minRank) =>
    active.filter((so) => (stageRank[so.status] || 1) >= minRank).length;

  const p1 = pct(1);
  const p2 = pct(2);
  const p3 = pct(3);
  const p4 = pct(4);

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

export function computeCustomersMetrics(customers, salesOrders) {
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

export function computeFifoValuationUsd(products) {
  const total = products.reduce(
    (acc, p) => acc + Number(p.stockQty || 0) * Number(p.unitPrice || 0),
    0
  );
  return total || 142000;
}

export function computeFifoValuationLkr(products) {
  const total = products.reduce(
    (acc, p) =>
      acc +
      Number(p.stockQty || 0) *
        Number(p.unitPriceLkr || Number(p.unitPrice || 0) * USD_TO_LKR_RATE),
    0
  );
  return total || 42600000;
}

export function computeExportByCountry(transactions, customers) {
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
