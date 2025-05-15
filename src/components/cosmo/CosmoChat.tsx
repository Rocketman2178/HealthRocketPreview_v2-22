import React, { useState, useEffect, useRef } from 'react';
import { Send, Radio, Zap, Trophy, Target, Heart, Info, ChevronRight, ChevronLeft, X, Flame, MessageSquare, Rocket, Brain, Moon, Activity, Apple, Database } from 'lucide-react';
import { format } from 'date-fns';
import { useLevelRecommendations, LevelInfo } from '../../hooks/useLevelRecommendations';
import { usePlayerStats } from '../../hooks/usePlayerStats';
import { SupportForm } from '../profile/SupportForm';
import { useSupabase } from '../../contexts/SupabaseContext';
import { CosmoChatService, CosmoMessage } from '../../lib/cosmo/ChatService';

const helpTopics = [
  {
    id: 'how-to-play',
    icon: <Rocket size={16} />,
    title: 'Game Basics',
    description: 'Learn how to play and earn rewards',
    content: `Your Mission:
• Add 20+ years of healthy life!
• Create your profile and set your health baseline
• Earn Fuel Points through daily healthy actions
• Launch your Health Rocket to level up

Health Categories:
• Mindset
• Sleep
• Exercise
• Nutrition
• Biohacking

Track Progress:
• Track your +HealthSpan and HealthScore progress with monthly updates
• Win prizes and climb the leaderboard`
  },
  {
    id: 'fuel-points',
    icon: <Zap size={16} />,
    title: 'Fuel Points',
    description: 'Learn about FP and leveling up',
    content: `Earn Fuel Points (FP):
• Daily Boosts (1-9 FP each)
• Challenges (50 FP)
• Quests (150 FP)

Level Up System:
• Level 2 requires 20 FP
• Each new level needs 41.4% more FP

Unlock Features:
• New challenges
• Additional quest slots
• Special prizes`
  },
  {
    id: 'boosts',
    icon: <Activity size={16} />,
    title: 'Daily Boosts',
    description: 'Learn about boosts and streaks',
    content: `Daily Actions:
• Complete up to 3 Daily Boosts
• Each boost has a 7-day cooldown

Burn Streak Bonuses:
• 3 days: +5 FP
• 7 days: +10 FP
• 21 days: +100 FP

Pro Features:
• Pro Plan unlocks Tier 2 Boosts
• Maintain streaks to unlock challenges`
  },
  {
    id: 'challenges',
    icon: <Target size={16} />,
    title: 'Challenges & Quests',
    description: 'Learn about long-term goals',
    content: `Challenges:
• 21-day duration
• Earn 50 FP each
• Unlock after 3-day streak
• Chat with other challengers
• Required verification posts

Quests:
• 90-day duration
• Earn 150 FP each
• Complete 2-3 related challenges
• Quest group chat support
• Verification milestones required

Pro Content:
• Pro Plan unlocks Tier 2 content`
  },
  {
    id: 'health',
    icon: <Heart size={16} />,
    title: 'Health Tracking',
    description: 'Learn about health metrics',
    content: `HealthScore Categories:
• Mindset (20%)
• Sleep (20%)
• Exercise (20%)
• Nutrition (20%)
• Biohacking (20%)

Progress Tracking:
• Update score monthly (every 30 days)
• +HealthSpan shows added years of healthy life
• Track progress toward 20+ year goal`
  },
  {
    id: 'prizes',
    icon: <Trophy size={16} />,
    title: 'Prize Pool',
    description: 'Learn about rewards',
    content: `Monthly Status Ranks:
• Commander (All players)
• Hero (Top 50%) - 2X prize chances
• Legend (Top 10%) - 5X prize chances

Prize System:
• Monthly prize pools with draws every 30 days
• Win products from health partners
• Pro Plan required for prizes`
  },
  {
    id: 'burn-streak-challenge',
    icon: <Flame size={16} />,
    title: '45-Day Burn Streak Challenge',
    description: 'Earn equity shares',
    content: `Challenge Requirements:
• Complete a 45-Day Burn Streak
• Earn at least 1 Fuel Point each day for 45 consecutive days
• Must be completed during June 1 to July 30, 2025

Rewards:
• Secure 2,500 equity shares upon completion
• Chance to win up to 100,000 additional shares
• Bonus shares based on longest streaks and most FP earned

Alternative Eligibility:
• Players who don't complete the 45-Day streak
• Still eligible for prizes from Wellness Partners
• Based on total Fuel Points earned during preview period`
  },
  {
    id: 'contests',
    icon: <Trophy size={16} />,
    title: 'Contests',
    description: 'Compete and win rewards',
    content: `Contest Overview:
• Skill-based competitions with other players
• Earn credits, prizes, and Fuel Points
• Track your progress on leaderboards

How Contests Work:
• Register using 1 Contest Credit
• Complete daily verification requirements
• Compete based on objective metrics (e.g., sleep scores)
• Top performers win rewards

Prize Distribution:
• Top 10% share 75% of prize pool (up to 6X return)
• Top 50% get their credit back
• All participants earn Fuel Points

Contest Types:
• Free Entry contests available to all players
• Premium contests require Contest Credits
• Special contests with unique themes and requirements`
  }
];

// Helper function to group messages by date
function groupMessagesByDate(messages: CosmoMessage[]): [string, CosmoMessage[]][] {
  if (!messages || messages.length === 0) return [];
  
  const groups = new Map<string, CosmoMessage[]>();
  
  messages.forEach(message => {
    // Ensure createdAt is a valid date
    const createdAt = message.createdAt instanceof Date ? 
      message.createdAt : 
      new Date(message.createdAt);
    
    const date = createdAt.toISOString().split('T')[0];
    if (!groups.has(date)) {
      groups.set(date, []);
    }
    groups.get(date)?.push(message);
  });
  
  // Get entries sorted by date (newest first)
  const sortedEntries = Array.from(groups.entries())
    .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime());
  
  // For each date group, sort messages chronologically (oldest to newest)
  return sortedEntries.map(([date, msgs]) => [
    date,
    msgs.sort((a, b) => {
      const timeA = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
      const timeB = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime();
      return timeA - timeB;
    })
  ]);
}

// Helper function to format date headers
function formatDateHeader(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'Unknown Date';
    }
    
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (dateString === today.toISOString().split('T')[0]) {
      return 'Today';
    } else if (dateString === yesterday.toISOString().split('T')[0]) {
      return 'Yesterday';
    } else {
      return format(date, 'MMMM d, yyyy');
    }
  } catch (err) {
    console.error('Error formatting date:', err);
    return 'Unknown Date';
  }
}

// Credentials for n8n authentication
const username = 'secret';
const password = '__n8n_BLANK_VALUE_e5362baf-c777-4d57-a609-6eaf1f9e87f6';
const credentials = btoa(`${username}:${password}`);

interface CosmoChatProps {
  onClose: () => void;
  setActiveTab: (tab: string) => void;
}

export function CosmoChat({ onClose, setActiveTab }: CosmoChatProps) {
  const [messages, setMessages] = useState<CosmoMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [input, setInput] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null); 
  const [showSupportForm, setShowSupportForm] = useState(false);
  const { user } = useSupabase();
  const { stats } = usePlayerStats(user);
  const [page, setPage] = useState(1);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const messagesPerPage = 10;
  const [sessionId, setSessionId] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [autoScrolled, setAutoScrolled] = useState(false);
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(false);

  // Generate a unique session ID on component mount
  useEffect(() => {
    // Generate a random session ID that's not tied to the user ID
    const savedSessionId = localStorage.getItem('cosmo_session_id');
    const newSessionId = savedSessionId || (crypto.randomUUID ? 
      crypto.randomUUID() : 
      `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`);
    
    // Save session ID to localStorage for persistence
    if (!savedSessionId) {
      localStorage.setItem('cosmo_session_id', newSessionId);
    }
    
    setSessionId(newSessionId);
    console.log("Generated new Cosmo chat session ID:", newSessionId);
  }, []);

  // Load previous messages
  useEffect(() => {
    if (!user) return;
    
    const loadMessages = async () => {
      setLoading(true);
      try {
        console.log(`Loading messages for user ${user.id}, page ${page}, limit ${messagesPerPage}`);
        const savedMessages = await CosmoChatService.getRecentMessages(user.id, messagesPerPage, page);
        console.log(`Loaded ${savedMessages.length} messages`);
        setMessages(savedMessages);
        setHasMoreMessages(savedMessages.length >= messagesPerPage);
        setInitialLoadComplete(true);
        setShouldScrollToBottom(true);
      } catch (err) {
        console.error('Error loading messages:', err);
        setInitialLoadComplete(true);
      } finally {
        setLoading(false);
      }
    };
    
    loadMessages();
    
    // Subscribe to new messages
    let subscription: { unsubscribe: () => void } | null = null;

    const setupSubscription = async () => {
      try {
        console.log(`Setting up message subscription for user ${user.id}`);
        subscription = CosmoChatService.subscribeToMessages(user.id, (newMessage) => {
          console.log(`Received new message: ${newMessage.id}, isUser: ${newMessage.isUser}`);
          
          // Update messages state with the new message
          setMessages(prevMessages => {
            // Check if message already exists to prevent duplicates
            if (prevMessages.some(msg => msg.id === newMessage.id)) {
              console.log(`Message ${newMessage.id} already exists, skipping`);
              return prevMessages;
            }
            console.log(`Adding message ${newMessage.id} to state`);
            const newMessages = [...prevMessages, newMessage];
            
            // Set flag to scroll to bottom after adding new message
            setTimeout(() => setShouldScrollToBottom(true), 100);
            
            return newMessages;
          });
        });
        
        console.log(`Subscription set up successfully for user ${user.id}`);
      } catch (err) {
        console.error(`Error setting up message subscription for user ${user.id}:`, err);
        // Retry subscription after a delay
        setTimeout(setupSubscription, 3000);
      }
    };
    
    setupSubscription();
    
    return () => {
      if (subscription) {
        console.log(`Unsubscribing from Cosmo messages for user ${user.id}`);
        subscription.unsubscribe();
      }
    };
  }, [user?.id, messagesPerPage]);
  
  // Scroll to bottom when messages load initially or when new messages arrive
  useEffect(() => {
    if (initialLoadComplete && messages.length > 0) {
      // Scroll to the bottom of the chat container
      if (chatContainerRef.current) {
        // Use a small timeout to ensure the DOM has updated
        setTimeout(() => {
          if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
          }
        }, 100);
      }
    }
  }, [initialLoadComplete, messages.length]);
  
  // Scroll to bottom when a new message is sent or received
  useEffect(() => {
    if (shouldScrollToBottom && chatContainerRef.current) {
      // Use a small timeout to ensure the DOM has updated
      setTimeout(() => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
          setShouldScrollToBottom(false);
        }
      }, 100);
    }
  }, [shouldScrollToBottom]);
  
  // Function to load more messages
  const loadMoreMessages = async () => {
    if (!user || loadingMore || !hasMoreMessages) return;
    
    try {
      setLoadingMore(true);
      const nextPage = page + 1;
      console.log(`Loading more messages for user ${user.id}, page ${nextPage}`);
      const olderMessages = await CosmoChatService.getRecentMessages(
        user.id, 
        messagesPerPage, 
        nextPage
      );
      
      if (olderMessages.length > 0) {
        console.log(`Loaded ${olderMessages.length} more messages`);
        // Add older messages to the beginning of the messages array
        setMessages(prev => [...olderMessages, ...prev]);
        setPage(nextPage);
        setHasMoreMessages(olderMessages.length >= messagesPerPage);
      } else {
        console.log('No more messages to load');
        setHasMoreMessages(false);
      }
    } catch (err) {
      console.error('Error loading more messages:', err);
    } finally {
      setLoadingMore(false);
    }
  };
  
  // Handle scrolling when messages change
  useEffect(() => {
    // Completely remove auto-scrolling behavior
    // This allows the user to maintain their scroll position at all times
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    setLoading(true);

    // Add user message
    const userMessageContent = input;
    setInput(''); // Clear input immediately for better UX
    
    if (user?.id) {
      // Add optimistic user message to UI immediately
      const optimisticUserMessage: CosmoMessage = {
        id: `temp-${Date.now()}`,
        content: userMessageContent,
        isUser: true,
        createdAt: new Date()
      };
      
      setMessages(prev => [...prev, optimisticUserMessage]);
      
      // Set flag to scroll to bottom after message is sent
      setShouldScrollToBottom(true);
      
      // Then save to database
      try {
        const savedMessage = await CosmoChatService.sendMessage(
          user.id,
          userMessageContent,
          true,
          sessionId
        );
        
        if (savedMessage) {
          // Replace the optimistic message with the saved one
          setMessages(prev => 
            prev.map(msg => 
              msg.id === optimisticUserMessage.id ? savedMessage : msg
            )
          );
        }
      } catch (err) {
        console.error('Error saving user message:', err);
        // Keep the optimistic message in this case
      }
    }
    
    try {
      // Call the n8n.io webhook with authentication and Key parameter
      const response = await fetch('https://healthrocket.app.n8n.cloud/webhook/9aa19401-f6f3-4833-b632-e8ebc3f0bbef/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${credentials}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          message: userMessageContent,
          userId: user?.id || 'anonymous',
          userName: user?.user_metadata?.name || 'User',
          Key: sessionId // Required by n8n for session tracking
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response from n8n webhook:', errorText);
        throw new Error(`Failed to get response from AI agent: ${errorText}`);
      }

      let data = await response.json();
      console.log('Response from n8n webhook:', data);
      
      // Handle array of responses
      if (Array.isArray(data)) {
        // Combine all text responses
        let combinedResponse = '';
        
        for (const item of data) {
          if (item.type === 'text' && item.text) {
            combinedResponse += item.text + '\n\n';
          }
        }
        
        if (combinedResponse) {
          // Extract and format the response content
          const formattedResponse = formatResponseText(combinedResponse.trim());

          // Save AI response to database
          if (user?.id) {
            const aiMessage = await CosmoChatService.sendMessage(
              user.id,
              formattedResponse,
              false,
              sessionId
            );
            
            // Add AI response to UI immediately instead of waiting for subscription
            if (aiMessage) {
              setMessages(prev => {
                // Check if message already exists to prevent duplicates
                if (prev.some(msg => msg.id === aiMessage.id)) {
                  return prev;
                }
                return [...prev, aiMessage];
              });
            }
            
            // Always scroll to bottom after AI response
            setShouldScrollToBottom(true);
          }
        } else {
          // If no text responses, add a fallback message
          if (user?.id) {
            const fallbackMessage = await CosmoChatService.sendMessage(
              user.id,
              "I'm not sure how to respond to that. Can you try asking something else?",
              false,
              sessionId
            );
            
            // Add fallback message to UI immediately
            if (fallbackMessage) {
              setMessages(prev => {
                if (prev.some(msg => msg.id === fallbackMessage.id)) {
                  return prev;
                }
                return [...prev, fallbackMessage];
              });
            }

            // Always scroll to bottom after fallback message
            setShouldScrollToBottom(true);
          }
        }
      } else {
        // Handle single response object
        // Extract and format the response content
        const formattedResponse = extractAndFormatResponse(data);
        
        if (formattedResponse.trim()) {
          // Save AI response to database
          if (user?.id) {
            const aiMessage = await CosmoChatService.sendMessage(
              user.id,
              formattedResponse,
              false,
              sessionId
            );
            
            // Add AI response to UI immediately
            if (aiMessage) {
              setMessages(prev => {
                if (prev.some(msg => msg.id === aiMessage.id)) {
                  return prev;
                }
                return [...prev, aiMessage];
              });
            }

            // Always scroll to bottom after AI response
            setShouldScrollToBottom(true);
          }
        } else {
          // If empty response, add a fallback message
          if (user?.id) {
            const fallbackMessage = await CosmoChatService.sendMessage(
              user.id,
              "I'm not sure how to respond to that. Can you try asking something else?",
              false,
              sessionId
            );
            
            // Add fallback message to UI immediately
            if (fallbackMessage) {
              setMessages(prev => {
                if (prev.some(msg => msg.id === fallbackMessage.id)) {
                  return prev;
                }
                return [...prev, fallbackMessage];
              });
            }

            // Always scroll to bottom after fallback message
            setShouldScrollToBottom(true);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching from webhook:', error);
      
      // Log detailed error for debugging
      if (error instanceof Error) {
        console.error('Error fetching from webhook:', error.message);
      }
      
      // Add error message
      if (user?.id) {
        const errorMessage = await CosmoChatService.sendMessage(
          user.id,
          "I'm having trouble connecting right now. Please try again later.",
          false,
          sessionId
        );
        
        // Add error message to UI immediately
        if (errorMessage) {
          setMessages(prev => {
            if (prev.some(msg => msg.id === errorMessage.id)) {
              return prev;
            }
            return [...prev, errorMessage];
          });
        }

        // Always scroll to bottom after error message
        setShouldScrollToBottom(true);
      }
    } finally {
      setLoading(false);
    }
  };

  // Function to extract and format response from various data structures
  const extractAndFormatResponse = (data: any): string => {
    // If data is null or undefined, return a fallback message
    if (!data) {
      return "I'm having trouble understanding the response. Please try again.";
    }
    
    // If data is already a string, format it directly
    if (typeof data === 'string') {
      return formatResponseText(data);
    }
    
    // Handle JSON response format from n8n
    if (typeof data === 'object' && data.type === 'text' && data.text) {
      return formatResponseText(data.text);
    }
    
    // Handle function call format from n8n
    if (typeof data === 'object' && data.functionCall) {
      // Don't display function calls directly to the user
      return "";
    }
    
    // If data is an object, try to extract the response content
    if (typeof data === 'object') {
      // Common response fields in order of priority
      const possibleFields = ['response', 'output', 'text', 'message', 'result', 'answer', 'content'];
      
      // Try each field in order
      for (const field of possibleFields) {
        if (data[field] !== undefined) {
          const content = data[field];
          
          // If the content is a string, format it
          if (typeof content === 'string') {
            return formatResponseText(content);
          }
          
          // If the content is an object, stringify it
          if (typeof content === 'object') {
            try {
              return formatResponseText(JSON.stringify(content));
            } catch (e) {
              console.error('Error stringifying object:', e);
            }
          }
        }
      }
      
      // If no fields matched, try to stringify the entire object
      try {
        return formatResponseText(JSON.stringify(data));
      } catch (e) {
        console.error('Error stringifying data:', e);
      }
    }
    
    // Fallback message if all else fails
    return "I'm having trouble understanding the response. Please try again.";
  };

  // Function to format response text with markdown-like syntax
  const formatResponseText = (text: string): string => {
    if (!text) return '';

    // Skip empty responses or function calls
    if (text.trim() === '' || text.includes('{"functionCall"')) {
      return '';
    }

    let formatted = text;
    
    // Try to parse JSON strings
    if (typeof text === 'string' && 
        (text.trim().startsWith('{') && text.trim().endsWith('}')) || 
        (text.trim().startsWith('[') && text.trim().endsWith(']'))) {
      try {
        const jsonData = JSON.parse(text);
        
        // If it's an array, format each item
        if (Array.isArray(jsonData)) {
          return jsonData.map(item => 
            typeof item === 'string' ? item : JSON.stringify(item)
          ).join('<br /><br />');
        }
        
        // Extract content from common JSON fields
        const possibleFields = ['output', 'response', 'text', 'message', 'content', 'answer'];
        for (const field of possibleFields) {
          if (jsonData[field]) {
            formatted = typeof jsonData[field] === 'string' 
              ? jsonData[field] 
              : JSON.stringify(jsonData[field]);
            break;
          }
        }
      } catch (e) {
        // If parsing fails, continue with text formatting
        console.log("Not valid JSON, continuing with text formatting");
      }
    }

    // Check if the text already has HTML-like formatting
    if (formatted.includes('<') && formatted.includes('>')) {
      return formatted; // Return as is if it already has HTML
    } else if (formatted.includes('\n\n')) {
      // If text has paragraph breaks, format them as divs
      const paragraphs = formatted.split('\n\n'); 
      return paragraphs.map(p => `<div class="mb-1">${formatParagraph(p)}</div>`).join('');
    }
    
    return formatParagraph(formatted);
  };
  
  // Helper function to format a single paragraph
  const formatParagraph = (text: string): string => {
    let formatted = text;
    
    // Format headings (lines ending with : or starting with # followed by space) - with more emphasis
    formatted = formatted.replace(/^(.+):\s*$/gm, '<strong class="text-orange-500 text-sm block mb-0.5 font-bold">$1:</strong>');
    formatted = formatted.replace(/^#\s+(.+)$/gm, '<h3 class="text-sm font-bold text-orange-500 mb-2">$1</h3>');
    
    // Format lists (lines starting with - or • or *) - with better spacing and bullet points
    formatted = formatted.replace(/^[-•*]\s+(.+)$/gm, '<div class="flex items-start gap-1 mb-0.5"><div class="w-1 h-1 rounded-full bg-orange-500 mt-1.5 flex-shrink-0"></div><span class="text-gray-100 flex-1 text-xs">$1</span></div>');
    
    // Format numbered lists (lines starting with 1., 2., etc.) - with better alignment and spacing
    formatted = formatted.replace(/^(\d+)\.\s+(.+)$/gm, '<div class="flex items-start gap-1 mb-0.5"><span class="text-orange-500 font-bold w-4 text-right text-xs">$1.</span><span class="text-gray-100 flex-1 text-xs">$2</span></div>');
    
    // Format bold text (text between ** or __) - with more emphasis
    formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong class="text-white font-bold text-xs">$1</strong>');
    formatted = formatted.replace(/__(.+?)__/g, '<strong class="text-white font-bold text-xs">$1</strong>');
    
    // Format italic text (text between * or _) - with better color
    formatted = formatted.replace(/\*([^*]+)\*/g, '<em class="text-gray-200 italic text-xs">$1</em>');
    formatted = formatted.replace(/_([^_]+)_/g, '<em class="text-gray-200 italic text-xs">$1</em>');
    
    // Format code blocks (text between ` or ```) - with better styling
    formatted = formatted.replace(/```(.+?)```/gs, '<pre class="bg-gray-800 p-2 rounded-lg my-2 overflow-x-auto border border-gray-600 shadow-inner text-xs"><code class="text-orange-300">$1</code></pre>');
    formatted = formatted.replace(/`([^`]+)`/g, '<code class="bg-gray-800 px-1 py-0.5 rounded text-orange-400 border border-gray-700/50 text-xs">$1</code>');
    
    // Format single newlines with more spacing for better readability
    formatted = formatted.replace(/\n/g, '<br class="my-1" />');
    
    // Add special formatting for key terms - with more emphasis
    formatted = formatted.replace(/\b(Fuel Points|FP|HealthSpan|HealthScore)\b/g, '<span class="text-orange-400 font-medium text-xs">$1</span>');
    
    // Add special formatting for categories - with more emphasis and styling
    formatted = formatted.replace(/\b(Mindset|Sleep|Exercise|Nutrition|Biohacking)\b/g, '<span class="font-semibold text-white border-b border-orange-500/30 pb-0.5 text-xs">$1</span>');
    
    return formatted;
  };

  const getIconForCategory = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'mindset':
        return <Brain size={20} />;
      case 'sleep':
        return <Moon size={20} />;
      case 'exercise':
        return <Activity size={20} />;
      case 'nutrition':
        return <Apple size={20} />;
      case 'biohacking':
        return <Database size={20} />;
      default:
        return <Flame size={20} />;
    }
  };

  const getTopicIcon = (title: string) => {
    if (title.includes('Mission')) return <Rocket size={20} />;
    if (title.includes('Level')) return <Trophy size={20} />;
    if (title.includes('Daily')) return <Activity size={20} />;
    if (title.includes('Prize')) return <Trophy size={20} />;
    if (title.includes('Progress')) return <Target size={20} />;
    if (title.includes('Pro')) return <Zap size={20} />;
    return <Info size={20} />;
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Chat Section */}
      <div className="bg-gray-800/50 rounded-lg overflow-hidden flex flex-col">
        {/* Messages */}
        <div 
          ref={chatContainerRef}
          className="overflow-y-auto p-4 space-y-4 max-h-[60vh] min-h-[40vh] flex flex-col"
        >
          {!initialLoadComplete ? (
            <div className="flex items-center justify-center h-full flex-grow">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400 flex-grow">
              <div className="text-center">
                <Radio className="mx-auto mb-2 text-orange-500" size={24} />
                <p>No messages yet. Start a conversation with Cosmo!</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col space-y-4 flex-grow">
              {/* Load More Button */}
              {hasMoreMessages && (
                <div className="flex justify-center">
                  <button
                    onClick={loadMoreMessages}
                    disabled={loadingMore}
                    className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {loadingMore ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Loading...</span>
                      </>
                    ) : (
                
                      <span>Load More Messages</span>
                    )}
                  </button>
                </div>
              )}
              <div className="flex-grow">
                {/* Group messages by date */}
                {groupMessagesByDate(messages).map(([date, dateMessages]) => (
                  <div key={date} className="space-y-4">
                    {/* Date Header */}
                    <div className="flex items-center gap-2 py-2">
                      <div className="h-px bg-gray-700 flex-grow"></div>
                      <span className="text-gray-400 text-sm font-medium">
                        {formatDateHeader(date)}
                      </span>
                      <div className="h-px bg-gray-700 flex-grow"></div>
                    </div>
                    {/* Messages for this date */}
                    {dateMessages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                      >
                        <div 
                          className={`max-w-[80%] rounded-lg p-3 ${
                            message.isUser 
                              ? 'bg-orange-500 text-white ml-auto' 
                              : 'bg-gray-700 text-gray-100'
                          }`}
                        >
                          {message.isUser ? (
                            <p className="text-sm">{message.content}</p>
                          ) : (
                            <div 
                              className="text-sm"
                              dangerouslySetInnerHTML={{ 
                                __html: message.content 
                              }} 
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-gray-700 bg-gray-800/50">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask Cosmo anything..."
              className="flex-grow bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
              disabled={loading}
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="bg-orange-500 text-white p-2 rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Send size={24} />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Contact Support Section */}
      <div className="bg-gray-800/50 rounded-lg p-4 mb-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <MessageSquare className="text-orange-500" size={20} />
          <span>Contact Support</span>
        </h3>
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <p className="text-gray-300 text-sm flex-1">
            Need help with something specific? Our support team is here to assist you.
          </p>
          <button
            onClick={() => setShowSupportForm(true)}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors whitespace-nowrap"
          >
            Contact Support
          </button>
        </div>
      </div>

      {/* Help Topics */}
      <div className="bg-gray-800/50 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <MessageSquare className="text-orange-500" size={20} />
          <span>Help Topics</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {helpTopics.map((topic) => (
            <button
              key={topic.id}
              onClick={() => setSelectedTopic(selectedTopic === topic.id ? null : topic.id)}
              className={`text-left p-4 rounded-lg transition-all ${
                selectedTopic === topic.id
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-100'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={selectedTopic === topic.id ? 'text-white' : 'text-orange-500'}>
                  {topic.icon}
                </div>
                <div>
                  <h4 className="font-semibold mb-1">{topic.title}</h4>
                  <p className="text-sm opacity-80">{topic.description}</p>
                  {selectedTopic === topic.id && (
                    <div className="mt-4 text-sm whitespace-pre-line">{topic.content}</div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
      
      {/* Support Form Modal */}
      {showSupportForm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-lg max-w-md w-full p-6 shadow-xl">
            <SupportForm onClose={() => setShowSupportForm(false)} />
          </div>
        </div>
      )}
    </div>
  );
}