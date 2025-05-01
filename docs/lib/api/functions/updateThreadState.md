[**Agent Chat UI v0.0.0**](../../../README.md)

***

[Agent Chat UI](../../../modules.md) / [lib/api](../README.md) / updateThreadState

# Function: updateThreadState()

> **updateThreadState**(`threadId`, `values`, `asNode`): `Promise`\<`any`\>

Defined in: lib/api.ts:97

Update thread values via state endpoint.
values: array of { key, value } updates.
asNode: optional graph node name.

## Parameters

### threadId

`string`

### values

`object`[]

### asNode

`string` = `'ui_update'`

## Returns

`Promise`\<`any`\>
