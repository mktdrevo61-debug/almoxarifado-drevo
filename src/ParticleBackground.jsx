import { useEffect, useRef } from 'react';

export default function ParticleBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    let targetMouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const handleMouseMove = (e) => {
      targetMouse.x = e.clientX;
      targetMouse.y = e.clientY;
    };

    const handleTouchMove = (e) => {
      if (e.touches.length > 0) {
        targetMouse.x = e.touches[0].clientX;
        targetMouse.y = e.touches[0].clientY;
      }
    };

    const handleMouseLeave = () => {
      targetMouse.x = window.innerWidth / 2;
      targetMouse.y = window.innerHeight / 2;
    };

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    resize();

    const particles = [];
    const numParticles = 2500; // Alta densidade para o disco de acreção
    const R_eh = 80; // Raio do Horizonte de Eventos
    
    for (let i = 0; i < numParticles; i++) {
      particles.push({
        angle: Math.random() * Math.PI * 2,
        radius: R_eh + Math.random() * Math.max(canvas.width, canvas.height),
        size: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.8 + 0.2,
        direction: 1 // Sentido do giro
      });
    }

    const drawParticle = (px, py, p, alphaMult = 1) => {
      let r, g, b;
      const dist = p.radius - R_eh;
      
      if (dist < 20) {
        r = 255; g = 255; b = 255; // Branco incandescente perto do horizonte
      } else if (dist < 80) {
        r = 255; g = 200; b = 100; // Amarelo
      } else if (dist < 250) {
        r = 255; g = 100; b = 20;  // Laranja
      } else {
        r = 180; g = 30; b = 30;   // Vermelho escuro/bordo nas bordas
      }

      const currentSize = dist > 400 ? p.size * 0.5 : p.size;

      ctx.beginPath();
      ctx.arc(px, py, currentSize, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${p.alpha * alphaMult})`;
      ctx.fill();
    };

    const render = () => {
      // Efeito de rastro
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      // Movimento suave do mouse para o Parallax do Buraco Negro
      mouse.x += (targetMouse.x - mouse.x) * 0.05;
      mouse.y += (targetMouse.y - mouse.y) * 0.05;

      // Posição central do Buraco Negro com parallax leve
      const bhX = cx + (mouse.x - cx) * 0.1;
      const bhY = cy + (mouse.y - cy) * 0.1;

      const backParticles = [];
      const frontParticles = [];

      // 1. Atualizar e classificar partículas
      for (let i = 0; i < numParticles; i++) {
        const p = particles[i];
        
        // Puxão gravitacional (cai mais rápido quanto mais perto)
        const gravityPull = (200 / Math.max(p.radius, 1)) * 0.05;
        p.radius -= gravityPull;
        
        // Velocidade orbital aumenta perto do centro (Leis de Kepler)
        const speed = Math.max(0.002, 3 / p.radius);
        p.angle += speed * p.direction;

        // Se cruzou o horizonte de eventos, é "engolido" e renasce na borda externa
        if (p.radius <= R_eh + 2) {
          p.radius = Math.max(canvas.width, canvas.height) * (0.5 + Math.random() * 0.8);
          p.angle = Math.random() * Math.PI * 2;
        }

        // Determinar se está atrás ou na frente do buraco negro
        if (Math.sin(p.angle) < 0) {
          backParticles.push(p);
        } else {
          frontParticles.push(p);
        }
      }

      // 2. Desenhar partículas do fundo (parte de trás do funil)
      for (let i = 0; i < backParticles.length; i++) {
        const p = backParticles[i];
        
        // Cálculo do funil (Buraco de Minhoca)
        // Quanto mais perto do raio mínimo (R_eh), mais fundo a partícula desce no eixo Y
        const maxRadius = Math.max(canvas.width, canvas.height);
        const ratio = Math.max(0, Math.min(1, (400 - p.radius) / 400));
        // Aprofundamento exponencial para criar o formato de tornado/funil
        const depth = Math.pow(ratio, 3) * 350;

        const px = bhX + Math.cos(p.angle) * p.radius;
        const py = bhY + Math.sin(p.angle) * p.radius * 0.3 + depth;
        drawParticle(px, py, p);
      }

      // 3. Desenhar partículas da frente (parte da frente do funil)
      for (let i = 0; i < frontParticles.length; i++) {
        const p = frontParticles[i];
        
        const ratio = Math.max(0, Math.min(1, (400 - p.radius) / 400));
        const depth = Math.pow(ratio, 3) * 350;

        const px = bhX + Math.cos(p.angle) * p.radius;
        const py = bhY + Math.sin(p.angle) * p.radius * 0.3 + depth;
        drawParticle(px, py, p);
      }

      animationFrameId = requestAnimationFrame(render);
    };
    render();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        width: '100%', 
        height: '100%', 
        zIndex: -2,
        pointerEvents: 'none'
      }} 
    />
  );
}
