import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  Download,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Lock,
  Pencil,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  CardHeader,
  ProgressPillBar,
  RadialTickGauge,
  VioletActionCard,
} from '../components/BentoWidgets';
import InlineAssistantBar from '../components/InlineAssistantBar';
import { api, downloadApiFile, fetchApiBlobUrl } from '../services/api';

const DOC_TYPES = [
  { value: 'CHEQUE', label: 'Cheque Scan', defaultCategory: 'FINANCIAL' },
  { value: 'BILL', label: 'Supplier Bill / Invoice', defaultCategory: 'FINANCIAL' },
  { value: 'RECEIPT', label: 'Payment Receipt / Slip', defaultCategory: 'FINANCIAL' },
  { value: 'SALES_INVOICE', label: 'Customer Sales Invoice', defaultCategory: 'FINANCIAL' },
  { value: 'PURCHASE_ORDER', label: 'Purchase Order Copy', defaultCategory: 'FINANCIAL' },
  { value: 'MANAGEMENT_RECORD', label: 'Management / Audit Record', defaultCategory: 'MANAGEMENT' },
  { value: 'COMMERCIAL_INVOICE', label: 'Commercial Invoice', defaultCategory: 'TRADE' },
  { value: 'PACKING_LIST', label: 'Packing List', defaultCategory: 'TRADE' },
  { value: 'BILL_OF_LADING', label: 'Bill of Lading', defaultCategory: 'TRADE' },
  { value: 'CERTIFICATE_OF_ORIGIN', label: 'Certificate of Origin', defaultCategory: 'TRADE' },
  { value: 'CUSTOMS_DECLARATION', label: 'Customs Declaration', defaultCategory: 'TRADE' },
  { value: 'OTHER', label: 'Other Record / Content', defaultCategory: 'INVENTORY' },
];

const CATEGORY_TABS = [
  { id: 'ALL', label: 'All Authorized' },
  { id: 'FINANCIAL', label: 'Financial (Cheques · Bills · Receipts)' },
  { id: 'TRADE', label: 'Trade & Customs' },
  { id: 'MANAGEMENT', label: 'Management' },
  { id: 'INVENTORY', label: 'Inventory' },
];

const DOC_TYPE_LABELS = Object.fromEntries(DOC_TYPES.map((d) => [d.value, d.label]));

const EMPTY_FORM = {
  title: '',
  docType: 'CHEQUE',
  category: 'FINANCIAL',
  accessLevel: 'MANAGER_ADMIN',
  referenceNo: '',
  amount: '',
  currency: 'LKR',
  txnId: '',
  notes: '',
};

function formatFileSize(bytes = 0) {
  if (!bytes) return '0 KB';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function AccessBadge({ accessLevel }) {
  if (accessLevel === 'ADMIN_ONLY') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/20 text-rose-500">
        <Lock className="w-2.5 h-2.5" />
        Admin Only
      </span>
    );
  }
  if (accessLevel === 'MANAGER_ADMIN') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-500">
        <Lock className="w-2.5 h-2.5" />
        Manager &amp; Admin
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-500">
      <ShieldCheck className="w-2.5 h-2.5" />
      All Staff
    </span>
  );
}

export default function DocumentsVaultPage() {
  const { user } = useSelector((state) => state.auth);
  const role = user?.role || 'STAFF';
  const isStaff = role === 'STAFF';
  const isAdmin = role === 'ADMIN';
  const isManagerOrAdmin = role === 'ADMIN' || role === 'MANAGER';

  const [bundle, setBundle] = useState(null);
  const [categoryTab, setCategoryTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewState, setPreviewState] = useState(null);
  const [previewLoadingId, setPreviewLoadingId] = useState(null);
  const [previewError, setPreviewError] = useState('');
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedFile, setSelectedFile] = useState(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api
      .get('/documents')
      .then(({ data }) => setBundle(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    return () => {
      if (localPreviewUrl && localPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(localPreviewUrl);
      }
    };
  }, [localPreviewUrl]);

  useEffect(() => {
    return () => {
      if (previewState?.accessUrl && previewState.accessUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewState.accessUrl);
      }
    };
  }, [previewState?.accessUrl]);

  const resetFileSelection = () => {
    if (localPreviewUrl && localPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(localPreviewUrl);
    }
    setSelectedFile(null);
    setLocalPreviewUrl('');
  };

  const openUploadModal = () => {
    resetFileSelection();
    setEditingDoc(null);
    setUploadError('');
    setForm(
      isStaff
        ? {
            ...EMPTY_FORM,
            docType: 'PACKING_LIST',
            category: 'TRADE',
            accessLevel: 'ALL_STAFF',
            currency: 'USD',
          }
        : EMPTY_FORM
    );
    setShowModal(true);
  };

  const openEditModal = (doc) => {
    if (!isManagerOrAdmin) return;
    resetFileSelection();
    setEditingDoc(doc);
    setUploadError('');
    setForm({
      title: doc.title || '',
      docType: doc.docType || 'OTHER',
      category: doc.category || 'FINANCIAL',
      accessLevel: doc.accessLevel || 'MANAGER_ADMIN',
      referenceNo: doc.referenceNo || '',
      amount: doc.amount ?? '',
      currency: doc.currency || 'LKR',
      txnId: doc.txnId ? String(doc.txnId) : '',
      notes: doc.notes || '',
    });
    setShowModal(true);
  };

  const handleDocTypeChange = (nextType) => {
    const matched = DOC_TYPES.find((d) => d.value === nextType);
    let nextCategory = matched?.defaultCategory || form.category;
    let nextAccess = form.accessLevel;

    if (isStaff) {
      nextCategory = nextCategory === 'INVENTORY' ? 'INVENTORY' : 'TRADE';
      nextAccess = 'ALL_STAFF';
    } else if (!editingDoc) {
      nextAccess =
        nextCategory === 'FINANCIAL' || nextCategory === 'MANAGEMENT'
          ? 'MANAGER_ADMIN'
          : 'ALL_STAFF';
    }

    setForm((prev) => ({
      ...prev,
      docType: nextType,
      category: nextCategory,
      accessLevel: nextAccess,
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError('');

    if (file.size > 4 * 1024 * 1024) {
      setUploadError('Please select a file smaller than 4 MB.');
      e.target.value = '';
      return;
    }

    if (localPreviewUrl && localPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(localPreviewUrl);
    }
    setSelectedFile(file);
    setLocalPreviewUrl(file.type.startsWith('image/') ? URL.createObjectURL(file) : '');
    if (!form.title.trim()) {
      const base = file.name.replace(/\.[^.]+$/, '');
      setForm((prev) => ({ ...prev, title: base }));
    }
  };

  const handleSaveDocument = async (e) => {
    e.preventDefault();
    setUploadError('');

    if (!editingDoc && !selectedFile) {
      setUploadError('Please choose an image, PDF, or document file from your device.');
      return;
    }

    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => {
      if (v !== '' && v !== null && v !== undefined) {
        fd.append(k, String(v));
      }
    });
    if (selectedFile) {
      fd.append('file', selectedFile);
    }

    setSubmitting(true);
    try {
      const res = editingDoc
        ? await api.put(`/documents/${editingDoc.docId}`, fd)
        : await api.post('/documents', fd);
      setBundle(res.data);
      resetFileSelection();
      setShowModal(false);
      setEditingDoc(null);
    } catch (err) {
      setUploadError(err.response?.data?.error || 'Unable to upload document.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewDocument = async (doc, { download = false } = {}) => {
    setPreviewError('');
    setPreviewLoadingId(doc.docId);
    try {
      if (download) {
        const res = await downloadApiFile(
          `/documents/${doc.docId}/content?download=true`,
          doc.fileName || 'vault-document'
        );
        if (!res.ok) {
          setPreviewError(res.error || 'Unable to download document.');
        }
        return;
      }

      const { data } = await api.get(`/documents/${doc.docId}/view`);
      let resolvedUrl = data.accessUrl;
      try {
        const { blobUrl } = await fetchApiBlobUrl(
          data.contentEndpoint || `/documents/${doc.docId}/content`
        );
        resolvedUrl = blobUrl;
      } catch {
        // Fallback to signed external URL if content proxy is unavailable
      }
      setPreviewState({
        ...data,
        accessUrl: resolvedUrl,
      });
    } catch (err) {
      setPreviewError(
        err.response?.data?.error || 'You do not have permission to view this document.'
      );
    } finally {
      setPreviewLoadingId(null);
    }
  };

  const handleDeleteDocument = async (doc) => {
    if (!isManagerOrAdmin) return;
    if (doc.accessLevel === 'ADMIN_ONLY' && !isAdmin) return;
    try {
      const { data } = await api.delete(`/documents/${doc.docId}`);
      setBundle(data);
      if (previewState?.document?.docId === doc.docId) {
        setPreviewState(null);
      }
    } catch (err) {
      setPreviewError(err.response?.data?.error || 'Unable to delete document.');
    }
  };

  const documents = bundle?.documents || [];
  const capabilities = bundle?.capabilities || {
    canUploadFinancial: isManagerOrAdmin,
    canUploadManagement: isManagerOrAdmin,
    canViewFinance: isManagerOrAdmin,
    canEdit: isManagerOrAdmin,
    canDelete: isManagerOrAdmin,
    canMarkAdminOnly: isAdmin,
  };

  const filteredDocuments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return documents.filter((doc) => {
      if (categoryTab !== 'ALL' && doc.category !== categoryTab) return false;
      if (!q) return true;
      return (
        doc.title?.toLowerCase().includes(q) ||
        doc.referenceNo?.toLowerCase().includes(q) ||
        doc.fileName?.toLowerCase().includes(q) ||
        doc.docType?.toLowerCase().includes(q)
      );
    });
  }, [documents, categoryTab, searchQuery]);

  const categoryBreakdown = bundle?.summary?.categoryBreakdown || [
    { label: 'Financial Docs', percent: 0, rightLabel: '0 files', tone: 'muted' },
    { label: 'Trade & Customs', percent: 0, rightLabel: '0 files', tone: 'muted' },
    { label: 'Management', percent: 0, rightLabel: '0 files', tone: 'muted' },
    { label: 'Inventory Docs', percent: 0, rightLabel: '0 files', tone: 'muted' },
  ];

  const vaultScore = bundle?.summary?.totalAuthorized
    ? bundle.summary.restrictedPercent
    : 100;

  return (
    <div className="space-y-6">
      {/* CATEGORY FILTER & RBAC ACCESS BAR */}
      <div className="bims-card p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {CATEGORY_TABS.map((tab) => {
            const lockedForStaff =
              isStaff && (tab.id === 'FINANCIAL' || tab.id === 'MANAGEMENT');
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCategoryTab(tab.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  categoryTab === tab.id
                    ? 'bg-violet-600 text-white'
                    : 'bims-subcard hover:border-violet-500/50'
                }`}
              >
                {lockedForStaff ? <Lock className="w-3 h-3 text-amber-400" /> : null}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search title, cheque #, ref..."
            aria-label="Search Vault Documents"
            className="bims-input rounded-full px-3.5 py-1.5 text-xs w-48 focus:outline-none"
          />
          <span className="text-[11px] font-medium px-3 py-1 rounded-full bims-subcard flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              {isAdmin
                ? 'Administrator · Full Vault'
                : role === 'MANAGER'
                ? 'Manager · Finance & Ops'
                : 'Staff · Operational Only'}
            </span>
          </span>
        </div>
      </div>

      {/* 3-COLUMN BENTO VAULT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* LEFT COLUMN — UPLOADED RECORDS REGISTER */}
        <div className="lg:col-span-4 space-y-5">
          <div className="bims-card p-5">
            <CardHeader
              title={`Document Register (${filteredDocuments.length})`}
              onAction={openUploadModal}
              actionLabel="Upload New Document"
            />

            {previewError ? (
              <div className="mb-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 px-3 py-2 text-xs">
                {previewError}
              </div>
            ) : null}

            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
              {filteredDocuments.length === 0 ? (
                <div className="bims-subcard p-5 text-center space-y-2.5 text-xs">
                  {isStaff &&
                  (categoryTab === 'FINANCIAL' || categoryTab === 'MANAGEMENT') ? (
                    <>
                      <Lock className="w-6 h-6 text-amber-400 mx-auto" />
                      <p className="font-semibold text-amber-400">
                        Restricted Section ({role} Role)
                      </p>
                      <p className="text-zinc-400">
                        Cheques, bills, receipts, and management documents require Manager or
                        Administrator authorization.
                      </p>
                    </>
                  ) : (
                    <>
                      <FileText className="w-6 h-6 text-violet-400 mx-auto" />
                      <p className="font-semibold">No authorized documents uploaded yet</p>
                      <p className="text-zinc-400">
                        Upload scanned cheques, bills, receipts, sales invoices, or trade PDFs
                        directly into Cloudinary encrypted storage.
                      </p>
                      <button
                        type="button"
                        onClick={openUploadModal}
                        className="mt-1 px-4 py-1.5 rounded-full bg-violet-600 hover:bg-violet-500 text-white font-semibold cursor-pointer"
                      >
                        + Upload Document
                      </button>
                    </>
                  )}
                </div>
              ) : (
                filteredDocuments.map((doc) => {
                  const isSelected = previewState?.document?.docId === doc.docId;
                  const canDeleteDoc =
                    capabilities.canDelete &&
                    (doc.accessLevel !== 'ADMIN_ONLY' || isAdmin);
                  const canEditDoc =
                    capabilities.canEdit &&
                    (doc.accessLevel !== 'ADMIN_ONLY' || isAdmin);
                  const isImg = doc.mimeType?.startsWith('image/');

                  return (
                    <div
                      key={doc.docId}
                      className={`bims-subcard p-3.5 transition-all ${
                        isSelected ? 'ring-2 ring-violet-500/60' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 mb-1">
                            <span className="px-2 py-0.5 rounded bg-violet-600/20 text-violet-400 text-[10px] font-bold">
                              {DOC_TYPE_LABELS[doc.docType] || doc.docType}
                            </span>
                            <AccessBadge accessLevel={doc.accessLevel} />
                          </div>
                          <p className="font-semibold text-sm truncate">{doc.title}</p>
                        </div>

                        <span className="w-8 h-8 rounded-xl bims-card flex items-center justify-center shrink-0 text-zinc-400">
                          {isImg ? (
                            <ImageIcon className="w-4 h-4 text-emerald-400" />
                          ) : doc.mimeType === 'application/pdf' ? (
                            <FileText className="w-4 h-4 text-rose-400" />
                          ) : (
                            <FileSpreadsheet className="w-4 h-4 text-amber-400" />
                          )}
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-400">
                        <span className="truncate">
                          {doc.referenceNo ? `Ref: ${doc.referenceNo} · ` : ''}
                          {formatFileSize(doc.fileSizeBytes)}
                        </span>
                        {doc.amount != null ? (
                          <span className="font-semibold text-emerald-400">
                            {doc.currency === 'LKR'
                              ? `Rs. ${Number(doc.amount).toLocaleString()}`
                              : `$${Number(doc.amount).toLocaleString()} USD`}
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-zinc-800/30 flex items-center justify-between gap-2 text-[11px]">
                        <span className="text-zinc-400 truncate">
                          By {doc.uploadedByName} · {doc.storageProvider}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleViewDocument(doc)}
                            disabled={previewLoadingId === doc.docId}
                            title="Preview Document"
                            className="px-2.5 py-1 rounded-full bg-violet-600 hover:bg-violet-500 text-white font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            <span>{previewLoadingId === doc.docId ? '...' : 'View'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleViewDocument(doc, { download: true })}
                            title="Download Document"
                            className="w-6 h-6 rounded-full bims-card flex items-center justify-center text-zinc-400 hover:text-emerald-400 cursor-pointer"
                          >
                            <Download className="w-3 h-3" />
                          </button>
                          {canEditDoc ? (
                            <button
                              type="button"
                              onClick={() => openEditModal(doc)}
                              title="Edit Metadata / Replace File"
                              className="w-6 h-6 rounded-full bims-card flex items-center justify-center text-zinc-400 hover:text-violet-400 cursor-pointer"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                          ) : null}
                          {canDeleteDoc ? (
                            <button
                              type="button"
                              onClick={() => handleDeleteDocument(doc)}
                              title="Delete Document"
                              className="w-6 h-6 rounded-full bims-card flex items-center justify-center text-zinc-400 hover:text-rose-400 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* CENTER COLUMN — BREAKDOWN & LIVE SIGNED PREVIEWER */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bims-card p-5">
            <h3 className="text-base font-semibold tracking-tight mb-4">
              Vault Category Breakdown
            </h3>
            <div className="space-y-3">
              {categoryBreakdown.map((row) => (
                <ProgressPillBar
                  key={row.label}
                  label={row.label}
                  percent={row.percent}
                  rightLabel={row.rightLabel}
                  tone={row.tone}
                />
              ))}
            </div>
          </div>

          <div className="bims-card p-5 flex flex-col justify-between min-h-[340px]">
            <div>
              <div className="flex items-center justify-between gap-2 mb-4">
                <div>
                  <h3 className="text-base font-semibold tracking-tight">
                    Secure Authenticated Viewer
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Short-lived signed delivery verified via JWT &amp; RBAC role permissions
                  </p>
                </div>
                {previewState?.accessUrl ? (
                  <button
                    type="button"
                    onClick={() => setLightboxOpen(true)}
                    className="px-3 py-1 rounded-full bims-subcard text-xs font-semibold hover:border-violet-500/50 flex items-center gap-1 cursor-pointer"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Expand</span>
                  </button>
                ) : null}
              </div>

              {!previewState ? (
                <div className="bims-subcard p-8 text-center space-y-2 text-xs">
                  <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto" />
                  <p className="font-semibold text-sm">Select any record to inspect</p>
                  <p className="text-zinc-400 max-w-sm mx-auto">
                    Click <strong>View</strong> on an uploaded cheque, bill, receipt, invoice,
                    or management record to request a 5-minute signed link from Cloudinary.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="bims-subcard p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{previewState.document.title}</p>
                      <p className="text-[11px] text-zinc-400 truncate">
                        {previewState.document.fileName} · Signed for{' '}
                        {previewState.expiresInSeconds}s
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <AccessBadge accessLevel={previewState.document.accessLevel} />
                      <a
                        href={previewState.accessUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold text-[11px] hover:bg-emerald-500/30"
                      >
                        Open Tab ↗
                      </a>
                    </div>
                  </div>

                  {previewState.document.mimeType?.startsWith('image/') ? (
                    <div className="bims-subcard p-2 flex items-center justify-center bg-black/20 rounded-xl overflow-hidden">
                      <img
                        src={previewState.accessUrl}
                        alt={previewState.document.title}
                        className="max-h-64 w-auto rounded-lg object-contain cursor-zoom-in"
                        onClick={() => setLightboxOpen(true)}
                      />
                    </div>
                  ) : previewState.document.mimeType === 'application/pdf' ? (
                    <iframe
                      title={previewState.document.title}
                      src={previewState.accessUrl}
                      className="w-full h-64 rounded-xl border border-zinc-700/40 bg-white"
                    />
                  ) : (
                    <div className="bims-subcard p-5 text-center space-y-2 text-xs">
                      <FileSpreadsheet className="w-7 h-7 text-amber-400 mx-auto" />
                      <p className="font-semibold">{previewState.document.fileName}</p>
                      <p className="text-zinc-400">
                        Browser inline preview unavailable for this file format ({previewState.document.mimeType}).
                      </p>
                      <button
                        type="button"
                        onClick={() => handleViewDocument(previewState.document, { download: true })}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-violet-600 hover:bg-violet-500 text-white font-semibold cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download File</span>
                      </button>
                    </div>
                  )}

                  {previewState.document.notes ? (
                    <p className="text-xs text-zinc-400 italic">
                      Note: {previewState.document.notes}
                    </p>
                  ) : null}
                </div>
              )}
            </div>

            <InlineAssistantBar
              placeholder="Ask AI about uploaded cheques, receipts, or invoices..."
              defaultPrompt="Summarize my authorized uploaded documents in the vault"
              actionLabel="Upload"
              onActionClick={openUploadModal}
            />
          </div>
        </div>

        {/* RIGHT COLUMN — SECURITY GAUGE & UPLOAD CTA */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bims-card p-4">
            <CardHeader title="RBAC Access Control" />
            <RadialTickGauge
              topCaption="Protected"
              valueText={`${vaultScore}%`}
              subText="RBAC scoped"
              percent={vaultScore}
              accent="violet"
              footerLeft="Access Mode"
              footerRight={role}
            />

            <div className="mt-2.5 space-y-1.5 text-xs">
              <div className="bims-subcard p-2 flex items-center justify-between">
                <span className="text-zinc-400">Financial Vault</span>
                <span
                  className={
                    capabilities.canViewFinance
                      ? 'text-emerald-400 font-semibold'
                      : 'text-amber-400 font-semibold'
                  }
                >
                  {capabilities.canViewFinance ? 'Unlocked' : 'Restricted'}
                </span>
              </div>
              <div className="bims-subcard p-2 flex items-center justify-between">
                <span className="text-zinc-400">Edit &amp; Delete Docs</span>
                <span
                  className={
                    capabilities.canDelete
                      ? 'text-emerald-400 font-semibold'
                      : 'text-zinc-400 font-semibold'
                  }
                >
                  {capabilities.canDelete ? 'Permitted' : 'View / Ops Only'}
                </span>
              </div>
            </div>
          </div>

          <VioletActionCard
            title={'Upload\nVault Record'}
            subtitle="Cheques, bills, receipts & PDFs (max 4 MB)"
            buttonLabel="↑ Upload Document"
            onPrimaryClick={openUploadModal}
            dbStatusText={`${bundle?.storageProvider || 'Cloudinary Encrypted Vault'} active`}
          />
        </div>
      </div>

      {/* EXPANDED PREVIEW LIGHTBOX */}
      {lightboxOpen && previewState ? (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bims-card w-full max-w-4xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-base">{previewState.document.title}</h4>
                <p className="text-xs text-zinc-400">{previewState.document.fileName}</p>
              </div>
              <button
                type="button"
                onClick={() => setLightboxOpen(false)}
                className="w-8 h-8 rounded-full bims-subcard flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {previewState.document.mimeType?.startsWith('image/') ? (
              <img
                src={previewState.accessUrl}
                alt={previewState.document.title}
                className="max-h-[75vh] w-full object-contain rounded-xl bg-black/30"
              />
            ) : (
              <iframe
                title={previewState.document.title}
                src={previewState.accessUrl}
                className="w-full h-[75vh] rounded-xl bg-white"
              />
            )}
          </div>
        </div>
      ) : null}

      {/* UPLOAD / EDIT DOCUMENT MODAL */}
      {showModal ? (
        <div className="fixed inset-0 z-50 bg-black/65 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bims-card w-full max-w-lg p-6 my-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">
                {editingDoc ? 'Edit Vault Record' : 'Upload Financial / Trade Document'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  resetFileSelection();
                  setShowModal(false);
                }}
                className="w-7 h-7 rounded-full bims-subcard flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isStaff ? (
              <div className="mb-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 px-3 py-2 text-xs">
                Staff Role Notice: You can upload operational Trade &amp; Inventory documents.
                Financial cheques/bills and restricted management records require Manager or
                Administrator access.
              </div>
            ) : null}

            {uploadError ? (
              <div className="mb-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 px-3 py-2 text-xs">
                {uploadError}
              </div>
            ) : null}

            <form onSubmit={handleSaveDocument} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-medium">Document Type</label>
                  <select
                    aria-label="Document Type"
                    value={form.docType}
                    onChange={(e) => handleDocTypeChange(e.target.value)}
                    className="w-full rounded-xl bims-input px-3 py-2.5"
                  >
                    {DOC_TYPES.filter(
                      (t) =>
                        !isStaff ||
                        t.defaultCategory === 'TRADE' ||
                        t.defaultCategory === 'INVENTORY'
                    ).map((t) => (
                      <option
                        key={t.value}
                        value={t.value}
                        className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-white"
                      >
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block mb-1 font-medium">Vault Category</label>
                  <select
                    aria-label="Vault Category"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full rounded-xl bims-input px-3 py-2.5"
                  >
                    {!isStaff ? (
                      <>
                        <option
                          value="FINANCIAL"
                          className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-white"
                        >
                          Financial (Cheques / Bills)
                        </option>
                        <option
                          value="MANAGEMENT"
                          className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-white"
                        >
                          Management / Governance
                        </option>
                      </>
                    ) : null}
                    <option
                      value="TRADE"
                      className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-white"
                    >
                      Trade &amp; Customs
                    </option>
                    <option
                      value="INVENTORY"
                      className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-white"
                    >
                      Inventory / Warehouse
                    </option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block mb-1 font-medium">Document Title</label>
                <input
                  required
                  placeholder="e.g., BOC Cheque #884120 — Galle Cinnamon Co-op"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full rounded-xl bims-input px-3.5 py-2.5"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block mb-1 font-medium">Reference / Cheque #</label>
                  <input
                    placeholder="CHQ-884120"
                    value={form.referenceNo}
                    onChange={(e) => setForm({ ...form, referenceNo: e.target.value })}
                    className="w-full rounded-xl bims-input px-3 py-2.5"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-medium">Amount (Optional)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="3840000"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="w-full rounded-xl bims-input px-3 py-2.5"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-medium">Currency</label>
                  <select
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value })}
                    className="w-full rounded-xl bims-input px-3 py-2.5"
                  >
                    <option
                      value="LKR"
                      className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-white"
                    >
                      LKR (Rs.)
                    </option>
                    <option
                      value="USD"
                      className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-white"
                    >
                      USD ($)
                    </option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-medium">Role Access Level</label>
                  <select
                    aria-label="Role Access Level"
                    value={form.accessLevel}
                    onChange={(e) => setForm({ ...form, accessLevel: e.target.value })}
                    className="w-full rounded-xl bims-input px-3 py-2.5"
                  >
                    <option
                      value="ALL_STAFF"
                      className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-white"
                    >
                      All Authorized Team
                    </option>
                    {!isStaff ? (
                      <option
                        value="MANAGER_ADMIN"
                        className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-white"
                      >
                        Managers &amp; Admins Only
                      </option>
                    ) : null}
                    {isAdmin ? (
                      <option
                        value="ADMIN_ONLY"
                        className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-white"
                      >
                        Administrators Only
                      </option>
                    ) : null}
                  </select>
                </div>

                <div>
                  <label className="block mb-1 font-medium">Link Shipment (Optional)</label>
                  <select
                    value={form.txnId}
                    onChange={(e) => setForm({ ...form, txnId: e.target.value })}
                    className="w-full rounded-xl bims-input px-3 py-2.5"
                  >
                    <option
                      value=""
                      className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-white"
                    >
                      Standalone Record
                    </option>
                    {(bundle?.transactions || []).map((t) => (
                      <option
                        key={t.txnId}
                        value={String(t.txnId)}
                        className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-white"
                      >
                        {t.txnNumber} — {t.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block mb-1.5 font-medium">
                  Upload File from Device (Images, PDFs, Spreadsheets up to 4 MB){' '}
                  {editingDoc ? '(Optional to replace)' : ''}
                </label>
                <div className="bims-subcard p-3 flex items-center gap-3">
                  {localPreviewUrl ? (
                    <img
                      src={localPreviewUrl}
                      alt="Selected preview"
                      className="w-12 h-12 rounded-xl object-cover border border-zinc-700/40 shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bims-card flex items-center justify-center text-violet-400 shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0 space-y-1">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-600 hover:bg-violet-500 text-white font-semibold cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      <span>
                        {selectedFile ? 'Change File' : 'Choose File from Device'}
                      </span>
                      <input
                        type="file"
                        accept=".png,.jpg,.jpeg,.webp,.gif,.pdf,.csv,.txt,.doc,.docx,.xls,.xlsx"
                        aria-label="Upload Document File from Device"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[11px] text-zinc-400 truncate">
                      {selectedFile
                        ? `${selectedFile.name} (${formatFileSize(selectedFile.size)})`
                        : editingDoc
                        ? `Current: ${editingDoc.fileName}`
                        : 'PNG, JPG, WebP, PDF, CSV, DOC/DOCX, XLS/XLSX'}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block mb-1 font-medium">Notes (Optional)</label>
                <input
                  placeholder="Approval remarks, bank branch, or audit note"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full rounded-xl bims-input px-3.5 py-2.5"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 rounded-full bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white font-semibold mt-1 cursor-pointer"
              >
                {submitting
                  ? 'Uploading to Encrypted Vault...'
                  : editingDoc
                  ? 'Save Changes'
                  : 'Upload to Secure Vault'}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
