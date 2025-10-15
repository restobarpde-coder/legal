'use client';

import { useEffect, useState } from 'react';

interface AnimatedBackgroundProps {
  mixBlendMode?: string;
}

const AnimatedBackground = ({ mixBlendMode = 'lighten' }: AnimatedBackgroundProps) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Animaciones optimizadas para GPU (solo transform y opacity)
  const keyframeStyles = `
    @keyframes nextFloat0 {
      0%, 100% { transform: translate3d(0px, 0px, 0) scale(1); }
      33% { transform: translate3d(8px, -15px, 0) scale(1.1); }
      66% { transform: translate3d(-5px, 10px, 0) scale(0.9); }
    }
    @keyframes nextFloat1 {
      0%, 100% { transform: translate3d(0px, 0px, 0) scale(1); }
      50% { transform: translate3d(-10px, -20px, 0) scale(1.2); }
    }
    @keyframes nextFloat2 {
      0%, 100% { transform: translate3d(0px, 0px, 0) scale(1); }
      25% { transform: translate3d(12px, -10px, 0) scale(0.8); }
      75% { transform: translate3d(6px, 15px, 0) scale(1.1); }
    }
    @keyframes nextFloat3 {
      0%, 100% { transform: translate3d(0px, 0px, 0) scale(1); }
      40% { transform: translate3d(-8px, -25px, 0) scale(1.3); }
      80% { transform: translate3d(15px, 5px, 0) scale(0.7); }
    }
    @keyframes nextPulse {
      0%, 100% { opacity: 0.1; transform: scaleY(0.8) translateZ(0); }
      50% { opacity: 0.3; transform: scaleY(1.2) translateZ(0); }
    }
    @keyframes nextSpin {
      from { transform: rotate(0deg) translateZ(0); }
      to { transform: rotate(360deg) translateZ(0); }
    }
    @keyframes nextSpinReverse {
      from { transform: rotate(360deg) translateZ(0); }
      to { transform: rotate(0deg) translateZ(0); }
    }
  `;

  if (!mounted) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-pink-500/5 via-purple-500/5 to-blue-500/5" />
    );
  }

  return (
    <div 
      className="w-full h-full relative overflow-hidden"
      style={{
        contain: 'layout style paint',
        willChange: 'transform, opacity'
      }}
    >
      {/* Inyectar estilos CSS */}
      <style dangerouslySetInnerHTML={{ __html: keyframeStyles }} />
      
      {/* Gradiente base múltiple */}
      <div 
        className="absolute inset-0 opacity-40"
        style={{
          background: [
            'radial-gradient(circle at 20% 30%, rgba(255, 0, 122, 0.6) 0%, transparent 40%)',
            'radial-gradient(circle at 80% 10%, rgba(77, 61, 255, 0.5) 0%, transparent 35%)',
            'radial-gradient(circle at 60% 90%, rgba(255, 255, 255, 0.3) 0%, transparent 30%)',
            'radial-gradient(circle at 10% 80%, rgba(255, 0, 122, 0.4) 0%, transparent 45%)',
            'radial-gradient(circle at 90% 60%, rgba(77, 61, 255, 0.3) 0%, transparent 40%)'
          ].join(', '),
          mixBlendMode: mixBlendMode as any
        }}
      />

      {/* Ondas rotantes principales */}
      <div className="absolute inset-0 opacity-20">
        <div 
          className="w-[300%] h-[300%] absolute"
          style={{ 
            top: '-100%',
            left: '-100%',
            animation: 'nextSpin 25s linear infinite',
            background: [
              'conic-gradient(from 0deg,',
              'transparent 0deg,',
              'rgba(255, 0, 122, 0.8) 30deg,',
              'transparent 60deg,',
              'rgba(77, 61, 255, 0.6) 120deg,',
              'transparent 150deg,',
              'rgba(255, 255, 255, 0.4) 210deg,',
              'transparent 240deg,',
              'rgba(255, 0, 122, 0.5) 300deg,',
              'transparent 330deg)'
            ].join(' '),
            mixBlendMode: mixBlendMode as any
          }}
        />
      </div>

      {/* Ondas rotantes secundarias */}
      <div className="absolute inset-0 opacity-15">
        <div 
          className="w-[250%] h-[250%] absolute"
          style={{ 
            top: '-75%',
            left: '-75%',
            animation: 'nextSpinReverse 35s linear infinite',
            background: [
              'conic-gradient(from 45deg,',
              'transparent 0deg,',
              'rgba(77, 61, 255, 0.7) 60deg,',
              'transparent 120deg,',
              'rgba(255, 0, 122, 0.5) 180deg,',
              'transparent 240deg,',
              'rgba(255, 255, 255, 0.6) 300deg,',
              'transparent 360deg)'
            ].join(' '),
            mixBlendMode: mixBlendMode as any
          }}
        />
      </div>

      {/* Partículas flotantes */}
      <div className="absolute inset-0">
        {[...Array(12)].map((_, i) => {
          const colors = ['rgba(255, 0, 122, 0.6)', 'rgba(77, 61, 255, 0.5)', 'rgba(255, 255, 255, 0.4)'];
          const sizes = [4, 8, 12]; // px
          return (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                width: `${sizes[i % 3]}px`,
                height: `${sizes[i % 3]}px`,
                background: colors[i % 3],
                left: `${10 + (i * 7)}%`,
                top: `${20 + (i * 6)}%`,
                animation: `nextFloat${i % 4} ${6 + (i % 4)}s ease-in-out infinite`,
                animationDelay: `${i * 0.5}s`,
                mixBlendMode: mixBlendMode as any,
                boxShadow: `0 0 ${10 + (i % 3) * 5}px ${colors[i % 3]}`
              }}
            />
          );
        })}
      </div>

      {/* Rayos sutiles */}
      <div className="absolute inset-0 opacity-10">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute origin-bottom"
            style={{
              width: '1px',
              height: '100%',
              background: `linear-gradient(to top, ${
                i % 2 === 0 ? 'rgba(255, 0, 122, 0.8)' : 'rgba(77, 61, 255, 0.6)'
              }, transparent)`,
              left: `${20 + i * 15}%`,
              transform: `rotate(${i * 6}deg)`,
              animation: `nextPulse ${3 + i}s ease-in-out infinite`,
              mixBlendMode: mixBlendMode as any
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default AnimatedBackground;
