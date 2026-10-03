'use client';
import React, { useEffect } from 'react';
import ChickenIcon from '@/components/ChickenIcon';

type Props = { onFinished: () => void };

export default function SplashScreen({ onFinished }: Props) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onFinished();
    }, 2200);
    return () => clearTimeout(timer);
  }, [onFinished]);

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-between bg-gradient-to-br from-[#04120e] via-[#091727] to-[#042f24] p-8 text-white font-sans overflow-hidden">
      <div className="absolute -top-32 -left-32 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="h-10"></div>
      
      <div className="flex flex-col items-center space-y-5 text-center relative z-10">
        <div className="w-24 h-24 bg-gradient-to-tr from-emerald-500/20 to-teal-500/10 rounded-lg border border-emerald-400/20 flex items-center justify-center shadow-2xl shadow-emerald-500/10 animate-pulse">
          <ChickenIcon className="w-12 h-12 text-emerald-400" />
        </div>
        <div className="space-y-1.5">
          <span className="text-xs font-black tracking-widest text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-3 py-1 rounded-full uppercase">ISUFST CICT Official Capstone</span>
        <p className="text-4xl md:text-5xl font-black tracking-wider text-white">
          GALLO<span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">TRACK</span>
        </p>
          <p className="text-sm text-muted-foreground font-semibold tracking-wide max-w-xs mx-auto">
            Advanced Chicken Lineage Analytics &amp; Structural Trace Registry Framework
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center space-y-3 relative z-10 mb-4">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-bold text-muted-foreground tracking-wider">INITIALIZING CLUSTER PIPELINE</span>
        </div>
        <p className="text-xs text-muted-foreground font-mono tracking-widest uppercase">ISUFST DINGLE CAMPUS HUB v1.2.0</p>
      </div>
    </div>
  );
}
