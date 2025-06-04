// Animation Utilities & Micro-interactions
// Sprint 14: Final polish and consistent animations

import { cn } from '@/lib/utils';

// Animation presets for consistent micro-interactions
export const animations = {
  // Fade animations
  fadeIn: 'animate-in fade-in-0 duration-300',
  fadeOut: 'animate-out fade-out-0 duration-200',
  fadeInUp: 'animate-in fade-in-0 slide-in-from-bottom-2 duration-300',
  fadeInDown: 'animate-in fade-in-0 slide-in-from-top-2 duration-300',
  
  // Scale animations
  scaleIn: 'animate-in zoom-in-95 duration-200',
  scaleOut: 'animate-out zoom-out-95 duration-150',
  
  // Slide animations
  slideInLeft: 'animate-in slide-in-from-left-full duration-300',
  slideInRight: 'animate-in slide-in-from-right-full duration-300',
  slideOutLeft: 'animate-out slide-out-to-left-full duration-300',
  slideOutRight: 'animate-out slide-out-to-right-full duration-300',
  
  // Hover animations
  hoverScale: 'transition-transform duration-200 hover:scale-105',
  hoverLift: 'transition-all duration-200 hover:shadow-lg hover:-translate-y-1',
  hoverGlow: 'transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/25',
  
  // Focus animations
  focusRing: 'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200',
  focusGlow: 'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:shadow-lg transition-all duration-200',
  
  // Loading animations
  pulse: 'animate-pulse',
  spin: 'animate-spin',
  bounce: 'animate-bounce',
  
  // Entrance animations for lists
  staggerChildren: 'animate-in fade-in-0 slide-in-from-bottom-4 duration-500',
} as const;

// Micro-interaction utilities
export const microInteractions = {
  // Button interactions
  button: {
    primary: cn(
      'transition-all duration-200',
      'hover:scale-105 hover:shadow-lg',
      'active:scale-95',
      'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
    ),
    secondary: cn(
      'transition-all duration-200',
      'hover:bg-gray-100 dark:hover:bg-gray-800',
      'active:scale-95',
      'focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2'
    ),
    ghost: cn(
      'transition-all duration-200',
      'hover:bg-gray-100 dark:hover:bg-gray-800 hover:scale-105',
      'active:scale-95'
    )
  },
  
  // Card interactions
  card: {
    hover: cn(
      'transition-all duration-300 cursor-pointer',
      'hover:shadow-lg hover:-translate-y-1',
      'hover:border-gray-300 dark:hover:border-gray-600'
    ),
    interactive: cn(
      'transition-all duration-200',
      'hover:shadow-md hover:scale-[1.02]',
      'active:scale-[0.98]',
      'focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2'
    ),
    subtle: cn(
      'transition-all duration-200',
      'hover:bg-gray-50 dark:hover:bg-gray-900/50'
    )
  },
  
  // Image interactions
  image: {
    zoom: cn(
      'transition-transform duration-300',
      'hover:scale-110 cursor-zoom-in'
    ),
    overlay: cn(
      'transition-all duration-200',
      'hover:brightness-110'
    ),
    thumbnail: cn(
      'transition-all duration-200',
      'hover:scale-105 hover:shadow-lg',
      'active:scale-95'
    )
  },
  
  // Input interactions
  input: {
    focus: cn(
      'transition-all duration-200',
      'focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
      'focus:shadow-lg focus:shadow-blue-500/25'
    ),
    error: cn(
      'transition-all duration-200',
      'focus:ring-2 focus:ring-red-500 focus:border-red-500',
      'border-red-300 dark:border-red-700'
    )
  },
  
  // Navigation interactions
  nav: {
    link: cn(
      'transition-all duration-200',
      'hover:text-blue-600 dark:hover:text-blue-400',
      'hover:bg-blue-50 dark:hover:bg-blue-950/50',
      'relative before:absolute before:bottom-0 before:left-0 before:w-0 before:h-0.5',
      'before:bg-blue-600 before:transition-all before:duration-300',
      'hover:before:w-full'
    ),
    active: cn(
      'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300',
      'before:w-full'
    )
  }
} as const;

// Stagger animation for lists
export const createStaggerAnimation = (index: number, baseDelay = 50) => ({
  style: {
    animationDelay: `${index * baseDelay}ms`
  },
  className: animations.staggerChildren
});

// Loading skeleton with animation
export const loadingShimmer = cn(
  'relative overflow-hidden bg-gray-200 dark:bg-gray-800',
  'before:absolute before:inset-0',
  'before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent',
  'before:animate-shimmer before:transform before:translate-x-[-100%]'
);

// Smooth scrolling utility
export const smoothScroll = (elementId: string, offset = 0) => {
  const element = document.getElementById(elementId);
  if (element) {
    const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
    window.scrollTo({
      top: elementPosition - offset,
      behavior: 'smooth'
    });
  }
};

// Toast animation variants
export const toastAnimations = {
  enter: 'animate-in slide-in-from-right-full duration-300',
  exit: 'animate-out slide-out-to-right-full duration-200',
  success: 'animate-in zoom-in-95 fade-in-0 duration-300',
  error: 'animate-in shake duration-300',
  warning: 'animate-in pulse duration-300'
} as const;

// Modal/Dialog animations
export const modalAnimations = {
  backdrop: {
    enter: 'animate-in fade-in-0 duration-300',
    exit: 'animate-out fade-out-0 duration-200'
  },
  content: {
    enter: 'animate-in zoom-in-95 fade-in-0 slide-in-from-bottom-2 duration-300',
    exit: 'animate-out zoom-out-95 fade-out-0 slide-out-to-bottom-2 duration-200'
  }
} as const;

// Responsive animation utilities
export const responsiveAnimations = {
  // Disable animations on mobile for performance
  mobile: (animationClass: string) => cn(
    'motion-safe:sm:' + animationClass.replace(/^motion-safe:/, '')
  ),
  
  // Respect reduced motion preference
  motionSafe: (animationClass: string) => cn('motion-safe:' + animationClass),
  
  // Only animate on larger screens
  desktop: (animationClass: string) => cn('lg:' + animationClass)
} as const;

// Performance-optimized animation classes
export const performanceAnimations = {
  // Use transform and opacity for better performance
  slide: 'transform transition-transform duration-300 ease-out',
  fade: 'transition-opacity duration-300 ease-out',
  scale: 'transform transition-transform duration-200 ease-out',
  
  // GPU-accelerated animations
  gpuAccelerated: 'transform-gpu will-change-transform',
  
  // Reduce motion for accessibility
  reduceMotion: 'motion-reduce:transition-none motion-reduce:animate-none'
} as const;

// Custom animation hook for components
export const useAnimation = (
  initialState: 'hidden' | 'visible' = 'hidden',
  options?: {
    duration?: number;
    delay?: number;
    easing?: string;
  }
) => {
  const { duration = 300, delay = 0, easing = 'ease-out' } = options || {};
  
  return {
    initial: {
      opacity: initialState === 'hidden' ? 0 : 1,
      transform: initialState === 'hidden' ? 'translateY(20px)' : 'translateY(0px)'
    },
    animate: {
      opacity: 1,
      transform: 'translateY(0px)',
      transition: `all ${duration}ms ${easing} ${delay}ms`
    }
  };
};

// Intersection Observer animation trigger
export const createIntersectionAnimation = (
  threshold = 0.1,
  rootMargin = '50px'
) => {
  if (typeof window === 'undefined') return null;
  
  return new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in', 'fade-in-0', 'slide-in-from-bottom-4');
          entry.target.classList.remove('opacity-0', 'translate-y-4');
        }
      });
    },
    { threshold, rootMargin }
  );
};

export default animations; 