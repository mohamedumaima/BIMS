import { ArrowUpRight, Check, Database, Download } from 'lucide-react';

export function CardHeader({ title, onAction, actionLabel }) {
  return (
    <div className="flex items-center justify-between gap-2 mb-4">
      <h3 className="text-base font-semibold tracking-tight">{title}</h3>
      <button
        type="button"
        onClick={onAction}
        title={actionLabel || title}
        className="w-7 h-7 rounded-full bims-subcard flex items-center justify-center text-zinc-400 hover:text-violet-400 transition-colors cursor-pointer shrink-0"
      >
        <ArrowUpRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

/**
 * 48-tick radial gauge matching the top-right metric card across all 6 UI mockups.
 */
export function RadialTickGauge({
  valueText,
  subText = 'rating',
  percent = 88,
  accent = 'emerald',
  topCaption,
  footerLeft,
  footerRight,
}) {
  const totalTicks = 44;
  const activeTicks = Math.round((Math.min(100, Math.max(0, percent)) / 100) * totalTicks);

  const colorMap = {
    emerald: '#22c55e',
    cyan: '#38bdf8',
    violet: '#8b5cf6',
    amber: '#f97316',
  };
  const strokeActive = colorMap[accent] || colorMap.emerald;

  return (
    <div className="flex flex-col items-center justify-center py-1">
      <div className="relative w-44 h-44 flex items-center justify-center">
        <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
          {Array.from({ length: totalTicks }).map((_, idx) => {
            const angle = (idx / totalTicks) * 360;
            const isActive = idx < activeTicks;
            const stroke =
              accent === 'mixed'
                ? idx < activeTicks * 0.65
                  ? '#22c55e'
                  : '#f97316'
                : strokeActive;
            return (
              <line
                key={idx}
                x1="80"
                y1="10"
                x2="80"
                y2="24"
                stroke={isActive ? stroke : 'var(--dot-inactive)'}
                strokeWidth="2.4"
                strokeLinecap="round"
                opacity={isActive ? 0.95 : 0.35}
                transform={`rotate(${angle} 80 80)`}
              />
            );
          })}
          <circle
            cx="80"
            cy="80"
            r="50"
            fill="none"
            stroke={strokeActive}
            strokeOpacity="0.18"
            strokeWidth="1.5"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-3">
          {topCaption ? (
            <span className="text-[11px] font-medium text-emerald-400 mb-0.5">{topCaption}</span>
          ) : null}
          <span className="text-3xl font-bold tracking-tight">{valueText}</span>
          <span className="text-xs text-zinc-400 mt-0.5">{subText}</span>
        </div>
      </div>

      {footerLeft || footerRight ? (
        <div className="w-full flex items-center justify-between text-xs mt-1 px-1">
          <span className="text-zinc-400">{footerLeft}</span>
          <span className="text-emerald-400 font-semibold">{footerRight}</span>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Horizontal pill progress bar with solid or diagonal-striped fill matching the UI mockups.
 */
export function ProgressPillBar({ label, percent, rightLabel, tone = 'emerald', showCheck }) {
  const safePercent = Math.max(0, Math.min(100, Number(percent || 0)));
  const fillWidth = safePercent <= 0 ? '0%' : `${Math.max(10, safePercent)}%`;
  const toneClass =
    tone === 'emerald-striped'
      ? 'bims-striped-emerald'
      : tone === 'amber-striped'
      ? 'bims-striped-amber'
      : tone === 'emerald-amber'
      ? 'bims-striped-gradient'
      : tone === 'amber'
      ? 'bg-orange-500'
      : tone === 'muted'
      ? 'bg-zinc-600/50'
      : 'bg-emerald-500';

  return (
    <div className="grid grid-cols-12 items-center gap-3">
      <span className="col-span-4 text-xs font-medium truncate">{label}</span>
      <div className="col-span-8 h-7 rounded-full bims-subcard overflow-hidden relative flex items-center">
        {safePercent > 0 ? (
          <div
            className={`h-full rounded-full transition-all duration-500 flex items-center px-2.5 ${toneClass}`}
            style={{ width: fillWidth }}
          >
            {showCheck ? (
              <span className="w-4 h-4 rounded-full bg-zinc-950/60 text-emerald-300 flex items-center justify-center">
                <Check className="w-2.5 h-2.5" />
              </span>
            ) : null}
          </div>
        ) : null}
        <span className="absolute right-3 text-xs font-semibold">
          {rightLabel || `${safePercent}%`}
        </span>
      </div>
    </div>
  );
}

/**
 * Side-by-side 8x9 dot matrix visualization matching Stock Levels, Documents Log,
 * Outstanding Balances, and Outstanding Payments in the UI mockups.
 */
export function DotMatrixPair({
  leftLabel = 'Cinnamon',
  leftPercent = 57,
  rightLabel = 'Black Pepper',
  rightPercent = 86,
}) {
  const totalDots = 64; // 8x8 grid
  const leftActive = Math.round((leftPercent / 100) * totalDots);
  const rightActive = Math.round((rightPercent / 100) * totalDots);

  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <div className="grid grid-cols-8 gap-1.5">
          {Array.from({ length: totalDots }).map((_, i) => {
            const filled = totalDots - 1 - i < leftActive;
            return (
              <span
                key={i}
                className="w-2 h-2 rounded-full transition-colors"
                style={{
                  backgroundColor: filled ? '#f97316' : 'var(--dot-inactive)',
                }}
              />
            );
          })}
        </div>
        <div className="flex items-center justify-between text-xs mt-3">
          <span className=" truncate">{leftLabel}</span>
          <span className="text-orange-400 font-semibold">({leftPercent}%)</span>
        </div>
      </div>

      <div>
        <div className="grid grid-cols-8 gap-1.5">
          {Array.from({ length: totalDots }).map((_, i) => {
            const filled = totalDots - 1 - i < rightActive;
            return (
              <span
                key={i}
                className="w-2 h-2 rounded-full transition-colors"
                style={{
                  backgroundColor: filled ? '#22c55e' : 'var(--dot-inactive)',
                }}
              />
            );
          })}
        </div>
        <div className="flex items-center justify-between text-xs mt-3">
          <span className="truncate">{rightLabel}</span>
          <span className="text-emerald-400 font-semibold">({rightPercent}%)</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Document sheet preview card with red/violet badge used in Trade Document Repository,
 * Customer Invoices, and Reporting Assistant.
 */
export function PdfDocCard({ title, badge = 'PDF', badgeColor = 'red', onClick }) {
  const badgeClasses =
    badgeColor === 'violet'
      ? 'bg-violet-600 text-white'
      : badgeColor === 'orange'
      ? 'bg-orange-500 text-white'
      : 'bg-rose-600 text-white';

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col items-center text-center p-2.5 rounded-xl bims-subcard hover:border-violet-500/50 transition-all cursor-pointer"
    >
      <div className="relative w-16 h-20 rounded-lg bg-white text-zinc-800 shadow-md p-2 flex flex-col justify-between border border-zinc-200 group-hover:scale-105 transition-transform">
        <div className="space-y-1">
          <div className="h-1.5 w-8 bg-zinc-300 rounded" />
          <div className="h-1 w-11 bg-zinc-200 rounded" />
          <div className="h-1 w-10 bg-zinc-200 rounded" />
          <div className="h-1 w-9 bg-zinc-200 rounded" />
        </div>
        <span
          className={`self-start px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase shadow-sm ${badgeClasses}`}
        >
          {badge}
        </span>
      </div>
      {title ? <span className="text-xs font-medium mt-2 line-clamp-1">{title}</span> : null}
    </button>
  );
}

/**
 * Right-column vibrant violet CTA card + bottom "Database synchronization active" status bar.
 */
export function VioletActionCard({
  title,
  subtitle,
  buttonLabel,
  secondaryButtonLabel,
  onPrimaryClick,
  onSecondaryClick,
  dbStatusText = 'Database synchronization active',
}) {
  return (
    <div className="bims-card overflow-hidden flex flex-col justify-between">
      <div className="bg-gradient-to-br from-[#6D28D9] via-[#7C3AED] to-[#6366F1] p-6 text-white">
        <h3 className="text-xl font-bold leading-snug whitespace-pre-line">{title}</h3>
        {subtitle ? <p className="text-xs text-violet-100/90 mt-1.5">{subtitle}</p> : null}

        <div className="mt-5 space-y-2.5">
          <button
            type="button"
            onClick={onPrimaryClick}
            className="w-full py-2.5 px-4 rounded-full bg-white text-zinc-950 font-semibold text-xs hover:bg-zinc-100 transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
          >
            <span>{buttonLabel}</span>
          </button>

          {secondaryButtonLabel ? (
            <button
              type="button"
              onClick={onSecondaryClick}
              className="w-full py-2.5 px-4 rounded-full bg-zinc-900/60 hover:bg-zinc-900/80 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{secondaryButtonLabel}</span>
            </button>
          ) : null}
        </div>
      </div>

      <div className="p-4 flex items-center gap-3 text-xs text-zinc-400">
        <Database className="w-4 h-4 text-emerald-400 shrink-0" />
        <span>{dbStatusText}</span>
      </div>
    </div>
  );
}
