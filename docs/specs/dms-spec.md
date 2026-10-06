# Especificação - Document Management System

> Especificação funcional e técnica do MVP. Os endpoints descritos são contratos planejados; ainda não estão implementados no seed atual.

## 1. Objetivo

Permitir que usuários enviem, consultem e baixem documentos por meio de uma aplicação web, armazenando os arquivos exclusivamente no filesystem local da aplicação.

## 2. Escopo

### Dentro do escopo

- Upload de um documento por requisição.
- Listagem dos metadados dos documentos disponíveis.
- Download de um documento pelo identificador.
- Identificação do dono no metadado, sem autenticação ou autorização real no MVP.
- Armazenamento dos arquivos no diretório local `backend/storage`, com Multer e `diskStorage`.
- Armazenamento dos metadados em memória durante a execução do processo.
- Interface web para upload, listagem e download.

### Fora do escopo

- Armazenamento em nuvem, serviços externos ou banco de dados.
- Persistência dos metadados entre reinicializações.
- Autenticação, autorização e isolamento de documentos por usuário.
- Versionamento, compartilhamento, edição ou exclusão de documentos.
- Busca textual, categorização, pré-visualização e conversão de arquivos.
- Replicação, alta disponibilidade, backup ou recuperação de desastres.

## 3. Requisitos funcionais

| ID | Requisito | Prioridade | Critério de aceite |
| --- | --- | --- | --- |
| RF-01 | O sistema deve receber um arquivo por requisição de upload multipart. | Alta | Um envio válido cria um arquivo local e retorna seus metadados. |
| RF-02 | O sistema deve gerar um identificador único e seguro para cada documento. | Alta | O identificador não deriva de caminho ou nome controlado pelo cliente e identifica um único registro. |
| RF-03 | O sistema deve registrar os metadados do documento em memória. | Alta | O documento aparece na listagem após upload enquanto o processo estiver ativo. |
| RF-04 | O sistema deve listar os metadados dos documentos registrados. | Alta | A resposta é um array JSON; sem documentos, retorna `[]`. |
| RF-05 | O sistema deve permitir baixar um documento pelo identificador. | Alta | Um identificador existente retorna os bytes do arquivo com headers de download. |
| RF-06 | O sistema deve responder com erro apropriado para arquivo ausente, documento inexistente ou falha de armazenamento. | Alta | A resposta HTTP indica a classe do erro sem expor caminhos internos ou stack traces. |
| RF-07 | A interface deve permitir selecionar e enviar um documento, exibir o resultado e atualizar a listagem. | Alta | Após upload bem-sucedido, os metadados aparecem na lista sem exigir reinício da aplicação. |
| RF-08 | A interface deve permitir iniciar o download de cada documento listado. | Alta | A ação de download usa o identificador recebido da API. |
| RF-09 | A interface deve informar estados de carregamento e erros de upload, listagem e download. | Média | Falhas não são apresentadas como sucesso e podem ser compreendidas pelo usuário. |

## 4. Requisitos não funcionais

| ID | Requisito |
| --- | --- |
| RNF-01 | Os arquivos devem ser gravados somente em filesystem local usando Multer `diskStorage`, com diretório padrão `backend/storage`. Não usar provedores externos. |
| RNF-02 | Os metadados devem permanecer em memória nesta fase. Reiniciar o processo apaga o catálogo, mesmo que os bytes dos arquivos continuem no disco. |
| RNF-03 | A configuração operacional deve usar variáveis de ambiente, incluindo a porta do servidor e, após definição, o limite máximo de upload. |
| RNF-04 | O backend deve usar Node.js e Express em CommonJS; o frontend, React e Vite em ESM; a implementação permanece em JavaScript sem TypeScript. |
| RNF-05 | Os testes do backend devem usar o runner nativo `node:test`. |
| RNF-06 | O frontend deve consumir a API por `fetch` com prefixo `/api`; no desenvolvimento, o proxy Vite encaminha as requisições ao backend. |
| RNF-07 | Entradas HTTP e operações de filesystem devem ter tratamento explícito de erros. Respostas de erro não devem revelar detalhes internos. |
| RNF-08 | O nome original enviado pelo usuário não deve ser usado como caminho físico de armazenamento. O caminho de download deve ser resolvido pelo identificador registrado, evitando path traversal. |
| RNF-09 | O tamanho máximo e a política de tipos de arquivo precisam ser definidos antes da implementação. Recomendação inicial: aceitar tipos variados e usar limite de tamanho configurável, sem alegar que já está decidido. |

## 5. Modelo de dados

### 5.1 Documento

Registro mantido em memória. Os nomes abaixo são os nomes do contrato JSON.

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `id` | string | Sim | Identificador único, gerado pelo servidor e usado nas rotas. |
| `originalName` | string | Sim | Nome original informado pelo cliente, apenas para exibição e download. |
| `size` | number | Sim | Tamanho do arquivo em bytes. |
| `uploadedAt` | string | Sim | Instante do upload em formato ISO 8601 UTC. |
| `owner` | string ou `null` | Sim | Identificação informativa do dono. A origem do valor permanece pendente; não constitui autenticação nem autorização. |
| `mimeType` | string | Sim | Tipo MIME declarado/detectado durante o recebimento, usado como metadado de resposta. Não é garantia de validação do conteúdo. |

O nome físico armazenado é um detalhe interno do repositório e não deve ser exposto na API. Deve ser gerado pelo servidor e associado ao registro pelo `id`. O diretório e a resolução do caminho devem permanecer sob controle da aplicação.

### 5.2 Ciclo de vida e consistência

- Primeiro, o upload é gravado no filesystem local; depois, o serviço registra os metadados em memória.
- Se o registro falhar depois da gravação, a implementação deve remover o arquivo parcial/órfão quando possível.
- Ao reiniciar o processo, a listagem começa vazia; arquivos antigos no diretório não são considerados documentos registrados automaticamente.
- Se houver metadados para um documento cujo arquivo não possa ser lido, o download retorna erro de servidor e não dados parciais.

## 6. Contratos de API

As rotas abaixo são relativas ao backend. O frontend usa o prefixo `/api` encaminhado pelo proxy de desenvolvimento.

### Formato de erro

```json
{
  "error": {
    "code": "DOCUMENT_NOT_FOUND",
    "message": "Documento não encontrado."
  }
}
```

`code` deve ser estável para tratamento pelo cliente; `message` deve ser seguro para exibição. Erros inesperados retornam mensagem genérica, sem stack trace ou caminho local.

### 6.1 `POST /upload`

Recebe um arquivo e cria o documento. O nome do campo multipart é `file`.

**Requisição**

```http
POST /upload
Content-Type: multipart/form-data
```

Campos de formulário:

| Campo | Tipo | Obrigatório | Descrição |
| --- | --- | --- | --- |
| `file` | arquivo binário | Sim | Arquivo a armazenar. |

A origem de `owner` não foi definida. O cliente não deve ser considerado confiável para estabelecer identidade; decidir se o campo será omitido/nulo ou recebido por mecanismo futuro antes de implementar.

**Sucesso: `201 Created`**

```json
{
  "id": "document-id",
  "originalName": "relatorio.pdf",
  "size": 245760,
  "uploadedAt": "2026-10-06T10:30:00.000Z",
  "owner": null,
  "mimeType": "application/pdf"
}
```

**Erros**

| Status | Código | Quando |
| --- | --- | --- |
| `400` | `FILE_REQUIRED` | Nenhum arquivo foi enviado ou o campo `file` está ausente. |
| `413` | `FILE_TOO_LARGE` | O arquivo excede o limite configurado, quando esse limite for definido. |
| `500` | `UPLOAD_FAILED` | Falha inesperada ao gravar o arquivo ou registrar os metadados. |

### 6.2 `GET /documents`

Lista os metadados registrados em memória. Não retorna conteúdo binário, caminho físico nem nome interno de armazenamento.

**Sucesso: `200 OK`**

```json
[
  {
    "id": "document-id",
    "originalName": "relatorio.pdf",
    "size": 245760,
    "uploadedAt": "2026-10-06T10:30:00.000Z",
    "owner": null,
    "mimeType": "application/pdf"
  }
]
```

Sem documentos, retorna `200 OK` com `[]`. Falha inesperada ao consultar o repositório retorna `500` com código `DOCUMENT_LIST_FAILED`.

### 6.3 `GET /documents/:id/download`

Localiza o documento pelo `id` e transmite o arquivo do filesystem como anexo. O nome original deve ser enviado em `Content-Disposition` de maneira segura para evitar injeção de headers.

**Sucesso: `200 OK`**

- `Content-Type`: `mimeType` registrado; usar `application/octet-stream` como fallback seguro.
- `Content-Disposition`: `attachment` com o nome original codificado corretamente.
- Corpo: bytes do arquivo, sem envelope JSON.

**Erros**

| Status | Código | Quando |
| --- | --- | --- |
| `404` | `DOCUMENT_NOT_FOUND` | Não há registro em memória para o `id`. |
| `500` | `DOWNLOAD_FAILED` | O registro existe, mas não foi possível ler/transmitir o arquivo. |

## 7. Decisões arquiteturais

### Backend

O fluxo de dependência é `routes -> controllers -> services -> repositories`.

- `routes`: definem endpoints, conectam middleware de upload e delegam ao controller.
- `controllers`: traduzem requisição/resposta HTTP, validam presença e formato básico das entradas e escolhem status/headers.
- `services`: aplicam as regras de upload, listagem e obtenção de documento, sem depender de Express.
- `repositories`: encapsulam o armazenamento local dos arquivos e a coleção de metadados em memória.
- Multer com `diskStorage` recebe e grava o upload em diretório local. Não introduzir persistência ou armazenamento remoto.

### Frontend

React organiza a interface em componentes e serviços. A comunicação usa `fetch` no prefixo `/api`, já encaminhado pelo proxy de desenvolvimento do Vite. A interface consome somente os contratos públicos e não conhece caminhos do filesystem.

### Decisões e limitações

- O catálogo em memória é volátil e adequado apenas à fase inicial; arquivos e metadados podem ficar dessincronizados após reinícios.
- Não há autenticação ou autorização no MVP. `owner` é apenas metadado e não deve ser interpretado como fronteira de segurança.
- A política de tipos aceitos, limite máximo de tamanho e origem de `owner` são decisões pendentes antes da implementação.
- A configuração deve ser fornecida via ambiente; valores e nomes definitivos das variáveis de limite ficam para essa decisão.

## 8. Plano de execução em etapas

Este plano organiza o trabalho futuro em marcos. Não inclui tarefas de edição ou execução de arquivos específicos de backend ou frontend.

1. **Validar a especificação**: confirmar contratos, política de upload, limite de tamanho e semântica de `owner`; encerrar as decisões pendentes.
2. **Construir o serviço de documentos**: implementar o fluxo do MVP conforme contratos e limites arquiteturais desta especificação.
3. **Construir a experiência web**: integrar upload, listagem e download usando os contratos publicados.
4. **Verificar o fluxo ponta a ponta**: cobrir sucesso, entradas inválidas, documento inexistente, falhas de filesystem e os limites de persistência em memória.
5. **Revisar e documentar a entrega**: conferir aderência às restrições locais, acessibilidade básica, configuração e instruções de execução.

## 9. Critérios de conclusão do MVP

- Upload válido gera `201`, grava o arquivo localmente e devolve metadados sem expor o caminho interno.
- Listagem devolve os documentos da sessão atual e `[]` quando vazia.
- Download por `id` envia o arquivo com headers seguros; identificador inexistente devolve `404`.
- Erros de validação e filesystem têm status/códigos coerentes e não expõem detalhes internos.
- Interface permite upload, listagem e download e apresenta falhas de forma compreensível.
- Nenhum arquivo é enviado a serviço externo; os metadados continuam em memória.
- Testes automatizados do backend cobrem os contratos e cenários de falha do MVP.