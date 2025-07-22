/**
 * VIDA³ Streaming Error Handler
 * Comprehensive error handling with user-friendly messages and automatic recovery
 */

import React, { useState, useEffect } from 'react';
import { AlertTriangle, RefreshCw, HelpCircle, X, CheckCircle } from 'lucide-react';

export interface StreamingError {
  id: string;
  type: 'connection' | 'authentication' | 'streaming' | 'network' | 'permission' | 'unknown';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details?: string;
  timestamp: Date;
  retryable: boolean;
  autoRetry?: boolean;
  retryCount?: number;
  maxRetries?: number;
}

interface StreamingErrorHandlerProps {
  errors: StreamingError[];
  onRetry: (errorId: string) => void;
  onDismiss: (errorId: string) => void;
  onAutoRetry?: (errorId: string) => void;
  className?: string;
}

export const StreamingErrorHandler: React.FC<StreamingErrorHandlerProps> = ({
  errors,
  onRetry,
  onDismiss,
  onAutoRetry,
  className = ''
}) => {
  const [expandedError, setExpandedError] = useState<string | null>(null);
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);

  // Auto-retry logic for retryable errors
  useEffect(() => {
    errors.forEach(error => {
      if (error.autoRetry && error.retryable && (error.retryCount || 0) < (error.maxRetries || 3)) {
        const timer = setTimeout(() => {
          onAutoRetry?.(error.id);
        }, 5000); // 5 second delay

        return () => clearTimeout(timer);
      }
    });
  }, [errors, onAutoRetry]);

  const getErrorIcon = (type: string) => {
    switch (type) {
      case 'connection':
        return <RefreshCw className="w-5 h-5 text-blue-500" />;
      case 'authentication':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'streaming':
        return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      case 'network':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'permission':
        return <AlertTriangle className="w-5 h-5 text-purple-500" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getErrorColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'border-red-500 bg-red-50';
      case 'high': return 'border-orange-500 bg-orange-50';
      case 'medium': return 'border-yellow-500 bg-yellow-50';
      case 'low': return 'border-blue-500 bg-blue-50';
      default: return 'border-gray-500 bg-gray-50';
    }
  };

  const getErrorMessage = (error: StreamingError) => {
    const baseMessages = {
      connection: 'Connection to streaming server failed',
      authentication: 'Authentication failed',
      streaming: 'Streaming error occurred',
      network: 'Network connectivity issue',
      permission: 'Permission denied',
      unknown: 'An unexpected error occurred'
    };

    return error.message || baseMessages[error.type] || baseMessages.unknown;
  };

  const getTroubleshootingSteps = (error: StreamingError) => {
    const steps = {
      connection: [
        'Check your internet connection',
        'Verify the streaming server is online',
        'Try refreshing the page',
        'Contact support if the issue persists'
      ],
      authentication: [
        'Log out and log back in',
        'Check if your session has expired',
        'Verify your account permissions',
        'Contact support for account issues'
      ],
      streaming: [
        'Check your camera and microphone permissions',
        'Try a different browser',
        'Restart your streaming software',
        'Check system requirements'
      ],
      network: [
        'Check your internet speed',
        'Try connecting to a different network',
        'Disable VPN if using one',
        'Contact your ISP if issues persist'
      ],
      permission: [
        'Check your subscription plan',
        'Verify you have streaming permissions',
        'Contact support for permission issues'
      ],
      unknown: [
        'Refresh the page',
        'Clear browser cache and cookies',
        'Try a different browser',
        'Contact support with error details'
      ]
    };

    return steps[error.type] || steps.unknown;
  };

  const getRetryText = (error: StreamingError) => {
    if (!error.retryable) return 'Not retryable';
    if (error.autoRetry) return 'Auto-retrying...';
    if (error.retryCount && error.maxRetries) {
      return `Retry ${error.retryCount}/${error.maxRetries}`;
    }
    return 'Retry';
  };

  if (errors.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Error List */}
      {errors.map(error => (
        <div
          key={error.id}
          className={`border-l-4 p-4 rounded-r-lg ${getErrorColor(error.severity)}`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1">
              {getErrorIcon(error.type)}
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <h4 className="font-semibold text-gray-900">
                    {getErrorMessage(error)}
                  </h4>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    error.severity === 'critical' ? 'bg-red-100 text-red-800' :
                    error.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                    error.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {error.severity.toUpperCase()}
                  </span>
                </div>
                
                <p className="text-sm text-gray-600 mt-1">
                  {error.details || 'No additional details available'}
                </p>

                <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                  <span>
                    {error.timestamp.toLocaleTimeString()}
                  </span>
                  {error.retryCount !== undefined && (
                    <span>
                      Attempts: {error.retryCount}/{error.maxRetries || '∞'}
                    </span>
                  )}
                </div>

                {/* Expanded Details */}
                {expandedError === error.id && (
                  <div className="mt-3 p-3 bg-white rounded border">
                    <h5 className="font-medium text-gray-900 mb-2">Troubleshooting Steps:</h5>
                    <ul className="space-y-1 text-sm text-gray-600">
                      {getTroubleshootingSteps(error).map((step, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <span className="text-blue-500 mt-1">•</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {error.retryable && !error.autoRetry && (
                <button
                  onClick={() => onRetry(error.id)}
                  disabled={error.retryCount && error.maxRetries && error.retryCount >= error.maxRetries}
                  className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {getRetryText(error)}
                </button>
              )}

              <button
                onClick={() => setExpandedError(expandedError === error.id ? null : error.id)}
                className="p-1 text-gray-500 hover:text-gray-700"
                title="Toggle Details"
              >
                <HelpCircle className="w-4 h-4" />
              </button>

              <button
                onClick={() => onDismiss(error.id)}
                className="p-1 text-gray-500 hover:text-gray-700"
                title="Dismiss Error"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* Global Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-200">
        <button
          onClick={() => setShowTroubleshooting(!showTroubleshooting)}
          className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-800"
        >
          <HelpCircle className="w-4 h-4" />
          <span>General Troubleshooting</span>
        </button>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => errors.filter(e => e.retryable).forEach(e => onRetry(e.id))}
            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry All
          </button>
          <button
            onClick={() => errors.forEach(e => onDismiss(e.id))}
            className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Dismiss All
          </button>
        </div>
      </div>

      {/* General Troubleshooting Guide */}
      {showTroubleshooting && (
        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-semibold text-blue-900 mb-3">General Troubleshooting Guide</h4>
          <div className="space-y-2 text-sm text-blue-800">
            <p><strong>1. Check System Requirements:</strong> Ensure your browser supports WebRTC and has camera/microphone access.</p>
            <p><strong>2. Network Issues:</strong> Try a wired connection or move closer to your router.</p>
            <p><strong>3. Browser Issues:</strong> Clear cache, disable extensions, or try a different browser.</p>
            <p><strong>4. Hardware Issues:</strong> Check if your camera and microphone are working in other applications.</p>
            <p><strong>5. Account Issues:</strong> Verify your subscription plan and streaming permissions.</p>
          </div>
          <div className="mt-3 text-xs text-blue-600">
            Still having issues? Contact support with your error details and system information.
          </div>
        </div>
      )}
    </div>
  );
};

export default StreamingErrorHandler; 