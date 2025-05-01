// Auto-mock config for tests to prevent import.meta.env issues
jest.mock('@/lib/config', () => ({ FILE_UPLOAD_URL: 'http://localhost:8123' }));
