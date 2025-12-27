import React, { useState, useEffect, createContext, useContext } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';

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
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

// --- Auth Provider ---
const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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
      console.error('Failed to fetch user', err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const login = () => {
    // Redirect to the worker endpoint that starts the OAuth flow
    window.location.href = '/api/auth/github';
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    window.location.href = '#/';
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
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
          <div className="w-8 h-8 bg-[#00ff66] rounded flex items-center justify-center font-bold text-black text-xl">O</div>
          <span className="text-xl font-bold jetbrains tracking-tight">ORYN<span className="text-[#00ff66]">SERVER</span></span>
        </div>
        {user && (
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <img src={user.avatar_url} alt={user.login} className="w-8 h-8 rounded-full border border-[#00ff66]/40" />
              <span className="hidden sm:inline text-sm font-medium">{user.login}</span>
            </div>
            <button 
              onClick={logout}
              className="text-sm font-bold text-[#00ff66] hover:text-[#00ff66]/80 transition-colors"
            >
              LOGOUT
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

const HomePage = () => {
  const { user, login, loading } = useAuth();

  if (loading) return null;
  if (user) return <Navigate to="/dashboard" />;

  return (
    <div className="min-h-screen grid-bg flex flex-col items-center justify-center p-6 pt-20">
      <div className="max-w-2xl w-full text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
        <div className="inline-block px-4 py-1 bg-[#00ff66]/10 border border-[#00ff66]/20 rounded-full text-[#00ff66] text-xs font-bold jetbrains mb-4 tracking-widest">
          EST. 2024
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter text-white">
          THE ULTIMATE <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00ff66] to-[#00ccff]">TOURNAMENT</span> HUB
        </h1>
        <p className="text-gray-400 text-lg md:text-xl max-w-lg mx-auto leading-relaxed">
          The next generation of competitive server management. Secure, fast, and built for elite organizers.
        </p>
        
        <div className="flex flex-col items-center gap-4 mt-8">
          <button 
            onClick={login}
            className="group relative px-8 py-4 bg-[#00ff66] text-black font-extrabold text-lg rounded-lg transition-all transform hover:scale-105 neon-glow flex items-center gap-3"
          >
            <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
              <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.43.372.823 1.102.823 2.222 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
            </svg>
            LOGIN WITH GITHUB
          </button>
          <p className="text-gray-500 text-sm jetbrains">NO CREDIT CARD REQUIRED. SECURE OAUTH 2.0.</p>
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
    <div className="min-h-screen bg-[#050505] p-6 pt-32">
      <div className="max-w-4xl mx-auto">
        <header className="mb-12">
          <h2 className="text-4xl font-bold mb-2">Welcome back, {user.name || user.login}</h2>
          <p className="text-gray-500 jetbrains tracking-widest uppercase text-xs">Access Level: Administrator</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-[#111] border border-[#00ff66]/10 rounded-xl hover:border-[#00ff66]/30 transition-all cursor-pointer">
            <h3 className="text-[#00ff66] font-bold mb-2">Active Tournaments</h3>
            <p className="text-3xl font-bold">12</p>
          </div>
          <div className="p-6 bg-[#111] border border-[#00ff66]/10 rounded-xl hover:border-[#00ff66]/30 transition-all cursor-pointer">
            <h3 className="text-[#00ff66] font-bold mb-2">Recent Votes</h3>
            <p className="text-3xl font-bold">1,248</p>
          </div>
          <div className="p-6 bg-[#111] border border-[#00ff66]/10 rounded-xl hover:border-[#00ff66]/30 transition-all cursor-pointer">
            <h3 className="text-[#00ff66] font-bold mb-2">Security Status</h3>
            <p className="text-3xl font-bold text-white flex items-center gap-2">
              <span className="w-3 h-3 bg-[#00ff66] rounded-full animate-pulse"></span>
              LIVE
            </p>
          </div>
        </div>

        <div className="mt-12 bg-[#111] rounded-xl overflow-hidden border border-[#00ff66]/5">
          <div className="p-6 border-b border-[#00ff66]/10 bg-[#161616]">
            <h3 className="font-bold">System Activity</h3>
          </div>
          <div className="p-8 text-center text-gray-500 space-y-4">
            <p className="jetbrains text-sm">Initializing secure connection to Cloudflare D1...</p>
            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
              <div className="w-1/3 h-full bg-[#00ff66] animate-[shimmer_2s_infinite]"></div>
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

// Define animation
const style = document.createElement('style');
style.textContent = `
  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(300%); }
  }
`;
document.head.appendChild(style);
