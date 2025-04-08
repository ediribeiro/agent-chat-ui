import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Risk Analysis Helpers --- 

export function convertProbabilidade(prob: number | undefined | null): string {
  if (prob === undefined || prob === null) return "N/A";
  const mapping: Record<number, string> = {
    1: "Muito Baixa",
    2: "Baixa",
    3: "Média",
    4: "Alta",
    5: "Muito Alta",
  };
  return mapping[Math.round(prob)] || "Inválida";
}

export function convertImpacto(impacto: number | undefined | null): string {
  if (impacto === undefined || impacto === null) return "N/A";
  try {
    const impactoValue = Math.round(Number(impacto));
    if (1 <= impactoValue && impactoValue <= 3) return "Muito Baixo";
    if (4 <= impactoValue && impactoValue <= 6) return "Baixo";
    if (7 <= impactoValue && impactoValue <= 9) return "Médio";
    if (10 <= impactoValue && impactoValue <= 12) return "Alto";
    if (13 <= impactoValue && impactoValue <= 15) return "Muito Alto";
    return "Inválido";
  } catch {
    return "Inválido";
  }
}

export function getRiskColorClass(nivelRisco: string | undefined | null): string {
  if (!nivelRisco) return "bg-gray-100 text-gray-800"; // Default/Unknown
  const lowerCaseLevel = nivelRisco.toLowerCase();
  switch (lowerCaseLevel) {
    case "baixo":
      return "bg-green-100 text-green-800";
    case "médio":
      return "bg-yellow-100 text-yellow-800";
    case "alto":
      return "bg-red-100 text-red-800";
    case "crítico":
      return "bg-purple-100 text-purple-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}
// --- End Risk Analysis Helpers --- 
