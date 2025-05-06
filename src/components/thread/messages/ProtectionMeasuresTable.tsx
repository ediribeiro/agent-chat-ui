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
import { cn, convertImpacto, convertProbabilidade, getRiskColorClass } from "@/lib/utils";

// Updated interface based on protection_measures_list structure
interface MeasureItem {
  Id: string;
  Risco: string;
  Fonte?: string;
  Probabilidade: number;
  "Impacto Geral": number;
  Consequencias?: string[];
  "Análise de Apetite e Tolerância"?: {
    "Dentro do Apetite ao Risco?": string;
    "Dentro da Tolerância?": string;
    "Classificação da Necessidade de Tratamento": string;
    Justificativa: string;
  };
  "Ações Preventivas"?: Array<{ Descrição: string; Responsável: string }>;
  "Ações de Contingência"?: Array<{ Descrição: string; Responsável: string }>;
  "Nível de Risco": string; // Needed for color coding
}

interface ProtectionMeasuresProps {
  values: any;
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
        <h5 className="text-sm font-bold mb-1">{title}</h5>
        <p className="text-xs text-muted-foreground">Não há ações definidas.</p>
      </div>
    );
  }
  return (
    <div className="mt-3">
      <h5 className="text-sm font-bold mb-1">{title}</h5>
      <Table className="text-xs border rounded-md">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[30px] px-2 py-1">#</TableHead>
            <TableHead className="px-2 py-1">Descrição</TableHead>
            <TableHead className="px-2 py-1">Responsável</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {actions.map((action, index) => (
            <TableRow key={index}>
              <TableCell className="px-2 py-1">{index + 1}</TableCell>
              <TableCell className="px-2 py-1 whitespace-normal break-words">{action.Descrição}</TableCell>
              <TableCell className="px-2 py-1 whitespace-normal break-words">{action.Responsável}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default function ProtectionMeasuresTable({ values }: ProtectionMeasuresProps) {
  const measures: MeasureItem[] = Array.isArray(values?.risk_data) ? values.risk_data : [];

  if (!measures || measures.length === 0) {
    return (
      <div className="my-2 text-sm text-muted-foreground max-w-4xl mx-auto">
        No protection measures data available.
      </div>
    );
  }

  return (
    <div className="my-4 w-full max-w-4xl mx-auto space-y-4">
      <h3 className="text-lg font-semibold">Detalhes do Risco e Medidas de Proteção</h3>
      
      {measures.map((risk) => (
        <Card key={risk.Id} className="overflow-hidden">
          <CardHeader
            className={cn(
              "p-2 pb-1 flex flex-row items-center justify-between",
              getRiskColorClass(risk["Nível de Risco"])
            )}
          >
            <CardTitle className="px-2 text-base font-bold">
              {risk.Id}: <span className="whitespace-normal break-words">{risk.Risco}</span>
            </CardTitle>
            <span className="text-sm font-semibold px-2 py-0.5 rounded-full bg-black/10">
              {risk["Nível de Risco"]}
            </span>
          </CardHeader>
          <CardContent className="px-4 pb-4 text-sm">
            {risk.Fonte && (
              <p className="mb-3 mt-0 whitespace-normal break-words">
                <strong>Fonte:</strong> {risk.Fonte}
              </p>
            )}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-3 text-sm border-b pb-2">
                <p><strong>Probabilidade:</strong> {convertProbabilidade(risk.Probabilidade)}</p>
                <p><strong>Impacto:</strong> {convertImpacto(risk["Impacto Geral"])}</p>
            </div>
            {risk.Consequencias && risk.Consequencias.length > 0 && (
              <div className="mb-3">
                <h5 className="text-sm font-semibold mb-1"><strong>Danos:</strong></h5>
                <ul className="list-disc list-inside text-xs space-y-0.5">
                  {risk.Consequencias.map((con, idx) => (
                    <li key={idx} className="whitespace-normal break-words">{con}</li>
                  ))}
                </ul>
              </div>
            )}
            {risk["Análise de Apetite e Tolerância"] && (
                <div className="mb-3 p-2 pl-0 bg-muted/40 rounded-md text-sm">
                    <p><strong>Necessidade de Tratamento:</strong> {risk["Análise de Apetite e Tolerância"]["Classificação da Necessidade de Tratamento"]}</p>
                </div>
            )}
            <ActionsTable
              title="Ações Preventivas"
              actions={risk["Ações Preventivas"]}
            />
            <ActionsTable
              title="Ações de Contingência"
              actions={risk["Ações de Contingência"]}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}