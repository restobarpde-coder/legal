'use client';

import { useEffect, useRef, useState } from 'react';

interface PrismaticBurstProps {
  intensity?: number;
  speed?: number;
  animationType?: 'rotate' | 'rotate3d' | 'hover';
  colors?: string[];
  distort?: number;
  paused?: boolean;
  offset?: { x: number | string; y: number | string };
  hoverDampness?: number;
  rayCount?: number;
  mixBlendMode?: string;
}

const PrismaticBurst = ({
  intensity = 2,
  speed = 0.5,
  animationType = 'rotate3d',
  colors = ['#ff007a', '#4d3dff', '#ffffff'],
  distort = 0,
  paused = false,
  offset = { x: 0, y: 0 },
  hoverDampness = 0,
  rayCount = 24,
  mixBlendMode = 'lighten'
}: PrismaticBurstProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [oglLoaded, setOglLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    let animationId: number;
    let renderer: any;

    const initWebGL = async () => {
      try {
        console.log('Iniciando carga de OGL...');
        
        // Importar OGL dinámicamente
        const { Renderer, Program, Mesh, Triangle, Texture } = await import('ogl');
        
        if (!mounted) return;
        
        console.log('OGL cargado exitosamente');
        setOglLoaded(true);

        const canvas = canvasRef.current;
        if (!canvas) return;

        console.log('Inicializando renderer WebGL...');

        // Crear renderer con configuración más simple
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        renderer = new Renderer({ 
          canvas,
          dpr, 
          alpha: true, 
          antialias: false,
          powerPreference: 'default' // Usar GPU menos potente para evitar problemas
        });

        const gl = renderer.gl;
        
        // Verificar si WebGL está disponible
        if (!gl) {
          throw new Error('WebGL no está disponible');
        }

        console.log('WebGL inicializado correctamente');

        // Shader vertex simple
        const vertexShader = `
          attribute vec4 position;
          void main() {
            gl_Position = position;
          }
        `;

        // Shader fragment simple con gradiente animado
        const fragmentShader = `
          precision mediump float;
          uniform vec2 uResolution;
          uniform float uTime;
          uniform float uIntensity;
          
          void main() {
            vec2 uv = gl_FragCoord.xy / uResolution.xy;
            vec2 center = vec2(0.5, 0.5);
            float dist = distance(uv, center);
            
            float angle = atan(uv.y - center.y, uv.x - center.x);
            float radius = dist * 2.0;
            
            float wave1 = sin(angle * 8.0 + uTime * 2.0) * 0.5 + 0.5;
            float wave2 = sin(radius * 10.0 - uTime * 3.0) * 0.5 + 0.5;
            
            vec3 color1 = vec3(1.0, 0.0, 0.47); // #ff007a
            vec3 color2 = vec3(0.3, 0.24, 1.0); // #4d3dff
            vec3 color3 = vec3(1.0, 1.0, 1.0); // #ffffff
            
            vec3 color = mix(color1, color2, wave1);
            color = mix(color, color3, wave2 * 0.3);
            
            float alpha = smoothstep(1.0, 0.0, dist) * uIntensity * 0.1;
            
            gl_FragColor = vec4(color, alpha);
          }
        `;

        const program = new Program(gl, {
          vertex: vertexShader,
          fragment: fragmentShader,
          uniforms: {
            uResolution: { value: [canvas.width, canvas.height] },
            uTime: { value: 0 },
            uIntensity: { value: intensity }
          }
        });

        const geometry = new Triangle(gl);
        const mesh = new Mesh(gl, { geometry, program });

        const resize = () => {
          if (!canvas || !renderer) return;
          const rect = canvas.getBoundingClientRect();
          const w = rect.width || 1;
          const h = rect.height || 1;
          renderer.setSize(w, h);
          program.uniforms.uResolution.value = [w, h];
        };

        // Configurar canvas
        canvas.style.position = 'absolute';
        canvas.style.inset = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.mixBlendMode = mixBlendMode || 'normal';

        resize();
        window.addEventListener('resize', resize);

        let time = 0;
        const animate = () => {
          if (!mounted || !renderer) return;
          
          time += 0.016 * speed;
          program.uniforms.uTime.value = time;
          
          renderer.render({ scene: mesh });
          animationId = requestAnimationFrame(animate);
        };

        setIsLoading(false);
        console.log('Iniciando animación...');
        animate();

        return () => {
          window.removeEventListener('resize', resize);
          if (animationId) {
            cancelAnimationFrame(animationId);
          }
        };

      } catch (error) {
        console.error('Error al inicializar WebGL:', error);
        setHasError(true);
        setIsLoading(false);
      }
    };

    initWebGL();

    return () => {
      mounted = false;
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      if (renderer) {
        try {
          renderer.gl.getExtension('WEBGL_lose_context')?.loseContext();
        } catch (e) {
          console.warn('Error al limpiar contexto WebGL:', e);
        }
      }
    };
  }, [intensity, speed, mixBlendMode]);

  if (hasError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-500/20 to-blue-500/20">
        <div className="text-center text-white/70">
          <p>Fallback: Gradiente CSS</p>
          <p className="text-xs mt-1">WebGL no disponible</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative overflow-hidden">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-pink-500/10 to-blue-500/10">
          <div className="text-white/50 text-sm">
            {oglLoaded ? 'Inicializando WebGL...' : 'Cargando OGL...'}
          </div>
        </div>
      )}
      <canvas
        ref={canvasRef}
        className={`transition-opacity duration-500 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
      />
    </div>
  );
};

export default PrismaticBurst;
