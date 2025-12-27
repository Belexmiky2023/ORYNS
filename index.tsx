import React, { useState, useEffect, createContext, useContext } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Routes, Route, Navigate, useSearchParams } from 'react-router-dom';

// --- Auth Types ---
interface User {
  id: number;
  login: string;
  avatar_url: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('Failed to fetch session', err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check for errors in the URL (e.g., from a failed redirect)
    const params = new URLSearchParams(window.location.hash.split('?')[1]);
    const err = params.get('error');
    if (err) {
      setError(err.replace(/_/g, ' '));
      // Clear URL error to prevent persistent error message on refresh
      window.history.replaceState({}, document.title, window.location.pathname + window.location.hash.split('?')[0]);
    }
    fetchUser();
  }, []);

  const login = () => {
    // Redirect to the worker initiation endpoint
    window.location.href = '/api/auth/github';
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      window.location.href = '#/';
    } catch (e) {
      console.error("Logout failed", e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

// --- Components ---

const Navbar = () => {
  const { user, logout } = useAuth();
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#050505]/80 backdrop-blur-md border-b border-[#00ff66]/20">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#00ff66] rounded flex items-center justify-center font-extrabold text-black text-xl">O</div>
          <span className="text-xl font-bold jetbrains tracking-tight uppercase">ORYN<span className="text-[#00ff66]">SERVER</span></span>
        </div>
        {user && (
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 bg-[#111] py-1.5 pl-1.5 pr-4 rounded-full border border-[#00ff66]/10">
              <img src={user.avatar_url} alt={user.login} className="w-8 h-8 rounded-full border border-[#00ff66]/40" />
              <span className="hidden sm:inline text-sm font-semibold text-white/90">{user.login}</span>
            </div>
            <button 
              onClick={logout}
              className="text-xs font-black jetbrains text-[#00ff66] hover:text-white transition-all tracking-widest uppercase"
            >
              [ LOGOUT ]
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

const HomePage = () => {
  const { user, login, loading, error } = useAuth();
  const [redirecting, setRedirecting] = useState(false);

  const handleLogin = () => {
    setRedirecting(true);
    login();
  };

  if (loading) return null;
  if (user) return <Navigate to="/dashboard" />;

  return (
    <div className="min-h-screen grid-bg flex flex-col items-center justify-center p-6 pt-20">
      <div className="max-w-3xl w-full text-center space-y-10">
        <div className="inline-block px-4 py-1.5 bg-[#00ff66]/10 border border-[#00ff66]/30 rounded-full text-[#00ff66] text-xs font-black jetbrains tracking-[0.2em] uppercase">
          Authorization Protocol v2.5
        </div>
        
        <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-white leading-none">
          SECURE <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00ff66] via-[#00ff66] to-[#00ccff] drop-shadow-[0_0_30px_rgba(0,255,102,0.3)]">ACCESS</span>
        </h1>
        
        <p className="text-gray-400 text-lg md:text-xl max-w-lg mx-auto leading-relaxed jetbrains font-light italic">
          Authenticate with GitHub to access the Oryn Server management console.
        </p>

        {error && (
          <div className="max-w-md mx-auto p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm jetbrains">
            <span className="font-bold">SYSTEM ERROR:</span> {error.toUpperCase()}
          </div>
        )}
        
        <div className="flex flex-col items-center gap-6 mt-12">
          <button 
            onClick={handleLogin}
            disabled={redirecting}
            className={`group relative px-10 py-5 bg-[#00ff66] text-black font-black text-xl rounded-xl transition-all transform hover:scale-105 active:scale-95 neon-glow flex items-center gap-4 ${redirecting ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {redirecting ? (
              <div className="w-6 h-6 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <svg className="w-7 h-7 fill-current" viewBox="0 0 24 24">
                <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.43.372.823 1.102.823 2.222 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
              </svg>
            )}
            {redirecting ? 'CONNECTING...' : 'LOGIN WITH GITHUB'}
          </button>
          <div className="text-gray-600 text-[10px] jetbrains tracking-[0.3em] uppercase space-y-2">
            <div>Encrypted Peer-to-Peer Session</div>
            <div>Auth Node: GitHub OAuth 2.0</div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/" />;

  return (
    <div className="min-h-screen bg-[#050505] p-6 pt-32 animate-in fade-in duration-700">
      <div className="max-w-5xl mx-auto">
        <header className="mb-16 border-l-4 border-[#00ff66] pl-8">
          <h2 className="text-5xl font-black mb-2 tracking-tighter uppercase">Command <span className="text-[#00ff66]">Center</span></h2>
          <p className="text-gray-500 jetbrains tracking-widest uppercase text-sm">Authenticated as: <span className="text-white">{user.name}</span></p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {[
            { label: 'Active Clusters', value: '12', trend: '+2' },
            { label: 'Live Votes', value: '8,421', trend: '+12%' },
            { label: 'Latency', value: '14ms', trend: 'STABLE' },
          ].map((stat, i) => (
            <div key={i} className="p-8 bg-[#0a0a0a] border border-[#00ff66]/10 rounded-2xl group hover:border-[#00ff66]/40 transition-all duration-500">
              <h3 className="text-[#00ff66] font-bold jetbrains text-xs uppercase tracking-widest mb-6 opacity-60 group-hover:opacity-100 transition-opacity">{stat.label}</h3>
              <div className="flex items-end justify-between">
                <p className="text-4xl font-black text-white">{stat.value}</p>
                <span className="text-[10px] font-bold jetbrains text-[#00ff66] bg-[#00ff66]/10 px-2 py-1 rounded">{stat.trend}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-[#0a0a0a] rounded-2xl overflow-hidden border border-[#00ff66]/5">
          <div className="px-8 py-6 border-b border-[#00ff66]/10 bg-[#0f0f0f] flex items-center justify-between">
            <h3 className="font-bold jetbrains text-sm uppercase tracking-widest">Real-time Telemetry</h3>
            <div className="flex gap-2">
              <div className="w-2 h-2 rounded-full bg-[#00ff66]"></div>
              <div className="w-2 h-2 rounded-full bg-[#00ff66]/20"></div>
              <div className="w-2 h-2 rounded-full bg-[#00ff66]/20"></div>
            </div>
          </div>
          <div className="p-12 text-center space-y-6">
            <div className="text-gray-500 jetbrains text-xs animate-pulse">Establishing handshake with Cloudflare Edge Network...</div>
            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden max-w-md mx-auto">
              <div className="w-1/2 h-full bg-[#00ff66] shadow-[0_0_10px_#00ff66] animate-[shimmer_3s_infinite_ease-in-out]"></div>
            </div>
            <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto pt-4">
               <div className="h-2 bg-white/5 rounded"></div>
               <div className="h-2 bg-white/5 rounded w-2/3"></div>
               <div className="h-2 bg-white/5 rounded w-1/2"></div>
               <div className="h-2 bg-white/5 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- App Root ---
const App = () => {
  return (
    <AuthProvider>
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </AuthProvider>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
);

// Global Styles for Shimmer
const style = document.createElement('style');
style.textContent = `
  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    50% { transform: translateX(150%); }
    100% { transform: translateX(-100%); }
  }
`;
document.head.appendChild(style);
