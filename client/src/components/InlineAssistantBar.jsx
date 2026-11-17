import { useState } from 'react';
import { FileDown, Send, Sparkles, X } from 'lucide-react';
import { api } from '../services/api';

/**
 * Interactive command & AI prompt bar shared across module cards.
 * Supports asking the RBAC-scoped BIMS AI Assistant and triggering
 * a module-specific quick action (e.g., PDF export or modal trigger).
 */
export default function InlineAssistantBar({
  placeholder = 'Ask BIMS AI or run a quick action...',
  defaultPrompt,
  actionLabel,
  onActionClick,
  onReply,
  showInlineReply = true,
}) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [reply, setReply] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const query = prompt.trim() || defaultPrompt;
    if (!query || loading) return;

    setLoading(true);
    setPrompt('');
    try {
      const { data } = await api.post('/assistant/chat', { message: query });
      const text = data.reply || 'No response received.';
      if (onReply) {
        onReply(text, query);
      } else if (showInlineReply) {
        setReply(text);
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'Unable to contact BIMS AI Assistant.';
      if (onReply) {
        onReply(msg, query);
      } else if (showInlineReply) {
        setReply(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 space-y-2.5">
      {showInlineReply && reply && !onReply ? (
        <div className="bims-subcard p-3 text-xs relative">
          <button
            type="button"
            onClick={() => setReply('')}
            aria-label="Dismiss AI response"
            className="absolute top-2 right-2 w-5 h-5 rounded-full bims-card flex items-center justify-center text-zinc-400 hover:text-white cursor-pointer"
          >
            <X className="w-3 h-3" />
          </button>
          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-violet-400 mb-1">
            <Sparkles className="w-3 h-3" />
            <span>BIMS Assistant</span>
          </div>
          <p className="whitespace-pre-line text-zinc-300 pr-5 leading-relaxed">{reply}</p>
        </div>
      ) : null}

      <form
        onSubmit={handleSubmit}
        className="pt-3 border-t border-zinc-800/40 flex items-center justify-between gap-2"
      >
        <div className="flex-1 flex items-center gap-2 bims-subcard px-3.5 py-1.5 rounded-full min-w-0">
          <Sparkles className="w-3.5 h-3.5 text-violet-400 shrink-0" />
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={placeholder}
            aria-label={placeholder}
            className="bg-transparent w-full text-xs focus:outline-none min-w-0"
          />
          <button
            type="submit"
            disabled={loading}
            title="Ask BIMS AI Assistant"
            aria-label="Send prompt to BIMS AI"
            className="w-7 h-7 rounded-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white flex items-center justify-center shrink-0 cursor-pointer transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>

        {onActionClick ? (
          <button
            type="button"
            onClick={onActionClick}
            title={actionLabel || 'Download PDF'}
            aria-label={actionLabel || 'Download PDF'}
            className="h-9 px-3 rounded-full bims-subcard hover:border-violet-500/50 text-xs font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors"
          >
            <FileDown className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">{actionLabel || 'PDF'}</span>
          </button>
        ) : null}
      </form>
    </div>
  );
}
