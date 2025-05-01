import React, {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
} from "react";
import { useStream } from "@langchain/langgraph-sdk/react";
import { type Message } from "@langchain/langgraph-sdk";
import { type UIMessage } from "@langchain/langgraph-sdk/react-ui";
import { useQueryState } from "nuqs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LangGraphLogoSVG } from "@/components/icons/langgraph";
import { Label } from "@/components/ui/label";
import { ArrowRight } from "lucide-react";
import { PasswordInput } from "@/components/ui/password-input";
import { getApiKey } from "@/lib/api-key";
import { useThreads } from "./Thread";
import { toast } from "sonner";

export type StateType = { 
  messages: Message[]; 
  ui?: UIMessage[];
  ui_elements?: Array<{id: string; component: string; props: Record<string, any>}>;
  assistant_id?: string; // Added for interrupt/resume
  checkpoint?: any; // Added for interrupt/resume
};

// Use any type to avoid strict typing errors with the SDK
// This is a simpler approach than trying to match the exact return type
type StreamContextType = any;

const StreamContext = createContext<StreamContextType | undefined>(undefined);

// Add custom event listener for run-created events that come from our resumeWorkflow function
function useRunCreatedEvent() {
  useEffect(() => {
    const handleRunCreated = (event: CustomEvent) => {
      console.log('🔍 DEBUG [Stream] run-created event detected:', event.detail);
    };
    
    window.addEventListener('run-created', handleRunCreated as EventListener);
    
    return () => {
      window.removeEventListener('run-created', handleRunCreated as EventListener);
    };
  }, []);
}

// Add custom event listener for UI element updates
function useUIElementsUpdatedEvent() {
  useEffect(() => {
    const handleUIElementsUpdated = (event: CustomEvent) => {
      console.log('🔍 DEBUG [Stream] ui-elements-updated event detected:', event.detail);
    };
    
    window.addEventListener('ui-elements-updated', handleUIElementsUpdated as EventListener);
    
    return () => {
      window.removeEventListener('ui-elements-updated', handleUIElementsUpdated as EventListener);
    };
  }, []);
}

// Add stream sync listener to ensure the SDK stream state stays in sync
// with our manual stream implementation in resumeWorkflow
function useStreamSyncEvent() {
  useEffect(() => {
    const handleStreamSync = (event: CustomEvent) => {
      console.log('🔍 DEBUG [Stream] stream-sync event detected:', event.detail);
      
      // Force an update to the stream context if needed
      // We could call streamValue.update() here if streamValue is accessible
      
      // Dispatch a secondary event that components can listen for
      window.dispatchEvent(new CustomEvent('stream-state-updated', {
        detail: {
          ...event.detail,
          timestamp: Date.now()
        }
      }));
    };
    
    window.addEventListener('stream-sync', handleStreamSync as EventListener);
    
    return () => {
      window.removeEventListener('stream-sync', handleStreamSync as EventListener);
    };
  }, []);
}

// Add custom event listener for stream-messages-updated events
function useStreamMessagesEvent(messagesUpdater: (messages: any[]) => void) {
  useEffect(() => {
    const handleStreamMessages = (event: CustomEvent) => {
      console.log('🔍 DEBUG [Stream] stream-messages-updated event received:', event.detail);
      
      // Update the messages in the stream context
      if (event.detail?.messages && Array.isArray(event.detail.messages)) {
        messagesUpdater(event.detail.messages);
      }
    };
    
    window.addEventListener('stream-messages-updated', handleStreamMessages as EventListener);
    
    return () => {
      window.removeEventListener('stream-messages-updated', handleStreamMessages as EventListener);
    };
  }, [messagesUpdater]);
}

// Add custom event listener for ui-elements-updated events
function useUIElementsEvent(valuesUpdater: (values: any) => void) {
  useEffect(() => {
    const handleUIElements = (event: CustomEvent) => {
      console.log('🔍 DEBUG [Stream] ui-elements-updated event received:', event.detail);
      
      // Update the UI elements in the stream context values
      if (event.detail?.uiElements) {
        valuesUpdater({
          ui_elements: event.detail.uiElements
        });
      }
    };
    
    window.addEventListener('ui-elements-updated', handleUIElements as EventListener);
    
    return () => {
      window.removeEventListener('ui-elements-updated', handleUIElements as EventListener);
    };
  }, [valuesUpdater]);
}

async function sleep(ms = 4000) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function checkGraphStatus(
  apiUrl: string,
  apiKey: string | null,
): Promise<boolean> {
  try {
    const res = await fetch(`${apiUrl}/info`, {
      ...(apiKey && {
        headers: {
          "X-Api-Key": apiKey,
        },
      }),
    });

    return res.ok;
  } catch (e) {
    console.error(e);
    return false;
  }
}

const StreamSession = ({
  children,
  apiKey,
  apiUrl,
  assistantId,
}: {
  children: ReactNode;
  apiKey: string | null;
  apiUrl: string;
  assistantId: string;
}) => {
  const [threadId, setThreadId] = useQueryState("threadId");
  const { getThreads, setThreads } = useThreads();
  
  // Track network requests for streaming
  useEffect(() => {
    // Create a proxy for the native fetch to monitor SSE connections
    const originalFetch = window.fetch;
    window.fetch = function monitoredFetch(input: RequestInfo | URL, init?: RequestInit) {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const method = init?.method || 'GET';
      
      // Only log streaming-related requests
      if (url.includes('/stream') || url.includes('/runs/') || 
          (init?.headers && JSON.stringify(init.headers).includes('text/event-stream'))) {
        
        console.log(`🔌 NETWORK [${method}] Streaming request to: ${url}`, {
          headers: init?.headers,
          body: init?.body ? JSON.parse(init.body as string) : undefined
        });
        
        // Return the original fetch but also log the response
        return originalFetch(input, init).then(response => {
          console.log(`🔌 NETWORK [${response.status}] Response from: ${url}`, {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            // We can't directly log the body as it's a stream
            isStream: response.headers.get('content-type')?.includes('text/event-stream')
          });
          
          // If this is an SSE stream, monitor it
          if (response.headers.get('content-type')?.includes('text/event-stream')) {
            console.log('🔌 NETWORK Event stream detected - events will be logged');
            
            // Create a new ReadableStream to clone the response body
            const originalBody = response.body;
            if (originalBody) {
              // Use a TransformStream to monitor chunks without consuming them
              const monitorStream = new TransformStream({
                transform(chunk, controller) {
                  // Log the chunk data (with some formatting)
                  const text = new TextDecoder().decode(chunk);
                  const events = text.split('\n\n').filter(e => e.trim());
                  
                  for (const event of events) {
                    if (event.trim()) {
                      try {
                        // Parse and log each event
                        const lines = event.split('\n');
                        const eventType = lines.find(l => l.startsWith('event:'))?.substring(6).trim();
                        const data = lines.find(l => l.startsWith('data:'))?.substring(5).trim();
                        
                        console.log(`🔌 NETWORK SSE Event [${eventType || 'message'}]:`, 
                          data ? JSON.parse(data) : '(no data)');
                      } catch (e) {
                        console.log(`🔌 NETWORK SSE Raw Event:`, event);
                      }
                    }
                  }
                  
                  // Pass the chunk through unchanged
                  controller.enqueue(chunk);
                }
              });

              // Create a new response with the monitored body
              const clonedResponse = new Response(
                originalBody.pipeThrough(monitorStream),
                {
                  headers: response.headers,
                  status: response.status,
                  statusText: response.statusText
                }
              );
              
              return clonedResponse;
            }
          }
          
          return response;
        }).catch(error => {
          console.error(`🔌 NETWORK Error for ${url}:`, error);
          throw error;
        });
      }
      
      // For non-streaming requests, just use the original fetch
      return originalFetch(input, init);
    };
    
    // Cleanup function to restore original fetch
    return () => {
      window.fetch = originalFetch;
    };
  }, [apiUrl]); // Only recreate if the API URL changes
  
  // Enable run-created and ui-elements-updated event listeners
  useRunCreatedEvent();
  useUIElementsUpdatedEvent();
  useStreamSyncEvent();
  
  // Call the useStream hook directly instead of through useTypedStream
  // Create a try/catch block to handle potential initialization errors
  let streamValue: any = { 
    isLoading: false, 
    error: null, 
    messages: [], 
    values: null,
    update: () => console.warn('Stream not initialized'),
    reset: () => console.warn('Stream not initialized')
  };
  
  try {
    // Only call useStream if all required parameters are available
    if (apiUrl && assistantId) {
      // Configure options for the useStream hook
      const streamOptions = {
        apiUrl,
        apiKey: apiKey ?? undefined,
        assistantId: assistantId || 'report_content',
        threadId: threadId ?? null,
        // TypeScript doesn't recognize these properties, but they might be supported
        // in future SDK versions or internally
        options: {
          forceSSE: true, // Force SSE mode instead of polling
        },
        onThreadId: (id: string) => {
          console.log('🔍 DEBUG [Stream] ThreadId received from SDK:', id);
          setThreadId(id);
          sleep().then(() => getThreads().then(setThreads).catch(console.error));
        },
      };
      
      console.log('🔍 DEBUG [Stream] Initializing stream with options:', {
        ...streamOptions,
        apiKey: apiKey ? '[REDACTED]' : undefined // Don't log API key
      });
      
      const hookResult = useStream(streamOptions);
      
      // Only use the result if it's valid
      if (hookResult) {
        streamValue = hookResult;
        
        // Set up custom message updater function
        const messagesUpdater = (newMessages: any[]) => {
          console.log('🔍 DEBUG [Stream] Manually updating messages from event:', {
            messageCount: newMessages.length
          });
          
          // Get current messages
          const currentMessages = [...(streamValue.messages || [])];
          
          // Merge with new messages (avoiding duplicates by ID)
          const messagesMap = new Map();
          
          // First add all current messages to the map
          currentMessages.forEach(msg => {
            if (msg && msg.id) {
              messagesMap.set(msg.id, msg);
            }
          });
          
          // Then add/update with new messages
          newMessages.forEach(msg => {
            if (msg && msg.id) {
              messagesMap.set(msg.id, msg);
            }
          });
          
          // Convert back to array
          const mergedMessages = Array.from(messagesMap.values());
          
          // Update the messages using the SDK's update method
          if (streamValue.update) {
            streamValue.update({
              messages: mergedMessages
            });
          }
        };
        
        // Set up custom values updater function
        const valuesUpdater = (newValues: any) => {
          console.log('🔍 DEBUG [Stream] Manually updating values from event:', newValues);
          
          // Get current values
          const currentValues = streamValue.values || {};
          
          // Merge with new values
          const mergedValues = {
            ...currentValues,
            ...newValues,
            // Special handling for ui_elements array to ensure proper merging
            ...(newValues.ui_elements ? { 
              ui_elements: newValues.ui_elements 
            } : {})
          };
          
          // Update the values using the SDK's update method
          if (streamValue.update) {
            streamValue.update({
              values: mergedValues
            });
          }
        };
        
        // Set up event listeners for manual updates from resumeWorkflow
        useStreamMessagesEvent(messagesUpdater);
        useUIElementsEvent(valuesUpdater);
      }
    } else {
      console.warn('Missing required parameters for useStream:', { apiUrl, assistantId });
    }
  } catch (error) {
    console.error('Error initializing stream:', error);
  }

  // Enhanced debug logging for stream values and messages
  useEffect(() => {
    console.log('🔍 DEBUG [Stream] Stream value updated:', {
      isLoading: streamValue.isLoading,
      error: streamValue.error,
      hasValues: !!streamValue.values,
      messageCount: streamValue.messages?.length || 0,
    });
    
    if (streamValue.values?.ui_elements) {
      console.log('🔍 DEBUG [Stream] UI elements in stream values:', 
        streamValue.values.ui_elements);
    }
  }, [streamValue.isLoading, streamValue.error, streamValue.values, streamValue.messages]);

  useEffect(() => {
    if (streamValue && streamValue.messages) {
      console.log('🔍 DEBUG [Stream] Stream messages updated:', {
        messageCount: streamValue.messages.length,
        lastMessage: streamValue.messages[streamValue.messages.length - 1]
      });
    }
  }, [streamValue?.messages]);

  useEffect(() => {
    checkGraphStatus(apiUrl, apiKey).then((ok) => {
      if (!ok) {
        toast.error("Failed to connect to LangGraph server", {
          description: () => (
            <p>
              Please ensure your graph is running at <code>{apiUrl}</code> and
              your API key is correctly set (if connecting to a deployed graph).
            </p>
          ),
          duration: 10000,
          richColors: true,
          closeButton: true,
        });
      }
    });
  }, [apiKey, apiUrl]);

  return (
    <StreamContext.Provider value={streamValue}>
      {children}
    </StreamContext.Provider>
  );
};

export const StreamProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [apiUrl, setApiUrl] = useQueryState("apiUrl");
  const [apiKey, _setApiKey] = useState(() => {
    return getApiKey();
  });

  const setApiKey = (key: string) => {
    window.localStorage.setItem("lg:chat:apiKey", key);
    _setApiKey(key);
  };

  const [assistantId, setAssistantId] = useQueryState("assistantId");

  if (!apiUrl || !assistantId) {
    return (
      <div className="flex items-center justify-center min-h-screen w-full p-4">
        <div className="animate-in fade-in-0 zoom-in-95 flex flex-col border bg-background shadow-lg rounded-lg max-w-3xl">
          <div className="flex flex-col gap-2 mt-14 p-6 border-b">
            <div className="flex items-start flex-col gap-2">
              <LangGraphLogoSVG className="h-7" />
              <h1 className="text-xl font-semibold tracking-tight">
                Agent Chat
              </h1>
            </div>
            <p className="text-muted-foreground">
              Welcome to Agent Chat! Before you get started, you need to enter
              the URL of the deployment and the assistant / graph ID.
            </p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();

              const form = e.target as HTMLFormElement;
              const formData = new FormData(form);
              const apiUrl = formData.get("apiUrl") as string;
              const assistantId = formData.get("assistantId") as string;
              const apiKey = formData.get("apiKey") as string;

              setApiUrl(apiUrl);
              setApiKey(apiKey);
              setAssistantId(assistantId);

              form.reset();
            }}
            className="flex flex-col gap-6 p-6 bg-muted/50"
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="apiUrl">
                Deployment URL<span className="text-rose-500">*</span>
              </Label>
              <p className="text-muted-foreground text-sm">
                This is the URL of your LangGraph deployment. Can be a local, or
                production deployment.
              </p>
              <Input
                id="apiUrl"
                name="apiUrl"
                className="bg-background"
                defaultValue={apiUrl ?? "http://localhost:8123"}
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="assistantId">
                Assistant / Graph ID<span className="text-rose-500">*</span>
              </Label>
              <p className="text-muted-foreground text-sm">
                This is the ID of the graph (can be the graph name), or
                assistant to fetch threads from, and invoke when actions are
                taken.
              </p>
              <Input
                id="assistantId"
                name="assistantId"
                className="bg-background"
                defaultValue={assistantId ?? "report_content"}
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="apiKey">LangSmith API Key</Label>
              <p className="text-muted-foreground text-sm">
                This is <strong>NOT</strong> required if using a local LangGraph
                server. This value is stored in your browser's local storage and
                is only used to authenticate requests sent to your LangGraph
                server.
              </p>
              <PasswordInput
                id="apiKey"
                name="apiKey"
                defaultValue={apiKey ?? ""}
                className="bg-background"
                placeholder="lsv2_pt_..."
              />
            </div>

            <div className="flex justify-end mt-2">
              <Button type="submit" size="lg">
                Continue
                <ArrowRight className="size-5" />
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <StreamSession apiKey={apiKey} apiUrl={apiUrl} assistantId={assistantId}>
      {children}
    </StreamSession>
  );
};

export const useStreamContext = (): StreamContextType => {
  const context = useContext(StreamContext);
  if (context === undefined) {
    throw new Error("useStreamContext must be used within a StreamProvider");
  }
  return context;
};

export default StreamContext;
