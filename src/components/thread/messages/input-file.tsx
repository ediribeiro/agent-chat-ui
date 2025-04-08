import { FileText } from "lucide-react";

interface InputFileProps {
  filename: string;
}

export default function InputFile({ filename }: InputFileProps) {
  return (
    <div className="my-2 flex items-center gap-2 text-sm text-muted-foreground border rounded-md p-2 bg-background max-w-2xl mx-auto">
      <FileText className="w-4 h-4 flex-shrink-0" />
      <span>
        Using document: <strong>{filename}</strong>
      </span>
    </div>
  );
} 