import { Message } from "@langchain/langgraph-sdk";
import { getContentString } from "../utils";
import { MarkdownText } from "../markdown-text";

export function HumanMessage({
  message,
}: {
  message: Message;
  isLoading: boolean;
}) {
  const contentString = getContentString(message.content);

  return (
    <div className="flex items-start ml-auto gap-2 group border-b pb-4 mb-4">
      <div className="flex-1 bg-primary text-primary-foreground rounded-xl p-3 break-words max-w-2xl">
        <MarkdownText>{contentString}</MarkdownText>
      </div>
    </div>
  );
}
