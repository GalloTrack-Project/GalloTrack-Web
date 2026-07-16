import React, { useEffect } from 'react';

export default function SplashScreen({ onFinished }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onFinished();
    }, 2000); // Mawawala pagkatapos ng 2 seconds
    return () => clearTimeout(timer);
  }, [onFinished]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-gradient-to-b from-[#022c22] to-[#090d16] p-8 text-white">
      <div className="h-10"></div>
      <div className="flex flex-col items-center space-y-4">
        <div className="text-6xl animate-bounce">🐓</div>
        <h1 className="text-3xl font-black tracking-widest text-white">GALLO<span className="text-emerald-500">TRACK</span></h1>
        <p className="text-xs text-emerald-400">Optimizing Breeding Through Analytics</p>
      </div>
      <div className="flex flex-col items-center space-y-2">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[10px] text-gray-400">Loading Cloud Database...</p>
      </div>
    </div>
  );
}