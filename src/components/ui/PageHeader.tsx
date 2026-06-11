import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  onBack: () => void;
  rightElement?: React.ReactNode;
  className?: string;
}

export default function PageHeader({ title, onBack, rightElement, className = '' }: PageHeaderProps) {
  return (
    <div className={`p-4 border-b border-white/5 flex items-center justify-between bg-black/40 ${className}`}>
      <button onClick={onBack} className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
        <ArrowLeft className="w-5 h-5 text-white" />
      </button>
      <h2 className="text-lg font-bold text-white">{title}</h2>
      {rightElement || <div className="w-10" />}
    </div>
  );
}
