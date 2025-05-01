# LangGraph Streaming Debugging Guide

## Current Implementation Overview
**Key Modified Components:**
- `resumeWorkflow` (api.ts) - Enhanced event logging
- `StreamSession` (Stream.tsx) - Network monitoring
- `RiskAnalysis` component - Event handling

## Debugging Strategy

### 1. Reproduce the Issue
```bash
npm run dev -- --log-level=debug
```

### 2. Monitoring Tools
| Tool | Command | Purpose |
|------|---------|---------|
| Network Logs | Browser DevTools → Network | Monitor SSE connections |
| Event Logs | `CTRL+SHIFT+L` | View custom event flow |
| TypeScript | `npm run type-check` | Catch interface issues |

### 3. Critical Checkpoints
1. **Stream Initialization**
   - Verify `run-created` event in console
   - Check Network tab for 101 Switching Protocols

2. **Event Flow**
```ts
// Expected event sequence:
// 1. run-created
// 2. stream-event
// 3. ui-elements-updated
// 4. stream-end
```

3. **Common Failure Points**
- Missing JWT in API calls
- SSE connection timeout (default: 30s)
- Type mismatch in event payloads

## TypeScript Error Resolution
```ts
// Common Fix Patterns:
// 1. Add type assertions for event streams:
const event = e as CustomEvent<StreamPayload>;

// 2. Interface alignment:
declare global {
  interface Window {
    streams: Map<string, EventSource>;
  }
}
```

## Next Steps Roadmap
1. Run monitoring session:
```bash
npm run dev -- --log-network
```
2. Capture 5 consecutive disconnections
3. Compare error patterns across:
   - Different browsers
   - Network conditions (use Chrome throttling)
   - Payload sizes

## Diagnostic Cheat Sheet
```
🔍 DEBUG [resumeWorkflow] - API layer events
🔌 NETWORK [...] - Stream connection status
⚡ UI-EVENT [...] - Component updates
❗ TYPE ERROR [...] - Interface mismatches
```

**Pro Tip:** Add `debugger;` statements in Stream.tsx:149-155 to capture disconnection sequence.
