import { v4 as uuidv4 } from "uuid";
import { ReactNode, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useStreamContext } from "@/providers/Stream";
import { useState, FormEvent } from "react";
import { Button } from "../ui/button";
import { Checkpoint, Message } from "@langchain/langgraph-sdk";
import { AssistantMessage, AssistantMessageLoading } from "./messages/ai";
import { HumanMessage } from "./messages/human";
import {
  DO_NOT_RENDER_ID_PREFIX,
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
  Paperclip,
  ArrowRight,
} from "lucide-react";
import { useQueryState, parseAsBoolean } from "nuqs";
import { StickToBottom, useStickToBottomContext } from "use-stick-to-bottom";
import ThreadHistory from "./history";
import { toast } from "sonner";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { FileUpload, FileInfo } from "./file-upload";
import { createFileMessage } from "@/lib/file-utils";
import { AppMessage, FileAttachment } from "@/types";

function StickyToBottomContent(props: {
  content: ReactNode;
  footer?: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  const context = useStickToBottomContext();
  return (
    <div
      ref={context.scrollRef}
      style={{ width: "100%", height: "100%" }}
      className={props.className}
    >
      <div ref={context.contentRef} className={props.contentClassName}>
        {props.content}
      </div>

      {props.footer}
    </div>
  );
}

function ScrollToBottom(props: { className?: string }) {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext();

  if (isAtBottom) return null;
  return (
    <Button
      variant="outline"
      className={props.className}
      onClick={() => scrollToBottom()}
    >
      <ArrowDown className="w-4 h-4" />
      <span>Scroll to bottom</span>
    </Button>
  );
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
  const [input, setInput] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<FileInfo[]>([]);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [firstTokenReceived, setFirstTokenReceived] = useState(false);
  const isLargeScreen = useMediaQuery("(min-width: 1024px)");

  const stream = useStreamContext();
  const messages = stream.messages;
  const isLoading = stream.isLoading;

  const lastError = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!stream.error) {
      lastError.current = undefined;
      return;
    }
    try {
      const message = (stream.error as any).message;
      if (!message || lastError.current === message) {
        // Message has already been logged. do not modify ref, return early.
        return;
      }

      // Message is defined, and it has not been logged yet. Save it, and send the error
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

  // TODO: this should be part of the useStream hook
  const prevMessageLength = useRef(0);
  useEffect(() => {
    if (
      messages.length !== prevMessageLength.current &&
      messages?.length &&
      messages[messages.length - 1].type === "ai"
    ) {
      setFirstTokenReceived(true);
    }

    prevMessageLength.current = messages.length;
  }, [messages]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && selectedFiles.length === 0) || isLoading) return;
    setFirstTokenReceived(false);

    try {
      const newHumanMessage: AppMessage = {
        id: uuidv4(),
        type: "human",
        content: input,
      };

      // If there are files attached, add file data to the message
      if (selectedFiles.length > 0) {
        // Create file attachments for message
        const fileAttachments: FileAttachment[] = await Promise.all(
          selectedFiles.map(async (fileInfo) => await createFileMessage(fileInfo))
        );

        // Add file attachments to message
        newHumanMessage.files = fileAttachments;
      }

      const toolMessages = ensureToolCallsHaveResponses(stream.messages);
      stream.submit(
        { messages: [...toolMessages, newHumanMessage] },
        {
          streamMode: ["values"],
          optimisticValues: (prev) => ({
            ...prev,
            messages: [
              ...(prev.messages ?? []),
              ...toolMessages,
              newHumanMessage,
            ],
          }),
        }
      );

      // Reset files and input
      setSelectedFiles([]);
      setShowFileUpload(false);
      setInput("");
    } catch (error) {
      console.error("Error sending message with files:", error);
      toast.error("Failed to send message with files");
    }
  };

  const handleRegenerate = (
    parentCheckpoint: Checkpoint | null | undefined,
  ) => {
    // Do this so the loading state is correct
    prevMessageLength.current = prevMessageLength.current - 1;
    setFirstTokenReceived(false);
    stream.submit(undefined, {
      checkpoint: parentCheckpoint,
      streamMode: ["values"],
    });
  };

  // Handle file selection
  const handleFilesSelected = (files: FileInfo[]) => {
    setSelectedFiles(files);
  };

  const toggleFileUpload = () => {
    setShowFileUpload((prev) => !prev);
  };

  const chatStarted = !!threadId || !!messages.length;

  return (
    <div className="flex w-full h-screen overflow-hidden">
      <div className="relative lg:flex hidden">
        <motion.div
          className="absolute h-full border-r bg-white overflow-hidden z-20"
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
        className={cn(
          "flex-1 flex flex-col min-w-0 overflow-hidden relative",
          !chatStarted && "grid-rows-[1fr]",
        )}
        layout={isLargeScreen}
        animate={{
          marginLeft: chatHistoryOpen ? (isLargeScreen ? 300 : 0) : 0,
          width: chatHistoryOpen
            ? isLargeScreen
              ? "calc(100% - 300px)"
              : "100%"
            : "100%",
        }}
        transition={
          isLargeScreen
            ? { type: "spring", stiffness: 300, damping: 30 }
            : { duration: 0 }
        }
      >
        {!chatStarted && (
          <div className="absolute top-0 left-0 w-full flex items-center justify-between gap-3 p-2 pl-4 z-10">
            {(!chatHistoryOpen || !isLargeScreen) && (
              <Button
                className="hover:bg-gray-100"
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
          </div>
        )}
        {chatStarted && (
          <div className="flex items-center justify-between gap-3 p-2 pl-4 z-10 relative">
            <div className="flex items-center justify-start gap-2 relative">
              <div className="absolute left-0 z-10">
                {(!chatHistoryOpen || !isLargeScreen) && (
                  <Button
                    className="hover:bg-gray-100"
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
              </div>
              <motion.button
                className="flex gap-2 items-center cursor-pointer"
                onClick={() => setThreadId(null)}
                animate={{
                  marginLeft: !chatHistoryOpen ? 48 : 0,
                }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 30,
                }}
              >
                <LangGraphLogoSVG width={32} height={32} />
                <span className="text-xl font-semibold tracking-tight">
                  Agent Chat
                </span>
              </motion.button>
            </div>

            <TooltipIconButton
              size="lg"
              className="p-4"
              tooltip="New thread"
              variant="ghost"
              onClick={() => setThreadId(null)}
            >
              <SquarePen className="size-5" />
            </TooltipIconButton>

            <div className="absolute inset-x-0 top-full h-5 bg-gradient-to-b from-background to-background/0" />
          </div>
        )}

        <div className="flex-1 overflow-y-auto pb-5">
          <StickToBottom>
            <StickyToBottomContent
              content={
                <>
                  {messages
                    .filter((m) => !m.id?.startsWith(DO_NOT_RENDER_ID_PREFIX))
                    .map((message, index) =>
                      message.type === "human" ? (
                        <HumanMessage
                          key={message.id || `${message.type}-${index}`}
                          message={message}
                          isLoading={isLoading}
                        />
                      ) : (
                        <AssistantMessage
                          key={message.id || `${message.type}-${index}`}
                          message={message}
                          isLoading={isLoading}
                          handleRegenerate={handleRegenerate}
                        />
                      ),
                    )}
                  {isLoading && !firstTokenReceived && (
                    <AssistantMessageLoading />
                  )}
                </>
              }
              contentClassName="py-0 pb-2"
              footer={
                <>
                  <ScrollToBottom className="sticky bottom-20 left-1/2 -translate-x-1/2 z-10" />
                  
                  <form
                    onSubmit={handleSubmit}
                    className="flex flex-col gap-3 p-4 sticky bottom-0 border-t bg-background max-w-3xl mx-auto w-full"
                  >
                    <div className="flex flex-col gap-3 w-full">
                      {showFileUpload && (
                        <FileUpload
                          onFilesSelected={handleFilesSelected}
                          className="mb-2"
                        />
                      )}
                      <div className="flex gap-2 items-end">
                        <div className="flex-1 relative">
                          <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleSubmit(e);
                              }
                            }}
                            placeholder="Send a message..."
                            className="w-full min-h-[40px] max-h-[320px] resize-none px-3 py-2 rounded-md border border-input bg-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            rows={Math.min(Math.max(1, input.split("\n").length), 7)}
                          />
                          <div className="absolute right-2 bottom-2">
                            <button
                              type="button"
                              onClick={toggleFileUpload}
                              className={cn(
                                "p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors",
                                selectedFiles.length > 0 && "text-primary"
                              )}
                              title="Attach files"
                            >
                              <Paperclip className="size-4" />
                            </button>
                          </div>
                        </div>
                        <Button
                          type="submit"
                          disabled={(!input.trim() && selectedFiles.length === 0) || isLoading}
                          size="icon"
                          className="shrink-0"
                        >
                          {isLoading ? (
                            <LoaderCircle className="animate-spin" />
                          ) : (
                            <ArrowRight />
                          )}
                          <span className="sr-only">Send</span>
                        </Button>
                      </div>
                      {selectedFiles.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          {selectedFiles.length} file(s) attached
                        </div>
                      )}
                      
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="render-tool-calls"
                          checked={hideToolCalls ?? false}
                          onCheckedChange={setHideToolCalls}
                        />
                        <Label
                          htmlFor="render-tool-calls"
                          className="text-sm text-gray-600"
                        >
                          Hide Tool Calls
                        </Label>
                      </div>
                    </div>
                  </form>
                </>
              }
            />
          </StickToBottom>
        </div>
      </motion.div>
    </div>
  );
}
