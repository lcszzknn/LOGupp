import React, { createContext, useContext, useState, ReactNode } from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';

type ToastType = 'success' | 'error';

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ message: string; type: ToastType, id: number } | null>(null);

  const showToast = (message: string, type: ToastType = 'success') => {
    const id = Date.now();
    setToast({ message, type, id });
    setTimeout(() => {
      setToast((current) => current?.id === id ? null : current);
    }, 4000);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className={`fixed bottom-6 right-6 z-50 transition-all duration-300 transform ${toast ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
        {toast && (
          <div className={`flex items-center gap-3 px-5 py-4 rounded-2xl shadow-xl border ${
            toast.type === 'success' 
              ? 'bg-emerald-950/90 border-emerald-900 text-emerald-400 backdrop-blur-md' 
              : 'bg-red-950/90 border-red-900 text-red-400 backdrop-blur-md'
          }`}>
            {toast.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
            <p className="font-medium text-sm">{toast.message}</p>
            <button onClick={() => setToast(null)} className="ml-4 hover:opacity-70 transition-opacity">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) throw new Error('useToast must be used within a ToastProvider');
  return context;
};
