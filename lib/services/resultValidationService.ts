import { supabase } from '@/lib/supabase';
import { createSupabaseServiceClient } from '@/lib/supabase';

export interface ValidationResult {
  id: string;
  result_id: string;
  validation_type: 'consistency' | 'quality' | 'confidence' | 'content';
  status: 'pass' | 'fail' | 'warning' | 'pending';
  score: number; // 0-1 scale
  feedback: string;
  automated: boolean;
  validator_id?: string;
  validated_at: string;
  validation_data: Record<string, any>;
}

export interface QualityMetrics {
  overallScore: number;
  consistencyScore: number;
  confidenceScore: number;
  contentQualityScore: number;
  responseTimeScore: number;
  breakdown: {
    consistency: {
      score: number;
      checks: Array<{
        name: string;
        passed: boolean;
        weight: number;
        details: string;
      }>;
    };
    confidence: {
      score: number;
      level: 'high' | 'medium' | 'low';
      threshold: number;
      actual: number;
    };
    content: {
      score: number;
      checks: Array<{
        name: string;
        passed: boolean;
        weight: number;
        details: string;
      }>;
    };
    performance: {
      score: number;
      executionTime: number;
      benchmark: number;
      efficiency: number;
    };
  };
  recommendations: Array<{
    type: 'improve_prompt' | 'adjust_parameters' | 'review_data' | 'manual_review';
    priority: 'high' | 'medium' | 'low';
    message: string;
    action: string;
  }>;
}

export interface ConsistencyCheck {
  duplicateResponsesFound: boolean;
  responseVarianceScore: number;
  timeVarianceScore: number;
  patternAnomalies: string[];
  crossJobConsistency: number;
}

export interface ApprovalWorkflow {
  id: string;
  result_id: string;
  workflow_type: 'auto' | 'manual' | 'hybrid';
  status: 'pending' | 'approved' | 'rejected' | 'requires_review';
  assigned_reviewer?: string;
  approval_criteria: {
    minQualityScore: number;
    minConfidenceScore: number;
    requiresManualReview: boolean;
    customCriteria: Record<string, any>;
  };
  review_notes?: string;
  approved_at?: string;
  approved_by?: string;
}

export class ResultValidationService {
  private supabase = createSupabaseServiceClient();

  /**
   * Validate a single job result comprehensively
   */
  async validateResult(resultId: string, options: {
    includeConsistencyCheck?: boolean;
    compareWithSimilarResults?: boolean;
    autoApprove?: boolean;
  } = {}): Promise<QualityMetrics> {
    try {
      // Get the result data
      const { data: result, error } = await this.supabase
        .from('job_results')
        .select(`
          *,
          job:jobs!job_results_job_id_fkey(id, name, status),
          stage:pipeline_stages!job_results_stage_id_fkey(
            stage_order,
            prompt:prompts!pipeline_stages_prompt_id_fkey(name, type, prompt)
          ),
          image:images!job_results_image_id_fkey(id, image_url, metadata)
        `)
        .eq('id', resultId)
        .single();

      if (error || !result) {
        throw new Error(`Failed to fetch result: ${error?.message}`);
      }

      // Perform validation checks
      const consistencyCheck = options.includeConsistencyCheck 
        ? await this.performConsistencyCheck(result, options.compareWithSimilarResults)
        : null;

      const qualityMetrics = await this.calculateQualityMetrics(result, consistencyCheck);

      // Store validation results
      await this.storeValidationResults(resultId, qualityMetrics);

      // Handle approval workflow if enabled
      if (options.autoApprove) {
        await this.processApprovalWorkflow(resultId, qualityMetrics);
      }

      return qualityMetrics;
    } catch (error) {
      console.error('Error validating result:', error);
      throw error;
    }
  }

  /**
   * Perform consistency checks across similar results
   */
  private async performConsistencyCheck(
    result: any, 
    compareWithSimilar: boolean = true
  ): Promise<ConsistencyCheck> {
    const checks: ConsistencyCheck = {
      duplicateResponsesFound: false,
      responseVarianceScore: 1.0,
      timeVarianceScore: 1.0,
      patternAnomalies: [],
      crossJobConsistency: 1.0
    };

    if (!compareWithSimilar) return checks;

    try {
      // Find similar results (same stage, similar images)
      const { data: similarResults, error } = await this.supabase
        .from('job_results')
        .select('id, result, executed_at')
        .eq('stage_id', result.stage_id)
        .neq('id', result.id)
        .limit(50);

      if (error || !similarResults || similarResults.length === 0) {
        return checks;
      }

      // Check for duplicate responses
      const currentResponse = JSON.stringify(result.result?.response || '');
      const duplicates = similarResults.filter((r: any) => 
        JSON.stringify(r.result?.response || '') === currentResponse
      );
      
      checks.duplicateResponsesFound = duplicates.length > 0;

      // Calculate response variance
      const responses = similarResults.map((r: any) => r.result?.response || '');
      const uniqueResponses = new Set(responses).size;
      checks.responseVarianceScore = responses.length > 0 ? uniqueResponses / responses.length : 1.0;

      // Calculate execution time variance
      const executionTimes = similarResults
        .map((r: any) => r.result?.executionTime)
        .filter((time: any): time is number => time !== undefined);
      
      if (executionTimes.length > 0) {
        const avgTime = executionTimes.reduce((sum: number, time: number) => sum + time, 0) / executionTimes.length;
        const currentTime = result.result?.executionTime || 0;
        const timeDeviation = Math.abs(currentTime - avgTime) / avgTime;
        checks.timeVarianceScore = Math.max(0, 1 - timeDeviation);

        // Flag significant time anomalies
        if (timeDeviation > 0.5) {
          checks.patternAnomalies.push(`Execution time significantly different from average (${timeDeviation.toFixed(2)}x deviation)`);
        }
      }

      // Cross-job consistency (simplified)
      const confidences = similarResults
        .map((r: any) => r.result?.confidence)
        .filter((conf: any): conf is number => conf !== undefined);
      
      if (confidences.length > 0) {
        const avgConfidence = confidences.reduce((sum: number, conf: number) => sum + conf, 0) / confidences.length;
        const currentConfidence = result.result?.confidence || 0;
        const confidenceDeviation = Math.abs(currentConfidence - avgConfidence);
        checks.crossJobConsistency = Math.max(0, 1 - confidenceDeviation);
      }

      return checks;
    } catch (error) {
      console.error('Error performing consistency check:', error);
      return checks;
    }
  }

  /**
   * Calculate comprehensive quality metrics for a result
   */
  private async calculateQualityMetrics(
    result: any, 
    consistencyCheck: ConsistencyCheck | null
  ): Promise<QualityMetrics> {
    const response = result.result?.response || '';
    const confidence = result.result?.confidence || 0;
    const executionTime = result.result?.executionTime || 0;
    const success = result.result?.success || false;
    const promptType = result.stage?.prompt?.type || 'descriptive';

    // Consistency scoring
    const consistencyScore = consistencyCheck ? this.calculateConsistencyScore(consistencyCheck) : 1.0;
    const consistencyChecks = consistencyCheck ? this.generateConsistencyChecks(consistencyCheck) : [];

    // Confidence scoring
    const confidenceScore = confidence;
    const confidenceLevel: 'high' | 'medium' | 'low' = 
      confidence > 0.8 ? 'high' : confidence > 0.5 ? 'medium' : 'low';

    // Content quality scoring
    const contentQuality = this.assessContentQuality(response, promptType, success);

    // Performance scoring
    const performanceScore = this.assessPerformance(executionTime, promptType);

    // Overall score calculation
    const weights = {
      consistency: 0.2,
      confidence: 0.3,
      content: 0.3,
      performance: 0.2
    };

    const overallScore = 
      (consistencyScore * weights.consistency) +
      (confidenceScore * weights.confidence) +
      (contentQuality.score * weights.content) +
      (performanceScore.score * weights.performance);

    // Generate recommendations
    const recommendations = this.generateRecommendations({
      overall: overallScore,
      consistency: consistencyScore,
      confidence: confidenceScore,
      content: contentQuality.score,
      performance: performanceScore.score,
      promptType,
      success
    });

    return {
      overallScore,
      consistencyScore,
      confidenceScore,
      contentQualityScore: contentQuality.score,
      responseTimeScore: performanceScore.score,
      breakdown: {
        consistency: {
          score: consistencyScore,
          checks: consistencyChecks
        },
        confidence: {
          score: confidenceScore,
          level: confidenceLevel,
          threshold: 0.7, // Configurable threshold
          actual: confidence
        },
        content: {
          score: contentQuality.score,
          checks: contentQuality.checks
        },
        performance: {
          score: performanceScore.score,
          executionTime,
          benchmark: performanceScore.benchmark,
          efficiency: performanceScore.efficiency
        }
      },
      recommendations
    };
  }

  /**
   * Calculate consistency score from checks
   */
  private calculateConsistencyScore(checks: ConsistencyCheck): number {
    let score = 1.0;

    // Penalize duplicates
    if (checks.duplicateResponsesFound) {
      score -= 0.3;
    }

    // Factor in variance scores
    score *= (checks.responseVarianceScore * 0.4 + checks.timeVarianceScore * 0.3 + checks.crossJobConsistency * 0.3);

    // Penalize pattern anomalies
    score -= (checks.patternAnomalies.length * 0.1);

    return Math.max(0, score);
  }

  /**
   * Generate consistency check results
   */
  private generateConsistencyChecks(checks: ConsistencyCheck): Array<{
    name: string;
    passed: boolean;
    weight: number;
    details: string;
  }> {
    return [
      {
        name: 'Duplicate Detection',
        passed: !checks.duplicateResponsesFound,
        weight: 0.3,
        details: checks.duplicateResponsesFound ? 'Duplicate response found in similar results' : 'No duplicate responses detected'
      },
      {
        name: 'Response Variance',
        passed: checks.responseVarianceScore > 0.7,
        weight: 0.4,
        details: `Response variance score: ${(checks.responseVarianceScore * 100).toFixed(1)}%`
      },
      {
        name: 'Execution Time Consistency',
        passed: checks.timeVarianceScore > 0.7,
        weight: 0.3,
        details: `Time variance score: ${(checks.timeVarianceScore * 100).toFixed(1)}%`
      }
    ];
  }

  /**
   * Assess content quality based on prompt type and response
   */
  private assessContentQuality(response: string, promptType: string, success: boolean): {
    score: number;
    checks: Array<{
      name: string;
      passed: boolean;
      weight: number;
      details: string;
    }>;
  } {
    const checks: Array<{
      name: string;
      passed: boolean;
      weight: number;
      details: string;
    }> = [];
    let score = success ? 0.8 : 0.2; // Base score from success

    switch (promptType) {
      case 'boolean':
        const booleanResponse = response.toLowerCase().trim();
        const validBooleans = ['true', 'false', 'yes', 'no', '1', '0'];
        const isValidBoolean = validBooleans.includes(booleanResponse);
        
        checks.push({
          name: 'Boolean Format',
          passed: isValidBoolean,
          weight: 0.8,
          details: isValidBoolean ? 'Valid boolean response format' : 'Invalid boolean response format'
        });

        if (isValidBoolean) score += 0.15;
        break;

      case 'keywords':
        const keywords = response.split(',').map(k => k.trim()).filter(k => k.length > 0);
        const hasMultipleKeywords = keywords.length >= 2;
        const averageKeywordLength = keywords.length > 0 ? keywords.reduce((sum, k) => sum + k.length, 0) / keywords.length : 0;
        
        checks.push({
          name: 'Keyword Count',
          passed: hasMultipleKeywords,
          weight: 0.4,
          details: `Found ${keywords.length} keywords`
        });

        checks.push({
          name: 'Keyword Quality',
          passed: averageKeywordLength > 3 && averageKeywordLength < 20,
          weight: 0.4,
          details: `Average keyword length: ${averageKeywordLength.toFixed(1)} characters`
        });

        if (hasMultipleKeywords) score += 0.1;
        if (averageKeywordLength > 3 && averageKeywordLength < 20) score += 0.1;
        break;

      case 'descriptive':
        const wordCount = response.trim().split(/\s+/).length;
        const sentenceCount = response.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
        const hasMinimumDetail = wordCount >= 10;
        const hasGoodStructure = sentenceCount >= 2;
        
        checks.push({
          name: 'Response Length',
          passed: hasMinimumDetail,
          weight: 0.3,
          details: `Word count: ${wordCount} words`
        });

        checks.push({
          name: 'Structure Quality',
          passed: hasGoodStructure,
          weight: 0.3,
          details: `Sentence count: ${sentenceCount} sentences`
        });

        if (hasMinimumDetail) score += 0.1;
        if (hasGoodStructure) score += 0.1;
        break;
    }

    // Common quality checks
    const hasResponse = Boolean(response && response.trim().length > 0);
    const isNotError = !response.toLowerCase().includes('error') && !response.toLowerCase().includes('failed');
    
    checks.push({
      name: 'Response Presence',
      passed: hasResponse,
      weight: 0.2,
      details: hasResponse ? 'Response contains content' : 'Empty or missing response'
    });

    checks.push({
      name: 'Error Detection',
      passed: isNotError,
      weight: 0.2,
      details: isNotError ? 'No error indicators detected' : 'Error indicators found in response'
    });

    if (!hasResponse) score = 0;
    if (!isNotError) score *= 0.5;

    return {
      score: Math.min(1, Math.max(0, score)),
      checks
    };
  }

  /**
   * Assess performance based on execution time and prompt type
   */
  private assessPerformance(executionTime: number, promptType: string): {
    score: number;
    benchmark: number;
    efficiency: number;
  } {
    // Benchmark times by prompt type (in milliseconds)
    const benchmarks = {
      'boolean': 2000,
      'keywords': 4000,
      'descriptive': 8000
    };

    const benchmark = benchmarks[promptType as keyof typeof benchmarks] || 5000;
    const efficiency = Math.max(0, 1 - (executionTime / (benchmark * 2))); // 2x benchmark is 0 score
    const score = Math.min(1, benchmark / Math.max(executionTime, 100)); // Minimum 100ms to avoid division by zero

    return {
      score: Math.min(1, Math.max(0, score)),
      benchmark,
      efficiency
    };
  }

  /**
   * Generate improvement recommendations
   */
  private generateRecommendations(metrics: {
    overall: number;
    consistency: number;
    confidence: number;
    content: number;
    performance: number;
    promptType: string;
    success: boolean;
  }): Array<{
    type: 'improve_prompt' | 'adjust_parameters' | 'review_data' | 'manual_review';
    priority: 'high' | 'medium' | 'low';
    message: string;
    action: string;
  }> {
    const recommendations = [];

    // Overall quality recommendations
    if (metrics.overall < 0.6) {
      recommendations.push({
        type: 'manual_review' as const,
        priority: 'high' as const,
        message: 'Low overall quality score detected',
        action: 'Review this result manually and consider re-running with improved settings'
      });
    }

    // Confidence recommendations
    if (metrics.confidence < 0.5) {
      recommendations.push({
        type: 'improve_prompt' as const,
        priority: 'high' as const,
        message: 'Low confidence score indicates unclear prompt or difficult image',
        action: 'Refine prompt wording or provide more specific instructions'
      });
    } else if (metrics.confidence < 0.7) {
      recommendations.push({
        type: 'adjust_parameters' as const,
        priority: 'medium' as const,
        message: 'Moderate confidence score could be improved',
        action: 'Consider adjusting model temperature or providing more examples'
      });
    }

    // Content quality recommendations
    if (metrics.content < 0.6) {
      recommendations.push({
        type: 'improve_prompt' as const,
        priority: 'high' as const,
        message: 'Content quality below expectations',
        action: `Improve prompt specificity for ${metrics.promptType} responses`
      });
    }

    // Performance recommendations
    if (metrics.performance < 0.5) {
      recommendations.push({
        type: 'adjust_parameters' as const,
        priority: 'medium' as const,
        message: 'Slow execution time detected',
        action: 'Consider optimizing image size or simplifying prompt complexity'
      });
    }

    // Consistency recommendations
    if (metrics.consistency < 0.7) {
      recommendations.push({
        type: 'review_data' as const,
        priority: 'medium' as const,
        message: 'Inconsistent results detected',
        action: 'Review input data quality and prompt consistency across similar jobs'
      });
    }

    // Success-based recommendations
    if (!metrics.success) {
      recommendations.push({
        type: 'manual_review' as const,
        priority: 'high' as const,
        message: 'Job marked as failed',
        action: 'Investigate error cause and consider re-running with different parameters'
      });
    }

    return recommendations;
  }

  /**
   * Store validation results in database
   */
  private async storeValidationResults(resultId: string, metrics: QualityMetrics): Promise<void> {
    try {
      const validationEntries = [
        {
          result_id: resultId,
          validation_type: 'quality',
          status: metrics.overallScore > 0.7 ? 'pass' : metrics.overallScore > 0.5 ? 'warning' : 'fail',
          score: metrics.overallScore,
          feedback: `Overall quality score: ${(metrics.overallScore * 100).toFixed(1)}%`,
          automated: true,
          validated_at: new Date().toISOString(),
          validation_data: metrics
        }
      ];

      const { error } = await this.supabase
        .from('result_validations')
        .insert(validationEntries);

      if (error) {
        console.error('Error storing validation results:', error);
      }
    } catch (error) {
      console.error('Error storing validation results:', error);
    }
  }

  /**
   * Process approval workflow based on quality metrics
   */
  private async processApprovalWorkflow(resultId: string, metrics: QualityMetrics): Promise<void> {
    try {
      let status: 'pending' | 'approved' | 'rejected' | 'requires_review' = 'pending';
      
      // Auto-approval criteria
      if (metrics.overallScore >= 0.8 && metrics.confidenceScore >= 0.7) {
        status = 'approved';
      } else if (metrics.overallScore < 0.5) {
        status = 'rejected';
      } else {
        status = 'requires_review';
      }

      const workflowEntry: any = {
        result_id: resultId,
        workflow_type: 'auto',
        status,
        approval_criteria: {
          minQualityScore: 0.8,
          minConfidenceScore: 0.7,
          requiresManualReview: status === 'requires_review',
          customCriteria: {}
        },
        review_notes: `Auto-processed with quality score: ${(metrics.overallScore * 100).toFixed(1)}%`
      };

      if (status === 'approved') {
        workflowEntry.approved_at = new Date().toISOString();
        workflowEntry.approved_by = 'system';
      }

      const { error } = await this.supabase
        .from('result_approvals')
        .insert([workflowEntry]);

      if (error) {
        console.error('Error processing approval workflow:', error);
      }
    } catch (error) {
      console.error('Error processing approval workflow:', error);
    }
  }

  /**
   * Batch validate multiple results
   */
  async batchValidateResults(
    resultIds: string[], 
    options: {
      includeConsistencyCheck?: boolean;
      compareWithSimilarResults?: boolean;
      autoApprove?: boolean;
    } = {}
  ): Promise<Map<string, QualityMetrics>> {
    const results = new Map<string, QualityMetrics>();
    const batchSize = 10; // Process in batches to avoid overwhelming the system

    for (let i = 0; i < resultIds.length; i += batchSize) {
      const batch = resultIds.slice(i, i + batchSize);
      const batchPromises = batch.map(async (resultId) => {
        try {
          const metrics = await this.validateResult(resultId, options);
          return { resultId, metrics };
        } catch (error) {
          console.error(`Error validating result ${resultId}:`, error);
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach(result => {
        if (result) {
          results.set(result.resultId, result.metrics);
        }
      });
    }

    return results;
  }

  /**
   * Get validation history for a result
   */
  async getValidationHistory(resultId: string): Promise<ValidationResult[]> {
    try {
      const { data, error } = await this.supabase
        .from('result_validations')
        .select('*')
        .eq('result_id', resultId)
        .order('validated_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching validation history:', error);
      throw error;
    }
  }

  /**
   * Get approval status for a result
   */
  async getApprovalStatus(resultId: string): Promise<ApprovalWorkflow | null> {
    try {
      const { data, error } = await this.supabase
        .from('result_approvals')
        .select('*')
        .eq('result_id', resultId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "not found"
      return data;
    } catch (error) {
      console.error('Error fetching approval status:', error);
      return null;
    }
  }

  /**
   * Update approval status (for manual review)
   */
  async updateApprovalStatus(
    resultId: string, 
    status: 'approved' | 'rejected',
    reviewerId: string,
    notes?: string
  ): Promise<void> {
    try {
      const updates: any = {
        status,
        review_notes: notes,
        approved_by: reviewerId,
        approved_at: new Date().toISOString()
      };

      const { error } = await this.supabase
        .from('result_approvals')
        .update(updates)
        .eq('result_id', resultId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating approval status:', error);
      throw error;
    }
  }

  /**
   * Get quality statistics for a job or set of results
   */
  async getQualityStatistics(filters: {
    jobId?: string;
    dateFrom?: Date;
    dateTo?: Date;
    stageId?: string;
  }): Promise<{
    totalResults: number;
    averageQualityScore: number;
    qualityDistribution: {
      excellent: number; // >0.8
      good: number; // 0.6-0.8
      fair: number; // 0.4-0.6
      poor: number; // <0.4
    };
    commonIssues: Array<{
      issue: string;
      count: number;
      percentage: number;
    }>;
    approvalStats: {
      autoApproved: number;
      manualApproved: number;
      rejected: number;
      pending: number;
    };
  }> {
    try {
      // This would require complex queries across validation and approval tables
      // For now, returning a placeholder structure
      return {
        totalResults: 0,
        averageQualityScore: 0,
        qualityDistribution: {
          excellent: 0,
          good: 0,
          fair: 0,
          poor: 0
        },
        commonIssues: [],
        approvalStats: {
          autoApproved: 0,
          manualApproved: 0,
          rejected: 0,
          pending: 0
        }
      };
    } catch (error) {
      console.error('Error getting quality statistics:', error);
      throw error;
    }
  }
} 