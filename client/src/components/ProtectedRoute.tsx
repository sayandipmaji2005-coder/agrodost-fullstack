import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2, Sprout } from 'lucide-react';

interface ProtectedRouteProps {
  children?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-agri-50 border border-agri-200 flex items-center justify-center text-agri-600 shadow-sm animate-pulse">
          <Sprout className="w-6 h-6 animate-bounce" />
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
          <Loader2 className="w-4 h-4 animate-spin text-agri-600" />
          <span>Verifying farmer authentication...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    // Immediately redirect unauthenticated users to /login with origin location state
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children ? <>{children}</> : null;
};
