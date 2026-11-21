import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';

export const HERO_SLIDES = [
  {
    id: 'ceylon-cinnamon',
    image: '/images/hero-ceylon-cinnamon.jpg',
    alt: 'Bundled Sri Lankan Ceylon Alba cinnamon quills beside ground cinnamon and whole cloves on dark slate',
    badge: 'HS 0906.11 · Galle & Matara',
    accentDot: 'bg-amber-400',
    title: 'Export-Grade Ceylon Alba Cinnamon',
    subtitle: 'True Cinnamomum verum quills tracked from southern estates to global buyers in USD ($).',
    tag: 'Grade: Alba · $48/kg',
  },
  {
    id: 'spice-harvest',
    image: '/images/hero-spice-harvest.jpg',
    alt: 'Assortment of Sri Lankan black pepper, green cardamom, turmeric, cloves, nutmeg, and mace in dark bowls',
    badge: 'Matale & Kandy Growers',
    accentDot: 'bg-emerald-400',
    title: 'Authentic Highland Spice Catalog',
    subtitle: 'Pepper, green cardamom, cloves, nutmeg & turmeric procured in LKR (Rs.) with batch tracking.',
    tag: '7 Core SKUs · FIFO / WAC',
  },
  {
    id: 'port-logistics',
    image: '/images/hero-port-logistics.jpg',
    alt: 'International maritime container terminal with docked cargo vessel and gantry cranes at twilight',
    badge: 'Port of Colombo · FOB / CIF',
    accentDot: 'bg-violet-400',
    title: 'Global Export Freight & Customs',
    subtitle: 'Automated PDFKit Bills of Lading, Commercial Invoices, and Certificates of Origin.',
    tag: 'USA · EU · UAE · UK',
  },
  {
    id: 'export-grading',
    image: '/images/hero-export-grading.jpg',
    alt: 'Spice export quality inspection desk with glass sample jars, precision balance scale, and grading sieve',
    badge: 'Quality & Compliance Suite',
    accentDot: 'bg-amber-400',
    title: 'Batch Quality & Dual-Currency Control',
    subtitle: 'Sample verification, HS tariff mapping, and role-scoped inventory & financial ledgers.',
    tag: 'USD ($) & LKR (Rs.)',
  },
];

const AUTO_ADVANCE_MS = 5000;

/**
 * Auto-rotating hero showcase carousel for Ceylon Spices BIMS.
 * Supports pause-on-hover, explicit play/pause, indicator tabs, and keyboard arrows.
 */
export default function HeroCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const slideCount = HERO_SLIDES.length;
  const currentSlide = HERO_SLIDES[activeIndex];
  const autoPlayActive = !isPaused && !isHovered;

  useEffect(() => {
    if (!autoPlayActive) return undefined;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % slideCount);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [autoPlayActive, activeIndex, slideCount]);

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + slideCount) % slideCount);
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % slideCount);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      handlePrev();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      handleNext();
    }
  };

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="Ceylon Spices Trade and Export Showcase"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="bims-card overflow-hidden flex flex-col justify-between h-full focus:outline-none focus:ring-2 focus:ring-violet-500/60"
    >
      {/* VISUAL SLIDE STAGE */}
      <div className="relative w-full aspect-[16/9] lg:aspect-auto lg:flex-1 lg:min-h-[320px] overflow-hidden bg-zinc-950">
        {HERO_SLIDES.map((slide, idx) => {
          const isActive = idx === activeIndex;
          return (
            <div
              key={slide.id}
              aria-hidden={!isActive}
              className={`absolute inset-0 transition-all duration-700 ease-out ${
                isActive
                  ? 'opacity-100 scale-100 z-10'
                  : 'opacity-0 scale-[1.03] z-0 pointer-events-none'
              }`}
            >
              <img
                src={slide.image}
                alt={slide.alt}
                loading={idx === 0 ? 'eager' : 'lazy'}
                className="w-full h-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/35 to-zinc-950/20" />
            </div>
          );
        })}

        {/* TOP BADGES */}
        <div className="absolute top-3.5 left-3.5 right-3.5 z-20 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-950/70 backdrop-blur-md border border-white/15 text-[11px] font-semibold text-zinc-100 shadow-sm">
            <span className={`w-2 h-2 rounded-full ${currentSlide.accentDot}`} />
            <span>{currentSlide.badge}</span>
          </span>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-950/70 backdrop-blur-md border border-white/15 text-[11px] font-medium text-zinc-200">
            <span className="tabular-nums">
              {String(activeIndex + 1).padStart(2, '0')} / {String(slideCount).padStart(2, '0')}
            </span>
            <button
              type="button"
              onClick={() => setIsPaused((prev) => !prev)}
              aria-label={isPaused ? 'Resume auto-slide' : 'Pause auto-slide'}
              title={isPaused ? 'Resume auto-slide' : 'Pause auto-slide'}
              className="w-5 h-5 rounded-full hover:bg-white/15 flex items-center justify-center transition-colors cursor-pointer"
            >
              {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* BOTTOM CAPTION OVERLAY */}
        <div className="absolute bottom-3.5 left-4 right-4 z-20 flex flex-col sm:flex-row sm:items-end justify-between gap-2.5">
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug">
              {currentSlide.title}
            </h2>
            <p className="text-xs text-zinc-200/90 mt-0.5 line-clamp-2 max-w-md">
              {currentSlide.subtitle}
            </p>
          </div>

          <span className="self-start sm:self-end shrink-0 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-[11px] font-semibold text-white">
            {currentSlide.tag}
          </span>
        </div>
      </div>

      {/* BENTO FOOTER CONTROLS */}
      <div
        className="px-4 py-3 border-t flex items-center justify-between gap-3"
        style={{ borderColor: 'var(--border-card)' }}
      >
        <div className="flex items-center gap-1.5" role="tablist" aria-label="Select hero slide">
          {HERO_SLIDES.map((slide, idx) => {
            const isActive = idx === activeIndex;
            return (
              <button
                key={slide.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={`Go to slide ${idx + 1}: ${slide.title}`}
                onClick={() => setActiveIndex(idx)}
                className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                  isActive
                    ? 'w-7 bg-violet-500'
                    : 'w-2 bg-zinc-400/40 hover:bg-zinc-400/70'
                }`}
              />
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline text-[11px] text-zinc-500 dark:text-zinc-400 mr-1">
            {isPaused ? 'Paused' : isHovered ? 'Paused on hover' : 'Auto-playing'}
          </span>
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous slide"
            title="Previous slide"
            className="w-8 h-8 rounded-full bims-subcard flex items-center justify-center text-zinc-500 dark:text-zinc-300 hover:text-violet-500 dark:hover:text-violet-400 hover:border-violet-500/40 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            aria-label="Next slide"
            title="Next slide"
            className="w-8 h-8 rounded-full bims-subcard flex items-center justify-center text-zinc-500 dark:text-zinc-300 hover:text-violet-500 dark:hover:text-violet-400 hover:border-violet-500/40 transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
