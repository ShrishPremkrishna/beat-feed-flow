import { useState, useEffect, useRef } from 'react';
import { Bell, X, MessageCircle, Heart, MessageSquare, UserPlus, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InitialsAvatar } from '@/components/ui/initials-avatar';
import { supabase } from '@/integrations/supabase/client';
// Define notification interface since types may not be updated yet
interface Notification {
  id: string;
  recipient_id: string;
  actor_id: string | null;
  type: string;
  title: string;
  content: string | null;
  post_id: string | null;
  comment_id: string | null;
  message_id: string | null;
  action_url: string | null;
  metadata: any;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  updated_at: string;
}

interface NotificationWithProfile extends Notification {
  actor_profile?: {
    display_name: string | null;
    username: string;
    avatar_url: string | null;
  } | null;
}

interface NotificationsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: string;
  onNotificationClick?: (notification: Notification) => void;
}

export const NotificationsPopup = ({ 
  isOpen, 
  onClose, 
  currentUserId,
  onNotificationClick 
}: NotificationsPopupProps) => {
  const [notifications, setNotifications] = useState<NotificationWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const popupRef = useRef<HTMLDivElement>(null);

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  // Load notifications
  useEffect(() => {
    if (isOpen && currentUserId) {
      loadNotifications();
    }
  }, [isOpen, currentUserId]);

  const loadNotifications = async () => {
    if (!currentUserId) return;

    try {
      setLoading(true);
      
      console.log('Loading notifications for user:', currentUserId);
      
      // Get notifications first
      const { data: notificationsData, error: notificationsError } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', currentUserId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (notificationsError) {
        console.error('Notifications query error:', notificationsError);
        throw notificationsError;
      }

      console.log('Notifications data:', notificationsData);

      if (!notificationsData || notificationsData.length === 0) {
        setNotifications([]);
        return;
      }

      // Extract unique actor IDs
      const actorIds = notificationsData
        .map(n => n.actor_id)
        .filter(id => id !== null) as string[];

      if (actorIds.length === 0) {
        setNotifications(notificationsData as any);
        return;
      }

      // Fetch profiles for all actors
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, display_name, username, avatar_url')
        .in('user_id', actorIds);

      if (profilesError) {
        console.error('Profiles query error:', profilesError);
        // Fall back to notifications without profiles
        setNotifications(notificationsData as any);
        return;
      }

      console.log('Profiles data:', profilesData);

      // Create a map of user_id to profile
      const profilesMap = new Map(
        profilesData.map(profile => [profile.user_id, profile])
      );

      // Combine notifications with profiles
      const notificationsWithProfiles = notificationsData.map(notification => {
        const actorProfile = notification.actor_id ? profilesMap.get(notification.actor_id) : null;
        console.log(`Notification ${notification.id}:`, {
          actor_id: notification.actor_id,
          actor_profile: actorProfile,
          avatar_url: actorProfile?.avatar_url,
          profilesMap_keys: Array.from(profilesMap.keys())
        });
        return {
          ...notification,
          actor_profile: actorProfile
        };
      });

      console.log('Notifications with profiles:', notificationsWithProfiles);
      setNotifications(notificationsWithProfiles as any);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase.rpc('mark_notification_read', {
        notification_id: notificationId
      });

      if (error) throw error;

      // Update local state
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId 
            ? { ...n, is_read: true, read_at: new Date().toISOString() }
            : n
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase.rpc('mark_all_notifications_read');

      if (error) throw error;

      // Update local state
      setNotifications(prev => 
        prev.map(n => ({ 
          ...n, 
          is_read: true, 
          read_at: new Date().toISOString() 
        }))
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    onNotificationClick?.(notification);
    onClose();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'message':
        return <MessageCircle className="w-4 h-4 text-blue-500" />;
      case 'like':
        return <Heart className="w-4 h-4 text-red-500" />;
      case 'reply':
        return <MessageSquare className="w-4 h-4 text-green-500" />;
      case 'follow':
        return <UserPlus className="w-4 h-4 text-purple-500" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end pt-16 pr-4">
      <div 
        ref={popupRef}
        className="bg-background border border-border rounded-lg shadow-xl w-80 max-h-96 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-semibold text-lg">Notifications</h3>
          <div className="flex items-center gap-2">
            {notifications.some(n => !n.is_read) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="text-xs"
              >
                <Check className="w-3 h-3 mr-1" />
                Mark all read
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="p-1"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="max-h-80 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-muted-foreground">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No notifications yet</p>
              <p className="text-sm">You'll see updates here when they happen</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-3 border-b border-border last:border-b-0 cursor-pointer transition-colors hover:bg-muted/50 ${
                  !notification.is_read ? 'bg-primary/5' : ''
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start gap-3">
                  {/* Actor Avatar */}
                  <div className="flex-shrink-0">
                    {notification.actor_profile ? (
                      <InitialsAvatar
                        name={notification.actor_profile.display_name || notification.actor_profile.username || 'User'}
                        avatarUrl={notification.actor_profile.avatar_url}
                        size="sm"
                      />
                    ) : (
                      <InitialsAvatar
                        name="User"
                        avatarUrl={null}
                        size="sm"
                      />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground mb-1">
                          {notification.title}
                        </p>
                        {notification.content && (
                          <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                            {notification.content}
                          </p>
                        )}
                        <div className="flex items-center gap-2">
                          {getNotificationIcon(notification.type)}
                          <span className="text-xs text-muted-foreground">
                            {formatTimeAgo(notification.created_at)}
                          </span>
                        </div>
                      </div>
                      
                      {/* Unread indicator */}
                      {!notification.is_read && (
                        <div className="flex-shrink-0 w-2 h-2 bg-primary rounded-full mt-1" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};