/**
 * Configuration for API endpoints
 */

// LangGraph server URL (for the main API)
export const LANGGRAPH_API_URL = import.meta.env.VITE_LANGGRAPH_API_URL || 'http://localhost:2024';

// Supplementary logs server URL
export const LOGS_SERVER_URL = import.meta.env.VITE_LOGS_SERVER_URL || 'http://localhost:3000';

// File upload server URL (typically the same as logs server)
export const FILE_UPLOAD_URL = import.meta.env.VITE_FILE_UPLOAD_URL || 'http://localhost:3000';

/**
 * Helper function to get the appropriate URL based on environment
 */
export function getApiUrl(type: 'langgraph' | 'logs' | 'upload'): string {
  switch (type) {
    case 'langgraph':
      return LANGGRAPH_API_URL;
    case 'logs':
      return LOGS_SERVER_URL;
    case 'upload':
      return FILE_UPLOAD_URL;
    default:
      return LANGGRAPH_API_URL;
  }
} 