"use client";

import React from "react";

interface FloatingLeafProps {
  className?: string;
  size?: number;
  rotation?: number;
  delay?: number;
  duration?: number;
}

export function FloatingLeaf({
  className = "",
  size = 40,
  rotation = 0,
  delay = 0,
  duration = 6,
}: FloatingLeafProps) {
  return (
    <div
      className={`pointer-events-none select-none absolute z-10 ${className}`}
      style={{
        width: size,
        height: size,
        transform: `rotate(${rotation}deg)`,
        animation: `leafFloat ${duration}s ease-in-out ${delay}s infinite alternate`,
      }}
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)]"
      >
        <defs>
          <linearGradient id={`leafGrad-${size}-${rotation}`} x1="10" y1="10" x2="90" y2="90" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#4ade80" />
            <stop offset="45%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#15803d" />
          </linearGradient>
          <linearGradient id={`leafHighlight-${size}-${rotation}`} x1="0" y1="0" x2="100" y2="50" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#86efac" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Leaf blade */}
        <path
          d="M 12 88 C 12 88 15 50 48 24 C 68 8 86 10 92 12 C 94 20 94 40 76 65 C 54 94 12 88 12 88 Z"
          fill={`url(#leafGrad-${size}-${rotation})`}
        />

        {/* Subtle leaf gloss */}
        <path
          d="M 25 75 C 28 55 50 32 68 22 C 78 17 84 16 88 15 C 80 25 70 42 55 58 C 40 73 25 75 25 75 Z"
          fill={`url(#leafHighlight-${size}-${rotation})`}
        />

        {/* Center vein */}
        <path
          d="M 12 88 C 30 70 52 48 88 14"
          stroke="#166534"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Side veins */}
        <path
          d="M 32 72 Q 42 66 48 68"
          stroke="#166534"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <path
          d="M 46 56 Q 60 48 68 52"
          stroke="#166534"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <path
          d="M 62 40 Q 74 34 80 37"
          stroke="#166534"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <path
          d="M 40 63 Q 32 50 28 46"
          stroke="#166534"
          strokeWidth="1"
          strokeLinecap="round"
        />
        <path
          d="M 54 48 Q 48 38 42 32"
          stroke="#166534"
          strokeWidth="1"
          strokeLinecap="round"
        />

        {/* Dew droplet reflection */}
        <circle cx="65" cy="30" r="3" fill="#ffffff" fillOpacity="0.6" />
        <circle cx="64" cy="29" r="1" fill="#ffffff" />
      </svg>
    </div>
  );
}

