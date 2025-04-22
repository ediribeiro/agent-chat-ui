# Product Requirements Document (PRD): Risk Analysis Chatbot UI

## 1. Overview

### 1.1 Purpose
This PRD outlines the development of a chatbot user interface (UI) that integrates with a **locally hosted LangGraph server** for risk analysis of public procurement documents. The chatbot allows users to upload PDF files, observe the real-time reasoning process, and receive a formatted risk analysis outputs with a Word document download option—all within a interactive experience.

### 1.2 Background
The backend workflow (`graph.py`), deployed via a **Dockerized LangGraph server environment (including Redis, Postgres, Weaviate)**, is fully functional. It processes PDF documents through a multi-agent system to produce detailed risk analyses. The current project aims to enhance the `agent-chat-ui` (React-based) to provide an engaging UX for end-users, leveraging the LangGraph server's streaming and persistence capabilities.

## 2. Requirements

### 2.1 Functional Requirements

#### 2.1.1 File Upload
- **FR-1:** Users must be able to upload a single PDF file via a drag-and-drop zone or file input field in the chatbot UI.
  - **Input Format:** PDF only.
  - **Size Limit:** Maximum 5MB per file (can be adjusted based on server config).
  - **Storage:** Uploaded files must be placed into the `./shared_uploads` directory on the **host machine**. This directory is mounted into the `langgraph-server` container at `/app/uploads`.
  - **Output:** The UI initiates the LangGraph workflow by sending a request to the LangGraph server (e.g., using `RemoteRunnable` from `@langchain/langgraph-sdk`) with the input containing the **container-relative path** to the file (e.g., `{"input": {"input_file": "/app/uploads/<filename>.pdf"}}`).

#### 2.1.2 Real-Time Interaction
- **FR-2:** The chatbot must stream all agent-generated messages and state updates from the **LangGraph server** to the UI in real-time as the workflow processes the PDF.
  - **Why:** To provide an engaging user experience by showing the AI's thought process and state changes in real-time.
  - **How:** Messages and state streamed from the LangGraph server endpoint (e.g., via the `/stream` endpoint or SDK equivalent).

- **FR-3:** Display relevant state updates (like the growing `risk_list`) in the chat space or a dedicated state view.
  - **Why:** To reliably track and accumulate the UI elements (messages, state updates) that need to be displayed sequentially on the frontend, using LangGraph's standard state management instead of potentially problematic custom event yielding.
  - **How:**
    * Use the `ui_elements` key in the `State` TypedDict to store a list of UI elements.
    * Use the reducer `append_ui_elements` to combine the `ui_elements` lists from different nodes.
    * Use `return {"ui_elements": [ui_payload]}` to return the UI elements from nodes.

#### 2.1.3 Final Output Formatting
- **FR-4:** Upon workflow completion, the chatbot must format the `risk_data` (JSON `List[dict]`) into a table within the chat UI.
  - **Fields to Display:** `Id`, `Risco`, `Probabilidade`, `Impacto Geral`, `Pontuação Geral`, `Nível de Risco`, etc., based on the final state's `risk_data` structure.

#### 2.1.4 Post-Output Interaction
- **FR-5:** Provide a "Download as Word" button in the chat UI. When clicked, the UI should use the final `risk_data` obtained from the LangGraph state and call a **local UI-side function or a separate small utility service** to generate the Word document using the logic from `utils.py`'s `generate_risk_doc()` (or similar).
  - **Output Format:** Word document (.docx).

#### 2.1.5 Post-Output Interaction
- **FR-6:** After displaying the output, allow users to request minor adjustments via chat commands or UI interactions. **(Note: This might require invoking the graph again with modified inputs or potentially using specific graph update endpoints if available/implemented).**

## 3. Technical Design

### 3.1 Frontend
- **Framework:** React with `agent-chat-ui`.
- **Components:**
  - **File Upload Interface:** Add a drag-and-drop zone or `<input type="file">` element.
    - **Crucially**, on upload, the file needs to be transferred to the `./shared_uploads` directory on the **host machine** running the Docker containers. This might require a separate, simple backend endpoint just for handling the upload to the correct shared volume location *before* the LangGraph workflow is triggered.
  - **Message Display:** Use existing `StreamProvider` and `useStream` hook (or SDK equivalents) to connect to the LangGraph server's streaming endpoint.
  - **Custom Components:** Use table components (e.g., `risk-analysis.tsx`, `protection-measures-table.tsx`) to render the `risk_data` from the graph's state of respective nodes. use  `accordion.tsx` to render the messages streamed by the LangGraph server during execution.
    - Include a download button. This button will trigger **client-side generation** of the .docx file using the fetched `risk_data` and potentially a JavaScript library mimicking `utils.py`'s logic, or call a small, separate utility API endpoint if client-side generation is too complex.
- **Styling:** Optionally use TailwindCSS and ShadCN for UI polish.
- **Integration:** Connect to the LangGraph server using `@langchain/langgraph-sdk`'s `RemoteRunnable`, pointing to `http://localhost:8123/<graph_id>` (replace `<graph_id>` with the actual deployed graph ID, often the filename like `graph`).

### 3.2 Backend
- **Framework:** Dockerized LangGraph server (`your-migrated-app:latest` image) running `graph.py`.
- **API Endpoints:** Standard LangGraph server endpoints provided out-of-the-box:
  - `/invoke`: For single, non-streaming runs.
  - `/stream`: For streaming intermediate steps and outputs.
  - `/batch`: For running multiple inputs concurrently.
  - `/config`: To get graph configuration.
  - `/state`: To retrieve the final state of a thread.
  - **(Note: No custom `/upload` or `/download` endpoints on the LangGraph server itself are assumed by default).**
- **File Handling:** The LangGraph server expects input file paths relative to its container filesystem (e.g., `/app/uploads/<filename>.pdf`). Files must be placed in the host's `./shared_uploads` directory beforehand.

### 3.3 Existing Assumptions
- **Workflow:** `graph.py` is operational within the LangGraph server environment.
- **Streaming:** The LangGraph server inherently supports streaming.
- **Error Handling:** Standard LangGraph error responses and logs are used.

### 3.4 Codebase Separation
- **Frontend:** Maintained in the React-based `agent-chat-ui` repository.
- **Backend:** The **Dockerized LangGraph server environment** defined in `docker-compose.yml` and built using `langgraph build`.
- **Integration:** Connection via HTTP requests managed by the LangGraph SDK (`RemoteRunnable`).

## 4. User Experience

### 4.1 Interaction Flow
1. **Upload:** User drags a PDF into the chat UI or selects it.
   - **UI Action:** The UI uploads the file to the designated shared volume (`./shared_uploads` on the host).
   - **Chat Response:** "File uploaded: <filename>.pdf. Starting analysis…"
2. **Initiate Run:** The UI calls the LangGraph server's stream endpoint (via `RemoteRunnable`) with the input `{"input": {"input_file": "/app/uploads/<filename>.pdf"}}` and a unique thread ID. Use native thread id generated by langgraph server.
3. **Processing:** Chatbot streams agent messages and specific state updates received from the LangGraph server in real-time.
   - **Example:** "Extracting briefing…", "Risk R001: Excessive dependency…", "State updated: risk_list generated."
4. **Output:** Chatbot displays the messages during processing and risk analysis of `evaluator.py` appended in ui elements (`risk_data` updated by this node) and protection measures produced by `create_protection_measures.py` appended in ui elements (`risk_data` extracted from the final state) in a table format.
   - **Example:** Table with risks, probabilities, impacts, etc.
5. **Download:** User clicks "Download as Word". The UI uses the retrieved `risk_data` to generate and trigger the download of the .docx file.

## 5. Development Phases

### 5.1 Phase 1: File Upload and Workflow Initiation
- **Tasks:**
  - Add file upload UI component.
  - Implement the mechanism to transfer the uploaded file to the `./shared_uploads` directory on the host machine.
  - Modify the UI to call the LangGraph server's stream endpoint via `RemoteRunnable`, passing the correct container path (`/app/uploads/<filename>.pdf`) as input.
- **Deliverable:** Ability to upload a file and successfully trigger the LangGraph workflow, resolving any path-related errors.
- **Test:** Upload a sample PDF and confirm the LangGraph server starts processing it (check server logs).

### 5.2 Phase 2: Streaming Verification
- **Tasks:**
  1. Configure streaming subscription:
     - Wrap the chat component in `StreamProvider` at `http://localhost:8123/<graphId>/stream?thread_id=<id>`.
     - Use `useStream` or `useStreamContext()` to subscribe to `values` and `messages`.
  2. Validate message delivery:
     - Upload a PDF and trigger analysis.
     - Confirm human and AI messages appear live and in correct chronological order.
  3. Verify state-driven UI updates:
     - Inspect `values.ui_elements` and pass each element to `LoadExternalComponent`.
     - Ensure custom components (e.g., tables) render when state updates arrive.
  4. Debug streaming issues:
     - Check the network tab for SSE/WebSocket events and payload contents.
     - Add `console.log(values)` in the UI to trace payload structure.
- **Deliverable:** Real-time streaming of messages and state updates accurately rendered in the chat UI.

### 5.3 Phase 3: Output Formatting
- **Tasks:**
  - Use custom table components to render `risk_data` extracted from the final LangGraph state: `input-file.tsx`, `risk-analysis.tsx` and `protection-measures-table.tsx`.
- **Deliverable:** Risk analysis and Protection measures displayed as tables in the chat.

### 5.4 Phase 4: Download Functionality
- **Tasks:**
  - Implement the client-side (or separate utility service) logic to generate a Word document from the `risk_data`.
  - Add a "Download as Word" button that triggers this generation and download.
- **Deliverable:** Users can download the analysis as a Word document based on the completed workflow's data.

## 6. Success Criteria
- Users can upload a PDF, have it correctly placed for the server, and see the full reasoning process streamed from the LangGraph server.
- Users can see intermediate reasoning process and key state updates in the chat.
- The final risk analysis is presented in a table with accurate data retrieved from the LangGraph state.
- Users can download a Word document containing the analysis, generated based on the final state data.
- Integration uses standard LangGraph server interactions (SDK/API).

## 7. Out of Scope
- Support for non-PDF inputs or multiple file uploads.
- Authentication or privacy features.
- Asynchronous processing for large files (>5MB).
- Concurrent workflow handling.
- Extensive post-output interactions beyond simple adjustments.

## 8. Risks and Mitigations
- **Risk:** File upload mechanism to the shared host volume is complex or insecure.
  - **Mitigation:** Start with a simple manual copy step for development; later implement a basic, secured upload endpoint specifically for this purpose if needed.
- **Risk:** Streaming messages overwhelm the UI.
  - **Mitigation:** Leverage standard LangGraph SDK streaming capabilities; potentially add UI-side throttling if necessary.

## 9. Appendix

### 9.1 Sample Output JSON
```json
{
    "Id": "R003",
    "Risco": "Gestão contratual deficiente, com falhas na definição e comunicação dos requisitos, ausência de processos de acompanhamento e controle, falta de capacitação dos gestores de contrato, falta de clareza nas definições e processos de comunicação ineficientes, levando a problemas de qualidade, atrasos, insatisfação e comprometimento da execução do contrato.",
    "Relacionado ao": "Gestão Contratual",
    "Fonte": "Item 4.14 A solução deve ser compatível com os requisitos de sustentabilidade ambiental, social e econômica; Item 4.15 A solução deve ser compatível com os requisitos de sustentabilidade ambiental, social e econômica.",
    "Causas": [
        "Falhas na definição e comunicação dos requisitos",
        "Ausência de processos de acompanhamento e controle",
        "Falta de capacitação dos gestores de contrato",
        "Falta de clareza nas definições e processos de comunicação ineficientes"
    ],
    "Probabilidade": 5,
    "Impacto Financeiro": 5,
    "Impacto no Cronograma": 5,
    "Impacto Reputacional": 4,
    "Impacto Geral": 14,
    "Pontuação Geral": 70,
    "Nível de Risco": "Crítico",
    "Intervalo de Confiança": "26 - 71",
    "Consequências": [
        "Aumento significativo dos custos do projeto devido a retrabalhos, multas contratuais e necessidade de aditivos contratuais para corrigir falhas.",
        "Atrasos consideráveis no cronograma, impactando a entrega de produtos/serviços e o cumprimento de metas institucionais.",
        "Desgaste na relação com o fornecedor, gerando conflitos e dificultando a negociação de soluções.",
        "Insatisfação dos usuários finais com a qualidade dos produtos/serviços entregues, comprometendo a imagem da instituição.",
        "Comprometimento da reputação da instituição perante a sociedade e órgãos de controle, devido a falhas na gestão de recursos públicos.",
        "Dificuldade em alcançar os objetivos estratégicos do projeto, resultando em perda de oportunidades e desperdício de recursos.",
        "Possibilidade de ações judiciais por parte do fornecedor ou de terceiros prejudicados pela má gestão contratual."
    ],
    "Análise de Apetite e Tolerância": {
        "Dentro do Apetite ao Risco?": "Não - O risco é classificado como crítico (pontuação 70), muito acima do apetite organizacional que é de moderado a alto.",
        "Dentro da Tolerância?": "Não - Os impactos financeiros (5) e no cronograma (5) máximos, e o impacto reputacional alto (4) estão muito acima do limite de tolerância definido, que permite apenas desvios limitados.",
        "Classificação da Necessidade de Tratamento": "Mitigar",
        "Justificativa": "A redução é a estratégia mais adequada, pois, embora o risco não possa ser completamente eliminado, existem inúmeros controles que podem be implemented para diminuir a probabilidade de ocorrência e o impacto, como a melhor definição de requisitos, acompanhamento rigoroso do contrato e capacitação dos gestores."
    },
    "Ações Preventivas": [
        {
            "Descrição": "Implementar um programa estruturado de capacitação contínua para gestores e fiscais de contratos, com módulos específicos sobre legislação, boas práticas de gestão contratual, resolução de conflitos e elaboração de relatórios, permitindo que os participantes selecionem módulos adicionais conforme suas necessidades específicas e o tipo de contrato que gerenciam.",
            "Responsável": "Equipe de Gestão e Fiscalização do Contrato",
            "Justificativa": "Esta equipe possui a visão técnica sobre as necessidades de capacitação específicas para a gestão contratual, podendo identificar lacunas de conhecimento e propor conteúdos adequados."
        },
        {
            "Descrição": "Desenvolver um manual detalhado de gestão contratual específico para o INEP, com fluxogramas, modelos de documentos, checklists e orientações práticas, permitindo que os gestores adaptem os procedimentos conforme a complexidade e as particularidades de cada contrato sob sua responsabilidade.",
            "Responsável": "Equipe de Gestão e Fiscalização do Contrato e Área Jurídica (PF-INEP)",
            "Justificativa": "A combinação destes setores garante que o manual tenha tanto a perspectiva prática da gestão quanto o embasamento jurídico necessário para a conformidade com a legislação."
        },
        {
            "Descrição": "Criar um processo estruturado de transição para novos gestores de contrato, com período de sobreposição, documentação detalhada do histórico e mentoria, permitindo ajustar o período e a intensidade da transição conforme a complexidade do contrato e a experiência do novo gestor.",
            "Responsável": "Equipe de Gestão e Fiscalização do Contrato",
            "Justificativa": "Esta equipe tem a responsabilidade de garantir a continuidade da gestão contratual, mesmo com mudanças de pessoal."
        }
    ],
    "Ações de Contingência": [
        {
            "Descrição": "Estabelecer uma equipe de intervenção rápida multidisciplinar para atuar em contratos problemáticos, realizando diagnóstico, implementando correções e monitorando resultados, com autonomia para definir a intensidade e duração da intervenção conforme a gravidade dos problemas identificados.",
            "Responsável": "Equipe de Gestão e Fiscalização do Contrato e Área Jurídica (PF-INEP)",
            "Justificativa": "A combinação destes setores permite tanto a correção técnica dos problemas quanto o tratamento adequado das questões jurídicas que possam surgir."
        },
        {
            "Descrição": "Implementar um processo de auditoria interna imediata para contratos com sinais de problema, com metodologia padronizada para identificação de falhas, responsabilidades e ações corretivas, permitindo ajustar o escopo e a profundidade da análise conforme a criticidade do contrato e os recursos disponíveis.",
            "Responsável": "Equipe de Gestão e Fiscalização do Contrato e Área Demandante",
            "Justificativa": "A área demandante pode avaliar tecnicamente se as entregas estão conformes, enquanto a equipe de fiscalização analisa o cumprimento das obrigações contratuais."
        }
    ]
}
```
### 9.2 Development Environment
- **Frontend Path:** `C:\Users\suporte\Projects\agent-chat-ui\agent-chat-ui\`
- **Backend Environment:** Local Docker Compose stack (`docker-compose.yml`) running LangGraph server, Redis, Postgres, Weaviate.
- **LangGraph Server Endpoint:** `http://localhost:8123`
- **Shared Upload Directory (Host):** `./shared_uploads`
- **Shared Upload Directory (Container):** `/app/uploads`

### 9.3 Libraries
- **Frontend:** 
  - React
  - TailwindCSS
  - ShadCN
  - @langchain/langgraph-sdk
    - SDK (TS/JS): https://langchain-ai.github.io/langgraph/cloud/reference/sdk/js_ts_sdk_ref/

- **Backend:** 
  - FastAPI
  - uvicorn
  - LangGraph
  - Weaviate
  - Redis
  - Postgres
  - LangGraph Server
    - Python SDK Reference: https://langchain-ai.github.io/langgraph/cloud/reference/sdk/python_sdk_ref/
    - RemoteGraph: https://langchain-ai.github.io/langgraph/reference/remote_graph/

### 9.4 Guides and Tutorials Reference
- **Local LangGraph Server:**: https://langchain-ai.github.io/langgraph/tutorials/langgraph-platform/local-server/
- **How to integrate LangGraph into your React application:** https://langchain-ai.github.io/langgraph/cloud/how-tos/use_stream_react/
- **How to implement Generative User Interfaces with LangGraph:** https://langchain-ai.github.io/langgraph/cloud/how-tos/generative_ui_react/
