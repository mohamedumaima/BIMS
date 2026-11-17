export default function ModulePlaceholderPage({ title, description, sprint }) {
  return (
    <div className="bg-[#1C1C20] rounded-2xl border border-zinc-800 p-8 max-w-2xl">
      <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-violet-500/15 text-violet-300 border border-violet-500/30 mb-3">
        {sprint}
      </span>
      <h2 className="text-2xl font-bold text-white">{title}</h2>
      <p className="text-sm text-zinc-400 mt-2">{description}</p>
    </div>
  );
}
