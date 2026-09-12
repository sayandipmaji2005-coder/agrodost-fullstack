import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Sprout, 
  Map, 
  Satellite, 
  Camera, 
  Stethoscope, 
  Activity, 
  Menu, 
  X, 
  LogOut, 
  Languages 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, language, setLanguage } = useAuth();

  const navLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: Sprout },
    { name: 'Farms & Map', path: '/farms', icon: Map },
    { name: 'Satellite Monitor', path: '/satellite', icon: Satellite },
    { name: 'Camera Scanner', path: '/camera', icon: Camera },
    { name: 'Diagnosis & Treatment', path: '/diagnosis', icon: Stethoscope },
    { name: 'Recovery Tracking', path: '/recovery', icon: Activity },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 bg-agri-950/95 backdrop-blur-md border-b border-agri-900 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-agri-400 to-agri-600 flex items-center justify-center shadow-md shadow-agri-900/40 group-hover:scale-105 transition-transform">
              <Sprout className="w-6 h-6 text-agri-950 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-white flex items-center gap-1">
                AgriCare
              </span>
              <span className="block text-[10px] tracking-wider text-agri-300 uppercase font-semibold -mt-1">
                Agronomic Health AI
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname.startsWith(link.path);
              return (
                <Link
                  key={link.path}
                  to={user ? link.path : '/login'}
                  state={user ? undefined : { from: { pathname: link.path } }}
                  onClick={(e) => {
                    if (!user) {
                      e.preventDefault();
                      navigate('/login', { state: { from: { pathname: link.path } } });
                    }
                  }}
                  className={`px-3 py-2 rounded-xl text-xs lg:text-sm font-semibold flex items-center gap-2 transition-all ${
                    isActive
                      ? 'bg-agri-800/90 text-agri-300 shadow-inner'
                      : 'text-slate-300 hover:text-white hover:bg-agri-900/60'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{link.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Action Tools */}
          <div className="hidden md:flex items-center gap-3">
            {/* Language Toggle */}
            <button
              type="button"
              onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-agri-900 transition-colors flex items-center gap-1 text-xs font-semibold"
              title="Switch Language"
            >
              <Languages className="w-4 h-4 text-agri-400" />
              <span>{language === 'en' ? 'हिन्दी' : 'EN'}</span>
            </button>

            {/* User Profile / Auth State Buttons */}
            {user ? (
              <div className="flex items-center gap-2 pl-2 border-l border-agri-800">
                <Link
                  to="/profile"
                  className="flex items-center gap-2 text-xs font-medium text-slate-200 hover:text-white"
                >
                  <div className="w-8 h-8 rounded-full bg-agri-800 border border-agri-700 flex items-center justify-center text-agri-200 font-bold">
                    {user.fullName ? user.fullName[0].toUpperCase() : 'U'}
                  </div>
                  <span className="hidden xl:inline max-w-[120px] truncate">{user.fullName}</span>
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="p-2 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-agri-900 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 pl-2 border-l border-agri-800">
                <Link
                  to="/login"
                  className="px-3.5 py-1.5 text-slate-200 hover:text-white hover:bg-agri-900 text-xs font-bold rounded-xl transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="px-4 py-2 bg-agri-600 hover:bg-agri-500 text-white font-bold text-xs rounded-xl transition-all shadow-md"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-agri-900 transition-colors"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-agri-950 border-b border-agri-900 px-4 pt-2 pb-6 space-y-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname.startsWith(link.path);
            return (
              <Link
                key={link.path}
                to={user ? link.path : '/login'}
                state={user ? undefined : { from: { pathname: link.path } }}
                onClick={(e) => {
                  setMobileMenuOpen(false);
                  if (!user) {
                    e.preventDefault();
                    navigate('/login', { state: { from: { pathname: link.path } } });
                  }
                }}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-agri-800 text-agri-300'
                    : 'text-slate-300 hover:text-white hover:bg-agri-900'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span>{link.name}</span>
              </Link>
            );
          })}

          <div className="pt-4 border-t border-agri-900 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => {
                setLanguage(language === 'en' ? 'hi' : 'en');
                setMobileMenuOpen(false);
              }}
              className="flex items-center gap-1.5 text-agri-300 font-semibold"
            >
              <Languages className="w-4 h-4" />
              <span>Language: {language === 'en' ? 'Switch to हिन्दी' : 'Switch to English'}</span>
            </button>

            {user ? (
              <button
                type="button"
                onClick={() => {
                  handleLogout();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center gap-1 text-rose-400 font-semibold"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-slate-300 hover:text-white font-semibold"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-1 bg-agri-600 text-white rounded-lg font-bold"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
