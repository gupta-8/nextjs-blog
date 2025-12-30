'use client'
import React, { useRef, useImperativeHandle, forwardRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * SVG Filters for Liquid Glass Effect
 * Contains displacement map filters for main and hover effects
 * Rendered to document.body via portal so filters are accessible globally
 */
const SVGFilters = forwardRef(function SVGFilters({ filterId, dimensions }, ref) {
  const feImageRef = useRef(null);
  const feDisplacementRef = useRef(null);
  const filterRef = useRef(null);
  const feImageHoverRef = useRef(null);
  const feDisplacementHoverRef = useRef(null);
  const filterHoverRef = useRef(null);
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Expose refs to parent
  useImperativeHandle(ref, () => ({
    feImage: feImageRef.current,
    feDisplacement: feDisplacementRef.current,
    filter: filterRef.current,
    feImageHover: feImageHoverRef.current,
    feDisplacementHover: feDisplacementHoverRef.current,
    filterHover: filterHoverRef.current,
  }));
  
  const svgContent = (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="0" 
      height="0"
      style={{ position: 'absolute', pointerEvents: 'none' }}
    >
      <defs>
        <filter 
          ref={filterRef}
          id={`${filterId}_filter`}
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
          x="0" y="0" 
          width={dimensions.width} 
          height={dimensions.height}
        >
          <feImage 
            ref={feImageRef}
            id={`${filterId}_map`}
            width={dimensions.width}
            height={dimensions.height}
            result="displacement-map"
          />
          <feDisplacementMap 
            ref={feDisplacementRef}
            id={`${filterId}_displacement`}
            in="SourceGraphic" 
            in2="displacement-map"
            xChannelSelector="R"
            yChannelSelector="G"
            scale="22"
          />
        </filter>
        {/* Stronger displacement filter for hover effect */}
        <filter 
          ref={filterHoverRef}
          id={`${filterId}_filter_hover`}
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
          x="0" y="0" 
          width="90" 
          height="50"
        >
          <feImage 
            ref={feImageHoverRef}
            id={`${filterId}_map_hover`}
            width="90"
            height="50"
            result="displacement-map-hover"
          />
          <feDisplacementMap 
            ref={feDisplacementHoverRef}
            id={`${filterId}_displacement_hover`}
            in="SourceGraphic" 
            in2="displacement-map-hover"
            xChannelSelector="R"
            yChannelSelector="G"
            scale="100"
          />
        </filter>
      </defs>
    </svg>
  );
  
  // Render SVG to document.body via portal so it's globally accessible
  if (!mounted) return null;
  
  return createPortal(svgContent, document.body);
});

export default SVGFilters;
