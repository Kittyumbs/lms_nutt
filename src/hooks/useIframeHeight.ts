import { useState, useEffect, useCallback } from 'react';

interface UseIframeHeightOptions {
  url: string;
  width: string;
  height: string;
  onHeightDetected?: (detectedHeight: number) => void;
}

export const useIframeHeight = ({ url, width, height, onHeightDetected }: UseIframeHeightOptions) => {
  const [detectedHeight, setDetectedHeight] = useState<number | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);

  const detectHeight = useCallback(async () => {
    if (height !== 'auto' || !url) return;

    setIsDetecting(true);
    
    try {
      // Create a hidden iframe to detect content height
      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.left = '-9999px';
      iframe.style.top = '-9999px';
      iframe.style.width = width;
      iframe.style.height = '1000px'; // Start with a large height
      iframe.src = url;
      iframe.style.border = 'none';
      
      document.body.appendChild(iframe);
      
      // Wait for iframe to load
      await new Promise((resolve) => {
        iframe.onload = resolve;
        // Fallback timeout
        setTimeout(resolve, 5000);
      });
      
      // Try to get content height
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (iframeDoc) {
          const bodyHeight = iframeDoc.body?.scrollHeight || iframeDoc.documentElement?.scrollHeight;
          const documentHeight = iframeDoc.documentElement?.scrollHeight;
          const detected = Math.max(bodyHeight || 0, documentHeight || 0);
          
          if (detected > 0) {
            setDetectedHeight(detected);
            onHeightDetected?.(detected);
            console.log('📏 Detected iframe height:', detected);
          }
        }
      } catch (error) {
        console.log('⚠️ Cannot access iframe content (CORS):', error);
        // Fallback to default height
        const fallbackHeight = 600;
        setDetectedHeight(fallbackHeight);
        onHeightDetected?.(fallbackHeight);
      }
      
      document.body.removeChild(iframe);
    } catch (error) {
      console.error('❌ Error detecting iframe height:', error);
      // Fallback to default height
      const fallbackHeight = 600;
      setDetectedHeight(fallbackHeight);
      onHeightDetected?.(fallbackHeight);
    } finally {
      setIsDetecting(false);
    }
  }, [url, width, height, onHeightDetected]);

  useEffect(() => {
    if (height === 'auto' && url) {
      detectHeight();
    }
  }, [detectHeight, height, url]);

  return {
    detectedHeight,
    isDetecting,
    detectHeight
  };
};
