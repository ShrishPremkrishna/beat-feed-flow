import { useState, useEffect } from 'react';
import { Upload, Music, X, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { FileUploadArea } from '@/components/FileUploadArea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PostComposerProps {
  onPost: (post: any) => void;
  placeholder?: string;
  isReply?: boolean;
  parentPostId?: string;
}

export const PostComposer = ({ onPost, placeholder = "What's on your mind? Share a beat or ask for collaboration...", isReply = false, parentPostId }: PostComposerProps) => {
  const [content, setContent] = useState('');
  const [beatFile, setBeatFile] = useState<File | null>(null);
  const [coverArt, setCoverArt] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [beatMetadata, setBeatMetadata] = useState({
    title: '',
    bpm: '',
    key: '',
    mood: '',
    price: ''
  });
  const [showBeatUpload, setShowBeatUpload] = useState(false);
  const { toast } = useToast();

  // Load user profile data
  useEffect(() => {
    loadUserProfile();
  }, []);

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
        toast({
          title: "Authentication Required",
          description: "Please sign in to create posts.",
          variant: "destructive",
        });
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
            mood: beatMetadata.mood ? beatMetadata.mood.split(',').map(m => m.trim()).filter(Boolean) : [],
            price: beatMetadata.price ? parseFloat(beatMetadata.price) : null,
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
              mood: beatMetadata.mood ? beatMetadata.mood.split(',').map(m => m.trim()).filter(Boolean) : [],
              price: beatMetadata.price ? parseFloat(beatMetadata.price) : null
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
      }

      // Reset form
      setContent('');
      setBeatFile(null);
      setCoverArt(null);
      setBeatMetadata({ title: '', bpm: '', key: '', mood: '', price: '' });
      setShowBeatUpload(false);

    } catch (error) {
      console.error('Error creating post/comment:', error);
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
    <div className="beat-card space-y-4 animate-fade-in">
      <div className="flex items-start gap-3">
        <div className="relative">
          {userProfile?.avatar_url ? (
            <img 
              src={userProfile.avatar_url}
              alt="Your avatar"
              className="w-12 h-12 rounded-full object-cover border-2 border-primary/30 shadow-glow"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-muted border-2 border-primary/30 shadow-glow flex items-center justify-center">
              <span className="text-lg font-bold text-muted-foreground">
                {(userProfile?.display_name || userProfile?.username || 'U').charAt(0).toUpperCase()}
              </span>
            </div>
          )}
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

            <div>
              <Label htmlFor="price">Price (optional)</Label>
              <Input
                id="price"
                type="number"
                value={beatMetadata.price}
                onChange={(e) => setBeatMetadata(prev => ({ ...prev, price: e.target.value }))}
                placeholder="50"
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="mood">Mood Tags (comma separated)</Label>
              <Input
                id="mood"
                value={beatMetadata.mood}
                onChange={(e) => setBeatMetadata(prev => ({ ...prev, mood: e.target.value }))}
                placeholder="Dark, Trap, Energetic"
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
          disabled={isReply ? !beatFile || isLoading : (!content.trim() || isLoading)}
          className="btn-gradient"
        >
          {isLoading ? 'Posting...' : (isReply ? 'Reply with Beat' : 'Post')}
        </Button>
      </div>
    </div>
  );
};