import { parsePartialJson } from "@langchain/core/output_parsers";
import { useStreamContext } from "@/providers/Stream";
import { AIMessage, Checkpoint, Message } from "@langchain/langgraph-sdk";
import { getContentString } from "../utils";
import { BranchSwitcher, CommandBar } from "./shared";
import { MarkdownText } from "../markdown-text";
import { cn } from "@/lib/utils";
import { ToolCalls, ToolResult } from "./tool-calls";
import { MessageContentComplex } from "@langchain/core/messages";
import { useState, useRef, useEffect } from "react";
import { isAgentInboxInterruptSchema } from "@/lib/agent-inbox-interrupt";
import { ThreadView } from "../agent-inbox";
import { useQueryState, parseAsBoolean } from "nuqs";
import { GenericInterruptView } from "./generic-interrupt";

// Import Accordion components
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// Helper function to generate preview text
function getPreviewText(message: Message, anthropicStreamedToolCalls?: AIMessage['tool_calls']): string {
    const contentString = getContentString(message.content);
    const maxLen = 80;

    // Preview for Tool Result messages
    if (message.type === "tool") {
        const toolOutputPreview = contentString.substring(0, maxLen);
        // Tool messages might have a `name` field indicating which call they are result for.
        const toolName = (message as any).name || 'Result'; // Attempt to get name
        const preview = toolOutputPreview.length > 0 ? toolOutputPreview : '(No textual output)';
        return `Tool Result [${toolName}]: ${preview}${contentString.length > maxLen ? '...' : ''}`;
    }

    // Preview for AIMessages with text content
    if (contentString.length > 0) {
        return contentString.substring(0, maxLen) + (contentString.length > maxLen ? '...' : '');
    }

    // Check standard tool calls (only if contentString is empty)
    const stdToolCalls = (message as AIMessage).tool_calls;
    if (stdToolCalls && stdToolCalls.length > 0) {
        const firstName = stdToolCalls[0].name;
        const count = stdToolCalls.length;
        return `Tool Call: ${firstName}${count > 1 ? ` (+${count - 1} more)` : ''}`;
    }

    // Check Anthropic style streamed tool calls (only if contentString is empty)
    if (anthropicStreamedToolCalls && anthropicStreamedToolCalls.length > 0) {
        const firstName = anthropicStreamedToolCalls[0].name;
        const count = anthropicStreamedToolCalls.length;
        return `Tool Call: ${firstName}${count > 1 ? ` (+${count - 1} more)` : ''}`;
    }

    // Fallback for AI message with no text/tools
    if (message.type === "ai") {
         return "Agent Processing...";
    }

    return "Step Details"; // Generic fallback
}

function parseAnthropicStreamedToolCalls(
  content: MessageContentComplex[],
): AIMessage["tool_calls"] {
  const toolCallContents = content.filter((c) => c.type === "tool_use" && c.id);

  return toolCallContents.map((tc) => {
    const toolCall = tc as Record<string, any>;
    let json: Record<string, any> = {};
    if (toolCall?.input) {
      try {
        json = parsePartialJson(toolCall.input) ?? {};
      } catch {
        // Pass
      }
    }
    return {
      name: toolCall.name ?? "",
      id: toolCall.id ?? "",
      args: json,
      type: "tool_call",
    };
  });
}

export function AssistantMessage({
  message,
  isLoading: isOverallLoading,
  handleRegenerate,
}: {
  message: Message;
  isLoading: boolean;
  handleRegenerate: (parentCheckpoint: Checkpoint | null | undefined) => void;
}) {
  const contentString = getContentString(message.content);
  const [hideToolCalls] = useQueryState(
    "hideToolCalls",
    parseAsBoolean.withDefault(false),
  );

  // State for controlled accordion
  const [isOpen, setIsOpen] = useState(false);
  // Ref for the streaming box
  const streamingBoxRef = useRef<HTMLDivElement>(null);

  const thread = useStreamContext();
  const isLastMessage =
    thread.messages[thread.messages.length - 1]?.id === message.id;
  const meta = thread.getMessagesMetadata(message);
  const interrupt = thread.interrupt;
  const parentCheckpoint = meta?.firstSeenState?.parent_checkpoint;
  const anthropicStreamedToolCalls = Array.isArray(message.content)
    ? parseAnthropicStreamedToolCalls(message.content)
    : undefined;

  const hasToolCalls =
    "tool_calls" in message &&
    message.tool_calls &&
    message.tool_calls.length > 0;
  const toolCallsHaveContents =
    hasToolCalls &&
    message.tool_calls?.some(
      (tc) => tc.args && Object.keys(tc.args).length > 0,
    );
  const hasAnthropicToolCalls = !!anthropicStreamedToolCalls?.length;
  const isToolResult = message.type === "tool";

  // Determine if this specific message *might* still be streaming
  // Heuristic: it's the last message AND the overall stream is loading
  const isPotentiallyStreaming = isLastMessage && isOverallLoading;

  // Generate preview text
  const previewText = getPreviewText(message, anthropicStreamedToolCalls);

  // Auto-scroll the streaming box
  useEffect(() => {
    if (streamingBoxRef.current) {
      streamingBoxRef.current.scrollTop = streamingBoxRef.current.scrollHeight;
    }
  }, [contentString]); // Scroll when content changes

  if (isToolResult && hideToolCalls) {
    return null; // Hide tool results completely if toggled
  }

  // Determine if there's *anything* to put inside the accordion content
  const hasRenderableContentInside =
    contentString.length > 0 ||
    (hasToolCalls && !hideToolCalls) ||
    (hasAnthropicToolCalls && !hideToolCalls) ||
    isToolResult;

  // Determine if we should show the live streaming box
  const showStreamingBox =
    !isOpen && // Only show if accordion is collapsed
    isPotentiallyStreaming && // Only for the last, currently loading message
    contentString.length > 0; // Only if there is text content to stream

  return (
    <div className="flex flex-col items-start mr-auto gap-2 group w-full border-b pb-4 mb-4">
      <Accordion
        type="single"
        collapsible
        className="w-full max-w-2xl mx-auto"
        value={isOpen ? message.id : undefined}
        onValueChange={(value) => setIsOpen(!!value)}
      >
          <AccordionItem value={message.id || 'message-item'} className="border-b-0">
            <AccordionTrigger className="py-2 hover:no-underline font-medium text-sm text-left">
              <span className="pr-2">{previewText}</span>
            </AccordionTrigger>

            {showStreamingBox && (
                <div
                    ref={streamingBoxRef}
                    className="text-xs text-muted-foreground p-3 border rounded-md mt-1 max-h-28 overflow-y-auto bg-background"
                >
                    <MarkdownText>{contentString}</MarkdownText>
                </div>
            )}

            <AccordionContent className="pb-0 pt-2">
              {hasRenderableContentInside ? (
                 <div className="flex flex-col gap-2 w-full">
                    {isToolResult ? (
                    <ToolResult message={message} />
                    ) : (
                    <>
                        {contentString.length > 0 && (
                        <div className="py-1 w-full">
                            <MarkdownText>{contentString}</MarkdownText>
                        </div>
                        )}

                        {!hideToolCalls && (
                        <div className="w-full">
                            {(hasToolCalls && toolCallsHaveContents && (
                            <ToolCalls toolCalls={message.tool_calls} />
                            )) ||
                            (hasAnthropicToolCalls && (
                                <ToolCalls toolCalls={anthropicStreamedToolCalls} />
                            )) ||
                            (hasToolCalls && <ToolCalls toolCalls={message.tool_calls} />)}
                        </div>
                        )}
                    </>
                    )}

                    {(contentString.length > 0 || hasToolCalls || hasAnthropicToolCalls) && !isToolResult && (
                        <div
                            className={cn(
                            "flex gap-2 items-center mr-auto transition-opacity w-full mt-2",
                            "opacity-0 group-focus-within:opacity-100 group-hover:opacity-100",
                            )}
                        >
                            <BranchSwitcher
                            branch={meta?.branch}
                            branchOptions={meta?.branchOptions}
                            onSelect={(branch) => thread.setBranch(branch)}
                            isLoading={isOverallLoading}
                            />
                            <CommandBar
                            content={contentString || previewText}
                            isLoading={isOverallLoading}
                            isAiMessage={message.type === 'ai'}
                            handleRegenerate={() => handleRegenerate(parentCheckpoint)}
                            />
                        </div>
                    )}
                 </div>
              ) : (
                  <div className="text-xs text-muted-foreground italic p-2">No textual content for this step.</div>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>

      {isLastMessage && isAgentInboxInterruptSchema(interrupt?.value) && (
        <div className="max-w-2xl mx-auto w-full mt-2">
          <ThreadView interrupt={interrupt.value} />
        </div>
      )}
      {(isLastMessage && interrupt?.value && !isAgentInboxInterruptSchema(interrupt.value)) ? (
         <div className="max-w-2xl mx-auto w-full mt-2">
             <GenericInterruptView interrupt={interrupt.value} />
         </div>
      ) : null}
    </div>
  );
}

export function AssistantMessageLoading() {
  return (
    <div className="flex items-start mr-auto gap-2">
      <div className="flex items-center gap-1 rounded-2xl bg-muted px-4 py-2 h-8">
        <div className="w-1.5 h-1.5 rounded-full bg-foreground/50 animate-[pulse_1.5s_ease-in-out_infinite]"></div>
        <div className="w-1.5 h-1.5 rounded-full bg-foreground/50 animate-[pulse_1.5s_ease-in-out_0.5s_infinite]"></div>
        <div className="w-1.5 h-1.5 rounded-full bg-foreground/50 animate-[pulse_1.5s_ease-in-out_1s_infinite]"></div>
      </div>
    </div>
  );
}
