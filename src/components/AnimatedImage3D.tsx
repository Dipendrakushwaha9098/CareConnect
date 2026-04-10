import React, { useRef } from "react";
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

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 300, damping: 20 });
  const mouseYSpring = useSpring(y, { stiffness: 300, damping: 20 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["15deg", "-15deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-15deg", "15deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;

    const rect = ref.current.getBoundingClientRect();
    
    // Calculate mouse position relative to center of element
    const width = rect.width;
    const height = rect.height;
    
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;

    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <div 
      className={`relative perspective-1000 ${containerClassName}`}
      style={{ perspective: "1000px" }}
    >
      <motion.div
        ref={ref}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateY,
          rotateX,
          transformStyle: "preserve-3d",
        }}
        className="w-full h-full cursor-pointer rounded-2xl overflow-hidden"
      >
        <motion.div 
            style={{ transform: "translateZ(30px)" }}
            className="w-full h-full"
        >
            <img
            src={src}
            alt={alt}
            className={`w-full h-full object-cover shadow-2xl transition-shadow hover:shadow-blue-500/30 ${className}`}
            style={{ pointerEvents: "none" }}
            />
        </motion.div>
        
        {/* Glow Effect */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none rounded-2xl mix-blend-overlay"
          style={{ transform: "translateZ(40px)" }}
        />
      </motion.div>
    </div>
  );
}
