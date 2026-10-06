import { useRef, useState } from 'react';
import { uploadDocument } from '../services/documentApi.js';

export default function UploadComponent({ onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const fileInput = useRef(null);

  async function handleSubmit(event) {
    event.preventDefault();
    if (uploading) return;
    setError('');
    setMessage('');

    if (!file) {
      setError('Selecione um arquivo para enviar.');
      return;
    }

    setUploading(true);
    try {
      const document = await uploadDocument(file);
      setMessage(`Documento "${document.originalName}" enviado com sucesso.`);
      setFile(null);
      fileInput.current.value = '';
      onUploadSuccess(document);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="upload-section" aria-labelledby="upload-title">
      <h2 id="upload-title">Novo documento</h2>
      <form onSubmit={handleSubmit} aria-busy={uploading}>
        <div className="upload-controls">
          <div className="file-field">
            <label htmlFor="document-file">Arquivo</label>
            <input
              ref={fileInput}
              id="document-file"
              name="file"
              type="file"
              disabled={uploading}
              onChange={(event) => {
                setFile(event.target.files[0] || null);
                setError('');
                setMessage('');
              }}
            />
          </div>
          <button type="submit" disabled={!file || uploading}>
            {uploading ? 'Enviando...' : 'Enviar documento'}
          </button>
        </div>
        {error && <p className="error-message" role="alert">{error}</p>}
        <p className="success-message" role="status">{message}</p>
      </form>
    </section>
  );
}