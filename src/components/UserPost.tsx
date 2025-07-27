import { useState } from 'react';
import { Heart, MessageCircle, Share, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PostComposer } from './PostComposer';

interface UserPostProps {
  post: {
    id: string;
    content: string;
    author: {
      name: string;
      avatar: string;
    };
    timestamp: string;
    likes: number;
    comments: number;
    isLiked?: boolean;
  };
  onLike?: () => void;
  onComment?: () => void;
  onShare?: () => void;
}

export const UserPost = ({ post, onLike, onComment, onShare }: UserPostProps) => {
  const [showReplyComposer, setShowReplyComposer] = useState(false);
  const [replies, setReplies] = useState<any[]>([]);

  const handleReply = (reply: any) => {
    setReplies(prev => [...prev, reply]);
    setShowReplyComposer(false);
  };

  return (
    <div className="beat-card space-y-4">
      {/* Post Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <img 
            src={post.author?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face'} 
            alt={post.author?.name || 'User'}
            className="w-12 h-12 rounded-full object-cover border-2 border-primary/20"
          />
          <div>
            <h3 className="font-semibold text-foreground">{post.author?.name || 'Anonymous User'}</h3>
            <p className="text-sm text-muted-foreground">{post.timestamp}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm">
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </div>

      {/* Post Content */}
      <div className="text-foreground leading-relaxed">
        {post.content}
      </div>

      {/* Post Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <div className="flex items-center gap-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={onLike}
            className={`flex items-center gap-2 ${post.isLiked ? 'text-red-500' : 'text-muted-foreground'}`}
          >
            <Heart className={`w-4 h-4 ${post.isLiked ? 'fill-current' : ''}`} />
            {post.likes}
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowReplyComposer(!showReplyComposer)}
            className="flex items-center gap-2 text-muted-foreground"
          >
            <MessageCircle className="w-4 h-4" />
            {post.comments + replies.length}
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onShare}
            className="flex items-center gap-2 text-muted-foreground"
          >
            <Share className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Reply Composer */}
      {showReplyComposer && (
        <div className="border-t border-border pt-4">
          <PostComposer 
            onPost={handleReply}
            placeholder="Reply with a beat or comment..."
            isReply={true}
          />
        </div>
      )}

      {/* Replies */}
      {replies.length > 0 && (
        <div className="space-y-4 border-t border-border pt-4">
          {replies.map((reply, index) => (
            <div key={index} className="flex gap-3">
              <img 
                src={reply.author?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face'} 
                alt={reply.author?.name || 'User'}
                className="w-8 h-8 rounded-full object-cover border border-primary/20"
              />
              <div className="flex-1 bg-muted rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{reply.author?.name || 'Anonymous User'}</span>
                  <span className="text-xs text-muted-foreground">just now</span>
                </div>
                <p className="text-sm">{reply.content}</p>
                {reply.beat && (
                  <div className="mt-2 p-2 bg-background rounded border border-border">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-primary/20 rounded flex items-center justify-center">
                        🎵
                      </div>
                      <div>
                        <p className="text-sm font-medium">{reply.beat.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {reply.beat.bpm} BPM • {reply.beat.key}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};