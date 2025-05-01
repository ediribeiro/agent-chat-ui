# API Reference

**OpenAPI Spec**: [Local OpenAPI JSON](./localhost-8123-openapi.json)

This document provides a complete HTTP API specification for frontend integration, covering both the Utility Service and the LangGraph Server.

---

## Services & Base URLs

| Service                | Description                         | Base URL                  |
|------------------------|-------------------------------------|---------------------------|
| Utility Service        | File upload/download, logs, health  | http://localhost:8001     |
| LangGraph Server       | Workflow execution, state, store    | http://localhost:8123     |

---

## 1. Utility Service (utility-server)

**Base URL**: `http://localhost:8001`

### 1.1 Health Check

- **GET** `/health`

_Response_ (200):
```json
{ "status": "ok" }
```

### 1.2 Logs Stream (SSE)

- **GET** `/logs`

_Response_: Server-Sent Events stream of JSON log entries.

```js
const es = new EventSource('http://localhost:8001/logs');
es.onmessage = e => console.log(JSON.parse(e.data));
```

### 1.3 File Upload

- **POST** `/upload`
- **Headers**: `Content-Type: multipart/form-data`
- **Form Field**: `file` (PDF, max 5 MB)

_Response_ (200):
```json
{ "input_file": "/app/uploads/yourfile.pdf" }
```

Use the returned `input_file` path in LangGraph Server calls.

### 1.4 Download Report

- **GET** `/api/download?thread_id={threadId}`

_Query Parameter_:
- `thread_id` _(string)_

_Response_: Word document (DOCX)
- **Content-Type**: `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- **Content-Disposition**: `attachment; filename=risk_analysis_{threadId}.docx`

```js
window.location = `http://localhost:8001/api/download?thread_id=${threadId}`;
```

---

## 2. LangGraph Server (langgraph-server)

**Base URL**: `http://localhost:8123`

Interactive docs:
- Swagger UI: `http://localhost:8123/docs`
- GraphQL: `http://localhost:8123/graphql` _(if enabled)_

### 2.1 Assistants

- **GET** `/v1/assistants`
- **GET** `/v1/assistants/{assistant_id}`

### 2.2 Execute Workflow

- **POST** `/threads/{thread_id}/runs/wait`
- **Payload**:
```json
{
  "assistant_id": "<assistant_uuid>",
  "inputs": { "input_file": "/app/uploads/yourfile.pdf" }
}
```

### 2.3 Fetch State & Runs

- **GET** `/v1/state/{thread_id}`
- **GET** `/v1/runs/{run_id}`

### 2.4 Resume Workflow after Interrupt

- **POST** `/threads/{thread_id}/runs/wait`
- **Payload**:
```json
{
  "assistant_id": "<assistant_uuid>",
  "checkpoint": {
    "state": {
      "risk_data": [...],
      "ui_elements": [...],
      "context_analysis": {...},
      "declarations": {...},
      "input_file": "..."
    },
    "config": {
      "type": "state",
      "at_node": "evaluate_report"
    }
  },
  "input": {
    "updatedRows": [
      {
        "Id": "R001",
        "Nome": "Updated risk name",
        "Descrição": "Updated risk description",
        ...
      }
    ]
  }
}
```
- **Behavior**: Resumes the workflow at the interrupted node, merging `updatedRows` into the existing risk data and continuing execution.

### 2.5 Resume Workflow after Interrupt (Post-Output Interaction)

- **POST** `/v1/execute`
- **Payload**:
```json
{
  "assistant_id": "<assistant_uuid>",
  "thread_id": "<thread_id>",
  "command": { "resume": { "updatedRows": [ /* array of updated table rows */ ] } }
}
```
- **Behavior**: Resumes the workflow at the interrupt node, merging `updatedRows` into graph state and continuing execution. Returns next node output or further interrupts if present.

### 2.6 Key-Value Store

| Method        | URL                                    | Description                |
|---------------|----------------------------------------|----------------------------|
| GET           | `/v1/store/{prefix}/{key}`             | Read value                 |
| PUT           | `/v1/store/{prefix}/{key}`             | Create/update value
| DELETE        | `/v1/store/{prefix}/{key}`             | Delete entry               |
| POST (bulk)   | `/v1/store/bulk`                       | Bulk update/list           |

### 2.7 Cron Jobs

- **GET** `/v1/cron`
- **POST** `/v1/cron`
- **DELETE** `/v1/cron/{cron_id}`

### 2.8 Webhooks

- **GET** `/v1/webhooks`
- **POST** `/v1/webhooks`
- **DELETE** `/v1/webhooks/{id}`

---

## 3. Data Schemas

### 3.1 Risk Analysis Item

An element in the `risk_data` array returned by workflow or stored in state.
```json
{
  "Id": "R001",
  "Risco": "Description of the risk.",
  "Relacionado ao": "Context/category.",
  "Fonte": "Source text.",
  "Causas": ["List", "of", "strings"],
  "Consequências": ["List", "of", "strings"],
  "Probabilidade": 3,
  "Impacto Financeiro": 2,
  "Impacto no Cronograma": 4,
  "Impacto Reputacional": 3,
  "Impacto Geral": 8.78,
  "Pontuação Geral": 26,
  "Nível de Risco": "Médio",
  "Intervalo de Confiança": "6 - 47"
}
```

### 3.2 Protection Measure (example)

Use similar fields plus:
```json
{
  "Id": "R008",
  "Risco": "Serviços de educação e treinamento inadequados para atender às necessidades específicas do Revalida.",
  "Relacionado ao": "Solução Selecionada",
  "Fonte": "1, 1 = OUTROS SERVIÇOS DE EDUCAÇÃO E TREINAMENTO",
  "Causas": [
    "Conteúdo dos serviços de treinamento desatualizado",
    "Metodologia de ensino inadequada para as necessidades do Revalida",
    "Falta de alinhamento dos objetivos do treinamento com os resultados esperados",
    "Deficiência na qualificação dos instrutores",
    "Não realização de avaliação da eficácia do treinamento"
  ],
  "Consequências": [
    "Profissionais despreparados para aplicar e corrigir o Revalida.",
    "Falhas na aplicação e correção do exame, comprometendo a sua validade.",
    "Necessidade de investir em treinamento adicional para os profissionais.",
    "Ineficiência na utilização dos recursos destinados ao treinamento.",
    "Dificuldade em garantir a padronização dos procedimentos de avaliação.",
    "Desmotivação dos profissionais envolvidos na aplicação e correção do exame.",
    "Impacto negativo na qualidade do processo de revalidação de diplomas."
  ],
  "Probabilidade": 3,
  "Impacto Financeiro": 2,
  "Impacto no Cronograma": 3,
  "Impacto Reputacional": 3,
  "Probabilidade Simulada": 2.9883877360263726,
  "Impacto Geral": 7.968944549771233,
  "Pontuação Geral": 24,
  "Nível de Risco": "Médio",
  "Intervalo de Confiança": "4 - 44"
}
```

---

## 4. Frontend Integration

- **Directory**: `src/api/` for `api.ts`
- **Suggested exports**:
  - `uploadFile(file: File): Promise<{ input_file: string }>`
  - `getLogs(callback: (log: any) => void)`
  - `getHealth(): Promise<{ status: string }>`
  - `downloadReport(threadId: string)`
  - `executeWorkflow(assistantId: string, inputFile: string)`
  - `getState(threadId: string)`
  - `advanceStep(params: object)`
  - `kvGet(prefix: string, key: string)`
  - `kvPut(prefix: string, key: string, value: any)`
  - `kvDelete(prefix: string, key: string)`
  - `listCron()`
  - `createCron(config: object)`
  - `deleteCron(cronId: string)`

- **Error Handling**: use a shared Axios or fetch client, with interceptors/hooks for HTTP errors.

---

## 5. Official LangGraph Documentation

For deeper reference on the LangGraph Server API and Graph SDK:

- **LangGraph Server Overview**: https://langchain-ai.github.io/langgraph/concepts/langgraph_server  
  High-level overview, key features, and main HTTP endpoints.
- **Graph Definitions**: https://langchain-ai.github.io/langgraph/reference/graphs/  
  How to define, compile, and invoke workflows using `StateGraph` and `CompiledStateGraph`.
- **Store API**: https://langchain-ai.github.io/langgraph/reference/store/  
  Detailed specs for key-value store endpoints (`/v1/store/*`).
- **Prebuilt Components**: https://langchain-ai.github.io/langgraph/reference/prebuilt/  
  Catalog of prebuilt agents, nodes, and pipelines you can import in your graph code.
- **Functional API**: https://langchain-ai.github.io/langgraph/reference/func/#langgraph.func.entrypoint--function-signature  
  Usage of `@langgraph.func.entrypoint` to expose Python functions as graph nodes.
- **Python SDK**: https://langchain-ai.github.io/langgraph/cloud/reference/sdk/python_sdk_ref/  
  Python SDK for LangGraph Server.
- **JavaScript SDK**: https://langchain-ai.github.io/langgraph/cloud/reference/sdk/js_ts_sdk_ref/  
  JavaScript/TypeScript SDK for LangGraph Server.

---

**CORS**: enabled (`*`) on both services; secure accordingly in production.
