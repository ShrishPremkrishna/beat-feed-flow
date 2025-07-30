import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, Volume2 } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

interface BeatPlayerProps {
  audioUrl: string;
  title: string;
  artist?: string;
  bpm?: number;
  beatKey?: string;
  purchaseLink?: string;
  className?: string;
}

export const BeatPlayer: React.FC<BeatPlayerProps> = ({
  audioUrl,
  title,
  artist,
  bpm,
  beatKey,
  purchaseLink,
  className = ""
}) => {

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);
  const audioRef = useRef<HTMLAudioElement>(null);
  

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (value: number[]) => {
    if (!audioRef.current) return;
    const newTime = (value[0] / 100) * duration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (value: number[]) => {
    if (!audioRef.current) return;
    const newVolume = value[0];
    audioRef.current.volume = newVolume / 100;
    setVolume(newVolume);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`bg-gradient-card border border-border/50 rounded-xl p-5 space-y-4 shadow-card ${className}`}>
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      
      {/* Beat Info */}
      <div className="space-y-2">
        <h4 className="font-semibold text-base text-foreground">{title}</h4>
        
        {/* Beat Details */}
        <div className="flex flex-col gap-2">
          <div className="flex gap-3 text-xs text-muted-foreground">
            {bpm && <span>{bpm} BPM</span>}
            {beatKey && <span>Key: {beatKey}</span>}
          </div>
          
          {/* Purchase Link */}
          {purchaseLink && (
            <div className="flex items-center gap-2">
              <a
                href={purchaseLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:text-primary/80 underline flex items-center gap-1"
              >
                <span>Buy Here</span>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Player Controls */}
      <div className="space-y-2">
        {/* Progress Bar */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{formatTime(currentTime)}</span>
          <Slider
            value={[duration > 0 ? (currentTime / duration) * 100 : 0]}
            onValueChange={handleSeek}
            className="flex-1"
            max={100}
            step={0.1}
          />
          <span>{formatTime(duration)}</span>
        </div>

        {/* Play Controls */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={togglePlay}
            className={`h-10 w-10 p-0 rounded-full transition-all duration-300 ${
              isPlaying 
                ? 'bg-gradient-primary shadow-glow text-white hover:shadow-intense' 
                : 'hover:bg-primary/20 border border-primary/30'
            }`}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4 ml-0.5" />
            )}
          </Button>

          {/* Volume Control */}
          <div className="flex items-center gap-2 ml-auto">
            <Volume2 className="h-3 w-3 text-muted-foreground" />
            <Slider
              value={[volume]}
              onValueChange={handleVolumeChange}
              className="w-16"
              max={100}
              step={1}
            />
          </div>
        </div>
      </div>
    </div>
  );
};