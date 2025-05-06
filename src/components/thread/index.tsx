import { v4 as uuidv4 } from "uuid";
import { useState, useEffect, useMemo, useRef } from "react";
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
import {
  ArrowDown,
  LoaderCircle,
  PanelRightOpen,
  PanelRightClose,
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
import InformationExtraction from "./messages/InformationExtraction";
import StepWizard from "@/components/StepWizard";
import ReportRefinementTable from "./messages/ReportRefinementTable";
import PreventiveContingencyActions from "./messages/PreventiveContingencyActions";
import RiskSummaryPanel from "./messages/RiskSummaryPanel";
import RiskMatrixView from "./messages/RiskMatrixView";
import HazardIdentification from "./messages/HazardIdentification";
import DocumentIngestion from "./messages/DocumentIngestion";
import RiskAnalysis from "./messages/RiskAnalysis";
import ProtectionMeasuresTable from "./messages/ProtectionMeasuresTable";
import BowTieView from "./messages/BowTieView";

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

  // Hide message form for this agent (default: true for others, false for this agent)
  const shouldShowMessageForm = false; // Set to true for other assistants as needed

  const stream = useStreamContext();
  const streamValues = stream.values;
  const streamedMessages = stream.messages; // Source stream for updates
  const isLoading = stream.isLoading;





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

  // Step detection and data extraction from streamValues
  let completedSteps = 0;
  // Step 1: Information Extraction (Briefing, Declarations, Context)
  const hasInfoExtraction = !!(streamValues.briefing || streamValues.declarations || streamValues.context_analysis);
  if (hasInfoExtraction) completedSteps = 2;
  // Step 2: Initial Report (risk_data)
  const hasInitialReport = Array.isArray(streamValues.risk_data) && streamValues.risk_data.length > 0;
  if (hasInitialReport) completedSteps = 3;
  // Step 3: Report Refinement (reuses risk_data)
  const hasReportRefinement = hasInitialReport; // For now, same as initial report
  if (hasReportRefinement) completedSteps = 4;
  // Step 4: Cause Analysis (risk_data with Causas)
  const hasCauseAnalysis = hasInitialReport && streamValues.risk_data.some((r:any) => r.Causas && r.Causas.length > 0);
  if (hasCauseAnalysis) completedSteps = 5;
  // Step 5: Consequence Analysis (risk_data with Consequencias)
  const hasConsequenceAnalysis = hasInitialReport && streamValues.risk_data.some((r:any) => r.Consequencias && r.Consequencias.length > 0);
  if (hasConsequenceAnalysis) completedSteps = 6;
  // Step 6: Risk Evaluation (risk_data with all required keys)
  const hasRiskEvaluation = hasInitialReport && streamValues.risk_data.some((r:any) => r["Nível de Risco"]);
  let riskEvaluationData: any[] = [];
  if (hasRiskEvaluation) {
    riskEvaluationData = streamValues.risk_data.filter((r:any) => r["Nível de Risco"]);
    completedSteps = 7;
  }
  // Step 7: Risk Matrix (visual)
  const hasRiskMatrix = hasRiskEvaluation && riskEvaluationData.length > 0;
  if (hasRiskMatrix) completedSteps = 7;
  // Step 8: Hazard Identification (risk_data with all required keys)
  const hasHazardIdentification = hasRiskMatrix && riskEvaluationData.length > 0;
  if (hasHazardIdentification) completedSteps = 8;
  // Step 9: Preventive Contingency Actions (risk_data with all required keys)
  const hasPreventiveContingencyActions = hasHazardIdentification && riskEvaluationData.length > 0;
  if (hasPreventiveContingencyActions) completedSteps = 9;

  // Step navigation state (persisted in localStorage)
  const [stepIndex, setStepIndex] = useState(() => {
    const stored = localStorage.getItem("wizardStepIndex");
    return stored ? parseInt(stored, 10) : (completedSteps > 0 ? completedSteps : 0);
  });
  useEffect(() => {
    localStorage.setItem("wizardStepIndex", String(stepIndex));
  }, [stepIndex]);
  useEffect(() => {
    // On new data, auto-advance to next step if in production mode and step completed
    if (stepIndex < completedSteps) setStepIndex(completedSteps);
  }, [completedSteps]);

  // Prepare Information Extraction cards data
  const infoExtractionCards = [
    { label: "Briefing", content: streamValues.briefing },
    { label: "Declarations", content: streamValues.declarations },
    { label: "Context", content: streamValues.context_analysis }
  ].filter(card => card.content);

  // Prepare Report Refinement table data (same as risk_data for now)
  const reportRefinementData = hasReportRefinement ? streamValues.risk_data : [];

  // Define variables I accidentally removed
  const chatStarted = !!threadId || displayMessages.length > 0 || (streamValues?.ui_elements && streamValues.ui_elements.length > 0);

  const mainContentMarginLeft = chatHistoryOpen ? (isLargeScreen ? 300 : 0) : 0;
  const mainContentWidth = chatHistoryOpen
    ? isLargeScreen
      ? "calc(100% - 300px)"
      : "100%"
    : "100%";

  const handleFileUploadStart = () => {
    setStepIndex(1); // Move to Document Ingestion
  };

  // --- Prepare datasets for HazardIdentification and PreventiveContingencyActions ---
  const hazardIdentificationData = hasRiskMatrix && riskEvaluationData.length > 0
    ? riskEvaluationData.filter((r: any) => r["Análise de Apetite e Tolerância"]) : [];
  const preventiveContingencyData = hasHazardIdentification && riskEvaluationData.length > 0
    ? riskEvaluationData.filter((r: any) => r["Ações de Contingências"] || r["Ações Preventivas"]) : [];

  // --- Add a key to force StepWizard reset on new run ---
  const [wizardResetKey, setWizardResetKey] = useState(0);

  // --- Update New Run button handler to also reset StepWizard ---
  const handleNewRun = () => {
    setThreadId(null);
    setDisplayMessages([]);
    setStepIndex(0);
    setWizardResetKey(prev => prev + 1); // Force StepWizard reset
    setWorkflowCompleted(false); // Reset completion status
    localStorage.setItem("wizardStepIndex", "0");
    localStorage.setItem("workflowCompleted", "false");
  };

  // --- Auto-advance to step 10 when run is done ---
  useEffect(() => {
    // When workflow finishes with data, auto-advance to summary and allow navigation
    // Only auto-advance if the step hasn't been manually changed
    const autoAdvanceCondition = 
      !stream.isLoading && 
      threadId && 
      stepIndex < 10 && 
      streamValues && 
      streamValues.risk_data && 
      Array.isArray(streamValues.risk_data) && 
      streamValues.risk_data.length > 0;
    
    if (autoAdvanceCondition) {
      console.log('Auto-advancing to step 10');
      setStepIndex(10);
      // Update localStorage to match
      localStorage.setItem("wizardStepIndex", "10");
    }
  }, [stream.isLoading]); // Only trigger on loading state changes, not stepIndex changes

  // Track when a workflow completes - make sure it persists
  const [workflowCompleted, setWorkflowCompleted] = useState(() => {
    // Initialize from localStorage if available
    const stored = localStorage.getItem("workflowCompleted");
    return stored === "true";
  });
  
  // When a workflow finishes with valid data, mark it as completed
  useEffect(() => {
    const isComplete = !!(
      threadId && 
      streamValues && 
      streamValues.risk_data && 
      Array.isArray(streamValues.risk_data) && 
      streamValues.risk_data.length > 0 && 
      !stream.isLoading
    );
      
    if (isComplete !== workflowCompleted) {
      console.log('Setting workflow completed:', isComplete);
      setWorkflowCompleted(isComplete);
      localStorage.setItem("workflowCompleted", String(isComplete));
    }
  }, [threadId, streamValues, stream.isLoading, workflowCompleted]);

  // Custom step change handler to prevent unwanted resets
  const handleStepChange = (newStep: number) => {
    console.log('Manual step change to:', newStep);
    setStepIndex(newStep);
    localStorage.setItem("wizardStepIndex", newStep.toString());
  };

  // --- Prepare combined data for BowTie view (merged steps 5-6) ---
  const bowTieData = useMemo(() => {
    // Combine cause and consequence data
    if (Array.isArray(streamValues?.risk_data)) {
      return streamValues.risk_data
        .filter((risk: any) => 
          risk && (Array.isArray(risk.Causas) || Array.isArray(risk.Consequencias))
        );
    }
    return [];
  }, [streamValues?.risk_data]);

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
            "flex items-center justify-between p-2 border-b bg-background z-10",
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
                className="flex gap-2 items-center cursor-pointer bg-blue-600 text-white px-2 py-1 rounded-md"
                onClick={handleNewRun}
              >
                New Run
              </button>
            )}
          </div>

          {/* Interrupt Workflow Button */}
          <div className="flex items-center gap-2 cursor-pointer">
            <Button
              variant="destructive"
              size="sm"
              disabled={!stream.isLoading}
              onClick={() => stream.stop()}
            >
              {stream.isLoading && (
                <LoaderCircle className="w-4 h-4 mr-1 animate-spin" />
              )}
              Interrupt Workflow
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto relative">
          <StickToBottom>
            <div className={`p-4 space-y-0 ${!stream.isLoading && !threadId && displayMessages.length === 0 && (!streamValues?.ui_elements || streamValues.ui_elements.length === 0) ? 'mt-15' : 'mt-0'}`}>
              {/* Step Wizard always at top */}
              <StepWizard
                currentStep={stepIndex}
                completedSteps={workflowCompleted ? 10 : completedSteps}
                onStepChange={handleStepChange} // Use the custom handler
                resetKey={wizardResetKey}
              />

              {/* Render current step content */}
              {stepIndex === 0 && (
                <FileUpload onUploadStart={handleFileUploadStart} />
              )}
              {stepIndex === 1 && (
                <DocumentIngestion inputFile={streamValues?.input_file} />
              )}
              {stepIndex === 2 && infoExtractionCards.length > 0 && (
                <InformationExtraction cards={infoExtractionCards} />
              )}
              {stepIndex === 3 && reportRefinementData.length > 0 && (
                <ReportRefinementTable data={reportRefinementData} />
              )}
              {stepIndex === 4 && bowTieData.length > 0 && (
                <BowTieView data={bowTieData} />
              )}
              {/* Fix step 7 to remove duplicate RiskEvaluation */}
              {stepIndex === 5 && riskEvaluationData.length > 0 && (
                <RiskMatrixView data={riskEvaluationData} />
              )}
              {stepIndex === 6 && hazardIdentificationData.length > 0 && (
                <HazardIdentification risk_data={hazardIdentificationData} />
              )}
              {stepIndex === 7 && preventiveContingencyData.length > 0 && (
                <PreventiveContingencyActions risk_data={preventiveContingencyData} />
              )}
              {stepIndex === 8 && (
                <>
                  <RiskSummaryPanel values={streamValues} threadId={streamValues?.thread_id || threadId || undefined} />
                  <RiskAnalysis values={streamValues} />
                  <ProtectionMeasuresTable values={streamValues} />
                </>
              )}

              {/* Existing thread/chat UI below (show rest of messages, etc.) */}
              {!chatStarted ? (
                <div>{/* Empty div to avoid duplicate FileUpload - it's already shown above when stepIndex === 0 */}</div>
              ) : (
                <>
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

        {chatStarted && shouldShowMessageForm && (
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
