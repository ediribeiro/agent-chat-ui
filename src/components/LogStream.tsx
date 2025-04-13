import React, { useEffect, useState, useRef } from 'react';
import { LOGS_SERVER_URL } from '@/lib/config';

interface LogEntry {
  id?: number;
  type: 'log' | 'system' | 'metadata';
  level?: string;
  message: string;
  timestamp: string;
  module?: string;
  logger?: string;
  available_modules?: string[];
  source?: string;
}

interface LogStreamProps {
  className?: string;
}

interface LogFilters {
  level: string;
  module: string;
  search: string;
}

const LogStream: React.FC<LogStreamProps> = ({ className = '' }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const [filters, setFilters] = useState<LogFilters>({
    level: 'all',
    module: 'all',
    search: ''
  });
  const [availableModules, setAvailableModules] = useState<string[]>([]);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Auto-scroll to bottom when logs update
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [filteredLogs]);

  // Apply filters when logs or filters change
  useEffect(() => {
    const filtered = logs.filter(log => {
      // Skip metadata events
      if (log.type === 'metadata') {
        return false;
      }
      
      // Filter by level
      if (filters.level !== 'all' && log.type === 'log' && log.level?.toLowerCase() !== filters.level.toLowerCase()) {
        return false;
      }
      
      // Filter by module
      if (filters.module !== 'all' && log.module && log.module !== filters.module) {
        return false;
      }
      
      // Filter by search text
      if (filters.search && !log.message?.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }
      
      return true;
    });
    
    setFilteredLogs(filtered);
  }, [logs, filters]);

  // Connect to log stream on component mount
  useEffect(() => {
    // Ensure EventSource is available
    if (typeof EventSource === 'undefined') {
      console.error('EventSource is not supported in this browser');
      setLogs(prevLogs => [
        ...prevLogs,
        {
          id: Date.now(),
          type: 'system',
          level: 'ERROR',
          message: 'EventSource is not supported in this browser. Cannot stream logs.',
          timestamp: new Date().toISOString(),
          source: 'system'
        }
      ]);
      return;
    }

    const connectToLogStream = () => {
      try {
        // Close any existing connection
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }

        const endpoint = `${LOGS_SERVER_URL}/logs`;
        console.log(`Connecting to log stream at ${endpoint}`);
        
        // Create a new EventSource connection
        const es = new EventSource(endpoint);
        eventSourceRef.current = es;
        
        // Handle successful connection
        es.onopen = () => {
          console.log('EventSource connection opened');
          setConnected(true);
          setLogs(prevLogs => [
            ...prevLogs,
            {
              id: Date.now(),
              type: 'system',
              message: 'Connected to log stream',
              timestamp: new Date().toISOString(),
              source: 'fastApi'
            }
          ]);
        };
        
        // Handle incoming messages
        es.onmessage = (event) => {
          try {
            const logData = JSON.parse(event.data);
            
            // Handle metadata events
            if (logData.type === 'metadata') {
              if (logData.available_modules) {
                setAvailableModules(prevModules => [...new Set([...prevModules, ...logData.available_modules])]);
              }
              return; // Don't add metadata events to the log display
            }
            
            // Add log entry
            const logEntry: LogEntry = {
              ...logData,
              id: Date.now(), 
              source: 'fastApi'
            };
            
            setLogs(prevLogs => [...prevLogs, logEntry]);
          } catch (error) {
            console.error('Error processing log:', error);
            setLogs(prevLogs => [
              ...prevLogs, 
              {
                id: Date.now(),
                type: 'system',
                level: 'ERROR',
                message: `Error parsing log: ${event.data}`,
                timestamp: new Date().toISOString(),
                source: 'system'
              }
            ]);
          }
        };
        
        // Handle errors and reconnection
        es.onerror = () => {
          setConnected(false);
          setLogs(prevLogs => [
            ...prevLogs,
            {
              id: Date.now(),
              type: 'system',
              message: 'Error connecting to log stream. Reconnecting...',
              timestamp: new Date().toISOString(),
              source: 'system'
            }
          ]);
          
          // Close the connection and try again after a delay
          if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
          }
          
          // Attempt to reconnect after a delay
          setTimeout(() => connectToLogStream(), 5000);
        };
      } catch (error) {
        console.error('Error setting up EventSource:', error);
        // Try again after a delay
        setTimeout(() => connectToLogStream(), 5000);
      }
    };

    connectToLogStream();
    
    // Clean up on component unmount
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []);

  // Handle filter changes
  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Clear all logs
  const handleClearLogs = () => {
    setLogs([]);
  };

  // Test backend connection
  const testBackendConnection = async () => {
    setLogs(prevLogs => [
      ...prevLogs,
      {
        id: Date.now(),
        type: 'system',
        message: 'Testing connection to logs endpoint...',
        timestamp: new Date().toISOString(),
        source: 'system'
      }
    ]);
    
    try {
      const response = await fetch(`${LOGS_SERVER_URL}/health`);
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      
      setLogs(prevLogs => [
        ...prevLogs,
        {
          id: Date.now(),
          type: 'system',
          message: `Health check succeeded: ${JSON.stringify(data)}`,
          timestamp: new Date().toISOString(),
          source: 'fastApi'
        }
      ]);
      
      // Reconnect to get new logs
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      
      // Reconnect after a short delay
      setTimeout(() => {
        const es = new EventSource(`${LOGS_SERVER_URL}/logs`);
        eventSourceRef.current = es;
      }, 500);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Backend connection test failed:', errorMessage);
      
      setLogs(prevLogs => [
        ...prevLogs,
        {
          id: Date.now(),
          type: 'system',
          level: 'ERROR',
          message: `Backend connection test failed: ${errorMessage}`,
          timestamp: new Date().toISOString(),
          source: 'system'
        }
      ]);
    }
  };

  // Render the log container and connection status
  return (
    <div className={`flex flex-col w-full border border-solid border-gray-200 rounded-md overflow-hidden bg-gray-50 ${className}`}>
      <div className="flex justify-between items-center p-2 bg-gray-100 border-b border-gray-200">
        <h3 className="text-base font-medium m-0">Supplementary Logs</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={testBackendConnection}
            className="py-1 px-2 text-xs border border-gray-200 rounded-md bg-white hover:bg-gray-100"
            title="Test backend connection"
          >
            Test Connection
          </button>
          <div className={`text-xs py-1 px-2 rounded-full ${connected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {connected ? 'Connected' : 'Disconnected'}
          </div>
        </div>
      </div>
      
      {/* Filter Controls */}
      <div className="flex flex-wrap gap-2 p-2 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-1">
          <label htmlFor="level-filter" className="text-xs text-gray-600">Level:</label>
          <select 
            id="level-filter" 
            name="level" 
            value={filters.level}
            onChange={handleFilterChange}
            className="py-1 px-2 text-xs border border-gray-200 rounded-md bg-white"
          >
            <option value="all">All Levels</option>
            <option value="info">INFO</option>
            <option value="warning">WARNING</option>
            <option value="error">ERROR</option>
            <option value="debug">DEBUG</option>
          </select>
        </div>
        
        {availableModules.length > 0 && (
          <div className="flex items-center gap-1">
            <label htmlFor="module-filter" className="text-xs text-gray-600">Module:</label>
            <select 
              id="module-filter" 
              name="module" 
              value={filters.module}
              onChange={handleFilterChange}
              className="py-1 px-2 text-xs border border-gray-200 rounded-md bg-white"
            >
              <option value="all">All Modules</option>
              {availableModules.map((module) => (
                <option key={module} value={module}>{module}</option>
              ))}
            </select>
          </div>
        )}
        
        <div className="flex items-center gap-1">
          <label htmlFor="search-filter" className="text-xs text-gray-600">Search:</label>
          <input 
            id="search-filter"
            type="text"
            name="search"
            value={filters.search}
            onChange={handleFilterChange}
            placeholder="Filter by text..."
            className="py-1 px-2 text-xs border border-gray-200 rounded-md bg-white"
          />
        </div>
        
        <button 
          className="ml-auto py-1 px-2 text-xs border border-gray-200 rounded-md bg-white hover:bg-gray-100"
          onClick={handleClearLogs}
        >
          Clear Logs
        </button>
      </div>
      
      <div className="h-[300px] overflow-y-auto p-2 font-mono text-xs leading-normal" ref={logContainerRef}>
        {filteredLogs.length === 0 ? (
          <div className="text-center text-gray-500 p-5">
            {logs.length === 0 ? "No logs available yet..." : "No logs match the current filters..."}
          </div>
        ) : (
          filteredLogs.map((log, index) => (
            <div 
              key={`log-${index}-${log.id || log.timestamp}`}
              className="mb-1 break-words whitespace-pre-wrap"
            >
              <span className="text-gray-500 mr-1.5">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
              <span className={`font-bold mr-1.5 ${
                log.type === 'log' 
                  ? log.level === 'INFO' 
                    ? 'text-blue-500' 
                    : log.level === 'WARNING' 
                      ? 'text-amber-500' 
                      : log.level === 'ERROR'
                        ? 'text-red-500'
                        : log.level === 'DEBUG'
                          ? 'text-gray-500'
                          : 'text-gray-700'
                  : 'text-green-500'
              }`}>
                {log.type === 'log' ? `[${log.level}]` : '[SYSTEM]'}
              </span>
              {log.module && (
                <span className="text-purple-600 italic mr-1.5">
                  {log.module}
                </span>
              )}
              <span>{log.message}</span>
            </div>
          ))
        )}
      </div>
      
      <div className="p-1 text-xs text-gray-500 text-right border-t border-gray-200">
        Showing {filteredLogs.length} of {logs.length} logs
      </div>
    </div>
  );
};

export default LogStream; 