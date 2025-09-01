'use client';

import { useEffect, useState } from 'react';

interface SimpleBackgroundProps {
  mixBlendMode?: string;
}

const SimpleBackground = ({ mixBlendMode = 'lighten' }: SimpleBackgroundProps) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-pink-500/10 via-purple-500/10 to-blue-500/10" />
    );
  }

  return (
    <div className="w-full h-full relative overflow-hidden">
      {/* Gradientes base */}
      <div 
        className="absolute inset-0 opacity-30 bg-gradient-to-br from-pink-500/20 via-purple-500/15 to-blue-500/20"
        style={{ mixBlendMode: mixBlendMode as any }}
      />
      
      {/* Círculo rotante 1 */}
      <div className="absolute inset-0 opacity-20">
        <div 
          className="absolute w-96 h-96 -top-48 -left-48 animate-spin"
          style={{
            animationDuration: '20s',
            background: 'conic-gradient(from 0deg, transparent, #ff007a, transparent, #4d3dff, transparent)',
            mixBlendMode: mixBlendMode as any,
            borderRadius: '50%'
          }}
        />
      </div>

      {/* Círculo rotante 2 */}
      <div className="absolute inset-0 opacity-15">
        <div 
          className="absolute w-80 h-80 -bottom-40 -right-40 animate-spin"
          style={{
            animationDuration: '30s',
            animationDirection: 'reverse',
            background: 'conic-gradient(from 45deg, transparent, #4d3dff, transparent, #ffffff, transparent)',
            mixBlendMode: mixBlendMode as any,
            borderRadius: '50%'
          }}
        />
      </div>

      {/* Partículas usando Tailwind */}
      <div className="absolute inset-0">
        <div className="absolute w-2 h-2 bg-pink-500/40 rounded-full animate-bounce top-1/4 left-1/4" 
             style={{ animationDelay: '0s', animationDuration: '3s' }} />
        <div className="absolute w-3 h-3 bg-purple-500/30 rounded-full animate-bounce top-1/3 left-2/3" 
             style={{ animationDelay: '1s', animationDuration: '4s' }} />
        <div className="absolute w-1 h-1 bg-white/50 rounded-full animate-bounce top-2/3 left-1/3" 
             style={{ animationDelay: '2s', animationDuration: '5s' }} />
        <div className="absolute w-2 h-2 bg-pink-500/30 rounded-full animate-bounce top-3/4 left-3/4" 
             style={{ animationDelay: '0.5s', animationDuration: '3.5s' }} />
        <div className="absolute w-1 h-1 bg-purple-500/40 rounded-full animate-bounce top-1/2 left-1/6" 
             style={{ animationDelay: '1.5s', animationDuration: '4.5s' }} />
        <div className="absolute w-3 h-3 bg-white/20 rounded-full animate-bounce top-1/6 left-5/6" 
             style={{ animationDelay: '2.5s', animationDuration: '6s' }} />
      </div>

      {/* Ondas pulsantes */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-1/2 left-1/2 w-32 h-32 -mt-16 -ml-16 rounded-full animate-ping 
                       bg-gradient-to-r from-pink-500 to-purple-500" 
             style={{ animationDuration: '4s' }} />
        <div className="absolute top-1/4 left-3/4 w-24 h-24 -mt-12 -ml-12 rounded-full animate-ping 
                       bg-gradient-to-r from-purple-500 to-blue-500" 
             style={{ animationDuration: '6s', animationDelay: '2s' }} />
        <div className="absolute top-3/4 left-1/4 w-20 h-20 -mt-10 -ml-10 rounded-full animate-ping 
                       bg-gradient-to-r from-blue-500 to-pink-500" 
             style={{ animationDuration: '5s', animationDelay: '3s' }} />
      </div>
    </div>
  );
};

export default SimpleBackground;
