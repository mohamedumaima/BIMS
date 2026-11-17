import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  FileText,
  Globe2,
  Landmark,
  Pencil,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import {
  CardHeader,
  DotMatrixPair,
  PdfDocCard,
  ProgressPillBar,
  RadialTickGauge,
  VioletActionCard,
} from '../components/BentoWidgets';
import InlineAssistantBar from '../components/InlineAssistantBar';
import { api } from '../services/api';

const EMPTY_CUSTOMER = {
  name: 'Tokyo Botanicals Co.',
  country: 'Japan',
  marketType: 'INTERNATIONAL',
  contactEmail: 'imports@tokyobotanicals.jp',
  creditLimit: 110000,
  balance: 24000,
};

function formatBuyerCurrency(amount, currency = 'USD') {
  const num = Number(amount || 0);
  if (currency === 'LKR') {
    return num >= 1000000
      ? `Rs. ${(num / 1000000).toFixed(2)}M`
      : `Rs. ${num.toLocaleString()}`;
  }
  return num >= 1000 ? `$${Math.round(num / 1000)}k` : `$${num.toLocaleString()}`;
}

export default function CustomersPage() {
  const { user } = useSelector((state) => state.auth);
  const canDelete = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const [bundle, setBundle] = useState(null);
  const [buyerTab, setBuyerTab] = useState('INTERNATIONAL'); // INTERNATIONAL | LOCAL | ALL
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [customerForm, setCustomerForm] = useState(EMPTY_CUSTOMER);
  const [invoiceForm, setInvoiceForm] = useState({
    customerId: 1,
    productName: 'Ceylon Alba Cinnamon',
    quantity: 350,
    totalAmount: 42000,
    status: 'INVOICED',
    paymentStatus: 'UNPAID',
  });
  const [chatReply, setChatReply] = useState(null);

  useEffect(() => {
    api
      .get('/customers')
      .then(({ data }) => setBundle(data))
      .catch(() => {});
  }, []);

  const openAddCustomer = (defaultType = buyerTab === 'LOCAL' ? 'LOCAL' : 'INTERNATIONAL') => {
    setEditingCustomer(null);
    setCustomerForm({
      ...EMPTY_CUSTOMER,
      marketType: defaultType,
      country: defaultType === 'LOCAL' ? 'Sri Lanka (Colombo)' : 'Japan',
      creditLimit: defaultType === 'LOCAL' ? 5000000 : 110000,
      balance: defaultType === 'LOCAL' ? 1200000 : 24000,
    });
    setShowCustomerModal(true);
  };

  const openEditCustomer = (cust) => {
    setEditingCustomer(cust);
    setCustomerForm({
      name: cust.name,
      country: cust.country,
      marketType: cust.marketType || 'INTERNATIONAL',
      contactEmail: cust.contactEmail || '',
      creditLimit: cust.creditLimit,
      balance: cust.balance,
    });
    setShowCustomerModal(true);
  };

  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    if (editingCustomer) {
      const { data } = await api.put(
        `/customers/${editingCustomer.customerId}`,
        customerForm
      );
      setBundle(data);
    } else {
      const { data } = await api.post('/customers', customerForm);
      setBundle(data);
    }
    setShowCustomerModal(false);
    setEditingCustomer(null);
  };

  const handleDeleteCustomer = async (customerId) => {
    if (!canDelete) return;
    const { data } = await api.delete(`/customers/${customerId}`);
    setBundle(data);
  };

  const openCreateInvoice = () => {
    setEditingInvoice(null);
    const defaultCustomer =
      buyerTab === 'LOCAL'
        ? bundle?.localBuyers?.[0] || bundle?.customers?.[0]
        : bundle?.internationalBuyers?.[0] || bundle?.customers?.[0];
    const isLocal = defaultCustomer?.marketType === 'LOCAL';
    setInvoiceForm({
      customerId: defaultCustomer?.customerId || 1,
      productName: 'Ceylon Alba Cinnamon',
      quantity: 350,
      totalAmount: isLocal ? 2650000 : 42000,
      status: 'INVOICED',
      paymentStatus: 'UNPAID',
    });
    setShowInvoiceModal(true);
  };

  const openEditInvoice = (so) => {
    setEditingInvoice(so);
    setInvoiceForm({
      customerId: so.customerId,
      productName: so.productName,
      quantity: so.quantity,
      totalAmount: so.totalAmount,
      status: so.status,
      paymentStatus: so.paymentStatus,
    });
    setShowInvoiceModal(true);
  };

  const handleSaveInvoice = async (e) => {
    e.preventDefault();
    if (editingInvoice) {
      const { data } = await api.put(`/sales-orders/${editingInvoice.soId}`, invoiceForm);
      setBundle(data);
    } else {
      const { data } = await api.post('/sales-orders', invoiceForm);
      setBundle(data);
    }
    setShowInvoiceModal(false);
    setEditingInvoice(null);
  };

  const handleDeleteInvoice = async (soId) => {
    if (!canDelete) return;
    const { data } = await api.delete(`/sales-orders/${soId}`);
    setBundle(data);
  };

  const handleInvoiceStatusChange = async (soId, status) => {
    const { data } = await api.put(`/sales-orders/${soId}`, { status });
    setBundle(data);
  };

  const allCustomers = bundle?.customers || [];
  const visibleCustomers =
    buyerTab === 'INTERNATIONAL'
      ? allCustomers.filter((c) => c.marketType === 'INTERNATIONAL')
      : buyerTab === 'LOCAL'
      ? allCustomers.filter((c) => c.marketType === 'LOCAL')
      : allCustomers;

  const salesOrders = (bundle?.salesOrders || []).filter((so) =>
    buyerTab === 'ALL' ? true : so.marketType === buyerTab
  );

  const marketMetrics = bundle?.byMarket?.[buyerTab] || {
    pipelineStages: bundle?.pipelineStages || [],
    creditUtilization: bundle?.creditUtilization ?? 0,
    paymentsMatrix: bundle?.paymentsMatrix || {
      leftLabel: buyerTab === 'LOCAL' ? 'Colombo Grand' : 'European Spice',
      leftPercent: 46,
      rightLabel: buyerTab === 'LOCAL' ? 'Lanka Ayurveda' : 'US Organic',
      rightPercent: 45,
    },
  };

  return (
    <div className="space-y-6">
      {/* SEPARATED INTERNATIONAL (USD $) VS LOCAL (LKR Rs.) BUYER TABS */}
      <div className="bims-card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setBuyerTab('INTERNATIONAL')}
            className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
              buyerTab === 'INTERNATIONAL'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'bims-subcard text-zinc-400 hover:text-white'
            }`}
          >
            <Globe2 className="w-3.5 h-3.5" />
            <span>International Buyers (USD $)</span>
          </button>

          <button
            type="button"
            onClick={() => setBuyerTab('LOCAL')}
            className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
              buyerTab === 'LOCAL'
                ? 'bg-amber-500 text-zinc-950 shadow-sm'
                : 'bims-subcard text-zinc-400 hover:text-white'
            }`}
          >
            <Landmark className="w-3.5 h-3.5" />
            <span>Local Sri Lankan Buyers (LKR Rs.)</span>
          </button>

          <button
            type="button"
            onClick={() => setBuyerTab('ALL')}
            className={`px-3.5 py-2 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
              buyerTab === 'ALL'
                ? 'bg-emerald-600 text-white'
                : 'bims-subcard text-zinc-400 hover:text-white'
            }`}
          >
            All Buyers ({allCustomers.length})
          </button>
        </div>

        <span className="text-xs text-zinc-400">
          Active Currency Mode:{' '}
          <strong className={buyerTab === 'LOCAL' ? 'text-amber-400' : 'text-emerald-400'}>
            {buyerTab === 'LOCAL'
              ? 'Sri Lankan Rupees (LKR Rs.)'
              : buyerTab === 'INTERNATIONAL'
              ? 'US Dollars (USD $)'
              : 'Dual Currency (USD $ & LKR Rs.)'}
          </strong>
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* LEFT COLUMN */}
        <div className="lg:col-span-4 space-y-5">
          <div className="bims-card p-5">
            <CardHeader
              title={
                buyerTab === 'LOCAL'
                  ? 'Local Sri Lankan Buyers (LKR)'
                  : buyerTab === 'INTERNATIONAL'
                  ? 'International Buyers (USD)'
                  : 'All Buyers (USD & LKR)'
              }
              onAction={() => openAddCustomer()}
              actionLabel="Add Buyer"
            />

            <div className="space-y-3">
              {visibleCustomers.map((cust, idx) =>
                idx === 0 ? (
                  <div
                    key={cust.customerId}
                    className={`rounded-2xl p-4 text-white shadow-md ${
                      cust.currency === 'LKR'
                        ? 'bg-gradient-to-br from-amber-600 to-orange-600'
                        : 'bg-gradient-to-br from-violet-600 to-indigo-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-950/60 text-white">
                        {cust.tier || 'Enterprise'} · {cust.currency}
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-zinc-950/40 text-white">
                          {cust.utilization || 46}%
                        </span>
                        <button
                          type="button"
                          onClick={() => openEditCustomer(cust)}
                          title="Edit Buyer"
                          className="w-6 h-6 rounded-full bg-zinc-950/40 flex items-center justify-center hover:bg-zinc-950/70 cursor-pointer"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        {canDelete ? (
                          <button
                            type="button"
                            onClick={() => handleDeleteCustomer(cust.customerId)}
                            title="Delete Buyer"
                            className="w-6 h-6 rounded-full bg-zinc-950/40 flex items-center justify-center hover:bg-rose-600 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        ) : null}
                      </div>
                    </div>
                    <p className="font-bold text-base leading-snug">{cust.name}</p>
                    <p className="text-xs text-white/80 mt-0.5">{cust.country}</p>
                    <div className="flex items-center justify-between text-xs text-white/95 mt-2.5 pt-2 border-t border-white/20">
                      <span>
                        Credit limit: {formatBuyerCurrency(cust.creditLimit, cust.currency)}
                      </span>
                      <span>
                        Balance: {formatBuyerCurrency(cust.balance, cust.currency)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div
                    key={cust.customerId}
                    className="bims-subcard p-3.5 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{cust.name}</p>
                      <p className="text-[11px] text-zinc-400">
                        {cust.country} · Limit:{' '}
                        <strong
                          className={
                            cust.currency === 'LKR' ? 'text-amber-400' : 'text-emerald-400'
                          }
                        >
                          {formatBuyerCurrency(cust.creditLimit, cust.currency)}
                        </strong>
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEditCustomer(cust)}
                        title="Edit Buyer"
                        className="w-6 h-6 rounded-lg bims-card flex items-center justify-center text-zinc-400 hover:text-violet-400 cursor-pointer"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      {canDelete ? (
                        <button
                          type="button"
                          onClick={() => handleDeleteCustomer(cust.customerId)}
                          title="Delete Buyer"
                          className="w-6 h-6 rounded-lg bims-card flex items-center justify-center text-zinc-400 hover:text-rose-400 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                )
              )}

              <button
                type="button"
                onClick={() => openAddCustomer()}
                className="w-full py-2.5 rounded-xl border border-dashed border-zinc-600/60 text-xs font-medium text-zinc-400 hover:text-violet-400 hover:border-violet-500/50 transition-colors cursor-pointer"
              >
                + New {buyerTab === 'LOCAL' ? 'Local (LKR)' : 'International (USD)'} Customer
              </button>
            </div>
          </div>

          <div className="bims-card p-5">
            <CardHeader title="Outstanding Payments" />
            <DotMatrixPair
              leftLabel={marketMetrics.paymentsMatrix.leftLabel}
              leftPercent={marketMetrics.paymentsMatrix.leftPercent}
              rightLabel={marketMetrics.paymentsMatrix.rightLabel}
              rightPercent={marketMetrics.paymentsMatrix.rightPercent}
            />
          </div>
        </div>

        {/* CENTER COLUMN */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bims-card p-5">
            <h3 className="text-base font-semibold tracking-tight mb-4">
              Sales Order Pipeline (
              {buyerTab === 'LOCAL'
                ? 'LKR Rs.'
                : buyerTab === 'INTERNATIONAL'
                ? 'USD $'
                : 'USD & LKR'}
              )
            </h3>
            <div className="space-y-3">
              {marketMetrics.pipelineStages.map((stage) => (
                <ProgressPillBar
                  key={stage.label}
                  label={stage.label}
                  percent={stage.percent}
                  rightLabel={stage.rightLabel}
                  tone={stage.tone}
                />
              ))}
            </div>

            {salesOrders.length > 0 ? (
              <div className="mt-4 pt-3 border-t border-zinc-800/40 space-y-2">
                {salesOrders.slice(0, 3).map((so) => (
                  <div
                    key={so.soId}
                    className="bims-subcard px-3 py-2 flex items-center justify-between text-xs gap-2"
                  >
                    <div className="min-w-0">
                      <span className="font-bold text-violet-400">{so.invoiceCode}</span> ·{' '}
                      <span className="font-medium">{so.customerName}</span>
                      <p className="text-[11px] text-zinc-400">
                        {so.productName} ({so.quantity} kg) —{' '}
                        <strong
                          className={
                            so.currency === 'LKR' ? 'text-amber-400' : 'text-emerald-400'
                          }
                        >
                          {so.currency === 'LKR'
                            ? `Rs. ${Number(so.totalAmount).toLocaleString()}`
                            : `$${Number(so.totalAmount).toLocaleString()} USD`}
                        </strong>
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <select
                        aria-label={`Order stage for ${so.invoiceCode}`}
                        value={so.status}
                        onChange={(e) => handleInvoiceStatusChange(so.soId, e.target.value)}
                        className="px-2 py-1 rounded-lg bims-card text-[10px] font-semibold text-emerald-400 cursor-pointer focus:outline-none"
                      >
                        <option value="QUOTATION" className="bg-zinc-900 text-white">QUOTATION</option>
                        <option value="CONFIRMED" className="bg-zinc-900 text-white">CONFIRMED</option>
                        <option value="INVOICED" className="bg-zinc-900 text-white">INVOICED</option>
                        <option value="FULFILLED" className="bg-zinc-900 text-white">FULFILLED</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => openEditInvoice(so)}
                        title="Edit Sales Order"
                        className="w-6 h-6 rounded-lg bims-card flex items-center justify-center text-zinc-400 hover:text-violet-400 cursor-pointer"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      {canDelete ? (
                        <button
                          type="button"
                          onClick={() => handleDeleteInvoice(so.soId)}
                          title="Delete Sales Order"
                          className="w-6 h-6 rounded-lg bims-card flex items-center justify-center text-zinc-400 hover:text-rose-400 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="bims-card p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold tracking-tight">
                  Customer Communication
                </h3>
                <span className="w-7 h-7 rounded-full bims-subcard flex items-center justify-center text-zinc-400">
                  <FileText className="w-3.5 h-3.5" />
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-end">
                  <div className="rounded-2xl rounded-br-sm bg-violet-600 text-white px-4 py-2.5 max-w-xs">
                    Can you show me the sales invoice for European Spice Traders?
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-violet-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="w-3.5 h-3.5" />
                  </span>
                  <div className="bims-subcard p-3.5 flex-1 space-y-2.5">
                    <div>
                      <p className="font-semibold">BIMS Assistant</p>
                      <p className="text-zinc-400 mt-0.5 whitespace-pre-line">
                        {chatReply || 'Here is the invoice PDF for European Spice Traders:'}
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <PdfDocCard
                        badge="INV-2604"
                        badgeColor="orange"
                        onClick={() =>
                          window.open('/api/documents/pdf/1/COMMERCIAL_INVOICE', '_blank')
                        }
                      />
                      <PdfDocCard
                        badge="PL-2604"
                        badgeColor="violet"
                        onClick={() => window.open('/api/documents/pdf/1/PACKING_LIST', '_blank')}
                      />
                      <PdfDocCard
                        badge="BL-2604"
                        badgeColor="violet"
                        onClick={() => window.open('/api/documents/pdf/1/BILL_OF_LADING', '_blank')}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <InlineAssistantBar
              placeholder="Ask AI about USD/LKR buyers or invoices..."
              defaultPrompt="Compare International Buyers (USD) vs Local Buyers (LKR)"
              actionLabel="Invoice PDF"
              onActionClick={() =>
                window.open('/api/documents/pdf/1/COMMERCIAL_INVOICE', '_blank')
              }
              showInlineReply={false}
              onReply={(reply) => setChatReply(reply)}
            />
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-3 space-y-5">
          <div className="bims-card p-5">
            <CardHeader title="Credit Utilization" />
            <RadialTickGauge
              valueText={`${marketMetrics.creditUtilization}%`}
              subText="utilization"
              percent={marketMetrics.creditUtilization}
              accent="violet"
            />
          </div>

          <VioletActionCard
            title={'Generate\nSales\nInvoice'}
            buttonLabel="Generate Invoice"
            onPrimaryClick={openCreateInvoice}
          />
        </div>
      </div>

      {/* CREATE / EDIT CUSTOMER MODAL */}
      {showCustomerModal ? (
        <div className="fixed inset-0 z-50 bg-black/65 flex items-center justify-center p-4">
          <div className="bims-card w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">
                {editingCustomer ? 'Edit Buyer Profile' : 'Add Buyer Profile'}
              </h3>
              <button
                type="button"
                onClick={() => setShowCustomerModal(false)}
                className="w-7 h-7 rounded-full bims-subcard flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveCustomer} className="space-y-3 text-xs">
              <div>
                <label className="block mb-1 font-medium">Buyer Market &amp; Currency</label>
                <select
                  value={customerForm.marketType}
                  onChange={(e) => {
                    const mt = e.target.value;
                    setCustomerForm({
                      ...customerForm,
                      marketType: mt,
                      country: mt === 'LOCAL' ? 'Sri Lanka (Colombo)' : 'Germany',
                      creditLimit: mt === 'LOCAL' ? 5000000 : 100000,
                      balance: mt === 'LOCAL' ? 1200000 : 25000,
                    });
                  }}
                  className="w-full rounded-xl bims-input px-3.5 py-2.5"
                >
                  <option value="INTERNATIONAL" className="bg-zinc-900 text-white">
                    International Buyer (USD $)
                  </option>
                  <option value="LOCAL" className="bg-zinc-900 text-white">
                    Local Sri Lankan Buyer (LKR Rs.)
                  </option>
                </select>
              </div>
              <div>
                <label className="block mb-1 font-medium">Buyer / Company Name</label>
                <input
                  required
                  value={customerForm.name}
                  onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                  className="w-full rounded-xl bims-input px-3.5 py-2.5"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-medium">Country / Region</label>
                  <input
                    required
                    value={customerForm.country}
                    onChange={(e) => setCustomerForm({ ...customerForm, country: e.target.value })}
                    className="w-full rounded-xl bims-input px-3.5 py-2.5"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-medium">
                    Credit Limit ({customerForm.marketType === 'LOCAL' ? 'Rs. LKR' : '$ USD'})
                  </label>
                  <input
                    type="number"
                    required
                    value={customerForm.creditLimit}
                    onChange={(e) =>
                      setCustomerForm({ ...customerForm, creditLimit: e.target.value })
                    }
                    className="w-full rounded-xl bims-input px-3.5 py-2.5"
                  />
                </div>
              </div>
              <div>
                <label className="block mb-1 font-medium">
                  Outstanding Balance ({customerForm.marketType === 'LOCAL' ? 'Rs. LKR' : '$ USD'})
                </label>
                <input
                  type="number"
                  required
                  value={customerForm.balance}
                  onChange={(e) => setCustomerForm({ ...customerForm, balance: e.target.value })}
                  className="w-full rounded-xl bims-input px-3.5 py-2.5"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-full bg-violet-600 hover:bg-violet-500 text-white font-semibold mt-2 cursor-pointer"
              >
                {editingCustomer ? 'Update Buyer Profile' : 'Save Buyer Profile'}
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {/* CREATE / EDIT SALES INVOICE MODAL */}
      {showInvoiceModal ? (
        <div className="fixed inset-0 z-50 bg-black/65 flex items-center justify-center p-4">
          <div className="bims-card w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">
                {editingInvoice ? 'Edit Sales Order / Invoice' : 'Generate Sales Invoice'}
              </h3>
              <button
                type="button"
                onClick={() => setShowInvoiceModal(false)}
                className="w-7 h-7 rounded-full bims-subcard flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveInvoice} className="space-y-3 text-xs">
              <div>
                <label className="block mb-1 font-medium">Customer</label>
                <select
                  value={invoiceForm.customerId}
                  onChange={(e) =>
                    setInvoiceForm({ ...invoiceForm, customerId: Number(e.target.value) })
                  }
                  className="w-full rounded-xl bims-input px-3.5 py-2.5"
                >
                  {allCustomers.map((c) => (
                    <option key={c.customerId} value={c.customerId} className="bg-zinc-900 text-white">
                      {c.name} ({c.currency})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block mb-1 font-medium">Spice Product</label>
                <input
                  required
                  value={invoiceForm.productName}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, productName: e.target.value })}
                  className="w-full rounded-xl bims-input px-3.5 py-2.5"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-medium">Quantity (kg)</label>
                  <input
                    type="number"
                    required
                    value={invoiceForm.quantity}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, quantity: e.target.value })}
                    className="w-full rounded-xl bims-input px-3.5 py-2.5"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-medium">Invoice Value (USD / LKR)</label>
                  <input
                    type="number"
                    required
                    value={invoiceForm.totalAmount}
                    onChange={(e) =>
                      setInvoiceForm({ ...invoiceForm, totalAmount: e.target.value })
                    }
                    className="w-full rounded-xl bims-input px-3.5 py-2.5"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-full bg-violet-600 hover:bg-violet-500 text-white font-semibold mt-2 cursor-pointer"
              >
                {editingInvoice ? 'Update Sales Invoice' : 'Create Sales Order & Invoice'}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
