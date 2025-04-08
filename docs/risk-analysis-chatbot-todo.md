# To-Do List: Risk Analysis Chatbot UI Development (Tasks completed are marked with a "X")

## Phase 1: File Upload Integration

- [X] **Set up FastAPI server**
  - Install FastAPI and required dependencies (`pip install fastapi uvicorn`).
  - Create a basic FastAPI app in a new file (e.g., `server.py`) to handle API endpoints.

- [X] **Implement /upload endpoint**
  - Add a POST endpoint at `/upload` in `server.py` to accept a PDF file via multipart form data.
  - Save the uploaded file to `src/assistant/documents/` with a unique filename (e.g., append timestamp if needed).
  - Return a JSON response with the file path (e.g., `{"input_file": "src/assistant/documents/<filename>.pdf"}`).

- [X] **Add file upload UI component**
  - Open the `agent-chat-ui` React project.
  - Create a new component (e.g., `FileUpload.js`) with a drag-and-drop zone or `<input type="file">` element.
  - Restrict file type to `.pdf` and enforce a 5MB size limit using HTML attributes or JavaScript validation.

- [X] **Connect UI to /upload endpoint**
  - Write a function in `FileUpload.js` to send the selected file to `http://localhost:2024/upload` using `fetch` or `axios`.
  - On successful response, extract the file path from the JSON response.

- [X] **Initiate workflow from UI**
  - Modify the chat submission logic in `agent-chat-ui` to send a JSON message (e.g., `{"input_file": "<path>"}`) to the `/stream` endpoint after upload.
  - Display a confirmation message in the chat (e.g., "File uploaded: <filename>.pdf. Starting analysis…").

- [X] **Test file upload**
  - Start the FastAPI server (`uvicorn server.py:main --port 2024`).
  - Run the React app and LangGraph server locally.
  - Upload a sample PDF (e.g., `SEI_1535518_Projeto_Basico.pdf`) and verify the file is saved and the workflow starts without the "No input file provided" error.

---

## Phase 2: State-Driven Accumulated Display

- [ ] **Implement Backend State for UI Elements (Python)**
  - **Why:** To reliably track and accumulate the UI elements (thoughts, state updates) that need to be displayed sequentially on the frontend, using LangGraph's standard state management instead of potentially problematic custom event yielding.
  - **Where:** In your `src/assistant/state.py` (or where `State` TypedDict is defined) and `src/assistant/graph.py` (node functions and graph definition).
  - **How:**
    1.  **Define State Key:** Add a new key to your `State` TypedDict, e.g., `ui_elements: Annotated[list | None, append_ui_elements]`. Initialize it as `None` or `[]`.
    2.  **Create Appending Reducer:** Define a Python function `append_ui_elements(left: list | None, right: list | None) -> list:` that takes two lists (or None) and returns a *new* list containing all elements from both (similar to how `add_messages` works). Ensure it handles None inputs gracefully.
    3.  **Register Reducer:** When creating your `StateGraph`, associate the `ui_elements` key with your `append_ui_elements` reducer function.
    4.  **Modify Nodes:**
        - Inside your node functions, determine if you need to display a "Thought" or "Key State Update".
        - Construct the standard UI dictionary: `ui_payload = {"id": f"unique-id-{uuid.uuid4()}", "component": "path/to/component.tsx", "props": {...}}`.
        - **Instead of `yield ui_payload`**, `return` it as part of the node's output dictionary under the `ui_elements` key: `return {"ui_elements": [ui_payload]}`. The reducer will append this list to the state.
        - Return other state updates as usual (e.g., `return {"risk_analysis": ..., "ui_elements": [risk_payload]}`).

- [ ] **Implement Frontend Components for Display (State & Thoughts)**
  - **Why:** Create visual representations for both key state updates (formatted data) and intermediate thoughts (expandable boxes).
  - **Where:** `src/components/thread/messages/` directory.
  - **How:**
    - **Key State Components:** Implement specific components (e.g., `input-file.tsx`, `risk-analysis.tsx`, `protection-measures-table.tsx`) using Cards, Tables, Lists etc. Define props matching the data returned from the backend.
    - **Thoughts Component:** Create `thoughts-box.tsx`. Use Shadcn `Accordion` or similar for expand/collapse. Style subtly.
    - Ensure components handle props and render correctly.

- [ ] **Implement Frontend Rendering Logic (`LoadExternalComponent` from State)**
  - **Why:** To display all custom UI components sequentially based on the accumulated `ui_elements` list received in the main state snapshot (`stream.values`).
  - **Where:** Review rendering loop in `src/components/thread/index.tsx` and component usage in `src/components/thread/messages/ai.tsx`.
  - **How:**
    1.  **Remove `onCustomEvent`:** Delete the `onCustomEvent` handler and related `uiMessageReducer` logic from the `useStream` configuration in `src/providers/Stream.tsx`. It's no longer needed for this approach.
    2.  **Access State:** In the component responsible for rendering (likely `ai.tsx` or a dedicated component like `StreamedUIComponents`), get the full state snapshot: `const { values } = useStreamContext();`
    3.  **Get UI List:** Access the list of UI elements: `const uiElementsToRender = values?.ui_elements;` (use the exact key name defined in your Python state).
    4.  **Render Loop:** If `uiElementsToRender` exists and is an array, iterate over it:
        ```typescript
        {uiElementsToRender?.map((uiElement) => (
          <LoadExternalComponent
            key={uiElement.id} // Use unique ID from backend state
            // stream={thread} // Only pass if components truly need context access
            message={uiElement} // Pass the UI data object {id, component, props}
          />
        ))}
        ```
    5.  **Placement:** Decide where to render this block of UI elements. Rendering them after the *last* AI message (as currently implemented in `ai.tsx` with `shouldRenderUI`) is a reasonable starting point.
    6.  Ensure CSS allows vertical growth for accumulation.

- [ ] **Test Accumulated Streaming via State**
  - **Goal:** Verify that the UI correctly accumulates and displays *both* intermediate thoughts (expandable boxes) *and* key state updates (formatted directly) by reading the `ui_elements` list from the state snapshot.
  - Upload a PDF.
  - Observe the chat space throughout the workflow.
  - **Confirm:**
    - Standard AI/Human messages appear.
    - Expandable "Thoughts" boxes appear.
    - Formatted state update components (`risk-analysis`, etc.) appear.
    - Outputs from previous agent steps remain visible as new elements are added from the `ui_elements` list in the state.
    - UI is responsive and sequence logical.

- [ ] **Debug State-Driven Display Issues**
  - If accumulation fails or components render incorrectly:
    - Check backend: Verify the `append_ui_elements` reducer is correctly registered and working (log its inputs/outputs). Ensure nodes return UI dictionaries under the correct key (`ui_elements`). Ensure IDs are unique.
    - Check Console (Frontend): Inspect `stream.values`. Does the `ui_elements` key exist? Does it contain the expected list of dictionaries? Is it growing correctly on subsequent updates?
    - Check Console (Frontend): Look for React errors related to `LoadExternalComponent` or the custom components (e.g., prop type mismatches).

---

## Phase 3: Output Formatting (Final Table)

- [ ] **Stream Final Output via State**
  - In the final backend node, capture `protection_measures_list`.
  - Return a state update including the UI dictionary for the `RiskTable.tsx` component under the `ui_elements` key. `return {"ui_elements": [final_table_payload]}`.

- [ ] **Create Table Component (`RiskTable.tsx`)**
  - Create the component to render `protection_measures_list`.
  - Triggered when its dictionary appears in `stream.values.ui_elements`.

- [ ] **Style the Table**
  - Apply styling.

- [ ] **Test Final Table Rendering**
  - Run a full workflow and verify the `RiskTable` component appears correctly at the end, rendered from the state data.

---

## Phase 4: Download Functionality

- [ ] **Implement /download endpoint**
  - Add GET endpoint in `server.py`.
  - Generate Word doc.

- [ ] **Add Download Button**
  - Add button within `RiskTable.tsx`.
  - Trigger fetch.

- [ ] **Handle File Download**
  - Use response blob.

- [ ] **Test Download**
  - Verify Word doc.

---

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

- [ ] **Polish UI (optional)**
  - If using TailwindCSS, install it (`npm install tailwindcss`) and configure it in the React project.
  - Apply Tailwind classes to the file upload and table components for a modern look.
  - Consider ShadCN components for drag-and-drop if time allows.

- [ ] **Final testing**
  - Test the full flow: upload a PDF, observe streaming, view the table, and download the Word file.
  - Ensure no errors occur and all requirements from the PRD are met. 