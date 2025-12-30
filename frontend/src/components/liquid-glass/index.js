'use client'
/**
 * Liquid Glass Components
 * 
 * A collection of iOS-style liquid glass effect components for React.
 * Includes navigation header, hero section, and supporting utilities.
 */

// Main components
export { LiquidGlassHeader } from './LiquidGlassHeader';
export { default as LiquidGlassHero } from './LiquidGlassHero';

// Sub-components (for advanced customization)
export { default as HoverBubble } from './HoverBubble';
export { default as MovingIndicator } from './MovingIndicator';
export { DesktopNavItem, MobileNavItem } from './NavItem';
export { default as SVGFilters } from './SVGFilters';

// Hooks (for building custom liquid glass components)
export { default as useTouchNavigation } from './hooks/useTouchNavigation';
export { default as useDisplacementMap } from './hooks/useDisplacementMap';

// Default export is the Header for backwards compatibility
import { LiquidGlassHeader } from './LiquidGlassHeader';
import LiquidGlassHero from './LiquidGlassHero';

export default LiquidGlassHero;
export { LiquidGlassHeader as FluidGlassHeader };
