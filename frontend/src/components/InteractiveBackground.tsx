import { motion, useMotionValue, useSpring } from 'framer-motion';
import { useEffect, useState } from 'react';

export function InteractiveBackground() {
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Mouse tracking values
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth springs for tracking
  const springX1 = useSpring(mouseX, { stiffness: 40, damping: 25 });
  const springY1 = useSpring(mouseY, { stiffness: 40, damping: 25 });

  const springX2 = useSpring(mouseX, { stiffness: 25, damping: 20 });
  const springY2 = useSpring(mouseY, { stiffness: 25, damping: 20 });

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024 || 'ontouchstart' in window);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);

    const handleMouseMove = (e: MouseEvent) => {
      if (window.innerWidth < 1024) return;
      // Normalise mouse position relative to window center (-0.5 to 0.5)
      const x = (e.clientX / window.innerWidth) - 0.5;
      const y = (e.clientY / window.innerHeight) - 0.5;
      mouseX.set(x * 120); // Move range in px
      mouseY.set(y * 120);
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('mousemove', handleMouseMove as any);
    };
  }, [mouseX, mouseY]);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Dynamic Background Mesh */}
      <div className="absolute inset-0 bg-mesh opacity-90" />

      {/* Floating Ambient Orbs */}
      {!isMobile ? (
        <>
          {/* Moss green glowing blob 1 */}
          <motion.div
            style={{
              x: springX1,
              y: springY1,
              background: 'radial-gradient(circle, rgba(90, 158, 88, 0.12) 0%, transparent 70%)',
            }}
            className="absolute top-[10%] left-[15%] w-[600px] h-[600px] rounded-full filter blur-[60px]"
            animate={{
              scale: [1, 1.15, 1],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />

          {/* Golden wheat glowing blob 2 */}
          <motion.div
            style={{
              x: springX2,
              y: springY2,
              background: 'radial-gradient(circle, rgba(212, 168, 83, 0.07) 0%, transparent 70%)',
            }}
            className="absolute bottom-[10%] right-[15%] w-[550px] h-[550px] rounded-full filter blur-[60px]"
            animate={{
              scale: [1.1, 0.95, 1.1],
            }}
            transition={{
              duration: 14,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />

          {/* Sky blue glowing blob 3 */}
          <motion.div
            style={{
              x: springY1, // cross-axis mapping for more organic motion
              y: springX2,
              background: 'radial-gradient(circle, rgba(110, 181, 217, 0.05) 0%, transparent 70%)',
            }}
            className="absolute top-[40%] right-[30%] w-[450px] h-[450px] rounded-full filter blur-[50px]"
            animate={{
              scale: [0.9, 1.05, 0.9],
            }}
            transition={{
              duration: 12,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        </>
      ) : (
        <>
          {/* Static floating blobs for mobile to conserve CPU */}
          <div
            className="absolute top-[5%] left-[5%] w-[350px] h-[350px] rounded-full filter blur-[40px] opacity-60"
            style={{ background: 'radial-gradient(circle, rgba(90, 158, 88, 0.15) 0%, transparent 70%)' }}
          />
          <div
            className="absolute bottom-[10%] right-[5%] w-[300px] h-[300px] rounded-full filter blur-[40px] opacity-40"
            style={{ background: 'radial-gradient(circle, rgba(212, 168, 83, 0.1) 0%, transparent 70%)' }}
          />
        </>
      )}

      {/* Floating Organic Firefly Motes */}
      <div className="absolute inset-0">
        {[...Array(isMobile ? 10 : 25)].map((_, i) => {
          const size = Math.random() * 5 + 3;
          const initialLeft = Math.random() * 100;
          const initialTop = Math.random() * 100;
          const delay = Math.random() * 8;
          const duration = Math.random() * 8 + 8;
          const colorType = i % 3;
          const glowColor =
            colorType === 0
              ? 'rgba(142, 255, 138, 0.5)'  // Moss Glow
              : colorType === 1
              ? 'rgba(232, 200, 122, 0.4)'  // Wheat glow
              : 'rgba(110, 181, 217, 0.4)';  // Sky glow

          return (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                width: size,
                height: size,
                left: `${initialLeft}%`,
                top: `${initialTop}%`,
                background: glowColor,
                boxShadow: `0 0 10px ${glowColor}, 0 0 20px ${glowColor}`,
              }}
              animate={{
                y: [0, -120, 0],
                x: [0, Math.random() * 40 - 20, 0],
                opacity: [0.1, 0.7, 0.1],
                scale: [1, 1.3, 1],
              }}
              transition={{
                duration,
                repeat: Infinity,
                delay,
                ease: 'easeInOut',
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
