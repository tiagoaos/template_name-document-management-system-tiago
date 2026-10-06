const API_PREFIX = '/api';

async function request(path, options, fallbackMessage) {
  let response;

  try {
    response = await fetch(`${API_PREFIX}${path}`, options);
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new Error('Não foi possível conectar ao servidor. Tente novamente.');
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error?.message || fallbackMessage);
  }

  return response;
}

export async function listDocuments({ signal } = {}) {
  const response = await request(
    '/documents',
    { signal },
    'Não foi possível listar os documentos.',
  );
  return response.json();
}

export async function uploadDocument(file) {
  const body = new FormData();
  body.append('file', file);
  const response = await request(
    '/upload',
    { method: 'POST', body },
    'Não foi possível enviar o documento.',
  );
  return response.json();
}

export async function downloadDocument(id) {
  const response = await request(
    `/documents/${encodeURIComponent(id)}/download`,
    {},
    'Não foi possível baixar o documento.',
  );
  return response.blob();
}