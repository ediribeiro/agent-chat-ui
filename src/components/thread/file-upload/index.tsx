import React, { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Paperclip, X, FileText } from "lucide-react";

export type FileInfo = {
  id: string;
  file: File;
  previewUrl?: string;
};

interface FileUploadProps {
  onFilesSelected: (files: FileInfo[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
  className?: string;
}

export function FileUpload({
  onFilesSelected,
  maxFiles = 5,
  maxSizeMB = 10,
  className,
}: FileUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<FileInfo[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const newFiles = Array.from(e.target.files).map((file) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
    }));
    
    const updatedFiles = [...selectedFiles, ...newFiles].slice(0, maxFiles);
    setSelectedFiles(updatedFiles);
    onFilesSelected(updatedFiles);
    
    // Reset input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) return;
    
    const newFiles = Array.from(e.dataTransfer.files)
      .filter(file => file.size <= maxSizeBytes)
      .map((file) => ({
        id: crypto.randomUUID(),
        file,
        previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
      }));
    
    const updatedFiles = [...selectedFiles, ...newFiles].slice(0, maxFiles);
    setSelectedFiles(updatedFiles);
    onFilesSelected(updatedFiles);
  };

  const handleRemoveFile = (id: string) => {
    const updatedFiles = selectedFiles.filter((file) => file.id !== id);
    setSelectedFiles(updatedFiles);
    onFilesSelected(updatedFiles);
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div
        className={cn(
          "border-2 border-dashed rounded-md p-4 transition-colors",
          isDragging ? "border-primary bg-primary/5" : "border-gray-200 hover:border-gray-300",
          selectedFiles.length > 0 && "pb-2"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center justify-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            multiple
            className="hidden"
            accept="application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={triggerFileInput}
            disabled={selectedFiles.length >= maxFiles}
          >
            <Paperclip className="w-4 h-4" />
            Attach Files
          </Button>
          <p className="text-xs text-muted-foreground">
            {selectedFiles.length > 0
              ? `${selectedFiles.length}/${maxFiles} files selected`
              : `Drag & drop or click to upload (max ${maxFiles} files, ${maxSizeMB}MB each)`}
          </p>
        </div>

        {selectedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {selectedFiles.map((fileInfo) => (
              <div
                key={fileInfo.id}
                className="flex items-center gap-2 bg-muted p-2 rounded-md text-xs"
              >
                {fileInfo.previewUrl ? (
                  <img
                    src={fileInfo.previewUrl}
                    alt={fileInfo.file.name}
                    className="w-6 h-6 object-cover rounded"
                  />
                ) : (
                  <FileText className="w-4 h-4" />
                )}
                <span className="max-w-[120px] truncate">{fileInfo.file.name}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveFile(fileInfo.id)}
                  className="text-gray-500 hover:text-gray-700"
                  aria-label="Remove file"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 