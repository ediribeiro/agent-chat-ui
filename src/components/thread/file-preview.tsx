import { useState } from "react";
import { FileAttachment } from "@/types";
import { FileText, Image, File, X, ExternalLink } from "lucide-react";
import { formatFileSize } from "@/lib/file-utils";
import { cn } from "@/lib/utils";

interface FilePreviewProps {
  file: FileAttachment;
  className?: string;
}

export function FilePreview({ file, className }: FilePreviewProps) {
  const [showPreview, setShowPreview] = useState(false);
  const isImage = file.content_type.startsWith("image/");
  
  // Create a data URL for preview
  const dataUrl = `data:${file.content_type};base64,${file.data}`;
  
  // Get file icon based on content type
  const getFileIcon = () => {
    if (isImage) {
      return <Image className="w-4 h-4" />;
    } else if (file.content_type.includes("pdf")) {
      return <FileText className="w-4 h-4" />;
    } else {
      return <File className="w-4 h-4" />;
    }
  };
  
  return (
    <div className={cn("relative", className)}>
      <div className="flex items-center gap-2 bg-muted/50 p-2 rounded-md text-xs">
        {getFileIcon()}
        <span className="max-w-[120px] truncate">{file.filename}</span>
        <span className="text-muted-foreground">
          {formatFileSize(file.size)}
        </span>
        
        {isImage && (
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="text-muted-foreground hover:text-foreground"
            title={showPreview ? "Hide preview" : "Show preview"}
          >
            {showPreview ? <X className="w-3 h-3" /> : <ExternalLink className="w-3 h-3" />}
          </button>
        )}
      </div>
      
      {isImage && showPreview && (
        <div className="mt-2 rounded-md overflow-hidden border border-muted">
          <img 
            src={dataUrl} 
            alt={file.filename} 
            className="max-w-xs max-h-60 object-contain" 
          />
        </div>
      )}
    </div>
  );
}