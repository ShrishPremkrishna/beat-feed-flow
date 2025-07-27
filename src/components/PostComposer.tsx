import { useState } from 'react';
import { Upload, Music, X, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface PostComposerProps {
  onPost: (post: any) => void;
  placeholder?: string;
  isReply?: boolean;
}

export const PostComposer = ({ onPost, placeholder = "What's on your mind? Share a beat or ask for collaboration...", isReply = false }: PostComposerProps) => {
  const [content, setContent] = useState('');
  const [beatFile, setBeatFile] = useState<File | null>(null);
  const [coverArt, setCoverArt] = useState<File | null>(null);
  const [beatMetadata, setBeatMetadata] = useState({
    title: '',
    bpm: '',
    key: '',
    mood: '',
    price: ''
  });
  const [showBeatUpload, setShowBeatUpload] = useState(false);

  const handleFileUpload = (file: File, type: 'beat' | 'cover') => {
    if (type === 'beat') {
      setBeatFile(file);
      setShowBeatUpload(true);
    } else {
      setCoverArt(file);
    }
  };

  const handlePost = () => {
    const post = {
      id: Date.now().toString(),
      content,
      beat: beatFile ? {
        file: beatFile,
        coverArt,
        ...beatMetadata,
        mood: beatMetadata.mood.split(',').map(m => m.trim()).filter(Boolean)
      } : null,
      timestamp: 'just now',
      author: {
        name: "Current User",
        avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face"
      }
    };

    onPost(post);
    
    // Reset form
    setContent('');
    setBeatFile(null);
    setCoverArt(null);
    setBeatMetadata({ title: '', bpm: '', key: '', mood: '', price: '' });
    setShowBeatUpload(false);
  };

  return (
    <div className="beat-card space-y-4">
      <div className="flex items-start gap-3">
        <img 
          src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face"
          alt="Your avatar"
          className="w-10 h-10 rounded-full object-cover border-2 border-primary/20"
        />
        <div className="flex-1">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={placeholder}
            className="min-h-[100px] bg-background border-border resize-none"
          />
        </div>
      </div>

      {/* Beat Upload Section */}
      {showBeatUpload && beatFile && (
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
          <input
            type="file"
            accept="audio/*"
            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'beat')}
            className="hidden"
            id="beat-upload"
          />
          <label htmlFor="beat-upload">
            <Button variant="ghost" size="sm" className="cursor-pointer">
              <Upload className="w-4 h-4 mr-2" />
              Beat
            </Button>
          </label>

          <input
            type="file"
            accept="image/*"
            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'cover')}
            className="hidden"
            id="cover-upload"
          />
          <label htmlFor="cover-upload">
            <Button variant="ghost" size="sm" className="cursor-pointer">
              <ImageIcon className="w-4 h-4 mr-2" />
              Cover
            </Button>
          </label>

          {coverArt && (
            <Badge variant="secondary" className="bg-success/20 text-success">
              Cover uploaded
            </Badge>
          )}
        </div>

        <Button
          onClick={handlePost}
          disabled={!content.trim() && !beatFile}
          className="btn-gradient"
        >
          {isReply ? 'Reply' : 'Post'}
        </Button>
      </div>
    </div>
  );
};