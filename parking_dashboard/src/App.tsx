import { useState, useEffect, useRef, useCallback } from "react";
import {
  Car,
  Shield,
  AlertTriangle,
  Clock,
  DollarSign,
  BarChart3,
  PieChart,
  Activity,
  Zap,
  RefreshCw,
  Wifi,
  WifiOff,
} from "lucide-react";
import type { ParkingEntry, SecurityIncident } from "./types/type";
import { fetchParkingEntries, fetchSecurityIncidents } from "./services/api";
import { StatCard } from "./components/StatCard";
import { IncidentBadge } from "./components/IncidentBadge";
import {
  Chart,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  PieController,
  BarController,
  LineController,
  DoughnutController,
} from "chart.js";
import IncidentDetails from "./components/IncidentDetails";

Chart.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  PieController,
  BarController,
  LineController,
  DoughnutController
);

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [parkingEntries, setParkingEntries] = useState<ParkingEntry[]>([]);
  const [securityIncidents, setSecurityIncidents] = useState<
    SecurityIncident[]
  >([]);
  const [isLiveMode, setIsLiveMode] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [selectedIncident, setSelectedIncident] =
    useState<SecurityIncident | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  type ChartCanvas = HTMLCanvasElement & { chart?: Chart };
  const pieChartRef = useRef<ChartCanvas | null>(null);
  const barChartRef = useRef<ChartCanvas | null>(null);
  const lineChartRef = useRef<ChartCanvas | null>(null);
  const doughnutChartRef = useRef<ChartCanvas | null>(null);
  // Load data function
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [entries, incidents] = await Promise.all([
        fetchParkingEntries(),
        fetchSecurityIncidents(),
      ]);
      setParkingEntries(entries);
      setSecurityIncidents(incidents);
      setLastUpdate(new Date());
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
      console.error("Error loading data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh data when in live mode
  useEffect(() => {
    loadData(); // Initial load

    let dataInterval: NodeJS.Timeout;
    if (isLiveMode) {
      dataInterval = setInterval(loadData, 30000); // Refresh every 30 seconds
    }

    return () => {
      if (dataInterval) clearInterval(dataInterval);
    };
  }, [isLiveMode]);

  // Clock timer
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Calculate statistics
  const totalRevenue = parkingEntries
    .filter((e) => e.payment_status)
    .reduce((sum, e) => sum + (e.due_payment || 0), 0);
  const activeVehicles = parkingEntries.filter((e) => !e.exit_time).length;
  const totalIncidents = securityIncidents.length;
  const criticalIncidents = securityIncidents.filter(
    (i) => i.incident_type === "UNAUTHORIZED_EXIT"
  ).length;

  const initializeCharts = useCallback(() => {
    // Payment Status Pie Chart
    if (pieChartRef.current) {
      const ctx = pieChartRef.current.getContext("2d");
      if (!ctx) return;
      new Chart(pieChartRef.current, {
        type: "pie",
        data: {
          labels: ["Paid", "Pending"],
          datasets: [
            {
              data: [
                parkingEntries.filter((e) => e.payment_status).length,
                parkingEntries.filter((e) => !e.payment_status).length,
              ],
              backgroundColor: ["#10B981", "#F59E0B"],
              borderWidth: 3,
              borderColor: "#ffffff",
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "bottom",
              labels: {
                padding: 20,
                font: { size: 14, weight: "bold" },
              },
            },
          },
        },
      });
    }

    // Security Incidents Bar Chart
    if (barChartRef.current) {
      const incidentTypes = securityIncidents.reduce<Record<string, number>>(
        (acc, incident) => {
          acc[incident.incident_type] = (acc[incident.incident_type] || 0) + 1;
          return acc;
        },
        {}
      );

      const ctx = barChartRef.current.getContext("2d");
      if (!ctx) return;

      new Chart(barChartRef.current, {
        type: "bar",
        data: {
          labels: Object.keys(incidentTypes).map((type) =>
            type.replace(/_/g, " ")
          ),
          datasets: [
            {
              label: "Incidents",
              data: Object.values(incidentTypes),
              backgroundColor: ["#EF4444", "#F59E0B", "#F97316", "#8B5CF6"],
              borderRadius: 8,
              borderSkipped: false,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { stepSize: 1 },
            },
          },
        },
      });
    }

    // Revenue Trend Line Chart
    if (lineChartRef.current) {
      const ctx = lineChartRef.current.getContext("2d");
      if (!ctx) return;
      new Chart(lineChartRef.current, {
        type: "line",
        data: {
          labels: ["May 30", "May 31", "Jun 1", "Jun 2"],
          datasets: [
            {
              label: "Daily Revenue",
              data: [8500, 12300, 15600, totalRevenue],
              borderColor: "#10B981",
              backgroundColor: "rgba(16, 185, 129, 0.1)",
              borderWidth: 3,
              fill: true,
              tension: 0.4,
              pointBackgroundColor: "#10B981",
              pointBorderColor: "#ffffff",
              pointBorderWidth: 3,
              pointRadius: 6,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: function (value) {
                  return value.toLocaleString() + " RWF";
                },
              },
            },
          },
        },
      });
    }

    // Activity Doughnut Chart
    if (doughnutChartRef.current) {
      const ctx = doughnutChartRef.current.getContext("2d");
      if (!ctx) return;
      new Chart(doughnutChartRef.current, {
        type: "doughnut",
        data: {
          labels: ["Completed", "Active", "Incidents"],
          datasets: [
            {
              data: [
                parkingEntries.filter((e) => e.exit_time).length,
                activeVehicles,
                totalIncidents,
              ],
              backgroundColor: ["#06B6D4", "#F97316", "#EF4444"],
              borderWidth: 3,
              borderColor: "#ffffff",
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: "60%",
          plugins: {
            legend: {
              position: "bottom",
              labels: {
                padding: 20,
                font: { size: 12, weight: "bold" },
              },
            },
          },
        },
      });
    }
  }, [
    activeVehicles,
    parkingEntries,
    securityIncidents,
    totalIncidents,
    totalRevenue,
  ]);
  useEffect(() => {
    if (activeTab === "analytics" && !loading && parkingEntries.length > 0) {
      initializeCharts();
    }
    return () => {
      // Clean up charts when component unmounts or tab changes
      [pieChartRef, barChartRef, lineChartRef, doughnutChartRef].forEach(
        (ref) => {
          if (ref.current?.chart) {
            ref.current.chart.destroy();
          }
        }
      );
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, loading, initializeCharts]);
  const handleResolveIncident = (id: number) => {
    setSecurityIncidents((prev) =>
      prev.map((incident) =>
        incident.id === id ? { ...incident, resolved: true } : incident
      )
    );
    setSelectedIncident((prev) =>
      prev && prev.id === id ? { ...prev, resolved: true } : prev
    );
  };
  const LiveIndicator = () => (
    <div className="flex items-center space-x-3">
      <div className="flex items-center space-x-2">
        <div
          className={`w-3 h-3 rounded-full ${
            isLiveMode ? "bg-green-400 animate-pulse" : "bg-gray-400"
          }`}
        ></div>
        <span className="text-sm font-medium text-gray-600">
          {isLiveMode ? "LIVE" : "OFFLINE"}
        </span>
      </div>
      {lastUpdate && (
        <div className="text-xs text-gray-500">
          Updated: {lastUpdate.toLocaleTimeString()}
        </div>
      )}
      <button
        onClick={loadData}
        disabled={loading}
        className={`p-2 rounded-lg transition-all duration-200 ${
          loading
            ? "bg-gray-100 cursor-not-allowed"
            : "bg-blue-100 hover:bg-blue-200 text-blue-600"
        }`}
        title="Refresh data"
      >
        <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-lg border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-xl shadow-lg">
                <Car className="text-white" size={28} />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                  SmartPark Dashboard
                </h1>
                <p className="text-gray-500 text-sm">
                  Real-time parking management system
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-6">
              <LiveIndicator />
              <div className="text-right">
                <div className="text-lg font-semibold text-gray-800">
                  {currentTime.toLocaleTimeString()}
                </div>
                <div className="text-sm text-gray-500">
                  {currentTime.toLocaleDateString()}
                </div>
              </div>
              <button
                onClick={() => setIsLiveMode(!isLiveMode)}
                className={`p-2 rounded-lg transition-colors ${
                  isLiveMode
                    ? "bg-green-100 text-green-600"
                    : "bg-gray-100 text-gray-600"
                }`}
                title={isLiveMode ? "Disable live mode" : "Enable live mode"}
              >
                {isLiveMode ? <Wifi size={20} /> : <WifiOff size={20} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex space-x-1 bg-white rounded-xl p-2 shadow-md">
          {[
            { id: "overview", label: "Overview", icon: BarChart3 },
            { id: "vehicles", label: "Vehicles", icon: Car },
            { id: "security", label: "Security", icon: Shield },
            { id: "analytics", label: "Analytics", icon: Activity },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-6 py-3 rounded-lg transition-all duration-200 font-medium ${
                activeTab === tab.id
                  ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg  cursor-pointer"
                  : "text-gray-600 hover:bg-gray-50 cursor-pointer"
              }`}
            >
              <tab.icon size={18} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 pb-8">
        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-3">
            <AlertTriangle className="text-red-500" size={20} />
            <div>
              <div className="font-semibold text-red-800">Connection Error</div>
              <div className="text-red-600 text-sm">{error}</div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center space-x-3">
            <RefreshCw className="text-blue-500 animate-spin" size={20} />
            <div className="text-blue-800 font-medium">
              Loading dashboard data...
            </div>
          </div>
        )}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Total Revenue"
                value={`${totalRevenue.toLocaleString()} RWF`}
                icon={DollarSign}
                color="from-green-500 to-emerald-600"
                trend="+12%"
                subtitle="This month"
              />
              <StatCard
                title="Active Vehicles"
                value={activeVehicles}
                icon={Car}
                color="from-blue-500 to-cyan-600"
                trend="+3"
                subtitle="Currently parked"
              />
              <StatCard
                title="Security Alerts"
                value={totalIncidents}
                icon={AlertTriangle}
                color="from-orange-500 to-red-600"
                trend="+5"
                subtitle="Last 24 hours"
              />
              <StatCard
                title="System Status"
                value="Optimal"
                icon={Zap}
                color="from-purple-500 to-pink-600"
                subtitle="All systems online"
              />
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Entries */}
              <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-800 flex items-center">
                    <Clock className="mr-2 text-blue-500" size={24} />
                    Recent Activity
                  </h3>
                </div>
                <div className="space-y-4">
                  {parkingEntries.slice(0, 3).map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                          <Car className="text-white" size={20} />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-800">
                            {entry.car_plate}
                          </div>
                          <div className="text-sm text-gray-500">
                            {entry.exit_time ? "Exited" : "Entered"} •{" "}
                            {new Date(entry.entry_time).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            entry.payment_status
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {entry.payment_status ? "Paid" : "Pending"}
                        </div>
                        {entry.due_payment && (
                          <div className="text-sm text-gray-600 mt-1">
                            {entry.due_payment} RWF
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Security Alerts */}
              <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-800 flex items-center">
                    <Shield className="mr-2 text-red-500" size={24} />
                    Security Alerts
                  </h3>
                  <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-semibold">
                    {criticalIncidents} Critical
                  </span>
                </div>
                <div className="space-y-4">
                  {securityIncidents.slice(0, 3).map((incident) => (
                    <div
                      key={incident.id}
                      className="p-4 bg-gradient-to-r from-red-50 to-orange-50 rounded-xl border border-red-100"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-semibold text-gray-800">
                          {incident.car_plate}
                        </div>
                        <IncidentBadge
                          type={
                            incident.incident_type as
                              | "UNAUTHORIZED_EXIT"
                              | "DOUBLE_ENTRY_ATTEMPT"
                              | "NO_ENTRY_EXIT_ATTEMPT"
                          }
                        />
                      </div>
                      <div className="text-sm text-gray-600 mb-2">
                        {incident.description}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(incident.incident_time).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "vehicles" && (
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
              <Car className="mr-2 text-blue-500" size={24} />
              Vehicle Management
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-4 px-4 font-semibold text-gray-700">
                      Plate
                    </th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-700">
                      Entry Time
                    </th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-700">
                      Exit Time
                    </th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-700">
                      Payment
                    </th>
                    <th className="text-left py-4 px-4 font-semibold text-gray-700">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {parkingEntries.map((entry) => (
                    <tr
                      key={entry.id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-4 px-4 font-semibold text-gray-800">
                        {entry.car_plate}
                      </td>
                      <td className="py-4 px-4 text-gray-600">
                        {new Date(entry.entry_time).toLocaleString()}
                      </td>
                      <td className="py-4 px-4 text-gray-600">
                        {entry.exit_time
                          ? new Date(entry.exit_time).toLocaleString()
                          : "Still parked"}
                      </td>
                      <td className="py-4 px-4 text-gray-600">
                        {entry.due_payment ? `${entry.due_payment} RWF` : "N/A"}
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            entry.payment_status
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {entry.payment_status ? "Paid" : "Pending"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "security" && (
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
              <Shield className="mr-2 text-red-500" size={24} />
              Security Incidents
            </h3>
            <div className="space-y-4">
              {securityIncidents.map((incident) => (
                <div
                  key={incident.id}
                  className="p-6 bg-gradient-to-r from-red-50 to-orange-50 rounded-xl border border-red-100"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center">
                        <AlertTriangle className="text-white" size={24} />
                      </div>
                      <div>
                        <div className="font-bold text-gray-800">
                          {incident.car_plate}
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(incident.incident_time).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <IncidentBadge
                      type={
                        incident.incident_type as
                          | "UNAUTHORIZED_EXIT"
                          | "DOUBLE_ENTRY_ATTEMPT"
                          | "NO_ENTRY_EXIT_ATTEMPT"
                    
                      }
                    />
                  </div>
                  <div className="text-gray-700 mb-3">
                    {incident.description}
                  </div>
                  <div className="flex items-center justify-between">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        incident.resolved
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {incident.resolved ? "Resolved" : "Active"}
                    </span>
                    <button
                      onClick={() => {
                        setSelectedIncident(incident);
                        setShowDetails(true);
                      }}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "analytics" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Payment Status Pie Chart */}
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
              <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                <PieChart className="mr-2 text-purple-500" size={24} />
                Payment Status Distribution
              </h3>
              <div className="h-80">
                <canvas ref={pieChartRef}></canvas>
              </div>
            </div>

            {/* Security Incidents Bar Chart */}
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
              <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                <BarChart3 className="mr-2 text-indigo-500" size={24} />
                Incident Types
              </h3>
              <div className="h-80">
                <canvas ref={barChartRef}></canvas>
              </div>
            </div>

            {/* Revenue Trend Line Chart */}
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
              <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                <Activity className="mr-2 text-green-500" size={24} />
                Revenue Trend
              </h3>
              <div className="h-80">
                <canvas ref={lineChartRef}></canvas>
              </div>
            </div>

            {/* Activity Doughnut Chart */}
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
              <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                <PieChart className="mr-2 text-blue-500" size={24} />
                Parking Activity
              </h3>
              <div className="h-80">
                <canvas ref={doughnutChartRef}></canvas>
              </div>
            </div>
          </div>
        )}
      </div>
      {showDetails && selectedIncident && (
        <IncidentDetails
          incident={selectedIncident}
          onClose={() => setShowDetails(false)}
          onResolve={handleResolveIncident}
        />
      )}
    </div>
  );
};

export default Dashboard;
