export default function ReceiptModal({ title, url, onClose }) {
  if (!url) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-stretch sm:items-center justify-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white sm:rounded-xl shadow-xl w-full max-w-3xl h-full sm:h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-200 shrink-0">
          <h3 className="font-semibold text-emerald-900 truncate">{title || 'Receipt'}</h3>
          <div className="flex items-center gap-2">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-block text-xs font-semibold text-emerald-700 hover:text-emerald-900 border border-emerald-200 rounded-lg px-3 py-1.5"
            >
              Open
            </a>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-800 font-medium px-2 py-1 rounded hover:bg-gray-100"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>
        <div className="flex-1 bg-gray-100 overflow-hidden">
          <iframe src={url} title={title || 'Receipt'} className="w-full h-full border-0" />
        </div>
        <div className="sm:hidden p-3 border-t border-gray-200 shrink-0">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-3 py-2"
          >
            Open / Download
          </a>
        </div>
      </div>
    </div>
  );
}
