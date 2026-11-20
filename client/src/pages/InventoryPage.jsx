import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  AlertTriangle,
  FileText,
  ImagePlus,
  Minus,
  Pencil,
  Plus,
  Trash2,
  Upload,
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

const EMPTY_SKU = {
  sku: 'SKU-GIN-08',
  name: 'Dry Cochin Ginger Slices',
  category: 'Ginger',
  hsCode: '0910.11',
  originRegion: 'Kurunegala & Kandy',
  unitPrice: 26,
  unitPriceLkr: 7800,
  stockQty: 280,
  reorderLevel: 120,
};

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function InventoryPage() {
  const { user } = useSelector((state) => state.auth);
  const canDelete = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const [bundle, setBundle] = useState(null);
  const [currencyView, setCurrencyView] = useState('BOTH'); // BOTH | USD | LKR
  const [auditFilter, setAuditFilter] = useState('ALL'); // ALL | STOCK_IN | STOCK_OUT
  const [showSkuModal, setShowSkuModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [skuForm, setSkuForm] = useState(EMPTY_SKU);
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');
  const [clearExistingImage, setClearExistingImage] = useState(false);
  const [skuError, setSkuError] = useState('');
  const [moveForm, setMoveForm] = useState({
    productId: 1,
    movementType: 'STOCK_IN',
    quantity: 200,
    referenceNote: 'Warehouse replenishment batch',
  });

  useEffect(() => {
    api
      .get('/inventory')
      .then(({ data }) => setBundle(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    return () => {
      if (imagePreviewUrl && imagePreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  const resetImageSelection = (nextPreview = '') => {
    if (imagePreviewUrl && imagePreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setSelectedImageFile(null);
    setImagePreviewUrl(nextPreview);
  };

  const openCreateModal = () => {
    setEditingProduct(null);
    setSkuForm(EMPTY_SKU);
    setClearExistingImage(false);
    setSkuError('');
    resetImageSelection('');
    setShowSkuModal(true);
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setSkuForm({
      sku: product.sku,
      name: product.name,
      category: product.category || 'Spices',
      hsCode: product.hsCode || '0906.11',
      originRegion: product.originRegion || 'Sri Lanka',
      unitPrice: product.unitPrice,
      unitPriceLkr: product.unitPriceLkr || product.unitPrice * 300,
      stockQty: product.stockQty,
      reorderLevel: product.reorderLevel || 150,
    });
    setClearExistingImage(false);
    setSkuError('');
    resetImageSelection(product.imageUrl || '');
    setShowSkuModal(true);
  };

  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setSkuError('Please select a JPEG, PNG, or WebP image from your device.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setSkuError('Image size must be 4 MB or smaller.');
      return;
    }

    setSkuError('');
    setClearExistingImage(false);
    if (imagePreviewUrl && imagePreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setSelectedImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
  };

  const handleRemoveImage = () => {
    resetImageSelection('');
    setClearExistingImage(true);
    setSkuError('');
  };

  const handleSaveSku = async (e) => {
    e.preventDefault();
    setSkuError('');

    const formData = new FormData();
    Object.entries(skuForm).forEach(([key, value]) => {
      formData.append(key, String(value ?? ''));
    });
    if (selectedImageFile) {
      formData.append('image', selectedImageFile);
    }
    if (clearExistingImage) {
      formData.append('clearImage', 'true');
    }

    try {
      if (editingProduct) {
        const { data } = await api.put(
          `/inventory/products/${editingProduct.productId}`,
          formData
        );
        setBundle(data);
      } else {
        const { data } = await api.post('/inventory/products', formData);
        setBundle(data);
      }
      resetImageSelection('');
      setShowSkuModal(false);
      setEditingProduct(null);
    } catch (err) {
      setSkuError(err.response?.data?.error || 'Unable to save spice SKU.');
    }
  };

  const handleDeleteSku = async (productId) => {
    if (!canDelete) return;
    const { data } = await api.delete(`/inventory/products/${productId}`);
    setBundle(data);
  };

  const handleRecordMovement = async (e) => {
    e.preventDefault();
    const { data } = await api.post('/inventory/movements', moveForm);
    setBundle(data);
    setShowMoveModal(false);
  };

  const products = bundle?.products || [];
  const auditTrail = bundle?.auditTrail || [];
  const stockAlerts = bundle?.stockAlerts || [];
  const stockMatrix = bundle?.stockMatrix || {
    leftLabel: 'Cinnamon',
    leftPercent: 57,
    rightLabel: 'Black Pepper',
    rightPercent: 86,
  };
  const optimalScore = bundle?.optimalScore ?? 94;
  const lowStockCount = bundle?.lowStockCount ?? 0;
  const fifoValuation = bundle?.fifoValuation || 142000;
  const fifoValuationLkr = bundle?.fifoValuationLkr || 42600000;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* LEFT COLUMN */}
        <div className="lg:col-span-4 space-y-5">
          <div className="bims-card p-5">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h3 className="text-base font-semibold tracking-tight">
                Spice Product Catalog ({products.length})
              </h3>
              <div className="flex items-center gap-1 rounded-full bims-subcard p-0.5 text-[10px] font-semibold">
                {['BOTH', 'USD', 'LKR'].map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setCurrencyView(mode)}
                    className={`px-2 py-0.5 rounded-full cursor-pointer ${
                      currencyView === mode ? 'bg-violet-600 text-white' : 'text-zinc-400'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {products.map((item) => {
                const badgeClass =
                  item.badgeTone === 'violet'
                    ? 'bg-violet-600 text-white'
                    : item.badgeTone === 'amber'
                    ? 'bg-orange-500 text-white'
                    : 'bg-emerald-600 text-white';

                return (
                  <div key={item.productId} className="bims-subcard p-3.5">
                    <div className="flex items-start gap-3">
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-12 h-12 rounded-xl object-cover border border-zinc-700/40 shrink-0"
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-sm truncate">{item.name}</p>
                            <p className="text-[11px] text-zinc-400">
                              {item.sku} · HS {item.hsCode || '0906.11'}
                            </p>
                          </div>
                          <span className="text-xs font-bold text-zinc-300 shrink-0">
                            {item.stockQty} kg
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px]">
                          {currencyView !== 'LKR' ? (
                            <span className="text-emerald-400 font-semibold">
                              Export: ${item.unitPrice}/kg
                            </span>
                          ) : null}
                          {currencyView !== 'USD' ? (
                            <span className="text-amber-400 font-semibold">
                              Local: Rs.{' '}
                              {Number(
                                item.unitPriceLkr || item.unitPrice * 300
                              ).toLocaleString()}
                              /kg
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-zinc-800/30">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${badgeClass}`}
                      >
                        {item.badge}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <div className="flex items-center gap-1 mr-1">
                          {[0, 1, 2, 3].map((dot) => (
                            <span
                              key={dot}
                              className={`w-1.5 h-1.5 rounded-full ${
                                dot < (item.dots || 2) ? 'bg-orange-400' : 'bg-zinc-600/50'
                              }`}
                            />
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          title="Edit Spice SKU"
                          className="w-6 h-6 rounded-lg bims-card flex items-center justify-center text-zinc-400 hover:text-violet-400 cursor-pointer"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>

                        {canDelete ? (
                          <button
                            type="button"
                            onClick={() => handleDeleteSku(item.productId)}
                            title="Delete Spice SKU"
                            className="w-6 h-6 rounded-lg bims-card flex items-center justify-center text-zinc-400 hover:text-rose-400 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={openCreateModal}
                className="w-full py-2.5 rounded-xl border border-dashed border-zinc-600/60 text-xs font-medium text-zinc-400 hover:text-violet-400 hover:border-violet-500/50 transition-colors cursor-pointer"
              >
                + Add New Spice
              </button>
            </div>
          </div>

          <div className="bims-card p-5">
            <CardHeader title="Stock Levels" />
            <DotMatrixPair
              leftLabel={stockMatrix.leftLabel}
              leftPercent={stockMatrix.leftPercent}
              rightLabel={stockMatrix.rightLabel}
              rightPercent={stockMatrix.rightPercent}
            />
          </div>
        </div>

        {/* CENTER COLUMN */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bims-card p-5">
            <h3 className="text-base font-semibold tracking-tight mb-4">
              Real-Time Stock &amp; Reorder Alerts
            </h3>

            <div className="space-y-3">
              {stockAlerts.map((alert) => (
                <ProgressPillBar
                  key={alert.productId}
                  label={alert.label}
                  percent={alert.percent}
                  rightLabel={alert.rightLabel}
                  tone={alert.tone}
                />
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between text-xs text-orange-400">
              <span className="flex items-center gap-1.5 font-medium">
                <AlertTriangle className="w-3.5 h-3.5" />
                {lowStockCount > 0
                  ? `${lowStockCount} SKU${lowStockCount > 1 ? 's' : ''} below reorder threshold`
                  : 'All SKUs above reorder threshold'}
              </span>
              <button
                type="button"
                onClick={() => setShowMoveModal(true)}
                className="text-violet-400 hover:underline font-medium cursor-pointer"
              >
                + Record Stock Movement
              </button>
            </div>
          </div>

          <div className="bims-card p-5 flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <h3 className="text-base font-semibold tracking-tight">
                  Stock-In / Stock-Out Audit Trail
                </h3>
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-1 rounded-full bims-subcard p-0.5 text-[10px] font-semibold">
                    {[
                      { id: 'ALL', label: 'All' },
                      { id: 'STOCK_IN', label: 'In' },
                      { id: 'STOCK_OUT', label: 'Out' },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setAuditFilter(tab.id)}
                        className={`px-2 py-0.5 rounded-full cursor-pointer ${
                          auditFilter === tab.id ? 'bg-violet-600 text-white' : 'text-zinc-400'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowMoveModal(true)}
                    className="w-7 h-7 rounded-full bims-subcard flex items-center justify-center text-zinc-400 hover:text-violet-400 cursor-pointer"
                    title="Record Movement"
                  >
                    <FileText className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="space-y-3.5">
                {auditTrail
                  .filter((log) => auditFilter === 'ALL' || log.movementType === auditFilter)
                  .slice(0, 4)
                  .map((log) => {
                  const isIn = log.movementType === 'STOCK_IN';
                  return (
                    <div
                      key={log.logId}
                      className="flex items-start gap-3 pb-3 border-b border-zinc-800/40 last:border-none"
                    >
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                          isIn
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : 'bg-orange-500/15 text-orange-400'
                        }`}
                      >
                        {isIn ? (
                          <Plus className="w-3.5 h-3.5" />
                        ) : (
                          <Minus className="w-3.5 h-3.5" />
                        )}
                      </span>

                      <div className="flex-1 text-xs">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold text-white ${
                              isIn ? 'bg-emerald-500' : 'bg-orange-500'
                            }`}
                          >
                            {isIn ? `+ ${log.quantity} kg` : `- ${log.quantity} kg`}
                          </span>
                          <span className="font-medium">{log.productName} -</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                              isIn
                                ? 'bg-emerald-500/15 text-emerald-400'
                                : 'bg-amber-500/15 text-amber-400'
                            }`}
                          >
                            {isIn ? 'Stock-in' : 'Stock-out'}
                          </span>
                        </div>
                        <p className="text-zinc-400 mt-1">{log.logDate}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <InlineAssistantBar
              placeholder="Ask AI about stock levels or export PDF..."
              defaultPrompt="Show low-stock Sri Lankan spices & prices in USD and LKR"
              actionLabel="PDF"
              onActionClick={() =>
                downloadApiFile('/reports/export/pdf', 'ceylon-spices-bims-executive-report.pdf')
              }
            />
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-3 space-y-5">
          <div className="bims-card p-5">
            <h3 className="text-base font-semibold tracking-tight mb-2">
              FIFO Inventory Valuation
            </h3>
            <RadialTickGauge
              valueText={`$${Math.round(fifoValuation / 1000)}K`}
              subText={`Rs. ${(fifoValuationLkr / 1000000).toFixed(1)}M LKR`}
              percent={optimalScore}
              accent="cyan"
              footerLeft="healthy SKU ratio"
              footerRight={`${optimalScore}% optimal`}
            />
          </div>

          <VioletActionCard
            title={'Add New\nSpice SKU'}
            buttonLabel="+ Add SKU"
            onPrimaryClick={openCreateModal}
          />
        </div>
      </div>

      {/* CREATE / EDIT SKU MODAL */}
      {showSkuModal ? (
        <div className="fixed inset-0 z-50 bg-black/65 flex items-center justify-center p-4">
          <div className="bims-card w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">
                {editingProduct ? 'Edit Spice SKU' : 'Add New Spice SKU'}
              </h3>
              <button
                type="button"
                onClick={() => setShowSkuModal(false)}
                className="w-7 h-7 rounded-full bims-subcard flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveSku} className="space-y-3 text-xs">
              {skuError ? (
                <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 px-3 py-2 text-rose-400">
                  {skuError}
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-medium">SKU Code</label>
                  <input
                    required
                    value={skuForm.sku}
                    onChange={(e) => setSkuForm({ ...skuForm, sku: e.target.value })}
                    className="w-full rounded-xl bims-input px-3.5 py-2.5"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-medium">HS Code</label>
                  <input
                    value={skuForm.hsCode}
                    onChange={(e) => setSkuForm({ ...skuForm, hsCode: e.target.value })}
                    className="w-full rounded-xl bims-input px-3.5 py-2.5"
                  />
                </div>
              </div>
              <div>
                <label className="block mb-1 font-medium">Spice Product Name</label>
                <input
                  required
                  value={skuForm.name}
                  onChange={(e) => setSkuForm({ ...skuForm, name: e.target.value })}
                  className="w-full rounded-xl bims-input px-3.5 py-2.5"
                />
              </div>
              <div>
                <label className="block mb-1.5 font-medium">
                  Product Image (Upload from Device — PNG, JPG, WebP up to 4 MB)
                </label>
                <div className="bims-subcard p-3 flex items-center gap-3">
                  {imagePreviewUrl ? (
                    <img
                      src={imagePreviewUrl}
                      alt="Product preview"
                      className="w-14 h-14 rounded-xl object-cover border border-zinc-700/40 shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bims-card flex items-center justify-center text-zinc-400 shrink-0">
                      <ImagePlus className="w-5 h-5" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-600 hover:bg-violet-500 text-white font-semibold cursor-pointer">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{imagePreviewUrl ? 'Change Image' : 'Upload from Device'}</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          aria-label="Upload Product Image from Device"
                          onChange={handleImageFileChange}
                          className="hidden"
                        />
                      </label>

                      {imagePreviewUrl ? (
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="px-2.5 py-1.5 rounded-full bims-card text-zinc-400 hover:text-rose-400 font-medium cursor-pointer"
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>

                    <p className="text-[11px] text-zinc-400 truncate">
                      {selectedImageFile
                        ? `${selectedImageFile.name} (${Math.round(selectedImageFile.size / 1024)} KB)`
                        : clearExistingImage
                        ? 'Will use built-in spice artwork'
                        : 'Optional — uses spice artwork if no file selected'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-medium">Export Price ($ USD/kg)</label>
                  <input
                    type="number"
                    required
                    value={skuForm.unitPrice}
                    onChange={(e) => {
                      const usd = Number(e.target.value);
                      setSkuForm({
                        ...skuForm,
                        unitPrice: usd,
                        unitPriceLkr: Math.round(usd * 300),
                      });
                    }}
                    className="w-full rounded-xl bims-input px-3.5 py-2.5"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-medium">Local Price (Rs. LKR/kg)</label>
                  <input
                    type="number"
                    required
                    value={skuForm.unitPriceLkr}
                    onChange={(e) =>
                      setSkuForm({ ...skuForm, unitPriceLkr: Number(e.target.value) })
                    }
                    className="w-full rounded-xl bims-input px-3.5 py-2.5"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-medium">Stock Quantity (kg)</label>
                  <input
                    type="number"
                    required
                    value={skuForm.stockQty}
                    onChange={(e) => setSkuForm({ ...skuForm, stockQty: e.target.value })}
                    className="w-full rounded-xl bims-input px-3.5 py-2.5"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-medium">Reorder Threshold (kg)</label>
                  <input
                    type="number"
                    required
                    value={skuForm.reorderLevel}
                    onChange={(e) => setSkuForm({ ...skuForm, reorderLevel: e.target.value })}
                    className="w-full rounded-xl bims-input px-3.5 py-2.5"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-full bg-violet-600 hover:bg-violet-500 text-white font-semibold mt-2 cursor-pointer"
              >
                {editingProduct ? 'Update Spice SKU' : 'Save Spice SKU'}
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {/* STOCK MOVEMENT MODAL */}
      {showMoveModal ? (
        <div className="fixed inset-0 z-50 bg-black/65 flex items-center justify-center p-4">
          <div className="bims-card w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Record Stock-In / Stock-Out</h3>
              <button
                type="button"
                onClick={() => setShowMoveModal(false)}
                className="w-7 h-7 rounded-full bims-subcard flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleRecordMovement} className="space-y-3 text-xs">
              <div>
                <label className="block mb-1 font-medium">Spice Product</label>
                <select
                  value={moveForm.productId}
                  onChange={(e) =>
                    setMoveForm({ ...moveForm, productId: Number(e.target.value) })
                  }
                  className="w-full rounded-xl bims-input px-3.5 py-2.5"
                >
                  {products.map((p) => (
                    <option key={p.productId} value={p.productId} className="bg-zinc-900 text-white">
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-medium">Movement Type</label>
                  <select
                    value={moveForm.movementType}
                    onChange={(e) => setMoveForm({ ...moveForm, movementType: e.target.value })}
                    className="w-full rounded-xl bims-input px-3.5 py-2.5"
                  >
                    <option value="STOCK_IN" className="bg-zinc-900 text-white">
                      Stock-In (+)
                    </option>
                    <option value="STOCK_OUT" className="bg-zinc-900 text-white">
                      Stock-Out (-)
                    </option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1 font-medium">Quantity (kg)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={moveForm.quantity}
                    onChange={(e) => setMoveForm({ ...moveForm, quantity: e.target.value })}
                    className="w-full rounded-xl bims-input px-3.5 py-2.5"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold mt-2 cursor-pointer"
              >
                Record Audit Movement
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
