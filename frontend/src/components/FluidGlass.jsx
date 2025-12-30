'use client'
/**
 * FluidGlass.jsx
 * 
 * This file now re-exports from the modular liquid-glass components.
 * The original monolithic component has been refactored into smaller,
 * more maintainable pieces located in /components/liquid-glass/
 * 
 * Structure:
 * - LiquidGlassHeader.jsx - Main navigation component
 * - LiquidGlassHero.jsx - Hero section with animated background
 * - HoverBubble.jsx - Floating hover effect bubble
 * - MovingIndicator.jsx - Navigation indicator animation
 * - NavItem.jsx - Desktop and Mobile navigation items
 * - SVGFilters.jsx - SVG displacement map filters
 * - hooks/useTouchNavigation.js - Touch interaction logic
 * - hooks/useDisplacementMap.js - Displacement map generation
 */

// Re-export everything from the modular structure
export { 
  LiquidGlassHeader,
  LiquidGlassHero,
  HoverBubble,
  MovingIndicator,
  DesktopNavItem,
  MobileNavItem,
  SVGFilters,
  useTouchNavigation,
  useDisplacementMap
} from './liquid-glass';

// Default export is the Hero component for backwards compatibility
export { default } from './liquid-glass';

// Also export Header as named export for backwards compatibility
export { LiquidGlassHeader as FluidGlassHeader } from './liquid-glass';
