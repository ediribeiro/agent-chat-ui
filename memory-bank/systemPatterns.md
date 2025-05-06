# systemPatterns.md

Document the system architecture, key technical decisions, design patterns, and component relationships.

## Architecture Overview
- **Frontend:** Now includes a dashboard layout with sidebar navigation, wizard steps, progress tracker, agent logs, and report export features.
- **Backend:** Dockerized LangGraph server (Python, graph.py) manages workflow, state, and document analysis. Connected to Redis, Postgres, Weaviate.
- **File Handling:** PDF uploads are routed to a shared host directory, mounted into the backend container for processing.
- **Streaming:** Real-time updates use SSE/web streaming endpoints and frontend hooks/providers.

## Key Patterns
- **State Management:** Uses LangGraph's `ui_elements` and reducers for reliable, sequential UI updates.
- **Streaming:** Frontend subscribes to backend streams using `StreamProvider` and `useStream`.
- **Separation of Concerns:** Strict separation between backend (analysis, state, persistence) and frontend (UI, streaming, rendering, download).
- **Extensibility:** Backend supports new workflow nodes and frontend supports new UI components for future features.
- **Dashboard/Wizard Pattern:** Sequential, non-editable wizard steps for workflow visualization.
- **Progress and Logs:** Stepper for progress, table for agent logs, all state managed on frontend.
- **API Integration:** Frontend fetches data for each step from backend/LangGraph APIs.
