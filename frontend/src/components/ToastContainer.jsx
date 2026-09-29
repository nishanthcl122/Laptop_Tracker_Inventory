import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle2, AlertOctagon, Info, X } from 'lucide-react';
import { toast } from '../utils/toast';

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const unsubscribe = toast.subscribe((newToast) => {
      setToasts((prev) => [...prev, newToast]);

      if (newToast.duration > 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
        }, newToast.duration);
      }
    });

    return () => unsubscribe();
  }, []);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col space-y-2 pointer-events-none max-w-sm w-full">
      {toasts.map((t) => {
        let borderClass = 'border-amber-200 bg-amber-50 text-amber-900';
        let Icon = AlertTriangle;
        let iconColor = 'text-amber-600';

        if (t.type === 'success') {
          borderClass = 'border-emerald-200 bg-emerald-50 text-emerald-900';
          Icon = CheckCircle2;
          iconColor = 'text-emerald-600';
        } else if (t.type === 'error') {
          borderClass = 'border-rose-200 bg-rose-50 text-rose-900';
          Icon = AlertOctagon;
          iconColor = 'text-rose-600';
        } else if (t.type === 'info') {
          borderClass = 'border-blue-200 bg-blue-50 text-blue-900';
          Icon = Info;
          iconColor = 'text-blue-600';
        }

        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start justify-between p-3 rounded-lg border shadow-lg transition-all duration-200 animate-in slide-in-from-top-2 fade-in ${borderClass}`}
          >
            <div className="flex items-start space-x-2.5">
              <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${iconColor}`} />
              <div className="text-xs font-semibold leading-relaxed">
                {t.message}
              </div>
            </div>
            <button
              type="button"
              onClick={() => removeToast(t.id)}
              className="ml-2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5 rounded transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
