import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  ArrowDownRight,
  ArrowUpRight,
  FileText,
  Lock,
  Sparkles,
} from 'lucide-react';
import {
  CardHeader,
  PdfDocCard,
  ProgressPillBar,
  RadialTickGauge,
  VioletActionCard,
} from '../components/BentoWidgets';
import InlineAssistantBar from '../components/InlineAssistantBar';
import { api, downloadApiFile } from '../services/api';

function CategoryMatrix() {
  const dots = 49;
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: dots }).map((_, i) => (
            <span
              key={i}
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: '#22c55e' }}
            />
          ))}
        </div>
        <p className="text-xs text-zinc-400 mt-2">Cinnamon</p>
      </div>

      <div>
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: dots }).map((_, i) => (
            <span
              key={i}
              className="w-2 h-2 rounded-full"
              style={{
                backgroundColor: i > 14 ? '#f97316' : 'var(--dot-inactive)',
              }}
            />
          ))}
        </div>
        <p className="text-xs text-zinc-400 mt-2">Pepper</p>
      </div>

      <div>
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: 28 }).map((_, i) => (
            <span
              key={i}
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: 'var(--dot-inactive)' }}
            />
          ))}
        </div>
        <p className="text-xs text-zinc-400 mt-2">Cardamom</p>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const { user } = useSelector((state) => state.auth);
  const [summary, setSummary] = useState(null);
  const [reportReply, setReportReply] = useState('');

  useEffect(() => {
    api
      .get('/dashboard')
      .then(({ data }) => setSummary(data))
      .catch(() => {});
  }, []);

  const isStaff =
    summary?.canViewFinance !== undefined
      ? !summary.canViewFinance
      : user?.role === 'STAFF';
  const revenueUsd = summary?.kpis?.revenue || 485000;
  const revenueLkr = summary?.kpis?.revenueLkr || 68500000;
  const expensesUsd = summary?.kpis?.expenses || 210000;
  const expensesLkr = summary?.kpis?.expensesLkr || 34200000;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* LEFT COLUMN */}
        <div className="lg:col-span-4 space-y-5">
          <div className="bims-card p-5 space-y-3">
            <CardHeader title="Executive Financial KPIs" />

            {isStaff ? (
              <div className="bims-subcard p-4 text-xs text-amber-400 flex items-start gap-2.5">
                <Lock className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Finance Restricted (Staff Role)</p>
                  <p className="text-zinc-400 mt-0.5">
                    Executive profit &amp; margin totals require Manager or Administrator access.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="bims-subcard p-3.5">
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span>Revenue (International USD &amp; Local LKR)</span>
                    <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                  </div>
                  <p className="text-3xl font-bold text-emerald-400 mt-1">
                    ${Math.round(revenueUsd / 1000)}K
                  </p>
                  <p className="text-[11px] text-amber-400 font-semibold mt-0.5">
                    + Rs. {(revenueLkr / 1000000).toFixed(1)}M LKR Domestic
                  </p>
                </div>

                <div className="bims-subcard p-3.5">
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span>Expenses</span>
                    <ArrowDownRight className="w-4 h-4 text-orange-400" />
                  </div>
                  <p className="text-3xl font-bold text-orange-400 mt-1">
                    ${Math.round(expensesUsd / 1000)}K
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Local Procurement: Rs. {(expensesLkr / 1000000).toFixed(1)}M LKR
                  </p>
                </div>
              </>
            )}

            <div className="bims-subcard p-3.5">
              <p className="text-xs text-zinc-400 mb-2">Net Margin</p>
              <svg viewBox="0 0 240 60" className="w-full h-14 overflow-visible">
                <defs>
                  <linearGradient id="marginGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#22c55e" />
                    <stop offset="65%" stopColor="#22c55e" />
                    <stop offset="100%" stopColor="#f97316" />
                  </linearGradient>
                </defs>
                <path
                  d="M 4 48 Q 28 32, 48 40 T 92 34 T 136 28 T 182 18 T 234 20"
                  fill="none"
                  stroke="url(#marginGrad)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>

          <div className="bims-card p-5">
            <h3 className="text-base font-semibold tracking-tight mb-4">
              Spice Category Sales Matrix
            </h3>
            <CategoryMatrix />
          </div>
        </div>

        {/* CENTER COLUMN */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bims-card p-5">
            <h3 className="text-base font-semibold tracking-tight mb-4">
              Export Volume by Country (USD $)
            </h3>
            <div className="space-y-3">
              {(summary?.exportByCountry || []).map((row) => (
                <ProgressPillBar
                  key={row.country}
                  label={row.country}
                  percent={row.share}
                  rightLabel={`${row.share}% ($${Math.round(row.value / 1000)}K)`}
                  tone={row.tone}
                />
              ))}
            </div>
          </div>

          <div className="bims-card p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold tracking-tight">
                  BIMS Reporting Assistant
                </h3>
                <span className="w-7 h-7 rounded-full bims-subcard flex items-center justify-center text-zinc-400">
                  <FileText className="w-3.5 h-3.5" />
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-end">
                  <div className="rounded-2xl rounded-br-sm bg-violet-600 text-white px-4 py-2.5">
                    Can you analyze the Q3 export trends?
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-violet-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="w-3.5 h-3.5" />
                  </span>
                  <div className="bims-subcard p-3.5 flex-1 space-y-2.5">
                    <div className="space-y-1">
                      {reportReply ? (
                        <p className="whitespace-pre-line leading-relaxed">{reportReply}</p>
                      ) : (
                        <>
                          <p className="text-zinc-400">Here are the key report trends:</p>
                          <p className="font-medium">• Commercial Invoice (USD $)</p>
                          <p className="font-medium">• Packing List</p>
                          <p className="font-medium">• Certificate of Origin (Sri Lanka)</p>
                          <p className="font-medium">• Phytosanitary Certificate</p>
                        </>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-1">
                      <PdfDocCard
                        badge="PDF"
                        onClick={() =>
                          downloadApiFile(
                            '/documents/pdf/1/COMMERCIAL_INVOICE',
                            'commercial-invoice.pdf'
                          )
                        }
                      />
                      <PdfDocCard
                        badge="PDF"
                        onClick={() =>
                          downloadApiFile('/documents/pdf/1/PACKING_LIST', 'packing-list.pdf')
                        }
                      />
                      <PdfDocCard
                        badge="PDF"
                        onClick={() =>
                          downloadApiFile(
                            '/documents/pdf/1/CERTIFICATE_OF_ORIGIN',
                            'certificate-of-origin.pdf'
                          )
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <InlineAssistantBar
              placeholder="Ask AI about export trends or download PDF..."
              defaultPrompt="Show executive revenue and margin KPIs"
              actionLabel="PDF"
              onActionClick={() =>
                downloadApiFile('/reports/export/pdf', 'ceylon-spices-bims-executive-report.pdf')
              }
              showInlineReply={false}
              onReply={(reply) => setReportReply(reply)}
            />
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-3 space-y-5">
          <div className="bims-card p-5">
            <CardHeader title="Inventory Turnover Ratio" />
            <RadialTickGauge
              valueText={`${summary?.kpis?.turnoverRatio ?? 88}%`}
              subText="healthy SKUs"
              percent={summary?.kpis?.turnoverRatio ?? 88}
              accent="mixed"
            />
          </div>

          <VioletActionCard
            title={'Export\nCustom\nReport'}
            buttonLabel="Export CSV"
            secondaryButtonLabel="Export PDF"
            onPrimaryClick={() =>
              downloadApiFile('/reports/export/csv', 'ceylon-spices-bims-report.csv')
            }
            onSecondaryClick={() =>
              downloadApiFile('/reports/export/pdf', 'ceylon-spices-bims-executive-report.pdf')
            }
          />
        </div>
      </div>
    </div>
  );
}
