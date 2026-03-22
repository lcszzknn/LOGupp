import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { User, LogOut } from 'lucide-react';
import { Logo } from './Logo';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="bg-neutral-900 shadow-sm border-b border-neutral-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20">
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2 text-xl font-semibold text-white">
              <Logo className="h-14 w-auto" />
            </Link>
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <Link
                  to={user.role === 'professional' ? '/dashboard' : user.role === 'admin' ? '/admin-dashboard' : '/client-dashboard'}
                  className="text-neutral-300 hover:text-white font-medium"
                >
                  Dashboard
                </Link>
                <div className="flex items-center gap-2 text-sm text-neutral-400 border-l pl-4 border-neutral-800">
                  <User className="h-4 w-4" />
                  <span>{user.name}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="text-neutral-400 hover:text-red-500 p-2 rounded-full hover:bg-neutral-800 transition-colors"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="bg-yellow-500 text-neutral-900 px-4 py-2 rounded-lg font-medium hover:bg-yellow-400 transition-colors"
                >
                  Entrar
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
