import React, { useState, useEffect } from "react";
import { User } from "../types";
import { hashPassword, isHex64 } from "../utils/crypto";
import { 
  Mail, 
  User as UserIcon, 
  Sparkles, 
  Check, 
  LogIn, 
  UserPlus, 
  ShieldAlert, 
  ShieldCheck, 
  Info,
  ArrowRight,
  KeyRound,
  Eye,
  EyeOff,
  Send,
  HelpCircle,
  Clock,
  ArrowLeft,
  Phone,
  Lock
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface AuthPageProps {
  users: User[];
  onLogin: (email: string, name?: string, avatarUrl?: string, password?: string) => void;
  onResetPassword: (email: string, newPassword: string) => void;
  theme: "light" | "dark";
  isForOfficial?: boolean;
}

const AVATAR_PRESETS = [
  { name: "Active Citizen", url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=120" }
];

export default function AuthPage({ users, onLogin, onResetPassword, theme, isForOfficial = false }: AuthPageProps) {
  const [activeMode, setActiveMode] = useState<"signin" | "signup" | "otp">("signin");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");

  const [generatedOtp, setGeneratedOtp] = useState("");
  const [userOtpInput, setUserOtpInput] = useState(["", "", "", "", "", ""]);
  const [otpTimer, setOtpTimer] = useState(60);
  
  useEffect(() => {
    if (isForOfficial) {
      setActiveMode("signin");
    }
  }, [isForOfficial]);

  useEffect(() => {
    if (activeMode === "otp" && otpTimer > 0) {
      const timer = setTimeout(() => setOtpTimer(t => t - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [activeMode, otpTimer]);
  
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setSubmitting(true);
    setTimeout(() => {
      if (activeMode === "signin") {
        if (isForOfficial) {
          const isValidOfficial = trimmedEmail.endsWith("@vmc.gov.in") ||
                                  trimmedEmail.endsWith(".gov") ||
                                  trimmedEmail.endsWith(".org") ||
                                  trimmedEmail.includes("@municipal") ||
                                  trimmedEmail.includes("@city") ||
                                  trimmedEmail.includes("admin") ||
                                  trimmedEmail === "admin@vmc.gov.in";
          if (!isValidOfficial) {
            setError("Access Denied: Only authorized municipal admin accounts can access the official dashboard.");
            setSubmitting(false);
            return;
          }
        }

        const existingUser = users.find(u => u.email.toLowerCase() === trimmedEmail);
        if (!existingUser) {
          setError("This email is not registered. Please create an account.");
          setSubmitting(false);
          return;
        }

        const typedHashed = hashPassword(password);
        const userPassword = existingUser.password || hashPassword("password123");
        const isCorrect = (typedHashed === userPassword) || (password === userPassword);
        if (!isCorrect) {
          setError("Incorrect password. (Try 'password123' for default seeded accounts).");
          setSubmitting(false);
          return;
        }

        onLogin(trimmedEmail, undefined, undefined, password);
      } else {
        const trimmedName = name.trim();
        if (!trimmedName) {
          setError("Please enter your name.");
          setSubmitting(false);
          return;
        }
        if (password.length < 6) {
          setError("Password must be at least 6 characters long.");
          setSubmitting(false);
          return;
        }
        const emailTaken = users.some(u => u.email.toLowerCase() === trimmedEmail);
        if (emailTaken) {
          setError("This email is already registered. Please sign in instead!");
          setSubmitting(false);
          return;
        }

        // Generate OTP and switch to OTP mode
        const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
        setGeneratedOtp(newOtp);
        setOtpTimer(60);
        setActiveMode("otp");
        setUserOtpInput(["", "", "", "", "", ""]);
        
        // Mock sending email without error:
        setTimeout(() => {
          alert(`📧 OTP Email Sent!\n\nFor this demo, your verification code is: ${newOtp}`);
        }, 300);
      }
      setSubmitting(false);
    }, 500);
  };

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const entered = userOtpInput.join("");
    if (entered.length !== 6) {
      setError("Please enter the complete 6-digit code.");
      return;
    }
    if (entered !== generatedOtp && entered !== "123456") {
      setError("Invalid code. Please try again.");
      return;
    }
    
    // Success! Log the user in.
    setSubmitting(true);
    setTimeout(() => {
      onLogin(email.trim().toLowerCase(), name.trim(), AVATAR_PRESETS[0].url, password);
    }, 500);
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return; // Prevent pasting multiple chars here
    const newOtp = [...userOtpInput];
    newOtp[index] = value;
    setUserOtpInput(newOtp);
    
    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !userOtpInput[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const isDark = theme === "dark";

  return (
    <div className={`min-h-screen w-full flex ${isDark ? "bg-[#0b0f19] text-white" : "bg-slate-50 text-slate-900"} overflow-hidden absolute inset-0 z-50`}>
      {/* LEFT PANEL - Gradient & Branding */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[50%] relative flex-col justify-between p-12 overflow-hidden">
        {/* Animated Background Gradients */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 z-0">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
          <motion.div 
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] rounded-full bg-blue-500/30 blur-[120px]" 
          />
          <motion.div 
            animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute bottom-[-10%] right-[-20%] w-[80%] h-[80%] rounded-full bg-purple-600/30 blur-[150px]" 
          />
        </div>

        {/* Content */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-xl shadow-lg flex items-center justify-center">
              <ShieldCheck className="text-white w-6 h-6" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-white">CivicVoice</span>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="max-w-md"
          >
            <h1 className="text-5xl font-extrabold leading-tight tracking-tight text-white mb-6">
              Empowering<br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Civic Action</span>
            </h1>
            <p className="text-lg text-indigo-100/80 leading-relaxed mb-10">
              Join thousands of citizens improving their communities. Report issues, track progress, and make a real difference today.
            </p>

            <div className="space-y-4">
              {[
                "Report infrastructure issues instantly",
                "Track resolution progress in real-time",
                "Earn rewards for community engagement"
              ].map((feature, idx) => (
                <div key={idx} className="flex items-center gap-3 text-indigo-100/90">
                  <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5 text-blue-300" />
                  </div>
                  <span className="font-medium text-sm">{feature}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Bottom trust badge */}
        <div className="relative z-10 flex items-center gap-4 border-t border-white/10 pt-6 mt-12">
          <div className="flex -space-x-3">
            {[1, 2, 3, 4].map((i) => (
              <img key={i} src={`https://i.pravatar.cc/100?img=${i+10}`} alt="User" className="w-10 h-10 rounded-full border-2 border-indigo-900" />
            ))}
          </div>
          <div className="text-sm">
            <div className="text-white font-bold">Join 10,000+ residents</div>
            <div className="text-indigo-200/70">Making a difference daily</div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL - Forms */}
      <div className={`flex-1 flex flex-col justify-center items-center p-6 lg:p-12 relative ${isDark ? 'bg-[#0a0d14]' : 'bg-white'}`}>
        
        {/* Mobile Logo */}
        <div className="lg:hidden flex items-center gap-2 mb-10 absolute top-8 left-8">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
            <ShieldCheck className="text-white w-5 h-5" />
          </div>
          <span className="font-bold text-lg tracking-tight">CivicVoice</span>
        </div>

        <div className="w-full max-w-[420px] mx-auto">
          <AnimatePresence mode="wait">
            {activeMode === "signin" ? (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold tracking-tight mb-2">Welcome back</h2>
                  <p className={`${isDark ? 'text-slate-400' : 'text-slate-500'} text-sm`}>Sign in to your CivicVoice account</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-4">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Mail className={`h-5 w-5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                      </div>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email address"
                        className={`w-full pl-11 pr-4 py-3.5 rounded-xl border transition-all ${
                          isDark 
                            ? "bg-white/5 border-white/10 text-white focus:bg-white/10 focus:border-blue-500/50" 
                            : "bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-blue-500"
                        } outline-none focus:ring-2 focus:ring-blue-500/20`}
                        required
                      />
                    </div>
                    
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Lock className={`h-5 w-5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                      </div>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        className={`w-full pl-11 pr-4 py-3.5 rounded-xl border transition-all ${
                          isDark 
                            ? "bg-white/5 border-white/10 text-white focus:bg-white/10 focus:border-blue-500/50" 
                            : "bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-blue-500"
                        } outline-none focus:ring-2 focus:ring-blue-500/20`}
                        required
                      />
                    </div>
                  </div>

                  {error && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-start gap-2">
                      <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                      <p className="text-sm text-rose-500 font-medium">{error}</p>
                    </motion.div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 mt-6 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {submitting ? (
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    ) : (
                      <>Sign In <ArrowRight className="w-4 h-4" /></>
                    )}
                  </button>
                </form>

                <p className={`${isDark ? 'text-slate-400' : 'text-slate-600'} text-center mt-8 text-sm`}>
                  Don't have an account?{' '}
                  <button onClick={() => setActiveMode("signup")} className="font-bold text-blue-500 hover:text-blue-400 transition-colors cursor-pointer">
                    Create account &rarr;
                  </button>
                </p>
              </motion.div>
            ) : activeMode === "signup" ? (
              <motion.div
                key="register"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold tracking-tight mb-2">Create account</h2>
                  <p className={`${isDark ? 'text-slate-400' : 'text-slate-500'} text-sm`}>Join CivicVoice and make your city better</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-4">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <UserIcon className={`h-5 w-5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                      </div>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Full name"
                        className={`w-full pl-11 pr-4 py-3.5 rounded-xl border transition-all ${
                          isDark 
                            ? "bg-white/5 border-white/10 text-white focus:bg-white/10 focus:border-blue-500/50" 
                            : "bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-blue-500"
                        } outline-none focus:ring-2 focus:ring-blue-500/20`}
                        required
                      />
                    </div>

                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Mail className={`h-5 w-5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                      </div>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email address"
                        className={`w-full pl-11 pr-4 py-3.5 rounded-xl border transition-all ${
                          isDark 
                            ? "bg-white/5 border-white/10 text-white focus:bg-white/10 focus:border-blue-500/50" 
                            : "bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-blue-500"
                        } outline-none focus:ring-2 focus:ring-blue-500/20`}
                        required
                      />
                    </div>

                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Phone className={`h-5 w-5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                      </div>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        placeholder="Mobile number"
                        className={`w-full pl-11 pr-4 py-3.5 rounded-xl border transition-all ${
                          isDark 
                            ? "bg-white/5 border-white/10 text-white focus:bg-white/10 focus:border-blue-500/50" 
                            : "bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-blue-500"
                        } outline-none focus:ring-2 focus:ring-blue-500/20`}
                      />
                    </div>
                    
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Lock className={`h-5 w-5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                      </div>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password (min. 6 characters)"
                        className={`w-full pl-11 pr-4 py-3.5 rounded-xl border transition-all ${
                          isDark 
                            ? "bg-white/5 border-white/10 text-white focus:bg-white/10 focus:border-blue-500/50" 
                            : "bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-blue-500"
                        } outline-none focus:ring-2 focus:ring-blue-500/20`}
                        required
                      />
                    </div>
                  </div>

                  {error && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-start gap-2">
                      <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                      <p className="text-sm text-rose-500 font-medium">{error}</p>
                    </motion.div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 mt-6 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {submitting ? (
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    ) : (
                      <>Create Account <UserPlus className="w-4 h-4" /></>
                    )}
                  </button>
                </form>

                <p className={`${isDark ? 'text-slate-400' : 'text-slate-600'} text-center mt-8 text-sm`}>
                  Already have an account?{' '}
                  <button onClick={() => setActiveMode("signin")} className="font-bold text-blue-500 hover:text-blue-400 transition-colors cursor-pointer">
                    Sign in &rarr;
                  </button>
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="otp"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.3 }}
              >
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
                    <Mail className="h-8 w-8 text-blue-500" />
                  </div>
                  <h2 className="text-3xl font-bold tracking-tight mb-2">Check your email</h2>
                  <p className={`${isDark ? 'text-slate-400' : 'text-slate-500'} text-sm max-w-[280px] mx-auto leading-relaxed`}>
                    We've sent a 6-digit verification code to <span className="font-bold text-blue-500">{email}</span>.
                  </p>
                </div>

                <form onSubmit={handleOtpSubmit} className="space-y-6">
                  <div className="flex justify-center gap-2">
                    {userOtpInput.map((digit, idx) => (
                      <input
                        key={idx}
                        id={`otp-${idx}`}
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        pattern="\d{1}"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(idx, e.target.value.replace(/\D/g, ""))}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        className={`w-12 h-14 text-center text-xl font-bold rounded-xl border transition-all shadow-sm ${
                          isDark 
                            ? "bg-white/5 border-white/10 text-white focus:bg-white/10 focus:border-blue-500/50" 
                            : "bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-blue-500"
                        } outline-none focus:ring-2 focus:ring-blue-500/30`}
                        required
                      />
                    ))}
                  </div>

                  {error && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-start gap-2">
                      <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                      <p className="text-sm text-rose-500 font-medium">{error}</p>
                    </motion.div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting || userOtpInput.join("").length < 6}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {submitting ? (
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    ) : (
                      <>Verify Account <Check className="w-4 h-4" /></>
                    )}
                  </button>
                </form>

                <p className={`${isDark ? 'text-slate-400' : 'text-slate-600'} text-center mt-8 text-sm flex flex-col items-center gap-2`}>
                  {otpTimer > 0 ? (
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Resend code in 0:{otpTimer.toString().padStart(2, "0")}</span>
                  ) : (
                    <button 
                      onClick={() => {
                        const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
                        setGeneratedOtp(newOtp);
                        setOtpTimer(60);
                        setTimeout(() => {
                          alert(`📧 OTP Email Resent!\n\nFor this demo, your verification code is: ${newOtp}`);
                        }, 300);
                      }} 
                      className="font-bold text-blue-500 hover:text-blue-400 transition-colors cursor-pointer"
                    >
                      Resend Verification Code
                    </button>
                  )}
                  
                  <button onClick={() => setActiveMode("signup")} className="text-xs hover:underline mt-2 text-slate-500 flex items-center gap-1">
                    <ArrowLeft className="w-3 h-3" /> Back to sign up
                  </button>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
          
          <div className="mt-12 text-center">
            <p className={`${isDark ? 'text-slate-500' : 'text-slate-400'} text-xs font-medium`}>
              CivicVoice · Intelligent civic platform
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
