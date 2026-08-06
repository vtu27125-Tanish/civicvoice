import { createContext, useCallback, useContext, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ToastContext = createContext(null);

const VARIANT_STYLE = {
  error: { bg: 'var(--error)', icon: 'error' },
  success: { bg: '#166534', icon: 'check_circle' },
  info: { bg: 'var(--primary-container)', icon: 'info' }
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, variant = 'error') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div style={{
        position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
        zIndex: 200, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center'
      }}>
        <AnimatePresence>
          {toasts.map((t) => {
            const style = VARIANT_STYLE[t.variant] || VARIANT_STYLE.info;
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: -24, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -16, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                style={{
                  background: style.bg, color: 'white', padding: '10px 16px',
                  borderRadius: 10, fontSize: 13, fontWeight: 500,
                  display: 'flex', alignItems: 'center', gap: 8,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.18)', maxWidth: 340
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{style.icon}</span>
                {t.message}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}