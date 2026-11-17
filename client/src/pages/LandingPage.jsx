import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  Bot,
  FileCheck2,
  Globe2,
  Landmark,
  Leaf,
  Moon,
  ShieldCheck,
  Ship,
  Sun,
} from 'lucide-react';
import { loginUser } from '../features/auth/authSlice';
import { toggleTheme } from '../features/theme/themeSlice';
import { api } from '../services/api';

export default function LandingPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { token, user } = useSelector((state) => state.auth);
  const { mode } = useSelector((state) => state.theme);
  const [showcase, setShowcase] = useState(null);

  useEffect(() => {
    api
      .get('/public/showcase')
      .then(({ data }) => setShowcase(data))
      .catch(() => {});
  }, []);

  const handleQuickDemoLogin = async (email) => {
    const res = await dispatch(loginUser({ email, password: 'Password@123' }));
    if (res.meta.requestStatus === 'fulfilled') {
      navigate('/dashboard');
    }
  };

  const spices = showcase?.spices || [];

  return (
    <div className="min-h-screen transition-colors">
      {/* STICKY LANDING HEADER */}
      <header
        className="sticky top-0 z-30 border-b backdrop-blur-md"
        style={{
          backgroundColor: 'var(--bg-header)',
          borderColor: 'var(--border-card)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500">
              <Leaf className="w-5 h-5" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-bold tracking-tight">Ceylon Spices</p>
              <p className="text-[11px] text-zinc-400 font-medium">BIMS Trade Platform</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-1 rounded-full bims-subcard p-1 text-xs font-medium">
            <a href="#spices" className="px-3.5 py-1.5 rounded-full hover:text-violet-400">
              Sri Lankan Spices
            </a>
            <a href="#currencies" className="px-3.5 py-1.5 rounded-full hover:text-violet-400">
              USD &amp; LKR Trade
            </a>
            <a href="#modules" className="px-3.5 py-1.5 rounded-full hover:text-violet-400">
              ERP Modules
            </a>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => dispatch(toggleTheme())}
              aria-label="Toggle Light/Dark Theme"
              className="h-9 px-3.5 rounded-full bims-subcard flex items-center gap-1.5 text-xs font-medium cursor-pointer"
            >
              {mode === 'dark' ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-violet-600" />
                  <span>Dark</span>
                </>
              )}
            </button>

            {token && user ? (
              <Link
                to="/dashboard"
                className="h-9 px-4 rounded-full bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold flex items-center gap-1.5"
              >
                <span>Open Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <Link
                to="/login"
                className="h-9 px-4 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-violet-600/20"
              >
                <span>Sign In to BIMS</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-12">
        {/* HERO BENTO GRID */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          <div className="lg:col-span-7 bims-card p-7 sm:p-9 flex flex-col justify-between">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-violet-500/15 text-violet-400 border border-violet-500/30 mb-4">
                <Ship className="w-3.5 h-3.5" />
                Business Management &amp; Import-Export System
              </span>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
                Unified Sri Lankan Spice Trade, Inventory &amp; Customs Automation
              </h1>
              <p className="text-sm text-zinc-400 mt-3 max-w-2xl leading-relaxed">
                Manage export-grade Ceylon Cinnamon, Pepper, Cardamom, Cloves, Nutmeg, Turmeric,
                and Vanilla in one platform — with dual-currency support (<strong>USD $</strong> for
                International Buyers &amp; Exports and <strong>LKR Rs.</strong> for Local Buyers &amp;
                Sri Lankan Growers), automated PDFKit customs docs, and a Gemini AI Copilot.
              </p>
            </div>

            <div className="mt-7 pt-6 border-t border-zinc-800/40 flex flex-wrap items-center gap-3">
              <Link
                to="/login"
                className="px-6 py-3 rounded-full bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-violet-600/25"
              >
                <span>Sign In to BIMS Portal</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin('admin@ceylonspices.com')}
                className="px-4 py-2.5 rounded-full bims-subcard text-xs font-semibold hover:border-violet-500/50 cursor-pointer"
              >
                Quick Launch: Admin Demo
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('manager@ceylonspices.com')}
                className="px-4 py-2.5 rounded-full bims-subcard text-xs font-semibold hover:border-emerald-500/50 cursor-pointer"
              >
                Manager Demo
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('staff@ceylonspices.com')}
                className="px-4 py-2.5 rounded-full bims-subcard text-xs font-semibold hover:border-amber-500/50 cursor-pointer"
              >
                Staff Demo
              </button>
            </div>
          </div>

          <div id="currencies" className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bims-card p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-400">International Exports</span>
                <Globe2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="my-3">
                <p className="text-3xl font-bold text-emerald-400">$485K</p>
                <p className="text-xs text-zinc-400 mt-1">
                  Settled in <strong>USD ($)</strong> across USA, Germany, UAE &amp; UK
                </p>
              </div>
              <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 self-start">
                USD ($) International Ledger
              </span>
            </div>

            <div className="bims-card p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-400">Domestic Sri Lanka Trade</span>
                <Landmark className="w-4 h-4 text-amber-400" />
              </div>
              <div className="my-3">
                <p className="text-3xl font-bold text-amber-400">Rs. 68.5M</p>
                <p className="text-xs text-zinc-400 mt-1">
                  Local Buyers &amp; Kandy/Matale Suppliers in <strong>LKR (Rs.)</strong>
                </p>
              </div>
              <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-400 self-start">
                LKR (Rs.) Domestic Ledger
              </span>
            </div>

            <div className="sm:col-span-2 rounded-3xl bg-gradient-to-br from-[#6D28D9] via-[#7C3AED] to-[#4F46E5] p-6 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-violet-200">
                  <Bot className="w-4 h-4" />
                  <span>RBAC-Aware Gemini AI Assistant</span>
                </div>
                <h3 className="text-lg font-bold mt-1">
                  Role-Scoped ERP Intelligence &amp; Automated Trade Docs
                </h3>
                <p className="text-xs text-violet-100/90 mt-1">
                  Generates Commercial Invoices, Packing Lists, Bills of Lading &amp; Certificates
                  of Origin in one click.
                </p>
              </div>
              <Link
                to="/login"
                className="px-5 py-2.5 rounded-full bg-white text-zinc-950 font-semibold text-xs shrink-0 hover:bg-zinc-100"
              >
                Sign In
              </Link>
            </div>
          </div>
        </section>

        {/* SRI LANKAN SPICES CATALOG SHOWCASE WITH PRODUCT IMAGES */}
        <section id="spices" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight">
                Authentic Sri Lankan Spice Catalog (Export USD &amp; Local LKR)
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Live inventory items with HS tariff classifications, export USD pricing, and local
                LKR wholesale pricing.
              </p>
            </div>
            <Link
              to="/login"
              className="text-xs font-semibold text-violet-400 hover:underline flex items-center gap-1"
            >
              <span>Manage Catalog</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {spices.slice(0, 7).map((spice) => (
              <div key={spice.productId} className="bims-card p-4 flex flex-col justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={spice.imageUrl}
                    alt={spice.name}
                    className="w-14 h-14 rounded-2xl object-cover border border-zinc-700/40 shrink-0"
                  />
                  <div className="min-w-0">
                    <span className="text-[10px] font-semibold text-amber-400">
                      {spice.sku} · HS {spice.hsCode || '0906.11'}
                    </span>
                    <h3 className="text-sm font-bold truncate">{spice.name}</h3>
                    <p className="text-[11px] text-zinc-400 truncate">
                      {spice.originRegion || 'Sri Lanka'}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-800/40 flex items-center justify-between text-xs">
                  <div>
                    <p className="text-[10px] text-zinc-400">Export (USD)</p>
                    <p className="font-bold text-emerald-400">${spice.unitPrice}/kg</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-zinc-400">Local (LKR)</p>
                    <p className="font-bold text-amber-400">
                      Rs. {Number(spice.unitPriceLkr || spice.unitPrice * 300).toLocaleString()}/kg
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CORE MODULES BENTO OVERVIEW */}
        <section id="modules" className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bims-card p-5 space-y-2">
            <ShieldCheck className="w-6 h-6 text-violet-400" />
            <h3 className="text-base font-bold">Role-Based Access Control (RBAC)</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Granular permissions for Administrators, Managers, and Staff across Inventory,
              Suppliers, Buyers, Trade Docs, Finance, and the Gemini AI Copilot.
            </p>
          </div>

          <div className="bims-card p-5 space-y-2">
            <Globe2 className="w-6 h-6 text-emerald-400" />
            <h3 className="text-base font-bold">Separated International &amp; Local Buyers</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              International buyers (Germany, USA, UAE, Japan) operate in <strong>USD ($)</strong>,
              while domestic Sri Lankan buyers and suppliers operate in <strong>LKR (Rs.)</strong>.
            </p>
          </div>

          <div className="bims-card p-5 space-y-2">
            <FileCheck2 className="w-6 h-6 text-amber-400" />
            <h3 className="text-base font-bold">Automated PDFKit Customs Suite</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Instant generation of Commercial Invoices, Packing Lists, Bills of Lading, and Sri
              Lankan Certificates of Origin with live HS codes and Incoterms.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
