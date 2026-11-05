import type { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  padding?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

export default function GlassCard({ children, className = '', hover = false, padding = 'md', onClick }: GlassCardProps) {
  const padMap = { sm: 'p-4', md: 'p-6', lg: 'p-8' };
  return (
    <div
      className={`bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl ${padMap[padding]} ${hover ? 'hover:bg-white/10 hover:border-white/20 cursor-pointer transition-all duration-300' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
