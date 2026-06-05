import { useRef, useEffect } from 'react';

// ========== 光尘参数 ==========
const CONFIG = {
  COUNT: 10,
  SIZE_MIN: 3,
  SIZE_MAX: 14,
  SPEED_MIN: 0.06,
  SPEED_MAX: 0.25,
  SWAY_MIN: 0.15,
  SWAY_MAX: 0.7,
  OPACITY_MIN: 0.2,
  OPACITY_MAX: 0.6,
  COLORS: [
    'rgba(255, 248, 210, 0)',   // 暖白
    'rgba(255, 242, 180, 0)',   // 暖金
    'rgba(252, 250, 240, 0)',   // 米白
    'rgba(255, 235, 160, 0)',   // 琥珀金
  ],
};

class LightMote {
  constructor(canvas) {
    const rand = (min, max) => Math.random() * (max - min) + min;

    this.canvas = canvas;
    this.x = rand(0, canvas.width);
    // 主要分布在底部60%区域（暗部），顶部40%（亮部）少放
    this.y = rand(canvas.height * 0.3, canvas.height);
    this.radius = rand(CONFIG.SIZE_MIN, CONFIG.SIZE_MAX);
    this.speedY = rand(CONFIG.SPEED_MIN, CONFIG.SPEED_MAX);
    this.opacity = rand(CONFIG.OPACITY_MIN, CONFIG.OPACITY_MAX);
    this.baseColor = CONFIG.COLORS[Math.floor(Math.random() * CONFIG.COLORS.length)];

    // 摇曳参数
    this.phase = rand(0, Math.PI * 2);
    this.swayFreq = rand(0.005, 0.02);
    this.swayAmp = rand(CONFIG.SWAY_MIN, CONFIG.SWAY_MAX);
    this.t = Math.random() * 1000;

    // 闪烁
    this.twinkleSpeed = rand(0.003, 0.01);
    this.twinklePhase = rand(0, Math.PI * 2);
  }

  update() {
    this.t += 1;

    const sway = Math.sin(this.t * this.swayFreq + this.phase) * this.swayAmp;
    this.x += sway;
    this.y -= this.speedY;

    // 水平循环
    if (this.x < -20) this.x = this.canvas.width + 20;
    if (this.x > this.canvas.width + 20) this.x = -20;

    // 顶部消失，从底部重新出现
    if (this.y < -20) {
      this.y = this.canvas.height + 20;
      this.x = Math.random() * this.canvas.width;
    }
  }

  draw(ctx) {
    const { x, y, radius } = this;

    // 闪烁透明度
    const twinkle = 0.5 + 0.5 * Math.sin(this.t * this.twinkleSpeed + this.twinklePhase);
    const alpha = this.opacity * (0.6 + 0.4 * twinkle);

    ctx.save();
    ctx.globalAlpha = alpha;

    // 光晕：大范围柔和径向渐变
    const glowRadius = radius * 3;
    const glow = ctx.createRadialGradient(x, y, 0, x, y, glowRadius);
    glow.addColorStop(0, this.baseColor.replace('0)', '1)'));
    glow.addColorStop(0.2, this.baseColor.replace('0)', '0.6)'));
    glow.addColorStop(0.5, this.baseColor.replace('0)', '0.15)'));
    glow.addColorStop(1, this.baseColor.replace('0)', '0)'));

    ctx.beginPath();
    ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
    ctx.fillStyle = glow;
    ctx.fill();

    // 核心亮点
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 252, 240, 0.9)';
    ctx.fill();

    ctx.restore();
  }
}

export default function ForestLightParticles() {
  const canvasRef = useRef(null);
  const motesRef = useRef([]);
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

    motesRef.current = Array.from({ length: CONFIG.COUNT }, () => new LightMote(canvas));

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const m of motesRef.current) {
        m.update();
        m.draw(ctx);
      }

      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
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
        zIndex: 3,
        pointerEvents: 'none',
      }}
    />
  );
}
