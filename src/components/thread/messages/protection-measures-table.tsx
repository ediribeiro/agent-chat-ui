import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { cn, convertImpacto, convertProbabilidade, getRiskColorClass } from "@/lib/utils";

// Updated interface based on protection_measures_list structure
interface MeasureItem {
  Id: string;
  Risco: string;
  Fonte?: string;
  Probabilidade: number;
  "Impacto Geral": number;
  Consequências?: string[];
  "Análise de Apetite e Tolerância"?: {
    "Dentro do Apetite ao Risco?": string;
    "Dentro da Tolerância?": string;
    "Classificação da Necessidade de Tratamento": string;
    Justificativa: string;
  };
  "Ações Preventivas"?: Array<{ Descrição: string; Responsável: string }>;
  "Ações de Contingência"?: Array<{ Descrição: string; Responsável: string }>;
  "Nível de Risco": string; // Needed for color coding
  // Add other fields if needed
}

interface ProtectionMeasuresProps {
  measures: MeasureItem[];
  threadId?: string | null;
}

// Helper component to render Action tables
const ActionsTable = ({
  title,
  actions,
}: {
  title: string;
  actions?: Array<{ Descrição: string; Responsável: string }>;
}) => {
  if (!actions || actions.length === 0) {
    return (
      <div className="mt-3">
        <h5 className="text-xs font-semibold mb-1">{title}</h5>
        <p className="text-xs text-muted-foreground">None defined.</p>
      </div>
    );
  }
  return (
    <div className="mt-3">
      <h5 className="text-xs font-semibold mb-1">{title}</h5>
      <Table className="text-xs border rounded-md">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[30px] px-2 py-1">#</TableHead>
            <TableHead className="px-2 py-1">Description</TableHead>
            <TableHead className="px-2 py-1">Responsible</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {actions.map((action, index) => (
            <TableRow key={index}>
              <TableCell className="px-2 py-1">{index + 1}</TableCell>
              <TableCell className="px-2 py-1">{action.Descrição}</TableCell>
              <TableCell className="px-2 py-1">{action.Responsável}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default function ProtectionMeasuresTable({
  measures,
  threadId,
}: ProtectionMeasuresProps) {
  if (!measures || measures.length === 0) {
    return (
      <div className="my-2 text-sm text-muted-foreground max-w-4xl mx-auto">
        No protection measures data available.
      </div>
    );
  }

  const handleDownload = async () => {
    try {
      const filename = threadId
        ? `risk_analysis_${threadId}.docx`
        : "risk_analysis.docx";
      // !!! IMPORTANT: Replace with your actual API endpoint !!!
      const downloadUrl = `/api/download?threadId=${threadId || ''}`; 

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
    }
  };

  return (
    <div className="my-4 w-full max-w-4xl mx-auto space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Risk Details & Protection Measures</h3>
        <Button onClick={handleDownload} variant="outline" size="sm">
          <Download className="w-4 h-4 mr-2" />
          Download as Word (.docx)
        </Button>
      </div>

      {measures.map((risk) => (
        <Card key={risk.Id} className="overflow-hidden">
          <CardHeader
            className={cn(
              "p-3 flex flex-row items-center justify-between",
              getRiskColorClass(risk["Nível de Risco"])
            )}
          >
            <CardTitle className="text-base font-bold">
              {risk.Id}: {risk.Risco}
            </CardTitle>
            <span className="text-sm font-semibold px-2 py-0.5 rounded-full bg-black/10">
              {risk["Nível de Risco"]}
            </span>
          </CardHeader>
          <CardContent className="p-4 text-sm">
            {risk.Fonte && (
              <p className="mb-2">
                <strong>Source:</strong> {risk.Fonte}
              </p>
            )}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-3 text-xs border-b pb-2">
                <p><strong>Probability:</strong> {convertProbabilidade(risk.Probabilidade)}</p>
                <p><strong>Impact:</strong> {convertImpacto(risk["Impacto Geral"])}</p>
            </div>

            {risk.Consequências && risk.Consequências.length > 0 && (
              <div className="mb-3">
                <h5 className="text-xs font-semibold mb-1">Consequences (Damages):</h5>
                <ul className="list-disc list-inside text-xs space-y-0.5">
                  {risk.Consequências.map((con, idx) => (
                    <li key={idx}>{con}</li>
                  ))}
                </ul>
              </div>
            )}

            {risk["Análise de Apetite e Tolerância"] && (
                <div className="mb-3 p-2 bg-muted/40 rounded-md text-xs">
                    <h5 className="font-semibold mb-1">Appetite/Tolerance Analysis:</h5>
                    <p><strong>Treatment Need:</strong> {risk["Análise de Apetite e Tolerância"]["Classificação da Necessidade de Tratamento"]}</p>
                    <p className="text-muted-foreground"><em>{risk["Análise de Apetite e Tolerância"].Justificativa}</em></p>
                </div>
            )}

            <ActionsTable
              title="Preventive Actions"
              actions={risk["Ações Preventivas"]}
            />
            <ActionsTable
              title="Contingency Actions"
              actions={risk["Ações de Contingência"]}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
} 