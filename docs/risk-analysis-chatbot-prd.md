# Product Requirements Document (PRD): Risk Analysis Chatbot UI

## 1. Overview

### 1.1 Purpose
This PRD outlines the development of a chatbot user interface (UI) that integrates with an existing LangGraph-based risk analysis workflow for public procurement documents. The chatbot allows users to upload PDF files, observe the real-time reasoning process of the analysis, and receive a formatted risk analysis output with a Word document download option—all within a conversational chat experience.

### 1.2 Background
The backend workflow (`graph.py`) is fully functional, processing PDF documents through a multi-agent system to produce detailed risk analyses, including risks, causes, hazards, and protection measures. The current implementation works well in LangGraph Studio, but lacks a user-friendly frontend. This project enhances the `agent-chat-ui` (React-based) to provide an engaging UX for end-users, leveraging the existing streaming and thread management capabilities.

### 1.3 Goals
- Enable users to upload PDF files and initiate the risk analysis workflow via the chatbot UI.
- Display real-time agent messages and state updates during processing for transparency.
- Present the final risk analysis (`protection_measures_list`) in a table format within the chat.
- Provide an option to download the analysis as a Word document.
- Ensure seamless integration with the existing backend without modifying its core functionality.

---

## 2. Requirements

### 2.1 Functional Requirements

#### 2.1.1 File Upload
- **FR-1:** Users must be able to upload a single PDF file via a drag-and-drop zone or file input field in the chatbot UI.
  - **Input Format:** PDF only.
  - **Size Limit:** Maximum 5MB per file.
  - **Storage:** Uploaded files are saved to a local directory (`src/assistant/documents/`).
  - **Output:** The UI sends a JSON request to the backend (e.g., `{"input_file": "src/assistant/documents/<filename>.pdf"}`) to start the workflow.

#### 2.1.2 Real-Time Interaction
- **FR-2:** The chatbot must stream all agent-generated messages from the backend to the UI in real-time as the workflow processes the PDF.
  - **Example Messages:** "Extracting briefing…", "Risk R001 identified: Excessive dependency…".
  - **Source:** Messages produced by agents in `graph.py` (e.g., `ExtractorAgent`, `CreatorAgent`).
- **FR-3:** At each workflow step, display relevant state updates (e.g., `risk_list`, `causes_list`) in the chat space.
  - **Purpose:** Keep users informed of progress and intermediate outputs.

#### 2.1.3 Final Output Formatting
- **FR-4:** Upon workflow completion, the chatbot must format the `protection_measures_list` (JSON `List[dict]`) into a table within the chat UI.
  - **Fields to Display:** `Id`, `Risco`, `Probabilidade`, `Impacto Geral`, `Pontuação Geral`, `Nível de Risco`, etc., based on the JSON structure:
    ```json
    {
      "Id": "R001",
      "Risco": "Dependência excessiva da capacidade técnica...",
      "Probabilidade": 3,
      "Impacto Geral": 5.344979613454247,
      "Pontuação Geral": 16,
      "Nível de Risco": "Baixo"
    }
    ```
  - **Table Example:**
    ```
    | ID   | Risk Description             | Probability | Impact | Score | Level |
    |------|------------------------------|-------------|--------|-------|-------|
    | R001 | Excessive dependency on...   | 3           | 5.34   | 16    | Low   |
    ```
- **FR-5:** Provide a "Download as Word" button in the chat UI to export the risk analysis using `generate_risk_doc()` from `utils.py`.
  - **Output Format:** Word document (.docx).

#### 2.1.4 Post-Output Interaction
- **FR-6:** After displaying the output, allow users to request minor adjustments via chat commands.
  - **Example Command:** "Change the probability of R001 to 4".
  - **Scope:** Limited to simple updates for now; no complex reprocessing required.

### 2.2 Non-Functional Requirements

#### 2.2.1 Performance
- **NFR-1:** Support processing one file at a time; no concurrent uploads or asynchronous handling needed in this phase.
- **NFR-2:** Handle files up to 5MB without performance degradation (larger files are out of scope for now).

#### 2.2.2 Security
- **NFR-3:** No authentication or privacy features required for the development environment.

#### 2.2.3 Usability
- **NFR-4:** Ensure the UI is intuitive, with clear feedback (e.g., streamed messages, toast notifications for errors).
- **NFR-5:** Use responsive design for desktop views (mobile support optional).

#### 2.2.4 Environment
- **NFR-6:** Run locally during development; deploy to a local CPD (data center) later.

---

## 3. Technical Design

### 3.1 Frontend
- **Framework:** React with `agent-chat-ui`.
- **Components:**
  - **File Upload Interface:** Add a drag-and-drop zone or `<input type="file">` element.
    - On upload, save the file locally and send the path to the backend.
  - **Message Display:** Use existing `StreamProvider` and `useStream` hook for real-time message streaming.
  - **Custom Components:** Develop (in the final phase) table components to render `protection_measures_list`.
    - Include a download button linked to the `/download` endpoint.
- **Styling:** Optionally use TailwindCSS and ShadCN for UI polish.
- **Integration:** Connect to the backend via `@langchain/langgraph-sdk`.

### 3.2 Backend
- **Framework:** Existing LangGraph (`graph.py`, `main.py`) with FastAPI for API management.
- **API Endpoints:**
  - **POST /upload:**
    - **Input:** Multipart form data with a PDF file.
    - **Action:** Save the file to `src/assistant/documents/` and invoke the workflow with `{"input_file": "<path>"}`.
    - **Response:** Success message or error (e.g., "No input file provided").
  - **POST /stream:**
    - **Action:** Stream agent messages and state updates to the UI.
    - **Response:** Real-time message chunks.
  - **GET /download:**
    - **Action:** Generate and return a Word document using `generate_risk_doc()`.
    - **Response:** File download (.docx).
- **File Handling:** Save uploaded PDFs to `src/assistant/documents/` for reference.

### 3.3 Existing Assumptions
- **Workflow:** `graph.py` and `load_document` are fully operational and require no changes.
- **Streaming:** The backend already supports streaming messages via LangGraph.
- **Error Handling:** Existing logging and state updates (e.g., `validation_errors`) are sufficient.

### 3.4 Codebase Separation
- **Frontend:** Maintained in the current React-based `agent-chat-ui` repository.
- **Backend:** Kept in a separate Python-based LangGraph repository.
- **Integration:** Connection between the two via HTTP endpoints and LangGraph SDK.

---

## 4. User Experience

### 4.1 Interaction Flow
1. **Upload:** User drags a PDF into the chat UI or selects it via a file input.
   - **Chat Response:** "File uploaded: <filename>.pdf. Starting analysis…"
2. **Processing:** Chatbot streams agent messages and state outputs in real-time.
   - **Example:** "Extracting briefing…", "Risk R001: Excessive dependency…", "State updated: risk_list generated."
3. **Output:** Chatbot displays the risk analysis in a table format.
   - **Example:** Table with risks, probabilities, impacts, etc.
4. **Download:** User clicks "Download as Word" to save the analysis.
5. **Adjustment:** User types a command (e.g., "Change R001 probability to 4"), and the chatbot responds with the updated value.

### 4.2 Feedback Mechanisms
- **Progress:** Streamed messages indicate workflow status.
- **Errors:** Toast notifications display issues (e.g., "No input file provided").

---

## 5. Development Phases

### 5.1 Phase 1: File Upload Integration
- **Tasks:**
  - Add file upload UI component.
  - Save files to `src/assistant/documents/`.
  - Send correct file path to the backend.
- **Deliverable:** Resolve the "No input file provided" error.
- **Test:** Upload a sample PDF (e.g., `SEI_1535518_Projeto_Basico.pdf`).

### 5.2 Phase 2: Streaming Verification
- **Tasks:**
  - Confirm agent messages stream to the UI during processing.
  - Display state updates at each step.
- **Deliverable:** Real-time reasoning visible in the chat.

### 5.3 Phase 3: Output Formatting
- **Tasks:**
  - Develop table components for `protection_measures_list`.
- **Deliverable:** Risk analysis displayed as a table in the chat.

### 5.4 Phase 4: Download Functionality
- **Tasks:**
  - Integrate `generate_risk_doc()` with a download endpoint.
  - Add a "Download as Word" button.
- **Deliverable:** Users can download the analysis as a Word document.

---

## 6. Success Criteria
- Users can upload a PDF (<5MB) and see the full reasoning process in the chat.
- The final risk analysis is presented in a table with accurate data from `protection_measures_list`.
- Users can download a Word document containing the analysis.
- No backend modifications are needed; integration is seamless.

---

## 7. Out of Scope
- Support for non-PDF inputs or multiple file uploads.
- Authentication or privacy features.
- Asynchronous processing for large files (>5MB).
- Concurrent workflow handling.
- Extensive post-output interactions beyond simple adjustments.

---

## 8. Risks and Mitigations
- **Risk:** "No input file provided" error persists.
  - **Mitigation:** Debug file path handling between UI and backend; ensure paths match LangGraph Studio format.
- **Risk:** Streaming messages overwhelm the UI.
  - **Mitigation:** Limit message frequency or buffer them appropriately (handled by existing LangGraph setup).
- **Risk:** Table rendering is slow for large outputs.
  - **Mitigation:** Optimize custom components in Phase 3; defer complex UI enhancements to later iterations.

---

## 9. Appendix

### 9.1 Sample Output JSON
```json
{
  "Id": "R001",
  "Risco": "Dependência excessiva da capacidade técnica...",
  "Probabilidade": 3,
  "Impacto Geral": 5.344979613454247,
  "Pontuação Geral": 16,
  "Nível de Risco": "Baixo",
  "Consequências": ["Perda de oportunidades...", "Defasagem em relação..."],
  "Ações de Contingência": [
    {"Descrição": "Estabelecer um canal...", "Responsável": "Área Demandante"}
  ]
}
```

### 9.2 Development Environment
- **Frontend Path:** `C:\Users\suporte\Projects\agent-chat-ui\agent-chat-ui\`
- **Backend Path:** `C:\Users\suporte\Projects\risk_analyst_agent\`
- **API URL:** `http://localhost:2024` (assumed; to be confirmed). 