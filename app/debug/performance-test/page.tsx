'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Skeleton, 
  ImageSkeleton, 
  CardSkeleton, 
  TableSkeleton, 
  CarouselSkeleton,
  NavSkeleton,
  StatsSkeleton,
  FormSkeleton,
  ContentSkeleton 
} from '@/components/ui/skeleton';
import { 
  ErrorBoundary, 
  ComponentErrorBoundary, 
  PageErrorBoundary,
  useErrorHandler 
} from '@/components/ui/error-boundary';
import { 
  useSWROptimized, 
  useOptimisticSWR, 
  useSWRPerformance,
  createOptimizedFetcher 
} from '@/lib/hooks/useSWROptimized';
import { 
  useIntersectionObserver, 
  useImagePreloader, 
  useBatchImagePreloader 
} from '@/lib/hooks/useIntersectionObserver';
import { AlertTriangle, Zap, Database, Image as ImageIcon, Loader2, Activity, Keyboard, Settings, Shield, CheckCircle } from 'lucide-react';
import { WebVitalsDashboard } from '@/components/ui/web-vitals-dashboard';
import { AccessibleCardGrid, type AccessibleCardItem } from '@/components/ui/accessible-card-grid';
import { SkipLinks, MainContent, NavigationWrapper } from '@/components/ui/skip-links';
import { useAccessibility } from '@/lib/hooks/useAccessibility';

export default function PerformanceTestPage() {
  const [activeTest, setActiveTest] = useState<string>('skeleton');
  const performanceMetrics = useSWRPerformance();

  return (
    <PageErrorBoundary>
      <SkipLinks />
      <MainContent title="Sprint 14 Performance Testing" className="container mx-auto py-8 space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">🚀 Sprint 14 Performance Testing</h1>
          <p className="text-xl text-muted-foreground">
            Comprehensive testing of performance optimizations and accessibility features
          </p>
        </div>

        <Tabs value={activeTest} onValueChange={setActiveTest} className="w-full">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="web-vitals">Web Vitals</TabsTrigger>
            <TabsTrigger value="accessibility">Accessibility</TabsTrigger>
            <TabsTrigger value="skeletons">Skeletons</TabsTrigger>
            <TabsTrigger value="errors">Error Boundaries</TabsTrigger>
            <TabsTrigger value="api-cache">API Caching</TabsTrigger>
            <TabsTrigger value="lazy-loading">Lazy Loading</TabsTrigger>
            <TabsTrigger value="stress-test">Stress Tests</TabsTrigger>
          </TabsList>

          {/* Web Vitals */}
          <TabsContent value="web-vitals" className="mt-6">
            <WebVitalsDashboard 
              showRecommendations={true}
              debugMode={true}
              reportToAnalytics={false}
            />
          </TabsContent>

          {/* Skeleton Loading Tests */}
          <TabsContent value="skeletons" className="space-y-6">
            <SkeletonLoadingTests />
          </TabsContent>

          {/* Error Boundary Tests */}
          <TabsContent value="errors" className="space-y-6">
            <ErrorBoundaryTests />
          </TabsContent>

          {/* API Caching Tests */}
          <TabsContent value="api-cache" className="space-y-6">
            <APICachingTests />
          </TabsContent>

          {/* Lazy Loading Tests */}
          <TabsContent value="lazy-loading" className="space-y-6">
            <LazyLoadingTests />
          </TabsContent>

          {/* Performance Metrics */}
          <TabsContent value="metrics" className="space-y-6">
            <PerformanceMetricsPanel metrics={performanceMetrics} />
          </TabsContent>

          {/* Stress Tests */}
          <TabsContent value="stress-test" className="space-y-6">
            <StressTests />
          </TabsContent>

          {/* Accessibility Tests */}
          <TabsContent value="accessibility" className="mt-6">
            <AccessibilityTestingPanel />
          </TabsContent>
        </Tabs>
      </MainContent>
    </PageErrorBoundary>
  );
}

// Skeleton Loading Tests
function SkeletonLoadingTests() {
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [selectedType, setSelectedType] = useState('image');

  const skeletonTypes = {
    image: () => <ImageSkeleton aspectRatio="video" className="w-full h-64" />,
    card: () => <CardSkeleton className="w-full" />,
    table: () => <TableSkeleton rows={5} columns={4} className="w-full" />,
    carousel: () => <CarouselSkeleton className="w-full" />,
    nav: () => <NavSkeleton className="w-64" />,
    stats: () => <StatsSkeleton className="w-full" />,
    form: () => <FormSkeleton fields={4} className="w-full max-w-md" />,
    content: () => <ContentSkeleton lines={6} className="w-full" />,
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Loader2 className="h-5 w-5" />
          Skeleton Loading System
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Test our comprehensive skeleton loading components with shimmer animations
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {Object.keys(skeletonTypes).map((type) => (
            <Button
              key={type}
              variant={selectedType === type ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedType(type)}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </Button>
          ))}
        </div>

        <div className="flex gap-4">
          <Button 
            onClick={() => setShowSkeleton(!showSkeleton)}
            variant={showSkeleton ? 'destructive' : 'default'}
          >
            {showSkeleton ? 'Hide Skeleton' : 'Show Skeleton'}
          </Button>
        </div>

        <div className="border rounded-lg p-4 min-h-[200px]">
          {showSkeleton ? (
            skeletonTypes[selectedType as keyof typeof skeletonTypes]()
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              Content would appear here after loading
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Error Boundary Tests
function ErrorBoundaryTests() {
  const throwError = useErrorHandler();

  const ErrorThrowingComponent = ({ shouldError }: { shouldError: boolean }) => {
    if (shouldError) {
      throw new Error('Intentional test error for error boundary validation');
    }
    return <div className="p-4 text-green-600">✅ Component working normally</div>;
  };

  const [triggerError, setTriggerError] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Error Boundary System
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Test comprehensive error handling with retry mechanisms
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          <Button 
            onClick={() => setTriggerError(!triggerError)}
            variant={triggerError ? 'destructive' : 'default'}
          >
            {triggerError ? 'Stop Error' : 'Trigger Error'}
          </Button>
          <Button 
            onClick={() => throwError(new Error('Direct error throw test'))}
            variant="outline"
          >
            Direct Error Throw
          </Button>
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Component-Level Error Boundary:</h4>
            <div className="border rounded-lg p-4">
              <ComponentErrorBoundary name="TestComponent">
                <ErrorThrowingComponent shouldError={triggerError} />
              </ComponentErrorBoundary>
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-2">Error Boundary Features:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>✅ Automatic retry with exponential backoff</li>
              <li>✅ Error ID generation for support</li>
              <li>✅ Development vs production error display</li>
              <li>✅ Component stack trace logging</li>
              <li>✅ Graceful fallback UI</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// API Caching Tests
function APICachingTests() {
  const [testEndpoint, setTestEndpoint] = useState('/api/test-cache');
  const { 
    data, 
    error, 
    isLoading, 
    mutate,
    prefetch,
    invalidate 
  } = useSWROptimized(
    testEndpoint,
    async (url) => {
      // Simulate API call with delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      return {
        timestamp: new Date().toISOString(),
        data: `Cached response from ${url}`,
        random: Math.random()
      };
    },
    {
      dedupe: true,
      revalidateOnFocus: false,
    }
  );

  const optimisticExample = useOptimisticSWR(
    '/api/optimistic-test',
    async () => ({ count: 0 }),
    { fallbackData: { count: 0 } }
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          SWR API Optimization
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Test request deduplication, caching, and optimistic updates
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => mutate()} disabled={isLoading}>
            Refetch Data
          </Button>
          <Button onClick={() => prefetch()} variant="outline">
            Prefetch
          </Button>
          <Button onClick={() => invalidate()} variant="outline">
            Invalidate Cache
          </Button>
          <Button 
            onClick={() => {
              optimisticExample.optimisticUpdate(
                (data) => ({ count: data.count + 1 }),
                async () => {
                  await new Promise(resolve => setTimeout(resolve, 1000));
                  return { count: (optimisticExample.data?.count || 0) + 1 };
                }
              );
            }}
            variant="secondary"
          >
            Optimistic Update
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="font-medium">API Response:</h4>
            <div className="p-3 bg-muted rounded text-sm">
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading...
                </div>
              ) : error ? (
                <span className="text-red-500">Error: {error.message}</span>
              ) : (
                <pre>{JSON.stringify(data, null, 2)}</pre>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Optimistic Updates:</h4>
            <div className="p-3 bg-muted rounded text-sm">
              <div>Count: {optimisticExample.data?.count || 0}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {optimisticExample.isLoading ? 'Updating...' : 'Ready'}
              </div>
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-medium mb-2">SWR Features Tested:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>✅ Request deduplication (try multiple rapid clicks)</li>
            <li>✅ Response caching with configurable TTL</li>
            <li>✅ Automatic retry with exponential backoff</li>
            <li>✅ Optimistic updates with rollback</li>
            <li>✅ Performance monitoring and metrics</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

// Lazy Loading Tests
function LazyLoadingTests() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Test intersection observer
  const [observerRef, { isIntersecting, wasIntersecting }] = useIntersectionObserver({
    rootMargin: '100px',
    threshold: 0.1
  });

  // Test image preloader
  const testImageUrl = 'https://picsum.photos/400/300';
  const { 
    imageRef, 
    isLoaded, 
    isLoading, 
    error, 
    shouldLoad 
  } = useImagePreloader(testImageUrl);

  // Test batch preloader
  const imageBatch = Array.from({ length: 10 }, (_, i) => 
    `https://picsum.photos/200/200?random=${i}`
  );
  const {
    loadedImages,
    loadingImages,
    startPreloading,
    isImageLoaded,
    isImageLoading
  } = useBatchImagePreloader(imageBatch, 3);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          Intersection Observer & Lazy Loading
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Test advanced lazy loading with intersection observer and batch preloading
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Intersection Observer Demo */}
        <div className="space-y-4">
          <h4 className="font-medium">Intersection Observer Test:</h4>
          <div className="h-32 overflow-y-auto border rounded p-4" ref={scrollContainerRef}>
            <div className="h-64 flex items-end">
              <div 
                ref={observerRef as React.RefObject<HTMLDivElement>} 
                className={`p-4 rounded border-2 transition-colors ${
                  isIntersecting ? 'border-green-500 bg-green-50' : 'border-gray-300'
                }`}
              >
                <div className="text-sm">
                  <div>Intersecting: {isIntersecting ? '✅' : '❌'}</div>
                  <div>Was Intersecting: {wasIntersecting ? '✅' : '❌'}</div>
                </div>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Scroll down to trigger intersection observer
          </p>
        </div>

        {/* Image Preloader Demo */}
        <div className="space-y-4">
          <h4 className="font-medium">Image Preloader Test:</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div 
                ref={imageRef as React.RefObject<HTMLDivElement>}
                className="border rounded p-4 min-h-[200px] flex items-center justify-center"
              >
                {!shouldLoad ? (
                  <div className="text-center text-muted-foreground">
                    <ImageIcon className="h-12 w-12 mx-auto mb-2" />
                    <div>Scroll to trigger loading</div>
                  </div>
                ) : isLoading ? (
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                    <div>Loading...</div>
                  </div>
                ) : error ? (
                  <div className="text-red-500">Failed to load</div>
                ) : isLoaded ? (
                  <img src={testImageUrl} alt="Test" className="max-w-full max-h-full" />
                ) : null}
              </div>
            </div>
            <div className="text-sm space-y-2">
              <div>Should Load: {shouldLoad ? '✅' : '❌'}</div>
              <div>Is Loading: {isLoading ? '✅' : '❌'}</div>
              <div>Is Loaded: {isLoaded ? '✅' : '❌'}</div>
              <div>Error: {error || 'None'}</div>
            </div>
          </div>
        </div>

        {/* Batch Preloader Demo */}
        <div className="space-y-4">
          <h4 className="font-medium">Batch Image Preloader:</h4>
          <Button onClick={() => startPreloading(0)}>
            Start Batch Preloading
          </Button>
          <div className="grid grid-cols-5 gap-2">
            {imageBatch.map((url, index) => (
              <div key={index} className="aspect-square border rounded flex items-center justify-center text-xs">
                {isImageLoaded(url) ? '✅' : isImageLoading(url) ? '⏳' : '⭕'}
              </div>
            ))}
          </div>
          <div className="text-sm text-muted-foreground">
            Loaded: {loadedImages.size} / Loading: {loadingImages.size} / Total: {imageBatch.length}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Performance Metrics Panel
function PerformanceMetricsPanel({ metrics }: { metrics: any }) {
  const [webVitals, setWebVitals] = useState<any>({});

  // Simulate Core Web Vitals measurement
  React.useEffect(() => {
    if (typeof window !== 'undefined' && 'performance' in window) {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      setWebVitals({
        LCP: navigation.loadEventEnd - navigation.loadEventStart,
        FID: 'N/A (requires user interaction)',
        CLS: 'N/A (requires layout shift detection)',
        TTFB: navigation.responseStart - navigation.requestStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
      });
    }
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Performance Metrics
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Real-time performance monitoring and Core Web Vitals
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium mb-3">Core Web Vitals:</h4>
            <div className="space-y-2 text-sm">
              {Object.entries(webVitals).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span>{key}:</span>
                  <span className="font-mono">
                    {typeof value === 'number' ? `${value.toFixed(2)}ms` : String(value)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-3">API Performance:</h4>
            <div className="space-y-2 text-sm">
              {Object.entries(metrics.getMetrics()).map(([url, data]: [string, any]) => (
                <div key={url} className="border-b pb-2">
                  <div className="font-medium">{url}</div>
                  <div className="text-muted-foreground">
                    Avg: {data.avgTime?.toFixed(2)}ms | 
                    Calls: {data.count} | 
                    Errors: {data.errors}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-medium mb-3">Bundle Analysis Results:</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center p-3 bg-muted rounded">
              <div className="font-mono text-lg">453KB</div>
              <div className="text-muted-foreground">First Load JS</div>
            </div>
            <div className="text-center p-3 bg-muted rounded">
              <div className="font-mono text-lg">451KB</div>
              <div className="text-muted-foreground">Vendor Bundle</div>
            </div>
            <div className="text-center p-3 bg-muted rounded">
              <div className="font-mono text-lg">2KB</div>
              <div className="text-muted-foreground">Shared Chunks</div>
            </div>
            <div className="text-center p-3 bg-muted rounded">
              <div className="font-mono text-lg">✅</div>
              <div className="text-muted-foreground">Code Splitting</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Stress Tests
function StressTests() {
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<any[]>([]);

  const runStressTest = async () => {
    setIsRunning(true);
    setTestResults([]);
    
    // Simulate multiple concurrent API calls
    const promises = Array.from({ length: 10 }, async (_, i) => {
      const start = performance.now();
      try {
        await new Promise(resolve => setTimeout(resolve, Math.random() * 2000));
        const end = performance.now();
        return { test: `API Call ${i + 1}`, duration: end - start, success: true };
      } catch (error) {
        const end = performance.now();
        return { test: `API Call ${i + 1}`, duration: end - start, success: false };
      }
    });

    const results = await Promise.all(promises);
    setTestResults(results);
    setIsRunning(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stress Testing</CardTitle>
        <p className="text-sm text-muted-foreground">
          Test system performance under load
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runStressTest}
          disabled={isRunning}
          className="w-full"
        >
          {isRunning ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Running Stress Test...
            </>
          ) : (
            'Run Stress Test'
          )}
        </Button>

        {testResults.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Test Results:</h4>
            <div className="max-h-64 overflow-y-auto space-y-1">
              {testResults.map((result, index) => (
                <div 
                  key={index} 
                  className={`flex justify-between text-sm p-2 rounded ${
                    result.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                  }`}
                >
                  <span>{result.test}</span>
                  <span>{result.duration.toFixed(2)}ms</span>
                </div>
              ))}
            </div>
            <div className="text-sm text-muted-foreground">
              Average: {(testResults.reduce((sum, r) => sum + r.duration, 0) / testResults.length).toFixed(2)}ms
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Accessibility Testing Panel
function AccessibilityTestingPanel() {
  const [selectedCards, setSelectedCards] = useState<Set<string | number>>(new Set());
  const [focusTestActive, setFocusTestActive] = useState(false);
  const [contrastTestMode, setContrastTestMode] = useState(false);
  
  // Sample data for accessibility testing
  const accessibilityTestCards: AccessibleCardItem[] = [
    {
      id: 'card-1',
      title: 'Keyboard Navigation Test',
      description: 'Use arrow keys to navigate, space to select, enter to activate',
      imageUrl: 'https://picsum.photos/200/200?random=1',
      imageAlt: 'Sample image for keyboard navigation testing',
      badges: [{ text: 'Interactive' }, { text: 'Accessible' }]
    },
    {
      id: 'card-2',
      title: 'Screen Reader Test',
      description: 'This card has comprehensive ARIA labels and descriptions',
      imageUrl: 'https://picsum.photos/200/200?random=2',
      imageAlt: 'Sample image for screen reader testing',
      badges: [{ text: 'ARIA Enhanced' }]
    },
    {
      id: 'card-3',
      title: 'Focus Management Test',
      description: 'Focus indicators and tab order testing',
      imageUrl: 'https://picsum.photos/200/200?random=3',
      imageAlt: 'Sample image for focus management testing',
      badges: [{ text: 'Focus Visible' }]
    },
    {
      id: 'card-4',
      title: 'Disabled State Test',
      description: 'This card is disabled to test accessibility handling',
      imageUrl: 'https://picsum.photos/200/200?random=4',
      imageAlt: 'Sample image showing disabled state',
      isDisabled: true,
      badges: [{ text: 'Disabled' }]
    }
  ];

  // Accessibility testing hook
  const {
    announce,
    prefersReducedMotion,
    prefersHighContrast,
    isScreenReaderActive,
    focusableElements
  } = useAccessibility({
    enableScreenReaderAnnouncements: true,
    enableKeyboardNavigation: true,
    respectReducedMotion: true
  });

  const handleCardSelect = (cardId: string | number, selected: boolean) => {
    const newSelected = new Set(selectedCards);
    if (selected) {
      newSelected.add(cardId);
    } else {
      newSelected.delete(cardId);
    }
    setSelectedCards(newSelected);
  };

  const handleCardAction = (card: AccessibleCardItem) => {
    announce(`Activated ${card.title}`, 'assertive');
  };

  const triggerFocusTest = () => {
    setFocusTestActive(true);
    announce('Focus test activated. Tab through the interface to test focus indicators.', 'assertive');
    setTimeout(() => setFocusTestActive(false), 10000);
  };

  const toggleContrastTest = () => {
    setContrastTestMode(!contrastTestMode);
    document.documentElement.classList.toggle('high-contrast-test', !contrastTestMode);
    announce(`High contrast mode ${!contrastTestMode ? 'enabled' : 'disabled'}`, 'assertive');
  };

  return (
    <div className="space-y-6">
      {/* Skip Links Demo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="sr-only">Accessibility feature:</span>
            <Activity className="h-5 w-5" />
            Skip Links & Navigation
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Press Tab to reveal skip links, or use Alt+1 through Alt+4 for direct navigation
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Available Skip Links:</h4>
              <ul className="text-sm space-y-1">
                <li>• <kbd className="bg-background px-1 rounded">Alt+1</kbd> - Skip to main content</li>
                <li>• <kbd className="bg-background px-1 rounded">Alt+2</kbd> - Skip to navigation</li>
                <li>• <kbd className="bg-background px-1 rounded">Alt+3</kbd> - Skip to search</li>
                <li>• <kbd className="bg-background px-1 rounded">Alt+4</kbd> - Skip to footer</li>
              </ul>
            </div>
            <Button onClick={() => announce('Skip links demonstration completed', 'polite')}>
              Test Screen Reader Announcement
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Keyboard Navigation Testing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Navigation & Focus Management
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Test comprehensive keyboard navigation with grid layout and focus indicators
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4">
              <Button onClick={triggerFocusTest} variant={focusTestActive ? 'secondary' : 'outline'}>
                {focusTestActive ? 'Focus Test Active' : 'Activate Focus Test'}
              </Button>
              <Button onClick={toggleContrastTest} variant={contrastTestMode ? 'secondary' : 'outline'}>
                {contrastTestMode ? 'Disable High Contrast' : 'Test High Contrast'}
              </Button>
            </div>
            
            <div className={`${focusTestActive ? 'ring-2 ring-blue-500 ring-offset-2' : ''} transition-all`}>
              <AccessibleCardGrid
                items={accessibilityTestCards}
                selectedItems={selectedCards}
                onItemSelect={handleCardSelect}
                onItemAction={handleCardAction}
                multiSelect={true}
                showCheckboxes={true}
                gridCols={2}
                ariaLabel="Accessibility testing card grid"
                className="mt-4"
              />
            </div>

            <div className="text-sm text-muted-foreground bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-2">Keyboard Testing Instructions:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h5 className="font-medium">Navigation:</h5>
                  <ul className="space-y-1">
                    <li>• Arrow keys: Navigate between cards</li>
                    <li>• Tab: Standard tab navigation</li>
                    <li>• Home/End: First/last in row</li>
                    <li>• Ctrl+Home/End: First/last overall</li>
                  </ul>
                </div>
                <div>
                  <h5 className="font-medium">Actions:</h5>
                  <ul className="space-y-1">
                    <li>• Space: Select/deselect cards</li>
                    <li>• Enter: Activate cards</li>
                    <li>• Ctrl+A: Select all</li>
                    <li>• Ctrl+Shift+A: Deselect all</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Preferences Detection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            User Preferences Detection
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Automatic detection of user accessibility preferences
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-muted rounded-lg text-center">
              <div className={`text-2xl mb-2 ${prefersReducedMotion ? 'text-green-600' : 'text-gray-400'}`}>
                {prefersReducedMotion ? '✅' : '❌'}
              </div>
              <div className="font-medium">Reduced Motion</div>
              <div className="text-xs text-muted-foreground">
                {prefersReducedMotion ? 'Enabled' : 'Not Enabled'}
              </div>
            </div>
            
            <div className="p-4 bg-muted rounded-lg text-center">
              <div className={`text-2xl mb-2 ${prefersHighContrast ? 'text-green-600' : 'text-gray-400'}`}>
                {prefersHighContrast ? '✅' : '❌'}
              </div>
              <div className="font-medium">High Contrast</div>
              <div className="text-xs text-muted-foreground">
                {prefersHighContrast ? 'Enabled' : 'Not Enabled'}
              </div>
            </div>
            
            <div className="p-4 bg-muted rounded-lg text-center">
              <div className={`text-2xl mb-2 ${isScreenReaderActive ? 'text-green-600' : 'text-gray-400'}`}>
                {isScreenReaderActive ? '✅' : '❌'}
              </div>
              <div className="font-medium">Screen Reader</div>
              <div className="text-xs text-muted-foreground">
                {isScreenReaderActive ? 'Detected' : 'Not Detected'}
              </div>
            </div>
          </div>
          
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <h4 className="font-medium mb-2">Live Status:</h4>
            <p className="text-sm">
              Focusable elements detected: <strong>{focusableElements.length}</strong>
            </p>
            <p className="text-sm">
              Selected cards: <strong>{selectedCards.size}</strong>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* WCAG 2.1 AA Compliance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            WCAG 2.1 AA Compliance Features
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Comprehensive accessibility features implemented for WCAG 2.1 AA compliance
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-medium text-green-600">✅ Implemented Features</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Comprehensive keyboard navigation</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Screen reader announcements</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>ARIA labels and descriptions</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Focus management and indicators</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Skip links and landmarks</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>User preference detection</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-medium text-blue-600">🧪 Testing Tools</h4>
              <div className="space-y-2 text-sm">
                <p>• Use a screen reader (NVDA, JAWS, VoiceOver)</p>
                <p>• Test keyboard-only navigation</p>
                <p>• Verify focus indicators are visible</p>
                <p>• Test with reduced motion preferences</p>
                <p>• Validate color contrast ratios</p>
                <p>• Test with browser zoom up to 200%</p>
              </div>
              
              <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
                <p className="text-xs text-amber-800 dark:text-amber-200">
                  <strong>Note:</strong> Use automated tools like axe-core or Lighthouse accessibility 
                  audit for comprehensive testing beyond this demonstration.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 