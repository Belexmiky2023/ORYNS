import React, { useState, useEffect, createContext, useContext } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';

// --- Auth Types ---
interface User {
  id: number;
  login: string;
  avatar_url: string;
  name: string;
  role: string;
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
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('error=')) {
      const match = hash.match(/error=([^&]*)/);
      if (match) setError(match[1].replace(/_/g, ' '));
    }
    fetchUser();
  }, []);

  const login = () => {
    // Standard secure redirect to backend
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
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#050505]/90 backdrop-blur-xl border-b border-[#00ff66]/20">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#00ff66] rounded flex items-center justify-center font-extrabold text-black text-xl">O</div>
          <span className="text-xl font-bold jetbrains tracking-tight uppercase">ORYN<span className="text-[#00ff66]">SERVER</span></span>
        </div>
        {user && (
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 bg-[#111] py-1 pl-1 pr-4 rounded-full border border-[#00ff66]/20 shadow-[0_0_15px_rgba(0,255,102,0.1)]">
              <img src={user.avatar_url} alt={user.login} className="w-8 h-8 rounded-full border border-[#00ff66]/40" />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white leading-tight">{user.login}</span>
                <span className="text-[10px] text-[#00ff66] uppercase jetbrains leading-tight">{user.role}</span>
              </div>
            </div>
            <button 
              onClick={logout}
              className="text-[10px] font-black jetbrains text-gray-500 hover:text-white transition-all tracking-[0.2em] uppercase"
            >
              EXIT_SESSION
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

const HomePage = () => {
  const { user, login, loading, error } = useAuth();
  const [connecting, setConnecting] = useState(false);

  const handleLogin = () => {
    setConnecting(true);
    login();
  };

  if (loading) return null;
  if (user) return <Navigate to="/dashboard" />;

  return (
    <div className="min-h-screen grid-bg flex flex-col items-center justify-center p-6">
      <div className="max-w-3xl w-full text-center space-y-12">
        <div className="space-y-4">
          <div className="inline-block px-4 py-1.5 bg-[#00ff66]/10 border border-[#00ff66]/30 rounded-full text-[#00ff66] text-xs font-black jetbrains tracking-[0.2em] uppercase">
            System Standby // Waiting for Auth
          </div>
          <h1 className="text-7xl md:text-9xl font-black tracking-tighter text-white leading-none">
            ORYN<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00ff66] to-[#00ccff] drop-shadow-[0_0_20px_rgba(0,255,102,0.4)] uppercase">Core</span>
          </h1>
        </div>

        {error && (
          <div className="max-w-md mx-auto p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 text-xs jetbrains animate-bounce">
            [ ERROR_DETECTION ]: {error.toUpperCase()}
          </div>
        )}
        
        <div className="flex flex-col items-center gap-6">
          <button 
            onClick={handleLogin}
            disabled={connecting}
            className={`group relative px-12 py-6 bg-[#00ff66] text-black font-black text-xl rounded-2xl transition-all transform hover:scale-105 active:scale-95 neon-glow flex items-center gap-4 ${connecting ? 'opacity-70 grayscale cursor-wait' : ''}`}
          >
            {connecting ? (
              <div className="w-6 h-6 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
                <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.43.372.823 1.102.823 2.222 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
              </svg>
            )}
            {connecting ? 'INITIALIZING HANDSHAKE...' : 'CONNECT GITHUB ACCOUNT'}
          </button>
          <div className="text-gray-600 text-[10px] jetbrains tracking-[0.4em] uppercase">
            Protocol: OAuth 2.0 // Location: Cloudflare Edge
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
    <div className="min-h-screen bg-[#050505] p-6 pt-32 animate-in fade-in duration-1000">
      <div className="max-w-6xl mx-auto">
        <header className="mb-16">
          <div className="flex items-center gap-4 mb-4">
             <span className="w-12 h-1 bg-[#00ff66]"></span>
             <h2 className="text-4xl font-black uppercase tracking-tighter italic">COMMAND_INTERFACE</h2>
          </div>
          <p className="text-gray-500 jetbrains tracking-widest uppercase text-xs">
            Linked Identity: <span className="text-[#00ff66]">{user.name}</span> // Security Level: <span className="text-white">{user.role.toUpperCase()}</span>
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          {[
            { label: 'Active nodes', value: '42', color: 'text-white' },
            { label: 'Security', value: 'OPTIMAL', color: 'text-[#00ff66]' },
            { label: 'Uptime', value: '99.98%', color: 'text-white' },
            { label: 'Latency', value: '12ms', color: 'text-[#00ff66]' },
          ].map((stat, i) => (
            <div key={i} className="p-6 bg-[#0c0c0c] border border-white/5 rounded-xl">
              <h3 className="text-gray-600 font-bold jetbrains text-[10px] uppercase tracking-widest mb-4">{stat.label}</h3>
              <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-[#0c0c0c] rounded-2xl border border-[#00ff66]/10 p-1">
          <div className="bg-[#050505] rounded-xl p-8 border border-white/5">
            <h3 className="font-bold jetbrains text-xs uppercase tracking-[0.3em] text-[#00ff66] mb-8">System Telemetry</h3>
            <div className="space-y-6">
              {[80, 45, 90, 60].map((w, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between text-[10px] jetbrains text-gray-600 uppercase">
                    <span>Channel_{i+1}</span>
                    <span>{w}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-[#00ff66] transition-all duration-1000" style={{ width: `${w}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const App = () => (
  <AuthProvider>
    <Navbar />
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  </AuthProvider>
);

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
);
