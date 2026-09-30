import { useState, useEffect } from 'react';

export function useKeyboardVisible(threshold = 120) {
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const viewport = window.visualViewport;
    const layoutHeight = window.innerHeight;

    function handleResize() {
      const viewportHeight = viewport ? viewport.height : window.innerHeight;
      const heightDiff = Math.max(0, layoutHeight - viewportHeight);
      const visible = heightDiff > threshold;
      setIsKeyboardVisible(visible);
      setKeyboardHeight(visible ? heightDiff : 0);
    }

    if (viewport) {
      viewport.addEventListener('resize', handleResize);
      viewport.addEventListener('scroll', handleResize, { passive: true });
    } else {
      window.addEventListener('resize', handleResize);
    }

    handleResize();

    return () => {
      if (viewport) {
        viewport.removeEventListener('resize', handleResize);
        viewport.removeEventListener('scroll', handleResize);
      } else {
        window.removeEventListener('resize', handleResize);
      }
    };
  }, [threshold]);

  return { isKeyboardVisible, keyboardHeight };
}