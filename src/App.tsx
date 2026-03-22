import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import ClientRegister from './pages/ClientRegister';
import Dashboard from './pages/Dashboard';
import ClientDashboard from './pages/ClientDashboard';
import ProfessionalProfile from './pages/ProfessionalProfile';
import AdminDashboard from './pages/AdminDashboard';

const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) => {
  const { user, loading } = useAuth();

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;

  if (!user) return <Navigate to="/" />;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" />;
  }

  return <>{children}</>;
};

const AppContent = () => {
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-neutral-100 font-sans">
      {!isHomePage && <Navbar />}
      <main className={isHomePage ? "w-full h-screen flex items-center justify-center" : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<ClientRegister />} />
          <Route path="/professional/:id" element={<ProfessionalProfile />} />
          
          <Route path="/dashboard" element={
            <ProtectedRoute allowedRoles={['professional']}>
              <Dashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/client-dashboard" element={
            <ProtectedRoute allowedRoles={['client']}>
              <ClientDashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/admin-dashboard" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } />
        </Routes>
      </main>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
          <AppContent />
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
}
