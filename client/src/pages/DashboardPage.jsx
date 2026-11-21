import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { ArrowDownRight, ArrowUpRight, Lock } from 'lucide-react';
import {
  CardHeader,
  DotMatrixPair,
  PdfDocCard,
  ProgressPillBar,
  RadialTickGauge,
  VioletActionCard,
} from '../components/BentoWidgets';
import { api, downloadApiFile } from '../services/api';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    api
      .get('/dashboard')
      .then(({ data }) => setSummary(data))
      .catch(() => {});
  }, []);

  const products = summary?.products || [];
  const primaryTxnId = summary?.transactions?.[0]?.txnId || 1;
  const isFinanceRestricted =
    summary?.canViewFinance !== undefined
      ? !summary.canViewFinance
      : user?.role === 'STAFF';
  const revenueUsd = summary?.kpis?.revenue || 485000;
  const revenueLkr = summary?.kpis?.revenueLkr || 68500000;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* LEFT COLUMN */}
        <div className="lg:col-span-4 space-y-5">
          <div className="bims-card p-5 space-y-3">
            <CardHeader
              title="Executive Financial KPIs"
              onAction={() => navigate('/reports')}
            />
            {isFinanceRestricted ? (
              <div className="bims-subcard p-3.5 text-xs text-amber-400 flex items-start gap-2.5">
                <Lock className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Finance Restricted ({user?.role || 'STAFF'} Role)</p>
                  <p className="text-zinc-400 mt-0.5">
                    Executive revenue &amp; margin totals require Manager or Administrator access.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="bims-subcard p-3.5">
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span>Export (USD)</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <p className="text-2xl font-bold text-emerald-400 mt-1">
                    ${Math.round(revenueUsd / 1000)}K
                  </p>
                </div>
                <div className="bims-subcard p-3.5">
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span>Local (LKR)</span>
                    <ArrowDownRight className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <p className="text-2xl font-bold text-amber-400 mt-1">
                    Rs. {(revenueLkr / 1000000).toFixed(1)}M
                  </p>
                </div>
              </div>
            )}

            <div className="pt-2 space-y-2.5">
              {products.slice(0, 4).map((item) => (
                <div
                  key={item.productId}
                  onClick={() => navigate('/inventory')}
                  className="bims-subcard p-2.5 flex items-center justify-between gap-2.5 cursor-pointer hover:border-violet-500/40"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-9 h-9 rounded-lg object-cover shrink-0"
                      />
                    ) : null}
                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate">{item.name}</p>
                      <p className="text-[11px] text-zinc-400">
                        ${item.unitPrice}/kg · Rs. {Number(item.unitPriceLkr || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold text-white shrink-0 ${
                      item.badgeTone === 'violet'
                        ? 'bg-violet-600'
                        : item.badgeTone === 'amber'
                        ? 'bg-orange-500'
                        : 'bg-emerald-600'
                    }`}
                  >
                    {item.badge}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bims-card p-5">
            <CardHeader title="Stock Levels" onAction={() => navigate('/inventory')} />
            <DotMatrixPair
              leftLabel={summary?.stockMatrix?.leftLabel || 'Cinnamon'}
              leftPercent={summary?.stockMatrix?.leftPercent ?? 57}
              rightLabel={summary?.stockMatrix?.rightLabel || 'Black Pepper'}
              rightPercent={summary?.stockMatrix?.rightPercent ?? 86}
            />
          </div>
        </div>

        {/* CENTER COLUMN */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bims-card p-5">
            <CardHeader
              title="Live Shipment & Stock Status"
              onAction={() => navigate('/transactions')}
            />
            <div className="space-y-3">
              {(summary?.statusBreakdown || []).map((stage) => (
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

          <div className="bims-card p-5">
            <CardHeader
              title="Trade Document Quick Access"
              onAction={() => navigate('/transactions')}
            />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <PdfDocCard
                title="Commercial Invoice"
                badge="PDF"
                onClick={() =>
                  downloadApiFile(
                    `/documents/pdf/${primaryTxnId}/COMMERCIAL_INVOICE`,
                    'commercial-invoice.pdf'
                  )
                }
              />
              <PdfDocCard
                title="Packing List"
                badge="PDF"
                onClick={() =>
                  downloadApiFile(
                    `/documents/pdf/${primaryTxnId}/PACKING_LIST`,
                    'packing-list.pdf'
                  )
                }
              />
              <PdfDocCard
                title="Bill of Lading"
                badge="PDF"
                onClick={() =>
                  downloadApiFile(
                    `/documents/pdf/${primaryTxnId}/BILL_OF_LADING`,
                    'bill-of-lading.pdf'
                  )
                }
              />
              <PdfDocCard
                title="Origin Cert"
                badge="PDF"
                onClick={() =>
                  downloadApiFile(
                    `/documents/pdf/${primaryTxnId}/CERTIFICATE_OF_ORIGIN`,
                    'certificate-of-origin.pdf'
                  )
                }
              />
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-3 space-y-5">
          <div className="bims-card p-5">
            <CardHeader
              title="FIFO Inventory Valuation"
              onAction={() => navigate('/inventory')}
            />
            <RadialTickGauge
              valueText={`$${Math.round((summary?.kpis?.fifoValuation || 142000) / 1000)}K`}
              subText={`Rs. ${((summary?.kpis?.fifoValuationLkr || 42600000) / 1000000).toFixed(1)}M LKR`}
              percent={summary?.kpis?.turnoverRatio ?? 94}
              accent="cyan"
              footerLeft="healthy SKU ratio"
              footerRight={`${summary?.kpis?.turnoverRatio ?? 94}% optimal`}
            />
          </div>

          <VioletActionCard
            title={'Automated\nTrade PDF\nSuite'}
            buttonLabel="Download Trade Bundle ↓"
            secondaryButtonLabel="Export Executive CSV"
            onPrimaryClick={() =>
              downloadApiFile(`/documents/pdf/${primaryTxnId}/BUNDLE`, 'trade-bundle.pdf')
            }
            onSecondaryClick={() =>
              downloadApiFile('/reports/export/csv', 'ceylon-spices-bims-report.csv')
            }
          />
        </div>
      </div>
    </div>
  );
}
