[**Agent Chat UI v0.0.0**](../../../README.md)

***

[Agent Chat UI](../../../modules.md) / [lib/api](../README.md) / extractThreadAndRunIdFromHistory

# Function: extractThreadAndRunIdFromHistory()

> **extractThreadAndRunIdFromHistory**(`historyResponse`): `null` \| \{ `runId`: `string`; `threadId`: `string`; \}

Defined in: lib/api.ts:394

Extracts the latest thread_id and run_id from a /threads/{thread_id}/history response.

## Parameters

### historyResponse

`any`[]

The array response from the /history endpoint.

## Returns

`null` \| \{ `runId`: `string`; `threadId`: `string`; \}

or null if not found.
