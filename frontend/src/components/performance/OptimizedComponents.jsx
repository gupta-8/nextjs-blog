'use client'
import React, { Suspense, lazy, memo } from 'react';

// Skeleton loader component - lightweight placeholder
export const Skeleton = memo(function Skeleton({ className = '', ...props }) {
  return (
    <div
      className={`animate-pulse bg-white/5 ${className}`}
      {...props}
    />
  );
});

// Card skeleton for blog posts
export const BlogCardSkeleton = memo(function BlogCardSkeleton() {
  return (
    <div className="border border-white/10 bg-[#0d0d0d] overflow-hidden">
      <Skeleton className="h-48 w-full" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-20" />
        </div>
      </div>
    </div>
  );
});

// Table row skeleton
export const TableRowSkeleton = memo(function TableRowSkeleton({ columns = 4 }) {
  return (
    <tr className="border-b border-white/5">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="p-4">
          <Skeleton className="h-4 w-full max-w-[200px]" />
        </td>
      ))}
    </tr>
  );
});

// Page loading skeleton
export const PageSkeleton = memo(function PageSkeleton() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid md:grid-cols-3 gap-4">
          <BlogCardSkeleton />
          <BlogCardSkeleton />
          <BlogCardSkeleton />
        </div>
      </div>
    </div>
  );
});

// Optimized image component with lazy loading
export const OptimizedImage = memo(function OptimizedImage({ 
  src, 
  alt, 
  className = '',
  width,
  height,
  priority = false,
  ...props 
}) {
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState(false);
  
  if (error) {
    return (
      <div className={`bg-white/5 flex items-center justify-center ${className}`}>
        <span className="text-white/30 text-xs">Image unavailable</span>
      </div>
    );
  }
  
  return (
    <div className={`relative overflow-hidden ${className}`}>
      {!loaded && <Skeleton className="absolute inset-0" />}
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        className={`transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'} ${className}`}
        {...props}
      />
    </div>
  );
});

// Intersection observer hook for lazy loading
export function useIntersectionObserver(options = {}) {
  const [isIntersecting, setIsIntersecting] = React.useState(false);
  const ref = React.useRef(null);
  
  React.useEffect(() => {
    const element = ref.current;
    if (!element) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '100px', ...options }
    );
    
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  
  return [ref, isIntersecting];
}

// Lazy load wrapper component
export function LazyLoad({ children, fallback = <Skeleton className="h-32 w-full" /> }) {
  const [ref, isVisible] = useIntersectionObserver();
  
  return (
    <div ref={ref}>
      {isVisible ? children : fallback}
    </div>
  );
}

// Debounce hook for search inputs
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = React.useState(value);
  
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  
  return debouncedValue;
}

// Throttle hook for scroll/resize events
export function useThrottle(value, interval = 100) {
  const [throttledValue, setThrottledValue] = React.useState(value);
  const lastUpdated = React.useRef(Date.now());
  
  React.useEffect(() => {
    const now = Date.now();
    if (now >= lastUpdated.current + interval) {
      lastUpdated.current = now;
      setThrottledValue(value);
    } else {
      const timer = setTimeout(() => {
        lastUpdated.current = Date.now();
        setThrottledValue(value);
      }, interval);
      return () => clearTimeout(timer);
    }
  }, [value, interval]);
  
  return throttledValue;
}
