import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogOut, User, LayoutDashboard } from 'lucide-react';
import { logout as apiLogout } from '../api';

const Header = () => {
  const navigate = useNavigate();
  const email = localStorage.getItem('userEmail') || 'User';

  const handleLogout = async () => {
    try {
      await apiLogout();
    } catch (err) {
      console.error('Logout failed', err);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('userRole');
      window.location.href = '/login';
    }
  };

  return (
    <header className="border-b border-slate-800 bg-secondary/50 backdrop-blur-md sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="bg-primary p-2 rounded-lg text-white shrink-0">
              <LayoutDashboard size={20} />
            </div>
            <span className="text-lg md:text-xl font-bold text-white group-hover:text-primary transition-colors truncate">
              WeBook Bot
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-3 md:gap-6">
          <div className="flex items-center gap-2 text-slate-400">
            <User size={18} className="shrink-0" />
            <span className="text-xs md:text-sm font-medium truncate max-w-[100px] md:max-w-none">{email}</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-slate-400 hover:text-red-400 transition-colors text-xs md:text-sm font-medium shrink-0"
          >
            <LogOut size={18} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
