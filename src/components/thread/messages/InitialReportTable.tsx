import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMemo, useState } from "react";
import { ArrowUp, ArrowDown, ArrowDownUp } from "lucide-react";

interface InitialReportItem {
  Id: string;
  Risco: string;
  Fonte: string;
  "Relacionado ao": string;
  [key: string]: any;
}

interface InitialReportTableProps {
  data: InitialReportItem[];
}

export default function InitialReportTable({ data }: InitialReportTableProps) {
  if (!data || !Array.isArray(data) || data.length === 0) return null;

  // Sorting state
  const [sortField, setSortField] = useState<'Id' | 'Relacionado ao' | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const sortedData = useMemo(() => {
    if (!sortField) return data;
    return [...data].sort((a, b) => {
      if (a[sortField] < b[sortField]) return sortAsc ? -1 : 1;
      if (a[sortField] > b[sortField]) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [data, sortField, sortAsc]);

  // Statistics: number of risks per category ("Relacionado ao")
  const stats = useMemo(() => {
    const counts: Record<string, number> = {};
    data.forEach((row) => {
      const cat = row["Relacionado ao"] || "Outro";
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [data]);

  // Compact statistics UI
  return (
    <Card className="w-full max-w-4xl mx-auto my-6 border-blue-200 shadow-md overflow-x-auto">
      <CardHeader className="bg-blue-50 border-b">
        <CardTitle className="text-blue-700 text-lg font-semibold">Initial Report</CardTitle>
        <div className="flex flex-wrap gap-2 mt-2">
          {Object.entries(stats).map(([cat, count]) => (
            <div key={cat} className="flex flex-col items-center bg-blue-100 rounded px-2 py-1 min-w-[80px]">
              <span className="text-xs font-medium text-blue-600 truncate max-w-[70px]">{cat}</span>
              <span className="text-base font-bold text-blue-800">{count}</span>
            </div>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <Table className="w-full table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-auto min-w-[40px] max-w-[80px] px-2 cursor-pointer select-none flex items-center gap-1" onClick={() => {
                if (sortField === 'Id') setSortAsc(!sortAsc);
                else { setSortField('Id'); setSortAsc(true); }
              }}>
                <span>Id</span>
                <ArrowDownUp className={`inline w-3 h-3 ml-1 ${sortField === 'Id' ? 'text-blue-600' : 'text-gray-400'}`} />
                {sortField === 'Id' ? (sortAsc ? <ArrowUp className="inline w-3 h-3 ml-0.5 text-blue-600" /> : <ArrowDown className="inline w-3 h-3 ml-0.5 text-blue-600" />) : null}
              </TableHead>
              <TableHead className="w-2/6">Risco</TableHead>
              <TableHead className="w-2/6 break-words truncate">Fonte</TableHead>
              <TableHead className="w-auto px-2 cursor-pointer select-none flex items-center gap-1" onClick={() => {
                if (sortField === 'Relacionado ao') setSortAsc(!sortAsc);
                else { setSortField('Relacionado ao'); setSortAsc(true); }
              }}>
                <span>Relacionado ao</span>
                <ArrowDownUp className={`inline w-3 h-3 ml-1 ${sortField === 'Relacionado ao' ? 'text-blue-600' : 'text-gray-400'}`} />
                {sortField === 'Relacionado ao' ? (sortAsc ? <ArrowUp className="inline w-3 h-3 ml-0.5 text-blue-600" /> : <ArrowDown className="inline w-3 h-3 ml-0.5 text-blue-600" />) : null}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((row, idx) => (
              <TableRow key={idx}>
                <TableCell className="break-words align-top font-mono text-xs text-blue-900 max-w-[80px] truncate overflow-hidden text-ellipsis">{row.Id}</TableCell>
                <TableCell className="break-words whitespace-pre-line align-top">{row.Risco}</TableCell>
                <TableCell className="break-words align-top truncate overflow-hidden text-ellipsis">{row.Fonte}</TableCell>
                <TableCell className="break-words whitespace-pre-line align-top">{row["Relacionado ao"]}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
