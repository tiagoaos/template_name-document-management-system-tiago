import { useState } from 'react';
import { downloadDocument } from '../services/documentApi.js';

export default function DownloadButton({ document }) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  async function handleDownload() {
    if (downloading) return;
    setDownloading(true);
    setError('');

    try {
      const blob = await downloadDocument(document.id);
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      try {
        link.href = url;
        link.download = document.originalName.replace(/^.*[\\/]/, '');
        window.document.body.appendChild(link);
        link.click();
      } finally {
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="download-action">
      <button
        className="secondary-button"
        type="button"
        onClick={handleDownload}
        disabled={downloading}
        aria-label={`Baixar ${document.originalName}`}
        aria-busy={downloading}
      >
        {downloading ? 'Baixando...' : 'Baixar'}
      </button>
      {error && <p className="error-message" role="alert">{error}</p>}
    </div>
  );
}