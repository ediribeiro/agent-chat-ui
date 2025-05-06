import { Card } from "@/components/ui/card";

const getValue = (obj: any, key: string) => obj?.[key] ?? "-";

interface PreventiveContingencyActionsProps {
  risk_data: any[];
}

function ActionList({ actions, title }: { actions: any[]; title: string }) {
  if (!Array.isArray(actions) || actions.length === 0) return null;
  return (
    <div className="mb-2">
      <div className="font-semibold text-gray-700 mb-1">{title}:</div>
      <div className="space-y-2">
        {actions.map((action, idx) => (
          <div key={idx} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <div className="font-medium text-gray-800 mb-1">{getValue(action, "Descrição")}</div>
            <div className="text-xs text-gray-600 mb-0.5"><span className="font-semibold">Responsável:</span> {getValue(action, "Responsável")}</div>
            <div className="text-xs text-gray-600"><span className="font-semibold">Justificativa:</span> {getValue(action, "Justificativa")}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Add color logic for Nível de Risco (copied from RiskEvaluation) ---
const riskLevelColors: Record<string, string> = {
  'Baixo': 'bg-green-100 text-green-700',
  'Médio': 'bg-yellow-100 text-yellow-700',
  'Alto': 'bg-orange-100 text-orange-700',
  'Crítico': 'bg-red-100 text-red-700',
};

export default function PreventiveContingencyActions({ risk_data }: PreventiveContingencyActionsProps) {
  if (!Array.isArray(risk_data) || risk_data.length === 0) return null;
  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-4 mt-6 items-center">
      {risk_data.map((risk, idx) => {
        const nivel = getValue(risk, "Nível de Risco");
        const colorClass = riskLevelColors[nivel] || 'bg-gray-100 text-gray-700';
        return (
          <Card key={risk.Id || idx} className="flex flex-col gap-2 p-4 border border-gray-200 shadow-sm rounded-xl w-full">
            <div className={`p-2 rounded flex flex-row flex-wrap gap-8 items-center mb-1 ${colorClass}`}>
              <span className="bg-gray-100 p-1 rounded text-xs text-gray-500 font-mono">ID {getValue(risk, "Id")}</span>
              <span className="text-base font-semibold flex-1 px-2 py-1 rounded">{getValue(risk, "Risco")}</span>
              {/* Inline Nível de Risco */}
              <span className="text-xs font-semibold px-2 py-1 rounded">Nível de Risco: {nivel}</span>
            </div>
            <ActionList actions={getValue(risk, "Ações Preventivas")} title="Ações Preventivas" />
            <ActionList actions={getValue(risk, "Ações de Contingência")} title="Ações de Contingência" />
          </Card>
        );
      })}
    </div>
  );
}
