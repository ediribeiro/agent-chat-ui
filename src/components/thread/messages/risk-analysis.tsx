import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  convertImpacto,
  convertProbabilidade,
  getRiskColorClass,
  cn,
} from "@/lib/utils";
import { AlertTriangle } from "lucide-react";
import { useState, useEffect } from "react";
import { useStreamContext } from "@/providers/Stream";

// Matches the expected fields in the summary
interface RiskSummaryItem {
  Id: string;
  Risco: string;
  "Relacionado ao"?: string; // Changed to match JSON key with space (quoted)
  Probabilidade: number;
  "Impacto Geral": number; // Use quotes if key has spaces
  "Nível de Risco": string;
  // Include others if needed by UI, e.g., Impacto Financeiro, etc.
}

interface RiskAnalysisProps {
  analysis_data: RiskSummaryItem[];
  threadId?: string | null;
  assistantId?: string;
  checkpoint?: any;
}

export default function RiskAnalysis({ analysis_data, threadId, assistantId, checkpoint }: RiskAnalysisProps) {
  const [displayData, setDisplayData] = useState<RiskSummaryItem[]>([]);
  
  // Get access to the stream context from the SDK
  const stream = useStreamContext();
  
  // Debug logging
  console.log('RiskAnalysis props:', { analysis_data, threadId, assistantId, checkpoint });

  // Parse the risk data into a format suitable for display
  useEffect(() => {
    setDisplayData(analysis_data);
  }, [analysis_data]);

  // Monitor stream state for debugging
  useEffect(() => {
    const handleStreamUpdate = () => {
      console.log('🔍 DEBUG [RiskAnalysis] Stream state updated:', {
        isLoading: stream.isLoading,
        hasValues: !!stream.values,
        messageCount: stream.messages?.length || 0,
      });
    };
    
    // Set up simple interval to check stream state
    let intervalId: number;
    intervalId = window.setInterval(handleStreamUpdate, 2000);
    
    // Set up initial state logging
    handleStreamUpdate();
    
    return () => {
      window.clearInterval(intervalId);
    };
  }, [stream]);

  return (
    <div className="my-4 w-full max-w-3xl mx-auto">
      <h3 className="text-sm font-medium mb-2 text-foreground/90 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-orange-500" />
        Risk Analysis Summary
      </h3>
      
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">Id</TableHead>
              <TableHead>Risco</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead className="text-center">Probabilidade (P)</TableHead>
              <TableHead className="text-center">Impacto (I)</TableHead>
              <TableHead className="text-center">Nível de Risco</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayData.map((risk) => (
              <TableRow key={risk.Id} className={risk.Id.startsWith('TEMP_') ? 'bg-green-50' : ''}>
                <TableCell className="font-medium">{risk.Id.startsWith('TEMP_') ? 'NEW' : risk.Id}</TableCell>
                <TableCell className="text-xs whitespace-normal break-words">
                  {risk.Risco}
                </TableCell>
                <TableCell className="text-xs whitespace-normal break-words text-center">
                  {risk['Relacionado ao'] ?? "N/A"}
                </TableCell>
                <TableCell className="text-center text-xs">
                  {convertProbabilidade(risk.Probabilidade)}
                </TableCell>
                <TableCell className="text-center text-xs">
                  {convertImpacto(risk["Impacto Geral"])}
                </TableCell>
                <TableCell className="text-center text-xs font-medium">
                  <span className={cn("px-2 py-0.5 rounded-full", getRiskColorClass(risk["Nível de Risco"]))}>
                    {risk["Nível de Risco"]}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}