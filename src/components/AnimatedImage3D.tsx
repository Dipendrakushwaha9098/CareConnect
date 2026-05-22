import React, { useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

interface AnimatedImage3DProps {
  src: string;
  alt: string;
  className?: string;
  containerClassName?: string;
}

export function AnimatedImage3D({
  src,
  alt,
  className = "",
  containerClassName = "",
}: AnimatedImage3DProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 150, damping: 20 });
  const mouseYSpring = useSpring(y, { stiffness: 150, damping: 20 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["10deg", "-10deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-10deg", "10deg"]);
  
  const shineX = useTransform(mouseXSpring, [-0.5, 0.5], ["0%", "100%"]);
  const shineY = useTransform(mouseYSpring, [-0.5, 0.5], ["0%", "100%"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;

    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;

    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseEnter = () => setHovered(true);
  
  const handleMouseLeave = () => {
    setHovered(false);
    x.set(0);
    y.set(0);
  };

  return (
    <div 
      className={`relative perspective-2000 ${containerClassName}`}
      style={{ perspective: "2000px" }}
    >
      <motion.div
        ref={ref}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateY,
          rotateX,
          transformStyle: "preserve-3d",
        }}
        className="w-full h-full cursor-pointer rounded-[2.5rem] overflow-hidden bg-slate-900 shadow-2xl"
      >
        <motion.div 
            style={{ 
              transform: "translateZ(50px) scale(1.1)",
            }}
            className="w-full h-full relative"
        >
            <img
              src={src}
              alt={alt}
              className={`w-full h-full object-cover transition-all duration-700 ${hovered ? 'scale-110' : 'scale-100'} ${className}`}
              style={{ pointerEvents: "none" }}
            />
            
            {/* Dynamic Shine Layer */}
            <motion.div 
              style={{
                background: `radial-gradient(circle at ${shineX} ${shineY}, rgba(255,255,255,0.3) 0%, transparent 60%)`,
                transform: "translateZ(60px)",
              }}
              className="absolute inset-0 pointer-events-none mix-blend-overlay"
            />
        </motion.div>
        
        {/* Border Glow */}
        <motion.div
          animate={{ opacity: hovered ? 1 : 0 }}
          className="absolute inset-0 border-[3px] border-blue-400/30 rounded-[2.5rem] pointer-events-none"
          style={{ transform: "translateZ(70px)" }}
        />
        
        {/* Depth Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent pointer-events-none" />
      </motion.div>
    </div>
  );
}

