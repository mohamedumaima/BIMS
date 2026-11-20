import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  CheckCircle2,
  FileText,
  Pencil,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import {
  CardHeader,
  DotMatrixPair,
  ProgressPillBar,
  RadialTickGauge,
  VioletActionCard,
} from '../components/BentoWidgets';
import InlineAssistantBar from '../components/InlineAssistantBar';
import { api, downloadApiFile } from '../services/api';

const EMPTY_SUPPLIER = {
  name: 'Nuwara Eliya Spice Collective',
  country: 'Sri Lanka (Nuwara Eliya)',
  contactEmail: 'trade@nuwaraspices.lk',
  paymentTerms: 'Net 30',
  balance: 2450000,
  onTimeRate: 95,
};

export default function SuppliersPage() {
  const { user } = useSelector((state) => state.auth);
  const canManage = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const [bundle, setBundle] = useState(null);
  const [assistantNote, setAssistantNote] = useState(null);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [showPoModal, setShowPoModal] = useState(false);
  const [editingPo, setEditingPo] = useState(null);
  const [supplierForm, setSupplierForm] = useState(EMPTY_SUPPLIER);
  const [poForm, setPoForm] = useState({
    supplierId: 1,
    productName: 'Ceylon Alba Cinnamon',
    orderedQty: 350,
    totalAmount: 3360000,
  });

  useEffect(() => {
    api
      .get('/suppliers')
      .then(({ data }) => setBundle(data))
      .catch(() => {});
  }, []);

  const openAddSupplier = () => {
    setEditingSupplier(null);
    setSupplierForm(EMPTY_SUPPLIER);
    setShowSupplierModal(true);
  };

  const openEditSupplier = (sup) => {
    setEditingSupplier(sup);
    setSupplierForm({
      name: sup.name,
      country: sup.country,
      contactEmail: sup.contactEmail,
      paymentTerms: sup.paymentTerms,
      balance: sup.balance,
      onTimeRate: sup.onTimeRate,
    });
    setShowSupplierModal(true);
  };

  const handleSaveSupplier = async (e) => {
    e.preventDefault();
    if (editingSupplier) {
      const { data } = await api.put(
        `/suppliers/${editingSupplier.supplierId}`,
        supplierForm
      );
      setBundle(data);
    } else {
      const { data } = await api.post('/suppliers', supplierForm);
      setBundle(data);
    }
    setShowSupplierModal(false);
    setEditingSupplier(null);
  };

  const handleDeleteSupplier = async (supplierId) => {
    if (!canManage) return;
    const { data } = await api.delete(`/suppliers/${supplierId}`);
    setBundle(data);
  };

  const openCreatePo = () => {
    setEditingPo(null);
    setPoForm({
      supplierId: bundle?.suppliers?.[0]?.supplierId || 1,
      productName: 'Ceylon Alba Cinnamon',
      orderedQty: 350,
      totalAmount: 3360000,
    });
    setShowPoModal(true);
  };

  const openEditPo = (po) => {
    setEditingPo(po);
    setPoForm({
      supplierId: po.supplierId,
      productName: po.productName,
      orderedQty: po.orderedQty,
      totalAmount: po.totalAmount,
    });
    setShowPoModal(true);
  };

  const handleSavePo = async (e) => {
    e.preventDefault();
    if (editingPo) {
      const { data } = await api.put(`/purchase-orders/${editingPo.poId}`, poForm);
      setBundle(data);
    } else {
      const { data } = await api.post('/purchase-orders', poForm);
      setBundle(data);
    }
    setShowPoModal(false);
    setEditingPo(null);
  };

  const handleApprovePo = async (poId, status = 'APPROVED') => {
    if (!canManage) return;
    const { data } = await api.patch(`/purchase-orders/${poId}/status`, {
      status,
    });
    setBundle(data);
  };

  const handleDeletePo = async (poId) => {
    if (!canManage) return;
    const { data } = await api.delete(`/purchase-orders/${poId}`);
    setBundle(data);
  };

  const suppliers = bundle?.suppliers || [];
  const purchaseOrders = bundle?.purchaseOrders || [];
  const workflowStages = bundle?.workflowStages || [];
  const performanceRating = bundle?.performanceRating ?? 94;
  const balanceMatrix = bundle?.balanceMatrix || {
    leftLabel: 'Kandy Growers',
    leftPercent: 45,
    rightLabel: 'Matale Estates',
    rightPercent: 90,
  };
  const pendingPos = purchaseOrders.filter((p) => p.status === 'PENDING_APPROVAL');

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* LEFT COLUMN */}
        <div className="lg:col-span-4 space-y-5">
          <div className="bims-card p-5">
            <CardHeader
              title="Sri Lankan Spice Suppliers (LKR)"
              onAction={openAddSupplier}
              actionLabel="Add Supplier"
            />

            <div className="space-y-3">
              {suppliers.map((sup, idx) => (
                <div key={sup.supplierId} className="bims-subcard p-3.5">
                  {idx === 0 ? (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-violet-600 text-white">
                          Phase Indicator
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bims-card">
                            {sup.onTimeRate}%
                          </span>
                          <button
                            type="button"
                            onClick={() => openEditSupplier(sup)}
                            className="w-6 h-6 rounded-lg bims-card flex items-center justify-center text-zinc-400 hover:text-violet-400 cursor-pointer"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          {canManage ? (
                            <button
                              type="button"
                              onClick={() => handleDeleteSupplier(sup.supplierId)}
                              className="w-6 h-6 rounded-lg bims-card flex items-center justify-center text-zinc-400 hover:text-rose-400 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          ) : null}
                        </div>
                      </div>
                      <p className="font-semibold text-sm">{sup.name}</p>
                      <p className="text-[11px] text-amber-400 font-semibold mt-1">
                        Balance: Rs. {Number(sup.balance || 0).toLocaleString()} LKR
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-emerald-400">
                        <span>High Reliability</span>
                        <span className="flex items-center gap-1">
                          {[0, 1, 2, 3].map((d) => (
                            <span
                              key={d}
                              className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                            />
                          ))}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-between gap-2 py-1">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{sup.name}</p>
                        <p className="text-[11px] text-amber-400">
                          Rs. {Number(sup.balance || 0).toLocaleString()} LKR · {sup.onTimeRate}%
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEditSupplier(sup)}
                          className="w-6 h-6 rounded-lg bims-card flex items-center justify-center text-zinc-400 hover:text-violet-400 cursor-pointer"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        {canManage ? (
                          <button
                            type="button"
                            onClick={() => handleDeleteSupplier(sup.supplierId)}
                            className="w-6 h-6 rounded-lg bims-card flex items-center justify-center text-zinc-400 hover:text-rose-400 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              <button
                type="button"
                onClick={openAddSupplier}
                className="w-full py-2.5 rounded-xl border border-dashed border-zinc-600/60 text-xs font-medium text-zinc-400 hover:text-violet-400 hover:border-violet-500/50 transition-colors cursor-pointer"
              >
                + New Supplier
              </button>
            </div>
          </div>

          <div className="bims-card p-5">
            <CardHeader title="Outstanding Balances (LKR)" />
            <DotMatrixPair
              leftLabel={balanceMatrix.leftLabel}
              leftPercent={balanceMatrix.leftPercent}
              rightLabel={balanceMatrix.rightLabel}
              rightPercent={balanceMatrix.rightPercent}
            />
          </div>
        </div>

        {/* CENTER COLUMN */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bims-card p-5">
            <h3 className="text-base font-semibold tracking-tight mb-4">
              Purchase Order Workflow (LKR Rs.)
            </h3>
            <div className="space-y-3">
              {workflowStages.map((stage) => (
                <ProgressPillBar
                  key={stage.label}
                  label={stage.label}
                  percent={stage.percent}
                  rightLabel={stage.rightLabel}
                  tone={stage.tone}
                  showCheck={stage.showCheck}
                />
              ))}
            </div>

            {purchaseOrders.length > 0 ? (
              <div className="mt-4 pt-3 border-t border-zinc-800/40 space-y-2">
                {purchaseOrders.slice(0, 3).map((po) => (
                  <div
                    key={po.poId}
                    className="bims-subcard px-3 py-2 flex items-center justify-between text-xs gap-2"
                  >
                    <div className="min-w-0">
                      <span className="font-bold text-violet-400">{po.poNumber}</span> ·{' '}
                      <span className="font-medium">{po.supplierName}</span>
                      <p className="text-[11px] text-zinc-400">
                        {po.productName} ({po.orderedQty} kg) —{' '}
                        <strong className="text-amber-400">
                          Rs. {Number(po.totalAmount).toLocaleString()} LKR
                        </strong>{' '}
                        [{po.status}]
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {canManage ? (
                        <select
                          aria-label={`PO status for ${po.poNumber}`}
                          value={po.status}
                          onChange={(e) => handleApprovePo(po.poId, e.target.value)}
                          className="px-2 py-1 rounded-lg bims-card text-[10px] font-semibold text-emerald-400 cursor-pointer focus:outline-none"
                        >
                          <option value="PENDING_APPROVAL" className="bg-zinc-900 text-white">PENDING</option>
                          <option value="APPROVED" className="bg-zinc-900 text-white">APPROVED</option>
                          <option value="ORDERED" className="bg-zinc-900 text-white">ORDERED</option>
                          <option value="RECEIVED" className="bg-zinc-900 text-white">RECEIVED</option>
                        </select>
                      ) : null}
                      {canManage && po.status === 'PENDING_APPROVAL' ? (
                        <button
                          type="button"
                          onClick={() => handleApprovePo(po.poId, 'APPROVED')}
                          title="Approve PO"
                          className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center hover:bg-emerald-500 hover:text-white cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => openEditPo(po)}
                        title="Edit PO"
                        className="w-6 h-6 rounded-lg bims-card flex items-center justify-center text-zinc-400 hover:text-violet-400 cursor-pointer"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      {canManage ? (
                        <button
                          type="button"
                          onClick={() => handleDeletePo(po.poId)}
                          title="Delete PO"
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
                <h3 className="text-base font-semibold tracking-tight">BIMS Assistant</h3>
                <span className="w-7 h-7 rounded-full bims-subcard flex items-center justify-center text-zinc-400">
                  <FileText className="w-3.5 h-3.5" />
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-end">
                  <div className="rounded-2xl rounded-br-sm bg-violet-600 text-white px-4 py-2.5 max-w-xs">
                    Can you suggest top suppliers for cardamom?
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-violet-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="w-3.5 h-3.5" />
                  </span>
                  <div className="bims-subcard p-3.5 flex-1 space-y-1">
                    <p className="text-zinc-400">Based on historical delivery and quality:</p>
                    <p className="font-medium">• Matale Organic Estates (94% rating)</p>
                    <p className="font-medium">• Kandy Highland Growers (92% rating)</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-violet-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="w-3.5 h-3.5" />
                  </span>
                  <div className="bims-subcard p-3.5 flex-1 space-y-1">
                    <p className="font-semibold">Which suppliers are pending PO approvals?</p>
                    <p className="text-zinc-400">The following LKR POs are pending approval:</p>
                    {pendingPos.length > 0 ? (
                      pendingPos.map((po) => (
                        <p key={po.poId} className="font-medium">
                          • {po.supplierName} ({po.poNumber} — Rs.{' '}
                          {Number(po.totalAmount).toLocaleString()})
                        </p>
                      ))
                    ) : (
                      <p className="font-medium text-emerald-400">All POs approved!</p>
                    )}
                  </div>
                </div>
                {assistantNote ? (
                  <div className="flex items-start gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles className="w-3.5 h-3.5" />
                    </span>
                    <div className="bims-subcard p-3.5 flex-1 whitespace-pre-line">
                      <p className="font-semibold text-emerald-400 mb-1">
                        Query: {assistantNote.query}
                      </p>
                      <p>{assistantNote.reply}</p>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <InlineAssistantBar
              placeholder="Ask AI about LKR suppliers or pending POs..."
              defaultPrompt="Which Sri Lankan suppliers have pending LKR PO approvals?"
              actionLabel="Report PDF"
              onActionClick={() =>
                downloadApiFile('/reports/export/pdf', 'ceylon-spices-bims-executive-report.pdf')
              }
              showInlineReply={false}
              onReply={(reply, query) => setAssistantNote({ reply, query })}
            />
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-3 space-y-5">
          <div className="bims-card p-5">
            <CardHeader title="Supplier Performance" />
            <RadialTickGauge
              valueText={`${performanceRating}%`}
              subText="rating"
              percent={performanceRating}
              accent="emerald"
              footerLeft="On-time Delivery"
              footerRight="Verified"
            />
          </div>

          <VioletActionCard
            title={'Purchase\nOrder\nGenerator'}
            buttonLabel="+ Create Purchase Order"
            onPrimaryClick={openCreatePo}
          />
        </div>
      </div>

      {/* CREATE / EDIT SUPPLIER MODAL */}
      {showSupplierModal ? (
        <div className="fixed inset-0 z-50 bg-black/65 flex items-center justify-center p-4">
          <div className="bims-card w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">
                {editingSupplier ? 'Edit Sri Lankan Supplier' : 'Add Spice Supplier (LKR)'}
              </h3>
              <button
                type="button"
                onClick={() => setShowSupplierModal(false)}
                className="w-7 h-7 rounded-full bims-subcard flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveSupplier} className="space-y-3 text-xs">
              <div>
                <label className="block mb-1 font-medium">Supplier Name</label>
                <input
                  required
                  value={supplierForm.name}
                  onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                  className="w-full rounded-xl bims-input px-3.5 py-2.5"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-medium">Contact Email</label>
                  <input
                    type="email"
                    required
                    value={supplierForm.contactEmail}
                    onChange={(e) =>
                      setSupplierForm({ ...supplierForm, contactEmail: e.target.value })
                    }
                    className="w-full rounded-xl bims-input px-3.5 py-2.5"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-medium">Payment Terms</label>
                  <input
                    required
                    value={supplierForm.paymentTerms}
                    onChange={(e) =>
                      setSupplierForm({ ...supplierForm, paymentTerms: e.target.value })
                    }
                    className="w-full rounded-xl bims-input px-3.5 py-2.5"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-medium">Outstanding Balance (Rs. LKR)</label>
                  <input
                    type="number"
                    required
                    value={supplierForm.balance}
                    onChange={(e) =>
                      setSupplierForm({ ...supplierForm, balance: e.target.value })
                    }
                    className="w-full rounded-xl bims-input px-3.5 py-2.5"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-medium">On-Time Delivery (%)</label>
                  <input
                    type="number"
                    required
                    value={supplierForm.onTimeRate}
                    onChange={(e) =>
                      setSupplierForm({ ...supplierForm, onTimeRate: e.target.value })
                    }
                    className="w-full rounded-xl bims-input px-3.5 py-2.5"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-full bg-violet-600 hover:bg-violet-500 text-white font-semibold mt-2 cursor-pointer"
              >
                {editingSupplier ? 'Update Supplier' : 'Save Supplier'}
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {/* CREATE / EDIT PO MODAL */}
      {showPoModal ? (
        <div className="fixed inset-0 z-50 bg-black/65 flex items-center justify-center p-4">
          <div className="bims-card w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">
                {editingPo ? 'Edit Purchase Order (LKR)' : 'Create Purchase Order (LKR)'}
              </h3>
              <button
                type="button"
                onClick={() => setShowPoModal(false)}
                className="w-7 h-7 rounded-full bims-subcard flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSavePo} className="space-y-3 text-xs">
              <div>
                <label className="block mb-1 font-medium">Supplier</label>
                <select
                  value={poForm.supplierId}
                  onChange={(e) => setPoForm({ ...poForm, supplierId: Number(e.target.value) })}
                  className="w-full rounded-xl bims-input px-3.5 py-2.5"
                >
                  {suppliers.map((s) => (
                    <option key={s.supplierId} value={s.supplierId} className="bg-zinc-900 text-white">
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block mb-1 font-medium">Spice Commodity</label>
                <input
                  required
                  value={poForm.productName}
                  onChange={(e) => setPoForm({ ...poForm, productName: e.target.value })}
                  className="w-full rounded-xl bims-input px-3.5 py-2.5"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-medium">Ordered Qty (kg)</label>
                  <input
                    type="number"
                    required
                    value={poForm.orderedQty}
                    onChange={(e) => setPoForm({ ...poForm, orderedQty: e.target.value })}
                    className="w-full rounded-xl bims-input px-3.5 py-2.5"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-medium">Total Amount (Rs. LKR)</label>
                  <input
                    type="number"
                    required
                    value={poForm.totalAmount}
                    onChange={(e) => setPoForm({ ...poForm, totalAmount: e.target.value })}
                    className="w-full rounded-xl bims-input px-3.5 py-2.5"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-full bg-violet-600 hover:bg-violet-500 text-white font-semibold mt-2 cursor-pointer"
              >
                {editingPo ? 'Update Purchase Order' : 'Submit PO for Approval'}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
