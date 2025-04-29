
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { PlusCircle, MessageCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ConversationListProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

interface Conversation {
  id: string;
  client: {
    name: string;
    email: string;
  };
  created_at: string;
  status: string;
}

const ConversationsList = ({ selectedId, onSelect }: ConversationListProps) => {
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [showNewClientModal, setShowNewClientModal] = useState(false);

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const { data, error } = await supabase
          .from("conversations")
          .select(`
            id, 
            created_at, 
            status,
            clients!conversations_client_id_fkey (
              name, 
              email
            )
          `)
          .order("created_at", { ascending: false });

        if (error) {
          throw error;
        }

        const formattedData = data.map((item) => ({
          id: item.id,
          client: {
            name: item.clients.name,
            email: item.clients.email,
          },
          created_at: item.created_at,
          status: item.status,
        }));

        setConversations(formattedData);
      } catch (error) {
        console.error("Error fetching conversations:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
    
    // Subscribe to changes in the conversations table
    const channel = supabase
      .channel("schema-db-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversations",
        },
        () => fetchConversations()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const createNewClient = async (name: string, email: string) => {
    try {
      // Add client
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .insert({ name, email })
        .select()
        .single();

      if (clientError) throw clientError;

      // Create conversation for the client
      const { data: convData, error: convError } = await supabase
        .from("conversations")
        .insert({ client_id: clientData.id })
        .select()
        .single();

      if (convError) throw convError;

      // Add welcome message
      await supabase.from("messages").insert({
        conversation_id: convData.id,
        sender: "assistant",
        content: `Hello ${name}! I'm Captain Sarah, your personal AI travel assistant. How can I help you plan your next adventure?`,
      });

      // Select the new conversation
      onSelect(convData.id);
      setShowNewClientModal(false);
    } catch (error) {
      console.error("Error creating new client:", error);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold mb-2">Client Conversations</h2>
        <Button 
          variant="outline" 
          className="w-full flex items-center justify-center" 
          onClick={() => setShowNewClientModal(true)}
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          New Client
        </Button>
      </div>
      
      <div className="flex-grow overflow-y-auto">
        {loading ? (
          <div className="p-4 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-3 border-b">
                <Skeleton className="h-5 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>No conversations yet</p>
          </div>
        ) : (
          <ul className="divide-y">
            {conversations.map((conversation) => (
              <li key={conversation.id}>
                <button
                  className={cn(
                    "w-full text-left p-4 hover:bg-gray-50 transition-colors flex items-start",
                    selectedId === conversation.id && "bg-blue-50"
                  )}
                  onClick={() => onSelect(conversation.id)}
                >
                  <MessageCircle className={cn(
                    "h-5 w-5 mr-3 mt-1", 
                    conversation.status === 'active' 
                      ? "text-yellow-500" 
                      : "text-green-500"
                  )} />
                  <div>
                    <h3 className="font-medium">{conversation.client.name}</h3>
                    <p className="text-sm text-gray-500 truncate">{conversation.client.email}</p>
                    <div className="flex items-center mt-1">
                      <span className={cn(
                        "text-xs px-2 py-1 rounded-full",
                        conversation.status === 'active' 
                          ? "bg-yellow-100 text-yellow-800" 
                          : "bg-green-100 text-green-800"
                      )}>
                        {conversation.status === 'active' ? 'Active' : 'Completed'}
                      </span>
                      <span className="text-xs text-gray-400 ml-2">
                        {new Date(conversation.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {showNewClientModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Add New Client</h2>
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                createNewClient(
                  formData.get('name') as string, 
                  formData.get('email') as string
                );
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input 
                  type="text" 
                  name="name"
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input 
                  type="email" 
                  name="email"
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => setShowNewClientModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Create Client</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConversationsList;
