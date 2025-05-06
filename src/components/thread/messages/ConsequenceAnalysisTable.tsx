import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ConsequenceAnalysisItem {
  Id: string;
  Risco: string;
  Consequencias: string[];
  [key: string]: any;
}

interface ConsequenceAnalysisTableProps {
  data: ConsequenceAnalysisItem[];
}

export default function ConsequenceAnalysisTable({ data }: ConsequenceAnalysisTableProps) {
  if (!data || !Array.isArray(data) || data.length === 0) return null;

  return (
    <Card className="w-full max-w-4xl mx-auto my-6 border-blue-200 shadow-md overflow-x-auto">
      <CardHeader className="bg-blue-50 border-b">
        <CardTitle className="text-blue-700 text-lg font-semibold">
          Consequence Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table className="w-full table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Id</TableHead>
              <TableHead className="w-2/6">Risco</TableHead>
              <TableHead className="w-3/6">Consequências</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, idx) => (
              <TableRow key={idx}>
                <TableCell className="break-words whitespace-pre-line align-top font-mono text-xs text-blue-900">{row.Id}</TableCell>
                <TableCell className="break-words whitespace-pre-line align-top">{row.Risco}</TableCell>
                <TableCell className="break-words whitespace-pre-line align-top">
                  {Array.isArray(row.Consequencias)
                    ? row.Consequencias.map((c, i) => (
                        <div key={i} className="mb-1">- {c}</div>
                      ))
                    : String(row.Consequencias)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
