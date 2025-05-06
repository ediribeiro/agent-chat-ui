import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CauseAnalysisItem {
  Id: string;
  Risco: string;
  Causas: string[];
  [key: string]: any;
}

interface CauseAnalysisTableProps {
  data: CauseAnalysisItem[];
}

export default function CauseAnalysisTable({ data }: CauseAnalysisTableProps) {
  if (!data || !Array.isArray(data) || data.length === 0) return null;

  return (
    <Card className="w-full max-w-4xl mx-auto my-6 border-blue-200 shadow-md overflow-x-auto">
      <CardHeader className="bg-blue-50 border-b">
        <CardTitle className="text-blue-700 text-lg font-semibold">
          Cause Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table className="w-full table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Id</TableHead>
              <TableHead className="w-2/6">Risco</TableHead>
              <TableHead className="w-3/6">Causas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, idx) => (
              <TableRow key={idx}>
                <TableCell className="break-words whitespace-pre-line align-top font-mono text-xs text-blue-900">{row.Id}</TableCell>
                <TableCell className="break-words whitespace-pre-line align-top">{row.Risco}</TableCell>
                <TableCell className="break-words whitespace-pre-line align-top">
                  {Array.isArray(row.Causas)
                    ? row.Causas.map((causa, i) => (
                        <div key={i} className="mb-1">- {causa}</div>
                      ))
                    : String(row.Causas)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
