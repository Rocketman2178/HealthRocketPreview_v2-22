import { supabase } from '../supabase';
import type { User } from '@supabase/supabase-js';

// Define message interface
export interface CosmoMessage {
  id: string;
  content: string;
  isUser: boolean;
  createdAt: Date;
  sessionId?: string;
  metadata?: Record<string, any>;
}

export class CosmoChatService {
  static async getRecentMessages(userId: string, limit = 10, page = 1): Promise<CosmoMessage[]> {
    try {
      // Calculate offset based on page and limit
      const offset = (page - 1) * limit;
      
      // Get messages
      const { data, error } = await supabase
        .from('cosmo_chat_messages')
        .select('*')
        .eq('user_id', userId) 
        .order('created_at', { ascending: false })
        .limit(limit)
        .range(offset, offset + limit - 1)
        .throwOnError();

      if (error) throw error;

      // If no messages exist and this is the first page, create a welcome message
      if (data?.length === 0 && page === 1) {
        const welcomeMessage = await this.sendMessage(
          userId,
          "Hi! I'm Cosmo, your Health Rocket guide. How can I help you optimize your health journey?",
          false
        );
        
        if (welcomeMessage) {
          return [welcomeMessage];
        }
      }

      // Transform database records to CosmoMessage objects
      const messages = (data || []).map((msg) => ({
        id: msg.id,
        content: msg.content,
        isUser: msg.is_user_message,
        createdAt: new Date(msg.created_at),
        sessionId: msg.session_id, 
        metadata: msg.metadata
      }));
      
      // Sort messages by date (oldest first) for display
      return messages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    } catch (err) {
      console.error('Error loading Cosmo chat messages:', err);
      // Return a default welcome message on error
      return [{
        id: 'welcome',
        content: "Hi! I'm Cosmo, your Health Rocket guide. How can I help you optimize your health journey?", 
        isUser: false,
        createdAt: new Date()
      }];
    }
  }

  static async sendMessage(
    userId: string, 
    content: string, 
    isUserMessage: boolean = true, 
    sessionId?: string,
    metadata?: Record<string, any>
  ): Promise<CosmoMessage | null> {
    try {
      const { data, error } = await supabase
        .from('cosmo_chat_messages')
        .insert({
          user_id: userId,
          content,
          is_user_message: isUserMessage,
          session_id: sessionId,
          metadata
        })
        .select()
        .single();

      if (error) throw error;
      
      return {
        id: data.id,
        content: data.content,
        isUser: data.is_user_message,
        createdAt: new Date(data.created_at),
        sessionId: data.session_id,
        metadata: data.metadata
      };
    } catch (err) {
      console.error('Error sending Cosmo chat message:', err);
      return null;
    }
  }

  static subscribeToMessages(userId: string, onMessage: (message: CosmoMessage) => void) {
    // Create a more specific channel name with the user ID to avoid conflicts
    const channelName = `cosmo_chat_messages_${userId}`;
    
    try {
      // Set up the subscription with proper error handling
      const subscription = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'cosmo_chat_messages',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        console.log(`New Cosmo message received for user ${userId}:`, payload.new?.id);
        
        // Ensure we have all required fields before creating the message object
        if (!payload.new?.id || !payload.new?.created_at) {
          console.error('Received incomplete message payload:', payload);
          return;
        }
        
        const newMessage = {
          id: payload.new.id,
          content: payload.new.content,
          isUser: payload.new.is_user_message,
          createdAt: new Date(payload.new.created_at),
          sessionId: payload.new.session_id,
          metadata: payload.new.metadata
        };
        
        onMessage(newMessage);
      })
      .subscribe();
      
      // Add error handling for the subscription
      subscription.on('error', (error) => {
        console.error(`Error in Cosmo chat subscription for user ${userId}:`, error);
      });
      
      return subscription;
    } catch (err) {
      console.error(`Error setting up Cosmo chat subscription for user ${userId}:`, err);
      throw err;
    }
  }
}