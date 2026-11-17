import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { FileText, Pencil, Trash2, X } from 'lucide-react';
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

const EMPTY_DECLARATION = {
  title: 'Ceylon Cloves to France',
  type: 'EXPORT',
  currency: 'USD',
  status: 'IN_TRANSIT',
  hsCode: '0907.10',
  incoterms: 'CIF Marseille',
  dutyRate: 0,
  destinationCountry: 'France',
  totalValue: 31500,
  partnerName: 'Parisian Spice House',
};

export default function ShipmentsPage() {
  const { user } = useSelector((state) => state.auth);
  const canDelete = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const [bundle, setBundle] = useState(null);
  const [selectedTxnId, setSelectedTxnId] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingTxn, setEditingTxn] = useState(null);
  const [form, setForm] = useState(EMPTY_DECLARATION);

  useEffect(() => {
    api
      .get('/shipments')
      .then(({ data }) => {
        setBundle(data);
        if (data.transactions?.[0]) {
          setSelectedTxnId(data.transactions[0].txnId);
        }
      })
      .catch(() => {});
  }, []);

  const openCreateModal = () => {
    setEditingTxn(null);
    setForm(EMPTY_DECLARATION);
    setShowModal(true);
  };

  const openEditModal = (txn, e) => {
    e.stopPropagation();
    setEditingTxn(txn);
    setForm({
      title: txn.title,
      type: txn.type || 'EXPORT',
      currency: txn.currency || 'USD',
      status: txn.status || 'IN_TRANSIT',
      hsCode: txn.hsCode || '0906.11',
      incoterms: txn.incoterms || 'FOB Colombo',
      dutyRate: txn.dutyRate || 0,
      destinationCountry: txn.destinationCountry || 'USA',
      totalValue: txn.totalValue || 25000,
      partnerName: txn.partnerName || '',
    });
    setShowModal(true);
  };

  const handleSaveDeclaration = async (e) => {
    e.preventDefault();
    if (editingTxn) {
      const { data } = await api.put(`/shipments/${editingTxn.txnId}`, form);
      setBundle(data);
    } else {
      const { data } = await api.post('/shipments', form);
      setBundle(data);
    }
    setShowModal(false);
    setEditingTxn(null);
  };

  const handleDeleteDeclaration = async (txnId, e) => {
    e.stopPropagation();
    if (!canDelete) return;
    const { data } = await api.delete(`/shipments/${txnId}`);
    setBundle(data);
  };

  const handleStatusChange = async (txnId, status, e) => {
    e.stopPropagation();
    const { data } = await api.patch(`/shipments/${txnId}/status`, { status });
    setBundle(data);
  };

  const handleDownloadPdf = (docType) => {
    window.open(`/api/documents/pdf/${selectedTxnId}/${docType}`, '_blank');
  };

  const transactions = bundle?.transactions || [];
  const statusBreakdown = bundle?.statusBreakdown || [];
  const fulfillmentScore = bundle?.fulfillmentScore ?? 0;
  const docs = bundle?.documentsRepository || [
    { docType: 'COMMERCIAL_INVOICE', title: 'Commercial Invoice', code: 'PDF' },
    { docType: 'PACKING_LIST', title: 'Packing List', code: 'PDF' },
    { docType: 'BILL_OF_LADING', title: 'Bill of Lading', code: 'PDF' },
    { docType: 'CERTIFICATE_OF_ORIGIN', title: 'Certificate of Origin', code: 'PDF' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* LEFT COLUMN */}
        <div className="lg:col-span-4 space-y-5">
          <div className="bims-card p-5">
            <h3 className="text-base font-semibold tracking-tight mb-4">
              Export &amp; Import Declarations
            </h3>

            <div className="space-y-3">
              {transactions.map((txn, idx) => {
                const isSelected = txn.txnId === selectedTxnId;
                const valFormatted =
                  txn.currency === 'LKR'
                    ? `Rs. ${Number(txn.totalValue).toLocaleString()} LKR`
                    : `$${Number(txn.totalValue).toLocaleString()} USD`;

                return (
                  <div
                    key={txn.txnId}
                    onClick={() => setSelectedTxnId(txn.txnId)}
                    className={`bims-subcard p-3.5 cursor-pointer transition-all ${
                      isSelected ? 'ring-2 ring-violet-500/70' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-violet-600 text-white">
                        {txn.badge || 'Active Inspection'}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => openEditModal(txn, e)}
                          title="Edit Declaration"
                          className="w-6 h-6 rounded-lg bims-card flex items-center justify-center text-zinc-400 hover:text-violet-400 cursor-pointer"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        {canDelete ? (
                          <button
                            type="button"
                            onClick={(e) => handleDeleteDeclaration(txn.txnId, e)}
                            title="Delete Declaration"
                            className="w-6 h-6 rounded-lg bims-card flex items-center justify-center text-zinc-400 hover:text-rose-400 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        ) : null}
                      </div>
                    </div>

                    <p className="font-semibold text-sm">{txn.title}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      HS Code {txn.hsCode} ·{' '}
                      <strong
                        className={
                          txn.currency === 'LKR' ? 'text-amber-400' : 'text-emerald-400'
                        }
                      >
                        {valFormatted}
                      </strong>
                    </p>

                    {idx === 0 || isSelected ? (
                      <div className="flex flex-wrap items-center gap-1.5 mt-3">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bims-card">
                          {txn.incoterms}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/20 text-amber-400">
                          Duty Rate {txn.dutyRate}%
                        </span>
                        <select
                          aria-label={`Shipment status for ${txn.txnNumber}`}
                          value={txn.status}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => handleStatusChange(txn.txnId, e.target.value, e)}
                          className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 cursor-pointer focus:outline-none"
                        >
                          <option value="PENDING" className="bg-zinc-900 text-white">PENDING</option>
                          <option value="IN_TRANSIT" className="bg-zinc-900 text-white">IN_TRANSIT</option>
                          <option value="AT_CUSTOMS" className="bg-zinc-900 text-white">AT_CUSTOMS</option>
                          <option value="DELIVERED" className="bg-zinc-900 text-white">DELIVERED</option>
                        </select>
                      </div>
                    ) : null}
                  </div>
                );
              })}

              <button
                type="button"
                onClick={openCreateModal}
                className="w-full py-2.5 rounded-xl border border-dashed border-zinc-600/60 text-xs font-medium text-zinc-400 hover:text-violet-400 hover:border-violet-500/50 transition-colors cursor-pointer"
              >
                + New Declaration
              </button>
            </div>
          </div>

          <div className="bims-card p-5">
            <CardHeader title="Documents Log" />
            <DotMatrixPair
              leftLabel="Cinnamon"
              leftPercent={37}
              rightLabel="Black Pepper"
              rightPercent={86}
            />
          </div>
        </div>

        {/* CENTER COLUMN */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bims-card p-5">
            <h3 className="text-base font-semibold tracking-tight mb-4">
              Live Shipment Status
            </h3>
            <div className="space-y-3">
              {statusBreakdown.map((stage) => (
                <ProgressPillBar
                  key={stage.status}
                  label={stage.label}
                  percent={stage.percent}
                  rightLabel={stage.rightLabel}
                  tone={stage.tone}
                  showCheck={stage.showCheck}
                />
              ))}
            </div>
          </div>

          <div className="bims-card p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold tracking-tight">
                  Trade Document Repository
                </h3>
                <span className="w-7 h-7 rounded-full bims-subcard flex items-center justify-center text-zinc-400">
                  <FileText className="w-3.5 h-3.5" />
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                {docs.map((doc) => (
                  <PdfDocCard
                    key={doc.docType}
                    title={doc.title}
                    badge={doc.code}
                    onClick={() => handleDownloadPdf(doc.docType)}
                  />
                ))}
              </div>
            </div>

            <InlineAssistantBar
              placeholder="Ask AI about shipments, HS codes, or customs..."
              defaultPrompt="Show active import and export shipments"
              actionLabel="Bundle"
              onActionClick={() => handleDownloadPdf('BUNDLE')}
            />
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-3 space-y-5">
          <div className="bims-card p-5">
            <CardHeader title="Fulfillment Score" />
            <RadialTickGauge
              valueText={`${fulfillmentScore}%`}
              subText="rating"
              percent={fulfillmentScore}
              accent="emerald"
            />
          </div>

          <VioletActionCard
            title={'Automated\nPDF\nGenerator'}
            buttonLabel="Download Bundle ↓"
            onPrimaryClick={() => handleDownloadPdf('BUNDLE')}
          />
        </div>
      </div>

      {/* CREATE / EDIT DECLARATION MODAL */}
      {showModal ? (
        <div className="fixed inset-0 z-50 bg-black/65 flex items-center justify-center p-4">
          <div className="bims-card w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">
                {editingTxn ? 'Edit Trade Declaration' : 'New Import / Export Declaration'}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="w-7 h-7 rounded-full bims-subcard flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveDeclaration} className="space-y-3 text-xs">
              <div>
                <label className="block mb-1 font-medium">Declaration Title</label>
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full rounded-xl bims-input px-3.5 py-2.5"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-medium">Trade Type &amp; Currency</label>
                  <select
                    value={form.type}
                    onChange={(e) => {
                      const t = e.target.value;
                      setForm({
                        ...form,
                        type: t,
                        currency: t === 'EXPORT' ? 'USD' : 'LKR',
                      });
                    }}
                    className="w-full rounded-xl bims-input px-3.5 py-2.5"
                  >
                    <option value="EXPORT" className="bg-zinc-900 text-white">
                      Export (USD $)
                    </option>
                    <option value="IMPORT" className="bg-zinc-900 text-white">
                      Local / Import (LKR Rs.)
                    </option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1 font-medium">Shipment Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full rounded-xl bims-input px-3.5 py-2.5"
                  >
                    <option value="PENDING" className="bg-zinc-900 text-white">Pending</option>
                    <option value="IN_TRANSIT" className="bg-zinc-900 text-white">In Transit</option>
                    <option value="AT_CUSTOMS" className="bg-zinc-900 text-white">At Customs</option>
                    <option value="DELIVERED" className="bg-zinc-900 text-white">Delivered</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-medium">HS Code</label>
                  <input
                    required
                    value={form.hsCode}
                    onChange={(e) => setForm({ ...form, hsCode: e.target.value })}
                    className="w-full rounded-xl bims-input px-3.5 py-2.5"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-medium">Incoterms</label>
                  <input
                    required
                    value={form.incoterms}
                    onChange={(e) => setForm({ ...form, incoterms: e.target.value })}
                    className="w-full rounded-xl bims-input px-3.5 py-2.5"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-medium">Duty Rate (%)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={form.dutyRate}
                    onChange={(e) => setForm({ ...form, dutyRate: e.target.value })}
                    className="w-full rounded-xl bims-input px-3.5 py-2.5"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-medium">
                    Declared Value ({form.currency})
                  </label>
                  <input
                    type="number"
                    required
                    value={form.totalValue}
                    onChange={(e) => setForm({ ...form, totalValue: e.target.value })}
                    className="w-full rounded-xl bims-input px-3.5 py-2.5"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-full bg-violet-600 hover:bg-violet-500 text-white font-semibold mt-2 cursor-pointer"
              >
                {editingTxn ? 'Update Declaration' : 'Create Declaration & Generate PDFs'}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
