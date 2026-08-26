import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { submitReport, verifyPhoto, analyzeIssue } from '../api';
import StatusTimeline from './StatusTimeline';

const CATEGORY_CHIPS = [
  { key: 'pothole', label: 'Pothole', icon: 'construction' },
  { key: 'water', label: 'Water', icon: 'water_drop' },
  { key: 'electricity', label: 'Electricity', icon: 'bolt' },
  { key: 'garbage', label: 'Garbage', icon: 'delete' },
  { key: 'sewage', label: 'Sewage', icon: 'water_damage' },
  { key: 'other', label: 'Other', icon: 'emergency_share' }
];

export default function ReportForm({ token }) {
  const [mode, setMode] = useState('text');
  const [description, setDescription] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [selectedChip, setSelectedChip] = useState(null);
  const [coords, setCoords] = useState(null);
  const [locationError, setLocationError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoCheck, setPhotoCheck] = useState(null); // { valid, issues, blur_score, brightness }
  const [checkingPhoto, setCheckingPhoto] = useState(false);

  function detectLocation() {
    if (!navigator.geolocation) {
      setLocationError('Location not supported on this browser');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationError('');
      },
      () => setLocationError('Could not detect location — enable location access')
    );
  }

  function startVoiceInput() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Voice input is not supported in this browser — try Chrome, or switch to typing');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.interimResults = false;

    recognition.onstart = () => setIsRecording(true);
    recognition.onend = () => setIsRecording(false);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setDescription((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };
    recognition.onerror = () => setIsRecording(false);

    recognition.start();
  }

  async function handlePhotoChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
    setPhotoCheck(null);
    setCheckingPhoto(true);

    try {
      const check = await verifyPhoto(token, file);
      setPhotoCheck(check);
      
      // Auto-analyze with Gemini
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64String = reader.result;
          const analysis = await analyzeIssue(token, base64String);
          if (analysis.description) {
             setDescription(prev => prev ? `${prev}\n\n[AI Extracted] ${analysis.description}` : analysis.description);
          }
          if (analysis.category) {
             setSelectedChip(analysis.category.toLowerCase());
          }
        } catch (aiErr) {
          console.warn("AI Analysis failed:", aiErr);
        }
      };
      reader.readAsDataURL(file);

    } catch {
      setPhotoCheck({ valid: false, issues: ['Could not verify photo — you can still submit'] });
    } finally {
      setCheckingPhoto(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!description.trim()) {
      setError('Please describe the issue before submitting');
      return;
    }
    if (!coords) {
      setError('Please detect your location before submitting');
      return;
    }

    setSubmitting(true);
    try {
      const data = await submitReport(token, {
        description,
        lat: coords.lat,
        lng: coords.lng
      });
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="app-shell">
        <div className="eyebrow">Report submitted</div>
        <h1 className="page-title">You're heard.</h1>
        <p className="page-sub">Report <span className="mono">#{result.id}</span> is now with the {result.category} department.</p>

        <div className="card result-card">
          <div className="tag-row">
            <span className="tag">{result.category}</span>
            <span className={`tag urgency-${result.urgency_score}`}>
              {result.urgency_score} urgency
            </span>
          </div>
          {result.is_duplicate && (
            <p style={{ fontSize: 13, color: 'var(--on-surface-variant)', marginTop: 12, marginBottom: 0 }}>
              This looks similar to an existing report (#{result.duplicate_of}) — we've linked it so your voice adds weight to that ticket instead of creating a duplicate.
            </p>
          )}
          {result.translated_text && (
            <p style={{ fontSize: 13, color: 'var(--on-surface-variant)', marginTop: 12, marginBottom: 0 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>translate</span>{' '}
              Translated for processing: <em>"{result.translated_text}"</em>
            </p>
          )}
        </div>

        <div className="card">
          <StatusTimeline currentStatus={result.status} />
        </div>

        <button className="btn-primary" onClick={() => { setResult(null); setDescription(''); setCoords(null); setSelectedChip(null); }}>
          Report another issue
        </button>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="eyebrow">Vexa AI</div>
      <h1 className="page-title">New grievance report</h1>
      <p className="page-sub">Speak or type — Vexa Intelligence classifies and routes it automatically.</p>

      <form onSubmit={handleSubmit}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span className="label-caps">Input method</span>
          </div>
          <div className="mode-toggle" style={{ position: 'relative' }}>
            <button type="button" className="mode-btn" onClick={() => setMode('text')} style={{ zIndex: 2 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>keyboard</span> Type
            </button>
            <button type="button" className="mode-btn" onClick={() => setMode('voice')} style={{ zIndex: 2 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>mic</span> Speak
            </button>
            <motion.div
              layoutId="mode-bg"
              className="mode-indicator"
              animate={{
                left: mode === 'text' ? '4px' : 'calc(50% - 2px)',
                width: 'calc(50% - 2px)'
              }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              style={{
                position: 'absolute',
                top: '4px',
                bottom: '4px',
                borderRadius: '9999px',
                background: 'var(--primary)',
                opacity: 0.1,
                pointerEvents: 'none'
              }}
            />
          </div>

          <AnimatePresence mode="wait">
            {mode === 'voice' && (
              <motion.div
                key="voice"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                style={{ overflow: 'hidden' }}
              >
                <div
                  className={`voice-surface ${isRecording ? 'recording' : ''}`}
                  onClick={startVoiceInput}
                  role="button"
                  tabIndex={0}
                >
                  <motion.span
                    animate={isRecording ? { scale: [1, 1.25, 1] } : { scale: 1 }}
                    transition={isRecording ? { duration: 1.2, repeat: Infinity } : {}}
                    className="material-symbols-outlined voice-icon"
                  >
                    {isRecording ? 'graphic_eq' : 'mic'}
                  </motion.span>
                  <span className="voice-label">{isRecording ? 'Listening for your lead…' : 'Tap to speak'}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <label htmlFor="description" style={{ marginTop: 12 }}>Describe the issue</label>
          <textarea
            id="description"
            rows={4}
            placeholder="e.g. There's a large pothole outside the community hall on Main Street"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <span className="label-caps">Select category</span>
          <div className="chip-row" style={{ marginTop: 8, marginBottom: 16 }}>
            {CATEGORY_CHIPS.map((c) => (
              <motion.button
                key={c.key}
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`chip ${selectedChip === c.key ? 'active' : ''}`}
                onClick={() => setSelectedChip(c.key)}
                style={{ position: 'relative' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{c.icon}</span>
                {c.label}
              </motion.button>
            ))}
          </div>

          <span className="label-caps">Photo evidence (optional)</span>
          <div style={{ marginTop: 8, marginBottom: 4 }}>
            <label
              htmlFor="photo-upload"
              className="btn-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add_a_photo</span>
              {photo ? 'Change photo' : 'Attach photo'}
            </label>
            <input
              id="photo-upload"
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              style={{ display: 'none' }}
            />
          </div>

          <AnimatePresence>
            {photoPreview && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, height: 0 }}
                animate={{ opacity: 1, scale: 1, height: 'auto' }}
                exit={{ opacity: 0, scale: 0.95, height: 0 }}
                transition={{ duration: 0.2 }}
                style={{ overflow: 'hidden', marginTop: 12, marginBottom: 12 }}
              >
                <img
                  src={photoPreview}
                  alt="Uploaded evidence"
                  style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 'var(--radius-md)', border: '1px solid var(--outline-variant)' }}
                />
                {checkingPhoto && (
                  <p style={{ fontSize: 12, color: 'var(--on-surface-variant)', marginTop: 6 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>hourglass_top</span> Checking photo quality…
                  </p>
                )}
                {photoCheck && !checkingPhoto && (
                  <motion.p
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      fontSize: 12, marginTop: 6, display: 'flex', alignItems: 'center', gap: 4,
                      color: photoCheck.valid ? '#166534' : 'var(--secondary)'
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                      {photoCheck.valid ? 'verified' : 'warning'}
                    </span>
                    {photoCheck.valid ? 'Photo verified — good quality' : (photoCheck.issues || []).join(', ')}
                  </motion.p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="card">
          <label>Location</label>
          <AnimatePresence mode="wait">
            {coords ? (
              <motion.p
                key="coords-text"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mono"
                style={{ fontSize: 13, color: 'var(--on-surface-variant)', marginBottom: 16 }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'var(--success)' }}>check_circle</span>{' '}
                {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)} — detected
              </motion.p>
            ) : (
              <motion.button
                key="coords-btn"
                exit={{ opacity: 0 }}
                type="button"
                className="btn-secondary"
                style={{ marginBottom: 16 }}
                onClick={detectLocation}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16, marginRight: 4 }}>location_on</span>
                Detect my location
              </motion.button>
            )}
          </AnimatePresence>
          {locationError && <p className="error-text">{locationError}</p>}

          {error && <p className="error-text">{error}</p>}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            className="btn-primary"
            disabled={submitting}
          >
            {submitting ? 'Submitting…' : 'Submit report'}
            {!submitting && <span className="material-symbols-outlined" style={{ fontSize: 18 }}>send</span>}
          </motion.button>
        </div>
      </form>
    </div>
  );
}