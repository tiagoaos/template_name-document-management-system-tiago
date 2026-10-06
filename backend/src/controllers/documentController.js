const path = require('node:path');
const documentService = require('../services/documentService');

function createError(code, message, statusCode) {
  const error = new Error(message);
  error.code = code;
  error.publicMessage = message;
  error.statusCode = statusCode;
  return error;
}

async function upload(req, res, next) {
  if (!req.file) {
    return res.status(400).json({
      error: {
        code: 'FILE_REQUIRED',
        message: 'Envie um arquivo no campo "file".',
      },
    });
  }

  try {
    const document = await documentService.createDocument(req.file);
    return res.status(201).json(document);
  } catch (error) {
    return next(createError('UPLOAD_FAILED', 'Não foi possível salvar o documento.'));
  }
}

function list(req, res, next) {
  try {
    return res.status(200).json(documentService.listDocuments());
  } catch (error) {
    return next(createError('DOCUMENT_LIST_FAILED', 'Não foi possível listar os documentos.'));
  }
}

function download(req, res, next) {
  try {
    const document = documentService.getDocumentForDownload(req.params.id);
    if (!document) {
      return res.status(404).json({
        error: {
          code: 'DOCUMENT_NOT_FOUND',
          message: 'Documento não encontrado.',
        },
      });
    }

    const contentType = /^[\w!#$&^.+-]+\/[\w!#$&^.+-]+$/.test(document.mimeType)
      ? document.mimeType
      : 'application/octet-stream';
    const originalName = path.basename(document.originalName.replace(/\\/g, '/'));

    res.set('Content-Type', contentType);
    res.set('X-Content-Type-Options', 'nosniff');
    return res.download(document.filePath, originalName, (error) => {
      if (error) {
        return next(createError('DOWNLOAD_FAILED', 'Não foi possível baixar o documento.'));
      }
    });
  } catch (error) {
    return next(createError('DOWNLOAD_FAILED', 'Não foi possível baixar o documento.'));
  }
}

module.exports = { upload, list, download };