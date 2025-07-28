import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Heart, X, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BeatPlayer } from './BeatPlayer';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface BeatSwiperProps {
  postId: string;
  onBack: () => void;
}

export const BeatSwiper = ({ postId, onBack }: BeatSwiperProps) => {
  const [beats, setBeats] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadBeats();
    getCurrentUser();
  }, [postId]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
  };

  const loadBeats = async () => {
    try {
      // Load all beat replies for this post
      const { data: comments, error } = await supabase
        .from('comments')
        .select(`
          id,
          user_id,
          content,
          created_at,
          beats (
            id,
            title,
            artist,
            file_url,
            bpm,
            key,
            mood,
            cover_art_url
          )
        `)
        .eq('post_id', postId)
        .not('beat_id', 'is', null);

      if (error) throw error;

      // Filter out comments without beats and transform data
      const beatReplies = comments?.filter(comment => comment.beats).map(comment => ({
        commentId: comment.id,
        userId: comment.user_id,
        content: comment.content,
        createdAt: comment.created_at,
        beat: comment.beats
      })) || [];

      setBeats(beatReplies);
    } catch (error) {
      console.error('Error loading beats:', error);
      toast({
        title: 'Error',
        description: 'Failed to load beats',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReaction = async (reaction: 'like' | 'dislike') => {
    if (!currentUser || beats.length === 0) return;

    const currentBeat = beats[currentIndex];
    if (!currentBeat?.beat?.id) return;

    try {
      // Insert or update the reaction
      const { error } = await supabase
        .from('beat_reactions')
        .upsert({
          user_id: currentUser.id,
          beat_id: currentBeat.beat.id,
          reaction: reaction
        });

      if (error) throw error;

      toast({
        title: reaction === 'like' ? 'Liked!' : 'Disliked',
        description: `You ${reaction}d "${currentBeat.beat.title}"`,
      });

      // Move to next beat
      if (currentIndex < beats.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        // If this was the last beat, go back
        toast({
          title: 'All beats reviewed!',
          description: 'You have reviewed all beats for this post.',
        });
        onBack();
      }
    } catch (error) {
      console.error('Error saving reaction:', error);
      toast({
        title: 'Error',
        description: 'Failed to save reaction',
        variant: 'destructive'
      });
    }
  };

  const navigateBeat = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else if (direction === 'next' && currentIndex < beats.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="beat-card text-center py-12">
          <div className="text-muted-foreground">Loading beats...</div>
        </div>
      </div>
    );
  }

  if (beats.length === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <Button 
          variant="ghost" 
          onClick={onBack}
          className="mb-4 hover:bg-muted"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Post
        </Button>
        <div className="beat-card text-center py-12">
          <div className="text-muted-foreground text-lg mb-2">No beats to review</div>
          <div className="text-muted-foreground text-sm">No one has replied with beats yet.</div>
        </div>
      </div>
    );
  }

  const currentBeat = beats[currentIndex];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button 
          variant="ghost" 
          onClick={onBack}
          className="hover:bg-muted"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Post
        </Button>
        <div className="text-sm text-muted-foreground">
          {currentIndex + 1} of {beats.length}
        </div>
      </div>

      {/* Beat Card */}
      <div className="beat-card space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Review Beats</h2>
          <p className="text-muted-foreground">Swipe through beats submitted for your post</p>
        </div>

        {/* Beat Player */}
        <div className="bg-muted/30 rounded-lg border border-border overflow-hidden">
          <BeatPlayer
            audioUrl={currentBeat.beat.file_url || ''}
            title={currentBeat.beat.title || 'Untitled Beat'}
            artist={currentBeat.beat.artist || 'Anonymous'}
            bpm={currentBeat.beat.bpm || undefined}
            key={currentBeat.beat.key || undefined}
            mood={currentBeat.beat.mood || undefined}
            className="p-6"
          />
        </div>

        {/* Reply Content */}
        {currentBeat.content && (
          <div className="bg-muted/20 rounded-lg p-4">
            <p className="text-foreground">{currentBeat.content}</p>
          </div>
        )}

        {/* Navigation Controls */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => navigateBeat('prev')}
            disabled={currentIndex === 0}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>

          <div className="flex items-center gap-4">
            {/* Dislike Button */}
            <Button
              variant="outline"
              size="lg"
              onClick={() => handleReaction('dislike')}
              className="w-16 h-16 rounded-full border-red-200 hover:bg-red-50 hover:border-red-300 transition-all"
            >
              <X className="w-6 h-6 text-red-500" />
            </Button>

            {/* Like Button */}
            <Button
              variant="outline"
              size="lg"
              onClick={() => handleReaction('like')}
              className="w-16 h-16 rounded-full border-green-200 hover:bg-green-50 hover:border-green-300 transition-all"
            >
              <Heart className="w-6 h-6 text-green-500" />
            </Button>
          </div>

          <Button
            variant="outline"
            onClick={() => navigateBeat('next')}
            disabled={currentIndex === beats.length - 1}
            className="flex items-center gap-2"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};