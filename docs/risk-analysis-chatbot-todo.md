# To-Do List: Risk Analysis Chatbot UI Development (Tasks completed are marked with a "X")

**Note:** This plan involves two server components running in Docker:
1.  **LangGraph Server (`langgraph-server` service in `docker-compose.yml`):** Runs the core analysis workflow (`graph.py`). Expects file paths relative to its container (`/app/uploads`). Accessed via host port `8123`.
2.  **Utility Server (`utility-server` service in `docker-compose.yml`):** Handles file uploads (`/upload`) and downloads (`/api/download`) by reading LangGraph state/checkpointer. Accessed via host port `8001`.

## Phase 0: Dockerize Utility Server

- [X] **Subtask 0.1: Create `requirements-utility.txt`**
    - **Action:** Identify and list dependencies for `server.py` (e.g., `fastapi`, `uvicorn[standard]`, `python-multipart`, `python-docx`, `psycopg[binary]`). **Note:** `langgraph` might not be needed here if not using its savers directly.
    - **Deliverable:** `requirements-utility.txt` file.
- [X] **Subtask 0.2: Create `Dockerfile.utility`**
    - **Action:** Create `Dockerfile.utility` based on Python image, copy `server.py`, `src/assistant/utils.py`, `requirements-utility.txt`, install requirements.
    - **Deliverable:** `Dockerfile.utility` file.
- [X] **Subtask 0.3: Define Run Command in `Dockerfile.utility`**
    - **Action:** Add `CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001"]` to `Dockerfile.utility`.
    - **Deliverable:** Updated `Dockerfile.utility`.
- [X] **Subtask 0.4: Add `utility-server` Service to `docker-compose.yml`**
    - **Action:** Add basic `utility-server` service definition, configure build context (`.`) and Dockerfile (`Dockerfile.utility`).
    - **Deliverable:** Updated `docker-compose.yml`.
- [X] **Subtask 0.5: Configure Ports for `utility-server`**
    - **Action:** Map host port `8001` to container port `8001` (`127.0.0.1:8001:8001`) in `docker-compose.yml`.
    - **Deliverable:** Updated `docker-compose.yml`.
- [X] **Subtask 0.6: Configure Volumes for `utility-server`**
    - **Action:** Mount `./shared_uploads:/app/uploads` in `docker-compose.yml`. **Remove any SQLite volume mount.**
    - **Deliverable:** Updated `docker-compose.yml`.
- [X] **Subtask 0.6b (New): Configure PostgreSQL Env Vars for `utility-server`**
    - **Action:** Add `environment` section to `utility-server` in `docker-compose.yml`. Pass PostgreSQL connection details: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_HOST=langgraph-postgres`, `POSTGRES_PORT=5432`.
    - **Deliverable:** Updated `docker-compose.yml`.
- [X] **Subtask 0.7: Configure Network for `utility-server`**
    - **Action:** Add `utility-server` to the `langgraph-net` network in `docker-compose.yml`.
    - **Deliverable:** Updated `docker-compose.yml`.
- [X] **Subtask 0.8: Review/Modify `server.py` for Container Paths & PostgreSQL Connection**
    - **Action:** Ensure `server.py` uses container paths (`/app/uploads`) and reads PostgreSQL environment variables to connect **directly using `psycopg`**.
    - **Deliverable:** Updated `server.py` (if needed).

## Phase 1: File Upload Integration

- [ ] **Connect UI to `/upload` endpoint**
    - [ ] Step 0: Ensure UI has access to `utility-server` of docker-compose. Check if tasks below need to be completed.
    - [ ] Step 1: In `FileUpload.tsx`, add `<input type="file" accept=".pdf" />` and validate size ≤ 5 MB.
    - [ ] Step 2: Create `async function uploadFile(file: File): Promise<string>`:
        1. Build `FormData` with field `file`.
        2. `fetch('http://localhost:8001/upload', { method: 'POST', body: formData })`.
        3. Parse JSON, return `input_file` path.
    - [ ] Step 3: Hook `uploadFile` to UI:
        1. Trigger on selection/button.
        2. Display progress indicators and error/success toasts.

- [ ] **Initiate workflow from UI**
    - [ ] Step 1: After upload resolves, run workflow:
        `RemoteRunnable(graphId).run({ input_file: containerPath })`.
    - [ ] Step 2: Push a chat message "Analysis started…".
    - [ ] Step 3: Begin listening to `/stream` for state updates.

- [ ] **Test file upload**
    - [ ] Step 1: Launch Docker (`docker compose up -d`) and React (`npm start`).
    - [ ] Step 2: Select and upload a PDF.
    - [ ] Step 3: Verify the file appears in host `./shared_uploads`.
    - [ ] Step 4: Confirm UI indicates upload success and workflow begins.

## Phase 2: State-Driven Accumulated Display

- [ ] **Check Backend State Implementation for UI Elements (Python)**
    - [ ] Step 1: In `src/assistant/state.py`, confirm `ui_elements: list | None` key in `State`.
    - [ ] Step 2: Ensure `append_ui_elements(left, right)` handles `None` and merges lists.
    - [ ] Step 3: Register `ui_elements` with `append_ui_elements` reducer in `graph.py`.
    - [ ] Step 4: In each node, return `{"ui_elements": [payload]}` instead of `yield`.

- [ ] **Test Accumulated Streaming via State**
    - [ ] Step 1: Run analysis end‑to‑end after file upload.
    - [ ] Step 2: In browser console or React DevTools, read `useStreamContext().values.ui_elements`.
    - [ ] Step 3: Confirm UI elements appear in sequence and list grows over time.

- [ ] **Debug State-Driven Display Issues**
    - [ ] Step 1: Add `console.log(values.ui_elements)` in rendering component.
    - [ ] Step 2: Inspect browser console for missing or malformed payloads.
    - [ ] Step 3: Add logging in Python `append_ui_elements` to print inputs/outputs.

## Phase 3: Output Formatting (Final Table)

- [X] **Stream Final Output via State**
  - In the final backend node, capture `protection_measures_list`.
  - Return a state update including the UI dictionary for the `RiskTable.tsx` component under the `ui_elements` key. `return {"ui_elements": [final_table_payload]}`.

- [X] **Create Table Component (`RiskTable.tsx`)**
  - Create the component to render `protection_measures_list`.
  - Triggered when its dictionary appears in `stream.values.ui_elements`.

- [X] **Style the Table**
  - Apply styling.

- [X] **Test Final Table Rendering**
  - Run a full workflow and verify the `RiskTable` component appears correctly at the end, rendered from the state data.

## Phase 4: Download Functionality

- [X] **Backend: Integrate Postgres Query into Download Endpoint (`server.py`)**
    - [X] **Action:** Update the `/api/download` GET endpoint to fetch risk data via `get_risk_data_by_thread_id(thread_id)`.
    - [X] **Logic:**
        1. Extract `thread_id` from query parameters.
        2. Call `get_risk_data_by_thread_id(thread_id)` to retrieve a list of measures.
        3. Invoke `generate_risk_doc_stream(risk_data)` and return a `StreamingResponse` with proper headers.
    - [X] **Error Handling:**
        1. Return HTTP 404 if `risk_data` is `None` or empty.
        2. Return HTTP 500 on database or other server errors.

- [X] **Backend: Test Download Endpoint**
    - [X] **Action:**
        1. Launch all services (`docker compose up -d`).
        2. Confirm `langgraph-postgres` contains test threads with data.
    - [X] **Steps:**
        1. Use `curl` or TestClient to `GET /api/download?thread_id=<valid>`.
        2. Save the output and assert it's a non-empty `.docx` starting with 'PK'.
        3. Retry with invalid `thread_id` and assert HTTP 404.

- [ ] **Frontend: Implement Download Button Click Handler (`protection-measures-table.tsx`)**
    - [ ] **Action:** Add a `handleDownload` function in `protection-measures-table.tsx`.
    - [ ] **Steps:**
        1. Fetch actual thread ID from state.
        2. Validate that `threadId` prop is defined; if missing, show an alert.
        3. Perform `fetch('/api/download?thread_id=' + threadId)`, await response.
        4. On success, convert response to `blob`, create an `<a>` link to download, trigger click, and revoke URL; on failure, show an error toast.

- [ ] **Frontend: Verify `threadId` Prop (`protection-measures-table.tsx` & Parent)**
    - [ ] Step 1: In parent (`Thread.tsx`), ensure `threadId` prop is provided to `ProtectionMeasuresTable`.
    - [ ] Step 2: In `ProtectionMeasuresTable`, log `threadId` during `useEffect` mount.
    - [ ] Step 3: If undefined, display an inline warning and disable the download button.

- [ ] **Test Download Functionality**
    - [ ] **Action:** In the UI, select the current completed thread and click the download button.
    - [ ] **Verify:** Browser prompts a `.docx` download; opening it shows the expected risk analysis content.

## Additional Tasks

- [ ] **Add Post-Output Interaction**
  - Handle commands.

- [ ] **Polish UI (optional)**
  - Apply TailwindCSS / Shadcn.

- [ ] **Final Testing**
  - Test full flow: accumulation via state, thoughts/state display, table, download.

- [ ] **Add post-output interaction**
  - Modify the chat input handler in `agent-chat-ui` to recognize commands (e.g., "Change R001 probability to 4").
  - For now, simulate a response by updating the displayed table locally (e.g., edit the JSON and re-render the table).
  - Log the command for future backend integration if needed.