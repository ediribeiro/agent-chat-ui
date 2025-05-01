# Backend Graph Nodes and Frontend Mapping

This document inventories the LangGraph server’s graph nodes that write to `thread.values` and explains how each maps to frontend components.

## 1. State Structure (`state.py`)
- **Location**: `src/assistant/state.py`
- Defines the `State` TypedDict with fields such as `risk_data` and `ui_elements`.
- All graph nodes update this shared state.

## 2. Graph Workflow (`graph.py`)
- **Location**: `src/assistant/graph.py`
- Nodes are registered and executed in sequence:
  - **evaluate_report** → populates risk analysis UI element
  - **create_protection_measures** → generates protection measures UI element
- Agents in `src/assistant/agents/` implement node logic.

## 3. Node Inventory

| Node Name                  | Location            | Output Field      | Frontend Component             |
|----------------------------|---------------------|-------------------|--------------------------------|
| `load_document`             | `graph.py`          | `input_file`      | `input-file.tsx`                |
| `create_report`             | `graph.py`          | `risk_data`       | *(internal)*                    |
| `optimize_report`           | `graph.py`          | `risk_data`       | *(internal)*                    |
| `analyze_causes`            | `graph.py`          | `risk_data`       | *(internal)*                    |
| `damage_listing`            | `graph.py`          | `risk_data`       | *(internal)*                    |
| `evaluate_report`           | `graph.py`          | `risk_data`       | `risk-analysis.tsx`            |
| `analyze_hazards`           | `graph.py`          | `risk_data`       | *(internal, pre-protection)*    |
| `create_protection_measures` | `graph.py`          | `risk_data`       | `protection-measures-table.tsx`|

### evaluate_report
```python
# in src/assistant/graph.py
def evaluate_report(state: State) -> Dict:
    # ... logic ...
    ui_elements.append({
      "component": "risk-analysis.tsx",
      "props": { "analysis_data": update["risk_data"] }
    })
    
    # After rendering UI, interrupt the workflow for human review
    # This creates a checkpoint and emits an __interrupt__ event
    return interrupt(
        metadata={
            "message": "Please review the risk analysis and make any necessary changes.",
            "tableId": "riskAnalysis"
        }
    )
```
- **Payload**: returns `risk_data: List[Dict]` and `ui_elements` with component ID and props.
- **Interrupt**: Pauses workflow and emits `__interrupt__` event with checkpoint data.
- **Resume**: When the frontend sends updated rows, the workflow resumes with merged data.

### create_protection_measures
```python
# in src/assistant/graph.py
def create_protection_measures(state: State) -> Dict:
    # ... logic ...
    ui_elements.append({
      "component": "protection-measures-table.tsx",
      "props": { "measures": update["risk_data"] }
    })
```
- **Payload**: returns same `risk_data` renamed as `measures` for frontend.

## 4. Frontend Integration
- Frontend calls `GET /threads/{id}/state` to retrieve `thread.values.ui_elements`.
- Each `ui_elements` entry drives rendering of the specified component in the chat thread.
- Components:
  - `risk-analysis.tsx`: reads `props.analysis_data` to render risk table.
  - `protection-measures-table.tsx`: reads `props.measures` for editing controls.

## 5. Interrupt and Resume Flow

The workflow includes interrupt points where human review and editing are required:

1. **Interrupt Mechanism**:
   - The `evaluate_report` node uses the `interrupt()` function to pause workflow execution.
   - This emits an `__interrupt__` event via the SSE stream to the frontend.
   - A checkpoint containing the complete workflow state is created.

2. **Frontend Handling**:
   - Frontend listens for `event: __interrupt__` in the SSE stream.
   - When detected, it extracts checkpoint data from subsequent data lines.
   - The UI then displays an editable interface for the risk data.

3. **Resume Process**:
   - After user edits, frontend calls `/threads/{thread_id}/runs/wait` with:
     - The stored checkpoint object
     - User-edited rows in the `input.updatedRows` field
   - Backend merges updates into the state and continues execution from the interrupt point.

4. **Required Fields**:
   - The resume payload must include:
     - `assistant_id`: The ID of the assistant
     - `checkpoint`: The complete checkpoint object with state and config
     - `input.updatedRows`: Array of edited risk data objects
   - The state must contain: `risk_data`, `ui_elements`, `context_analysis`, `declarations`, and `input_file` 

## 6. Next Steps
1. Confirm if any other nodes write to `ui_elements` or `risk_data`.
2. Document their payload schemas in this doc.
3. Update frontend tests to assert that UI elements are rendered when these nodes fire.
4. Optionally, insert interruption points (HITL) between nodes if editing mid‑workflow is desired.
5. **Payload Schemas**
    - `load_document`
      - **Input**: `{ input_file: string }`
      - **Output**: `{ input_file: string, ui_elements: [{ component: "input-file.tsx", props: { file: string } }] }`
    - `create_report` / `optimize_report` / `analyze_causes` / `damage_listing`
      - **Input**: full `State` (must include previous `risk_data` as list)
      - **Output**: `{ risk_data: List<Dict> }` (accumulates entries)
    - `evaluate_report`
      - **Input**: `risk_data: List<Dict>`
      - **Output**: `{ risk_data: List<Dict>, ui_elements: [{ component: "risk-analysis.tsx", props: { analysis_data: List<Dict> } }] }`
    - `analyze_hazards`
      - **Input**: `risk_data: List<Dict>`
      - **Output**: `{ risk_data: List<Dict> }` (prepares for protection measures)
    - `create_protection_measures`
      - **Input**: `risk_data: List<Dict>`
      - **Output**: `{ risk_data: List<Dict>, ui_elements: [{ component: "protection-measures-table.tsx", props: { measures: List<Dict> } }] }`

---
*Generated on 2025-04-23T11:27:29-03:00*
