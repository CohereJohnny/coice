'use client';

import { Suspense } from 'react';
import { AuthGuard } from '../components/auth/AuthGuard';
import { JobSubmissionForm, JobMonitoringDashboard } from '@/components/jobs';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Play, BarChart3 } from 'lucide-react';
import { AnalysisPageContent } from './AnalysisPageContent';

function AnalysisPageFallback() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">AI Analysis</h1>
        <p className="text-muted-foreground">
          Submit image analysis jobs and monitor their progress in real-time
        </p>
      </div>
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Loading...
      </div>
    </div>
  );
}

export default function AnalysisPage() {
  return (
    <AuthGuard>
      <Suspense fallback={<AnalysisPageFallback />}>
        <AnalysisPageContent />
      </Suspense>
    </AuthGuard>
  );
} 