import { useEffect, useState } from 'react';

interface ConsoleLog {
  timestamp: number;
  type: 'log' | 'error' | 'warn' | 'info';
  message: string;
  data?: any;
}

interface ConsoleCaptureProps {
  className?: string;
  maxLogs?: number;
  filterKeywords?: string[];
}

export default function ConsoleCapture({ 
  className = "", 
  maxLogs = 50,
  filterKeywords = ['👄', 'Mouth detection', 'jawOpen', 'tracking']
}: ConsoleCaptureProps) {
  const [logs, setLogs] = useState<ConsoleLog[]>([]);

  useEffect(() => {
    // Capture console.log
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalInfo = console.info;

    const captureLog = (type: ConsoleLog['type'], args: any[]) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');

      // Only capture logs that contain our filter keywords
      const shouldCapture = filterKeywords.some(keyword => 
        message.toLowerCase().includes(keyword.toLowerCase())
      );

      if (shouldCapture) {
        setLogs(prev => {
          const newLog: ConsoleLog = {
            timestamp: Date.now(),
            type,
            message,
            data: args.length > 1 ? args.slice(1) : undefined
          };
          
          const updated = [newLog, ...prev].slice(0, maxLogs);
          return updated;
        });
      }
    };

    console.log = (...args) => {
      originalLog(...args);
      captureLog('log', args);
    };

    console.error = (...args) => {
      originalError(...args);
      captureLog('error', args);
    };

    console.warn = (...args) => {
      originalWarn(...args);
      captureLog('warn', args);
    };

    console.info = (...args) => {
      originalInfo(...args);
      captureLog('info', args);
    };

    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
      console.info = originalInfo;
    };
  }, [maxLogs, filterKeywords]);

  const getLogColor = (type: ConsoleLog['type']) => {
    switch (type) {
      case 'error': return 'text-red-400';
      case 'warn': return 'text-yellow-400';
      case 'info': return 'text-blue-400';
      default: return 'text-green-400';
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString() + '.' + date.getMilliseconds().toString().padStart(3, '0');
  };

  return (
    <div className={`bg-black/90 rounded-lg p-4 max-h-96 overflow-y-auto font-mono text-sm ${className}`}>
      <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
        Console Logs (Mouth Tracking Debug)
      </h3>
      
      {logs.length === 0 ? (
        <div className="text-gray-400 text-center py-4">
          Waiting for mouth tracking logs...
          <br />
          <span className="text-xs">Enable camera tracking to see debug data</span>
        </div>
      ) : (
        <div className="space-y-1">
          {logs.map((log, index) => (
            <div key={index} className="border-l-2 border-gray-600 pl-3">
              <div className="text-gray-400 text-xs">
                {formatTime(log.timestamp)}
              </div>
              <div className={`${getLogColor(log.type)} break-words`}>
                {log.message}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {logs.length > 0 && (
        <button
          onClick={() => setLogs([])}
          className="mt-2 text-xs text-gray-400 hover:text-white transition-colors"
        >
          Clear Logs
        </button>
      )}
    </div>
  );
}