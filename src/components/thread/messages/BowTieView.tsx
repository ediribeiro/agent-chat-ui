import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHead,
  TableRow,
} from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface BowTieViewProps {
  data: any[];
}

const BowTieView: React.FC<BowTieViewProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="my-2 text-sm text-muted-foreground max-w-4xl mx-auto">
        Aguardando análise de causas e consequências...
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto my-4">
      <Card className="border-blue-200 shadow-md">
        <CardHeader className="bg-blue-50 pb-2">
          <CardTitle className="text-blue-700 text-lg font-medium">Análise de Causas e Consequências</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {data.map((risk, index) => (
            <div key={risk.Id || index} className="mb-6 last:mb-0 pt-3">
              {/* Risk header row */}
              <div className="flex justify-center items-center mb-3 px-4">
                <div className="text-center">
                  <span className="inline-block mb-1 bg-gray-100 text-gray-800 px-3 py-1 rounded-md text-sm font-medium">{risk.Id}</span>
                  <span className="text-base font-semibold text-gray-800 pl-2">{risk.Risco}</span>
                </div>
              </div>
              
              {/* Two-column layout for causes and consequences */}
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="w-1/2 text-center">Causas</TableHead>
                    <TableHead className="w-1/2 text-center">Consequências</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="align-top p-4">
                      <ol className="list-decimal pl-4 space-y-2">
                        {Array.isArray(risk.Causas) && risk.Causas.length > 0 ? 
                          risk.Causas.map((causa: string, i: number) => (
                            <li key={i} className="break-words whitespace-pre-line text-sm">{causa}</li>
                          )) : 
                          <li className="text-sm text-gray-500">Nenhuma causa identificada</li>
                        }
                      </ol>
                    </TableCell>
                    <TableCell className="align-top p-4 border-l">
                      <ol className="list-decimal pl-4 space-y-2">
                        {Array.isArray(risk.Consequencias) && risk.Consequencias.length > 0 ? 
                          risk.Consequencias.map((consequencia: string, i: number) => (
                            <li key={i} className="break-words whitespace-pre-line text-sm">{consequencia}</li>
                          )) : 
                          <li className="text-sm text-gray-500">Nenhuma consequência identificada</li>
                        }
                      </ol>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default BowTieView;
