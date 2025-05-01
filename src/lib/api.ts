import { getApiUrl } from './config';
import { Client } from "@langchain/langgraph-sdk";
import type { StreamMode } from "@langchain/langgraph-sdk";

// Declare the interface for window to include our custom property
declare global {
  interface Window {
    _activeRunIds?: Record<string, string>;
    _streamContext?: any;
    _streamRegistry?: Map<string, any>;
  }
}

// Constants
export const BASE_URL = getApiUrl('langgraph');
export const API_KEY = import.meta.env.VITE_API_KEY || null;

// Track active stream connections to prevent duplicate connections
export const activeStreamConnections: Record<string, EventSource> = {};

// LangGraph SDK client initialization
let _client: Client<any, any, any> | null = null;

// Initialize SDK client
export function getClient() {
  if (!_client) {
    _client = new Client({
      apiUrl: BASE_URL,
      apiKey: API_KEY || undefined,
    });
  }
  return _client;
}

// Store active run IDs
export const activeRunIds: Record<string, string> = {};

/**
 * Gets the active run ID for a thread, if one exists
 * @param threadId The thread ID
 * @returns The active run ID for this thread, or the thread ID if none exists
 */
export function getActiveRunId(threadId: string): string {
  // Check if we have an active run ID for this thread
  if (window._activeRunIds && window._activeRunIds[threadId]) {
    console.log(`🔍 Using stored active run ID for thread ${threadId}: ${window._activeRunIds[threadId]}`);
    return window._activeRunIds[threadId];
  }
  
  // If no active run ID is found, default to the thread ID (legacy behavior)
  return threadId;
}

/**
 * Store an active run ID for a thread
 * @param threadId The thread ID
 * @param runId The run ID to store
 */
export function setActiveRunId(threadId: string, runId: string): void {
  if (!window._activeRunIds) {
    window._activeRunIds = {};
  }
  window._activeRunIds[threadId] = runId;
  activeRunIds[threadId] = runId;
  console.log(`📝 Stored active run ID for thread ${threadId}: ${runId}`);
}

/**
 * Clear the active run ID for a thread
 * @param threadId The thread ID
 */
export function clearActiveRunId(threadId: string): void {
  if (window._activeRunIds && window._activeRunIds[threadId]) {
    delete window._activeRunIds[threadId];
    delete activeRunIds[threadId];
    console.log(`🧹 Cleared active run ID for thread ${threadId}`);
  }
}

/**
 * Fetch full thread state, including values, metadata, status.
 */
export async function getThreadState(threadId: string) {
  const res = await fetch(`${BASE_URL}/threads/${threadId}/state`, {
    method: 'GET',
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch thread state (${res.status})`);
  }
  return res.json();
}

/**
 * Update thread values via state endpoint.
 * values: array of { key, value } updates.
 * asNode: optional graph node name.
 */
export async function updateThreadState(
  threadId: string,
  values: Array<{ key: string; value: any }>,
  asNode = 'ui_update'
) {
  const payload = {
    values,
    checkpoint: {
      thread_id: threadId,
      checkpoint_ns: 'ui',
      checkpoint_id: '',
      checkpoint_map: {},
    },
    as_node: asNode,
  };
  const res = await fetch(`${BASE_URL}/threads/${threadId}/state`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to update thread state (${res.status}): ${text}`);
  }
  return res.json();
}

/**
 * Connect to a run's event stream to observe real-time progress
 * @param threadId The thread ID
 * @param runId The run ID to observe
 * @param onEvent Callback for each event received
 * @param onError Error callback
 * @returns Cleanup function to close the connection
 */
export function connectToRunStream(
  threadId: string,
  runId: string,
  onEvent: (event: { type: string; data: any }) => void,
  onError?: (error: any) => void
): () => void {
  // Always use the active run ID if available
  const effectiveRunId = getActiveRunId(runId === threadId ? threadId : runId);
  
  // Create URL for the stream endpoint
  const url = `${BASE_URL}/threads/${threadId}/runs/${effectiveRunId}/stream`;
  console.log(`🔄 Connecting to run stream: ${url}`);
  
  // Check if we already have an active connection to this URL - close it if we do
  const connectionKey = `${threadId}:${effectiveRunId}`;
  if (activeStreamConnections[connectionKey]) {
    console.log(`🔄 Closing existing stream connection to ${url}`);
    activeStreamConnections[connectionKey].close();
    delete activeStreamConnections[connectionKey];
  }
  
  // Prevent infinite loops - if thread_id == run_id and we know this is a synthetic context
  // don't connect to avoid triggering infinite reconnection loops
  if (effectiveRunId === threadId && window._activeRunIds && !window._activeRunIds[threadId]) {
    console.warn(`⚠️ Preventing infinite stream connection loop for ${threadId}`);
    
    // Return a no-op cleanup function that logs it was skipped
    return () => {
      console.log(`ℹ️ Cleanup called for skipped stream connection to ${url}`);
    };
  }
  
  // Create EventSource for server-sent events
  const eventSource = new EventSource(url);
  
  // Store this connection
  activeStreamConnections[connectionKey] = eventSource;
  
  // Add explicit listeners for custom event types
  eventSource.addEventListener('workflow-progress', (event) => {
    try {
      const parsedData = JSON.parse(event.data);
      console.log(`🔄 Workflow progress:`, parsedData);
      onEvent({ type: 'workflow-progress', data: parsedData });
      
      // Dispatch a browser event for components to listen for
      const progressEvent = new CustomEvent('workflow-progress', { 
        detail: parsedData 
      });
      window.dispatchEvent(progressEvent);
    } catch (err) {
      console.warn(`⚠️ Error parsing workflow-progress:`, err, event.data);
    }
  });
  
  eventSource.addEventListener('workflow-complete', (event) => {
    try {
      const parsedData = JSON.parse(event.data);
      console.log(`✅ Workflow complete:`, parsedData);
      onEvent({ type: 'workflow-complete', data: parsedData });
      
      // Dispatch a browser event for components to listen for
      const completeEvent = new CustomEvent('workflow-complete', { 
        detail: parsedData 
      });
      window.dispatchEvent(completeEvent);
      
      // Automatically close the connection when workflow is complete
      eventSource.close();
      delete activeStreamConnections[connectionKey];
    } catch (err) {
      console.warn(`⚠️ Error parsing workflow-complete:`, err, event.data);
    }
  });
  
  // Handle error events explicitly
  eventSource.addEventListener('error', (event: MessageEvent) => {
    try {
      const parsedData = JSON.parse(event.data);
      console.error(`❌ Stream error event:`, parsedData);
      onEvent({ type: 'error', data: parsedData });
    } catch (err) {
      console.warn(`⚠️ Error parsing error event:`, err, event.data);
    }
  });
  
  // Keep onmessage for generic events
  eventSource.onmessage = (event) => {
    try {
      const parsedData = JSON.parse(event.data);
      console.log(`📥 Generic stream event:`, parsedData);
      onEvent({ type: 'message', data: parsedData });
    } catch (err) {
      console.warn(`⚠️ Error parsing stream event:`, err, event.data);
      onEvent({ type: 'error', data: { error: 'Error parsing event', raw: event.data } });
    }
  };
  
  eventSource.onerror = (error) => {
    console.error(`❌ Stream connection error:`, error);
    if (onError) onError(error);
    // Don't automatically close on error, let the client decide
  };
  
  // Return cleanup function
  return () => {
    console.log(`🔄 Closing run stream connection for ${runId}`);
    eventSource.close();
    delete activeStreamConnections[connectionKey];
  };
}

// Define StreamEvent interface based on SDK's actual event structure
interface StreamEvent {
  event?: string;
  data: any;
}

// Add network debugging utilities
// Export to allow direct use in components if needed
export const debugNetwork = {
  logSSEData: (label: string, data: any) => {
    const smallerData = { ...data };
    // Prevent circular references and huge logs
    if (smallerData.values && Object.keys(smallerData.values).length > 10) {
      smallerData.values = `[${Object.keys(smallerData.values).length} values]`;
    }
    if (smallerData.messages && smallerData.messages.length > 3) {
      smallerData.messages = `[${smallerData.messages.length} messages]`;
    }
    console.log(`🔌 ${label}:`, smallerData);
  },
  
  // Monitor an EventSource for debugging - simpler approach
  monitorEventSource: (source: EventSource, label: string) => {
    // Don't override source.addEventListener as it causes type issues
    // Instead, add our logging listeners separately
    
    // Monitor message events
    source.addEventListener('message', function(event) {
      try {
        if (event.data) {
          const data = JSON.parse(event.data);
          console.log(`🔌 EventSource [${label}] message event:`, data);
        }
      } catch (e) {
        console.log(`🔌 EventSource [${label}] message event (unparseable):`, event.data);
      }
    });
    
    // Monitor open events
    source.addEventListener('open', function() {
      console.log(`🔌 EventSource [${label}] open event - Connection established`);
    });
    
    // Monitor error events
    source.addEventListener('error', function() {
      console.log(`🔌 EventSource [${label}] error event - Connection error`);
    });
    
    return source;
  }
};

// Add lifecycle tracking for streams to debug disconnection issues
export function addStreamLifecycleTracking() {
  // Create a registry of active streams
  if (!window._streamRegistry) {
    window._streamRegistry = new Map<string, any>();
    console.log('🔍 Created stream registry for debugging');
  }
  
  // Ensure the registry exists for all operations
  const registry = window._streamRegistry || new Map<string, any>();
  
  // Track connection open/close events
  const trackStream = (source: EventSource) => {
    // Store reference
    const streamId = `thread_${Date.now()}`;
    registry.set(streamId, {
      source,
      createdAt: new Date(),
      events: [],
      status: 'connecting'
    });
    
    // Track open event
    source.addEventListener('open', (() => {
      const stream = registry.get(streamId);
      if (stream) {
        stream.status = 'open';
        stream.openedAt = new Date();
        console.log(`🔍 Stream ${streamId} opened after ${stream.openedAt.getTime() - stream.createdAt.getTime()}ms`);
      }
    }) as EventListener);
    
    // Track error event
    source.addEventListener('error', ((e: Event) => {
      const stream = registry.get(streamId);
      if (stream) {
        stream.status = 'error';
        stream.lastError = e;
        stream.errorAt = new Date();
        console.log(`❌ Stream ${streamId} error after ${stream.errorAt.getTime() - stream.createdAt.getTime()}ms:`, e);
      }
    }) as EventListener);
    
    // Track close
    source.addEventListener('close', (() => {
      const stream = registry.get(streamId);
      if (stream) {
        stream.status = 'closed';
        stream.closedAt = new Date();
        console.log(`🔍 Stream ${streamId} closed after ${stream.closedAt.getTime() - stream.createdAt.getTime()}ms`);
      }
    }) as EventListener);
    
    return streamId;
  };
  
  return {
    trackStream,
    getActiveStreams: () => Array.from(registry.entries()),
    clearStreamRegistry: () => registry.clear()
  };
}

/**
 * Resume a workflow using a checkpoint in the thread state
 */
export async function resumeWorkflow(
  threadId: string, 
  assistantId: string, 
  checkpoint: any,
  updatedRows: any[],
  nodeIdOverride?: string,
  onEvent?: (event: StreamEvent) => void
): Promise<{ response?: Response; newRunId?: string; cleanup: () => void }> {
  try {
    console.log(`🔍 DEBUG [resumeWorkflow] Starting with:`, { 
      threadId,
      assistantId,
      nodeIdOverride,
      checkpointType: checkpoint ? typeof checkpoint : 'undefined',
      rowsCount: updatedRows?.length || 0,
      hasCallback: !!onEvent
    });
    console.log(`🔄 Resuming workflow for thread ${threadId} with checkpoint:`, checkpoint);
    console.log(`📊 Updated data:`, updatedRows);

    // Get the SDK client
    const client = getClient();
    
    try {
      // Initialize stream lifecycle tracking
      addStreamLifecycleTracking();
      
      // Clear any existing runs to avoid conflicts
      const clearExistingRuns = async () => {
        if (window._activeRunIds && window._activeRunIds[threadId]) {
          console.log(`🔍 DEBUG [resumeWorkflow] Cleaning up existing run ${window._activeRunIds[threadId]} before starting new one`);
          // Cancel the existing run if possible
          try {
            await client.runs.cancel(threadId, window._activeRunIds[threadId], true);
            console.log(`✅ Successfully cancelled existing run ${window._activeRunIds[threadId]}`);
          } catch (e) {
            console.warn('⚠️ Warning: Error cancelling existing run:', e);
          }
          // Clear the active run ID immediately
          clearActiveRunId(threadId);
        }
      };
      
      await clearExistingRuns();
      
      // Create the run first to get the run ID
      console.log('Creating run with standard create method...');
      
      // Keep original payload structure for creating the run
      const createRunPayload = {
        assistant_id: assistantId,
        checkpoint,
        command: {
          resume: { risk_data: updatedRows }, 
          ...(nodeIdOverride ? { goto: nodeIdOverride } : {})
        }
      };
      
      console.log(`🔍 DEBUG [resumeWorkflow] Using create approach with payload:`, 
        JSON.stringify(createRunPayload, null, 2));
      
      // First create the run
      const runResponse = await client.runs.create(threadId, assistantId, createRunPayload);
      // Extract the run ID from the response
      const runId = (runResponse as any).id || (runResponse as any).run_id || runResponse.toString();
      console.log(`✅ Created new run ${runId} for thread ${threadId}`);
      
      // Store the run ID right away
      setActiveRunId(threadId, runId);
      
      // Force a reactive update in components
      window.dispatchEvent(new CustomEvent('run-created', {
        detail: { threadId, runId }
      }));
      
      // Synchronize Stream State - dispatch event to keep stream context in sync
      window.dispatchEvent(new CustomEvent('stream-sync', {
        detail: { 
          threadId, 
          runId,
          timestamp: Date.now(),
          source: 'resumeWorkflow'
        }
      }));
      
      // Configure options for streaming
      const streamOptions = {
        streamMode: ["values", "messages"] as StreamMode[],
        cancelOnDisconnect: true,
        // Add these parameters:
        buffering: false, // Disable any SDK-level buffering
        pollIntervalMs: 0 // Force real-time mode with no polling interval
      };
      
      // Now use joinStream to stream the existing run
      // This is more reliable than creating a run and streaming at the same time
      console.log(`🔍 DEBUG [resumeWorkflow] Using joinStream to stream run ${runId}`);
      const streamGenerator = client.runs.joinStream(threadId, runId, streamOptions);
      
      // We need to get the run ID from the first event
      let newRunId: string | undefined;
      
      // Check if we already have the run ID from an initial response
      if (runResponse && (runResponse as any).checkpoint && (runResponse as any).checkpoint.metadata?.run_id) {
        // Extract run ID from checkpoint if available
        const checkpointRunId = (runResponse as any).checkpoint.metadata.run_id;
        if (checkpointRunId) {
          newRunId = checkpointRunId;
          console.log(`✅ Using run ID from checkpoint: ${newRunId}`);
          
          // Store the run ID for future reference - only call with valid string
          if (newRunId) setActiveRunId(threadId, newRunId);
          // Force a reactive update in components
          window.dispatchEvent(new CustomEvent('run-created', {
            detail: { threadId, runId: newRunId }
          }));
        }
      }
      
      // Create a function to process stream events
      // This will be used to both call the onEvent callback and dispatch global events
      const processStreamEvent = (event: StreamEvent) => {
        // Default event handler for debugging
        console.log(`🔍 DEBUG [resumeWorkflow] Stream event:`, {
          eventType: event.event || 'unknown',
          dataKeys: event.data ? Object.keys(event.data) : [],
          runId: event.data?.run_id || 'none',
          hasValues: !!event.data?.values,
          hasMessages: !!event.data?.messages,
        });
        
        // Extract run ID from any event if we don't have it yet
        const data = event.data || {};
        newRunId = data.run_id || (data.metadata ? data.metadata.run_id : undefined);
        if (!newRunId && typeof data === 'object') {
          const runKey = Object.keys(data).find(key => key.startsWith('run-'));
          if (runKey && data[runKey]?.metadata?.run_id) {
            newRunId = data[runKey].metadata.run_id;
            console.log(`✅ Found run ID in nested metadata: ${newRunId}`);
          }
        }
        
        if (newRunId) {
          console.log(`✅ Extracted run ID from event: ${newRunId}`);
          // Store the run ID for future reference - only call with valid string
          if (newRunId) setActiveRunId(threadId, newRunId);
          // Force a reactive update in components
          window.dispatchEvent(new CustomEvent('run-created', {
            detail: { threadId, runId: newRunId }
          }));
        }
        
        // Dispatch a global update event to ensure UI components update
        // This ensures that any component listening for stream events will receive them
        window.dispatchEvent(new CustomEvent('stream-event', {
          detail: { 
            threadId, 
            runId: newRunId || runId,
            event,
            timestamp: Date.now()
          }
        }));
        
        // If the event contains messages, dispatch a specific message update event
        if (data.messages && Array.isArray(data.messages)) {
          window.dispatchEvent(new CustomEvent('stream-messages-updated', {
            detail: { 
              threadId, 
              runId: newRunId || runId,
              messages: data.messages,
              timestamp: Date.now()
            }
          }));
        }
        
        // If the event contains UI elements, dispatch a specific event
        if (data.values && data.values.ui_elements) {
          window.dispatchEvent(new CustomEvent('ui-elements-updated', {
            detail: { 
              threadId, 
              runId: newRunId || runId,
              uiElements: data.values.ui_elements,
              timestamp: Date.now()
            }
          }));
        }
        
        // Call the provided event handler if one exists
        if (onEvent) {
          onEvent(event);
        }
      };
      
      // Add the cleanup function definition
      const cleanup = () => {
        console.log(`Cleaning up run ${newRunId || runId}`);
        if (threadId) clearActiveRunId(threadId);
        
        // Force cleanup of any remaining streams for this thread
        if (window._streamRegistry) {
          const threadStreams = Array.from(window._streamRegistry.entries())
            .filter(([id]) => id.includes(`thread_${threadId}`));
          
          console.log(`Found ${threadStreams.length} active streams for thread ${threadId}`);
          
          threadStreams.forEach(([id, stream]) => {
            console.log(`Forcing cleanup of stream ${id} in state ${stream.status}`);
            try {
              if (stream.source && stream.source.readyState !== 2) { // 2 = CLOSED
                stream.source.close();
                console.log(`Manually closed stream ${id}`);
              }
            } catch (e) {
              console.error(`Error closing stream ${id}:`, e);
            }
            window._streamRegistry?.delete(id);
          });
        }
        
        // Emit a final cleanup event
        window.dispatchEvent(new CustomEvent('stream-cleanup', {
          detail: { 
            threadId, 
            runId: newRunId || runId,
            timestamp: Date.now() 
          }
        }));
      };
      
      // Track event counts for debugging
      let eventCount = 0;
      
      // Add timestamp tracking to measure event arrival gaps
      let lastEventTime = Date.now();
      
      // Start consuming the stream in the background
      (async () => {
        try {
          console.log('🔍 DEBUG [resumeWorkflow] Stream started, waiting for events...');
          // Iterate through the stream events
          for await (const event of streamGenerator) {
            const now = Date.now();
            const timeSinceLastEvent = now - lastEventTime;
            lastEventTime = now;
            
            eventCount++;
            
            // Log the event type for debugging with timing information
            console.log(`🔍 DEBUG [resumeWorkflow] Event #${eventCount}: ${event.event || 'unknown'} (${timeSinceLastEvent}ms since last event)`);
            
            // Process each event to handle callbacks and dispatch global events
            processStreamEvent(event);
            
            // Check if this is the completion event and clean up if necessary
            // Be careful to check the event type since we can't use strict string comparison
            const isEndEvent = 
              (typeof event.event === 'string' && event.event.includes('end')) || 
              (event.data && event.data.status === 'completed') ||
              (event.data && event.data.run_id && event.data.completed === true);
            
            if (isEndEvent) {
              console.log(`🔍 DEBUG [resumeWorkflow] Detected run completion event, cleaning up streams`);
              // Call cleanup to close all connections
              cleanup();
              break; // Exit the loop to stop processing events
            }
          }
          console.log(`🔍 DEBUG [resumeWorkflow] Stream completed after ${eventCount} events`);
          
          // Always cleanup at the end, even if no explicit end event was received
          cleanup();
        } catch (streamError) {
          console.error('❌ Stream error:', streamError);
          processStreamEvent({ 
            event: 'error', 
            data: { 
              error: streamError, 
              message: streamError instanceof Error ? streamError.message : 'Unknown stream error' 
            } 
          });
        }
      })();
      
      console.log(`🔍 DEBUG [resumeWorkflow] Returning with runId: ${newRunId}`);
      
      // Wait for the run ID to be set before returning
      // This ensures we have the run ID, but don't block on the entire stream
      if (!newRunId) {
        console.log('🔍 DEBUG [resumeWorkflow] Waiting for run ID from stream...');
        try {
          // Wait for the first event to get the run ID, with a timeout
          await Promise.race([
            new Promise<void>((resolve) => {
              const checkInterval = setInterval(() => {
                if (newRunId) {
                  clearInterval(checkInterval);
                  resolve();
                }
              }, 100);
            }),
            new Promise<void>((_, reject) => 
              setTimeout(() => {
                // Even if we timeout, check one more time if we have a run ID from activeRunId
                const existingRunId = getActiveRunId(threadId);
                if (existingRunId) {
                  console.log(`🔍 Using existing active run ID after timeout: ${existingRunId}`);
                  newRunId = existingRunId;
                  return; // Don't reject if we found a run ID
                }
                
                console.error('🔍 DEBUG [resumeWorkflow] Timeout waiting for run ID');
                reject(new Error("Timeout waiting for run ID"));
              }, 10000) // 10 seconds timeout
            )
          ]);
        } catch (error) {
          // If we still don't have a run ID, create a fallback one
          if (!newRunId) {
            // Generate a fallback run ID to ensure we always have a valid string
            const fallbackId = `fallback-${Date.now()}`;
            newRunId = fallbackId;
            console.warn(`⚠️ Using fallback run ID after timeout: ${fallbackId}`);
            // We know fallbackId is a valid string, so this is safe
            if (fallbackId) setActiveRunId(threadId, fallbackId);
          }
        }
      }
      
      return { newRunId, cleanup };
      
    } catch (error: any) {
      console.error('❌ Error creating run:', error);
      
      // Provide more detailed error info if available
      if (error.response) {
        const errorText = await error.response.text();
        console.error('Server error details:', errorText);
      }
      
      throw new Error(`Failed to create run: ${error.message}`);
    }
    // Reference onEvent to avoid TS warning if unused
    void onEvent;
  } catch (error: any) {
    console.error('❌ Error creating run:', error);
    
    // Provide more detailed error info if available
    if (error.response) {
      const errorText = await error.response.text();
      console.error('Server error details:', errorText);
    }
    
    throw new Error(`Failed to create run: ${error.message}`);
  }
  // Reference onEvent to avoid TS warning if unused
  void onEvent;
}

/**
 * Fetches thread history using the GET /threads/{thread_id}/history endpoint.
 * @param threadId The thread ID
 * @param options Optional: { limit?: number, before?: string }
 * @returns Array of thread history states
 */
export async function getThreadHistory(threadId: string, options?: { limit?: number; before?: string }): Promise<any[]> {
  let url = `${BASE_URL}/threads/${threadId}/history`;
  const params = [];
  if (options?.limit) params.push(`limit=${options.limit}`);
  if (options?.before) params.push(`before=${encodeURIComponent(options.before)}`);
  if (params.length) url += `?${params.join('&')}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch thread history: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

/**
 * Extracts the latest thread_id and run_id from a /threads/{thread_id}/history response.
 * @param historyResponse The array response from the /history endpoint.
 * @returns { threadId: string, runId: string } or null if not found.
 */
export function extractThreadAndRunIdFromHistory(historyResponse: any[]): { threadId: string, runId: string } | null {
  if (!historyResponse || !Array.isArray(historyResponse) || historyResponse.length === 0) {
    console.warn('[extractThreadAndRunIdFromHistory] Invalid or empty history response');
    return null;
  }
  
  // Find the latest entry that has both thread_id and run_id
  const latest = historyResponse[0];  // History is sorted by most recent first
  console.log('[extractThreadAndRunIdFromHistory] Latest entry:', latest);
  const threadId = latest?.values?.thread_id || latest?.metadata?.thread_id;
  const runId = latest?.metadata?.run_id;
  console.log('[extractThreadAndRunIdFromHistory] Extracted threadId:', threadId, 'runId:', runId);
  if (threadId && runId) return { threadId, runId };
  console.warn('[extractThreadAndRunIdFromHistory] Could not extract both threadId and runId');
  return null;
}
