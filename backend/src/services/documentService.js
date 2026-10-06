const documentRepository = require('../repositories/documentRepository');

function toPublicDocument(document) {
  return {
    id: document.id,
    originalName: document.originalName,
    size: document.size,
    uploadedAt: document.uploadedAt,
    owner: document.owner,
    mimeType: document.mimeType,
  };
}

async function createDocument(file) {
  const document = {
    id: file.filename,
    originalName: file.originalname,
    size: file.size,
    uploadedAt: new Date().toISOString(),
    owner: null,
    mimeType: file.mimetype,
    storageFilename: file.filename,
  };

  try {
    documentRepository.save(document);
  } catch (error) {
    await documentRepository.removeStoredFile(document.storageFilename).catch(() => {});
    throw error;
  }

  return toPublicDocument(document);
}

function listDocuments() {
  return documentRepository.findAll().map(toPublicDocument);
}

function getDocumentForDownload(id) {
  const document = documentRepository.findById(id);
  if (!document) {
    return null;
  }

  return {
    ...toPublicDocument(document),
    filePath: documentRepository.getStoredFilePath(document.storageFilename),
  };
}

module.exports = { createDocument, listDocuments, getDocumentForDownload };