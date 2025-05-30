import React, { useState, useEffect, useMemo } from 'react';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Shield,
  TrendingUp,
  TrendingDown,
  Zap,
  Eye,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  FileCheck,
  AlertCircle,
  BarChart3,
  Target,
  Activity,
  Award,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { QualityMetrics, ValidationResult, ApprovalWorkflow } from '@/lib/services/resultValidationService';

export interface ResultValidationPanelProps {
  resultId: string;
  qualityMetrics?: QualityMetrics;
  validationHistory?: ValidationResult[];
  approvalStatus?: ApprovalWorkflow;
  onValidateResult?: (resultId: string, options: any) => void;
  onUpdateApproval?: (resultId: string, status: 'approved' | 'rejected', notes?: string) => void;
  isLoading?: boolean;
  className?: string;
}

export function ResultValidationPanel({
  resultId,
  qualityMetrics,
  validationHistory = [],
  approvalStatus,
  onValidateResult,
  onUpdateApproval,
  isLoading = false,
  className = ''
}: ResultValidationPanelProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'details' | 'history' | 'approval'>('overview');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overview']));
  const [reviewNotes, setReviewNotes] = useState('');

  // Format utilities
  const formatScore = (score: number) => `${Math.round(score * 100)}%`;
  
  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    if (score >= 0.4) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 0.8) return 'bg-green-100 border-green-200';
    if (score >= 0.6) return 'bg-yellow-100 border-yellow-200';
    if (score >= 0.4) return 'bg-orange-100 border-orange-200';
    return 'bg-red-100 border-red-200';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'fail': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'pending': return <Clock className="h-4 w-4 text-blue-500" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  // Quality score summary
  const qualitySummary = useMemo(() => {
    if (!qualityMetrics) return null;

    const { overallScore, breakdown } = qualityMetrics;
    const level = overallScore >= 0.8 ? 'Excellent' : 
                 overallScore >= 0.6 ? 'Good' : 
                 overallScore >= 0.4 ? 'Fair' : 'Poor';

    return {
      level,
      score: overallScore,
      components: [
        { name: 'Confidence', score: breakdown.confidence.score, level: breakdown.confidence.level },
        { name: 'Content Quality', score: qualityMetrics.contentQualityScore },
        { name: 'Consistency', score: qualityMetrics.consistencyScore },
        { name: 'Performance', score: qualityMetrics.responseTimeScore }
      ]
    };
  }, [qualityMetrics]);

  const handleValidateResult = () => {
    if (onValidateResult) {
      onValidateResult(resultId, {
        includeConsistencyCheck: true,
        compareWithSimilarResults: true,
        autoApprove: false
      });
    }
  };

  const handleApprovalUpdate = (status: 'approved' | 'rejected') => {
    if (onUpdateApproval) {
      onUpdateApproval(resultId, status, reviewNotes);
      setReviewNotes('');
    }
  };

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Result Validation
          </h3>
          <p className="text-sm text-gray-600">Quality metrics and validation status</p>
        </div>

        {onValidateResult && (
          <button
            onClick={handleValidateResult}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Re-validate
          </button>
        )}
      </div>

      {/* Quality Score Overview */}
      {qualitySummary && (
        <div className={`p-4 rounded-lg border ${getScoreBgColor(qualitySummary.score)}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Award className={`h-5 w-5 ${getScoreColor(qualitySummary.score)}`} />
              <span className="font-medium text-gray-900">Overall Quality: {qualitySummary.level}</span>
            </div>
            <div className={`text-2xl font-bold ${getScoreColor(qualitySummary.score)}`}>
              {formatScore(qualitySummary.score)}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {qualitySummary.components.map((component, index) => (
              <div key={index} className="text-center">
                <div className={`text-lg font-semibold ${getScoreColor(component.score)}`}>
                  {formatScore(component.score)}
                </div>
                <div className="text-xs text-gray-600">{component.name}</div>
                {component.name === 'Confidence' && component.level && (
                  <div className={`text-xs capitalize ${getScoreColor(component.score)}`}>
                    {component.level}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'details', label: 'Details', icon: Eye },
            { id: 'history', label: 'History', icon: Activity },
            { id: 'approval', label: 'Approval', icon: FileCheck }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {/* Overview Tab */}
        {activeTab === 'overview' && qualityMetrics && (
          <div className="space-y-6">
            {/* Recommendations */}
            {qualityMetrics.recommendations.length > 0 && (
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h4 className="font-medium text-gray-900 mb-3">Recommendations</h4>
                <div className="space-y-3">
                  {qualityMetrics.recommendations.map((rec, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border ${
                        rec.priority === 'high' ? 'bg-red-50 border-red-200' :
                        rec.priority === 'medium' ? 'bg-yellow-50 border-yellow-200' :
                        'bg-blue-50 border-blue-200'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-1 rounded ${
                          rec.priority === 'high' ? 'bg-red-100' :
                          rec.priority === 'medium' ? 'bg-yellow-100' :
                          'bg-blue-100'
                        }`}>
                          <Target className={`h-4 w-4 ${
                            rec.priority === 'high' ? 'text-red-600' :
                            rec.priority === 'medium' ? 'text-yellow-600' :
                            'text-blue-600'
                          }`} />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{rec.message}</div>
                          <div className="text-sm text-gray-600 mt-1">{rec.action}</div>
                          <div className={`text-xs mt-1 inline-block px-2 py-1 rounded ${
                            rec.priority === 'high' ? 'bg-red-100 text-red-700' :
                            rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {rec.priority} priority • {rec.type.replace('_', ' ')}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h4 className="font-medium text-gray-900 mb-3">Content Analysis</h4>
                <div className="space-y-2">
                  {qualityMetrics.breakdown.content.checks.map((check, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {check.passed ? 
                          <CheckCircle className="h-4 w-4 text-green-500" /> :
                          <XCircle className="h-4 w-4 text-red-500" />
                        }
                        <span className="text-sm text-gray-700">{check.name}</span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {Math.round(check.weight * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h4 className="font-medium text-gray-900 mb-3">Performance</h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Execution Time</span>
                    <span className="text-sm font-medium">
                      {qualityMetrics.breakdown.performance.executionTime > 1000 
                        ? `${(qualityMetrics.breakdown.performance.executionTime / 1000).toFixed(1)}s`
                        : `${qualityMetrics.breakdown.performance.executionTime}ms`
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Benchmark</span>
                    <span className="text-sm font-medium">
                      {qualityMetrics.breakdown.performance.benchmark > 1000 
                        ? `${(qualityMetrics.breakdown.performance.benchmark / 1000).toFixed(1)}s`
                        : `${qualityMetrics.breakdown.performance.benchmark}ms`
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Efficiency</span>
                    <span className={`text-sm font-medium ${getScoreColor(qualityMetrics.breakdown.performance.efficiency)}`}>
                      {formatScore(qualityMetrics.breakdown.performance.efficiency)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Details Tab */}
        {activeTab === 'details' && qualityMetrics && (
          <div className="space-y-6">
            {/* Consistency Checks */}
            {qualityMetrics.breakdown.consistency.checks.length > 0 && (
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <button
                  onClick={() => toggleSection('consistency')}
                  className="flex items-center justify-between w-full"
                >
                  <h4 className="font-medium text-gray-900">Consistency Checks</h4>
                  {expandedSections.has('consistency') ? 
                    <ChevronDown className="h-5 w-5 text-gray-500" /> :
                    <ChevronRight className="h-5 w-5 text-gray-500" />
                  }
                </button>

                {expandedSections.has('consistency') && (
                  <div className="mt-4 space-y-3">
                    {qualityMetrics.breakdown.consistency.checks.map((check, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                        {check.passed ? 
                          <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" /> :
                          <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                        }
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{check.name}</div>
                          <div className="text-sm text-gray-600">{check.details}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            Weight: {Math.round(check.weight * 100)}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Confidence Analysis */}
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <h4 className="font-medium text-gray-900 mb-3">Confidence Analysis</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Confidence Score</span>
                  <span className={`text-lg font-semibold ${getScoreColor(qualityMetrics.breakdown.confidence.score)}`}>
                    {formatScore(qualityMetrics.breakdown.confidence.score)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Confidence Level</span>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    qualityMetrics.breakdown.confidence.level === 'high' ? 'bg-green-100 text-green-700' :
                    qualityMetrics.breakdown.confidence.level === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {qualityMetrics.breakdown.confidence.level}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Threshold</span>
                  <span className="text-sm font-medium">
                    {formatScore(qualityMetrics.breakdown.confidence.threshold)}
                  </span>
                </div>

                {/* Confidence Bar */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>Low</span>
                    <span>High</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        qualityMetrics.breakdown.confidence.level === 'high' ? 'bg-green-500' :
                        qualityMetrics.breakdown.confidence.level === 'medium' ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${qualityMetrics.breakdown.confidence.score * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            {validationHistory.length > 0 ? (
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="px-4 py-3 border-b border-gray-200">
                  <h4 className="font-medium text-gray-900">Validation History</h4>
                </div>
                <div className="divide-y divide-gray-200">
                  {validationHistory.map((validation, index) => (
                    <div key={index} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          {getStatusIcon(validation.status)}
                          <div>
                            <div className="font-medium text-gray-900 capitalize">
                              {validation.validation_type} Validation
                            </div>
                            <div className="text-sm text-gray-600">{validation.feedback}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              {new Date(validation.validated_at).toLocaleString()} • 
                              {validation.automated ? ' Automated' : ' Manual'}
                              {validation.validator_id && ` • ${validation.validator_id}`}
                            </div>
                          </div>
                        </div>
                        <div className={`text-lg font-semibold ${getScoreColor(validation.score)}`}>
                          {formatScore(validation.score)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Activity className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p>No validation history available</p>
              </div>
            )}
          </div>
        )}

        {/* Approval Tab */}
        {activeTab === 'approval' && (
          <div className="space-y-6">
            {/* Current Approval Status */}
            {approvalStatus && (
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h4 className="font-medium text-gray-900 mb-3">Current Status</h4>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(approvalStatus.status)}
                    <div>
                      <div className="font-medium text-gray-900 capitalize">
                        {approvalStatus.status.replace('_', ' ')}
                      </div>
                      <div className="text-sm text-gray-600">
                        {approvalStatus.workflow_type} workflow
                      </div>
                    </div>
                  </div>
                  {approvalStatus.approved_at && (
                    <div className="text-right">
                      <div className="text-sm text-gray-600">
                        {new Date(approvalStatus.approved_at).toLocaleString()}
                      </div>
                      {approvalStatus.approved_by && (
                        <div className="text-xs text-gray-500">
                          by {approvalStatus.approved_by}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {approvalStatus.review_notes && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-700">{approvalStatus.review_notes}</div>
                  </div>
                )}
              </div>
            )}

            {/* Manual Review Actions */}
            {onUpdateApproval && approvalStatus?.status === 'requires_review' && (
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h4 className="font-medium text-gray-900 mb-3">Manual Review</h4>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Review Notes
                    </label>
                    <textarea
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={3}
                      placeholder="Add notes about your review decision..."
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => handleApprovalUpdate('approved')}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                    >
                      <ThumbsUp className="h-4 w-4" />
                      Approve
                    </button>
                    
                    <button
                      onClick={() => handleApprovalUpdate('rejected')}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                    >
                      <ThumbsDown className="h-4 w-4" />
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Approval Criteria */}
            {approvalStatus?.approval_criteria && (
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h4 className="font-medium text-gray-900 mb-3">Approval Criteria</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Minimum Quality Score</span>
                    <span className="font-medium">
                      {formatScore(approvalStatus.approval_criteria.minQualityScore)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Minimum Confidence Score</span>
                    <span className="font-medium">
                      {formatScore(approvalStatus.approval_criteria.minConfidenceScore)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Manual Review Required</span>
                    <span className="font-medium">
                      {approvalStatus.approval_criteria.requiresManualReview ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 