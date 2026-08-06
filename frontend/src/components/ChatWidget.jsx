import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE = 'http://localhost:5000/api';

export default function ChatWidget({ token }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { from: 'bot', text: "Hi! Ask me about your report status, or how to submit a new one." }
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  async function sendMessage(e) {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = input;
    setMessages((prev) => [...prev, { from: 'user', text: userMsg }]);
    setInput('');
    setSending(true);

    try {
      const res = await fetch(`${API_BASE}/reports/chatbot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: userMsg })
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { from: 'bot', text: data.reply || "Sorry, I couldn't process that." }]);
    } catch {
      setMessages((prev) => [...prev, { from: 'bot', text: "I'm having trouble connecting right now." }]);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.button
            key="chat-btn"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setOpen(true)}
            style={{
              position: 'fixed', bottom: 24, right: 24, width: 56, height: 56,
              borderRadius: '50%', background: 'var(--primary-container)', color: 'white',
              border: 'none', cursor: 'pointer', boxShadow: '0 8px 24px rgba(0,52,52,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 45
            }}
            aria-label="Open chat"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 26 }}>chat</span>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div
            key="chat-dialog"
            initial={{ scale: 0.85, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.85, opacity: 0, y: 40 }}
            transition={{ type: 'spring', stiffness: 320, damping: 24 }}
            style={{
              position: 'fixed', bottom: 24, right: 24, width: 320, maxHeight: 420,
              background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255,255,255,0.4)', borderRadius: 16,
              boxShadow: '0 12px 36px rgba(0,52,52,0.22)', display: 'flex', flexDirection: 'column', overflow: 'hidden',
              zIndex: 45
            }}
          >
            <div style={{ background: 'var(--primary-container)', color: 'white', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 14 }}>CivicVoice Assistant</span>
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: 16 }}>✕</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300 }}>
              <AnimatePresence initial={false}>
                {messages.map((m, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: m.from === 'user' ? 20 : -20, scale: 0.9 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                    style={{
                      alignSelf: m.from === 'user' ? 'flex-end' : 'flex-start',
                      background: m.from === 'user' ? 'var(--primary-container)' : 'var(--surface-container-high)',
                      color: m.from === 'user' ? 'white' : 'var(--on-surface)',
                      padding: '8px 12px', borderRadius: 12, fontSize: 13, maxWidth: '85%'
                    }}
                  >
                    {m.text}
                  </motion.div>
                ))}
              </AnimatePresence>
              {sending && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{ fontSize: 12, color: 'var(--on-surface-variant)', paddingLeft: 4 }}
                >
                  typing…
                </motion.div>
              )}
            </div>

            <form onSubmit={sendMessage} style={{ display: 'flex', borderTop: '1px solid var(--outline-variant)' }}>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your report..."
                style={{ flex: 1, border: 'none', padding: '12px 14px', fontSize: 13, outline: 'none', margin: 0, background: 'transparent' }}
              />
              <button type="submit" style={{ border: 'none', background: 'var(--primary-container)', color: 'white', padding: '0 18px', cursor: 'pointer', fontWeight: 600 }}>
                Send
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}