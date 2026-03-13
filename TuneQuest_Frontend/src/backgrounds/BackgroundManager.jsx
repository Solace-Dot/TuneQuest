import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSelector } from 'react-redux';

const BASE = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100vw',
  height: '100vh',
  zIndex: -1,
  overflow: 'hidden',
  pointerEvents: 'none',
};


// Particle data is generated once per component mount
function useParticles(count) {
  return useMemo(() => Array.from({ length: count }, () => ({
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 18 + 8,
    delay: -(Math.random() * 20),
    duration: Math.random() * 10 + 10,
  })), []);
}

function FloatingNotes() {
const NOTES = ['♪', '♫', '♬', '♩'];
  const particles = useParticles(25); 

  return (
    <div style={{ 
      position: 'fixed', 
      inset: 0, 
      backgroundColor: '#050508', 
      zIndex: -1, 
      overflow: 'hidden' 
    }}>
      {/* ── High-Visibility Particles ── */}
      {particles.map((p, i) => {
        // We determine the "drift" amount once here
        const drift = i % 2 === 0 ? 200 : -200; // Pixels to move horizontally

        return (
          <motion.span
            key={i}
            style={{ 
              position: 'absolute', 
              // Start at random X
              left: `${p.x}%`, 
              fontSize: p.size + 10, 
              color: '#818cf8', 
              userSelect: 'none',
              textShadow: '0 0 12px rgba(99, 102, 241, 0.9)', 
              filter: 'drop-shadow(0 0 2px white)', 
              opacity: 0 // Start hidden
            }}
            initial={{ 
              y: '110vh', 
              x: 0, 
              opacity: 0, 
              rotate: 0 
            }}
            animate={{ 
              // Straight diagonal line to the target
              y: '-20vh', 
              x: drift, 
              opacity: [0, 0.8, 0.8, 0], 
              rotate: 360 
            }}
            transition={{ 
              duration: p.duration * 2.5, 
              delay: p.delay, 
              repeat: Infinity, 
              ease: 'linear' 
            }}
          >
            {NOTES[i % NOTES.length]}
          </motion.span>
        );
      })}
    </div>
  );
}

/* ── 2. Cyber Grid ── */
function CyberGrid() {
  return (
    <div 
      id="cyber-grid-container"
      style={{ 
        position: 'fixed', 
        inset: 0, 
        width: '100vw', 
        height: '100vh', 
        backgroundColor: '#050508', // Slightly lifted black for better contrast
        zIndex: -1, 
        overflow: 'hidden',
        pointerEvents: 'none'
      }}
    >
      {/* ── 1. High-Contrast Grid ── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.25, // Doubled visibility
          backgroundImage: `
            linear-gradient(#4f46e5 1.5px, transparent 1.5px),
            linear-gradient(90deg, #4f46e5 1.5px, transparent 1.5px)
          `,
          backgroundSize: '80px 80px',
        }}
      />

      {/* ── 2. Bright Peripheral Nodes ── */}
      {[...Array(30)].map((_, i) => {
        const isLeft = i % 2 === 0;
        // Spawning in the side 35% of the screen for better visibility
        const randomX = isLeft 
          ? Math.random() * 35 
          : 65 + Math.random() * 35;
          
        return (
          <motion.div
            key={`node-${i}`}
            style={{
              position: 'absolute',
              width: '4px', // Thicker dots
              height: '4px',
              backgroundColor: '#818cf8', // Lighter, brighter blue
              borderRadius: '50%',
              left: `${randomX}%`,
              top: `${Math.random() * 100}%`,
              boxShadow: '0 0 12px 2px #6366f1', // Heavy neon glow
              filter: 'drop-shadow(0 0 5px #fff)', // Core highlight
            }}
            animate={{
              opacity: [0.2, 0.9, 0.2], // Stays much more visible
              scale: [1, 1.8, 1]
            }}
            transition={{
              duration: 2 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 5
            }}
          />
        );
      })}

      {/* ── 3. High-Intensity Side Beams ── */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={`beam-${i}`}
          style={{
            position: 'absolute',
            width: '2px',
            top: 0,
            bottom: 0,
            background: 'linear-gradient(to bottom, transparent, #818cf8, transparent)',
            // Positions clustered on the sides
            left: i < 3 ? `${2 + i * 8}%` : `${78 + (i - 3) * 8}%`,
          }}
          animate={{
            opacity: [0.1, 0.6, 0.1],
            height: ['0%', '100%', '0%']
          }}
          transition={{
            duration: 3 + i,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.8
          }}
        />
      ))}

      {/* ── 4. Balanced Center Mask ── */}
      <div style={{
        position: 'absolute',
        inset: 0,
        // Reduced the black-out area so the blue is visible closer to center
        background: 'radial-gradient(circle at 50% 50%, transparent 20%, #050508 85%)',
        zIndex: 2
      }} />
    </div>
  );
}

/* ── 3. Geometric Shapes ── */
function GeometricShapes() {
const SHAPES = ['△', '□', '◇', '○'];
  // We use more particles because they stay on screen longer in this mode
  const particles = useParticles(20); 

  return (
    <div style={{ 
      position: 'fixed', 
      inset: 0, 
      backgroundColor: '#06020a', 
      zIndex: -1, 
      overflow: 'hidden' 
    }}>
      {/* ── 1. The Core Pulse ── */}
      <motion.div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at 50% 50%, #4c1d95 0%, transparent 70%)',
        }}
        animate={{ opacity: [0.1, 0.3, 0.1], scale: [1, 1.2, 1] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* ── 2. The Zooming Geometry ── */}
      {particles.map((p, i) => {
        // Calculate a target corner based on its index
        const angle = (i / 20) * Math.PI * 2;
        const targetX = Math.cos(angle) * 60; // How far it zooms horizontally
        const targetY = Math.sin(angle) * 60; // How far it zooms vertically

        return (
          <motion.span
            key={i}
            style={{ 
              position: 'absolute', 
              left: '50%', 
              top: '50%',
              fontSize: p.size + 15, 
              color: i % 2 === 0 ? '#a855f7' : '#ec4899', // Alternating Purple/Pink
              userSelect: 'none',
              fontWeight: '100',
              textShadow: '0 0 20px currentColor',
              filter: 'drop-shadow(0 0 2px white)',
              display: 'inline-block'
            }}
            initial={{ 
              x: '-50%', 
              y: '-50%', 
              scale: 0, 
              opacity: 0,
              rotate: 0 
            }}
            animate={{ 
              // Zooming out from center to the edges
              x: [`-50%`, `${targetX}vw`], 
              y: [`-50%`, `${targetY}vh`],
              scale: [0, 2], // Grows as it gets "closer"
              opacity: [0, 0.8, 0],
              rotate: 720 // Fast spin to give it energy
            }}
            transition={{ 
              duration: p.duration * 1.5, 
              delay: p.delay, 
              repeat: Infinity, 
              ease: [0.4, 0, 0.2, 1] // Custom cubic-bezier for a "zoom" feel
            }}
          >
            {SHAPES[i % SHAPES.length]}
          </motion.span>
        );
      })}
    </div>
  );
}

/* ── 4. Music Math ── */
// Sub-component to handle the "Glitch" effect for each symbol
const GlitchSymbol = ({ symbols, index }) => {
  const [char, setChar] = useState(symbols[index % symbols.length]);

  useEffect(() => {
    // Randomly flip the character to a different music symbol to look like "decoding"
    const interval = setInterval(() => {
      if (Math.random() > 0.8) {
        setChar(symbols[Math.floor(Math.random() * symbols.length)]);
      }
    }, 1500);
    return () => clearInterval(interval);
  }, [symbols, index]);

  return <span>{char}</span>;
};

function MusicMath() {
  const SYMS = ['4/4', '♯', '♭', '𝄢', '♪', '3/4', '7/8', '𝄪', '♮'];
  const particles = useParticles(20); // Reduced from 35 — fewer setIntervals from GlitchSymbols

  return (
    <div style={{ 
      position: 'fixed', 
      inset: 0, 
      backgroundColor: '#020503', 
      zIndex: -1, 
      overflow: 'hidden' 
    }}>
      {/* ── 1. Vertical Phosphor Glow ── */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(to bottom, rgba(34, 197, 94, 0.1) 0%, transparent 100%)',
        opacity: 0.4
      }} />

      {/* ── 2. The Falling "Code" ── */}
      {particles.map((p, i) => (
        <motion.div
          key={i}
          style={{ 
            position: 'absolute', 
            left: `${p.x}%`, 
            fontSize: p.size + 4, 
            color: '#4ade80', // Matrix Green
            userSelect: 'none',
            fontFamily: 'monospace',
            fontWeight: '900',
            // Creating the "Glow" of an old CRT monitor
            textShadow: '0 0 8px rgba(34, 197, 94, 0.8)',
            writingMode: 'vertical-rl', // Makes the strings look like columns
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}
          initial={{ y: '-20vh', opacity: 0 }}
          animate={{ 
            y: '110vh', 
            opacity: [0, 1, 1, 0], // Fast fade in, stays bright, then fades at bottom
          }}
          transition={{ 
            duration: p.duration * 0.6, // Faster "dropping" speed
            delay: p.delay, 
            repeat: Infinity, 
            ease: 'linear' 
          }}
        >
          {/* We stack a few symbols to create a "stream" effect */}
          <GlitchSymbol symbols={SYMS} index={i} />
          <div style={{ opacity: 0.4, fontSize: '0.8em' }}>
             <GlitchSymbol symbols={SYMS} index={i + 1} />
          </div>
        </motion.div>
      ))}

      {/* ── 3. Scanline Effect ── */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.03), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.03))',
        backgroundSize: '100% 4px, 3px 100%',
        pointerEvents: 'none'
      }} />
    </div>
  );
}

/* ── 5. Starfield ── */
function Starfield() {
const stars = useMemo(() => Array.from({ length: 70 }, () => ({
    y: Math.random() * 100,
    size: Math.random() * 1.2 + 0.5,
    duration: Math.random() * 12 + 18, // Even slower for a majestic feel
    // Start them staggered across the right half of the screen and beyond
    initialX: 50 + Math.random() * 100, 
    delay: Math.random() * -20,
  })), []);

  return (
    <div style={{ 
      position: 'fixed', 
      inset: 0, 
      backgroundColor: '#010103', 
      zIndex: -1, 
      overflow: 'hidden' 
    }}>
      
      {/* ── 1. The Supernovas (Background Depth) ── */}
      {[...Array(2)].map((_, i) => (
        <motion.div
          key={`supernova-${i}`}
          style={{
            position: 'absolute',
            width: '65vw',
            height: '65vw',
            borderRadius: '50%',
            // Placed strategically to frame the UI
            left: i === 0 ? '-15%' : '55%',
            top: i === 0 ? '5%' : '45%',
            background: `radial-gradient(circle, 
              rgba(99, 102, 241, 0.18) 0%, 
              rgba(168, 85, 247, 0.1) 40%, 
              transparent 75%)`,
            filter: 'blur(70px)',
            zIndex: 1
          }}
          animate={{ 
            scale: [0.9, 1.1, 0.9],
            opacity: [0.3, 0.6, 0.3] 
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}

      {/* ── 2. The Right-Weighted Star Stream ── */}
      {stars.map((s, i) => (
        <motion.div
          key={i}
          style={{ 
            position: 'absolute', 
            top: `${s.y}%`, 
            width: s.size * 7, // Slightly longer streaks
            height: s.size, 
            borderRadius: '100%', 
            background: '#fff',
            boxShadow: `0 0 4px rgba(255, 255, 255, 0.3)`,
            opacity: 0.35,
          }}
          // They now "spawn" further right and travel further left
          initial={{ x: `${s.initialX}vw` }}
          animate={{ x: '-40vw' }}
          transition={{ 
            duration: s.duration, 
            delay: s.delay, 
            repeat: Infinity, 
            ease: 'linear' 
          }}
        />
      ))}

      {/* ── 3. Subtle Edge Vignette ── */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(circle at 50% 50%, transparent 40%, rgba(1, 1, 3, 0.8) 100%)',
        zIndex: 2,
        pointerEvents: 'none'
      }} />
    </div>
  );
}

/* ── 6. Aurora ── */
function Aurora() {
return (
    <div style={{ 
      position: 'fixed', 
      inset: 0, 
      backgroundColor: '#010206', 
      zIndex: -1, 
      overflow: 'hidden' 
    }}>
      
      {/* ── 1. The High-Ion Aurora (Increased Opacity) ── */}
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={`aurora-${i}`}
          style={{
            position: 'absolute',
            top: '-5%',
            left: `${-20 + i * 40}%`,
            width: '100vw',
            height: '75vh',
            background: `linear-gradient(to bottom, 
              transparent, 
              ${i % 2 === 0 ? 'rgba(45, 212, 191, 0.5)' : 'rgba(129, 140, 248, 0.5)'} 35%, 
              ${i % 2 === 0 ? 'rgba(13, 148, 136, 0.25)' : 'rgba(79, 70, 229, 0.25)'} 70%, 
              transparent 100%)`,
            filter: 'blur(35px)',
            opacity: 0.45, // Boosted visibility per your request
            mixBlendMode: 'screen',
            transformOrigin: 'top center'
          }}
          animate={{
            rotate: [i - 1.5, i + 1.5, i - 1.5],
            skewX: [-12, 12, -12],
            scaleY: [0.85, 1.15, 0.85],
          }}
          transition={{
            duration: 14 + i * 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      ))}

      {/* ── 2. Background Peaks (Slower Parallax) ── */}
      <motion.div
        style={{
          position: 'absolute',
          bottom: 0,
          width: '150%',
          height: '42vh',
          backgroundColor: '#07071a',
          clipPath: 'polygon(0% 100%, 0% 70%, 10% 45%, 20% 60%, 35% 35%, 50% 65%, 65% 25%, 85% 55%, 100% 30%, 100% 100%)',
          opacity: 0.4,
          filter: 'blur(3px)'
        }}
        animate={{ x: ['-10%', '5%'] }}
        transition={{ duration: 50, repeat: Infinity, repeatType: "reverse", ease: "linear" }}
      />

      {/* ── 3. Foreground Jagged Ridge (Active Movement) ── */}
      <motion.div
        style={{
          position: 'absolute',
          bottom: 0,
          width: '160%',
          height: '35vh',
          background: 'linear-gradient(180deg, #16143c 0%, #010206 90%)',
          zIndex: 2,
          borderTop: '1px solid rgba(129, 140, 248, 0.2)'
        }}
        // The morphing mountain path + horizontal drift
        animate={{ 
          x: ['0%', '-15%'],
          clipPath: [
            'polygon(0% 100%, 0% 80%, 12% 45%, 25% 70%, 38% 30%, 52% 75%, 65% 15%, 78% 65%, 88% 30%, 100% 60%, 100% 100%)',
            'polygon(0% 100%, 0% 85%, 10% 50%, 22% 65%, 35% 40%, 48% 70%, 62% 25%, 75% 60%, 85% 40%, 100% 55%, 100% 100%)',
            'polygon(0% 100%, 0% 80%, 12% 45%, 25% 70%, 38% 30%, 52% 75%, 65% 15%, 78% 65%, 88% 30%, 100% 60%, 100% 100%)'
          ]
        }}
        transition={{ 
          x: { duration: 35, repeat: Infinity, repeatType: "reverse", ease: "linear" },
          clipPath: { duration: 20, repeat: Infinity, ease: "easeInOut" }
        }}
      >
        {/* Detail Texture */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(60deg, transparent 48%, rgba(255,255,255,0.03) 50%, transparent 52%)',
          backgroundSize: '20px 20px',
          opacity: 0.5
        }} />
      </motion.div>

      {/* ── 4. Deep Valley Mist ── */}
      <div style={{
        position: 'absolute',
        bottom: '28vh',
        width: '100%',
        height: '18vh',
        background: 'linear-gradient(to top, rgba(1, 2, 6, 0.95), transparent)',
        zIndex: 1
      }} />
    </div>
  );
}

/* ─────────────────────────────────────────
   LIGHT THEME VARIANTS
   ───────────────────────────────────────── */

/* ── 1L. Floating Notes — Light ── */
function FloatingNotesLight() {
  const NOTES = ['♪', '♫', '♬', '♩'];
  const particles = useParticles(25);
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: '#f0f2ff', zIndex: -1, overflow: 'hidden' }}>
      {particles.map((p, i) => {
        const drift = i % 2 === 0 ? 200 : -200;
        return (
          <motion.span
            key={i}
            style={{
              position: 'absolute',
              left: `${p.x}%`,
              fontSize: p.size + 10,
              color: '#6366f1',
              userSelect: 'none',
              textShadow: '0 0 10px rgba(99,102,241,0.45)',
              opacity: 0,
            }}
            initial={{ y: '110vh', x: 0, opacity: 0, rotate: 0 }}
            animate={{ y: '-20vh', x: drift, opacity: [0, 0.55, 0.55, 0], rotate: 360 }}
            transition={{ duration: p.duration * 2.5, delay: p.delay, repeat: Infinity, ease: 'linear' }}
          >
            {NOTES[i % NOTES.length]}
          </motion.span>
        );
      })}
      {/* Soft radial tint */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(circle at 50% 40%, rgba(199,210,254,0.4) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
    </div>
  );
}

/* ── 2L. Cyber Grid — Light ── */
function CyberGridLight() {
  return (
    <div style={{
      position: 'fixed', inset: 0, width: '100vw', height: '100vh',
      backgroundColor: '#f8f9ff', zIndex: -1, overflow: 'hidden', pointerEvents: 'none',
    }}>
      {/* Grid lines */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 1,
        backgroundImage: `
          linear-gradient(rgba(99,102,241,0.18) 1px, transparent 1px),
          linear-gradient(90deg, rgba(99,102,241,0.18) 1px, transparent 1px)
        `,
        backgroundSize: '80px 80px',
      }} />
      {/* Pulsing nodes */}
      {[...Array(30)].map((_, i) => {
        const isLeft = i % 2 === 0;
        const randomX = isLeft ? Math.random() * 35 : 65 + Math.random() * 35;
        return (
          <motion.div
            key={`node-${i}`}
            style={{
              position: 'absolute', width: '4px', height: '4px',
              backgroundColor: '#818cf8', borderRadius: '50%',
              left: `${randomX}%`, top: `${Math.random() * 100}%`,
              boxShadow: '0 0 8px 2px rgba(99,102,241,0.25)',
            }}
            animate={{ opacity: [0.2, 0.75, 0.2], scale: [1, 1.8, 1] }}
            transition={{ duration: 2 + Math.random() * 2, repeat: Infinity, delay: Math.random() * 5 }}
          />
        );
      })}
      {/* Side beams */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={`beam-${i}`}
          style={{
            position: 'absolute', width: '2px', top: 0, bottom: 0,
            background: 'linear-gradient(to bottom, transparent, rgba(99,102,241,0.35), transparent)',
            left: i < 3 ? `${2 + i * 8}%` : `${78 + (i - 3) * 8}%`,
          }}
          animate={{ opacity: [0.05, 0.45, 0.05] }}
          transition={{ duration: 3 + i, repeat: Infinity, ease: 'easeInOut', delay: i * 0.8 }}
        />
      ))}
      {/* White radial center mask */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(circle at 50% 50%, transparent 20%, rgba(248,249,255,0.88) 85%)',
        zIndex: 2,
      }} />
    </div>
  );
}

/* ── 3L. Geometric Shapes — Light ── */
function GeometricShapesLight() {
  const SHAPES = ['△', '□', '◇', '○'];
  const particles = useParticles(20);
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: '#faf5ff', zIndex: -1, overflow: 'hidden' }}>
      <motion.div
        style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(circle at 50% 50%, rgba(167,139,250,0.28) 0%, transparent 70%)',
        }}
        animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.2, 1] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      />
      {particles.map((p, i) => {
        const angle = (i / 20) * Math.PI * 2;
        const targetX = Math.cos(angle) * 60;
        const targetY = Math.sin(angle) * 60;
        return (
          <motion.span
            key={i}
            style={{
              position: 'absolute', left: '50%', top: '50%',
              fontSize: p.size + 15,
              color: i % 2 === 0 ? '#7c3aed' : '#be185d',
              userSelect: 'none', fontWeight: '100',
              textShadow: '0 0 10px currentColor',
              display: 'inline-block',
            }}
            initial={{ x: '-50%', y: '-50%', scale: 0, opacity: 0, rotate: 0 }}
            animate={{
              x: ['-50%', `${targetX}vw`], y: ['-50%', `${targetY}vh`],
              scale: [0, 1.6], opacity: [0, 0.45, 0], rotate: 720,
            }}
            transition={{ duration: p.duration * 1.5, delay: p.delay, repeat: Infinity, ease: [0.4, 0, 0.2, 1] }}
          >
            {SHAPES[i % SHAPES.length]}
          </motion.span>
        );
      })}
    </div>
  );
}

/* ── 4L. Music Math — Light ── */
function MusicMathLight() {
  const SYMS = ['4/4', '♯', '♭', '𝄢', '♪', '3/4', '7/8', '𝄪', '♮'];
  const particles = useParticles(20);
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: '#f0fdf4', zIndex: -1, overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to bottom, rgba(22,163,74,0.07) 0%, transparent 100%)',
      }} />
      {particles.map((p, i) => (
        <motion.div
          key={i}
          style={{
            position: 'absolute', left: `${p.x}%`, fontSize: p.size + 4,
            color: '#15803d', userSelect: 'none', fontFamily: 'monospace',
            fontWeight: '900', textShadow: '0 0 5px rgba(22,163,74,0.35)',
            writingMode: 'vertical-rl', display: 'flex', flexDirection: 'column', gap: '10px',
          }}
          initial={{ y: '-20vh', opacity: 0 }}
          animate={{ y: '110vh', opacity: [0, 0.55, 0.55, 0] }}
          transition={{ duration: p.duration * 0.6, delay: p.delay, repeat: Infinity, ease: 'linear' }}
        >
          <GlitchSymbol symbols={SYMS} index={i} />
          <div style={{ opacity: 0.4, fontSize: '0.8em' }}>
            <GlitchSymbol symbols={SYMS} index={i + 1} />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/* ── 5L. Starfield — Light ── */
function StarfieldLight() {
  const SPARKLE_COLORS = ['#818cf8', '#c084fc', '#fb7185', '#38bdf8', '#34d399', '#fbbf24'];
  const stars = useMemo(() => Array.from({ length: 70 }, () => ({
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 4 + 1.5,
    duration: Math.random() * 8 + 6,
    delay: -(Math.random() * 14),
    color: SPARKLE_COLORS[Math.floor(Math.random() * SPARKLE_COLORS.length)],
  })), []);
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: '#eef4ff', zIndex: -1, overflow: 'hidden' }}>
      {/* Soft glow blobs */}
      {[...Array(2)].map((_, i) => (
        <motion.div
          key={`glow-${i}`}
          style={{
            position: 'absolute', width: '60vw', height: '60vw', borderRadius: '50%',
            left: i === 0 ? '-10%' : '50%', top: i === 0 ? '5%' : '40%',
            background: `radial-gradient(circle, ${i === 0 ? 'rgba(165,180,252,0.35)' : 'rgba(196,181,253,0.28)'} 0%, transparent 70%)`,
            filter: 'blur(60px)',
          }}
          animate={{ scale: [0.9, 1.1, 0.9], opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut', delay: i * 6 }}
        />
      ))}
      {/* Floating pastel sparkle dots */}
      {stars.map((s, i) => (
        <motion.div
          key={i}
          style={{
            position: 'absolute', left: `${s.x}%`, top: `${s.y}%`,
            width: s.size, height: s.size, borderRadius: '50%',
            backgroundColor: s.color,
            boxShadow: `0 0 ${s.size * 2}px ${s.color}55`,
          }}
          animate={{ opacity: [0.1, 0.7, 0.1], scale: [1, 1.6, 1] }}
          transition={{ duration: s.duration, delay: s.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
      {/* Soft vignette */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(circle at 50% 50%, transparent 50%, rgba(238,244,255,0.55) 100%)',
        pointerEvents: 'none',
      }} />
    </div>
  );
}

/* ── 6L. Aurora — Light ── */
function AuroraLight() {
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: '#f0f9ff', zIndex: -1, overflow: 'hidden' }}>
      {/* Pastel aurora curtains */}
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={`aurora-${i}`}
          style={{
            position: 'absolute', top: '-5%', left: `${-20 + i * 40}%`,
            width: '100vw', height: '65vh',
            background: `linear-gradient(to bottom,
              transparent,
              ${i % 2 === 0 ? 'rgba(94,234,212,0.38)' : 'rgba(196,181,253,0.38)'} 35%,
              ${i % 2 === 0 ? 'rgba(56,189,248,0.2)' : 'rgba(167,139,250,0.2)'} 70%,
              transparent 100%)`,
            filter: 'blur(35px)',
            mixBlendMode: 'multiply',
          }}
          animate={{ rotate: [i - 1.5, i + 1.5, i - 1.5], skewX: [-10, 10, -10], scaleY: [0.85, 1.15, 0.85] }}
          transition={{ duration: 14 + i * 4, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
      {/* Background light-blue peaks */}
      <motion.div
        style={{
          position: 'absolute', bottom: 0, width: '150%', height: '38vh',
          backgroundColor: '#dbeafe',
          clipPath: 'polygon(0% 100%, 0% 70%, 10% 45%, 20% 60%, 35% 35%, 50% 65%, 65% 25%, 85% 55%, 100% 30%, 100% 100%)',
          opacity: 0.55, filter: 'blur(3px)',
        }}
        animate={{ x: ['-10%', '5%'] }}
        transition={{ duration: 50, repeat: Infinity, repeatType: 'reverse', ease: 'linear' }}
      />
      {/* Foreground light ridge */}
      <motion.div
        style={{
          position: 'absolute', bottom: 0, width: '160%', height: '30vh',
          background: 'linear-gradient(180deg, #bae6fd 0%, #f0f9ff 90%)',
          zIndex: 2, borderTop: '1px solid rgba(56,189,248,0.3)',
        }}
        animate={{
          x: ['0%', '-15%'],
          clipPath: [
            'polygon(0% 100%, 0% 80%, 12% 45%, 25% 70%, 38% 30%, 52% 75%, 65% 15%, 78% 65%, 88% 30%, 100% 60%, 100% 100%)',
            'polygon(0% 100%, 0% 85%, 10% 50%, 22% 65%, 35% 40%, 48% 70%, 62% 25%, 75% 60%, 85% 40%, 100% 55%, 100% 100%)',
            'polygon(0% 100%, 0% 80%, 12% 45%, 25% 70%, 38% 30%, 52% 75%, 65% 15%, 78% 65%, 88% 30%, 100% 60%, 100% 100%)',
          ],
        }}
        transition={{
          x: { duration: 35, repeat: Infinity, repeatType: 'reverse', ease: 'linear' },
          clipPath: { duration: 20, repeat: Infinity, ease: 'easeInOut' },
        }}
      />
      {/* Valley mist */}
      <div style={{
        position: 'absolute', bottom: '24vh', width: '100%', height: '14vh',
        background: 'linear-gradient(to top, rgba(240,249,255,0.9), transparent)',
        zIndex: 1,
      }} />
    </div>
  );
}

/* ── Registry ── */
export const BACKGROUND_OPTIONS = [
  { id: 'none',   label: 'None',           icon: '🚫', darkColor: '#1a1a1a', lightColor: '#e8eaf2', description: 'No background' },
  { id: 'notes',  label: 'Floating Notes', icon: '♪',  darkColor: '#5a5abd', lightColor: '#c7d2fe', description: 'Musical notes floating upwards' },
  { id: 'grid',   label: 'Cyber Grid',     icon: '⊞',  darkColor: '#044ab3', lightColor: '#bfdbfe', description: 'Synthwave grid' },
  { id: 'shapes', label: 'Geometric',      icon: '◇',  darkColor: '#410d7c', lightColor: '#ddd6fe', description: 'Drifting geometric shapes' },
  { id: 'math',   label: 'Music Math',     icon: '♭',  darkColor: '#177535', lightColor: '#bbf7d0', description: 'Cascading music symbols' },
  { id: 'stars',  label: 'Starfield',      icon: '★',  darkColor: '#832929', lightColor: '#e0e7ff', description: 'Twinkling stars' },
  { id: 'aurora', label: 'Aurora',         icon: '〜',  darkColor: '#426a92', lightColor: '#bae6fd', description: 'Deep sea aurora' },
];

const DARK_RENDERERS = {
  notes:  <FloatingNotes />,
  grid:   <CyberGrid />,
  shapes: <GeometricShapes />,
  math:   <MusicMath />,
  stars:  <Starfield />,
  aurora: <Aurora />,
};

const LIGHT_RENDERERS = {
  notes:  <FloatingNotesLight />,
  grid:   <CyberGridLight />,
  shapes: <GeometricShapesLight />,
  math:   <MusicMathLight />,
  stars:  <StarfieldLight />,
  aurora: <AuroraLight />,
};

function BackgroundManager({ effect = 'none' }) {
  const theme = useSelector((state) => state.theme.mode);
  if (!effect || effect === 'none') return null;
  const renderers = theme === 'light' ? LIGHT_RENDERERS : DARK_RENDERERS;
  return renderers[effect] ?? null;
}

export default BackgroundManager;