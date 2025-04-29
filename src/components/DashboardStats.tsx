
interface DashboardStatsProps {
  stats: {
    totalClients: number;
    pendingClients: number;
    completedBookings: number;
  };
}

const DashboardStats = ({ stats }: DashboardStatsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
        <h3 className="text-gray-500 font-medium">Total Clients</h3>
        <p className="text-3xl font-bold mt-2">{stats.totalClients}</p>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-yellow-500">
        <h3 className="text-gray-500 font-medium">Awaiting Support</h3>
        <p className="text-3xl font-bold mt-2">{stats.pendingClients}</p>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
        <h3 className="text-gray-500 font-medium">Completed Bookings</h3>
        <p className="text-3xl font-bold mt-2">{stats.completedBookings}</p>
      </div>
    </div>
  );
};

export default DashboardStats;
