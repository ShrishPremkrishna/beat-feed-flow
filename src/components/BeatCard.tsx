import { useState } from 'react';
import { Play, Pause, Heart, MessageCircle, Copy, DollarSign, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface BeatCardProps {
  beat: {
    id: string;
    title: string;
    artist: string;
    avatar: string;
    coverArt: string;
    bpm: number;
    key: string;
    mood: string[];
    description: string;
    price?: number;
    likes: number;
    comments: number;
    duration: string;
    isLiked?: boolean;
  };
  isAiRecommended?: boolean;
  onSwipe?: (direction: 'left' | 'right') => void;
  onLike?: () => void;
  onComment?: () => void;
  onPlay?: () => void;
}

export const BeatCard = ({ beat, isAiRecommended = false, onSwipe, onLike, onComment, onPlay }: BeatCardProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);

  const handlePlay = () => {
    setIsPlaying(!isPlaying);
    onPlay?.();
  };

  const handleSwipe = (direction: 'left' | 'right') => {
    setSwipeDirection(direction);
    setTimeout(() => {
      onSwipe?.(direction);
      setSwipeDirection(null);
    }, 300);
  };

  return (
    <div className={`beat-card swipe-card ${swipeDirection === 'left' ? 'swipe-left' : ''} ${swipeDirection === 'right' ? 'swipe-right' : ''} ${isAiRecommended ? 'ai-card' : ''}`}>
      {isAiRecommended && (
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full bg-ai animate-pulse" />
          <span className="text-sm font-medium text-ai">AI Recommended</span>
        </div>
      )}

      {/* User Info */}
      <div className="flex items-center gap-3 mb-4">
        <img 
          src={beat.avatar} 
          alt={beat.artist}
          className="w-10 h-10 rounded-full object-cover border-2 border-primary/20"
        />
        <div>
          <h3 className="font-semibold text-foreground">{beat.artist}</h3>
          <p className="text-sm text-muted-foreground">2 hours ago</p>
        </div>
      </div>

      {/* Cover Art & Play Controls */}
      <div className="relative mb-4 group">
        <img 
          src={beat.coverArt} 
          alt={beat.title}
          className="w-full h-48 object-cover rounded-xl"
        />
        
        {/* Play Overlay */}
        <div className="absolute inset-0 bg-black/50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <Button
            size="lg"
            onClick={handlePlay}
            className="btn-gradient rounded-full w-16 h-16"
          >
            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
          </Button>
        </div>

        {/* Waveform Animation (when playing) */}
        {isPlaying && (
          <div className="absolute bottom-4 left-4 right-4 flex items-center gap-1 bg-black/70 rounded-lg p-2">
            {[...Array(20)].map((_, i) => (
              <div 
                key={i}
                className="waveform-bar w-1"
                style={{ animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>
        )}

        {/* Duration */}
        <div className="absolute top-3 right-3 bg-black/70 text-white text-xs px-2 py-1 rounded">
          {beat.duration}
        </div>
      </div>

      {/* Beat Info */}
      <div className="space-y-3">
        <div>
          <h2 className="text-xl font-bold text-foreground mb-1">{beat.title}</h2>
          <p className="text-muted-foreground">{beat.description}</p>
        </div>

        {/* Tags & BPM */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30">
            {beat.bpm} BPM
          </Badge>
          <Badge variant="secondary" className="bg-accent/20 text-accent border-accent/30">
            {beat.key}
          </Badge>
          {beat.mood.map((mood) => (
            <Badge key={mood} variant="outline" className="border-muted-foreground/30">
              {mood}
            </Badge>
          ))}
          {beat.price && (
            <Badge className="bg-success/20 text-success border-success/30">
              <DollarSign className="w-3 h-3 mr-1" />
              {beat.price}
            </Badge>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onLike}
              className={`flex items-center gap-2 ${beat.isLiked ? 'text-red-500' : 'text-muted-foreground'}`}
            >
              <Heart className={`w-4 h-4 ${beat.isLiked ? 'fill-current' : ''}`} />
              {beat.likes}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onComment}
              className="flex items-center gap-2 text-muted-foreground"
            >
              <MessageCircle className="w-4 h-4" />
              {beat.comments}
            </Button>
            
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              <Copy className="w-4 h-4" />
            </Button>
          </div>

          {/* Swipe Controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSwipe('left')}
              className="text-destructive border-destructive/30 hover:bg-destructive/10"
            >
              <ChevronLeft className="w-4 h-4" />
              Pass
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSwipe('right')}
              className="text-success border-success/30 hover:bg-success/10"
            >
              <ChevronRight className="w-4 h-4" />
              Like
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};