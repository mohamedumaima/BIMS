import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Bot, KeyRound, Send, ShieldCheck, Sparkles, X } from 'lucide-react';
import { api } from '../services/api';

const QUICK_PROMPTS = [
  'Show low-stock Sri Lankan spices & prices in USD and LKR',
  'Compare International Buyers (USD) vs Local Buyers (LKR)',
  'Which Sri Lankan suppliers have pending LKR PO approvals?',
  'Show Executive Revenue, Expenses & Net Margin KPIs',
];

export default function AiChatbotWidget() {
  const { user } = useSelector((state) => state.auth);
  const [open, setOpen] = useState(false);
  const [statusInfo, setStatusInfo] = useState(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [interactionId, setInteractionId] = useState(null);
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'bot',
      text: `Ayubowan ${user?.name || 'User'}! I am your Ceylon Spices BIMS AI Copilot (${user?.role || 'STAFF'} access scope). Ask me about Sri Lankan spice stock, International (USD $) vs. Local (LKR Rs.) buyers, supplier POs, or shipments!`,
    },
  ]);

  useEffect(() => {
    if (open) {
      api
        .get('/assistant/status')
        .then(({ data }) => setStatusInfo(data))
        .catch(() => {});
    }
  }, [open]);

  const sendPrompt = async (promptText) => {
    const text = (promptText ?? input).trim();
    if (!text || loading) return;

    const userMsg = { id: `u-${Date.now()}`, sender: 'user', text };
    setMessages((prev) => [...prev, userMsg]);
    if (!promptText) setInput('');
    setLoading(true);

    try {
      const { data } = await api.post('/assistant/chat', {
        message: text,
        previousInteractionId: interactionId,
      });
      if (data.interactionId) {
        setInteractionId(data.interactionId);
      }
      setMessages((prev) => [
        ...prev,
        {
          id: `b-${Date.now()}`,
          sender: 'bot',
          text: data.reply,
          provider: data.provider,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          sender: 'bot',
          text: err.response?.data?.error || 'Unable to reach BIMS AI Assistant.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open BIMS AI Assistant"
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2.5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white px-4 py-3 shadow-xl shadow-violet-600/30 cursor-pointer transition-transform hover:scale-105"
      >
        <Sparkles className="w-4 h-4" />
        <span className="text-xs font-semibold">BIMS AI Copilot</span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end p-3 sm:p-5">
          <div className="bims-card w-full max-w-md h-full max-h-[88vh] flex flex-col overflow-hidden my-auto">
            <div className="p-4 border-b border-zinc-800/40 bg-gradient-to-r from-violet-600/20 to-indigo-600/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-violet-600 text-white flex items-center justify-center">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold">BIMS Gemini AI Copilot</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400">
                      {user?.role}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    RBAC-Scoped Live ERP &amp; Trade Assistant
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-full bims-subcard flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-4 py-2.5 border-b border-zinc-800/40 bims-subcard text-[11px] flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-zinc-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Scope: Inv ({statusInfo?.permissions?.inventory || 'Full'}) · Finance (
                {statusInfo?.permissions?.finance || 'Role-based'})
              </span>
              <span className="flex items-center gap-1 text-zinc-400">
                <KeyRound className="w-3 h-3 text-amber-400" />
                {statusInfo?.geminiConfigured
                  ? `Gemini (${statusInfo.model})`
                  : 'GEMINI_API_KEY ready in server/.env'}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 whitespace-pre-line leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-violet-600 text-white rounded-br-xs'
                        : 'bims-subcard'
                    }`}
                  >
                    {msg.sender === 'bot' ? (
                      <div className="flex items-center gap-1.5 text-[10px] font-semibold text-violet-400 mb-1">
                        <Sparkles className="w-3 h-3" />
                        <span>BIMS AI ({user?.role} View)</span>
                      </div>
                    ) : null}
                    {msg.text}
                  </div>
                </div>
              ))}

              {loading ? (
                <div className="text-xs text-zinc-400 italic px-2">
                  Analyzing authorized BIMS trade records...
                </div>
              ) : null}
            </div>

            <div className="px-3 py-2 border-t border-zinc-800/40 flex gap-1.5 overflow-x-auto">
              {QUICK_PROMPTS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => sendPrompt(q)}
                  className="px-2.5 py-1 rounded-full bims-subcard text-[11px] text-zinc-400 hover:text-violet-400 shrink-0 cursor-pointer"
                >
                  {q}
                </button>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendPrompt();
              }}
              className="p-3 border-t border-zinc-800/40 flex items-center gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about spices, USD/LKR buyers, POs, or shipments..."
                className="flex-1 rounded-full bims-input px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <button
                type="submit"
                disabled={loading}
                aria-label="Send AI Message"
                className="w-9 h-9 rounded-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white flex items-center justify-center cursor-pointer shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
