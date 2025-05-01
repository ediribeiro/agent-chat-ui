import { v4 as uuidv4 } from "uuid";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useStreamContext } from "@/providers/Stream";
import { FormEvent } from "react";
import { Button } from "../ui/button";
import { Checkpoint, Message } from "@langchain/langgraph-sdk";
import { AssistantMessage, AssistantMessageLoading } from "./messages/ai";
import { HumanMessage } from "./messages/human";
import {
  ensureToolCallsHaveResponses,
} from "@/lib/ensure-tool-responses";
import { LangGraphLogoSVG } from "../icons/langgraph";
import { TooltipIconButton } from "./tooltip-icon-button";
import {
  ArrowDown,
  LoaderCircle,
  PanelRightOpen,
  PanelRightClose,
  SquarePen,
  TerminalSquare,
  ArrowUp,
} from "lucide-react";
import { useQueryState, parseAsBoolean } from "nuqs";
import { StickToBottom, useStickToBottomContext } from "use-stick-to-bottom";
import ThreadHistory from "./history";
import { toast } from "sonner";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { FileUpload } from "@/components/FileUpload";
import LogStream from "@/components/LogStream";
import { Textarea } from "@/components/ui/textarea";

// Re-import custom UI components needed for StateDrivenUIComponents
import InputFile from "./messages/input-file";
import RiskAnalysis from "./messages/risk-analysis";
import ProtectionMeasuresTable from "./messages/protection-measures-table";

// Re-define registry needed for StateDrivenUIComponents
const componentRegistry: Record<string, any> = {
  "input-file.tsx": InputFile,
  "risk-analysis.tsx": RiskAnalysis,
  "protection-measures-table.tsx": ProtectionMeasuresTable,
};

// Define StateDrivenUIComponents here as it was removed from ai.tsx
function StateDrivenUIComponents({
  thread,
  interruptAssistantId,
  interruptCheckpoint,
}: {
  thread: ReturnType<typeof useStreamContext>;
  interruptAssistantId: string | undefined;
  interruptCheckpoint: any;
}) {
  const { values } = thread;
  const [threadId] = useQueryState("threadId");
  
  // Debug logging for interrupt state
  console.log('StateDrivenUIComponents:', { 
    hasValues: !!values,
    hasUIElements: !!(values?.ui_elements),
    interruptCheckpoint,
    interruptAssistantId
  });
  
  // First check ui_elements in stream values
  let uiElementsToRender = values?.ui_elements;
  
  // If not found, check in the interrupt checkpoint for the new backend-driven approach
  if ((!uiElementsToRender || uiElementsToRender.length === 0) && 
      interruptCheckpoint && 
      interruptCheckpoint.ui_elements && 
      Array.isArray(interruptCheckpoint.ui_elements)) {
    uiElementsToRender = interruptCheckpoint.ui_elements;
    console.log('Using UI elements from interruptCheckpoint:', uiElementsToRender);
  }

  // When we have UI elements but no interrupt checkpoint data,
  // this probably means we're in an interrupt state with backend-driven UI elements
  // Let's construct a synthetic interrupt context to ensure editing works
  const inInterruptState = Boolean(values?.ui_elements && !interruptCheckpoint);
  if (inInterruptState && !interruptCheckpoint && values?.ui_elements) {
    // Create a more comprehensive synthetic checkpoint to pass along
    // Include all fields we know the backend expects
    
    // First check if any of the UI elements are risk analysis components
    const riskAnalysisElement = values?.ui_elements?.find(
      (el: any) => el.type === 'risk_analysis' && Array.isArray(el.props?.analysis_data)
    );
    
    const riskData = riskAnalysisElement?.props?.analysis_data || [];
    const tableId = riskData.length > 0 ? 'risk_table' : 'protection_table';
    
    interruptCheckpoint = { 
      ui_elements: values.ui_elements,
      thread_id: threadId || '',
      // IMPORTANT: We're using an empty string for run_id as a signal that it should be
      // filled in by resumeWorkflow when it gets the actual run_id from the server response
      run_id: '',
      node_id: 'analyze_hazards', // Default to analyze_hazards since we're in risk analysis
      node_type: 'agent',
      status: 'paused',
      graph_state: {
        risk_data: riskData,
        current_node: 'analyze_hazards',
      },
      config: {
        assistant_id: 'report_content',
        table_id: tableId
      }
    };
    interruptAssistantId = 'report_content'; // Set the correct assistant ID
    console.log('Created enhanced synthetic interrupt context:', interruptCheckpoint);
  }

  if (!uiElementsToRender || uiElementsToRender.length === 0) {
    console.log('No UI elements to render');
    return null;
  }

  return (
    <div className="mb-4">
      {uiElementsToRender.map((uiElement) => {
        const ComponentToRender = componentRegistry[uiElement.component];
        if (!ComponentToRender) {
          console.error(`Component not found in registry: ${uiElement.component}`);
          return (
            <div key={uiElement.id} className="text-red-500 p-2 border border-red-500 rounded">
              Error: Component "{uiElement.component}" not found.
            </div>
          );
        }
        return (
          <ComponentToRender
            key={uiElement.id}
            {...uiElement.props}
            threadId={threadId}
            assistantId={interruptAssistantId}
            checkpoint={interruptCheckpoint}
          />
        );
      })}
    </div>
  );
}

function ScrollToBottom(props: { className?: string }) {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext();

  if (isAtBottom) return null;
  return (
    <Button
      variant="outline"
      size="sm"
      className={cn(
        "absolute bottom-20 left-1/2 -translate-x-1/2 z-10",
        "animate-in fade-in-0 zoom-in-95",
        props.className,
      )}
      onClick={() => scrollToBottom()}
    >
      <ArrowDown className="w-4 h-4 mr-1" />
      <span>Scroll to bottom</span>
    </Button>
  );
}

// Helper function to compare message arrays (needed again)
function areStreamedMessagesVisuallyEqual(arr1: Message[] | null | undefined, arr2: Message[] | null | undefined): boolean {
  if (!arr1 || !arr2) return arr1 === arr2; // Both null/undefined is equal
  if (arr1.length !== arr2.length) return false;
  for (let i = 0; i < arr1.length; i++) {
    // Simple check based on ID and stringified content
    // Added checks for null/undefined elements
    if (!arr1[i] || !arr2[i] || arr1[i].id !== arr2[i].id || JSON.stringify(arr1[i].content) !== JSON.stringify(arr2[i].content)) {
      return false;
    }
  }
  return true;
}

export function Thread() {
  const [threadId, setThreadId] = useQueryState("threadId");
  const [chatHistoryOpen, setChatHistoryOpen] = useQueryState(
    "chatHistoryOpen",
    parseAsBoolean.withDefault(false),
  );
  const [hideToolCalls, setHideToolCalls] = useQueryState(
    "hideToolCalls",
    parseAsBoolean.withDefault(false),
  );
  const [showLogs, setShowLogs] = useState(false);
  const [input, setInput] = useState("");
  const isLargeScreen = useMediaQuery("(min-width: 1024px)");
  const [useMockLogs, setUseMockLogs] = useState(false);

  const stream = useStreamContext();
  const streamValues = stream.values;
  const streamedMessages = stream.messages; // Source stream for updates
  const isLoading = stream.isLoading;

  // Interrupt/Resume State LIFTED HERE
  const [interruptAssistantId, setInterruptAssistantId] = useState<string | undefined>(undefined);
  const [interruptCheckpoint, setInterruptCheckpoint] = useState<any>(undefined);

  useEffect(() => {
    if (!streamValues) return;
    if (streamValues.checkpoint && streamValues.assistant_id) {
      setInterruptAssistantId(streamValues.assistant_id);
      setInterruptCheckpoint(streamValues.checkpoint);
    } else {
      setInterruptAssistantId(undefined);
      setInterruptCheckpoint(undefined);
    }
  }, [streamValues?.checkpoint, streamValues?.assistant_id]);

  useEffect(() => {
    if (stream.values && Object.keys(stream.values).length > 0) {
      console.log(">>> Stream Values Updated:", stream.values);
    }
  }, [stream.values]);

  useEffect(() => {
    if (stream.messages && stream.messages.length > 0) {
        console.log(">>> Stream Messages Updated:", stream.messages);
    }
  }, [stream.messages]);

  const lastError = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!stream.error) {
      lastError.current = undefined;
      return;
    }
    try {
      const message = (stream.error as any).message;
      if (!message || lastError.current === message) {
        return;
      }

      lastError.current = message;
      toast.error("An error occurred. Please try again.", {
        description: (
          <p>
            <strong>Error:</strong> <code>{message}</code>
          </p>
        ),
        richColors: true,
        closeButton: true,
      });
    } catch {
      // no-op
    }
  }, [stream.error]);

  // Reintroduce displayMessages state for frontend accumulation
  const [displayMessages, setDisplayMessages] = useState<Message[]>([]);

  useEffect(() => {
    // Only proceed if streamedMessages is a valid array (even if empty)
    if (Array.isArray(streamedMessages)) {
      setDisplayMessages(prevDisplayMessages => {
        // Build the potential new list by merging
        const newMessagesMap = new Map<string, Message>();
        // 1. Populate map with previous messages from our state
        prevDisplayMessages.forEach(msg => msg.id && newMessagesMap.set(msg.id, msg));

        // 2. Merge/update with incoming messages from the SDK stream
        streamedMessages.forEach(newMsg => {
          if (!newMsg?.id) return; // Skip messages without ID
          // Add or Replace in the map. Assumes incoming message has the latest content for that ID.
          newMessagesMap.set(newMsg.id, newMsg);
        });

        // 3. Convert map back to array
        const nextDisplayMessages = Array.from(newMessagesMap.values());

        // 4. Compare with previous state to prevent unnecessary updates/loops
        if (areStreamedMessagesVisuallyEqual(nextDisplayMessages, prevDisplayMessages)) {
          // No visual change detected
          return prevDisplayMessages;
        }

        // 5. Update state if changed
        console.log("Updating displayMessages with frontend accumulation from stream.messages.");
        return nextDisplayMessages;
      });
    }
    // If streamedMessages is null/undefined, do nothing, preserving displayMessages

  }, [streamedMessages]); // Depend on the SDK's message stream

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const newHumanMessage: Message = {
      id: uuidv4(),
      type: "human",
      content: input,
    };

    // Optimistic UI update to our local state
    setDisplayMessages(prev => [...prev, newHumanMessage]);

    // Prepare messages for submission using the *updated* local state
    const messagesForSubmit = [...displayMessages, newHumanMessage];
    const toolMessages = ensureToolCallsHaveResponses(messagesForSubmit);

    stream.submit(
      { messages: toolMessages },
      {
        streamMode: ["messages", "values"], // Keep requesting both streams
      },
    );

    setInput("");
  };

  const handleRegenerate = (
    parentCheckpoint: Checkpoint | null | undefined,
  ) => {
    let lastAiIndex = -1;
    // Find the index in our local displayMessages
    for(let i = displayMessages.length - 1; i >= 0; i--) {
        if (displayMessages[i].type === 'ai') {
            lastAiIndex = i;
            break;
        }
    }
    // Optimistically slice our local displayMessages state
    setDisplayMessages(prev => prev.slice(0, lastAiIndex >= 0 ? lastAiIndex : 0));

    // Submit with checkpoint
    stream.submit(undefined, {
      checkpoint: parentCheckpoint,
      streamMode: ["messages", "values"], // Keep requesting both streams
    });
  };

  // Update chatStarted to check our local displayMessages length
  const chatStarted = !!threadId || displayMessages.length > 0 || (streamValues?.ui_elements && streamValues.ui_elements.length > 0);

  const mainContentMarginLeft = chatHistoryOpen ? (isLargeScreen ? 300 : 0) : 0;
  const mainContentWidth = chatHistoryOpen
    ? isLargeScreen
      ? "calc(100% - 300px)"
      : "100%"
    : "100%";

  return (
    <div className="flex w-full h-screen overflow-hidden">
      <div className="relative lg:flex hidden">
        <motion.div
          className="absolute h-full border-r bg-white overflow-hidden z-30"
          style={{ width: 300 }}
          animate={
            isLargeScreen
              ? { x: chatHistoryOpen ? 0 : -300 }
              : { x: chatHistoryOpen ? 0 : -300 }
          }
          initial={{ x: -300 }}
          transition={
            isLargeScreen
              ? { type: "spring", stiffness: 300, damping: 30 }
              : { duration: 0 }
          }
        >
          <div className="relative h-full" style={{ width: 300 }}>
            <ThreadHistory />
          </div>
        </motion.div>
      </div>
      <motion.div
        className="flex flex-col flex-1 h-screen relative"
        layout={isLargeScreen}
        style={{
          marginLeft: mainContentMarginLeft,
          width: mainContentWidth,
        }}
        transition={
          isLargeScreen
            ? { type: "spring", stiffness: 300, damping: 30 }
            : { duration: 0 }
        }
      >
        <div
          className={cn(
            "flex items-center justify-between p-2 border-b bg-background z-20",
            !chatStarted && "absolute top-0 left-0 right-0",
            chatStarted && "relative",
          )}
        >
          <div className="flex items-center justify-start gap-2 flex-1">
            {(!chatHistoryOpen || !isLargeScreen) && (
              <Button
                variant="ghost"
                onClick={() => setChatHistoryOpen((p) => !p)}
              >
                {chatHistoryOpen ? (
                  <PanelRightOpen className="size-5" />
                ) : (
                  <PanelRightClose className="size-5" />
                )}
              </Button>
            )}
            {chatStarted && (
              <button
                className="flex gap-2 items-center cursor-pointer"
                onClick={() => setThreadId(null)}
              >
                <LangGraphLogoSVG width={32} height={32} />
                <span className="text-xl font-semibold tracking-tight">
                  Agent Chat
                </span>
              </button>
            )}
          </div>

          {chatStarted && (
            <TooltipIconButton
              tooltip="New thread"
              variant="ghost"
              onClick={() => setThreadId(null)}
            >
              <SquarePen className="size-5" />
            </TooltipIconButton>
          )}
        </div>

        <div className="flex-1 overflow-y-auto relative">
          <StickToBottom>
            <div className="p-4 space-y-0">
              {!chatStarted ? (
                <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
                  <div className="max-w-md w-full text-center">
                    <h2 className="text-2xl font-semibold mb-2">
                      Risk Analysis Chatbot
                    </h2>
                    <p className="text-muted-foreground mb-6">
                      Upload a PDF document to start the risk analysis process
                    </p>
                    <FileUpload />
                    <div className="mt-12">
                      <LangGraphLogoSVG className="flex-shrink-0 h-8 mx-auto mb-2" />
                      <h1 className="text-2xl font-semibold tracking-tight">
                        Agent Chat
                      </h1>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Render StateDrivenUIComponents FIRST */}
                  <StateDrivenUIComponents thread={stream} interruptAssistantId={interruptAssistantId} interruptCheckpoint={interruptCheckpoint} />

                  {/* Then render the message history */}
                  {displayMessages.map((message, index) => {
                      if (message.type === "human") {
                        return (
                          <HumanMessage
                            key={message.id || `${message.type}-${index}`}
                            message={message}
                            isLoading={isLoading}
                          />
                        );
                      } else {
                        return (
                          <AssistantMessage
                            key={message.id || `${message.type}-${index}`}
                            messageIndex={index}
                            message={message}
                            isLoading={isLoading}
                            handleRegenerate={handleRegenerate}
                          />
                        );
                      }
                    })}

                  {isLoading && <AssistantMessageLoading />}
                </>
              )}

              {showLogs && chatStarted && (
                <div className="w-full max-w-3xl mx-auto mt-4 mb-4">
                   <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-700">Supplementary Logs</h3>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => setShowLogs(false)}
                      >
                        Hide
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center mb-2">
                    <Switch
                      id="use-mock-logs"
                      checked={useMockLogs}
                      onCheckedChange={setUseMockLogs}
                    />
                    <Label
                      htmlFor="use-mock-logs"
                      className="text-xs text-gray-600 ml-2"
                    >
                      Use Mock Logs (for testing when server is unavailable)
                    </Label>
                  </div>
                  <LogStream className="h-[400px]" />
                </div>
              )}
            </div>
            <ScrollToBottom />
          </StickToBottom>
        </div>

        {chatStarted && (
          <div className="p-4 border-t bg-background z-10">
             <div className="max-w-3xl mx-auto">
              <form
                onSubmit={handleSubmit}
                className="relative"
              >
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && !e.metaKey) {
                      e.preventDefault();
                      const el = e.target as HTMLElement | undefined;
                      const form = el?.closest("form");
                      form?.requestSubmit();
                    }
                  }}
                  placeholder="Type your message..."
                  className="pr-16 resize-none min-h-12"
                  rows={1}
                />
                <div className="absolute bottom-2 right-2 flex items-center">
                  {stream.isLoading ? (
                      <Button key="stop" size="icon" className="rounded-full" onClick={() => stream.stop()}>
                          <LoaderCircle className="w-4 h-4 animate-spin" />
                          <span className="sr-only">Cancel</span>
                      </Button>
                  ) : (
                      <Button
                          type="submit"
                          size="icon"
                          className="rounded-full transition-all shadow-md"
                          disabled={isLoading || !input.trim()}
                      >
                          <ArrowUp className="w-4 h-4" />
                          <span className="sr-only">Send</span>
                      </Button>
                  )}
                </div>
              </form>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="render-tool-calls"
                      checked={hideToolCalls ?? false}
                      onCheckedChange={setHideToolCalls}
                    />
                    <Label
                      htmlFor="render-tool-calls"
                      className="text-xs text-gray-600"
                    >
                      Hide Tool Calls
                    </Label>
                  </div>

                  {!showLogs && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-gray-600 flex items-center gap-1"
                      onClick={() => setShowLogs(true)}
                    >
                      <TerminalSquare className="w-3 h-3" />
                      Show Logs
                    </Button>
                  )}
                </div>
                <div></div>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
