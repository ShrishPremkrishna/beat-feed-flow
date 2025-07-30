import { useState, useEffect } from 'react';
import { Upload, Music, X, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileUploadArea } from '@/components/FileUploadArea';
import { InitialsAvatar } from '@/components/ui/initials-avatar';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PostComposerProps {
  onPost: (post: any) => void;
  placeholder?: string;
  isReply?: boolean;
  parentPostId?: string;
  onSignIn?: () => void;
  onPostDeleted?: () => void;
}

export const PostComposer = ({ onPost, placeholder = "What's on your mind? Share a beat or ask for collaboration...", isReply = false, parentPostId, onSignIn, onPostDeleted }: PostComposerProps) => {
  const [content, setContent] = useState('');
  const [beatFile, setBeatFile] = useState<File | null>(null);
  const [coverArt, setCoverArt] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [beatMetadata, setBeatMetadata] = useState({
    title: '',
    bpm: '',
    key: '',
    purchaseLink: ''
  });
  const [showBeatUpload, setShowBeatUpload] = useState(false);
  const [todaysPostCount, setTodaysPostCount] = useState(0);
  const { toast } = useToast();

  // Load user profile data
  useEffect(() => {
    loadUserProfile();
    if (!isReply) {
      checkDailyPostLimit();
    }
  }, []);

  // Listen for post deletion to reset daily limit
  useEffect(() => {
    // Create a custom event listener for post deletion
    const handlePostDeleted = () => {
      if (!isReply) {
        resetDailyLimit();
      }
    };

    // Listen for a custom event that will be dispatched when a post is deleted
    window.addEventListener('postDeleted', handlePostDeleted);
    
    return () => {
      window.removeEventListener('postDeleted', handlePostDeleted);
    };
  }, [isReply]);

  const loadUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, username, avatar_url')
        .eq('user_id', user.id)
        .single();

      setUserProfile(profile);
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const checkDailyPostLimit = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get today's date in user's timezone (midnight)
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Check if user has posted today
      const { data: todaysPosts, error } = await supabase
        .from('posts')
        .select('id')
        .eq('user_id', user.id)
        .gte('created_at', today.toISOString())
        .lt('created_at', tomorrow.toISOString());

      if (error) {
        console.error('Error checking daily post limit:', error);
        return;
      }

      setTodaysPostCount(todaysPosts ? todaysPosts.length : 0);
    } catch (error) {
      console.error('Error checking daily post limit:', error);
    }
  };

  const resetDailyLimit = () => {
    setTodaysPostCount(prev => Math.max(0, prev - 1));
  };



  const handleFileUpload = (file: File, type: 'beat' | 'cover') => {
    if (type === 'beat') {
      setBeatFile(file);
      setShowBeatUpload(true);
    } else {
      setCoverArt(file);
    }
  };

  const uploadFile = async (file: File, bucket: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file);

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handlePost = async () => {
    if (!content.trim() && !beatFile) return;
    
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        onSignIn?.();
        return;
      }

      // Check daily post limit for regular posts (not replies)
      if (!isReply && todaysPostCount >= 3) {
        toast({
          title: "Daily Post Limit Reached",
          description: "You can only post 3 times per day. This resets at midnight in your timezone.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      if (isReply && parentPostId) {
        // For replies, we must have a beat
        if (!beatFile) {
          toast({
            title: "Beat Required",
            description: "Please upload a beat to reply to this post.",
            variant: "destructive",
          });
          return;
        }

        // Upload beat file and create beat record
        let coverArtUrl = null;
        if (coverArt) {
          coverArtUrl = await uploadFile(coverArt, 'covers');
        }
        const beatFileUrl = await uploadFile(beatFile, 'beats');

        const { data: beat, error: beatError } = await supabase
          .from('beats')
          .insert({
            title: beatMetadata.title || beatFile.name,
            artist: 'Anonymous',
            file_url: beatFileUrl,
            cover_art_url: coverArtUrl,
            bpm: beatMetadata.bpm ? parseInt(beatMetadata.bpm) : null,
            key: beatMetadata.key || null,
            purchase_link: beatMetadata.purchaseLink || null,
            user_id: user.id
          })
          .select()
          .single();

        if (beatError) throw beatError;

        // Create the comment/reply with beat_id
        const { data: comment, error: commentError } = await supabase
          .from('comments')
          .insert({
            content: null, // No text content for beat replies
            user_id: user.id,
            post_id: parentPostId,
            beat_id: beat.id
          })
          .select()
          .single();

        if (commentError) throw commentError;

        // Get user profile for author info
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, username, avatar_url')
          .eq('user_id', user.id)
          .single();

        // Call onPost callback with the created comment
        console.log('Created comment:', comment);
        console.log('User profile:', userProfile);
        onPost({
          ...comment,
          author: {
            name: userProfile?.display_name || userProfile?.username || 'Anonymous User',
            avatar: userProfile?.avatar_url || ''
          },
          timestamp: 'just now'
        });

        toast({
          title: "Reply Posted!",
          description: "Your reply has been added to the conversation.",
        });
      } else {
        // Create post first (original logic)
        const { data: post, error: postError } = await supabase
          .from('posts')
          .insert({
            user_id: user.id,
            content: content.trim()
          })
          .select()
          .single();

        if (postError) throw postError;

        // Handle beat upload if there's a beat file
        let beatData = null;
        if (beatFile) {
          let coverArtUrl = null;
          let beatFileUrl = null;

          // Upload cover art if present
          if (coverArt) {
            coverArtUrl = await uploadFile(coverArt, 'covers');
          }

          // Upload beat file
          beatFileUrl = await uploadFile(beatFile, 'beats');

          // Create beat record
          const { data: beat, error: beatError } = await supabase
            .from('beats')
            .insert({
              user_id: user.id,
              post_id: post.id,
              title: beatMetadata.title || beatFile.name,
              file_url: beatFileUrl,
              cover_art_url: coverArtUrl,
              bpm: beatMetadata.bpm ? parseInt(beatMetadata.bpm) : null,
              key: beatMetadata.key || null,
              purchase_link: beatMetadata.purchaseLink || null
            })
            .select()
            .single();

          if (beatError) throw beatError;
          beatData = beat;
        }

        // Get user profile for author info
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, username, avatar_url')
          .eq('user_id', user.id)
          .single();

        // Call onPost callback with the created post and author info
        onPost({
          ...post,
          author: {
            name: userProfile?.display_name || userProfile?.username || 'Anonymous User',
            avatar: userProfile?.avatar_url || ''
          },
          timestamp: 'just now',
          beat: beatData
        });

        toast({
          title: "Post Created!",
          description: beatFile ? "Your beat has been shared with the community!" : "Your post has been shared!",
        });

        // Update daily limit status immediately after successful post
        if (!isReply) {
          setTodaysPostCount(prev => prev + 1);
        }
      }

      // Reset form
      setContent('');
      setBeatFile(null);
      setCoverArt(null);
      setBeatMetadata({ title: '', bpm: '', key: '', purchaseLink: '' });
      setShowBeatUpload(false);

    } catch (error) {
      console.error('Error creating post/comment:', error);
      console.error('Error details:', {
        isReply,
        parentPostId,
        hasBeatFile: !!beatFile,
        beatMetadata,
        error: error
      });
      toast({
        title: "Error",
        description: `Failed to ${isReply ? 'post reply' : 'create post'}. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="beat-card space-y-4 animate-fade-in"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Daily Limit Message */}
      {!isReply && todaysPostCount > 0 && (
        <div className="bg-muted/50 border border-border rounded-lg p-3 text-center">
          <p className="text-sm text-muted-foreground">
            {todaysPostCount >= 3 
              ? "You've reached your daily limit of 3 posts. You can post again at midnight in your timezone."
              : `You've posted ${todaysPostCount}/3 times today.`
            }
          </p>
        </div>
      )}
      <div className="flex items-start gap-3">
        <div className="relative">
          <InitialsAvatar
            name={userProfile?.display_name || userProfile?.username || 'User'}
            avatarUrl={userProfile?.avatar_url}
            size="md"
            className="shadow-glow"
          />
        </div>
        {!isReply && (
          <div className="flex-1">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={placeholder}
              className="input-enhanced min-h-[120px] resize-none text-base"
            />
          </div>
        )}
        {isReply && (
          <div className="flex-1">
            <FileUploadArea
              onFileSelect={(file) => handleFileUpload(file, 'beat')}
              accept="audio/*"
              maxSize={200}
              currentFile={beatFile}
              onRemoveFile={() => {
                setBeatFile(null);
                setShowBeatUpload(false);
              }}
              isRequired={true}
              title="Upload Beat for Reply"
              description="Drag and drop your beat here or click to browse"
            />
          </div>
        )}
      </div>

      {/* Beat Upload Section - Only for replies */}
      {isReply && showBeatUpload && beatFile && (
        <div className="border border-border rounded-xl p-4 bg-gradient-card space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Music className="w-5 h-5 text-primary" />
              <span className="font-medium">Beat Details</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setBeatFile(null);
                setShowBeatUpload(false);
              }}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="beat-title">Beat Title</Label>
              <Input
                id="beat-title"
                value={beatMetadata.title}
                onChange={(e) => setBeatMetadata(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter beat title"
              />
            </div>

            <div>
              <Label htmlFor="bpm">BPM</Label>
              <Input
                id="bpm"
                type="number"
                value={beatMetadata.bpm}
                onChange={(e) => setBeatMetadata(prev => ({ ...prev, bpm: e.target.value }))}
                placeholder="120"
              />
            </div>

            <div>
              <Label htmlFor="key">Key</Label>
              <Input
                id="key"
                value={beatMetadata.key}
                onChange={(e) => setBeatMetadata(prev => ({ ...prev, key: e.target.value }))}
                placeholder="C Major"
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="purchase-link">Purchase Link (optional)</Label>
              <Input
                id="purchase-link"
                value={beatMetadata.purchaseLink}
                onChange={(e) => setBeatMetadata(prev => ({ ...prev, purchaseLink: e.target.value }))}
                placeholder="https://beatstars.com/your-beat or https://t.me/yourchannel"
              />
            </div>
          </div>

          {/* File Info */}
          <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
            <Music className="w-8 h-8 text-primary" />
            <div>
              <p className="font-medium">{beatFile.name}</p>
              <p className="text-sm text-muted-foreground">
                {(beatFile.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* No upload options for regular posts - only for replies */}
        </div>

        <Button
          onClick={handlePost}
          disabled={isReply ? !beatFile || isLoading : (!content.trim() || isLoading || todaysPostCount >= 3)}
          className="btn-gradient"
        >
          {isLoading ? 'Posting...' : (isReply ? 'Reply with Beat' : todaysPostCount >= 3 ? `Daily Limit Reached (${todaysPostCount}/3)` : `Post (${todaysPostCount}/3)`)}
        </Button>
      </div>


    </div>
  );
};
