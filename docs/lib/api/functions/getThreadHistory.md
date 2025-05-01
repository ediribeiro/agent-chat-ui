[**Agent Chat UI v0.0.0**](../../../README.md)

***

[Agent Chat UI](../../../modules.md) / [lib/api](../README.md) / getThreadHistory

# Function: getThreadHistory()

> **getThreadHistory**(`threadId`, `options?`): `Promise`\<`any`[]\>

Defined in: lib/api.ts:370

Fetches thread history using the GET /threads/{thread_id}/history endpoint.

## Parameters

### threadId

`string`

The thread ID

### options?

Optional: { limit?: number, before?: string }

#### before?

`string`

#### limit?

`number`

## Returns

`Promise`\<`any`[]\>

Array of thread history states
