# techContext.md

Document the technologies used, development setup, technical constraints, dependencies, and tool usage patterns.

## Stack & Dependencies
- **Frontend:** Now leverages dashboard-specific components (wizard, stepper, logs, export) in React, TypeScript, TailwindCSS, ShadCN, @langchain/langgraph-sdk.
- **Backend:** Python, LangGraph, FastAPI (if custom endpoints needed), Docker, Redis, Postgres, Weaviate
- **Other:** SSE/streaming for real-time updates, docx generation (Python utils.py and/or JS library), Docling

## Setup & Constraints
- **Frontend Path:** `agent-chat-ui/agent-chat-ui/`
- **Frontend:** Must ensure all new dashboard features integrate cleanly with existing backend APIs.
- **Backend:** Runs in Docker Compose stack; PDF uploads via shared host volume
- **Backend:** Maintain stability and support for new frontend workflows.
- **Local Development:** Requires Docker, Node.js, Python, and access to the LangGraph server and shared uploads directory
- **Separation:** Backend and frontend codebases are fully separated
