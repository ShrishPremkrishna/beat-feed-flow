import React, { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import WaveSurfer from 'wavesurfer.js';

interface AudioWaveformProps {
  audioRef: React.RefObject<HTMLAudioElement>;
  className?: string;
  height?: number;
  activeColor?: string;
  inactiveColor?: string;
  // No external seek handler needed; Wavesurfer + media handles it
}

export const AudioWaveform: React.FC<AudioWaveformProps> = ({
  audioRef,
  className = "",
  height = 60,
  activeColor = "hsl(180 100% 50%)",
  inactiveColor = "hsl(0 0% 20%)",
  
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const waveSurferRef = useRef<WaveSurfer | null>(null);

  useEffect(() => {
    if (!containerRef.current || !audioRef.current) return;

    // Create wavesurfer instance
    waveSurferRef.current = WaveSurfer.create({
      container: containerRef.current,
      height: height,
      waveColor: inactiveColor,
      progressColor: activeColor,
      media: audioRef.current,
      normalize: true,
      barWidth: 2,
      barGap: 1,
      barRadius: 1
    });

    return () => {
      // Destroy instance
      waveSurferRef.current?.destroy();
    };
  }, [audioRef, height, activeColor, inactiveColor]);

  return (
    <div className={cn("w-full", className)}>
      <div ref={containerRef} className="w-full" style={{ height: `${height}px` }} />
    </div>
  );
}; 