import React from "react";

interface DocumentIngestionProps {
  inputFile?: string;
}

const DocumentIngestion: React.FC<DocumentIngestionProps> = ({ inputFile }) => {
  // Extract just the filename from the path
  const fileName = inputFile ? inputFile.split(/[\\/]/).pop() : undefined;
  return (
    <div className="w-full flex flex-col items-center justify-center py-8">
      <div className="bg-white rounded-lg shadow p-6 border max-w-md w-full text-center">
        <h2 className="text-lg font-semibold mb-2">Document Ingestion</h2>
        {fileName ? (
          <p className="text-blue-700 font-medium">Uploaded file: <span className="font-mono">{fileName}</span></p>
        ) : (
          <p className="text-gray-500">No file detected.</p>
        )}
      </div>
    </div>
  );
};

export default DocumentIngestion;
