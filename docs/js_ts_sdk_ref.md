
<a name="readmemd"></a>

**Agent Chat UI v0.0.0**

***

# Agent Chat UI

Agent Chat UI is a Vite + React application which enables chatting with any LangGraph server with a `messages` key through a chat interface.

> [!NOTE]
> 🎥 Watch the video setup guide [here](https://youtu.be/lInrwVnZ83o).

## Setup

> [!TIP]
> Don't want to run the app locally? Use the deployed site here: [agentchat.vercel.app](https://agentchat.vercel.app)!

First, clone the repository, or run the [`npx` command](https://www.npmjs.com/package/create-agent-chat-app):

```bash
npx create-agent-chat-app
```

or

```bash
git clone https://github.com/langchain-ai/agent-chat-ui.git

cd agent-chat-ui
```

Install dependencies:

```bash
pnpm install
```

Run the app:

```bash
pnpm dev
```

The app will be available at `http://localhost:5173`.

## Usage

Once the app is running (or if using the deployed site), you'll be prompted to enter:

- **Deployment URL**: The URL of the LangGraph server you want to chat with. This can be a production or development URL.
- **Assistant/Graph ID**: The name of the graph, or ID of the assistant to use when fetching, and submitting runs via the chat interface.
- **LangSmith API Key**: (only required for connecting to deployed LangGraph servers) Your LangSmith API key to use when authenticating requests sent to LangGraph servers.

After entering these values, click `Continue`. You'll then be redirected to a chat interface where you can start chatting with your LangGraph server.


<a name="js_ts_sdk_refmd"></a>


# Lib

## Api


<a name="libapireadmemd"></a>

[**Agent Chat UI v0.0.0**](#readmemd)

***

[Agent Chat UI](#modulesmd) / lib/api

### lib/api

#### Variables

- [activeRunIds](#libapivariablesactiverunidsmd)
- [activeStreamConnections](#libapivariablesactivestreamconnectionsmd)
- [API\_KEY](#libapivariablesapi_keymd)
- [BASE\_URL](#libapivariablesbase_urlmd)

#### Functions

- [clearActiveRunId](#libapifunctionsclearactiverunidmd)
- [connectToRunStream](#libapifunctionsconnecttorunstreammd)
- [extractThreadAndRunIdFromHistory](#libapifunctionsextractthreadandrunidfromhistorymd)
- [getActiveRunId](#libapifunctionsgetactiverunidmd)
- [getClient](#libapifunctionsgetclientmd)
- [getThreadHistory](#libapifunctionsgetthreadhistorymd)
- [getThreadState](#libapifunctionsgetthreadstatemd)
- [resumeWorkflow](#libapifunctionsresumeworkflowmd)
- [setActiveRunId](#libapifunctionssetactiverunidmd)
- [updateThreadState](#libapifunctionsupdatethreadstatemd)

### Functions


<a name="libapifunctionsclearactiverunidmd"></a>

[**Agent Chat UI v0.0.0**](#readmemd)

***

[Agent Chat UI](#modulesmd) / [lib/api](#libapireadmemd) / clearActiveRunId

#### Function: clearActiveRunId()

> **clearActiveRunId**(`threadId`): `void`

Defined in: lib/api.ts:71

Clear the active run ID for a thread

##### Parameters

###### threadId

`string`

The thread ID

##### Returns

`void`


<a name="libapifunctionsconnecttorunstreammd"></a>

[**Agent Chat UI v0.0.0**](#readmemd)

***

[Agent Chat UI](#modulesmd) / [lib/api](#libapireadmemd) / connectToRunStream

#### Function: connectToRunStream()

> **connectToRunStream**(`threadId`, `runId`, `onEvent`, `onError?`): () => `void`

Defined in: lib/api.ts:132

Connect to a run's event stream to observe real-time progress

##### Parameters

###### threadId

`string`

The thread ID

###### runId

`string`

The run ID to observe

###### onEvent

(`event`) => `void`

Callback for each event received

###### onError?

(`error`) => `void`

Error callback

##### Returns

Cleanup function to close the connection

> (): `void`

###### Returns

`void`


<a name="libapifunctionsextractthreadandrunidfromhistorymd"></a>

[**Agent Chat UI v0.0.0**](#readmemd)

***

[Agent Chat UI](#modulesmd) / [lib/api](#libapireadmemd) / extractThreadAndRunIdFromHistory

#### Function: extractThreadAndRunIdFromHistory()

> **extractThreadAndRunIdFromHistory**(`historyResponse`): `null` \| \{ `runId`: `string`; `threadId`: `string`; \}

Defined in: lib/api.ts:394

Extracts the latest thread_id and run_id from a /threads/{thread_id}/history response.

##### Parameters

###### historyResponse

`any`[]

The array response from the /history endpoint.

##### Returns

`null` \| \{ `runId`: `string`; `threadId`: `string`; \}

or null if not found.


<a name="libapifunctionsgetactiverunidmd"></a>

[**Agent Chat UI v0.0.0**](#readmemd)

***

[Agent Chat UI](#modulesmd) / [lib/api](#libapireadmemd) / getActiveRunId

#### Function: getActiveRunId()

> **getActiveRunId**(`threadId`): `string`

Defined in: lib/api.ts:42

Gets the active run ID for a thread, if one exists

##### Parameters

###### threadId

`string`

The thread ID

##### Returns

`string`

The active run ID for this thread, or the thread ID if none exists


<a name="libapifunctionsgetclientmd"></a>

[**Agent Chat UI v0.0.0**](#readmemd)

***

[Agent Chat UI](#modulesmd) / [lib/api](#libapireadmemd) / getClient

#### Function: getClient()

> **getClient**(): `Client`\<`any`, `any`, `any`\>

Defined in: lib/api.ts:24

##### Returns

`Client`\<`any`, `any`, `any`\>


<a name="libapifunctionsgetthreadhistorymd"></a>

[**Agent Chat UI v0.0.0**](#readmemd)

***

[Agent Chat UI](#modulesmd) / [lib/api](#libapireadmemd) / getThreadHistory

#### Function: getThreadHistory()

> **getThreadHistory**(`threadId`, `options?`): `Promise`\<`any`[]\>

Defined in: lib/api.ts:370

Fetches thread history using the GET /threads/{thread_id}/history endpoint.

##### Parameters

###### threadId

`string`

The thread ID

###### options?

Optional: { limit?: number, before?: string }

####### before?

`string`

####### limit?

`number`

##### Returns

`Promise`\<`any`[]\>

Array of thread history states


<a name="libapifunctionsgetthreadstatemd"></a>

[**Agent Chat UI v0.0.0**](#readmemd)

***

[Agent Chat UI](#modulesmd) / [lib/api](#libapireadmemd) / getThreadState

#### Function: getThreadState()

> **getThreadState**(`threadId`): `Promise`\<`any`\>

Defined in: lib/api.ts:82

Fetch full thread state, including values, metadata, status.

##### Parameters

###### threadId

`string`

##### Returns

`Promise`\<`any`\>


<a name="libapifunctionsresumeworkflowmd"></a>

[**Agent Chat UI v0.0.0**](#readmemd)

***

[Agent Chat UI](#modulesmd) / [lib/api](#libapireadmemd) / resumeWorkflow

#### Function: resumeWorkflow()

> **resumeWorkflow**(`threadId`, `assistantId`, `checkpoint`, `updatedRows`, `nodeIdOverride?`, `onEvent?`): `Promise`\<\{ `cleanup`: () => `void`; `newRunId?`: `string`; `response?`: `Response`; \}\>

Defined in: lib/api.ts:247

Resume a workflow using a checkpoint in the thread state

##### Parameters

###### threadId

`string`

###### assistantId

`string`

###### checkpoint

`any`

###### updatedRows

`any`[]

###### nodeIdOverride?

`string`

###### onEvent?

(`event`) => `void`

##### Returns

`Promise`\<\{ `cleanup`: () => `void`; `newRunId?`: `string`; `response?`: `Response`; \}\>


<a name="libapifunctionssetactiverunidmd"></a>

[**Agent Chat UI v0.0.0**](#readmemd)

***

[Agent Chat UI](#modulesmd) / [lib/api](#libapireadmemd) / setActiveRunId

#### Function: setActiveRunId()

> **setActiveRunId**(`threadId`, `runId`): `void`

Defined in: lib/api.ts:58

Store an active run ID for a thread

##### Parameters

###### threadId

`string`

The thread ID

###### runId

`string`

The run ID to store

##### Returns

`void`


<a name="libapifunctionsupdatethreadstatemd"></a>

[**Agent Chat UI v0.0.0**](#readmemd)

***

[Agent Chat UI](#modulesmd) / [lib/api](#libapireadmemd) / updateThreadState

#### Function: updateThreadState()

> **updateThreadState**(`threadId`, `values`, `asNode`): `Promise`\<`any`\>

Defined in: lib/api.ts:97

Update thread values via state endpoint.
values: array of { key, value } updates.
asNode: optional graph node name.

##### Parameters

###### threadId

`string`

###### values

`object`[]

###### asNode

`string` = `'ui_update'`

##### Returns

`Promise`\<`any`\>

### Variables


<a name="libapivariablesapi_keymd"></a>

[**Agent Chat UI v0.0.0**](#readmemd)

***

[Agent Chat UI](#modulesmd) / [lib/api](#libapireadmemd) / API\_KEY

#### Variable: API\_KEY

> `const` **API\_KEY**: `any`

Defined in: lib/api.ts:15


<a name="libapivariablesbase_urlmd"></a>

[**Agent Chat UI v0.0.0**](#readmemd)

***

[Agent Chat UI](#modulesmd) / [lib/api](#libapireadmemd) / BASE\_URL

#### Variable: BASE\_URL

> `const` **BASE\_URL**: `string`

Defined in: lib/api.ts:14


<a name="libapivariablesactiverunidsmd"></a>

[**Agent Chat UI v0.0.0**](#readmemd)

***

[Agent Chat UI](#modulesmd) / [lib/api](#libapireadmemd) / activeRunIds

#### Variable: activeRunIds

> `const` **activeRunIds**: `Record`\<`string`, `string`\> = `{}`

Defined in: lib/api.ts:35


<a name="libapivariablesactivestreamconnectionsmd"></a>

[**Agent Chat UI v0.0.0**](#readmemd)

***

[Agent Chat UI](#modulesmd) / [lib/api](#libapireadmemd) / activeStreamConnections

#### Variable: activeStreamConnections

> `const` **activeStreamConnections**: `Record`\<`string`, `EventSource`\> = `{}`

Defined in: lib/api.ts:18

# Main


<a name="mainreadmemd"></a>

[**Agent Chat UI v0.0.0**](#readmemd)

***

[Agent Chat UI](#modulesmd) / main

## main


<a name="modulesmd"></a>

[**Agent Chat UI v0.0.0**](#readmemd)

***

# Agent Chat UI v0.0.0

## Modules

- [lib/api](#libapireadmemd)
- [main](#mainreadmemd)
- [providers/client](#providersclientreadmemd)
- [providers/Stream](#providersstreamreadmemd)
- [providers/Thread](#providersthreadreadmemd)

# Providers

## Stream


<a name="providersstreamreadmemd"></a>

[**Agent Chat UI v0.0.0**](#readmemd)

***

[Agent Chat UI](#modulesmd) / providers/Stream

### providers/Stream

#### Type Aliases

- [StateType](#providersstreamtype-aliasesstatetypemd)

#### Variables

- [default](#providersstreamvariablesdefaultmd)
- [StreamProvider](#providersstreamvariablesstreamprovidermd)

#### Functions

- [useStreamContext](#providersstreamfunctionsusestreamcontextmd)

### Functions


<a name="providersstreamfunctionsusestreamcontextmd"></a>

[**Agent Chat UI v0.0.0**](#readmemd)

***

[Agent Chat UI](#modulesmd) / [providers/Stream](#providersstreamreadmemd) / useStreamContext

#### Function: useStreamContext()

> **useStreamContext**(): `UseStream`

Defined in: [providers/Stream.tsx:240](https://github.com/ediribeiro/agent-chat-ui/blob/efcc80101c3f68aeda1356a5609aa1acd3ab37cb/src/providers/Stream.tsx#L240)

##### Returns

`UseStream`

### Type Aliases


<a name="providersstreamtype-aliasesstatetypemd"></a>

[**Agent Chat UI v0.0.0**](#readmemd)

***

[Agent Chat UI](#modulesmd) / [providers/Stream](#providersstreamreadmemd) / StateType

#### Type Alias: StateType

> **StateType** = `object`

Defined in: [providers/Stream.tsx:25](https://github.com/ediribeiro/agent-chat-ui/blob/efcc80101c3f68aeda1356a5609aa1acd3ab37cb/src/providers/Stream.tsx#L25)

##### Properties

###### assistant\_id?

> `optional` **assistant\_id**: `string`

Defined in: [providers/Stream.tsx:29](https://github.com/ediribeiro/agent-chat-ui/blob/efcc80101c3f68aeda1356a5609aa1acd3ab37cb/src/providers/Stream.tsx#L29)

***

###### checkpoint?

> `optional` **checkpoint**: `any`

Defined in: [providers/Stream.tsx:30](https://github.com/ediribeiro/agent-chat-ui/blob/efcc80101c3f68aeda1356a5609aa1acd3ab37cb/src/providers/Stream.tsx#L30)

***

###### messages

> **messages**: `Message`[]

Defined in: [providers/Stream.tsx:26](https://github.com/ediribeiro/agent-chat-ui/blob/efcc80101c3f68aeda1356a5609aa1acd3ab37cb/src/providers/Stream.tsx#L26)

***

###### ui?

> `optional` **ui**: `UIMessage`[]

Defined in: [providers/Stream.tsx:27](https://github.com/ediribeiro/agent-chat-ui/blob/efcc80101c3f68aeda1356a5609aa1acd3ab37cb/src/providers/Stream.tsx#L27)

***

###### ui\_elements?

> `optional` **ui\_elements**: `object`[]

Defined in: [providers/Stream.tsx:28](https://github.com/ediribeiro/agent-chat-ui/blob/efcc80101c3f68aeda1356a5609aa1acd3ab37cb/src/providers/Stream.tsx#L28)

####### component

> **component**: `string`

####### id

> **id**: `string`

####### props

> **props**: `Record`\<`string`, `any`\>

### Variables


<a name="providersstreamvariablesstreamprovidermd"></a>

[**Agent Chat UI v0.0.0**](#readmemd)

***

[Agent Chat UI](#modulesmd) / [providers/Stream](#providersstreamreadmemd) / StreamProvider

#### Variable: StreamProvider

> `const` **StreamProvider**: `React.FC`\<\{ `children`: `ReactNode`; \}\>

Defined in: [providers/Stream.tsx:120](https://github.com/ediribeiro/agent-chat-ui/blob/efcc80101c3f68aeda1356a5609aa1acd3ab37cb/src/providers/Stream.tsx#L120)


<a name="providersstreamvariablesdefaultmd"></a>

[**Agent Chat UI v0.0.0**](#readmemd)

***

[Agent Chat UI](#modulesmd) / [providers/Stream](#providersstreamreadmemd) / default

#### Variable: default

> `const` **default**: `Context`\<`undefined` \| `UseStream`\<[`StateType`](#providersstreamtype-aliasesstatetypemd), \{ `UpdateType`: \{ `messages?`: `string` \| `Message` \| `Message`[]; `ui?`: `UIMessage` \| `RemoveUIMessage` \| (`UIMessage` \| `RemoveUIMessage`)[]; `ui_elements?`: `object`[]; \}; \}\>\>

Defined in: [providers/Stream.tsx:45](https://github.com/ediribeiro/agent-chat-ui/blob/efcc80101c3f68aeda1356a5609aa1acd3ab37cb/src/providers/Stream.tsx#L45)

## Thread


<a name="providersthreadreadmemd"></a>

[**Agent Chat UI v0.0.0**](#readmemd)

***

[Agent Chat UI](#modulesmd) / providers/Thread

### providers/Thread

#### Functions

- [ThreadProvider](#providersthreadfunctionsthreadprovidermd)
- [useThreads](#providersthreadfunctionsusethreadsmd)

### Functions


<a name="providersthreadfunctionsthreadprovidermd"></a>

[**Agent Chat UI v0.0.0**](#readmemd)

***

[Agent Chat UI](#modulesmd) / [providers/Thread](#providersthreadreadmemd) / ThreadProvider

#### Function: ThreadProvider()

> **ThreadProvider**(`__namedParameters`): `Element`

Defined in: [providers/Thread.tsx:36](https://github.com/ediribeiro/agent-chat-ui/blob/efcc80101c3f68aeda1356a5609aa1acd3ab37cb/src/providers/Thread.tsx#L36)

##### Parameters

###### \_\_namedParameters

####### children

`ReactNode`

##### Returns

`Element`


<a name="providersthreadfunctionsusethreadsmd"></a>

[**Agent Chat UI v0.0.0**](#readmemd)

***

[Agent Chat UI](#modulesmd) / [providers/Thread](#providersthreadreadmemd) / useThreads

#### Function: useThreads()

> **useThreads**(): `ThreadContextType`

Defined in: [providers/Thread.tsx:69](https://github.com/ediribeiro/agent-chat-ui/blob/efcc80101c3f68aeda1356a5609aa1acd3ab37cb/src/providers/Thread.tsx#L69)

##### Returns

`ThreadContextType`

## Client


<a name="providersclientreadmemd"></a>

[**Agent Chat UI v0.0.0**](#readmemd)

***

[Agent Chat UI](#modulesmd) / providers/client

### providers/client

#### Functions

- [createClient](#providersclientfunctionscreateclientmd)

### Functions


<a name="providersclientfunctionscreateclientmd"></a>

[**Agent Chat UI v0.0.0**](#readmemd)

***

[Agent Chat UI](#modulesmd) / [providers/client](#providersclientreadmemd) / createClient

#### Function: createClient()

> **createClient**(`apiUrl`, `apiKey`): `Client`\<`DefaultValues`, `DefaultValues`, `unknown`\>

Defined in: [providers/client.ts:3](https://github.com/ediribeiro/agent-chat-ui/blob/efcc80101c3f68aeda1356a5609aa1acd3ab37cb/src/providers/client.ts#L3)

##### Parameters

###### apiUrl

`string`

###### apiKey

`undefined` | `string`

##### Returns

`Client`\<`DefaultValues`, `DefaultValues`, `unknown`\>
