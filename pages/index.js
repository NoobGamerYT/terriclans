import { useEffect, useState } from "react";
import { useTheme } from "../contexts/ThemeContext";

export default function Home() {
  const [clans, setClans] = useState([]);
  const [clanName, setClanName] = useState("");
  const [description, setDescription] = useState("");
  const [leader, setLeader] = useState("");
  const [memberCount, setMemberCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);
  const [error, setError] = useState("");
  const { theme, toggleTheme } = useTheme();

  // Fetch all clans from KV API
  const fetchClans = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/kv/clans");
      
      if (!res.ok) {
        if (res.status === 404) {
          // API endpoint might not exist yet
          setClans([]);
          return;
        }
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      setClans(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch clans:", err);
      setClans([]);
      setError("Unable to load clans. API might be unavailable.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClans();
  }, []);

  // Submit a clan request to KV API
  const sendRequest = async () => {
    // Validation
    if (!clanName.trim()) {
      alert("Please enter a clan name");
      return;
    }
    if (!description.trim()) {
      alert("Please enter a description");
      return;
    }
    if (!leader.trim()) {
      alert("Please enter a leader name");
      return;
    }
    
    setRequestLoading(true);
    setError("");

    try {
      const res = await fetch("/api/kv/requests", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ 
          clanName: clanName.trim(), 
          description: description.trim(), 
          leader: leader.trim(),
          memberCount: parseInt(memberCount) || 1
        }),
      });

      if (!res.ok) {
        let errorMessage = "Failed to send request";
        try {
          const errorData = await res.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          errorMessage = res.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const result = await res.json();
      alert("Clan request sent successfully! It will be reviewed by an admin.");
      
      // Reset form
      setClanName("");
      setDescription("");
      setLeader("");
      setMemberCount(1);
      
    } catch (err) {
      console.error("Request error:", err);
      alert(err.message || "Failed to send request. Please try again.");
      setError(err.message);
    } finally {
      setRequestLoading(false);
    }
  };

  // Handle form submit with Enter key
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !requestLoading) {
      sendRequest();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {/* Header with theme toggle */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">Terriclans</h1>
              <p className="text-gray-600 dark:text-gray-300 mt-1">Join or create gaming clans</p>
            </div>
            <div className="flex items-center gap-4">
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
              <span className="text-sm text-gray-500 dark:text-gray-400 hidden sm:inline">
                {theme === 'dark' ? 'Dark' : 'Light'}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 md:px-8 py-8">
        {/* Error Display */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Clans Display Section */}
        <section className="mb-10">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl md:text-2xl font-semibold text-gray-800 dark:text-white">
              Existing Clans
            </h2>
            <button 
              onClick={fetchClans}
              disabled={loading}
              className="text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-lg transition-colors duration-200"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-700 dark:border-gray-300"></span>
                  Loading...
                </span>
              ) : "Refresh"}
            </button>
          </div>
          
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Loading clans from database...</p>
            </div>
          ) : clans.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow border border-gray-200 dark:border-gray-700 text-center">
              <div className="text-gray-400 dark:text-gray-500 mb-3 text-4xl">🏰</div>
              <p className="text-gray-500 dark:text-gray-400 text-lg">No clans have been created yet.</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">Be the first to request a clan!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {clans.map((clan) => (
                <div
                  key={clan.id || clan.name}
                  className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow hover:shadow-lg transition-all duration-300 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600"
                >
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-xl text-gray-800 dark:text-white truncate pr-2">
                      {clan.name}
                    </h3>
                    <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap">
                      {clan.memberCount || clan.member_count || 1} members
                    </span>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 mb-4 line-clamp-3 leading-relaxed">
                    {clan.description}
                  </p>
                  <div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-600 dark:text-yellow-400">👑</span>
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {clan.leader || "Unknown"}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {clan.createdAt ? new Date(clan.createdAt).toLocaleDateString() : 
                       clan.created_at ? new Date(clan.created_at).toLocaleDateString() : ""}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Request Form Section */}
        <section className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="text-center mb-6">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white mb-2">
              Request a New Clan
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              Fill out the form below to submit a clan request for admin approval
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Clan Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g., Dragon Warriors"
                value={clanName}
                onChange={(e) => setClanName(e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                disabled={requestLoading}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Leader Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Your username"
                value={leader}
                onChange={(e) => setLeader(e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                disabled={requestLoading}
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                placeholder="Describe your clan's purpose, focus (PvE, PvP, social), rules, requirements, etc."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows="4"
                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition resize-none"
                disabled={requestLoading}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Initial Member Count
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={memberCount}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (!isNaN(val) && val >= 1) {
                    setMemberCount(val);
                  }
                }}
                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                disabled={requestLoading}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                How many members will start in the clan?
              </p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              <p className="flex items-center gap-2 mb-1">
                <span className="text-green-500">✓</span> All requests are reviewed by administrators
              </p>
              <p className="flex items-center gap-2">
                <span className="text-blue-500">⏱️</span> You'll be notified when your request is processed
              </p>
            </div>
            
            <button
              onClick={sendRequest}
              disabled={requestLoading}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold px-8 py-3.5 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 shadow-lg hover:shadow-xl"
            >
              {requestLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Sending Request...</span>
                </>
              ) : (
                <>
                  <span className="text-lg">🚀</span>
                  <span>Submit Clan Request</span>
                </>
              )}
            </button>
          </div>
        </section>
        
        {/* Footer Note */}
        <div className="mt-10 pt-6 border-t border-gray-200 dark:border-gray-700 text-center text-sm text-gray-500 dark:text-gray-400">
          <p className="flex items-center justify-center gap-2 mb-2">
            <span className="text-blue-500">ℹ️</span>
            <span>Clans are stored in Vercel KV database and visible to all users</span>
          </p>
          <p>Having issues? Check the browser console for detailed error messages</p>
        </div>
      </main>
    </div>
  );
}
