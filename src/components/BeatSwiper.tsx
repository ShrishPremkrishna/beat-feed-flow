import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Heart, X, ArrowLeft, Download, CheckCircle } from 'lucide-react';
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
  const [postCreator, setPostCreator] = useState<string | null>(null);
  const [reviewedBeats, setReviewedBeats] = useState<Set<string>>(new Set());
  const [allBeatsReviewed, setAllBeatsReviewed] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    getCurrentUser();
  }, [postId]);

  useEffect(() => {
    if (currentUser) {
      loadBeats();
    }
  }, [currentUser, postId]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
  };

  const loadBeats = async () => {
    try {
      // Load the post to get the creator
      const { data: post, error: postError } = await supabase
        .from('posts')
        .select('user_id')
        .eq('id', postId)
        .single();

      if (postError) throw postError;
      setPostCreator(post.user_id);

      // Load reviewed beats for current user
      let reviewedBeatIds = new Set<string>();
      if (currentUser) {
        console.log('Loading reviewed beats for user:', currentUser.id);
        const { data: reactions } = await supabase
          .from('beat_reactions')
          .select('beat_id')
          .eq('user_id', currentUser.id);

        reviewedBeatIds = new Set(reactions?.map(r => r.beat_id) || []);
        console.log('Reviewed beat IDs:', Array.from(reviewedBeatIds));
        setReviewedBeats(reviewedBeatIds);
      } else {
        console.log('No current user, skipping reviewed beats load');
      }

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
            purchase_link,
            cover_art_url
          )
        `)
        .eq('post_id', postId)
        .not('beat_id', 'is', null);

      if (error) throw error;

      // Load profiles for beat creators
      const userIds = comments?.map(comment => comment.user_id) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, username')
        .in('user_id', userIds);

      // Create profile map
      const profileMap = new Map();
      profiles?.forEach(profile => {
        profileMap.set(profile.user_id, profile);
      });

      // Filter out comments without beats and transform data
      const beatReplies = comments?.filter(comment => comment.beats).map(comment => {
        const profile = profileMap.get(comment.user_id);
        return {
          commentId: comment.id,
          userId: comment.user_id,
          content: comment.content,
          createdAt: comment.created_at,
          beat: comment.beats ? {
            ...(comment.beats as any),
            producer_name: profile?.display_name || profile?.username || 'Anonymous'
          } : null
        };
      }) || [];

      // TODO: Load download information when types are updated

      // Filter out reviewed beats and randomize order
      console.log('Total beat replies:', beatReplies.length);
      console.log('Reviewed beats set:', Array.from(reviewedBeatIds));
      const unreviewedBeats = beatReplies.filter(reply => reply.beat && !reviewedBeatIds.has(reply.beat.id));
      console.log('Unreviewed beats:', unreviewedBeats.length);
      
      // Check if all beats have been reviewed
      const allReviewed = unreviewedBeats.length === 0;
      setAllBeatsReviewed(allReviewed);
      
      if (allReviewed) {
        // If all beats are reviewed, don't set any beats to show
        setBeats([]);
        setCurrentIndex(0);
      } else {
        // Randomize the order for unreviewed beats
        const shuffledBeats = unreviewedBeats.sort(() => Math.random() - 0.5);
        setBeats(shuffledBeats);
        setCurrentIndex(0);
      }
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

      // Add this beat to reviewed set
      setReviewedBeats(prev => new Set([...prev, currentBeat.beat.id]));

      // Move to next beat
      if (currentIndex < beats.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        // If this was the last beat, reload to check for completion
        loadBeats();
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

  const handleDownloadBeat = async (fileUrl: string, beatData: any, beatId: string) => {
    try {
      // Fetch the file as a blob
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch file');
      }
      
      const blob = await response.blob();
      
      // Create filename with format: producersname-title_bpm_key
      const producerName = beatData.producer_name || beatData.artist || 'unknown';
      const title = beatData.title || 'untitled';
      const bpm = beatData.bpm || '';
      const key = beatData.key || '';
      const fileName = `${producerName}-${title}_${bpm}_${key}`.replace(/[^a-zA-Z0-9_-]/g, '_');
      
      // Create a blob URL
      const blobUrl = window.URL.createObjectURL(blob);
      
      // Create a temporary link element
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      
      // Append to body, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the blob URL
      window.URL.revokeObjectURL(blobUrl);

      // Record the download in the database
      if (currentUser && beatId) {
        try {
          await (supabase as any)
            .from('downloads')
            .upsert({
              beat_id: beatId,
              downloaded_by: currentUser.id
            });
        } catch (downloadError) {
          console.error('Error recording download:', downloadError);
        }
      }

      // Record the download (in-memory for now)
      const currentBeat = beats[currentIndex];
      if (currentBeat?.beat?.id && currentUser) {
        // Mark this beat as downloaded
        setBeats(prev => prev.map((beat, index) => 
          index === currentIndex 
            ? { ...beat, isDownloaded: true, downloadedBy: currentUser.id }
            : beat
        ));
      }

      toast({
        title: 'Download Started',
        description: 'Your beat is being downloaded.',
      });
    } catch (error) {
      console.error('Error downloading beat:', error);
      toast({
        title: 'Download Failed',
        description: 'Failed to download the beat. Please try again.',
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
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Post
        </Button>
        <div className="beat-card text-center py-12">
          {allBeatsReviewed ? (
            <>
              <div className="text-muted-foreground text-lg mb-2">All beats reviewed!</div>
              <div className="text-muted-foreground text-sm">You have reviewed all beats for this post. Check back later for new beats!</div>
              <Button 
                onClick={onBack}
                className="mt-4 btn-gradient"
              >
                Back to Post
              </Button>
            </>
          ) : (
            <>
              <div className="text-muted-foreground text-lg mb-2">No beats to review</div>
              <div className="text-muted-foreground text-sm">No one has replied with beats yet.</div>
            </>
          )}
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
          className=""
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Post
        </Button>
        <div className="text-sm text-muted-foreground">
          {currentIndex + 1} of {beats.length} remaining
        </div>
      </div>

      {/* Beat Card */}
      <div className="beat-card space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Review Beats</h2>
          <p className="text-muted-foreground">Swipe through beats submitted for your post</p>
        </div>

        {/* Beat Player */}
        <div className="bg-muted/30 rounded-lg border border-border overflow-hidden relative">
          {/* Downloaded indicator - only show to beat creator */}
          {currentUser && currentUser.id === currentBeat.userId && currentBeat.isDownloaded && (
            <div className="absolute top-4 right-4 z-10">
              <div className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium shadow-lg flex items-center gap-1">
                <Download className="w-3 h-3" />
                Downloaded by Artist
              </div>
            </div>
          )}


          <div onClick={(e) => e.stopPropagation()}>
            <BeatPlayer
              audioUrl={currentBeat.beat.file_url || ''}
              title={currentBeat.beat.title || 'Untitled Beat'}
              artist={currentBeat.beat.artist || 'Anonymous'}
              bpm={currentBeat.beat.bpm || undefined}
              beatKey={currentBeat.beat.key || undefined}
              purchaseLink={currentBeat.beat.purchase_link || undefined}
              className="p-6"
            />
          </div>
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
            {/* Download Button - only show for post creator */}
            {currentUser && currentUser.id === postCreator && (
              <Button
                variant="outline"
                size="lg"
                                 onClick={() => handleDownloadBeat(currentBeat.beat.file_url, currentBeat.beat, currentBeat.beat.id)}
                className="w-16 h-16 rounded-full border-blue-200 hover:bg-blue-50 hover:border-blue-300 transition-all"
              >
                <Download className="w-6 h-6 text-blue-500" />
              </Button>
            )}

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