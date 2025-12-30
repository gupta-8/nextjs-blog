'use client'
import { useEffect } from 'react';

/**
 * Custom hook for generating SVG displacement maps for liquid glass effect
 */
export default function useDisplacementMap(canvasRef, filterId, dimensions) {
  useEffect(() => {
    if (!canvasRef.current || dimensions.width === 0 || dimensions.height === 0) return;

    // Small delay to ensure SVG elements are mounted in DOM
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

    // Generate inverted curved stretch - bending inward from ALL pill edges
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
      
      // TOP/BOTTOM BENDING
      const edgeFactorY = 1 - (distFromEdgeY * 2);
      const curveStrengthY = Math.pow(Math.max(0, edgeFactorY), 1.8) * 0.4;
      const horizontalCurve = Math.cos(cx * Math.PI) * 0.5 + 0.5;
      const curveModifierY = 0.4 + horizontalCurve * 0.6;
      const directionY = cy < 0 ? -1 : 1;
      
      // LEFT/RIGHT BENDING
      const edgeFactorX = 1 - (distFromEdgeX * 2);
      const curveStrengthX = Math.pow(Math.max(0, edgeFactorX), 1.8) * 0.1;
      const verticalCurve = Math.cos(cy * Math.PI) * 0.5 + 0.5;
      const curveModifierX = 0.4 + verticalCurve * 0.6;
      const directionX = cx < 0 ? -1 : 1;
      
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

    // Generate INWARD bending displacement map for hover effect
    const hoverData = new Uint8ClampedArray(dataLength);
    const hoverRawValues = [];
    let hoverMaxScale = 0;

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
      
      const edgeFactorY = 1 - (distFromEdgeY * 2);
      const curveStrengthY = Math.pow(Math.max(0, edgeFactorY), 2.2) * 0.25;
      const horizontalCurve = Math.cos(cx * Math.PI) * 0.5 + 0.5;
      const curveModifierY = 0.5 + horizontalCurve * 0.5;
      const directionY = cy < 0 ? -1 : 1;
      
      const edgeFactorX = 1 - (distFromEdgeX * 2);
      const curveStrengthX = Math.pow(Math.max(0, edgeFactorX), 2.2) * 0.08;
      const verticalCurve = Math.cos(cy * Math.PI) * 0.5 + 0.5;
      const curveModifierX = 0.5 + verticalCurve * 0.5;
      const directionX = cx < 0 ? -1 : 1;
      
      let dispY = directionY * curveStrengthY * curveModifierY;
      let dispX = directionX * curveStrengthX * curveModifierX;

      const ddx = dispX * w;
      const ddy = dispY * h;
      
      hoverMaxScale = Math.max(hoverMaxScale, Math.abs(ddx), Math.abs(ddy));
      hoverRawValues.push(ddx, ddy);
    }

    if (hoverMaxScale === 0) hoverMaxScale = 1;

    let hoverIndex = 0;
    for (let i = 0; i < dataLength; i += 4) {
      const r = (hoverRawValues[hoverIndex++] / hoverMaxScale) * 0.5 + 0.5;
      const g = (hoverRawValues[hoverIndex++] / hoverMaxScale) * 0.5 + 0.5;
      hoverData[i] = Math.round(r * 255);
      hoverData[i + 1] = Math.round(g * 255);
      hoverData[i + 2] = 128;
      hoverData[i + 3] = 255;
    }

    try {
      ctx.putImageData(new ImageData(data, w, h), 0, 0);

      const feImage = document.getElementById(`${filterId}_map`);
      const feDisplacement = document.getElementById(`${filterId}_displacement`);
      const filter = document.getElementById(`${filterId}_filter`);
      
      const feImageHover = document.getElementById(`${filterId}_map_hover`);
      const feDisplacementHover = document.getElementById(`${filterId}_displacement_hover`);
      const filterHover = document.getElementById(`${filterId}_filter_hover`);
      
      const dataUrl = canvas.toDataURL();
      
      console.log('Displacement map debug:', { 
        filterId, 
        feImageFound: !!feImage, 
        filterFound: !!filter,
        dataUrlLength: dataUrl.length 
      });
      
      if (feImage && feDisplacement && filter) {
        filter.setAttribute('width', w.toString());
        filter.setAttribute('height', h.toString());
        feImage.setAttribute('width', w.toString());
        feImage.setAttribute('height', h.toString());
        // Set href using both methods for cross-browser compatibility
        feImage.setAttribute('href', dataUrl);
        feImage.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', dataUrl);
        feDisplacement.setAttribute('scale', (maxScale * 0.85).toString());
        console.log('Displacement map set successfully');
      } else {
        console.warn('Displacement map elements not found:', { feImage: !!feImage, filter: !!filter });
      }
      
      if (feImageHover && feDisplacementHover && filterHover) {
        const hoverCanvas = document.createElement('canvas');
        hoverCanvas.width = w;
        hoverCanvas.height = h;
        const hoverCtx = hoverCanvas.getContext('2d');
        hoverCtx.putImageData(new ImageData(hoverData, w, h), 0, 0);
        const hoverDataUrl = hoverCanvas.toDataURL();
        
        filterHover.setAttribute('width', w.toString());
        filterHover.setAttribute('height', h.toString());
        feImageHover.setAttribute('width', w.toString());
        feImageHover.setAttribute('height', h.toString());
        // Set href using both methods for cross-browser compatibility
        feImageHover.setAttribute('href', hoverDataUrl);
        feImageHover.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', hoverDataUrl);
        feDisplacementHover.setAttribute('scale', (hoverMaxScale * 0.3).toString());
      }
    } catch (e) {
      console.warn('ImageData creation failed:', e);
    }
    }, 50); // End setTimeout

    return () => clearTimeout(timeoutId);
  }, [filterId, dimensions, canvasRef]);
}
