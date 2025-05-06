import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import RiskAnalysis from "./RiskAnalysis";
import ProtectionMeasuresTable from "./ProtectionMeasuresTable";
import { FILE_UPLOAD_URL } from "@/lib/config";
import { useState } from "react";

interface RiskSummaryPanelProps {
  values: any;
  threadId?: string;
}

export default function RiskSummaryPanel({ values, threadId }: RiskSummaryPanelProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  // Download handler for .docx (delegates to ProtectionMeasuresTable logic)
  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      const filename = threadId ? `risk_analysis_${threadId}.docx` : "risk_analysis.docx";
      const downloadUrl = `${FILE_UPLOAD_URL}/api/download?thread_id=${threadId || ''}`;
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const blob = await response.blob();
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error("Download failed:", error);
      alert("Failed to download the report. Ensure the backend download endpoint is running.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto my-6">
      <div className="flex flex-row items-center justify-between mb-4 px-2">
        <h2 className="text-blue-700 text-lg font-semibold">Resumo de Riscos e Medidas</h2>
        <Button variant="outline" size="sm" onClick={handleDownload} disabled={isDownloading} className="flex gap-2 items-center">
          <Download className="w-4 h-4" /> {isDownloading ? "Downloading..." : "Download DOCX"}
        </Button>
      </div>
      <RiskAnalysis values={values} />
      <ProtectionMeasuresTable values={values} />
    </div>
  );
}
