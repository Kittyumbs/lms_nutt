import React, { useState, useEffect, useRef } from 'react';
import './AnimatedTabs.css';

interface AnimatedTabsProps {
  items: Array<{ label: string; value: string }>;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export default function AnimatedTabs({ items, value, onChange, className = '' }: AnimatedTabsProps) {
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number }>({ left: 0, width: 0 });
  const [isAnimating, setIsAnimating] = useState(false);
  const tabsRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const previousValueRef = useRef<string>(value);

  // Update indicator position when value changes
  useEffect(() => {
    const activeTab = tabRefs.current.get(value);
    const container = tabsRef.current;
    
    if (!activeTab || !container) return;

    // Get the active tab's position relative to container
    const containerRect = container.getBoundingClientRect();
    const tabRect = activeTab.getBoundingClientRect();
    
    const left = tabRect.left - containerRect.left;
    const width = tabRect.width;

    // Only animate if value actually changed (not initial render)
    if (previousValueRef.current !== value) {
      setIsAnimating(true);
      // Reset animation class after animation completes
      setTimeout(() => setIsAnimating(false), 300);
    }

    // Update indicator position - this will animate smoothly
    setIndicatorStyle({ left, width });
    previousValueRef.current = value;
  }, [value, items]);

  // Initial position setup
  useEffect(() => {
    const activeTab = tabRefs.current.get(value);
    const container = tabsRef.current;
    
    if (!activeTab || !container) return;

    const containerRect = container.getBoundingClientRect();
    const tabRect = activeTab.getBoundingClientRect();
    
    const left = tabRect.left - containerRect.left;
    const width = tabRect.width;

    setIndicatorStyle({ left, width });
    previousValueRef.current = value;
  }, []); // Only run once on mount

  return (
    <div className={`animated-tabs-container ${className}`} ref={tabsRef}>
      <div className="animated-tabs-wrapper">
        {items.map((item) => (
          <button
            key={item.value}
            ref={(el) => {
              if (el) {
                tabRefs.current.set(item.value, el);
              } else {
                tabRefs.current.delete(item.value);
              }
            }}
            className={`animated-tab ${value === item.value ? 'active' : ''}`}
            onClick={() => onChange(item.value)}
            type="button"
          >
            {item.label}
          </button>
        ))}
        <div
          className={`animated-tab-indicator ${isAnimating ? 'animating' : ''}`}
          style={{
            left: `${indicatorStyle.left}px`,
            width: `${indicatorStyle.width}px`,
          }}
        />
      </div>
    </div>
  );
}

