export default function ReceiptModal({ title, url, onClose }) {
  if (!url) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h3 className="font-semibold text-emerald-900 truncate">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 font-medium px-2 py-1 rounded hover:bg-gray-100"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 bg-gray-100">
          <embed src={url} type="application/pdf" className="w-full h-[68vh]" />
        </div>
      </div>
    </div>
  );
}