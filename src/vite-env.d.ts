/// <reference types="vite/client" />

// Declare Vite environment variables for TS and Jest
interface ImportMetaEnv {
  readonly VITE_LANGGRAPH_API_URL?: string;
  readonly VITE_LOGS_SERVER_URL?: string;
  readonly VITE_FILE_UPLOAD_URL?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
