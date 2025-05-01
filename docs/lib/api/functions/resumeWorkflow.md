[**Agent Chat UI v0.0.0**](../../../README.md)

***

[Agent Chat UI](../../../modules.md) / [lib/api](../README.md) / resumeWorkflow

# Function: resumeWorkflow()

> **resumeWorkflow**(`threadId`, `assistantId`, `checkpoint`, `updatedRows`, `nodeIdOverride?`, `onEvent?`): `Promise`\<\{ `cleanup`: () => `void`; `newRunId?`: `string`; `response?`: `Response`; \}\>

Defined in: lib/api.ts:247

Resume a workflow using a checkpoint in the thread state

## Parameters

### threadId

`string`

### assistantId

`string`

### checkpoint

`any`

### updatedRows

`any`[]

### nodeIdOverride?

`string`

### onEvent?

(`event`) => `void`

## Returns

`Promise`\<\{ `cleanup`: () => `void`; `newRunId?`: `string`; `response?`: `Response`; \}\>
