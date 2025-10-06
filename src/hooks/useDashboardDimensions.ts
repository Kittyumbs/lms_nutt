import { useState, useCallback } from 'react';

interface DetectedDimensions {
  width: number;
  height: number;
}

interface UseDashboardDimensionsOptions {
  url: string;
  onDimensionsDetected?: (dimensions: DetectedDimensions) => void;
}

export const useDashboardDimensions = ({ url, onDimensionsDetected }: UseDashboardDimensionsOptions) => {
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectedDimensions, setDetectedDimensions] = useState<DetectedDimensions | null>(null);
  const [error, setError] = useState<string | null>(null);

  const detectDimensions = useCallback(async () => {
    if (!url) return;

    setIsDetecting(true);
    setError(null);
    
    try {
      // Create a hidden iframe to detect content dimensions
      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.left = '-9999px';
      iframe.style.top = '-9999px';
      iframe.style.width = '1000px'; // Start with a large width
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
      
      // Try to get content dimensions
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (iframeDoc) {
          const bodyWidth = iframeDoc.body?.scrollWidth || iframeDoc.documentElement?.scrollWidth;
          const bodyHeight = iframeDoc.body?.scrollHeight || iframeDoc.documentElement?.scrollHeight;
          const documentWidth = iframeDoc.documentElement?.scrollWidth;
          const documentHeight = iframeDoc.documentElement?.scrollHeight;
          
          const detectedWidth = Math.max(bodyWidth || 0, documentWidth || 0);
          const detectedHeight = Math.max(bodyHeight || 0, documentHeight || 0);
          
          if (detectedWidth > 0 && detectedHeight > 0) {
            const dimensions = { width: detectedWidth, height: detectedHeight };
            setDetectedDimensions(dimensions);
            onDimensionsDetected?.(dimensions);
            console.log('📏 Detected dashboard dimensions:', dimensions);
          } else {
            throw new Error('Could not detect dimensions');
          }
        } else {
          throw new Error('Cannot access iframe content');
        }
      } catch (error) {
        console.log('⚠️ Cannot access iframe content (CORS):', error);
        // Fallback to default dimensions
        const fallbackDimensions = { width: 1200, height: 800 };
        setDetectedDimensions(fallbackDimensions);
        onDimensionsDetected?.(fallbackDimensions);
        console.log('📏 Using fallback dimensions:', fallbackDimensions);
      }
      
      document.body.removeChild(iframe);
      } catch (error) {
        console.error('❌ Error detecting dimensions:', error);
        setError('Failed to detect dashboard dimensions');
        // Don't set fallback dimensions, let the error be handled by the parent
        throw error; // Re-throw to let parent handle the error
      } finally {
        setIsDetecting(false);
      }
  }, [url, onDimensionsDetected]);

  const calculateProportionalDimensions = useCallback((
    originalDimensions: DetectedDimensions,
    targetWidth?: number,
    targetHeight?: number
  ) => {
    const { width: origWidth, height: origHeight } = originalDimensions;
    
    if (targetWidth && !targetHeight) {
      // Calculate height based on width (max-width mode)
      const ratio = origHeight / origWidth;
      const calculatedHeight = Math.round(targetWidth * ratio);
      return { width: targetWidth, height: calculatedHeight };
    } else if (targetHeight && !targetWidth) {
      // Calculate width based on height (max-height mode)
      const ratio = origWidth / origHeight;
      const calculatedWidth = Math.round(targetHeight * ratio);
      return { width: calculatedWidth, height: targetHeight };
    }
    
    return originalDimensions;
  }, []);

  return {
    isDetecting,
    detectedDimensions,
    error,
    detectDimensions,
    calculateProportionalDimensions
  };
};
