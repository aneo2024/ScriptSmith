import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography, Spin } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth';
import { getWorkStats } from '../services/work';

const { Text } = Typography;

/** 格式化字数显示 */
function formatWordCount(n) {
  if (n == null || n === 0) return '0';
  if (n >= 10000) {
    return (n / 10000).toFixed(1).replace(/\.0$/, '') + '万';
  }
  return n.toLocaleString();
}

// ========== 动画样式 ==========
const STYLES = `
  @keyframes orbitFloat {
    0%, 100% { transform: translate(-50%, -50%) translateY(0); }
    50% { transform: translate(-50%, -50%) translateY(-10px); }
  }
  @keyframes bubbleFloat1 {
    0%, 100% { transform: translate(-50%, -50%); }
    33% { transform: translate(-50%, -50%) translateX(6px) translateY(-8px); }
    66% { transform: translate(-50%, -50%) translateX(-4px) translateY(4px); }
  }
  @keyframes bubbleFloat2 {
    0%, 100% { transform: translate(-50%, -50%); }
    33% { transform: translate(-50%, -50%) translateX(-8px) translateY(-6px); }
    66% { transform: translate(-50%, -50%) translateX(6px) translateY(2px); }
  }
  @keyframes bubbleFloat3 {
    0%, 100% { transform: translate(-50%, -50%); }
    33% { transform: translate(-50%, -50%) translateX(5px) translateY(6px); }
    66% { transform: translate(-50%, -50%) translateX(-7px) translateY(-4px); }
  }
  @keyframes fadeInUp {
    0% { opacity: 0; transform: translate(-50%, -50%) translateY(20px); }
    100% { opacity: 1; transform: translate(-50%, -50%) translateY(0); }
  }
  @keyframes avatarPulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(58,107,40,0.3), 0 4px 20px rgba(0,0,0,0.1); }
    50% { box-shadow: 0 0 0 16px rgba(58,107,40,0), 0 4px 24px rgba(0,0,0,0.15); }
  }
  @keyframes welcomeFade {
    0% { opacity: 0; transform: translateY(12px); }
    100% { opacity: 1; transform: translateY(0); }
  }
`;

const COLORS = {
  primary: '#3a6b28',
  primaryLight: '#5a8f42',
  bg: '#f5f8f3',
};

/** 单个统计泡泡 */
function StatBubble({ label, value, angle, distance, animName, delay, onClick }) {
  const rad = (angle * Math.PI) / 180;
  const left = 50 + Math.cos(rad) * distance;
  const top = 50 + Math.sin(rad) * distance;

  return (
    <div
      onClick={onClick}
      style={{
        position: 'absolute',
        left: `${left}%`,
        top: `${top}%`,
        transform: 'translate(-50%, -50%)',
        animation: `${animName} 6s ease-in-out infinite, fadeInUp 0.8s ease-out ${delay}s both`,
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div
        style={{
          width: 90,
          height: 90,
          borderRadius: '50%',
          background: 'rgba(255,255,252,0.82)',
          border: '1.5px solid rgba(58,107,40,0.18)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(45,80,22,0.1)',
        }}
      >
        <Text style={{ fontSize: 20, fontWeight: 700, color: COLORS.primary, lineHeight: 1.2 }}>
          {value}
        </Text>
        <Text style={{ fontSize: 11, color: '#7a9a6a', lineHeight: 1 }}>
          {label}
        </Text>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    getWorkStats()
      .then((data) => setStats(data))
      .catch(() => setStats({ count: 0, total_words: 0 }));
  }, []);

  const workCount = stats?.count ?? 0;
  const totalWords = stats?.total_words ?? 0;

  return (
    <div
      style={{
        minHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <style>{STYLES}</style>

      {/* 欢迎语 */}
      <div
        style={{
          textAlign: 'center',
          marginBottom: 48,
          animation: 'welcomeFade 1s ease-out both',
        }}
      >
        <Text style={{ fontSize: 14, color: '#8a9a7a', letterSpacing: 2 }}>
          欢迎回来
        </Text>
        <h2 style={{ margin: '4px 0 0', color: COLORS.primary, fontWeight: 600, fontSize: 22 }}>
          {user?.username}
        </h2>
      </div>

      {/* 头像 + 统计泡泡区域 */}
      <div
        style={{
          position: 'relative',
          width: 480,
          height: 480,
        }}
      >
        {/* 统计泡泡 */}
        {stats && (
          <>
            <StatBubble
              label="作品数"
              value={workCount}
              angle={-90}
              distance={38}
              animName="bubbleFloat1"
              delay={0.2}
              onClick={() => navigate('/works')}
            />
            <StatBubble
              label="字数"
              value={formatWordCount(totalWords)}
              angle={-30}
              distance={38}
              animName="bubbleFloat2"
              delay={0.4}
            />
            <StatBubble
              label="访客"
              value="-"
              angle={150}
              distance={38}
              animName="bubbleFloat3"
              delay={0.6}
            />
          </>
        )}

        {/* 中央头像 */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        >
          {/* 外圈脉冲 */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 130,
              height: 130,
              borderRadius: '50%',
              border: '2px solid rgba(58,107,40,0.2)',
              animation: 'avatarPulse 3s ease-in-out infinite',
              pointerEvents: 'none',
            }}
          />
          {/* 头像本体 */}
          <div
            style={{
              width: 100,
              height: 100,
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${COLORS.primaryLight}, ${COLORS.primary})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              position: 'relative',
              zIndex: 1,
            }}
          >
            <UserOutlined style={{ fontSize: 44, color: '#fff' }} />
          </div>
        </div>
      </div>

      {/* 下方提示 */}
      <div
        style={{
          marginTop: 32,
          textAlign: 'center',
          animation: 'welcomeFade 1s ease-out 0.3s both',
        }}
      >
        <Text style={{ color: '#a0b0a0', fontSize: 13 }}>
          使用顶部导航栏管理你的作品
        </Text>
      </div>
    </div>
  );
}
