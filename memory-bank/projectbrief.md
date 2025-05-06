# projectbrief.md

This is the foundation document for the Memory Bank. 
- Define the project’s core requirements and goals here.
- This file is the source of truth for project scope.

## Project Requirements

### Frontend
- Users can upload a single PDF file (max 5MB) via drag-and-drop or file input in the chatbot UI.
- UI initiates the LangGraph workflow by sending the file path to the backend.
- Real-time streaming of agent-generated messages and state updates from the LangGraph server to the UI (using StreamProvider and useStream hooks).
- Display accumulated state (e.g., risk_data) and messages sequentially in the chat, using standard LangGraph state management (ui_elements, append_ui_elements, etc).
- Render the final risk analysis (risk_data) as a table in the chat UI, showing fields like Id, Risco, Probabilidade, Impacto Geral, Pontuação Geral, Nível de Risco.
- Provide a "Download as Word" button that generates a .docx file from risk_data (via a small utility API).
- Use React, TailwindCSS, ShadCN for styling and polish.
- Connect to LangGraph server at http://localhost:8123/<graph_id> using @langchain/langgraph-sdk RemoteRunnable.
- Redesign UI into a dashboard layout with sidebar navigation, top bar, and wizard steps for risk analysis workflow.
- Implement wizard steps: Document Ingestion, Information Extraction, Initial Report Generation, Report Refinement, Cause Analysis, Damage Assessment, Risk Evaluation (matrix), Hazard Identification, Protection Strategy Development.
- Add panels for progress tracking (stepper) and agent logs (table view).
- Provide export options for final reports (e.g., .docx download).
- Ensure responsive, modern, and accessible UI using TailwindCSS and shadcn.
- Integrate with backend APIs (FastAPI for upload/download, LangGraph for workflow data).
- Manage UI state to reflect workflow progress per document; parse/display JSON data between agents.
- Implement error handling for uploads and API failures; maintain UI responsiveness.

### Backend
- LangGraph server (Dockerized, running graph.py) processes PDF uploads and manages multi-agent workflow.
- Exposes endpoints for workflow invocation and streaming (e.g., /invoke, /stream).
- Receives PDF files in ./shared_uploads (host), mounted to /app/uploads (container).
- Handles state management (risk_data, ui_elements, etc.) and outputs final risk_data.
- Provides logic for generating Word documents from risk_data (Python utils.py: generate_risk_doc()).
- Runs in a local Docker Compose stack with Redis, Postgres, Weaviate for persistence and scalability.
- No changes to backend logic or multi-agent system in this phase. Continue to provide APIs and workflow data as in previous phase.

## Project Goals

### Frontend
- Deliver an engaging, real-time chat UI for risk analysis of procurement documents.
- Ensure seamless file upload, real-time feedback, and formatted output for end-users.
- Enable easy download of results and support for minor workflow adjustments post-analysis.
- Deliver a structured, step-by-step dashboard for risk analysis, replacing text-based chat with clear workflow visualization.
- Enable users to track progress, view agent logs, and access/export reports easily.
- Maintain high usability, accessibility, and professional design standards.

### Backend
- Robust, scalable LangGraph server for document analysis, streaming, and state management.
- Reliable integration with frontend and local infrastructure.
- Maintain clear separation of concerns and smooth handoff between backend and frontend responsibilities.
- Ensure stability and reliability of existing APIs and workflow logic; support new frontend dashboard features without changes to core backend.
