'use client'
import { useCallback, useRef, useState } from 'react';

// Thresholds for distinguishing tap from scroll
const TAP_DISTANCE_THRESHOLD = 10; // pixels
const TAP_TIME_THRESHOLD = 300; // milliseconds
const LONG_PRESS_DURATION = 400; // milliseconds

/**
 * Custom hook for handling touch navigation - distinguishes taps from scrolls
 */
export default function useTouchNavigation({
  items,
  headerRef,
  navRef,  // Reference to the actual nav container (for accurate position calculation)
  onNavClick,
  setMouseX,
  setHeaderRect,
  setIsHovering,
  isMobile
}) {
  const longPressTimer = useRef(null);
  const touchData = useRef({ 
    startX: 0, 
    startY: 0, 
    startRelX: 0, 
    startTime: 0, 
    currentRelX: 0,
    navRect: null,
    wasTap: true, 
    navigated: false 
  });
  const isTouchDevice = useRef(false);
  const [isTouchActive, setIsTouchActive] = useState(false);

  // Calculate which item index is at a given X position relative to nav container
  const getItemIndexAtPosition = useCallback((relX, navRect) => {
    if (!navRect || items.length === 0) return -1;
    const itemWidth = navRect.width / items.length;
    const index = Math.floor(relX / itemWidth);
    return Math.max(0, Math.min(index, items.length - 1));
  }, [items.length]);

  // Get the nav rect (use navRef on mobile for accurate positioning)
  const getNavRect = useCallback(() => {
    if (isMobile && navRef?.current) {
      return navRef.current.getBoundingClientRect();
    }
    return headerRef?.current?.getBoundingClientRect();
  }, [isMobile, navRef, headerRef]);

  // Handle touch start
  const handleTouchStart = useCallback((e) => {
    isTouchDevice.current = true;
    
    // Clear any existing timer
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    
    const touch = e.touches[0];
    // Get the nav container rect for accurate position calculation
    const navRect = getNavRect();
    const headerRect = e.currentTarget.getBoundingClientRect();
    
    if (!navRect) return;
    
    // Calculate position relative to nav container
    const relX = touch.clientX - navRect.left;
    
    // Store touch data
    touchData.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      startRelX: relX,
      startTime: Date.now(),
      currentRelX: relX,
      navRect: navRect,
      wasTap: true,
      navigated: false
    };
    
    setHeaderRect(headerRect);
    
    // Start long press timer
    longPressTimer.current = setTimeout(() => {
      // Activate hover mode after long press
      touchData.current.wasTap = false;
      setIsTouchActive(true);
      setIsHovering(true);
      setMouseX(touchData.current.currentRelX);
    }, LONG_PRESS_DURATION);
  }, [setMouseX, setHeaderRect, setIsHovering, getNavRect]);

  // Handle touch move
  const handleTouchMove = useCallback((e) => {
    const touch = e.touches[0];
    const data = touchData.current;
    
    // Calculate movement from start
    const dx = Math.abs(touch.clientX - data.startX);
    const dy = Math.abs(touch.clientY - data.startY);
    
    // If not in active hover mode yet
    if (!isTouchActive) {
      // Cancel long press if finger moved too much
      if (dx > 10 || dy > 10) {
        data.wasTap = false;
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
      }
      return;
    }
    
    // In long-press hover mode - track finger position
    const navRect = getNavRect() || data.navRect;
    
    if (navRect) {
      e.preventDefault(); // Prevent scrolling while in hover mode
      
      // Calculate position relative to nav container
      const relX = touch.clientX - navRect.left;
      const clampedX = Math.max(0, Math.min(relX, navRect.width));
      
      // Update current position
      data.currentRelX = clampedX;
      data.navRect = navRect;
      
      setMouseX(clampedX);
      setHeaderRect(headerRef?.current?.getBoundingClientRect());
    }
  }, [isTouchActive, getNavRect, setMouseX, setHeaderRect, headerRef]);

  // Handle touch end
  const handleTouchEnd = useCallback((e) => {
    // Clear long press timer
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    
    const data = touchData.current;
    const touchEndTime = Date.now();
    const touchDuration = touchEndTime - data.startTime;
    
    // Get final touch position
    const touch = e.changedTouches?.[0];
    
    if (touch) {
      const navRect = getNavRect() || data.navRect;
      if (navRect) {
        // Update final position from where finger lifted (relative to nav)
        data.currentRelX = touch.clientX - navRect.left;
        data.navRect = navRect;
      }
    }
    
    const navRect = data.navRect;
    
    // Case 1: Long press hover release - navigate to where finger is now
    if (isTouchActive && navRect && !data.navigated) {
      const finalX = Math.max(0, Math.min(data.currentRelX, navRect.width));
      const selectedIndex = getItemIndexAtPosition(finalX, navRect);
      
      if (selectedIndex >= 0 && selectedIndex < items.length) {
        // Navigate to the selected item
        onNavClick?.(items[selectedIndex].href);
        data.navigated = true;
      }
    }
    // Case 2: Quick tap - navigate to tapped item
    else if (data.wasTap && !data.navigated && navRect) {
      const isQuickTap = touchDuration < TAP_TIME_THRESHOLD;
      
      // Check if finger stayed relatively still
      let dx = 0, dy = 0;
      if (touch) {
        dx = Math.abs(touch.clientX - data.startX);
        dy = Math.abs(touch.clientY - data.startY);
      }
      const isStationary = dx < TAP_DISTANCE_THRESHOLD && dy < TAP_DISTANCE_THRESHOLD;
      
      if (isQuickTap && isStationary) {
        const tappedIndex = getItemIndexAtPosition(data.startRelX, navRect);
        
        if (tappedIndex >= 0 && tappedIndex < items.length) {
          onNavClick?.(items[tappedIndex].href);
          data.navigated = true;
        }
      }
    }
    
    // Reset state
    setIsTouchActive(false);
    setIsHovering(false);
    
    // Reset touch device flag after short delay
    setTimeout(() => {
      isTouchDevice.current = false;
    }, 100);
  }, [isTouchActive, getNavRect, items, onNavClick, setIsHovering, getItemIndexAtPosition]);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  return {
    isTouchActive,
    isTouchDevice,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    cleanup
  };
}
