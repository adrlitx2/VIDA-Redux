/**
 * VIDA³ Streaming Analytics Dashboard
 * Real-time analytics and performance insights for streaming sessions
 */

import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, Clock, Activity, Target } from 'lucide-react';

interface StreamMetrics {
  streamId: string;
  duration: number; // seconds
  framesProcessed: number;
  framesDropped: number;
  averageFPS: number;
  averageLatency: number;
  totalDataTransferred: number; // bytes
  peakViewers: number;
  currentViewers: number;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  bitrate: number;
  errors: number;
  recoveryAttempts: number;
}

interface AnalyticsData {
  currentStream?: StreamMetrics;
  historicalData: {
    timestamp: Date;
    fps: number;
    latency: number;
    bitrate: number;
    viewers: number;
  }[];
  summary: {
    totalStreams: number;
    totalDuration: number;
    averageQuality: string;
    totalViewers: number;
    successRate: number;
  };
}

interface StreamingAnalyticsProps {
  streamId?: string;
  className?: string;
}

export const StreamingAnalytics: React.FC<StreamingAnalyticsProps> = ({
  streamId,
  className = ''
}) => {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    historicalData: [],
    summary: {
      totalStreams: 0,
      totalDuration: 0,
      averageQuality: 'good',
      totalViewers: 0,
      successRate: 95
    }
  });

  const [selectedTimeframe, setSelectedTimeframe] = useState<'1h' | '24h' | '7d' | '30d'>('1h');

  // Simulate real-time data updates
  useEffect(() => {
    const updateAnalytics = () => {
      setAnalytics(prev => {
        const newDataPoint = {
          timestamp: new Date(),
          fps: Math.floor(Math.random() * 10) + 25,
          latency: Math.floor(Math.random() * 50) + 50,
          bitrate: Math.floor(Math.random() * 2000) + 3000,
          viewers: Math.floor(Math.random() * 100) + 10
        };

        return {
          ...prev,
          currentStream: {
            streamId: streamId || 'current-stream',
            duration: Math.floor(Math.random() * 3600) + 1800, // 30-90 minutes
            framesProcessed: Math.floor(Math.random() * 10000) + 50000,
            framesDropped: Math.floor(Math.random() * 100),
            averageFPS: newDataPoint.fps,
            averageLatency: newDataPoint.latency,
            totalDataTransferred: Math.floor(Math.random() * 1000000000) + 500000000,
            peakViewers: Math.floor(Math.random() * 200) + 50,
            currentViewers: newDataPoint.viewers,
            quality: ['excellent', 'good', 'fair', 'poor'][Math.floor(Math.random() * 4)] as any,
            bitrate: newDataPoint.bitrate,
            errors: Math.floor(Math.random() * 5),
            recoveryAttempts: Math.floor(Math.random() * 3)
          },
          historicalData: [...prev.historicalData.slice(-50), newDataPoint]
        };
      });
    };

    const interval = setInterval(updateAnalytics, 3000);
    return () => clearInterval(interval);
  }, [streamId]);

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatBytes = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'excellent': return 'text-green-500';
      case 'good': return 'text-blue-500';
      case 'fair': return 'text-yellow-500';
      case 'poor': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getQualityScore = (quality: string) => {
    switch (quality) {
      case 'excellent': return 95;
      case 'good': return 80;
      case 'fair': return 60;
      case 'poor': return 30;
      default: return 50;
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-md border ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Streaming Analytics</h2>
            <p className="text-sm text-gray-500">
              Real-time performance metrics and insights
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {['1h', '24h', '7d', '30d'].map(timeframe => (
              <button
                key={timeframe}
                onClick={() => setSelectedTimeframe(timeframe as any)}
                className={`px-3 py-1 text-sm rounded ${
                  selectedTimeframe === timeframe
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {timeframe}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Current Stream Metrics */}
      {analytics.currentStream && (
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Current Stream</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-blue-500" />
                <span className="text-sm font-medium text-blue-700">Duration</span>
              </div>
              <div className="text-2xl font-bold text-blue-900 mt-1">
                {formatDuration(analytics.currentStream.duration)}
              </div>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2">
                <Activity className="w-5 h-5 text-green-500" />
                <span className="text-sm font-medium text-green-700">FPS</span>
              </div>
              <div className="text-2xl font-bold text-green-900 mt-1">
                {analytics.currentStream.averageFPS}
              </div>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-purple-500" />
                <span className="text-sm font-medium text-purple-700">Viewers</span>
              </div>
              <div className="text-2xl font-bold text-purple-900 mt-1">
                {analytics.currentStream.currentViewers}
              </div>
            </div>

            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2">
                <Target className="w-5 h-5 text-orange-500" />
                <span className="text-sm font-medium text-orange-700">Quality</span>
              </div>
              <div className={`text-2xl font-bold mt-1 ${getQualityColor(analytics.currentStream.quality)}`}>
                {analytics.currentStream.quality.toUpperCase()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Performance Metrics */}
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Metrics</h3>
        <div className="space-y-4">
          {/* FPS Chart */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Frame Rate (FPS)</span>
              <span className="text-sm text-gray-500">
                Avg: {analytics.currentStream?.averageFPS || 0} FPS
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min((analytics.currentStream?.averageFPS || 0) / 30 * 100, 100)}%` }}
              />
            </div>
          </div>

          {/* Latency Chart */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Latency</span>
              <span className="text-sm text-gray-500">
                Avg: {analytics.currentStream?.averageLatency || 0}ms
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.max(100 - (analytics.currentStream?.averageLatency || 0) / 2, 0)}%` }}
              />
            </div>
          </div>

          {/* Quality Score */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Quality Score</span>
              <span className="text-sm text-gray-500">
                {getQualityScore(analytics.currentStream?.quality || 'fair')}/100
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${getQualityColor(analytics.currentStream?.quality || 'fair').replace('text-', 'bg-')}`}
                style={{ width: `${getQualityScore(analytics.currentStream?.quality || 'fair')}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Statistics */}
      <div className="p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Stream Statistics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Frames Processed</span>
              <span className="text-sm font-medium text-gray-900">
                {analytics.currentStream?.framesProcessed.toLocaleString() || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Frames Dropped</span>
              <span className="text-sm font-medium text-gray-900">
                {analytics.currentStream?.framesDropped || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Data Transferred</span>
              <span className="text-sm font-medium text-gray-900">
                {formatBytes(analytics.currentStream?.totalDataTransferred || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Current Bitrate</span>
              <span className="text-sm font-medium text-gray-900">
                {analytics.currentStream?.bitrate || 0} kbps
              </span>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Peak Viewers</span>
              <span className="text-sm font-medium text-gray-900">
                {analytics.currentStream?.peakViewers || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Errors</span>
              <span className="text-sm font-medium text-gray-900">
                {analytics.currentStream?.errors || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Recovery Attempts</span>
              <span className="text-sm font-medium text-gray-900">
                {analytics.currentStream?.recoveryAttempts || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Success Rate</span>
              <span className="text-sm font-medium text-gray-900">
                {analytics.summary.successRate}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StreamingAnalytics; 