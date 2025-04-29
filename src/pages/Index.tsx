
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import DashboardStats from "@/components/DashboardStats";
import ConversationsList from "@/components/ConversationsList";
import ChatInterface from "@/components/ChatInterface";

const Index = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalClients: 0,
    pendingClients: 0,
    completedBookings: 0,
  });
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Count total clients
        const { count: clientCount, error: clientError } = await supabase
          .from("clients")
          .select("*", { count: "exact", head: true });
        
        // Count clients with active conversations (awaiting support)
        const { count: pendingCount, error: pendingError } = await supabase
          .from("conversations")
          .select("*", { count: "exact", head: true })
          .eq("status", "active");
        
        // Count completed bookings
        const { count: bookingsCount, error: bookingsError } = await supabase
          .from("bookings")
          .select("*", { count: "exact", head: true })
          .eq("status", "confirmed");
        
        if (clientError || pendingError || bookingsError) {
          console.error("Error fetching dashboard data:", clientError || pendingError || bookingsError);
          return;
        }
        
        setStats({
          totalClients: clientCount || 0,
          pendingClients: pendingCount || 0,
          completedBookings: bookingsCount || 0,
        });
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-blue-600 text-white p-6 shadow-md">
        <div className="container mx-auto">
          <h1 className="text-3xl font-bold">Trippy AI Travel Agency</h1>
          <p className="text-blue-100">Captain Sarah's Dashboard</p>
        </div>
      </header>
      
      <main className="container mx-auto py-8 px-4">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow-md">
                <Skeleton className="h-8 w-24 mb-2" />
                <Skeleton className="h-12 w-16" />
              </div>
            ))}
          </div>
        ) : (
          <DashboardStats stats={stats} />
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
          <div className="lg:col-span-1 bg-white rounded-lg shadow-md overflow-hidden">
            <ConversationsList 
              selectedId={selectedConversation} 
              onSelect={setSelectedConversation} 
            />
          </div>
          <div className="lg:col-span-2 bg-white rounded-lg shadow-md">
            {selectedConversation ? (
              <ChatInterface conversationId={selectedConversation} />
            ) : (
              <div className="p-8 text-center text-gray-500">
                <h3 className="text-xl font-medium mb-2">No conversation selected</h3>
                <p>Select a conversation from the list or create a new one to start chatting.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
