import { Card } from "@/components/ui/card";

// Helper for safe key access with spaces/punctuation
const getValue = (obj: any, key: string) => obj?.[key] ?? "-";

interface HazardIdentificationProps {
  risk_data: any[];
}

export default function HazardIdentification({ risk_data }: HazardIdentificationProps) {
  if (!Array.isArray(risk_data) || risk_data.length === 0) return null;
  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-4 mt-6 items-center">
      {risk_data.map((risk, idx) => {
        const apetite = getValue(risk, "Análise de Apetite e Tolerância");
        return (
          <Card key={risk.Id || idx} className="flex flex-col gap-2 p-4 border border-gray-200 shadow-sm rounded-xl w-full">
            <div className="flex flex-row flex-wrap gap-8 items-center mb-1">
              <span className="text-xs text-gray-400 font-mono">ID {getValue(risk, "Id")}</span>
              <span className="text-base font-semibold text-gray-700 flex-1">{getValue(risk, "Risco")}</span>
            </div>
            {typeof apetite === "object" && apetite !== null ? (
              <ul className="list-disc pl-5 space-y-1 text-gray-700">
                <li><strong>Análise de Apetite e Tolerância:</strong></li>
                {Object.keys(apetite).map((k) => (
                  <li key={k} className="ml-2">
                    <span className="font-medium">{k}:</span> {k === "Classificação da Necessidade de Tratamento" ? (
                      <span className="inline-block ml-1 px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs font-semibold align-middle">{getValue(apetite, k)}</span>
                    ) : (
                      getValue(apetite, k)
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-gray-500 italic">Análise de Apetite e Tolerância não disponível</div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
