const fs = require('node:fs/promises');
const path = require('node:path');

const storageDirectory = path.resolve(__dirname, '../../storage');
const documents = new Map();

function save(document) {
  documents.set(document.id, document);
}

function findAll() {
  return [...documents.values()];
}

function findById(id) {
  return documents.get(id) || null;
}

function getStoredFilePath(filename) {
  return path.join(storageDirectory, filename);
}

async function removeStoredFile(filename) {
  try {
    await fs.unlink(getStoredFilePath(filename));
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

module.exports = { save, findAll, findById, getStoredFilePath, removeStoredFile };