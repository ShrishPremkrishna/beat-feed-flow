-- Create notifications table
CREATE TABLE notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    
    -- Who receives the notification
    recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Who triggered the notification (can be null for system notifications)
    actor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Notification type
    type TEXT NOT NULL CHECK (type IN ('message', 'like', 'reply', 'follow', 'system')),
    
    -- Notification title and content
    title TEXT NOT NULL,
    content TEXT,
    
    -- Related entity IDs (nullable, depends on notification type)
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    
    -- Read status
    is_read BOOLEAN DEFAULT false NOT NULL,
    read_at TIMESTAMPTZ,
    
    -- Action URL (where to go when clicked)
    action_url TEXT,
    
    -- Metadata for additional info (JSON)
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for better performance
CREATE INDEX idx_notifications_recipient ON notifications(recipient_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(recipient_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_type ON notifications(type);

-- Enable RLS (Row Level Security)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (
        auth.uid() = recipient_id
    );

CREATE POLICY "Users can update their own notifications" ON notifications
    FOR UPDATE USING (
        auth.uid() = recipient_id
    );

CREATE POLICY "System can create notifications" ON notifications
    FOR INSERT WITH CHECK (true);

-- Function to create a notification (FIXED parameter defaults)
CREATE OR REPLACE FUNCTION create_notification(
    recipient_user_id UUID,
    notification_type TEXT,
    notification_title TEXT,
    actor_user_id UUID DEFAULT NULL,
    notification_content TEXT DEFAULT NULL,
    related_post_id UUID DEFAULT NULL,
    related_comment_id UUID DEFAULT NULL,
    related_message_id UUID DEFAULT NULL,
    notification_action_url TEXT DEFAULT NULL,
    notification_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    -- Don't create notification if recipient is the same as actor
    IF recipient_user_id = actor_user_id THEN
        RETURN NULL;
    END IF;
    
    INSERT INTO notifications (
        recipient_id,
        actor_id,
        type,
        title,
        content,
        post_id,
        comment_id,
        message_id,
        action_url,
        metadata
    ) VALUES (
        recipient_user_id,
        actor_user_id,
        notification_type,
        notification_title,
        notification_content,
        related_post_id,
        related_comment_id,
        related_message_id,
        notification_action_url,
        notification_metadata
    )
    RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(notification_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE notifications 
    SET is_read = true, read_at = now()
    WHERE id = notification_id AND recipient_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all notifications as read for a user
CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS VOID AS $$
BEGIN
    UPDATE notifications 
    SET is_read = true, read_at = now()
    WHERE recipient_id = auth.uid() AND is_read = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function for new message notifications
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
DECLARE
    recipient_user_id UUID;
    sender_profile RECORD;
BEGIN
    -- Get the recipient (the other user in the conversation)
    SELECT CASE 
        WHEN user1_id = NEW.sender_id THEN user2_id 
        ELSE user1_id 
    END INTO recipient_user_id
    FROM conversations 
    WHERE id = NEW.conversation_id;
    
    -- Get sender profile for notification content
    SELECT display_name, username INTO sender_profile
    FROM profiles 
    WHERE user_id = NEW.sender_id;
    
    -- Create notification
    PERFORM create_notification(
        recipient_user_id,
        'message',
        COALESCE(sender_profile.display_name, sender_profile.username, 'Someone') || ' sent you a message',
        NEW.sender_id,
        LEFT(NEW.content, 100) || CASE WHEN LENGTH(NEW.content) > 100 THEN '...' ELSE '' END,
        NULL,
        NULL,
        NEW.id,
        '/messages',
        jsonb_build_object('conversation_id', NEW.conversation_id)
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for new messages
CREATE TRIGGER trigger_notify_new_message
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_message();

-- Trigger function for post likes
CREATE OR REPLACE FUNCTION notify_post_like()
RETURNS TRIGGER AS $$
DECLARE
    post_owner_id UUID;
    liker_profile RECORD;
    post_content TEXT;
BEGIN
    -- Get post owner and content
    SELECT user_id, LEFT(content, 50) INTO post_owner_id, post_content
    FROM posts 
    WHERE id = NEW.post_id;
    
    -- Get liker profile
    SELECT display_name, username INTO liker_profile
    FROM profiles 
    WHERE user_id = NEW.user_id;
    
    -- Create notification
    PERFORM create_notification(
        post_owner_id,
        'like',
        COALESCE(liker_profile.display_name, liker_profile.username, 'Someone') || ' liked your post',
        NEW.user_id,
        '"' || post_content || CASE WHEN LENGTH(post_content) = 50 THEN '...' ELSE '' END || '"',
        NEW.post_id,
        NULL,
        NULL,
        '/post/' || NEW.post_id,
        '{}'::jsonb
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for post likes
CREATE TRIGGER trigger_notify_post_like
    AFTER INSERT ON likes
    FOR EACH ROW
    WHEN (NEW.post_id IS NOT NULL)
    EXECUTE FUNCTION notify_post_like();

-- Trigger function for comment likes
CREATE OR REPLACE FUNCTION notify_comment_like()
RETURNS TRIGGER AS $$
DECLARE
    comment_owner_id UUID;
    liker_profile RECORD;
    comment_content TEXT;
BEGIN
    -- Get comment owner and content
    SELECT user_id, LEFT(content, 50) INTO comment_owner_id, comment_content
    FROM comments 
    WHERE id = NEW.comment_id;
    
    -- Get liker profile
    SELECT display_name, username INTO liker_profile
    FROM profiles 
    WHERE user_id = NEW.user_id;
    
    -- Create notification
    PERFORM create_notification(
        comment_owner_id,
        'like',
        COALESCE(liker_profile.display_name, liker_profile.username, 'Someone') || ' liked your reply',
        NEW.user_id,
        '"' || comment_content || CASE WHEN LENGTH(comment_content) = 50 THEN '...' ELSE '' END || '"',
        NULL,
        NEW.comment_id,
        NULL,
        '/post/' || (SELECT post_id FROM comments WHERE id = NEW.comment_id),
        '{}'::jsonb
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for comment likes
CREATE TRIGGER trigger_notify_comment_like
    AFTER INSERT ON likes
    FOR EACH ROW
    WHEN (NEW.comment_id IS NOT NULL)
    EXECUTE FUNCTION notify_comment_like();

-- Trigger function for new replies
CREATE OR REPLACE FUNCTION notify_new_reply()
RETURNS TRIGGER AS $$
DECLARE
    post_owner_id UUID;
    replier_profile RECORD;
    post_content TEXT;
BEGIN
    -- Get post owner and content
    SELECT user_id, LEFT(content, 50) INTO post_owner_id, post_content
    FROM posts 
    WHERE id = NEW.post_id;
    
    -- Get replier profile
    SELECT display_name, username INTO replier_profile
    FROM profiles 
    WHERE user_id = NEW.user_id;
    
    -- Create notification
    PERFORM create_notification(
        post_owner_id,
        'reply',
        COALESCE(replier_profile.display_name, replier_profile.username, 'Someone') || ' replied to your post',
        NEW.user_id,
        CASE 
            WHEN NEW.content IS NOT NULL THEN LEFT(NEW.content, 100) || CASE WHEN LENGTH(NEW.content) > 100 THEN '...' ELSE '' END
            WHEN NEW.beat_id IS NOT NULL THEN 'Replied with a beat'
            ELSE 'Replied to your post'
        END,
        NEW.post_id,
        NEW.id,
        NULL,
        '/post/' || NEW.post_id,
        '{}'::jsonb
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for new replies
CREATE TRIGGER trigger_notify_new_reply
    AFTER INSERT ON comments
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_reply();

-- Trigger function for new follows
CREATE OR REPLACE FUNCTION notify_new_follow()
RETURNS TRIGGER AS $$
DECLARE
    follower_profile RECORD;
BEGIN
    -- Get follower profile
    SELECT display_name, username INTO follower_profile
    FROM profiles 
    WHERE user_id = NEW.follower_id;
    
    -- Create notification
    PERFORM create_notification(
        NEW.following_id,
        'follow',
        COALESCE(follower_profile.display_name, follower_profile.username, 'Someone') || ' started following you',
        NEW.follower_id,
        'Check out their profile and beats!',
        NULL,
        NULL,
        NULL,
        '/profile/' || NEW.follower_id,
        '{}'::jsonb
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for new follows
CREATE TRIGGER trigger_notify_new_follow
    AFTER INSERT ON follows
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_follow();