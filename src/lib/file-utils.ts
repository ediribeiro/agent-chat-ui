import { FileInfo } from "@/components/thread/file-upload";
import { FileAttachment } from "@/types";

/**
 * Converts a File object to a base64 string
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        // Remove the data URL prefix (e.g., "data:application/pdf;base64,")
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      } else {
        reject(new Error('Failed to convert file to base64'));
      }
    };
    reader.onerror = error => reject(error);
  });
};

/**
 * Creates a file message with metadata and base64 content
 */
export const createFileMessage = async (fileInfo: FileInfo): Promise<FileAttachment> => {
  const { file } = fileInfo;
  const base64Content = await fileToBase64(file);
  
  return {
    filename: file.name,
    content_type: file.type,
    size: file.size,
    data: base64Content,
  };
};

/**
 * Gets a friendly size string (KB, MB) from bytes
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) {
    return `${bytes} B`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  } else {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
};

/**
 * Check if a file is an image
 */
export const isImageFile = (file: File): boolean => {
  return file.type.startsWith('image/');
};

/**
 * Check if a file is a document (PDF, DOC, etc.)
 */
export const isDocumentFile = (file: File): boolean => {
  const documentTypes = [
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];
  return documentTypes.includes(file.type);
}; 