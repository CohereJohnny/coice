'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { JobSubmissionForm, JobMonitoringDashboard } from '@/components/jobs';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, BarChart3 } from 'lucide-react';

export function AnalysisPageContent() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('submit');

  // Handle URL parameters to switch tabs and highlight jobs
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'monitor') {
      setActiveTab('monitor');
    }
  }, [searchParams]);

  const highlightJobId = searchParams.get('job');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">AI Analysis</h1>
        <p className="text-muted-foreground">
          Submit image analysis jobs and monitor their progress in real-time
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="submit" className="flex items-center gap-2">
            <Play className="h-4 w-4" />
            Submit Job
          </TabsTrigger>
          <TabsTrigger value="monitor" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Monitor Jobs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="submit" className="space-y-6">
          {/* Side-by-side layout for Submit Job and How to Use */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Submit Analysis Job - Left Column */}
            <div className="space-y-4 h-full">
              <JobSubmissionForm 
                onJobSubmitted={(jobId) => {
                  console.log('Job submitted:', jobId);
                  // The form now handles navigation internally
                }}
              />
            </div>

            {/* How to Use AI Analysis - Right Column */}
            <div className="space-y-4 h-full">
              <Card className="bg-blue-50 border-blue-200 h-full flex flex-col">
                <CardHeader>
                  <CardTitle className="text-blue-900">How to Use AI Analysis</CardTitle>
                  <CardDescription className="text-blue-700">
                    Follow these steps to analyze your images with AI
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-blue-800 flex-1">
                  <ol className="list-decimal list-inside space-y-2">
                    <li>First, create a <strong>Pipeline</strong> with analysis prompts in the Prompts section</li>
                    <li>Upload images to a <strong>Library</strong> in the Libraries section</li>
                    <li>Use the <strong>Submit Job</strong> tab to select your pipeline and images</li>
                    <li>Monitor progress in the <strong>Monitor Jobs</strong> tab</li>
                    <li>View results when the job completes</li>
                  </ol>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="monitor" className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-2">Job Monitoring</h2>
            <p className="text-muted-foreground mb-6">
              Track the progress of your analysis jobs and view results
            </p>
            <JobMonitoringDashboard highlightJobId={highlightJobId} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 