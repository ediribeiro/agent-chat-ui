import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MarkdownText } from "../markdown-text";

interface InformationExtractionProps {
  cards: { label: string; content: string }[];
}

export default function InformationExtraction({ cards }: InformationExtractionProps) {
  return (
    <div className="w-full max-w-2xl mx-auto my-6 space-y-6">
      {cards.map((card, idx) => (
        <Card key={card.label + idx} className="border-blue-200 shadow-md">
          <CardHeader className="bg-blue-50 border-b">
            <CardTitle className="text-blue-700 text-lg font-semibold">
              {card.label}
            </CardTitle>
          </CardHeader>
          <CardContent className="prose max-w-none text-gray-900">
            <MarkdownText>{
              typeof card.content === "string" && card.content.startsWith("```") && card.content.endsWith("```")
                ? card.content.replace(/^```[\s\r\n]*/,'').replace(/[\s\r\n]*```$/,'')
                : card.content
            }</MarkdownText>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
