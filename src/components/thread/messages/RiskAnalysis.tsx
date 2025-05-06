import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getRiskColorClass,
  cn,
} from "@/lib/utils";
import { useState, useEffect, useMemo } from "react";
import { useStreamContext } from "@/providers/Stream";
import { ArrowUp, ArrowDown, ArrowDownUp } from "lucide-react";

// Matches the expected fields in the summary
interface RiskSummaryItem {
  Id: string;
  Risco: string;
  "Relacionado ao"?: string;
  Probabilidade: number;
  "Impacto Geral": number;
  "Nível de Risco": string;
  Fonte?: string;
  // Categoria is a virtual field for sorting (maps to Relacionado ao)
}

interface RiskAnalysisProps {
  values: any;
  threadId?: string | null;
  assistantId?: string;
  checkpoint?: any;
}

export default function RiskAnalysis({ values, threadId, assistantId, checkpoint }: RiskAnalysisProps) {
  // Extract risk_data array from values
  const riskData: RiskSummaryItem[] = Array.isArray(values?.risk_data) ? values.risk_data : [];
  const [displayData, setDisplayData] = useState<RiskSummaryItem[]>([]);
  
  // Get access to the stream context from the SDK
  const stream = useStreamContext();
  
  // Debug logging
  console.log('RiskAnalysis props:', { riskData, threadId, assistantId, checkpoint });

  // Parse the risk data into a format suitable for display
  useEffect(() => {
    setDisplayData(riskData);
  }, [values]);

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

  // Sorting state
  const [sortField, setSortField] = useState<'Id' | 'Relacionado ao' | 'Nível de Risco' | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const sortedData = useMemo(() => {
    if (!sortField) return displayData;
    return [...displayData].sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';
      if (sortField === 'Relacionado ao') {
        aVal = a["Relacionado ao"] || '';
        bVal = b["Relacionado ao"] || '';
      } else if (sortField === 'Nível de Risco') {
        aVal = a["Nível de Risco"] || '';
        bVal = b["Nível de Risco"] || '';
      } else if (sortField === 'Id') {
        aVal = a.Id || '';
        bVal = b.Id || '';
      }
      if (aVal < bVal) return sortAsc ? -1 : 1;
      if (aVal > bVal) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [displayData, sortField, sortAsc]);

  return (
    <div className="w-full table-fixew-full max-w-4xl mx-auto my-6 border-blue-200 shadow-md overflow-x-autod">     
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-auto min-w-[40px] max-w-[80px] px-2 cursor-pointer select-none flex items-center gap-1" onClick={() => {
                if (sortField === 'Id') setSortAsc(!sortAsc);
                else { setSortField('Id'); setSortAsc(true); }
              }}>
                <span>Id</span>
                <ArrowDownUp className={`inline w-3 h-3 ml-1 ${sortField === 'Id' ? 'text-blue-600' : 'text-gray-400'}`} />
                {sortField === 'Id' ? (sortAsc ? <ArrowUp className="inline w-3 h-3 ml-0.5 text-blue-600" /> : <ArrowDown className="inline w-3 h-3 ml-0.5 text-blue-600" />) : null}
              </TableHead>
              <TableHead className="w-2/6">Risco</TableHead>
              <TableHead className="w-2/6">Fonte</TableHead>
              <TableHead className="w-1/6 px-2 cursor-pointer select-none flex items-center gap-1" onClick={() => {
                if (sortField === 'Relacionado ao') setSortAsc(!sortAsc);
                else { setSortField('Relacionado ao'); setSortAsc(true); }
              }}>
                <span>Categoria</span>
                <ArrowDownUp className={`inline w-3 h-3 ml-1 ${sortField === 'Relacionado ao' ? 'text-blue-600' : 'text-gray-400'}`} />
                {sortField === 'Relacionado ao' ? (sortAsc ? <ArrowUp className="inline w-3 h-3 ml-0.5 text-blue-600" /> : <ArrowDown className="inline w-3 h-3 ml-0.5 text-blue-600" />) : null}
              </TableHead>
              <TableHead className="w-1/12 text-center">Probabilidade</TableHead>
              <TableHead className="w-1/12 text-center">Impacto</TableHead>
              <TableHead className="w-1/6 px-2 cursor-pointer select-none flex items-center gap-1" onClick={() => {
                if (sortField === 'Nível de Risco') setSortAsc(!sortAsc);
                else { setSortField('Nível de Risco'); setSortAsc(true); }
              }}>
                <span>Nível de Risco</span>
                <ArrowDownUp className={`inline w-3 h-3 ml-1 ${sortField === 'Nível de Risco' ? 'text-blue-600' : 'text-gray-400'}`} />
                {sortField === 'Nível de Risco' ? (sortAsc ? <ArrowUp className="inline w-3 h-3 ml-0.5 text-blue-600" /> : <ArrowDown className="inline w-3 h-3 ml-0.5 text-blue-600" />) : null}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((risk) => (
              <TableRow key={risk.Id} className={risk.Id.startsWith('TEMP_') ? 'bg-green-50' : ''}>
                <TableCell className="font-medium w-auto min-w-[40px] max-w-[80px] px-2">{risk.Id.startsWith('TEMP_') ? 'NEW' : risk.Id}</TableCell>
                <TableCell className="break-words whitespace-pre-line align-center">{risk.Risco}</TableCell>
                <TableCell className="break-words whitespace-pre-line align-center">{risk.Fonte}</TableCell>
                <TableCell className="break-words whitespace-pre-line align-center">{risk["Relacionado ao"] ?? "N/A"}</TableCell>
                <TableCell className="text-center align-center">{Math.round(risk.Probabilidade)}</TableCell>
                <TableCell className="text-center align-center">{Math.round(risk["Impacto Geral"])}</TableCell>
                <TableCell className="break-words whitespace-pre-line align-center">
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