import React, { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, useTransform } from 'motion/react';
import { Car, RefreshCw } from 'lucide-react';

interface SlideToBookButtonProps {
  onConfirm: () => void;
  isLoading: boolean;
  disabled: boolean;
}

export default function SlideToBookButton({ onConfirm, isLoading, disabled }: SlideToBookButtonProps) {
  const [isConfirmed, setIsConfirmed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const sliderWidth = 56; // Width of the sliding button (circle)
  const containerWidth = useRef(0);
  
  const x = useMotionValue(0);
  
  useEffect(() => {
    if (containerRef.current) {
      containerWidth.current = containerRef.current.offsetWidth;
    }
    
    const handleResize = () => {
      if (containerRef.current) {
        containerWidth.current = containerRef.current.offsetWidth;
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleDragEnd = () => {
    const maxDrag = containerWidth.current - (sliderWidth - 8) - 8; // 8px for padding (4px left + 4px right)
    
    if (x.get() >= maxDrag * 0.8) {
      // Confirmed
      x.set(maxDrag);
      setIsConfirmed(true);
      onConfirm();
    } else {
      // Reset
      x.set(0);
    }
  };

  useEffect(() => {
    if (!isLoading && isConfirmed) {
      // Reset if loading finishes and we want to allow re-submission (e.g. on error)
      x.set(0);
      setIsConfirmed(false);
    }
    if (disabled && !isLoading) {
       x.set(0);
       setIsConfirmed(false);
    }
  }, [isLoading, disabled, isConfirmed, x]);

  return (
    <div 
      ref={containerRef}
      className={`relative h-14 rounded-full flex items-center overflow-hidden transition-opacity ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
      style={{ backgroundColor: '#4f46e5' }} // indigo-600
    >
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="text-white font-medium text-sm z-10 flex items-center gap-2">
          {isLoading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" /> Processing...
            </>
          ) : (
            'Slide to Book'
          )}
        </span>
      </div>

      <motion.div
        className="absolute left-1 top-1 bottom-1 bg-white rounded-full flex items-center justify-center shadow-md z-20 cursor-grab active:cursor-grabbing"
        style={{ 
          width: sliderWidth - 8, // Adjust for smaller height
          height: sliderWidth - 8,
          x,
          pointerEvents: disabled || isLoading || isConfirmed ? 'none' : 'auto'
        }}
        drag={disabled || isLoading || isConfirmed ? false : "x"}
        dragConstraints={{ left: 0, right: containerWidth.current ? containerWidth.current - (sliderWidth - 8) - 8 : 200 }}
        dragElastic={0.1}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
      >
        <Car className="w-5 h-5 text-indigo-600" />
      </motion.div>
    </div>
  );
}
