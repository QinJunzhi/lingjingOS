import React, { useEffect, useRef, useState } from 'react';

const ColorManifoldBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Try to get WebGL context
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext;

    if (!gl) {
      console.warn('WebGL not supported, falling back to CSS gradient.');
      setHasError(true);
      return;
    }

    // Vertex Shader
    const vsSource = `
      attribute vec4 aVertexPosition;
      void main() {
        gl_Position = aVertexPosition;
      }
    `;

    // Fragment Shader (Updated for Soft Pastel Aesthetic)
    const fsSource = `
      precision highp float;
      uniform vec2 uResolution;
      uniform float uTime;

      float hash(vec2 p) { 
        return fract(1e4 * sin(17.0 * p.x + p.y * 0.1) * (0.1 + abs(sin(p.y * 13.0 + p.x)))); 
      }

      float noise(vec2 x) {
        vec2 i = floor(x);
        vec2 f = fract(x);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
      }

      #define OCTAVES 4
      float fbm (in vec2 st) {
        mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.50));
        float v = 0.0;
        float a = 0.5;
        vec2 shift = vec2(100.0);
        for (int i = 0; i < OCTAVES; ++i) {
          v += a * noise(st);
          st = rot * st * 2.0 + shift;
          a *= 0.5;
        }
        return v;
      }

      void main() {
        vec2 st = gl_FragCoord.xy / uResolution.xy;
        st.x *= uResolution.x / uResolution.y;
        
        // Slower, smoother movement
        float time = uTime * 0.15;

        vec2 q = vec2(0.);
        q.x = fbm( st + 0.05 * time);
        q.y = fbm( st + vec2(1.0));

        vec2 r = vec2(0.);
        r.x = fbm( st + 1.0*q + vec2(1.7,9.2)+ 0.15*time );
        r.y = fbm( st + 1.0*q + vec2(8.3,2.8)+ 0.126*time);

        float f = fbm(st+r);

        // Soft Pastel Palette matching the requested image
        // Base: Pale Yellow/Cream
        vec3 color = mix(vec3(0.98, 1.0, 0.90), vec3(0.90, 0.96, 0.90), clamp((f*f)*4.0,0.0,1.0));
        
        // Mix 1: Mint Green/Teal
        color = mix(color, vec3(0.70, 0.93, 0.88), clamp(length(q),0.0,1.0));
        
        // Mix 2: Light Periwinkle Blue
        color = mix(color, vec3(0.75, 0.85, 0.98), clamp(length(r.x),0.0,1.0));
        
        // Extra soft white highlight
        color = mix(color, vec3(1.0, 1.0, 1.0), clamp(length(r.y)*0.5, 0.0, 0.2));

        gl_FragColor = vec4(color, 1.0);
      }
    `;

    // Initialize Shaders
    const loadShader = (gl: WebGLRenderingContext, type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compile failed: ' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

    if (!vertexShader || !fragmentShader) {
      setHasError(true);
      return;
    }

    const shaderProgram = gl.createProgram();
    if (!shaderProgram) {
      setHasError(true);
      return;
    }

    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
      console.error('Program link failed: ' + gl.getProgramInfoLog(shaderProgram));
      setHasError(true);
      return;
    }

    const positionAttributeLocation = gl.getAttribLocation(shaderProgram, 'aVertexPosition');
    const resolutionUniformLocation = gl.getUniformLocation(shaderProgram, 'uResolution');
    const timeUniformLocation = gl.getUniformLocation(shaderProgram, 'uTime');

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const positions = [-1.0, -1.0, 3.0, -1.0, -1.0, 3.0];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    let animationFrameId: number;
    
    const render = (now: number) => {
      now *= 0.001;
      const displayWidth = canvas.clientWidth;
      const displayHeight = canvas.clientHeight;
      if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      }

      gl.useProgram(shaderProgram);
      gl.enableVertexAttribArray(positionAttributeLocation);
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

      gl.uniform2f(resolutionUniformLocation, canvas.width, canvas.height);
      gl.uniform1f(timeUniformLocation, now);

      gl.drawArrays(gl.TRIANGLES, 0, 3);
      animationFrameId = requestAnimationFrame(render);
    };

    render(0);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="fixed top-0 left-0 w-full h-full z-0 bg-[#fdfdf0]">
      <style>{`
        @keyframes gradientBG {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .fallback-gradient {
          /* Soft Pastel Gradient: Yellow -> Green -> Blue */
          background: linear-gradient(135deg, #fef9d7 0%, #d4efdf 50%, #d6eaf8 100%);
          background-size: 200% 200%;
          animation: gradientBG 15s ease infinite;
        }
      `}</style>
      
      {/* Fallback Background Layer */}
      <div className="absolute top-0 left-0 w-full h-full fallback-gradient" />
      
      {/* WebGL Canvas Layer */}
      <canvas 
        ref={canvasRef} 
        className={`absolute top-0 left-0 w-full h-full transition-opacity duration-1000 ${hasError ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      />

      {/* Dark Mode Overlay for Readability */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-0 dark:opacity-40 bg-black/50 transition-opacity duration-300"></div>
    </div>
  );
};

export default ColorManifoldBackground;