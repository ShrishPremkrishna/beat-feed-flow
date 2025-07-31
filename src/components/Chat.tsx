import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Send, MoreVertical, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InitialsAvatar } from '@/components/ui/initials-avatar';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ChatProps {
  onBack?: () => void;
  initialConversationId?: string;
  initialUserId?: string; // User to start a new conversation with
}

interface Conversation {
  id: string;
  user1_id: string;
  user2_id: string;
  last_message: string | null;
  last_message_at: string | null;
  last_message_by: string | null;
  other_user: {
    user_id: string;
    display_name: string | null;
    username: string;
    avatar_url: string | null;
  };
  unread_count: number;
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  is_read: boolean;
}

export const Chat = ({ onBack, initialConversationId, initialUserId }: ChatProps) => {
  console.log('Chat component initialized with:', { initialConversationId, initialUserId });
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadConversations();
    }
  }, [currentUser]);

  useEffect(() => {
    // Handle initial conversation or user
    if (currentUser) {
      if (initialConversationId) {
        const conversation = conversations.find(c => c.id === initialConversationId);
        if (conversation) {
          setSelectedConversation(conversation);
          loadMessages(conversation.id);
        }
      } else if (initialUserId) {
        console.log('Initial user ID provided:', initialUserId);
        console.log('Current conversations:', conversations);
        
        // Check if conversation exists with this user
        const existingConversation = conversations.find(c => 
          c.other_user.user_id === initialUserId
        );
        
        if (existingConversation) {
          console.log('Found existing conversation, selecting it');
          setSelectedConversation(existingConversation);
          loadMessages(existingConversation.id);
        } else {
          console.log('No existing conversation found, creating new one');
          // Create new conversation immediately
          startNewConversation(initialUserId);
        }
      }
    }
  }, [currentUser, initialConversationId, initialUserId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  };

  const loadConversations = async () => {
    try {
      setLoading(true);
      
      console.log('Loading conversations for user:', currentUser?.id);
      
      // Get conversations where current user is a participant
      const { data: conversationsData, error } = await supabase
        .from('conversations')
        .select(`
          id,
          user1_id,
          user2_id,
          last_message,
          last_message_at,
          last_message_by,
          updated_at
        `)
        .or(`user1_id.eq.${currentUser.id},user2_id.eq.${currentUser.id}`)
        .order('updated_at', { ascending: false });
      
      console.log('Conversations query result:', { conversationsData, error });

      if (error) {
        // Handle the case where tables don't exist yet
        if (error.code === '42P01' || error.message.includes('relation') || error.message.includes('does not exist')) {
          console.error('Chat tables do not exist yet. Please run the database migration:', error);
          toast({
            title: "Chat Setup Required",
            description: "Chat tables need to be created in the database. Please check the console for migration instructions.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
        throw error;
      }

      if (!conversationsData) {
        setConversations([]);
        setLoading(false);
        return;
      }

      if (conversationsData.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      // Get other users' profiles
      const otherUserIds = conversationsData.map(conv => 
        conv.user1_id === currentUser.id ? conv.user2_id : conv.user1_id
      );

      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, display_name, username, avatar_url')
        .in('user_id', otherUserIds);

      // Get unread message counts
      const conversationIds = conversationsData.map(c => c.id);
      const { data: unreadCounts } = await supabase
        .from('messages')
        .select('conversation_id')
        .in('conversation_id', conversationIds)
        .eq('is_read', false)
        .neq('sender_id', currentUser.id);

      // Count unread messages per conversation
      const unreadCountMap: { [key: string]: number } = {};
      unreadCounts?.forEach(msg => {
        unreadCountMap[msg.conversation_id] = (unreadCountMap[msg.conversation_id] || 0) + 1;
      });

      // Combine conversations with user profiles
      const conversationsWithProfiles = conversationsData.map(conv => {
        const otherUserId = conv.user1_id === currentUser.id ? conv.user2_id : conv.user1_id;
        const otherUser = profilesData?.find(p => p.user_id === otherUserId);
        
        return {
          ...conv,
          other_user: otherUser || {
            user_id: otherUserId,
            display_name: null,
            username: 'Unknown User',
            avatar_url: null
          },
          unread_count: unreadCountMap[conv.id] || 0
        };
      });

      setConversations(conversationsWithProfiles);
    } catch (error) {
      console.error('Error loading conversations:', error);
      console.error('Current user:', currentUser);
      toast({
        title: "Error",
        description: `Failed to load conversations: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const { data: messagesData, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setMessages(messagesData || []);

      // Mark messages as read
      await markMessagesAsRead(conversationId);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const markMessagesAsRead = async (conversationId: string) => {
    try {
      await supabase
        .from('messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('is_read', false)
        .neq('sender_id', currentUser.id);

      // Update local conversation unread count
      setConversations(prev => 
        prev.map(conv => 
          conv.id === conversationId 
            ? { ...conv, unread_count: 0 }
            : conv
        )
      );
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const startNewConversation = async (otherUserId: string) => {
    try {
      console.log('Starting new conversation with user:', otherUserId);
      
      // First check if a conversation already exists
      const { data: existingConversations } = await supabase
        .from('conversations')
        .select('id, user1_id, user2_id')
        .or(`and(user1_id.eq.${currentUser.id},user2_id.eq.${otherUserId}),and(user1_id.eq.${otherUserId},user2_id.eq.${currentUser.id})`);

      if (existingConversations && existingConversations.length > 0) {
        // Conversation exists, load it
        const existingConv = existingConversations[0];
        console.log('Found existing conversation:', existingConv.id);
        
        // Get the other user's profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('user_id, display_name, username, avatar_url')
          .eq('user_id', otherUserId)
          .single();

        if (profileData) {
          const conversation: Conversation = {
            id: existingConv.id,
            user1_id: existingConv.user1_id,
            user2_id: existingConv.user2_id,
            last_message: null,
            last_message_at: null,
            last_message_by: null,
            other_user: profileData,
            unread_count: 0
          };

          setSelectedConversation(conversation);
          loadMessages(existingConv.id);
          return;
        }
      }

      // Get other user's profile for new conversation
      const { data: profileData } = await supabase
        .from('profiles')
        .select('user_id, display_name, username, avatar_url')
        .eq('user_id', otherUserId)
        .single();

      if (!profileData) {
        toast({
          title: "Error",
          description: "User not found.",
          variant: "destructive",
        });
        return;
      }

      console.log('Creating new conversation with profile:', profileData);

      // Create a temporary conversation object for the UI
      const tempConversation: Conversation = {
        id: 'new',
        user1_id: currentUser.id,
        user2_id: otherUserId,
        last_message: null,
        last_message_at: null,
        last_message_by: null,
        other_user: profileData,
        unread_count: 0
      };

      setSelectedConversation(tempConversation);
      setMessages([]);
      
      console.log('Set selected conversation:', tempConversation);
    } catch (error) {
      console.error('Error starting new conversation:', error);
      toast({
        title: "Error",
        description: "Failed to start conversation. Please try again.",
        variant: "destructive",
      });
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || sendingMessage) return;

    try {
      setSendingMessage(true);
      let conversationId = selectedConversation.id;

      // If this is a new conversation, create it first
      if (conversationId === 'new') {
        // Check if conversation already exists
        const { data: existingConversation } = await supabase
          .from('conversations')
          .select('id')
          .or(`and(user1_id.eq.${currentUser.id},user2_id.eq.${selectedConversation.other_user.user_id}),and(user1_id.eq.${selectedConversation.other_user.user_id},user2_id.eq.${currentUser.id})`)
          .single();

        if (existingConversation) {
          conversationId = existingConversation.id;
        } else {
          // Create new conversation
          const { data: newConversation, error: convError } = await supabase
            .from('conversations')
            .insert({
              user1_id: currentUser.id,
              user2_id: selectedConversation.other_user.user_id
            })
            .select()
            .single();

          if (convError) throw convError;
          conversationId = newConversation.id;
        }

        // Update selected conversation with real ID
        setSelectedConversation(prev => prev ? { ...prev, id: conversationId } : null);
      }

      // Send the message
      const { data: messageData, error: msgError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: currentUser.id,
          content: newMessage.trim()
        })
        .select()
        .single();

      if (msgError) throw msgError;

      // Add message to local state
      setMessages(prev => [...prev, messageData]);
      setNewMessage('');

      // Reload conversations to update last message
      loadConversations();
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSendingMessage(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const filteredConversations = conversations.filter(conv =>
    conv.other_user.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.other_user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="text-muted-foreground">Loading chats...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-background">
      {/* Conversations List */}
      <div className={`w-full md:w-1/3 border-r border-border flex flex-col ${selectedConversation ? 'hidden md:flex' : 'flex'}`}>
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3 mb-4">
            {onBack && (
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <h2 className="text-xl font-semibold">Messages</h2>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              {searchQuery ? 'No conversations found' : 'No conversations yet'}
            </div>
          ) : (
            filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`p-4 hover:bg-muted cursor-pointer border-b border-border/50 ${
                  selectedConversation?.id === conversation.id ? 'bg-muted' : ''
                }`}
                onClick={() => {
                  setSelectedConversation(conversation);
                  loadMessages(conversation.id);
                }}
              >
                <div className="flex items-center gap-3">
                  <InitialsAvatar
                    name={conversation.other_user.display_name || conversation.other_user.username}
                    avatarUrl={conversation.other_user.avatar_url}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-medium truncate">
                        {conversation.other_user.display_name || conversation.other_user.username}
                      </h3>
                      <div className="flex items-center gap-2">
                        {conversation.last_message_at && (
                          <span className="text-xs text-muted-foreground">
                            {new Date(conversation.last_message_at).toLocaleDateString()}
                          </span>
                        )}
                        {conversation.unread_count > 0 && (
                          <div className="bg-primary text-primary-foreground text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                            {conversation.unread_count}
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {conversation.last_message || 'Start a conversation...'}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      {selectedConversation ? (
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="p-4 border-b border-border flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={() => setSelectedConversation(null)}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <InitialsAvatar
              name={selectedConversation.other_user.display_name || selectedConversation.other_user.username}
              avatarUrl={selectedConversation.other_user.avatar_url}
              size="md"
            />
            <div className="flex-1">
              <h3 className="font-medium">
                {selectedConversation.other_user.display_name || selectedConversation.other_user.username}
              </h3>
              <p className="text-sm text-muted-foreground">
                @{selectedConversation.other_user.username}
              </p>
            </div>
            <Button variant="ghost" size="sm">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender_id === currentUser.id ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.sender_id === currentUser.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                  <p className={`text-xs mt-1 ${
                    message.sender_id === currentUser.id
                      ? 'text-primary-foreground/70'
                      : 'text-muted-foreground'
                  }`}>
                    {new Date(message.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="p-4 border-t border-border">
            <div className="flex gap-2">
              <Input
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                className="flex-1"
              />
              <Button 
                onClick={sendMessage} 
                disabled={!newMessage.trim() || sendingMessage}
                size="icon"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center text-muted-foreground">
          <div className="text-center">
            <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
            <p className="text-sm">Choose a conversation from the list to start messaging</p>
          </div>
        </div>
      )}
    </div>
  );
};