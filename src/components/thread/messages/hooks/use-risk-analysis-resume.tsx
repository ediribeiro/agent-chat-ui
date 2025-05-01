import { useStreamContext } from "@/providers/Stream";
import { useState } from "react";
import { toast } from "sonner";

/**
 * Custom hook for handling risk analysis resume workflow
 * Adapted from the agent-inbox pattern to work specifically with risk analysis
 */
export function useRiskAnalysisResume(
  threadId: string | null | undefined,
  assistantId: string | undefined,
  checkpoint: any
) {
  const stream = useStreamContext();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Submits risk data changes and resumes the workflow
   * @param updatedRows The updated risk data rows
   * @param nodeIdOverride Optional override for the target node
   * @returns Promise resolving to success status
   */
  const saveChanges = async (updatedRows: any[], nodeIdOverride?: string): Promise<boolean> => {
    if (!threadId || !assistantId || !checkpoint) {
      console.warn("Missing required parameters:", { threadId, assistantId, hasCheckpoint: !!checkpoint });
      setError("Missing required parameters to save changes");
      return false;
    }

    setIsSaving(true);
    setError(null);

    try {
      // Log what we're about to do
      console.log("Resuming workflow with LangGraph SDK submit:", {
        threadId,
        assistantId,
        checkpointExists: !!checkpoint,
        updatedRowsCount: updatedRows.length,
        targetNode: nodeIdOverride || checkpoint?.node_id || "default flow"
      });

      // Format the response in the format expected by LangGraph
      // This matches the format used by LangGraph's HumanResponse type
      const response = {
        type: "edit",
        args: { risk_data: updatedRows }
      };

      // Extract node_id from checkpoint if available
      const targetNodeId = nodeIdOverride || checkpoint?.node_id;

      // Create the command payload structure
      // This aligns with how the agent-inbox implementation works
      const commandPayload = {
        resume: [response], // Note: This is an array of responses
        ...(targetNodeId ? { goto: targetNodeId } : {})
      };

      // Use the stream.submit method from the SDK
      await stream.submit(
        {},
        {
          command: commandPayload,
          checkpoint: checkpoint,
          streamMode: ["messages", "values"],
          options: {
            forceSSE: true,
            buffering: false,
            pollIntervalMs: 0
          }
        }
      );

      // Success - clear any error state
      setError(null);
      toast.success("Changes submitted successfully");
      return true;
    } catch (err: any) {
      // Handle errors with appropriate user feedback
      console.error("Error submitting risk analysis changes:", err);
      const errorMessage = err?.message || "Failed to save changes";
      setError(errorMessage);
      toast.error("Error", {
        description: errorMessage,
        richColors: true,
        closeButton: true,
        duration: 5000
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    saveChanges,
    isSaving,
    error,
    setError
  };
}
