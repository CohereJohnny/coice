import React, { useState, useMemo, useCallback } from 'react';
import { JobResult } from '@/lib/services/jobResultService';
import { 
  Download,
  X,
  ArrowLeftRight,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Eye,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  Copy
} from 'lucide-react';

export interface JobResultsComparisonProps {
  results: JobResult[];
  onRemoveResult?: (resultId: string) => void;
  onExportComparison?: () => void;
  onClose?: () => void;
  maxResults?: number;
}

interface ComparisonMetrics {
  avgConfidence: number;
  avgExecutionTime: number;
  successRate: number;
  totalTokens: number;
  commonStages: string[];
  differences: Array<{
    type: 'confidence' | 'execution_time' | 'response_length' | 'status';
    field: string;
    values: any[];
    variance: number;
  }>;
}

export function JobResultsComparison({
  results,
  onRemoveResult,
  onExportComparison,
  onClose,
  maxResults = 4
}: JobResultsComparisonProps) {
  const [selectedTab, setSelectedTab] = useState<'overview' | 'responses' | 'metadata'>('overview');
  const [showDiffHighlight, setShowDiffHighlight] = useState(true);

  // Calculate comparison metrics
  const metrics = useMemo((): ComparisonMetrics => {
    if (results.length === 0) {
      return {
        avgConfidence: 0,
        avgExecutionTime: 0,
        successRate: 0,
        totalTokens: 0,
        commonStages: [],
        differences: []
      };
    }

    const confidences = results
      .map(r => r.result?.confidence)
      .filter((c): c is number => c !== undefined);
    
    const executionTimes = results
      .map(r => r.result?.executionTime)
      .filter((t): t is number => t !== undefined);

    const responseLengths = results
      .map(r => r.result?.response?.length || 0);

    const avgConfidence = confidences.length > 0 
      ? confidences.reduce((sum, c) => sum + c, 0) / confidences.length 
      : 0;

    const avgExecutionTime = executionTimes.length > 0
      ? executionTimes.reduce((sum, t) => sum + t, 0) / executionTimes.length
      : 0;

    const successCount = results.filter(r => r.result?.success).length;
    const successRate = results.length > 0 ? successCount / results.length : 0;

    // Find common stages
    const allStages = results.map(r => r.stage?.prompt?.name || `Stage ${r.stage?.stage_order}`);
    const commonStages = [...new Set(allStages)];

    // Calculate differences
    const differences = [];

    // Confidence variance
    if (confidences.length > 1) {
      const confidenceVariance = Math.sqrt(
        confidences.reduce((sum, c) => sum + Math.pow(c - avgConfidence, 2), 0) / confidences.length
      );
      differences.push({
        type: 'confidence' as const,
        field: 'Confidence',
        values: confidences,
        variance: confidenceVariance
      });
    }

    // Execution time variance
    if (executionTimes.length > 1) {
      const timeVariance = Math.sqrt(
        executionTimes.reduce((sum, t) => sum + Math.pow(t - avgExecutionTime, 2), 0) / executionTimes.length
      );
      differences.push({
        type: 'execution_time' as const,
        field: 'Execution Time',
        values: executionTimes,
        variance: timeVariance
      });
    }

    // Response length variance
    if (responseLengths.length > 1) {
      const avgLength = responseLengths.reduce((sum, l) => sum + l, 0) / responseLengths.length;
      const lengthVariance = Math.sqrt(
        responseLengths.reduce((sum, l) => sum + Math.pow(l - avgLength, 2), 0) / responseLengths.length
      );
      differences.push({
        type: 'response_length' as const,
        field: 'Response Length',
        values: responseLengths,
        variance: lengthVariance
      });
    }

    return {
      avgConfidence,
      avgExecutionTime,
      successRate,
      totalTokens: executionTimes.reduce((sum, t) => sum + t, 0),
      commonStages,
      differences
    };
  }, [results]);

  // Format utilities
  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  const formatConfidence = useCallback((confidence?: number) => {
    if (confidence === undefined || confidence === null) return 'N/A';
    return `${Math.round(confidence * 100)}%`;
  }, []);

  const formatExecutionTime = useCallback((time?: number) => {
    if (!time) return 'N/A';
    return time > 1000 ? `${(time / 1000).toFixed(1)}s` : `${time}ms`;
  }, []);

  // Status icon utility
  const getStatusIcon = useCallback((result: JobResult) => {
    if (result.result?.success) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    } else if (result.result?.error) {
      return <XCircle className="h-4 w-4 text-red-500" />;
    } else {
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  }, []);

  // Diff highlighting for text comparison
  const highlightDifferences = useCallback((texts: string[]) => {
    if (!showDiffHighlight || texts.length < 2) {
      return texts.map(text => ({ text, isHighlighted: false }));
    }

    // Simple word-level diff highlighting
    const allWords = new Set(texts.join(' ').toLowerCase().split(/\s+/));
    const wordCounts = Array.from(allWords).map(word => ({
      word,
      counts: texts.map(text => 
        (text.toLowerCase().split(/\s+/).filter(w => w === word).length)
      )
    }));

    return texts.map((text, index) => {
      const words = text.split(/\s+/);
      const highlightedWords = words.map(word => {
        const wordData = wordCounts.find(wc => wc.word === word.toLowerCase());
        const isUnique = wordData ? wordData.counts[index] > 0 && 
          wordData.counts.filter((count, i) => i !== index && count > 0).length === 0 : false;
        
        return {
          word,
          isHighlighted: isUnique
        };
      });

      return {
        text: highlightedWords,
        isHighlighted: false
      };
    });
  }, [showDiffHighlight]);

  // Export comparison data
  const handleExport = useCallback(() => {
    const exportData = {
      comparisonDate: new Date().toISOString(),
      resultsCount: results.length,
      metrics,
      results: results.map(result => ({
        id: result.id,
        stage: result.stage?.prompt?.name || `Stage ${result.stage?.stage_order}`,
        status: result.result?.success ? 'success' : 'failed',
        confidence: result.result?.confidence,
        executionTime: result.result?.executionTime,
        response: result.result?.response,
        error: result.result?.error,
        executedAt: result.executed_at,
        imageId: result.image_id
      }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `job-results-comparison-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    onExportComparison?.();
  }, [results, metrics, onExportComparison]);

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ArrowLeftRight className="h-5 w-5 text-blue-600" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Results Comparison
              </h2>
              <p className="text-sm text-gray-600">
                Comparing {results.length} job result{results.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showDiffHighlight}
                onChange={(e) => setShowDiffHighlight(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Highlight differences
            </label>
            
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
            
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Metrics Summary */}
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {formatConfidence(metrics.avgConfidence)}
            </div>
            <div className="text-sm text-gray-600">Avg Confidence</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {formatExecutionTime(metrics.avgExecutionTime)}
            </div>
            <div className="text-sm text-gray-600">Avg Time</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {Math.round(metrics.successRate * 100)}%
            </div>
            <div className="text-sm text-gray-600">Success Rate</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {metrics.differences.length}
            </div>
            <div className="text-sm text-gray-600">Key Differences</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'responses', label: 'Responses' },
            { id: 'metadata', label: 'Metadata' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as any)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                selectedTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-4">
        {selectedTab === 'overview' && (
          <div className="space-y-6">
            {/* Results Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {results.map((result, index) => (
                <div key={result.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(result)}
                      <span className="text-sm font-medium">
                        Result {index + 1}
                      </span>
                    </div>
                    
                    {onRemoveResult && (
                      <button
                        onClick={() => onRemoveResult(result.id)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-600">Stage:</span>
                      <span className="ml-1 font-medium">
                        {result.stage?.prompt?.name || `Stage ${result.stage?.stage_order}`}
                      </span>
                    </div>
                    
                    <div>
                      <span className="text-gray-600">Confidence:</span>
                      <span className="ml-1 font-medium">
                        {formatConfidence(result.result?.confidence)}
                      </span>
                    </div>
                    
                    <div>
                      <span className="text-gray-600">Execution:</span>
                      <span className="ml-1 font-medium">
                        {formatExecutionTime(result.result?.executionTime)}
                      </span>
                    </div>
                    
                    <div>
                      <span className="text-gray-600">Date:</span>
                      <span className="ml-1 font-medium">
                        {formatDate(result.executed_at)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Key Differences */}
            {metrics.differences.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Key Differences</h3>
                <div className="space-y-3">
                  {metrics.differences.map((diff, index) => (
                    <div key={index} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-yellow-800">{diff.field}</span>
                        <span className="text-sm text-yellow-600">
                          Variance: {diff.variance.toFixed(3)}
                        </span>
                      </div>
                      
                      <div className="mt-2 flex flex-wrap gap-2">
                        {diff.values.map((value, valueIndex) => (
                          <span key={valueIndex} className="text-sm bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
                            Result {valueIndex + 1}: {
                              diff.type === 'confidence' ? formatConfidence(value) :
                              diff.type === 'execution_time' ? formatExecutionTime(value) :
                              diff.type === 'response_length' ? `${value} chars` :
                              value
                            }
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {selectedTab === 'responses' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Response Comparison</h3>
              <div className="text-sm text-gray-600">
                {showDiffHighlight ? 'Unique words highlighted' : 'Raw responses'}
              </div>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2">
              {results.map((result, index) => {
                const response = result.result?.response || result.result?.error || 'No response';
                const highlighted = showDiffHighlight ? 
                  highlightDifferences(results.map(r => r.result?.response || r.result?.error || 'No response'))[index] :
                  { text: response, isHighlighted: false };
                
                return (
                  <div key={result.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(result)}
                        <span className="font-medium">Result {index + 1}</span>
                      </div>
                      
                      <button
                        onClick={() => navigator.clipboard.writeText(response)}
                        className="text-gray-400 hover:text-gray-600"
                        title="Copy response"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <div className="text-sm text-gray-600 mb-2">
                      Stage: {result.stage?.prompt?.name || `Stage ${result.stage?.stage_order}`}
                    </div>
                    
                    <div className="bg-gray-50 rounded p-3 max-h-48 overflow-y-auto">
                      {typeof highlighted.text === 'string' ? (
                        <div className="text-sm text-gray-700 whitespace-pre-wrap">
                          {highlighted.text}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-700 whitespace-pre-wrap">
                          {highlighted.text.map((wordData: any, wordIndex: number) => (
                            <span
                              key={wordIndex}
                              className={wordData.isHighlighted ? 'bg-yellow-200 px-1 rounded' : ''}
                            >
                              {wordData.word}
                              {wordIndex < highlighted.text.length - 1 ? ' ' : ''}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {selectedTab === 'metadata' && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Detailed Metadata</h3>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Result
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Confidence
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Execution Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stage
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {results.map((result, index) => (
                    <tr key={result.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        Result {index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(result)}
                          <span className="text-sm text-gray-700">
                            {result.result?.success ? 'Success' : 'Failed'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {formatConfidence(result.result?.confidence)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {formatExecutionTime(result.result?.executionTime)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {result.stage?.prompt?.name || `Stage ${result.stage?.stage_order}`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {formatDate(result.executed_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 