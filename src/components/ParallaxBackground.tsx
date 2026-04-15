import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';

interface ParallaxBackgroundProps {
  src: string;
  alt?: string;
  className?: string;
  imageClassName?: string;
  speed?: number;
  fallbackSrc?: string;
}

export default function ParallaxBackground({ src, alt = '', className = '', imageClassName = '', speed = 0.5, fallbackSrc }: ParallaxBackgroundProps) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });
  
  // Move the background image down as we scroll down
  const y = useTransform(scrollYProgress, [0, 1], ["-20%", "20%"]);

  return (
    <div ref={ref} className={`absolute inset-0 overflow-hidden ${className}`}>
      <motion.div style={{ y, width: '100%', height: '120%', top: '-10%', position: 'absolute' }}>
        <img
          src={src}
          alt={alt}
          className={`w-full h-full object-cover ${imageClassName}`}
          referrerPolicy="no-referrer"
          onError={(e) => {
            if (fallbackSrc) {
              (e.target as HTMLImageElement).src = fallbackSrc;
            }
          }}
        />
      </motion.div>
    </div>
  );
}
