import { useRef, useEffect } from 'react';

// ========== 可调参数 ==========
const CONFIG = {
  COUNT_MIN: 15,
  COUNT_MAX: 25,
  SIZE_MIN: 30,
  SIZE_MAX: 90,
  SPEED_MIN: 0.2,
  SPEED_MAX: 0.6,
  SWAY_MIN: 0.3,
  SWAY_MAX: 0.8,
  OPACITY_MIN: 0.25,
  OPACITY_MAX: 0.40,
  FLEE_RADIUS: 120,         // 鼠标影响半径
  FLEE_STRENGTH: 0.8,       // 逃逸力度
  COLORS: [
    'hsla(340, 70%, 78%, 0)',    // 淡粉
    'hsla(350, 65%, 80%, 0)',    // 淡粉
    'hsla(200, 70%, 80%, 0)',    // 淡蓝
    'hsla(210, 65%, 78%, 0)',    // 淡蓝
    'hsla(270, 60%, 83%, 0)',    // 淡紫
    'hsla(280, 55%, 82%, 0)',    // 淡紫
    'hsla(50, 65%, 80%, 0)',     // 淡黄
    'hsla(45, 60%, 82%, 0)',     // 淡黄
    'hsla(160, 55%, 80%, 0)',    // 淡绿
    'hsla(10, 65%, 81%, 0)',     // 淡橙
  ],
};

// 泡泡类
class Bubble {
  constructor(canvas) {
    const rand = (min, max) => Math.random() * (max - min) + min;

    this.canvas = canvas;
    this.x = rand(0, canvas.width);
    this.y = rand(canvas.height * 0.2, canvas.height);
    this.radius = rand(CONFIG.SIZE_MIN, CONFIG.SIZE_MAX) / 2;
    this.speedY = rand(CONFIG.SPEED_MIN, CONFIG.SPEED_MAX);
    this.speedX = rand(CONFIG.SWAY_MIN, CONFIG.SWAY_MAX);
    this.opacity = rand(CONFIG.OPACITY_MIN, CONFIG.OPACITY_MAX);
    this.color = CONFIG.COLORS[Math.floor(Math.random() * CONFIG.COLORS.length)];

    // 摇曳相位和频率（每个泡泡各不相同）
    this.phase = rand(0, Math.PI * 2);
    this.swayFreq = rand(0.02, 0.05);
    this.swayAmp = rand(0.3, 1.2);
    this.t = Math.random() * 1000;
  }

  update(mouseX, mouseY, mouseIn) {
    this.t += 1;

    // 水平摇曳
    const sway = Math.sin(this.t * this.swayFreq + this.phase) * this.swayAmp;

    // 上升
    let vy = this.speedY;
    let vx = sway;

    // 鼠标逃逸
    if (mouseIn) {
      const dx = this.x - mouseX;
      const dy = this.y - mouseY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < CONFIG.FLEE_RADIUS && dist > 0) {
        const force = (CONFIG.FLEE_RADIUS - dist) / CONFIG.FLEE_RADIUS * CONFIG.FLEE_STRENGTH;
        vx += (dx / dist) * force * 3;
        vy += (dy / dist) * force * 2;
      }
    }

    this.x += vx;
    this.y -= vy;

    // 边缘反弹
    if (this.x - this.radius < 0) {
      this.x = this.radius;
    } else if (this.x + this.radius > this.canvas.width) {
      this.x = this.canvas.width - this.radius;
    }

    // 底部反弹，顶部离开重置到底部
    if (this.y - this.radius < -this.radius * 2) {
      this.y = this.canvas.height + this.radius;
      this.x = Math.random() * this.canvas.width;
    }
    if (this.y + this.radius > this.canvas.height) {
      this.y = this.canvas.height - this.radius;
    }
  }

  draw(ctx) {
    const { x, y, radius } = this;

    ctx.save();
    ctx.globalAlpha = this.opacity;

    // 主体：径向渐变模拟肥皂泡
    const gradient = ctx.createRadialGradient(
      x - radius * 0.25, y - radius * 0.3, radius * 0.15,  // 高光点
      x, y, radius
    );
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    gradient.addColorStop(0.15, 'rgba(255, 255, 255, 0.6)');
    gradient.addColorStop(0.4, this.color.replace('0)', '0.5)'));
    gradient.addColorStop(0.7, this.color.replace('0)', '0.22)'));
    gradient.addColorStop(0.9, this.color.replace('0)', '0.1)'));
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0.04)');

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    // 边缘光泽
    const edgeGrad = ctx.createRadialGradient(
      x - radius * 0.3, y - radius * 0.35, radius * 0.6,
      x, y, radius
    );
    edgeGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
    edgeGrad.addColorStop(0.85, 'rgba(255, 255, 255, 0.15)');
    edgeGrad.addColorStop(1, 'rgba(255, 255, 255, 0.3)');
    ctx.fillStyle = edgeGrad;
    ctx.fill();

    // 上部高光反射点
    ctx.beginPath();
    ctx.arc(
      x + radius * 0.15,
      y - radius * 0.35,
      radius * 0.12,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fill();

    ctx.restore();
  }
}

export default function BubbleBackground() {
  const canvasRef = useRef(null);
  const bubblesRef = useRef([]);
  const mouseRef = useRef({ x: -1000, y: -1000, in: false });
  const rafRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // 创建泡泡
    const count = Math.floor(Math.random() * (CONFIG.COUNT_MAX - CONFIG.COUNT_MIN + 1)) + CONFIG.COUNT_MIN;
    bubblesRef.current = Array.from({ length: count }, () => new Bubble(canvas));

    // 鼠标追踪
    const onMouseMove = (e) => {
      mouseRef.current = { x: e.clientX, y: e.clientY, in: true };
    };
    const onMouseLeave = () => {
      mouseRef.current = { x: -1000, y: -1000, in: false };
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseleave', onMouseLeave);

    // 动画循环
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const { x, y, in: mouseIn } = mouseRef.current;
      for (const b of bubblesRef.current) {
        b.update(x, y, mouseIn);
        b.draw(ctx);
      }

      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseleave', onMouseLeave);
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
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  );
}
