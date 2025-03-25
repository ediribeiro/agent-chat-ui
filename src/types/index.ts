import { Message as LangChainMessage } from "@langchain/langgraph-sdk";

/**
 * File attachment structure for messages
 */
export interface FileAttachment {
  /** The original filename */
  filename: string;
  /** MIME type of the file */
  content_type: string;
  /** Size of the file in bytes */
  size: number;
  /** Base64-encoded file content */
  data: string;
}

/**
 * Extended Message type that includes file attachments
 */
export type FileMessage = {
  files?: FileAttachment[];
};

/**
 * Combined message type for the application
 */
export type AppMessage = LangChainMessage & FileMessage; 