import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { ProtectedRoute } from './components/ProtectedRoute';

// Public Pages
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { NotFoundPage } from './pages/NotFoundPage';

// Private Pages
import { DashboardPage } from './pages/DashboardPage';
import { AddFarmPage } from './pages/AddFarmPage';
import { FarmDetailsPage } from './pages/FarmDetailsPage';
import { SatelliteAnalysisPage } from './pages/SatelliteAnalysisPage';
import { CameraScannerPage } from './pages/CameraScannerPage';
import { DiagnosisTreatmentPage } from './pages/DiagnosisTreatmentPage';
import { RecoveryTrackingPage } from './pages/RecoveryTrackingPage';
import { HistoryPage } from './pages/HistoryPage';
import { ProfilePage } from './pages/ProfilePage';

const RootRoute: React.FC = () => {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return null;
  }
  return user ? <Navigate to="/dashboard" replace /> : <LandingPage />;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <div className="flex flex-col min-h-screen">
          <Navbar />
          <main className="flex-grow">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<RootRoute />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ForgotPasswordPage />} />

              {/* Private Routes (Wrapped in ProtectedRoute) */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/farms"
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/farms/add"
                element={
                  <ProtectedRoute>
                    <AddFarmPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/farms/:id"
                element={
                  <ProtectedRoute>
                    <FarmDetailsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/satellite"
                element={
                  <ProtectedRoute>
                    <SatelliteAnalysisPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/scanner"
                element={
                  <ProtectedRoute>
                    <CameraScannerPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/camera"
                element={
                  <ProtectedRoute>
                    <CameraScannerPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/diagnosis"
                element={
                  <ProtectedRoute>
                    <DiagnosisTreatmentPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/diagnosis/:id"
                element={
                  <ProtectedRoute>
                    <DiagnosisTreatmentPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/recovery"
                element={
                  <ProtectedRoute>
                    <RecoveryTrackingPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/history"
                element={
                  <ProtectedRoute>
                    <HistoryPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />

              {/* Fallback */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
};
