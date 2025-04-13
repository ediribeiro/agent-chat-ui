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
  analysis_data: RiskSummaryItem[]; // Changed prop name
}

export default function RiskAnalysis({ analysis_data }: RiskAnalysisProps) { // Changed prop name in destructuring
  if (!analysis_data || analysis_data.length === 0) {
    return (
      <div className="my-2 text-sm text-muted-foreground max-w-3xl mx-auto">
        No risk analysis summary data available.
      </div>
    );
  }

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
            {analysis_data.map((risk) => (
              <TableRow key={risk.Id}>
                <TableCell className="font-medium">{risk.Id}</TableCell>
                <TableCell className="text-xs whitespace-normal break-words">{risk.Risco}</TableCell>
                <TableCell className="text-xs whitespace-normal break-words text-center">{risk['Relacionado ao'] ?? "N/A"}</TableCell>
                <TableCell className="text-center text-xs">
                  {convertProbabilidade(risk.Probabilidade)}
                </TableCell>
                <TableCell className="text-center text-xs">
                  {convertImpacto(risk["Impacto Geral"])}
                </TableCell>
                <TableCell className="text-center text-xs font-medium">
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-full",
                      getRiskColorClass(risk["Nível de Risco"])
                    )}
                  >
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