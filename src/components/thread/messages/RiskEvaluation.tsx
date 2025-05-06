import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart2, Calendar, Landmark, Shield, TrendingUp, AlertTriangle } from "lucide-react";

// Icons mapping for each risk metric
const metricIcons = {
  "Impacto Financeiro": <Landmark className="text-blue-700" size={18} />,
  "Impacto no Cronograma": <Calendar className="text-yellow-700" size={18} />,
  "Impacto Reputacional": <Shield className="text-red-700" size={18} />,
  "Impacto Geral": <BarChart2 className="text-green-700" size={18} />,
  "Probabilidade Simulada": <TrendingUp className="text-purple-700" size={18} />,
};

const legend = [
  { label: "Impacto Financeiro", icon: metricIcons["Impacto Financeiro"] },
  { label: "Impacto no Cronograma", icon: metricIcons["Impacto no Cronograma"] },
  { label: "Impacto Reputacional", icon: metricIcons["Impacto Reputacional"] },
  { label: "Impacto Geral", icon: metricIcons["Impacto Geral"] },
  { label: "Probabilidade Simulada", icon: metricIcons["Probabilidade Simulada"] },
];

// Helper to safely access keys with spaces/punctuation
const getValue = (obj: any, key: string) => obj?.[key] ?? "-";

// Radar chart using SVG (simple, replace with Nivo/other if needed)
function SpiderChart({ data }: { data: any }) {
  const keys = [
    "Impacto Financeiro",
    "Impacto no Cronograma",
    "Impacto Reputacional",
    "Impacto Geral",
    "Probabilidade Simulada",
  ];
  const values = keys.map((k) => {
    if (k === "Impacto Geral") {
      // Normalize Impacto Geral (0-75) to 0-5
      return (Number(getValue(data, k)) || 0) / 5;
    }
    return Number(getValue(data, k)) || 0;
  });
  const max = 5;
  const angles = keys.map((_, i) => (2 * Math.PI * i) / keys.length);
  const radius = 40;
  const iconRadius = radius + 18;

  // Calculate points
  const points = values.map((v, i) => {
    const r = (v / max) * radius;
    return [
      60 + r * Math.sin(angles[i]),
      60 - r * Math.cos(angles[i]),
    ];
  });
  const polygon = points.map((p) => p.join(",")).join(" ");

  return (
    <svg width={120} height={120} viewBox="0 0 120 120" style={{ overflow: 'visible' }}>
      {/* Axes */}
      {angles.map((angle, i) => (
        <line
          key={i}
          x1={60}
          y1={60}
          x2={60 + radius * Math.sin(angle)}
          y2={60 - radius * Math.cos(angle)}
          stroke="#cbd5e1"
          strokeWidth={1}
        />
      ))}
      {/* Outer polygon */}
      <polygon
        points={keys
          .map((_, i) => {
            const x = 60 + radius * Math.sin(angles[i]);
            const y = 60 - radius * Math.cos(angles[i]);
            return `${x},${y}`;
          })
          .join(" ")}
        fill="none"
        stroke="#64748b"
        strokeWidth={1.5}
      />
      {/* Data polygon */}
      <polygon
        points={polygon}
        fill="#f87171"
        fillOpacity={0.4}
        stroke="#ef4444"
        strokeWidth={2}
      />
      {/* Data points */}
      {points.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={3.5} fill="#ef4444" stroke="#fff" strokeWidth={0.5} />
      ))}
      {/* Icons (fully visible, outside chart) */}
      {angles.map((angle, i) => {
        const iconX = 60 + iconRadius * Math.sin(angle);
        const iconY = 60 - iconRadius * Math.cos(angle);
        return (
          <g key={i} transform={`translate(${iconX - 9},${iconY - 9})`}>
            {legend[i].icon}
          </g>
        );
      })}
    </svg>
  );
}

export interface RiskEvaluationCardProps {
  risk: any;
}

export function RiskEvaluationCard({ risk }: RiskEvaluationCardProps) {
  return (
    <Card className="flex flex-row items-center gap-6 p-4 border border-gray-200 shadow-sm rounded-xl mb-4 max-w-4xl w-full">
      <div className="flex flex-col min-w-[140px] max-w-[450px]">
        <span className="text-xs text-gray-400 font-mono mb-1">ID {getValue(risk, "Id")}</span>
        <span className="text-l font-semibold text-gray-700 flex items-center gap-2">
          <AlertTriangle className="text-rose-400" size={18} />
          {getValue(risk, "Risco")}
        </span>
      </div>
      <div className="flex flex-col gap-2 min-w-[120px]">
        <span className="text-l font-semibold text-gray-700">Pontuação Geral: {getValue(risk, "Pontuação Geral")}</span>
        <Badge className="bg-green-100 text-green-700 font-semibold w-fit">
          Nível de Risco: {getValue(risk, "Nível de Risco")}
        </Badge>
        <span className="text-xs text-gray-500 mt-1">
          Intervalo de Confiança: <b>{getValue(risk, "Intervalo de Confiança")}</b>
        </span>
      </div>
      <div className="flex-1 flex justify-center items-center">
        <SpiderChart data={risk} />
      </div>
    </Card>
  );
}

export default function RiskEvaluation({ risk_data }: { risk_data: any[] }) {
  if (!Array.isArray(risk_data) || risk_data.length === 0) return null;
  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-2 mt-6 items-center">
      <div className="flex flex-row flex-wrap gap-x-8 gap-y-1 items-center mb-2 w-full justify-center">
        <span className="font-semibold text-gray-700 w-full text-center">Legenda:</span>
        {legend.slice(0, 3).map((item) => (
          <span key={item.label} className="flex items-center gap-1 text-sm text-gray-600">
            {item.icon} {item.label}
          </span>
        ))}
        {legend.slice(3).map((item) => (
          <span key={item.label} className="flex items-center gap-1 text-sm text-gray-600">
            {item.icon} {item.label}
          </span>
        ))}
      </div>
      {risk_data.map((risk, idx) => (
        <RiskEvaluationCard key={risk.Id || idx} risk={risk} />
      ))}
    </div>
  );
}
