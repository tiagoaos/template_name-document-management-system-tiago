import DownloadButton from './DownloadButton.jsx';

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
});
const sizeFormatter = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${sizeFormatter.format(bytes / 1024)} KB`;
  return `${sizeFormatter.format(bytes / 1024 ** 2)} MB`;
}

export default function DocumentList({ documents, loading, error, onRetry }) {
  return (
    <section className="documents-section" aria-labelledby="documents-title" aria-busy={loading}>
      <div className="section-heading">
        <h2 id="documents-title">Arquivos</h2>
        {!loading && !error && <span className="document-count">{documents.length} documento(s)</span>}
      </div>
      {loading ? (
        <p role="status">Carregando documentos...</p>
      ) : error ? (
        <div>
          <p className="error-message" role="alert">{error}</p>
          <button className="secondary-button" type="button" onClick={onRetry}>Tentar novamente</button>
        </div>
      ) : documents.length === 0 ? (
        <p className="empty-state">Nenhum documento disponível.</p>
      ) : (
        <ul className="document-list">
          {documents.map((document) => (
            <li className="document-row" key={document.id}>
              <div className="document-details">
                <h3>{document.originalName}</h3>
                <div className="document-metadata">
                  <span>{formatSize(document.size)}</span>
                  <time dateTime={document.uploadedAt}>
                    {dateFormatter.format(new Date(document.uploadedAt))}
                  </time>
                  <span>Dono: {document.owner || 'Não informado'}</span>
                </div>
              </div>
              <DownloadButton document={document} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}