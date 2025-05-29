import { ReactNode, useMemo } from 'react';

export interface ProgressStage {
  id: string;
  name: string;
  description?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';
  progress?: number; // 0-100 for current stage
  startTime?: string;
  endTime?: string;
  duration?: number; // milliseconds
  icon?: ReactNode;
}

export interface ProgressBarProps {
  // Basic progress
  progress: number; // 0-100 overall progress
  status?: 'idle' | 'processing' | 'completed' | 'failed' | 'paused';
  
  // Multi-stage support
  stages?: ProgressStage[];
  currentStageId?: string;
  
  // Display options
  showPercentage?: boolean;
  showStageNames?: boolean;
  showTimeEstimate?: boolean;
  showStageProgress?: boolean;
  animated?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'segmented' | 'minimal';
  
  // Styling
  className?: string;
  progressColor?: string;
  backgroundColor?: string;
  
  // Callbacks
  onStageClick?: (stage: ProgressStage) => void;
}

export function ProgressBar({
  progress,
  status = 'idle',
  stages = [],
  currentStageId,
  showPercentage = true,
  showStageNames = false,
  showTimeEstimate = false,
  showStageProgress = false,
  animated = true,
  size = 'md',
  variant = 'default',
  className = '',
  progressColor,
  backgroundColor,
  onStageClick,
}: ProgressBarProps) {
  
  // Calculate dimensions based on size
  const dimensions = useMemo(() => {
    switch (size) {
      case 'sm':
        return { height: 'h-2', text: 'text-xs', padding: 'p-1' };
      case 'lg':
        return { height: 'h-6', text: 'text-sm', padding: 'p-3' };
      default:
        return { height: 'h-4', text: 'text-sm', padding: 'p-2' };
    }
  }, [size]);

  // Calculate stage positions for segmented view
  const stagePositions = useMemo(() => {
    if (!stages.length) return [];
    
    const totalStages = stages.length;
    return stages.map((stage, index) => ({
      ...stage,
      startPercent: (index / totalStages) * 100,
      endPercent: ((index + 1) / totalStages) * 100,
      width: 100 / totalStages,
    }));
  }, [stages]);

  // Get progress color based on status
  const getProgressColor = () => {
    if (progressColor) return progressColor;
    
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      case 'paused':
        return 'bg-yellow-500';
      case 'processing':
        return 'bg-blue-500';
      default:
        return 'bg-gray-400';
    }
  };

  // Get stage status color
  const getStageColor = (stage: ProgressStage) => {
    switch (stage.status) {
      case 'completed':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      case 'processing':
        return 'bg-blue-500';
      case 'skipped':
        return 'bg-gray-300';
      default:
        return 'bg-gray-200';
    }
  };

  // Calculate time estimate
  const getTimeEstimate = () => {
    if (!showTimeEstimate || !stages.length) return null;
    
    const completedStages = stages.filter(s => s.status === 'completed' && s.duration);
    if (completedStages.length === 0) return null;
    
    const avgDuration = completedStages.reduce((sum, s) => sum + (s.duration || 0), 0) / completedStages.length;
    const remainingStages = stages.filter(s => s.status === 'pending').length;
    const estimatedMs = remainingStages * avgDuration;
    
    if (estimatedMs < 60000) {
      return `~${Math.round(estimatedMs / 1000)}s remaining`;
    } else {
      return `~${Math.round(estimatedMs / 60000)}m remaining`;
    }
  };

  // Render segmented progress bar
  const renderSegmentedProgress = () => (
    <div className="space-y-2">
      {/* Stage labels */}
      {showStageNames && (
        <div className="flex justify-between text-xs text-muted-foreground">
          {stagePositions.map((stage) => (
            <div
              key={stage.id}
              className={`flex-1 text-center ${onStageClick ? 'cursor-pointer hover:text-foreground' : ''}`}
              onClick={() => onStageClick?.(stage)}
            >
              <div className="flex items-center justify-center space-x-1">
                {stage.icon}
                <span className="truncate">{stage.name}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Segmented progress bar */}
      <div className={`relative ${dimensions.height} ${backgroundColor || 'bg-gray-200'} rounded-full overflow-hidden`}>
        {stagePositions.map((stage, index) => {
          const isCurrentStage = stage.id === currentStageId;
          const stageProgress = isCurrentStage && showStageProgress ? (stage.progress || 0) : 
                               stage.status === 'completed' ? 100 : 0;
          
          return (
            <div
              key={stage.id}
              className="absolute top-0 bottom-0 flex"
              style={{
                left: `${stage.startPercent}%`,
                width: `${stage.width}%`,
              }}
            >
              {/* Stage background */}
              <div className="w-full bg-gray-100 border-r border-gray-300 last:border-r-0" />
              
              {/* Stage progress */}
              <div
                className={`absolute top-0 bottom-0 ${getStageColor(stage)} ${
                  animated ? 'transition-all duration-500 ease-out' : ''
                }`}
                style={{
                  width: `${stageProgress}%`,
                }}
              />
              
              {/* Current stage indicator */}
              {isCurrentStage && (
                <div className="absolute top-0 bottom-0 right-0 w-1 bg-blue-600 animate-pulse" />
              )}
            </div>
          );
        })}
      </div>
      
      {/* Stage progress details */}
      {showStageProgress && (
        <div className="flex justify-between text-xs">
          {stagePositions.map((stage) => (
            <div key={stage.id} className="flex-1 text-center">
              {stage.status === 'processing' && stage.progress !== undefined && (
                <span className="text-blue-600 font-medium">
                  {Math.round(stage.progress)}%
                </span>
              )}
              {stage.status === 'completed' && (
                <span className="text-green-600">✓</span>
              )}
              {stage.status === 'failed' && (
                <span className="text-red-600">✗</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Render default progress bar
  const renderDefaultProgress = () => (
    <div className="space-y-1">
      <div className={`relative ${dimensions.height} ${backgroundColor || 'bg-gray-200'} rounded-full overflow-hidden`}>
        <div
          className={`absolute top-0 bottom-0 left-0 ${getProgressColor()} ${
            animated ? 'transition-all duration-500 ease-out' : ''
          }`}
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
        
        {/* Animated shimmer for processing state */}
        {status === 'processing' && animated && (
          <div className="absolute top-0 bottom-0 left-0 right-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
        )}
      </div>
    </div>
  );

  // Render minimal progress bar
  const renderMinimalProgress = () => (
    <div className={`${dimensions.height} ${backgroundColor || 'bg-gray-200'} rounded-full overflow-hidden`}>
      <div
        className={`h-full ${getProgressColor()} ${animated ? 'transition-all duration-300' : ''}`}
        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
      />
    </div>
  );

  return (
    <div className={`w-full ${className}`}>
      {/* Progress bar */}
      {variant === 'segmented' && stages.length > 0 ? renderSegmentedProgress() :
       variant === 'minimal' ? renderMinimalProgress() :
       renderDefaultProgress()}
      
      {/* Progress info */}
      {variant !== 'minimal' && (
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center space-x-2">
            {/* Status indicator */}
            <div className={`w-2 h-2 rounded-full ${getProgressColor()}`} />
            
            {/* Status text */}
            <span className={`${dimensions.text} text-muted-foreground capitalize`}>
              {status}
            </span>
            
            {/* Current stage */}
            {currentStageId && stages.length > 0 && (
              <span className={`${dimensions.text} text-muted-foreground`}>
                • {stages.find(s => s.id === currentStageId)?.name}
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Time estimate */}
            {getTimeEstimate() && (
              <span className={`${dimensions.text} text-muted-foreground`}>
                {getTimeEstimate()}
              </span>
            )}
            
            {/* Percentage */}
            {showPercentage && (
              <span className={`${dimensions.text} font-medium`}>
                {Math.round(progress)}%
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Utility component for simple progress bars
export function SimpleProgressBar({
  progress,
  className = '',
  color = 'bg-blue-500',
  size = 'md',
}: {
  progress: number;
  className?: string;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  return (
    <ProgressBar
      progress={progress}
      variant="minimal"
      size={size}
      className={className}
      progressColor={color}
      animated={true}
    />
  );
} 