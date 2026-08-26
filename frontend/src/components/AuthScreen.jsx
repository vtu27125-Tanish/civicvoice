import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { login, register, verifyOtp, resendOtp } from '../api';

/* ── Variants ──────────────────────────────────────────────────── */
const pageVariants = {
  enter:  (d) => ({ x: d > 0 ? 60 : -60, opacity: 0, scale: 0.97 }),
  center: { x: 0, opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 380, damping: 28 } },
  exit:   (d) => ({ x: d < 0 ? 60 : -60, opacity: 0, scale: 0.97, transition: { duration: 0.18 } })
};

const shakeVariants = {
  shake: { x: [0,-8,8,-8,8,-4,4,0], transition: { duration: 0.35 } }
};

/* ── Floating Label Input ───────────────────────────────────────── */
function FloatingInput({ label, id, type = 'text', value, onChange, icon }) {
  const [focused, setFocused] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [autofilled, setAutofilled] = useState(false);
  const isPassword = type === 'password';
  const isFloating = focused || value.length > 0 || autofilled;

  return (
    <div style={{ position: 'relative', marginBottom: 8, marginTop: 30 }}>
      {/* Floating Label */}
      <motion.label
        htmlFor={id}
        animate={{
          y: isFloating ? -24 : 12,
          scale: isFloating ? 0.8 : 1,
          color: isFloating ? '#00E5CC' : '#4A5670'
        }}
        transition={{ type: 'spring', stiffness: 420, damping: 26 }}
        style={{
          position: 'absolute', left: icon ? 44 : 16, top: 0,
          pointerEvents: 'none', transformOrigin: 'left center',
          fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 500,
          letterSpacing: 0, textTransform: 'none', zIndex: 2, margin: 0
        }}
      >
        {label}
      </motion.label>

      {/* Icon */}
      {icon && (
        <span
          className="material-symbols-outlined"
          style={{
            position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
            color: isFloating ? 'var(--brand-teal)' : 'var(--text-muted)',
            fontSize: 18, transition: 'color 0.2s ease', zIndex: 2, pointerEvents: 'none'
          }}
        >{icon}</span>
      )}

      {/* Input */}
      <input
        id={id}
        className="fi-autofill-hook"
        type={isPassword ? (showPass ? 'text' : 'password') : type}
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onAnimationStart={(e) => {
          if (e.animationName === 'onAutoFillStart') setAutofilled(true);
          if (e.animationName === 'onAutoFillCancel') setAutofilled(false);
        }}
        style={{
          width: '100%', border: 'none',
          borderBottom: `2px solid ${focused ? 'var(--brand-teal)' : 'rgba(255,255,255,0.1)'}`,
          borderRadius: 0,
          padding: `16px ${isPassword ? 44 : 16}px 10px ${icon ? 44 : 16}px`,
          fontSize: 15, color: 'var(--text-primary)',
          background: 'transparent',
          outline: 'none', transition: 'border-color 0.25s ease',
          margin: 0, boxShadow: focused ? '0 2px 0 var(--brand-teal)' : 'none'
        }}
      />

      {/* Show/hide password */}
      {isPassword && (
        <button
          type="button"
          onClick={() => setShowPass(!showPass)}
          style={{
            position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', padding: 4, display: 'flex', alignItems: 'center'
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
            {showPass ? 'visibility_off' : 'visibility'}
          </span>
        </button>
      )}

      {/* Focus glow line */}
      <motion.div
        animate={{ scaleX: focused ? 1 : 0, opacity: focused ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        style={{
          position: 'absolute', bottom: -1, left: 0, right: 0, height: 2,
          background: 'linear-gradient(90deg, #00E5CC, #4F8EFF)',
          transformOrigin: 'left', borderRadius: 2
        }}
      />
    </div>
  );
}

/* ── OTP Input ──────────────────────────────────────────────────── */
function OtpInput({ length = 6, value, onChange }) {
  const refs = useRef([]);
  const arr = value.split('').concat(Array(length).fill('')).slice(0, length);

  function handleChange(i, val) {
    const d = val.replace(/\D/g, '').slice(-1);
    const next = [...arr]; next[i] = d;
    onChange(next.join(''));
    if (d && i < length - 1) refs.current[i + 1]?.focus();
  }

  function handleKeyDown(i, e) {
    if (e.key === 'Backspace' && !arr[i] && i > 0) {
      refs.current[i - 1]?.focus();
      const next = [...arr]; next[i - 1] = '';
      onChange(next.join(''));
    } else if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus();
    else if (e.key === 'ArrowRight' && i < length - 1) refs.current[i + 1]?.focus();
  }

  function handlePaste(e) {
    e.preventDefault();
    const p = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    onChange(p);
    refs.current[Math.min(p.length, length - 1)]?.focus();
  }

  return (
    <div style={{ display: 'flex', gap: 10, justifyContent: 'center', margin: '28px 0 20px' }}>
      {arr.map((digit, i) => (
        <motion.input
          key={i}
          ref={el => refs.current[i] = el}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={digit}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          onPaste={handlePaste}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: i * 0.05, type: 'spring', stiffness: 400, damping: 20 }}
          whileFocus={{ scale: 1.08 }}
          style={{
            width: 48, height: 56,
            borderRadius: 12,
            border: digit ? '2px solid var(--brand-teal)' : '2px solid rgba(255,255,255,0.1)',
            background: digit ? 'rgba(0,229,204,0.08)' : 'rgba(255,255,255,0.03)',
            textAlign: 'center', fontSize: 22, fontWeight: 700,
            fontFamily: "'JetBrains Mono', monospace",
            outline: 'none', color: 'var(--brand-teal)',
            transition: 'border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease',
            boxShadow: digit ? '0 0 14px rgba(0,229,204,0.2)' : 'none'
          }}
        />
      ))}
    </div>
  );
}

/* ── Logo Mark ──────────────────────────────────────────────────── */
function LogoMark() {
  return (
    <motion.div
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      style={{
        width: 64, height: 64,
        borderRadius: 20,
        background: 'linear-gradient(135deg, #7C3AED 0%, #06B6D4 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 8px 32px rgba(124,58,237,0.40)',
        margin: '0 auto 16px',
        position: 'relative'
      }}
    >
      <motion.div
        animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0, 0.4] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute', inset: -8, borderRadius: 28,
          border: '2px solid rgba(124,58,237,0.3)'
        }}
      />
      <span className="material-symbols-outlined" style={{ color: '#FFFFFF', fontSize: 32 }}>
        neurology
      </span>
    </motion.div>
  );
}

/* ── Floating Background Badges ─────────────────────────────────── */
const badgeData = [
  { icon: 'record_voice_over', title: 'Voice',     sub: 'Every voice matters',   top: '14%',  left: '6%',  align: 'left'  },
  { icon: 'verified_user',     title: 'Trust',      sub: 'Transparent & secure', top: '62%',  left: '8%',  align: 'left'  },
  { icon: 'groups',            title: 'Community',  sub: 'Stronger together',    top: '18%',  left: '86%', align: 'right' },
  { icon: 'trending_up',       title: 'Impact',     sub: 'Real change, real progress', top: '64%', left: '88%', align: 'right' }
];

function FloatingBadge({ icon, title, sub, top, left, align, delay }) {
  return (
    <motion.div
      className="auth-floating-badge"
      style={{
        position: 'fixed', top, left, transform: 'translate(-50%, -50%)',
        display: 'flex', flexDirection: 'column', alignItems: align === 'right' ? 'flex-end' : 'flex-start',
        gap: 6, pointerEvents: 'none', zIndex: 0, textAlign: align === 'right' ? 'right' : 'left', width: 150
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{
        opacity: [0.85, 1, 0.85],
        y: [0, -16, 0],
        x: [0, align === 'right' ? -6 : 6, 0]
      }}
      transition={{
        opacity: { duration: 0.6, delay },
        y: { duration: 6 + delay, repeat: Infinity, ease: 'easeInOut', delay },
        x: { duration: 7 + delay, repeat: Infinity, ease: 'easeInOut', delay }
      }}
    >
      <div style={{
        width: 42, height: 42, borderRadius: '50%',
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)',
        backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 8px 24px rgba(0,0,0,0.35)'
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'var(--brand-teal)' }}>
          {icon}
        </span>
      </div>
      <div>
        <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
          {title}
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.3 }}>
          {sub}
        </div>
      </div>
    </motion.div>
  );
}

function FloatingBadges() {
  return (
    <div className="auth-floating-layer">
      {badgeData.map((b, i) => (
        <FloatingBadge key={b.title} {...b} delay={i * 0.5} />
      ))}
    </div>
  );
}

/* ── Main AuthScreen ────────────────────────────────────────────── */
export default function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [direction, setDirection] = useState(0);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [pendingPurpose, setPendingPurpose] = useState('signup');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [shakeTrigger, setShakeTrigger] = useState(false);

  useEffect(() => {
    if (error) {
      setShakeTrigger(true);
      const t = setTimeout(() => setShakeTrigger(false), 400);
      return () => clearTimeout(t);
    }
  }, [error]);

  function goTo(newMode, dir) {
    setDirection(dir);
    setMode(newMode);
    setError('');
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError(''); setSubmitting(true);
    try {
      const data = await login(email, password);
      if (data.token) {
        onAuthenticated(data.token);
      }
    } catch (err) {
      if (err.requiresVerification) {
        setPendingEmail(err.email);
        setPendingPurpose(err.purpose);
        setNotice(err.message);
        goTo('otp', 1);
      } else {
        setError(err.message);
      }
    } finally { setSubmitting(false); }
  }

  async function handleSignup(e) {
    e.preventDefault();
    setError(''); setSubmitting(true);
    try {
      const data = await register(name, email, phone, password);
      setPendingEmail(data.email);
      setPendingPurpose(data.purpose);
      setNotice(data.message);
      goTo('otp', 1);
    } catch (err) { setError(err.message); }
    finally { setSubmitting(false); }
  }

  async function handleVerify(e) {
    e.preventDefault();
    setError(''); setSubmitting(true);
    try {
      const data = await verifyOtp(pendingEmail, otp, pendingPurpose);
      onAuthenticated(data.token);
    } catch (err) { setError(err.message); }
    finally { setSubmitting(false); }
  }

  async function handleResend() {
    setError(''); setResending(true);
    try {
      const data = await resendOtp(pendingEmail, pendingPurpose);
      setNotice(data.message);
    } catch (err) { setError(err.message); }
    finally { setResending(false); }
  }

  return (
    <div className="auth-layout">
      {/* ── Hero Panel (Desktop) ── */}
      <div className="auth-hero-panel">
        <div className="auth-hero-mesh" />
        <div className="auth-hero-content">
          <motion.h1
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="auth-hero-title"
          >
            Empowering<br />Civic Action
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="auth-hero-subtitle"
          >
            Join the next generation of civic participation. Report issues, engage with your community, and see real impact happen in real-time.
          </motion.p>
          <div style={{ position: 'absolute', inset: -40, pointerEvents: 'none' }}>
            <FloatingBadge icon="record_voice_over" title="Voice" sub="Every voice matters" top="10%" left="80%" align="right" delay={0.2} />
            <FloatingBadge icon="verified_user" title="Trust" sub="Transparent & secure" top="70%" left="15%" align="left" delay={0.4} />
            <FloatingBadge icon="groups" title="Community" sub="Stronger together" top="65%" left="85%" align="right" delay={0.6} />
          </div>
        </div>
      </div>

      {/* ── Form Panel ── */}
      <div className="auth-form-panel">
        <div className="auth-bg-wash" style={{ zIndex: -1 }} />
        <div style={{ position: 'absolute', inset: 0, zIndex: -1, pointerEvents: 'none', overflow: 'hidden' }}>
          {Array.from({ length: 16 }).map((_, i) => (
            <span
              key={i}
              className={`auth-particle${i % 2 ? ' emerald' : ''}`}
              style={{ left: `${(i * 6.3) % 100}%`, animationDuration: `${14 + (i % 5) * 3}s`, animationDelay: `${i * -1.3}s` }}
            />
          ))}
        </div>

        <div className="auth-form-container">
          <LogoMark />
          <AnimatePresence mode="wait" custom={direction}>
            {/* ── OTP View ─────────────────────── */}
            {mode === 'otp' && (
              <motion.div key="otp" custom={direction} variants={pageVariants} initial="enter" animate="center" exit="exit">
                <div style={{ textAlign: 'center', marginBottom: 28 }}>
                  <h1 style={{ fontSize: 26, marginBottom: 8, letterSpacing: '-0.03em' }}>Check your inbox</h1>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>
                    {notice || `We sent a 6-digit code to`}
                    {!notice && <><br /><strong style={{ color: 'var(--brand-teal)' }}>{pendingEmail}</strong></>}
                  </p>
                </div>
                <motion.form
                  onSubmit={handleVerify} animate={shakeTrigger ? 'shake' : ''} variants={shakeVariants}
                  style={{
                    background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 20, padding: 28, position: 'relative', overflow: 'hidden'
                  }}
                >
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(124,58,237,0.3), transparent)' }} />
                  <div style={{ textAlign: 'center', marginBottom: 4 }}><span className="label-caps">Verification Code</span></div>
                  <OtpInput value={otp} onChange={setOtp} />
                  <AnimatePresence>
                    {error && (
                      <motion.p initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        style={{ color: 'var(--error)', fontSize: 13, textAlign: 'center', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 15 }}>error</span>{error}
                      </motion.p>
                    )}
                  </AnimatePresence>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} type="submit" className="btn-primary" disabled={submitting || otp.length !== 6} style={{ marginBottom: 12 }}>
                    {submitting ? <><span className="material-symbols-outlined" style={{ fontSize: 16, animation: 'spin 1s linear infinite' }}>progress_activity</span>Verifying…</> : <><span className="material-symbols-outlined" style={{ fontSize: 16 }}>verified</span>Verify Code</>}
                  </motion.button>
                  <button type="button" onClick={handleResend} disabled={resending}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer', width: '100%', textAlign: 'center', transition: 'color 0.2s', padding: 4 }}>
                    {resending ? 'Sending…' : "Didn't receive it? Resend code"}
                  </button>
                </motion.form>
              </motion.div>
            )}

            {/* ── Login View ───────────────────── */}
            {mode === 'login' && (
              <motion.div key="login" custom={direction} variants={pageVariants} initial="enter" animate="center" exit="exit">
                <div style={{ textAlign: 'center', marginBottom: 28 }}>
                  <h1 style={{ fontSize: 28, marginBottom: 8, letterSpacing: '-0.03em' }}>Welcome back</h1>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Sign in to your Vexa AI account</p>
                </div>
                


                <motion.form
                  onSubmit={handleLogin} animate={shakeTrigger ? 'shake' : ''} variants={shakeVariants}
                  style={{
                    background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 20, padding: '28px 28px 24px', position: 'relative', overflow: 'hidden'
                  }}
                >
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(124,58,237,0.3), transparent)' }} />
                  <FloatingInput label="Email address" id="login-email" type="email" value={email} onChange={e => setEmail(e.target.value)} icon="mail" />
                  <FloatingInput label="Password" id="login-password" type="password" value={password} onChange={e => setPassword(e.target.value)} icon="lock" />
                  <AnimatePresence>
                    {error && (
                      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        style={{ background: 'rgba(255,92,107,0.1)', border: '1px solid rgba(255,92,107,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 14, marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--error)' }}>error</span>
                        <span style={{ color: 'var(--error)', fontSize: 13, fontWeight: 500 }}>{error}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} type="submit" className="btn-primary" disabled={submitting} style={{ marginTop: 8 }}>
                    {submitting ? <><span className="material-symbols-outlined" style={{ fontSize: 16 }}>progress_activity</span>Signing in…</> : <><span className="material-symbols-outlined" style={{ fontSize: 16 }}>login</span>Sign In</>}
                  </motion.button>
                </motion.form>
                <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--text-muted)', marginTop: 20 }}>
                  Don't have an account? <button onClick={() => goTo('signup', -1)} style={{ background: 'none', border: 'none', color: 'var(--brand-teal)', fontWeight: 600, cursor: 'pointer', fontSize: 14, textDecoration: 'none', transition: 'opacity 0.2s' }}>Create account →</button>
                </p>
              </motion.div>
            )}

            {/* ── Signup View ──────────────────── */}
            {mode === 'signup' && (
              <motion.div key="signup" custom={direction} variants={pageVariants} initial="enter" animate="center" exit="exit">
                <div style={{ textAlign: 'center', marginBottom: 28 }}>
                  <h1 style={{ fontSize: 28, marginBottom: 8, letterSpacing: '-0.03em' }}>Create account</h1>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Join Vexa AI and make your city better</p>
                </div>
                


                <motion.form
                  onSubmit={handleSignup} animate={shakeTrigger ? 'shake' : ''} variants={shakeVariants}
                  style={{
                    background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 20, padding: '28px 28px 24px', position: 'relative', overflow: 'hidden'
                  }}
                >
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(124,58,237,0.4), transparent)' }} />
                  <FloatingInput label="Full name" id="signup-name" type="text" value={name} onChange={e => setName(e.target.value)} icon="person" />
                  <FloatingInput label="Email address" id="signup-email" type="email" value={email} onChange={e => setEmail(e.target.value)} icon="mail" />
                  <FloatingInput label="Mobile number" id="signup-phone" type="tel" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} icon="phone_iphone" />
                  <FloatingInput label="Password (min. 6 characters)" id="signup-password" type="password" value={password} onChange={e => setPassword(e.target.value)} icon="lock" />
                  <AnimatePresence>
                    {error && (
                      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        style={{ background: 'rgba(255,92,107,0.1)', border: '1px solid rgba(255,92,107,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 14, marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--error)' }}>error</span>
                        <span style={{ color: 'var(--error)', fontSize: 13, fontWeight: 500 }}>{error}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} type="submit" className="btn-primary" disabled={submitting} style={{ marginTop: 8 }}>
                    {submitting ? <><span className="material-symbols-outlined" style={{ fontSize: 16 }}>progress_activity</span>Creating account…</> : <><span className="material-symbols-outlined" style={{ fontSize: 16 }}>person_add</span>Create Account</>}
                  </motion.button>
                </motion.form>
                <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--text-muted)', marginTop: 20 }}>
                  Already have an account? <button onClick={() => goTo('login', 1)} style={{ background: 'none', border: 'none', color: 'var(--brand-teal)', fontWeight: 600, cursor: 'pointer', fontSize: 14, transition: 'opacity 0.2s' }}>Sign in →</button>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 32 }}>
            Vexa AI · Intelligent civic platform
          </motion.p>
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}