'use client'
import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import HoverBubble from './HoverBubble';
import MovingIndicator from './MovingIndicator';
import { DesktopNavItem, MobileNavItem } from './NavItem';
import SVGFilters from './SVGFilters';
import useTouchNavigation from './hooks/useTouchNavigation';

/**
 * Liquid Glass Header/Navigation Bar
 * A visually stunning navigation component with iOS-style liquid glass effects
 */
export function LiquidGlassHeader({ 
  items = [], 
  onNavClick,
  onMobileMenuClick,
  logo = 'H.',
  className = '',
  currentPath = '/'
}) {
  const headerRef = useRef(null);
  const canvasRef = useRef(null);
  const navRef = useRef(null);
  const mobileNavRef = useRef(null);
  const desktopItemRefs = useRef([]);
  const mobileItemRefs = useRef([]);
  const svgFiltersRef = useRef(null);
  
  // Use a stable filter ID - must be deterministic to avoid SSR hydration mismatch
  const filterId = 'liquid-glass-nav';
  
  const [dimensions, setDimensions] = useState({ width: 800, height: 48 });
  const [mouseX, setMouseX] = useState(150);
  const [isHovering, setIsHovering] = useState(false);
  const [headerRect, setHeaderRect] = useState(null);
  const [hoveredIndex, setHoveredIndex] = useState(-1);
  const [isMobile, setIsMobile] = useState(true); // Default to mobile for SSR
  
  // Check screen size for responsive nav
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Get the current active index based on path
  const activeIndex = items.findIndex(item => item.href === currentPath);
  
  // Touch navigation hook - use mobileNavRef for mobile touch calculations
  const {
    isTouchActive,
    isTouchDevice,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    cleanup: cleanupTouch
  } = useTouchNavigation({
    items,
    headerRef,
    navRef: mobileNavRef,  // Pass nav ref for accurate position calculation
    onNavClick,
    setMouseX,
    setHeaderRect,
    setIsHovering,
    isMobile
  });
  
  // Displacement map generation - using refs instead of getElementById
  useEffect(() => {
    if (!canvasRef.current || dimensions.width === 0 || dimensions.height === 0) return;
    if (!svgFiltersRef.current) return;

    const timeoutId = setTimeout(() => {
      const { width, height } = dimensions;
      const w = Math.max(1, Math.floor(width));
      const h = Math.max(1, Math.floor(height));
      
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = w;
      canvas.height = h;

      // Generate OUTWARD curved stretch - bending outward from ALL pill edges
      const dataLength = w * h * 4;
      const data = new Uint8ClampedArray(dataLength);
      let maxScale = 0;
      const rawValues = [];

      for (let i = 0; i < dataLength; i += 4) {
        const pixelIndex = i / 4;
        const px = pixelIndex % w;
        const py = Math.floor(pixelIndex / w);
        
        const u = px / w;
        const v = py / h;
        const cx = u - 0.5;
        const cy = v - 0.5;
        
        const distFromEdgeY = 0.5 - Math.abs(cy);
        const distFromEdgeX = 0.5 - Math.abs(cx);
        
        // TOP/BOTTOM BENDING - INWARD
        const edgeFactorY = 1 - (distFromEdgeY * 2);
        const curveStrengthY = Math.pow(Math.max(0, edgeFactorY), 1.8) * 0.5;
        const horizontalCurve = Math.cos(cx * Math.PI) * 0.5 + 0.5;
        const curveModifierY = 0.4 + horizontalCurve * 0.6;
        const directionY = cy < 0 ? -1 : 1; // INWARD
        
        // LEFT/RIGHT BENDING - INWARD
        const edgeFactorX = 1 - (distFromEdgeX * 2);
        const curveStrengthX = Math.pow(Math.max(0, edgeFactorX), 1.8) * 0.15;
        const verticalCurve = Math.cos(cy * Math.PI) * 0.5 + 0.5;
        const curveModifierX = 0.4 + verticalCurve * 0.6;
        const directionX = cx < 0 ? -1 : 1; // INWARD
        
        let dispY = directionY * curveStrengthY * curveModifierY;
        let dispX = directionX * curveStrengthX * curveModifierX;

        const ddx = dispX * w;
        const ddy = dispY * h;
        
        maxScale = Math.max(maxScale, Math.abs(ddx), Math.abs(ddy));
        rawValues.push(ddx, ddy);
      }

      if (maxScale === 0) maxScale = 1;

      let index = 0;
      for (let i = 0; i < dataLength; i += 4) {
        const r = (rawValues[index++] / maxScale) * 0.5 + 0.5;
        const g = (rawValues[index++] / maxScale) * 0.5 + 0.5;
        data[i] = Math.round(r * 255);
        data[i + 1] = Math.round(g * 255);
        data[i + 2] = 128;
        data[i + 3] = 255;
      }

      try {
        ctx.putImageData(new ImageData(data, w, h), 0, 0);

        const refs = svgFiltersRef.current;
        const feImage = refs?.feImage;
        const feDisplacement = refs?.feDisplacement;
        const filter = refs?.filter;
        const feImageHover = refs?.feImageHover;
        const feDisplacementHover = refs?.feDisplacementHover;
        const filterHover = refs?.filterHover;
        
        const dataUrl = canvas.toDataURL();
        
        if (feImage && feDisplacement && filter) {
          filter.setAttribute('width', w.toString());
          filter.setAttribute('height', h.toString());
          feImage.setAttribute('width', w.toString());
          feImage.setAttribute('height', h.toString());
          feImage.setAttribute('href', dataUrl);
          feImage.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', dataUrl);
          feDisplacement.setAttribute('scale', (maxScale * 1.0).toString());
        }
        
        // Generate hover displacement map with fixed dimensions for hover bubble (90x50) - INWARD (original)
        if (feImageHover && feDisplacementHover && filterHover) {
          const hoverW = 90;
          const hoverH = 50;
          const hoverDataLength = hoverW * hoverH * 4;
          const hoverMapData = new Uint8ClampedArray(hoverDataLength);
          const hoverRawVals = [];
          let hoverMax = 0;
          
          for (let i = 0; i < hoverDataLength; i += 4) {
            const pixelIndex = i / 4;
            const px = pixelIndex % hoverW;
            const py = Math.floor(pixelIndex / hoverW);
            
            const u = px / hoverW;
            const v = py / hoverH;
            const cx = u - 0.5;
            const cy = v - 0.5;
            
            const distFromEdgeY = 0.5 - Math.abs(cy);
            const distFromEdgeX = 0.5 - Math.abs(cx);
            
            const edgeFactorY = 1 - (distFromEdgeY * 2);
            const curveStrengthY = Math.pow(Math.max(0, edgeFactorY), 2.2) * 0.35;
            const horizontalCurve = Math.cos(cx * Math.PI) * 0.5 + 0.5;
            const curveModifierY = 0.5 + horizontalCurve * 0.5;
            const directionY = cy < 0 ? -1 : 1; // INWARD (original)
            
            const edgeFactorX = 1 - (distFromEdgeX * 2);
            const curveStrengthX = Math.pow(Math.max(0, edgeFactorX), 2.2) * 0.15;
            const verticalCurve = Math.cos(cy * Math.PI) * 0.5 + 0.5;
            const curveModifierX = 0.5 + verticalCurve * 0.5;
            const directionX = cx < 0 ? -1 : 1; // INWARD (original)
            
            let dispY = directionY * curveStrengthY * curveModifierY;
            let dispX = directionX * curveStrengthX * curveModifierX;

            const ddx = dispX * hoverW;
            const ddy = dispY * hoverH;
            
            hoverMax = Math.max(hoverMax, Math.abs(ddx), Math.abs(ddy));
            hoverRawVals.push(ddx, ddy);
          }

          if (hoverMax === 0) hoverMax = 1;

          let hIdx = 0;
          for (let i = 0; i < hoverDataLength; i += 4) {
            const r = (hoverRawVals[hIdx++] / hoverMax) * 0.5 + 0.5;
            const g = (hoverRawVals[hIdx++] / hoverMax) * 0.5 + 0.5;
            hoverMapData[i] = Math.round(r * 255);
            hoverMapData[i + 1] = Math.round(g * 255);
            hoverMapData[i + 2] = 128;
            hoverMapData[i + 3] = 255;
          }
          
          const hoverCanvas = document.createElement('canvas');
          hoverCanvas.width = hoverW;
          hoverCanvas.height = hoverH;
          const hoverCtx = hoverCanvas.getContext('2d');
          hoverCtx.putImageData(new ImageData(hoverMapData, hoverW, hoverH), 0, 0);
          const hoverDataUrl = hoverCanvas.toDataURL();
          
          filterHover.setAttribute('width', hoverW.toString());
          filterHover.setAttribute('height', hoverH.toString());
          feImageHover.setAttribute('width', hoverW.toString());
          feImageHover.setAttribute('height', hoverH.toString());
          feImageHover.setAttribute('href', hoverDataUrl);
          feImageHover.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', hoverDataUrl);
          feDisplacementHover.setAttribute('scale', (hoverMax * 0.5).toString());
        }
      } catch (e) {
        console.warn('ImageData creation failed:', e);
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [filterId, dimensions]);
  
  // Determine which index the indicator should follow
  const indicatorTargetIndex = (isHovering || isTouchActive) && hoveredIndex >= 0 
    ? hoveredIndex 
    : activeIndex;

  // Calculate which item is being hovered based on mouseX position
  const getHoveredIndex = useCallback((x, rect) => {
    if (!rect || items.length === 0) return -1;
    const itemWidth = rect.width / items.length;
    const index = Math.floor(x / itemWidth);
    return Math.max(0, Math.min(index, items.length - 1));
  }, [items.length]);

  // Calculate hovered index based on mouseX position
  const calculatedHoveredIndex = useMemo(() => {
    if ((isHovering || isTouchActive) && headerRect) {
      return getHoveredIndex(mouseX, headerRect);
    }
    return -1;
  }, [mouseX, isHovering, isTouchActive, headerRect, getHoveredIndex]);
  
  // Sync hoveredIndex state with calculated value
  useEffect(() => {
    setHoveredIndex(calculatedHoveredIndex);
  }, [calculatedHoveredIndex]);

  // Handle mouse move - only for desktop
  const handleMouseMove = useCallback((e) => {
    if (isTouchDevice.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setMouseX(e.clientX - rect.left);
    setHeaderRect(rect);
    setIsHovering(true);
  }, [isTouchDevice]);

  // Handle mouse leave - only for desktop
  const handleMouseLeave = useCallback(() => {
    if (isTouchDevice.current) return;
    setIsHovering(false);
  }, [isTouchDevice]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanupTouch;
  }, [cleanupTouch]);

  // Dimension tracking
  useEffect(() => {
    if (!headerRef.current) return;

    const updateDimensions = () => {
      const rect = headerRef.current.getBoundingClientRect();
      setDimensions({ width: rect.width, height: rect.height });
      setHeaderRect(rect);
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    window.addEventListener('scroll', updateDimensions);
    return () => {
      window.removeEventListener('resize', updateDimensions);
      window.removeEventListener('scroll', updateDimensions);
    };
  }, []);

  return (
    <>
      <SVGFilters ref={svgFiltersRef} filterId={filterId} dimensions={dimensions} />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      
      <HoverBubble 
        isHovering={isHovering}
        mouseX={mouseX}
        headerRect={headerRect}
        filterId={filterId}
      />

      <header 
        ref={headerRef}
        className={`liquid-glass-header ${className} py-1.5 px-2 md:px-3 select-none`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '9999px',
          backdropFilter: `url(#${filterId}_filter) blur(1.5px) saturate(1.1) brightness(1.01)`,
          WebkitBackdropFilter: `url(#${filterId}_filter) blur(1.5px) saturate(1.1) brightness(1.01)`,
          background: 'rgba(0, 0, 0, 0.12)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: `
            inset 0 1px 2px rgba(255, 255, 255, 0.15),
            inset 1px 0 2px rgba(255, 255, 255, 0.08),
            inset 0 -1px 2px rgba(0, 0, 0, 0.3),
            inset -1px 0 2px rgba(0, 0, 0, 0.15),
            0 4px 12px rgba(0, 0, 0, 0.25)
          `,
          touchAction: 'none',
          WebkitUserSelect: 'none',
          userSelect: 'none',
          WebkitTouchCallout: 'none',
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        {/* Desktop Navigation */}
        {!isMobile && (
          <div ref={navRef} className="flex items-center gap-1 relative">
            <MovingIndicator
            targetIndex={indicatorTargetIndex}
            itemRefs={desktopItemRefs}
            containerRef={navRef}
            isInteracting={isHovering}
            isMobile={false}
          />
          
          {items.map((item, index) => {
            const isActive = currentPath === item.href;
            const isHovered = hoveredIndex === index;
            const isHighlighted = isHovering ? isHovered : isActive;
            
            return (
              <DesktopNavItem
                key={item.label}
                item={item}
                index={index}
                isHighlighted={isHighlighted}
                onClick={onNavClick}
                itemRef={(el) => desktopItemRefs.current[index] = el}
              />
            );
          })}
        </div>
        )}

        {/* Mobile Navigation */}
        {isMobile && (
        <div ref={mobileNavRef} className="flex items-center gap-0 relative">
          <MovingIndicator
            targetIndex={indicatorTargetIndex}
            itemRefs={mobileItemRefs}
            containerRef={mobileNavRef}
            isInteracting={isTouchActive}
            isMobile={true}
          />
          
          {items.map((item, index) => {
            const isActive = currentPath === item.href;
            const isHovered = hoveredIndex === index;
            const isHighlighted = isTouchActive ? isHovered : isActive;
            
            return (
              <MobileNavItem
                key={item.label}
                item={item}
                index={index}
                isHighlighted={isHighlighted}
                itemRef={(el) => mobileItemRefs.current[index] = el}
              />
            );
          })}
        </div>
        )}
      </header>
    </>
  );
}

export default LiquidGlassHeader;
