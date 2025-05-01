[**Agent Chat UI v0.0.0**](../../../README.md)

***

[Agent Chat UI](../../../modules.md) / [lib/api](../README.md) / connectToRunStream

# Function: connectToRunStream()

> **connectToRunStream**(`threadId`, `runId`, `onEvent`, `onError?`): () => `void`

Defined in: lib/api.ts:132

Connect to a run's event stream to observe real-time progress

## Parameters

### threadId

`string`

The thread ID

### runId

`string`

The run ID to observe

### onEvent

(`event`) => `void`

Callback for each event received

### onError?

(`error`) => `void`

Error callback

## Returns

Cleanup function to close the connection

> (): `void`

### Returns

`void`
