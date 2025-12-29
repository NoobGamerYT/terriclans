import { useEffect, useState } from "react";
import { useTheme } from "../contexts/ThemeContext";

export default function Admin() {
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [clans, setClans] = useState([]);
  const [requests, setRequests] = useState([]);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [leader, setLeader] = useState("");
  const [memberCount, setMemberCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [clanLoading, setClanLoading] = useState(false);
  const [requestActionLoading, setRequestActionLoading] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const { theme, toggleTheme } = useTheme();

  const showMessage = (text, type = "success") => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => {
      setMessage("");
      setMessageType("");
    }, 5000);
  };

  // Fetch data from KV API
  const fetchData = async () => {
    if (!isAuthenticated) return;
    
    setLoading(true);
    try {
      const [clanRes, reqRes] = await Promise.all([
        fetch("/api/kv/clans"),
        fetch("/api/kv/requests")
      ]);
      
      let clansData = [];
      let requestsData = [];
      
      if (clanRes.ok) {
        const data = await clanRes.json();
        clansData = Array.isArray(data) ? data : [];
      } else if (clanRes.status !== 404) {
        console.error("Failed to fetch clans:", clanRes.status);
      }
      
      if (reqRes.ok) {
        const data = await reqRes.json();
        requestsData = Array.isArray(data) ? data : [];
      } else if (reqRes.status !== 404) {
        console.error("Failed to fetch requests:", reqRes.status);
      }
      
      setClans(clansData);
      setRequests(requestsData);
    } catch (err) {
      console.error("Failed to load data:", err);
      showMessage("Failed to load data from database", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);

  // Verify admin password
  const verifyPassword = async () => {
    if (!password.trim()) {
      showMessage("Please enter admin password", "error");
      return;
    }

    // Simple password check - no API call needed
    const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin123';
    
    if (password.trim() !== ADMIN_PASSWORD) {
      showMessage("Incorrect admin password", "error");
      return;
    }
    
    setIsAuthenticated(true);
    showMessage("Access granted", "success");
  };

  // Add new clan via KV API
  const addClan = async () => {
    if (!password) {
      showMessage("Please enter admin password", "error");
      setIsAuthenticated(false);
      return;
    }
    
    if (!name.trim()) {
      showMessage("Please enter clan name", "error");
      return;
    }
    if (!desc.trim()) {
      showMessage("Please enter description", "error");
      return;
    }
    if (!leader.trim()) {
      showMessage("Please enter leader name", "error");
      return;
    }
    
    setClanLoading(true);

    try {
      const res = await fetch("/api/kv/clans", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ 
          password, 
          name: name.trim(), 
          description: desc.trim(),
          leader: leader.trim(),
          memberCount: parseInt(memberCount) || 1
        }),
      });
      
      if (!res.ok) {
        if (res.status === 401) {
          showMessage("Invalid password. Please re-enter.", "error");
          setIsAuthenticated(false);
          return;
        }
        
        let errorMessage = "Failed to add clan to database";
        try {
          const errorData = await res.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          errorMessage = res.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const result = await res.json();
      showMessage(`Clan "${name.trim()}" added successfully to database!`);
      
      // Reset form
      setName("");
      setDesc("");
      setLeader("");
      setMemberCount(1);
      
      // Refresh data
      fetchData();
    } catch (err) {
      console.error("Add clan error:", err);
      showMessage(err.message || "Failed to add clan to database", "error");
    } finally {
      setClanLoading(false);
    }
  };

  // Delete clan via KV API
  const deleteClan = async (id, clanName) => {
    if (!password) {
      showMessage("Session expired. Please re-enter password.", "error");
      setIsAuthenticated(false);
      return;
    }
    
    if (!confirm(`Are you sure you want to permanently delete clan "${clanName}"? This action cannot be undone and will remove it for all users.`)) {
      return;
    }

    try {
      const res = await fetch("/api/kv/clans", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, id }),
      });
      
      if (!res.ok) {
        if (res.status === 401) {
          showMessage("Session expired. Please re-enter password.", "error");
          setIsAuthenticated(false);
          return;
        }
        
        let errorMessage = "Failed to delete clan from database";
        try {
          const errorData = await res.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          errorMessage = res.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }
      
      showMessage(`Clan "${clanName}" deleted successfully from database!`);
      fetchData();
    } catch (err) {
      console.error("Delete clan error:", err);
      showMessage(err.message || "Failed to delete clan from database", "error");
    }
  };

  // Approve/Reject request via KV API
  const handleRequest = async (id, action, clanName) => {
    if (!password) {
      showMessage("Session expired. Please re-enter password.", "error");
      setIsAuthenticated(false);
      return;
    }
    
    const actionText = action === "approve" ? "approve" : "reject";
    if (!confirm(`Are you sure you want to ${actionText} the request for "${clanName}"?`)) {
      return;
    }

    setRequestActionLoading(id);

    try {
      const res = await fetch("/api/kv/requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, id, status: action === "approve" ? "approved" : "rejected" }),
      });
      
      if (!res.ok) {
        if (res.status === 401) {
          showMessage("Session expired. Please re-enter password.", "error");
          setIsAuthenticated(false);
          return;
        }
        
        let errorMessage = `Failed to ${action} request`;
        try {
          const errorData = await res.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          errorMessage = res.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }
      
      const result = await res.json();
      
      if (action === "approve") {
        showMessage(`Request approved! Clan "${clanName}" has been added to the database.`);
      } else {
        showMessage(`Request rejected.`);
      }
      
      fetchData();
    } catch (err) {
      console.error("Request action error:", err);
      showMessage(err.message || `Failed to ${action} request`, "error");
    } finally {
      setRequestActionLoading(null);
    }
  };

  const pendingRequests = requests.filter((r) => r.status === "pending");
  const approvedRequests = requests.filter((r) => r.status === "approved");
  const rejectedRequests = requests.filter((r) => r.status === "rejected");

  // Login screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex flex-col items-center justify-center p-4 transition-colors duration-200">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md">
          <div className="flex justify-between items-center mb-8">
            <div className="text-center flex-1">
              <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Admin Login</h1>
              <p className="text-gray-600 dark:text-gray-300">Enter admin password to access dashboard</p>
            </div>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200 ml-4"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? (
                <span className="text-yellow-500">☀️</span>
              ) : (
                <span className="text-gray-700">🌙</span>
              )}
            </button>
          </div>
          
          {message && (
            <div className={`mb-6 p-4 rounded-lg ${
              messageType === "error" 
                ? "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400" 
                : "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400"
            }`}>
              {message}
            </div>
          )}
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Admin Password
              </label>
              <input
                type="password"
                placeholder="Enter admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && verifyPassword()}
                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                autoFocus
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Default password: "admin123" (set in Vercel environment variables to change)
              </p>
            </div>
            
            <button
              onClick={verifyPassword}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3.5 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              Login to Admin Dashboard
            </button>
            
            <div className="text-center text-sm text-gray-500 dark:text-gray-400 pt-6 border-t border-gray-200 dark:border-gray-700">
              <p className="font-medium">⚠️ Protected Area</p>
              <p className="mt-1">Unauthorized access is strictly prohibited.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated dashboard
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-lg border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center justify-between md:justify-start w-full">
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white">Admin Dashboard</h1>
                <p className="text-gray-600 dark:text-gray-300 mt-1">Manage clans and review requests</p>
              </div>
              <div className="flex items-center gap-4 md:hidden">
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
                >
                  {theme === 'dark' ? (
                    <span className="text-yellow-500">☀️</span>
                  ) : (
                    <span className="text-gray-700">🌙</span>
                  )}
                </button>
                <button
                  onClick={() => {
                    setIsAuthenticated(false);
                    setPassword("");
                    showMessage("Logged out successfully", "success");
                  }}
                  className="bg-red-100 dark:bg-red-900/20 hover:bg-red-200 dark:hover:bg-red-800/30 text-red-700 dark:text-red-400 font-medium px-3 py-1.5 rounded-lg transition flex items-center gap-2"
                >
                  <span>🚪</span>
                  Logout
                </button>
              </div>
            </div>
            
            <div className="hidden md:flex items-center gap-6">
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
                  aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  {theme === 'dark' ? (
                    <span className="text-yellow-500">☀️</span>
                  ) : (
                    <span className="text-gray-700">🌙</span>
                  )}
                </button>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                </span>
              </div>
              <button
                onClick={() => {
                  setIsAuthenticated(false);
                  setPassword("");
                  showMessage("Logged out successfully", "success");
                }}
                className="bg-red-100 dark:bg-red-900/20 hover:bg-red-200 dark:hover:bg-red-800/30 text-red-700 dark:text-red-400 font-medium px-4 py-2.5 rounded-lg transition flex items-center gap-2"
              >
                <span>🚪</span>
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {/* Message Display */}
        {message && (
          <div className={`mb-8 p-4 rounded-lg ${
            messageType === "error" 
              ? "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400" 
              : "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400"
          }`}>
            <div className="flex items-center gap-3">
              {messageType === "error" ? "❌" : "✅"}
              <span className="font-medium">{message}</span>
            </div>
          </div>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Clans</p>
                <p className="text-3xl font-bold text-gray-800 dark:text-white mt-2">{clans.length}</p>
              </div>
              <div className="text-3xl text-blue-500">🏰</div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Pending Requests</p>
                <p className="text-3xl font-bold text-gray-800 dark:text-white mt-2">{pendingRequests.length}</p>
              </div>
              <div className="text-3xl text-yellow-500">⏳</div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Requests</p>
                <p className="text-3xl font-bold text-gray-800 dark:text-white mt-2">{requests.length}</p>
              </div>
              <div className="text-3xl text-green-500">📋</div>
            </div>
          </div>
        </div>

        {/* Create Clan Section */}
        <section className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-6">Create New Clan</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Clan Name <span className="text-red-500">*</span>
              </label>
              <input
                placeholder="Clan Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                disabled={clanLoading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Leader <span className="text-red-500">*</span>
              </label>
              <input
                placeholder="Leader Username"
                value={leader}
                onChange={(e) => setLeader(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                disabled={clanLoading}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                placeholder="Clan description"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition resize-none"
                rows="3"
                disabled={clanLoading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Member Count
              </label>
              <input
                type="number"
                min="1"
                value={memberCount}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (!isNaN(val) && val >= 1) setMemberCount(val);
                }}
                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                disabled={clanLoading}
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Clan will be added to Vercel KV database and visible to all users
            </p>
            <button
              onClick={addClan}
              disabled={clanLoading}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold px-8 py-3 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 shadow-lg hover:shadow-xl"
            >
              {clanLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Adding to Database...</span>
                </>
              ) : (
                <>
                  <span className="text-lg">➕</span>
                  <span>Create Clan</span>
                </>
              )}
            </button>
          </div>
        </section>

        {/* Existing Clans Section */}
        <section className="mb-10">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
              Existing Clans ({clans.length})
            </h2>
            <div className="flex items-center gap-3">
              <button 
                onClick={fetchData}
                disabled={loading}
                className="bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium px-4 py-2 rounded-lg transition text-sm flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-700 dark:border-gray-300"></div>
                    Refreshing...
                  </>
                ) : (
                  <>
                    <span>🔄</span>
                    Refresh All
                  </>
                )}
              </button>
            </div>
          </div>
          
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Loading from Vercel KV database...</p>
            </div>
          ) : clans.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 p-10 rounded-xl shadow border border-gray-200 dark:border-gray-700 text-center">
              <div className="text-gray-400 dark:text-gray-500 mb-4 text-5xl">🏰</div>
              <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">No clans in database yet</p>
              <p className="text-sm text-gray-400 dark:text-gray-500">Create your first clan using the form above</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {clans.map((c) => (
                <div
                  key={c.id || c.name}
                  className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-bold text-lg text-gray-800 dark:text-white truncate pr-2">
                      {c.name}
                    </h3>
                    <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-semibold px-3 py-1 rounded-full">
                      {c.memberCount || c.member_count || 1} members
                    </span>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 mb-5 line-clamp-3">
                    {c.description}
                  </p>
                  <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400 mb-5">
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-600 dark:text-yellow-400">👑</span>
                      <span className="font-medium">{c.leader || "Unknown"}</span>
                    </div>
                    {c.createdAt && (
                      <span className="text-xs">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => deleteClan(c.id, c.name)}
                    className="w-full bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-800/30 text-red-700 dark:text-red-400 font-medium px-4 py-2.5 rounded-lg transition flex items-center justify-center gap-3"
                  >
                    <span>🗑️</span>
                    Delete from Database
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Pending Requests Section */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-6">
            Pending Requests ({pendingRequests.length})
          </h2>
          
          {pendingRequests.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 p-10 rounded-xl shadow border border-gray-200 dark:border-gray-700 text-center">
              <div className="text-gray-400 dark:text-gray-500 mb-4 text-5xl">📭</div>
              <p className="text-gray-500 dark:text-gray-400 text-lg">No pending requests</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">New requests will appear here</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {pendingRequests.map((r) => (
                <div
                  key={r.id}
                  className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow border border-gray-200 dark:border-gray-700"
                >
                  <div className="mb-5">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-bold text-lg text-gray-800 dark:text-white">
                        {r.clanName}
                      </h3>
                      <span className="bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-xs font-semibold px-3 py-1 rounded-full">
                        Pending Review
                      </span>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 mb-4">
                      {r.description}
                    </p>
                    <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-400">
                      <div>
                        <span className="font-medium">Leader: </span>
                        <span>{r.leader}</span>
                      </div>
                      <div>
                        <span className="font-medium">Members: </span>
                        <span>{r.memberCount || 1}</span>
                      </div>
                    </div>
                    {r.createdAt && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                        Submitted: {new Date(r.createdAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => handleRequest(r.id, "approve", r.clanName)}
                      disabled={requestActionLoading === r.id}
                      className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-medium px-4 py-3 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-3"
                    >
                      {requestActionLoading === r.id ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Processing...
                        </>
                      ) : (
                        <>
                          <span>✓</span>
                          Approve & Add to DB
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleRequest(r.id, "reject", r.clanName)}
                      disabled={requestActionLoading === r.id}
                      className="flex-1 bg-gradient-to-r from-gray-400 to-gray-500 dark:from-gray-600 dark:to-gray-700 hover:from-gray-500 hover:to-gray-600 dark:hover:from-gray-700 dark:hover:to-gray-800 text-white font-medium px-4 py-3 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-3"
                    >
                      {requestActionLoading === r.id ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Processing...
                        </>
                      ) : (
                        <>
                          <span>✗</span>
                          Reject
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Footer Notes */}
        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="font-medium text-gray-700 dark:text-gray-300 mb-2">Database Information</p>
              <p>• All data stored in Vercel KV (Redis)</p>
              <p>• Visible to all users globally</p>
              <p>• Persists between deployments</p>
            </div>
            <div>
              <p className="font-medium text-gray-700 dark:text-gray-300 mb-2">Admin Information</p>
              <p>• Default password: "admin123"</p>
              <p>• Set ADMIN_PASSWORD in Vercel to change</p>
              <p>• All actions are logged</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
