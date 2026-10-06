const { test } = require('node:test');
const assert = require('node:assert');
const { once } = require('node:events');
const fs = require('node:fs/promises');
const path = require('node:path');
const app = require('../src/app');

// Teste de fumaça do seed: garante que o app Express foi exportado.
// Novos testes serão adicionados durante os Steps 2, 6 e 7 com auxílio do Copilot.
test('o app backend é exportado', () => {
  assert.ok(app, 'o app deve estar definido');
  assert.strictEqual(typeof app, 'function', 'o app Express deve ser uma função');
});

async function withServer(callback) {
  const server = app.listen(0);
  await once(server, 'listening');
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  let uploadedId;

  try {
    await callback(baseUrl, (id) => {
      uploadedId = id;
    });
  } finally {
    await new Promise((resolve) => {
      server.close(resolve);
      server.closeAllConnections();
    });

    if (uploadedId) {
      await fs.rm(path.join(__dirname, '../storage', uploadedId), { force: true });
    }
  }
}

test('upload, listagem e download de documento', async () => {
  await withServer(async (baseUrl, trackUpload) => {
    const formData = new FormData();
    formData.append('file', new Blob(['conteudo de teste'], { type: 'text/plain' }), 'arquivo.txt');

    const uploadResponse = await fetch(`${baseUrl}/upload`, {
      method: 'POST',
      body: formData,
    });
    assert.strictEqual(uploadResponse.status, 201);

    const document = await uploadResponse.json();
    trackUpload(document.id);
    assert.strictEqual(document.originalName, 'arquivo.txt');
    assert.strictEqual(document.size, 17);
    assert.strictEqual(document.owner, null);
    assert.strictEqual(Object.hasOwn(document, 'storageFilename'), false);

    const listResponse = await fetch(`${baseUrl}/documents`);
    assert.strictEqual(listResponse.status, 200);
    assert.deepStrictEqual(await listResponse.json(), [document]);

    const downloadResponse = await fetch(`${baseUrl}/documents/${document.id}/download`);
    assert.strictEqual(downloadResponse.status, 200);
    assert.match(downloadResponse.headers.get('content-disposition'), /^attachment;/);
    assert.match(downloadResponse.headers.get('content-type'), /^text\/plain/);
    assert.strictEqual(downloadResponse.headers.get('x-content-type-options'), 'nosniff');
    assert.strictEqual(await downloadResponse.text(), 'conteudo de teste');
  });
});

test('upload sem arquivo retorna 400', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/upload`, {
      method: 'POST',
      body: new FormData(),
    });

    assert.strictEqual(response.status, 400);
    assert.strictEqual((await response.json()).error.code, 'FILE_REQUIRED');
  });
});

test('download de documento inexistente retorna 404', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/documents/missing-id/download`);

    assert.strictEqual(response.status, 404);
    assert.strictEqual((await response.json()).error.code, 'DOCUMENT_NOT_FOUND');
  });
});
