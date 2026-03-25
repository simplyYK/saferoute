"use client";
import { motion } from "framer-motion";

interface SentinelLogoProps {
  size?: number;
  animated?: boolean;
  className?: string;
}

export function SentinelIcon({ size = 32, animated = false, className = "" }: SentinelLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Outer hexagon */}
      <motion.polygon
        points="20,2 34,10 34,28 20,36 6,28 6,10"
        fill="none"
        stroke="#0EA5E9"
        strokeWidth="1.5"
        initial={animated ? { opacity: 0, scale: 0.8 } : false}
        animate={animated ? { opacity: 1, scale: 1 } : false}
        transition={{ duration: 0.5 }}
      />
      {/* Inner scan ring */}
      <motion.circle
        cx="20"
        cy="19"
        r="8"
        fill="none"
        stroke="#0EA5E9"
        strokeWidth="1"
        strokeDasharray="3 2"
        opacity="0.5"
        initial={animated ? { rotate: 0 } : false}
        animate={animated ? { rotate: 360 } : false}
        transition={animated ? { duration: 8, repeat: Infinity, ease: "linear" } : undefined}
        style={{ transformOrigin: "20px 19px" }}
      />
      {/* Eye iris */}
      <ellipse cx="20" cy="19" rx="5" ry="3.5" fill="none" stroke="#0EA5E9" strokeWidth="1.5" />
      {/* Pupil */}
      <circle cx="20" cy="19" r="1.8" fill="#0EA5E9" />
      {/* Scan line - top */}
      <line x1="20" y1="2" x2="20" y2="11" stroke="#0EA5E9" strokeWidth="1" opacity="0.4" />
      {/* Scan line - bottom */}
      <line x1="20" y1="27" x2="20" y2="36" stroke="#0EA5E9" strokeWidth="1" opacity="0.4" />
      {/* Corner ticks */}
      <line x1="6" y1="10" x2="9" y2="11.7" stroke="#0EA5E9" strokeWidth="1" opacity="0.3" />
      <line x1="34" y1="10" x2="31" y2="11.7" stroke="#0EA5E9" strokeWidth="1" opacity="0.3" />
    </svg>
  );
}

export function SentinelWordmark({ size = "sm" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "text-sm", md: "text-base", lg: "text-xl" };
  return (
    <span className={`font-bold tracking-[0.15em] uppercase ${sizes[size]}`}>
      <span className="text-white">SENTI</span>
      <span className="text-teal">NEL</span>
    </span>
  );
}
