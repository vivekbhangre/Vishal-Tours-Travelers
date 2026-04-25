import React, { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'motion/react';
import { Car, RefreshCw, Check } from 'lucide-react';

interface SlideToBookButtonProps {
  onConfirm: () => void;
  isLoading: boolean;
  disabled: boolean;
  text?: string;
}

export default function SlideToBookButton({ onConfirm, isLoading, disabled, text = 'Slide to Book' }: SlideToBookButtonProps) {
  const [isConfirmed, setIsConfirmed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const sliderWidth = 56; // Width of the sliding button (circle)
  const [maxDrag, setMaxDrag] = useState(200);
  
  const x = useMotionValue(0);
  
  // Smoothly transition background and icon color based on drag position
  const backgroundColor = useTransform(x, [0, maxDrag], ['#4f46e5', '#22c55e']);
  const iconColor = useTransform(x, [0, maxDrag], ['#4f46e5', '#22c55e']);
  
  useEffect(() => {
    const updateMaxDrag = () => {
      if (containerRef.current) {
        setMaxDrag(containerRef.current.offsetWidth - (sliderWidth - 8) - 8);
      }
    };
    
    updateMaxDrag();
    window.addEventListener('resize', updateMaxDrag);
    return () => window.removeEventListener('resize', updateMaxDrag);
  }, []);

  const handleDragEnd = () => {
    // Lower threshold to 65% so it's much easier and feels smoother to slide all the way
    if (x.get() >= maxDrag * 0.65) {
      // Confirmed - smoothly snap to the very end with a satisfying spring
      animate(x, maxDrag, { type: "spring", stiffness: 400, damping: 30 });
      setIsConfirmed(true);
      
      // Haptic feedback (success pattern: two short bursts)
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([30, 50, 30]);
      }

      // Delay onConfirm slightly to let the user see the green state and checkmark
      setTimeout(() => {
        onConfirm();
      }, 700);
    } else {
      // Reset - smoothly bounce back to the start instead of an ugly jump
      animate(x, 0, { type: "spring", stiffness: 400, damping: 30 });
    }
  };

  useEffect(() => {
    // Allow the button to stay at the right position when confirmed.
    // We only reset if the button is explicitly disabled (e.g. form validation fails).
    if (disabled && !isLoading) {
       animate(x, 0, { type: "spring", stiffness: 400, damping: 30 });
       setIsConfirmed(false);
    }
  }, [isLoading, disabled, x]);

  return (
    <motion.div 
      ref={containerRef}
      className={`relative h-14 rounded-full flex items-center overflow-hidden ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
      style={{ 
        backgroundColor,
        touchAction: 'none' // Fixes the stuttering/stuck issue on mobile
      }}
    >
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <motion.span 
          key={isConfirmed ? 'confirmed' : 'default'}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-white font-medium text-sm z-10 flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" /> Processing...
            </>
          ) : isConfirmed ? (
            <>
              <Check className="w-4 h-4" /> Confirmed!
            </>
          ) : (
            text
          )}
        </motion.span>
      </div>

      <motion.div
        className="absolute left-1 top-1 bottom-1 bg-white rounded-full flex items-center justify-center shadow-md z-20 cursor-grab active:cursor-grabbing"
        style={{ 
          width: sliderWidth - 8, // Adjust for smaller height
          height: sliderWidth - 8,
          x,
          pointerEvents: disabled || isLoading || isConfirmed ? 'none' : 'auto',
          touchAction: 'none'
        }}
        drag={disabled || isLoading || isConfirmed ? false : "x"}
        dragConstraints={{ left: 0, right: maxDrag }}
        dragElastic={0.1}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
      >
        <motion.div
          key={isConfirmed ? 'check' : 'car'}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="flex items-center justify-center w-full h-full"
        >
          {isConfirmed ? (
            <Check className="w-5 h-5 text-green-500" />
          ) : (
            <motion.div style={{ color: iconColor }} className="flex items-center justify-center">
              <Car className="w-5 h-5" />
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
