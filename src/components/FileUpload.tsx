import React, { useState, useRef } from 'react';
import { Upload, FileIcon, AlertCircle, LoaderCircle } from 'lucide-react';
import { Button } from './ui/button';
import { useStreamContext } from '@/providers/Stream';
import { FILE_UPLOAD_URL, LOGS_SERVER_URL } from '@/lib/config';
import { toast } from "sonner";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
// Use URLs from config
const UPLOAD_URL = FILE_UPLOAD_URL + '/upload';
const HEALTH_CHECK_URL = LOGS_SERVER_URL + '/health';
// Note: LangGraph API remains on port 8123, handled by StreamProvider

// Export a flag or context to indicate FileUpload phase for StepWizard
export const FILE_UPLOAD_PHASE = true;

interface FileUploadProps {
  onUploadStart?: () => void;
}

export const FileUpload = ({ onUploadStart }: FileUploadProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stream = useStreamContext();

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const validateFile = (file: File): string | null => {
    if (!file.type.includes('pdf')) {
      return 'Only PDF files are allowed';
    }
    
    if (file.size > MAX_FILE_SIZE) {
      return 'File size should not exceed 5MB';
    }

    return null;
  };

  const handleFileSelect = (selectedFile: File) => {
    const validationError = validateFile(selectedFile);
    if (validationError) {
      setError(validationError);
      setFile(null);
      return;
    }

    setError(null);
    setFile(selectedFile);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const uploadFile = async () => {
    if (!file) return;

    setIsUploading(true);
    setError(null);
    console.log('Starting file upload process for:', file.name);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // First check if server is available
      try {
        console.log('Checking server health at:', HEALTH_CHECK_URL);
        const healthCheck = await fetch(HEALTH_CHECK_URL, { 
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          mode: 'cors', // Add CORS mode
          credentials: 'same-origin',
        });
        if (!healthCheck.ok) {
          console.error('Health check failed:', await healthCheck.text());
          throw new Error('File upload server is not available. Please ensure the server is running on port 8001.');
        }
        console.log('Server health check passed');
      } catch (error) {
        console.error('Server connection error:', error);
        throw new Error('Cannot connect to the file upload server. Please ensure the server is running on port 8001.');
      }

      console.log('Uploading file to:', UPLOAD_URL);
      const response = await fetch(UPLOAD_URL, {
        method: 'POST',
        body: formData,
        mode: 'cors', // Add CORS mode
        credentials: 'same-origin',
      });

      // Handle non-JSON responses
      const contentType = response.headers.get('content-type');
      console.log('Response status:', response.status, 'Content-Type:', contentType);
      if (!response.ok) {
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          throw new Error(errorData.detail || `Upload failed with status: ${response.status}`);
        } else {
          throw new Error(`Upload failed with status: ${response.status} - ${await response.text() || 'Unknown error'}`);
        }
      }

      // Only try to parse JSON if we have a JSON response
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned non-JSON response');
      }

      const data = await response.json();
      const filePath = data.input_file;
      
      console.log('File path received from upload server:', filePath);
      
      // Handle Windows backslashes by converting them to forward slashes
      const normalizedPath = filePath.replace(/\\/g, '/');
      console.log('Normalized path:', normalizedPath);
      
      // Submit the input_file. Add an empty messages array to satisfy the type.
      const langGraphInput = {
        input_file: normalizedPath, 
        messages: [], // Add empty messages array for type compatibility
      };
      console.log('Submitting to LangGraph with input_file and empty messages:', langGraphInput);

      if (onUploadStart) onUploadStart();

      stream.submit(
        langGraphInput, 
        {
          streamMode: ['values'], 
        },
      );
      
      toast("Processing started", {
        description: "Check the 'Show Logs' option to see detailed processing steps.",
        duration: 5000,
      });
      
      setFile(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full">
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer ${
          isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
        } ${error ? 'border-red-500 bg-red-50' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleBrowseClick}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept=".pdf"
        />
        
        {file ? (
          <div className="flex flex-col items-center gap-2">
            <FileIcon className="h-10 w-10 text-blue-500" />
            <p className="text-sm font-medium">{file.name}</p>
            <p className="text-xs text-gray-500">
              PDF &middot; {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-10 w-10 text-gray-400" />
            <p className="text-sm font-medium">Drag and drop your PDF file here</p>
            <p className="text-xs text-gray-500">or click to browse</p>
            <p className="text-xs text-gray-400">Maximum file size: 5MB</p>
            <p className="text-xs text-gray-400 mt-4">
              This will upload to the file server (port 8001) and process with LangGraph (port 8123)
            </p>
          </div>
        )}
        
        {error && (
          <div className="mt-3 flex items-center justify-center text-red-600 gap-1">
            <AlertCircle className="h-4 w-4" />
            <p className="text-xs">{error}</p>
          </div>
        )}
      </div>
      
      {file && (
        <div className="mt-4 flex justify-center">
          <Button 
            onClick={(e) => {
              e.stopPropagation();
              uploadFile();
            }}
            disabled={isUploading}
            className="w-full sm:w-auto flex items-center justify-center"
          >
            {isUploading && (
              <LoaderCircle className="animate-spin mr-2 h-4 w-4" />
            )}
            {isUploading ? 'Uploading...' : 'Upload and Analyze'}
          </Button>
        </div>
      )}
    </div>
  );
}; 