import { useMemo } from 'react';
import { getBambooColor, getBambooHeight } from '@/lib/client';

interface BambooVisualProps {
  balanceScore: number;
  healthScore: number;
  leafDensity: number;
  trend: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  label?: string;
  className?: string;
}

export default function BambooVisual({
  balanceScore,
  healthScore,
  leafDensity,
  trend,
  size = 'md',
  showLabel = true,
  label,
  className = '',
}: BambooVisualProps) {
  const color = useMemo(() => getBambooColor(healthScore), [healthScore]);
  const height = useMemo(() => getBambooHeight(balanceScore), [balanceScore]);

  const dimensions = {
    sm: { width: 40, totalHeight: 80, stalkWidth: 6 },
    md: { width: 60, totalHeight: 120, stalkWidth: 8 },
    lg: { width: 80, totalHeight: 160, stalkWidth: 10 },
  };

  const dim = dimensions[size];
  const stalkHeight = (height / 100) * dim.totalHeight * 0.8;
  const startY = dim.totalHeight - 8;

  // Generate leaves based on density
  const leaves = useMemo(() => {
    const result: Array<{ x: number; y: number; rotation: number; scale: number; opacity: number; falling: boolean }> = [];
    const maxLeaves = leafDensity;
    for (let i = 0; i < maxLeaves; i++) {
      const progress = (i + 1) / (maxLeaves + 1);
      const leafY = startY - stalkHeight * progress;
      const side = i % 2 === 0 ? 1 : -1;
      result.push({
        x: dim.width / 2 + side * (dim.stalkWidth + 4 + Math.random() * 6),
        y: leafY,
        rotation: side * (20 + Math.random() * 30),
        scale: 0.6 + Math.random() * 0.4,
        opacity: 0.7 + Math.random() * 0.3,
        falling: false,
      });
    }
    // Add falling leaves for declining trend
    if (trend === 'declining') {
      for (let i = 0; i < 2; i++) {
        result.push({
          x: dim.width / 2 + (i % 2 === 0 ? 1 : -1) * (12 + Math.random() * 10),
          y: startY - stalkHeight * 0.3 + Math.random() * 20,
          rotation: 30 + Math.random() * 60,
          scale: 0.5,
          opacity: 0.4,
          falling: true,
        });
      }
    }
    // Add sprouts for growing trend
    if (trend === 'growing') {
      result.push({
        x: dim.width / 2 + 2,
        y: startY - stalkHeight - 6,
        rotation: -15,
        scale: 0.4,
        opacity: 0.9,
        falling: false,
      });
    }
    return result;
  }, [leafDensity, trend, stalkHeight, startY, dim]);

  // Bamboo segments (nodes)
  const segments = useMemo(() => {
    const count = Math.max(2, Math.floor(stalkHeight / 20));
    const result: number[] = [];
    for (let i = 1; i < count; i++) {
      result.push(startY - (stalkHeight / count) * i);
    }
    return result;
  }, [stalkHeight, startY]);

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <svg
        width={dim.width}
        height={dim.totalHeight}
        viewBox={`0 0 ${dim.width} ${dim.totalHeight}`}
        className="overflow-visible"
      >
        {/* Ground */}
        <ellipse
          cx={dim.width / 2}
          cy={startY + 2}
          rx={dim.stalkWidth + 6}
          ry={3}
          fill={color}
          opacity={0.2}
        />

        {/* Main stalk */}
        <rect
          x={dim.width / 2 - dim.stalkWidth / 2}
          y={startY - stalkHeight}
          width={dim.stalkWidth}
          height={stalkHeight}
          rx={dim.stalkWidth / 2}
          fill={color}
          opacity={0.85}
          className="transition-all duration-700 ease-out"
        />

        {/* Stalk inner highlight */}
        <rect
          x={dim.width / 2 - dim.stalkWidth / 4}
          y={startY - stalkHeight + 2}
          width={dim.stalkWidth / 3}
          height={stalkHeight - 4}
          rx={dim.stalkWidth / 4}
          fill="white"
          opacity={0.15}
        />

        {/* Bamboo nodes */}
        {segments.map((y, i) => (
          <rect
            key={i}
            x={dim.width / 2 - dim.stalkWidth / 2 - 1}
            y={y - 1}
            width={dim.stalkWidth + 2}
            height={2.5}
            rx={1}
            fill={color}
            opacity={0.6}
          />
        ))}

        {/* Leaves */}
        {leaves.map((leaf, i) => (
          <g
            key={i}
            transform={`translate(${leaf.x}, ${leaf.y}) rotate(${leaf.rotation}) scale(${leaf.scale})`}
            opacity={leaf.opacity}
            className={leaf.falling ? 'animate-pulse' : ''}
          >
            <path
              d="M0,-8 C4,-6 6,-2 0,2 C-6,-2 -4,-6 0,-8Z"
              fill={leaf.falling ? '#D4A574' : color}
              stroke={leaf.falling ? '#C97B5A' : color}
              strokeWidth={0.5}
              opacity={0.9}
            />
          </g>
        ))}

        {/* Top sprout for growing */}
        {trend === 'growing' && (
          <g
            transform={`translate(${dim.width / 2}, ${startY - stalkHeight - 4})`}
            className="animate-pulse"
          >
            <path
              d="M0,0 C2,-6 4,-10 2,-14"
              stroke="#4CAF50"
              strokeWidth={1.5}
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M0,0 C-2,-5 -4,-9 -1,-12"
              stroke="#4CAF50"
              strokeWidth={1.5}
              fill="none"
              strokeLinecap="round"
            />
          </g>
        )}
      </svg>
      {showLabel && label && (
        <span className="text-xs text-[#6B7B6E] mt-1 text-center truncate max-w-[60px] font-medium">
          {label}
        </span>
      )}
    </div>
  );
}
