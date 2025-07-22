/**
 * VIDA³ Streaming Status Indicator
 * Real-time status display for streaming connections, quality, and errors
 */

import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Wifi, WifiOff, Activity, Settings } from 'lucide-react';

interface StreamingStatus {
  isConnected: boolean;
  isStreaming: boolean;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  fps: number;
  latency: number;
  bitrate: number;
  errors: string[];
  warnings: string[];
}

interface StreamingStatusIndicatorProps {
  streamId?: string;
  onRetry?: () => void;
  onSettings?: () => void;
  className?: string;
}

export const StreamingStatusIndicator: React.FC<StreamingStatusIndicatorProps> = ({
  streamId,
  onRetry,
  onSettings,
  className = ''
}) => {
  const [status, setStatus] = useState<StreamingStatus>({
    isConnected: false,
    isStreaming: false,
    quality: 'fair',
    fps: 0,
    latency: 0,
    bitrate: 0,
    errors: [],
    warnings: []
  });

  const [isExpanded, setIsExpanded] = useState(false);

  // Simulate real-time status updates
  useEffect(() => {
    const updateStatus = () => {
      setStatus(prev => ({
        ...prev,
        fps: Math.floor(Math.random() * 10) + 25, // 25-35 FPS
        latency: Math.floor(Math.random() * 50) + 50, // 50-100ms
        bitrate: Math.floor(Math.random() * 2000) + 3000, // 3000-5000 kbps
        quality: ['excellent', 'good', 'fair', 'poor'][Math.floor(Math.random() * 4)] as any
      }));
    };

    const interval = setInterval(updateStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'excellent': return 'text-green-500';
      case 'good': return 'text-blue-500';
      case 'fair': return 'text-yellow-500';
      case 'poor': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusIcon = () => {
    if (!status.isConnected) {
      return <WifiOff className="w-5 h-5 text-red-500" />;
    }
    if (status.isStreaming) {
      return <Activity className="w-5 h-5 text-green-500 animate-pulse" />;
    }
    return <Wifi className="w-5 h-5 text-blue-500" />;
  };

  const getStatusText = () => {
    if (!status.isConnected) return 'Disconnected';
    if (status.isStreaming) return 'Live';
    return 'Ready';
  };

  return (
    <div className={`bg-white rounded-lg shadow-md border ${className}`}>
      {/* Main Status Bar */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center space-x-3">
          {getStatusIcon()}
          <div>
            <div className="font-semibold text-gray-900">
              {getStatusText()}
            </div>
            <div className="text-sm text-gray-500">
              Quality: <span className={getQualityColor(status.quality)}>{status.quality}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {onRetry && (
            <button
              onClick={onRetry}
              className="p-2 text-gray-500 hover:text-blue-500 transition-colors"
              title="Retry Connection"
            >
              <Activity className="w-4 h-4" />
            </button>
          )}
          
          {onSettings && (
            <button
              onClick={onSettings}
              className="p-2 text-gray-500 hover:text-blue-500 transition-colors"
              title="Stream Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 text-gray-500 hover:text-blue-500 transition-colors"
            title="Toggle Details"
          >
            <svg
              className={`w-4 h-4 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-4 space-y-4">
          {/* Metrics Grid */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{status.fps}</div>
              <div className="text-sm text-gray-500">FPS</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{status.latency}ms</div>
              <div className="text-sm text-gray-500">Latency</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{status.bitrate}</div>
              <div className="text-sm text-gray-500">kbps</div>
            </div>
          </div>

          {/* Quality Indicator */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Stream Quality</span>
              <span className={`text-sm font-semibold ${getQualityColor(status.quality)}`}>
                {status.quality.toUpperCase()}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  status.quality === 'excellent' ? 'bg-green-500 w-full' :
                  status.quality === 'good' ? 'bg-blue-500 w-3/4' :
                  status.quality === 'fair' ? 'bg-yellow-500 w-1/2' :
                  'bg-red-500 w-1/4'
                }`}
              />
            </div>
          </div>

          {/* Errors and Warnings */}
          {status.errors.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-red-600">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Errors</span>
              </div>
              <div className="space-y-1">
                {status.errors.map((error, index) => (
                  <div key={index} className="text-sm text-red-600 bg-red-50 p-2 rounded">
                    {error}
                  </div>
                ))}
              </div>
            </div>
          )}

          {status.warnings.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-yellow-600">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Warnings</span>
              </div>
              <div className="space-y-1">
                {status.warnings.map((warning, index) => (
                  <div key={index} className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded">
                    {warning}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Connection Info */}
          {streamId && (
            <div className="text-xs text-gray-500">
              Stream ID: {streamId}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StreamingStatusIndicator; 