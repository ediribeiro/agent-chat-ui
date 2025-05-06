import { ResponsiveScatterPlot } from "@nivo/scatterplot"
import React, { useState, useMemo, useEffect } from "react"
import { motion } from "framer-motion"
import RiskEvaluation from "./RiskEvaluation";

// Define the props interface for CustomNode
interface CustomNodeProps {
  node: any; // Accepts either { node, ... } or direct data shape
  onMouseEnter: (node: any) => void;
  onMouseLeave: (node: any) => void;
  hoveredNode: string | null;
}

interface RiskMatrixViewProps {
  data: Array<{
    Id: string
    Probabilidade: number
    "Impacto Geral": number
    "Nível de Risco": string
    "Relacionado ao"?: string // Category field
  }>
}

const riskLevelColors: Record<string, string> = {
  Baixo: "#90EE90", // Light green
  Médio: "#FFCC66", // Light orange
  Alto: "#FF9999", // Light red
  Crítico: "#CC99FF", // Light purple
}

const riskLevelBorderColors: Record<string, string> = {
  Baixo: "#2ecc71", // Darker green
  Médio: "#f39c12", // Darker orange
  Alto: "#e74c3c", // Darker red
  Crítico: "#8e44ad", // Darker purple
}

const categoryColors: Record<string, string> = {
  "Gestão Contratual": "#95a5a6", // Gray
  "Planejamento da Contratação": "#95a5a6", // Orange
  "Seleção do Fornecedor": "#95a5a6", // Green - Make sure this matches the tooltip category in the image if desired
  Outro: "#95a5a6", // Gray
}

const categoryShapes: Record<string, string> = {
  "Gestão Contratual": "circle",
  "Planejamento da Contratação": "square",
  "Seleção do Fornecedor": "triangle", // Changed from circle in previous examples
  Outro: "diamond",
}

function hexToRgba(hex: string, alpha: number): string {
  const r = Number.parseInt(hex.slice(1, 3), 16)
  const g = Number.parseInt(hex.slice(3, 5), 16)
  const b = Number.parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const CategoryLegend: React.FC<{ categories: string[] }> = ({ categories }) => (
  <div className="flex gap-4 items-center mb-4 flex-wrap">
    {categories.map((category) => {
      const validCategory = category in categoryShapes ? category : "Outro";
      const shape = categoryShapes[validCategory];
      const color = categoryColors[validCategory];

      let path
      switch (shape) {
        case "circle":
          path = "M 0,0 m -4,0 a 4,4 0 1,0 8,0 a 4,4 0 1,0 -8,0"
          break
        case "square":
          path = "M -4,-4 h 8 v 8 h -8 Z"
          break
        case "triangle":
          path = "M 0,-4 L 4,4 L -4,4 Z"
          break
        case "diamond":
          path = "M 0,-4 L 4,0 L 0,4 L -4,0 Z"
          break
        default: // Default to circle if shape is somehow undefined
          path = "M 0,0 m -4,0 a 4,4 0 1,0 8,0 a 4,4 0 1,0 -8,0"
      }

      return (
        <div
          key={category} // Use original category for key
          className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-gray-50 transition-all duration-200 hover:shadow-md border border-gray-200"
        >
          <svg width="16" height="16" viewBox="-6 -6 12 12">
            <path d={path} fill={color} stroke={color} strokeWidth={1} />
          </svg>
          <span className="text-sm font-medium">{category}</span>
        </div>
      )
    })}
  </div>
)

const arePointsClose = (p1: { x: number; y: number }, p2: { x: number; y: number }, threshold = 0.3): boolean => {
  const dx = p1.x - p2.x
  const dy = p1.y - p2.y
  return Math.sqrt(dx * dx + dy * dy) < threshold
}

const findClusters = (points: Array<{ x: number; y: number; id: string }>, threshold = 0.3): string[][] => {
  const clusters: string[][] = []
  const visited = new Set<string>()
  const pointsById: Record<string, { x: number; y: number; id: string }> = {}
  points.forEach(p => { pointsById[p.id] = p })

  for (let i = 0; i < points.length; i++) {
    const point = points[i]
    if (visited.has(point.id)) continue

    const cluster: string[] = []
    const queue: string[] = [point.id]
    visited.add(point.id)

    while (queue.length > 0) {
      const currentId = queue.shift()!
      cluster.push(currentId)
      const currentPoint = pointsById[currentId]

      for (let j = 0; j < points.length; j++) {
        const otherPoint = points[j]
        if (!visited.has(otherPoint.id) && arePointsClose(currentPoint, otherPoint, threshold)) {
          visited.add(otherPoint.id)
          queue.push(otherPoint.id)
        }
      }
    }

    if (cluster.length > 1) {
      clusters.push(cluster)
    }
  }
  return clusters
}

const calculateOffset = (
  point: { x: number; y: number; id: string },
  allPoints: Array<{ x: number; y: number; id: string }>,
  hoveredId: string | null,
  clusters: string[][],
  offsetScale = 0.4,
): { x: number; y: number } => {
  if (!hoveredId) return { x: 0, y: 0 }

  const cluster = clusters.find((c) => c.includes(point.id))
  if (!cluster || !cluster.includes(hoveredId)) return { x: 0, y: 0 }

  if (point.id === hoveredId) return { x: 0, y: 0 }

  const hoveredPoint = allPoints.find((p) => p.id === hoveredId)
  if (!hoveredPoint) return { x: 0, y: 0 }

  const clusterPointsExceptHovered = cluster
    .filter((id) => id !== hoveredId)
    .map((id) => allPoints.find((p) => p.id === id))
    .filter(Boolean) as Array<{ x: number; y: number; id: string }>

  const pointIndex = clusterPointsExceptHovered.findIndex((p) => p.id === point.id)
  if (pointIndex === -1) return { x: 0, y: 0 }

  const totalPoints = clusterPointsExceptHovered.length
  const angleStep = (2 * Math.PI) / totalPoints
  const angle = pointIndex * angleStep

  const dynamicScale = offsetScale;

  return {
    x: Math.cos(angle) * dynamicScale,
    y: Math.sin(angle) * dynamicScale,
  }
}

const CustomNode: React.FC<CustomNodeProps> = ({ node, onMouseEnter, onMouseLeave, hoveredNode }) => {
  // Support both nivo shape ({ node: { x, y, data } }) and direct ({ x, y, ... })
  const hasNivoShape = node && node.node && typeof node.node.x === 'number' && typeof node.node.y === 'number';
  const d = hasNivoShape ? node.node.data : node;
  const x = hasNivoShape ? node.node.x : node.x;
  const y = hasNivoShape ? node.node.y : node.y;
  if (!d || typeof x !== 'number' || typeof y !== 'number') return null;

  const color = riskLevelColors[d.nivel] || riskLevelColors["Baixo"];
  const shape = categoryShapes[d.categoria] || "circle";
  const isHovered = d.id === hoveredNode;
  let path;
  const nodeSize = 14;
  switch (shape) {
    case "circle":
      path = `M 0,0 m -${nodeSize / 2},0 a ${nodeSize / 2},${nodeSize / 2} 0 1,0 ${nodeSize},0 a ${nodeSize / 2},${nodeSize / 2} 0 1,0 -${nodeSize},0`;
      break;
    case "square":
      path = `M -${nodeSize / 2},-${nodeSize / 2} h ${nodeSize} v ${nodeSize} h -${nodeSize} Z`;
      break;
    case "triangle":
      path = `M 0,-${nodeSize / 2} L ${nodeSize / 2},${nodeSize / 2} L -${nodeSize / 2},${nodeSize / 2} Z`;
      break;
    case "diamond":
      path = `M 0,-${nodeSize / 2} L ${nodeSize / 2},0 L 0,${nodeSize / 2} L -${nodeSize / 2},0 Z`;
      break;
    default:
      path = `M 0,0 m -${nodeSize / 2},0 a ${nodeSize / 2},${nodeSize / 2} 0 1,0 ${nodeSize},0 a ${nodeSize / 2},${nodeSize / 2} 0 1,0 -${nodeSize},0`;
  }
  const fillOpacity = isHovered ? 0.9 : 0.7;
  const strokeWidth = isHovered ? 2 : 1;
  const textColor = "#333";
  const fontSize = 9;
  return (
    <g
      transform={`translate(${x}, ${y})`}
      onMouseEnter={() => onMouseEnter(node)}
      onMouseLeave={() => onMouseLeave(node)}
      style={{ cursor: "pointer" }}
      data-node-id={d.id}
    >
      <motion.path
        key={`${d.id}-path`}
        d={path}
        fill={color}
        fillOpacity={fillOpacity}
        stroke={isHovered ? "rgba(0,0,0,0.5)" : color}
        strokeWidth={strokeWidth}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1, transition: { type: "spring", stiffness: 400, damping: 25 } }}
        strokeOpacity={isHovered ? 1 : 0.7}
      />
      <motion.text
        key={`${d.id}-text`}
        textAnchor="start"
        x={nodeSize / 2 + 3}
        y={fontSize * 0.35}
        fill={textColor}
        fontSize={fontSize}
        fontWeight="medium"
        style={{ pointerEvents: "none" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {d.id}
      </motion.text>
    </g>
  );
};

const backgroundZonesLayer = ({ xScale, yScale }: { xScale: any; yScale: any }) => {
  const zoneColors = [
    hexToRgba(riskLevelColors["Baixo"], 0.5),
    hexToRgba(riskLevelColors["Médio"], 0.5),
    hexToRgba(riskLevelColors["Alto"], 0.5),
    hexToRgba(riskLevelColors["Crítico"], 0.5),
  ]

  const generateCurvePoints = (threshold: number) => {
    const points = []
    const xMin = Math.max(0.1, threshold / 15)
    for (let x = xMin; x <= 5.01; x += 0.05) {
      const y = threshold / x
      if (y <= 15) points.push({ x, y })
    }
    if (threshold / 5 > 0) {
      points.push({ x: 5, y: threshold / 5 })
    } else {
      points.push({ x: 5, y: 0 })
    }
    return points
  }

  const curves = [20, 40, 55].map(generateCurvePoints)
  const findXAtY15 = (threshold: number) => Math.max(0.1, threshold / 15)

  const lowMediumX15 = findXAtY15(20)
  const mediumHighX15 = findXAtY15(40)
  const highCriticalX15 = findXAtY15(55)

  return (
    <g>
      <path
        d={`
          M ${xScale(highCriticalX15)} ${yScale(15)}
          ${curves[2].map((p) => `L ${xScale(p.x)} ${yScale(p.y)}`).join(" ")}
          L ${xScale(5)} ${yScale(0)}
          L ${xScale(5)} ${yScale(15)}
          Z
        `}
        fill={zoneColors[3]} stroke={riskLevelBorderColors["Crítico"]} strokeWidth={0.5} strokeOpacity={0.3}
      />
      <path
        d={`
          M ${xScale(mediumHighX15)} ${yScale(15)}
          L ${xScale(highCriticalX15)} ${yScale(15)}
          ${curves[2].map((p) => `L ${xScale(p.x)} ${yScale(p.y)}`).join(" ")}
          ${curves[1].slice().reverse().map((p) => `L ${xScale(p.x)} ${yScale(p.y)}`).join(" ")}
          Z
        `}
        fill={zoneColors[2]} stroke={riskLevelBorderColors["Alto"]} strokeWidth={0.5} strokeOpacity={0.3}
      />
      <path
        d={`
          M ${xScale(lowMediumX15)} ${yScale(15)}
          L ${xScale(mediumHighX15)} ${yScale(15)}
          ${curves[1].map((p) => `L ${xScale(p.x)} ${yScale(p.y)}`).join(" ")}
          ${curves[0].slice().reverse().map((p) => `L ${xScale(p.x)} ${yScale(p.y)}`).join(" ")}
          Z
        `}
        fill={zoneColors[1]} stroke={riskLevelBorderColors["Médio"]} strokeWidth={0.5} strokeOpacity={0.3}
      />
      <path
        d={`
          M ${xScale(0)} ${yScale(15)}
          L ${xScale(lowMediumX15)} ${yScale(15)}
          ${curves[0].map((p) => `L ${xScale(p.x)} ${yScale(p.y)}`).join(" ")}
          L ${xScale(5)} ${yScale(0)}
          L ${xScale(0)} ${yScale(0)}
          Z
        `}
        fill={zoneColors[0]} stroke={riskLevelBorderColors["Baixo"]} strokeWidth={0.5} strokeOpacity={0.3}
      />
      { [20, 40, 55].map((thresh, index) => {
          const levelNames = ['Baixo-Médio', 'Médio-Alto', 'Alto-Crítico'];
          const xPos = 4.8;
          const yPos = thresh / xPos;
          const yOffset = index === 0 ? 0.2 : (index === 1 ? 0 : -0.2);
           return (
               <text key={thresh} x={xScale(xPos)} y={yScale(Math.max(0.1, Math.min(14.9, yPos + yOffset)))}
                  textAnchor="end" fontSize={10} fill="rgba(0,0,0,0.6)" fontWeight="medium">
                  {levelNames[index]} ({thresh})
               </text>
           );
      })}
    </g>
  )
};

const RiskMatrixView: React.FC<RiskMatrixViewProps> = ({ data }) => {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  if (!Array.isArray(data) || data.length === 0) {
    console.error('Invalid or empty data received in RiskMatrixView:', data);
    return <div>No data available for risk matrix.</div>;
  }
  
  const filteredData = data.filter((item) => item["Relacionado ao"] !== "Solução Selecionada")
  const categories = Array.from(new Set(filteredData.map((d) => d["Relacionado ao"] || "Outro")))

  // Process data with enhanced risk information
  const enhancedData = filteredData.map((risk) => ({
    ...risk,
    score: risk.Probabilidade * risk["Impacto Geral"],
    categoria: risk["Relacionado ao"] || "Outro",
  }))
  const allPoints = enhancedData.map((risk) => ({
    x: risk.Probabilidade,
    y: risk["Impacto Geral"],
    id: risk.Id,
  }))
  const clusters = useMemo(() => findClusters(allPoints, 0.3), [allPoints])

  useEffect(() => {
    if (hoveredNode) {
      const cluster = clusters.find(c => c.includes(hoveredNode));
      if (cluster) {
        console.log('Hovered node:', hoveredNode, 'Cluster:', cluster);
      } else {
        console.log('Hovered node:', hoveredNode, 'No cluster');
      }
    }
  }, [hoveredNode, clusters]);

  const scatterData = useMemo(() => [
    {
      id: "ID ",
      data: enhancedData
        .filter((risk) => typeof risk.Probabilidade === "number" && typeof risk["Impacto Geral"] === "number")
        .map((risk) => {
          const originalPosition = { x: risk.Probabilidade, y: risk["Impacto Geral"], id: risk.Id };
          let offset = { x: 0, y: 0 };
          const cluster = clusters.find(c => c.includes(risk.Id));
          if (cluster && cluster.length > 1) {
            // Small jitter for clustered points
            const jitter = 0.2;
            offset.x += (Math.random() - 0.5) * jitter;
            offset.y += (Math.random() - 0.5) * jitter;
          }
          if (hoveredNode && cluster && cluster.includes(hoveredNode)) {
            const hoverOffset = calculateOffset(originalPosition, allPoints, hoveredNode, clusters, 0.2);
            offset.x += hoverOffset.x;
            offset.y += hoverOffset.y;
          }
          return {
            x: risk.Probabilidade + offset.x,
            y: risk["Impacto Geral"] + offset.y,
            originalX: risk.Probabilidade,
            originalY: risk["Impacto Geral"],
            id: risk.Id,
            nivel: risk["Nível de Risco"],
            categoria: risk.categoria,
            score: risk.score,
            isClustered: cluster && cluster.length > 1,
          };
        }),
    },
  ], [enhancedData, allPoints, hoveredNode, clusters]);
  return (
    <div className="w-full flex flex-col items-center">
      <div className="bg-white p-4 rounded-lg border shadow-sm w-full max-w-4xl mx-auto">
        <div className="mb-4">
          <h3 className="text-lg font-semibold">Matriz de Riscos</h3>
          <div className="text-sm text-gray-500 pb-2">Visualização dos riscos por probabilidade e impacto</div>
        </div>
        <CategoryLegend categories={categories} />
        <div className="h-[420px] w-full">
          <ResponsiveScatterPlot
            data={scatterData}
            margin={{ top: 10, right: 30, bottom: 70, left: 70 }}
            xScale={{ type: "linear", min: 0, max: 5.2 }}
            yScale={{ type: "linear", min: 0, max: 15.5 }}
            axisBottom={{
              legend: "Probabilidade", legendPosition: "middle", legendOffset: 46,
              tickValues: [0, 1, 2, 3, 4, 5], format: ".0f",
            }}
            axisLeft={{
              legend: "Impacto", legendPosition: "middle", legendOffset: -50,
              tickValues: [0, 3, 6, 9, 12, 15], format: ".0f",
            }}
            blendMode="normal"
            enableGridX={true}
            enableGridY={true}
            gridXValues={[1, 2, 3, 4, 5]}
            gridYValues={[3, 6, 9, 12, 15]}
            theme={{
              grid: { line: { stroke: "rgba(0, 0, 0, 0.08)", strokeWidth: 1 } },
              axis: {
                ticks: { text: { fontSize: 12, fill: "#444" } },
                legend: { text: { fontSize: 14, fontWeight: "medium", fill: "#333" } },
              },
              tooltip: {
                container: { background: 'transparent', boxShadow: 'none', padding: 0 },
              },
            }}
            layers={[backgroundZonesLayer, "grid", "axes", "nodes", "markers", "mesh"]}
            nodeComponent={(nodeProps) => (
              <CustomNode
                node={nodeProps.node}
                onMouseEnter={() => setHoveredNode(nodeProps.node.data.id)}
                onMouseLeave={() => setHoveredNode(null)}
                hoveredNode={hoveredNode}
              />
            )}
            tooltip={() => null}
            motionConfig="wobbly"
            isInteractive={true}
            useMesh={false}
          />
        </div>
      </div>
      <RiskEvaluation risk_data={filteredData} />
    </div>
  )
}

export default RiskMatrixView