
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SendHorizonal, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInterfaceProps {
  conversationId: string;
}

interface Message {
  id: string;
  content: string;
  sender: string;
  created_at: string;
}

interface ClientInfo {
  name: string;
  email: string;
}

const ChatInterface = ({ conversationId }: ChatInterfaceProps) => {
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [client, setClient] = useState<ClientInfo | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch messages and client info
  useEffect(() => {
    const fetchConversationData = async () => {
      setLoading(true);
      try {
        // Fetch client info
        const { data: convData, error: convError } = await supabase
          .from("conversations")
          .select(`
            clients!conversations_client_id_fkey (
              name, 
              email
            )
          `)
          .eq("id", conversationId)
          .single();

        if (convError) {
          throw convError;
        }

        setClient({
          name: convData.clients.name,
          email: convData.clients.email,
        });

        // Fetch messages
        const { data: messagesData, error: messagesError } = await supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true });

        if (messagesError) {
          throw messagesError;
        }

        setMessages(messagesData);
      } catch (error) {
        console.error("Error fetching conversation data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (conversationId) {
      fetchConversationData();

      // Subscribe to new messages
      const channel = supabase
        .channel("schema-db-changes")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload) => {
            setMessages((currentMessages) => [...currentMessages, payload.new as Message]);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [conversationId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Function to simulate Captain Sarah's response
  const simulateAIResponse = async (userMessage: string) => {
    // In a real app, this would call your AI backend
    // For now, we'll just simulate a response
    
    // Wait 1-2 seconds to simulate AI thinking
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
    
    let response: string;
    
    if (userMessage.toLowerCase().includes("flight")) {
      response = `I'd be happy to help you find a flight! Could you please tell me:
1. Your preferred departure and destination cities
2. Travel dates
3. Number of passengers
4. Any preferences for airlines or class?`;
    } else if (userMessage.toLowerCase().includes("hotel")) {
      response = `I'd be glad to help with hotel accommodations! To find the best options, I'll need:
1. Your destination city
2. Check-in and check-out dates
3. Number of guests and rooms
4. Any specific amenities you're looking for?`;
    } else if (userMessage.toLowerCase().includes("package")) {
      response = `Great choice! Travel packages can offer great value. To help you find the perfect package:
1. Where would you like to go?
2. When are you planning to travel?
3. How many travelers?
4. Are you looking for any specific activities or experiences?`;
    } else {
      response = `Hello! I'm Captain Sarah, your AI travel assistant. I can help you with:
- Flight bookings
- Hotel reservations
- Complete travel packages
- Weather information
- Travel recommendations

How can I assist with your travel plans today?`;
    }
    
    // Add the AI response to the database
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender: "assistant",
      content: response,
    });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;
    
    setSending(true);
    try {
      // Add user message to database
      await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender: "user",
        content: newMessage.trim(),
      });
      
      // Clear input
      setNewMessage("");
      
      // Simulate AI response
      await simulateAIResponse(newMessage);
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center space-x-3 mb-6">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div>
            <Skeleton className="h-5 w-32 mb-1" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-start space-x-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-20 w-3/4 rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[70vh]">
      <div className="border-b p-4 flex items-center">
        <div className="bg-blue-100 rounded-full p-2 mr-3">
          <User className="h-5 w-5 text-blue-700" />
        </div>
        <div>
          <h3 className="font-medium">{client?.name}</h3>
          <p className="text-sm text-gray-500">{client?.email}</p>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div 
            key={message.id}
            className={cn(
              "flex items-start max-w-[80%]",
              message.sender === "user" ? "ml-auto" : "mr-auto"
            )}
          >
            {message.sender === "assistant" && (
              <div className="bg-blue-600 rounded-full p-2 mr-2 flex-shrink-0">
                <span className="text-white text-xs font-bold">CS</span>
              </div>
            )}
            <div
              className={cn(
                "p-3 rounded-lg",
                message.sender === "user" 
                  ? "bg-blue-500 text-white rounded-br-none" 
                  : "bg-gray-100 text-gray-800 rounded-bl-none"
              )}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
              <span className="text-xs opacity-75 mt-1 block text-right">
                {new Date(message.created_at).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </span>
            </div>
            {message.sender === "user" && (
              <div className="bg-gray-300 rounded-full p-2 ml-2 flex-shrink-0">
                <User className="h-4 w-4 text-gray-600" />
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="border-t p-4">
        <form onSubmit={handleSendMessage} className="flex items-center">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message to Captain Sarah..."
            className="flex-1 p-2 border rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={sending}
          />
          <Button 
            type="submit" 
            className="rounded-l-none" 
            disabled={sending || !newMessage.trim()}
          >
            <SendHorizonal className="h-4 w-4" />
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;
