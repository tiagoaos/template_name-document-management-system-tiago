import { useEffect, useState } from 'react';
import UploadComponent from './components/UploadComponent.jsx';
import DocumentList from './components/DocumentList.jsx';
import { listDocuments } from './services/documentApi.js';
import './App.css';

export default function App() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);

  function refreshDocuments() {
    setRevision((current) => current + 1);
  }

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');

    listDocuments({ signal: controller.signal })
      .then((result) => {
        if (!controller.signal.aborted) setDocuments(result);
      })
      .catch((requestError) => {
        if (!controller.signal.aborted) setError(requestError.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [revision]);

  return (
    <main className="workspace">
      <header className="workspace-header">
        <p className="brand">DMS</p>
        <h1>Documentos</h1>
      </header>
      <UploadComponent onUploadSuccess={refreshDocuments} />
      <DocumentList
        documents={documents}
        loading={loading}
        error={error}
        onRetry={refreshDocuments}
      />
    </main>
  );
}
