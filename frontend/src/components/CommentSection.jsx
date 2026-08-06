import { useEffect, useState } from 'react';
import { fetchComments, postComment, deleteComment, approveComment } from '../api';

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// Reusable comment thread. `isModerator` (official/admin) sees flagged/hidden
// comments with approve/delete controls; citizens only see approved comments
// and can delete their own.
export default function CommentSection({ token, reportId, currentUserId, isModerator = false }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    try {
      const data = await fetchComments(token, reportId);
      setComments(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId]);

  async function handlePost(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setPosting(true);
    setError('');
    setNotice('');
    try {
      const result = await postComment(token, reportId, text.trim());
      setText('');
      setNotice(result.message);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setPosting(false);
    }
  }

  async function handleDelete(commentId) {
    try {
      await deleteComment(token, reportId, commentId);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleApprove(commentId) {
    try {
      await approveComment(token, reportId, commentId);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="label-caps" style={{ marginBottom: 10 }}>Discussion</div>

      {error && <p className="error-text">{error}</p>}
      {notice && <p style={{ fontSize: 12, color: 'var(--on-surface-variant)', marginTop: -6, marginBottom: 12 }}>{notice}</p>}

      {loading ? (
        <p style={{ fontSize: 13, color: 'var(--on-surface-variant)' }}>Loading comments…</p>
      ) : comments.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--on-surface-variant)', marginBottom: 12 }}>No comments yet.</p>
      ) : (
        comments.map((c) => (
          <div key={c.id} style={{
            padding: '10px 12px', borderRadius: 8, marginBottom: 8,
            background: c.is_hidden ? 'var(--secondary-container)' : 'var(--surface-container-low)',
            opacity: c.is_hidden && !isModerator ? 0.6 : 1
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, fontSize: 12, color: 'var(--primary)' }}>{c.author_name}</span>
              <span className="mono" style={{ fontSize: 10, color: 'var(--on-surface-variant)' }}>{timeAgo(c.created_at)}</span>
            </div>
            <p style={{ fontSize: 13, margin: '4px 0' }}>{c.text}</p>

            {isModerator && c.is_flagged && (
              <div style={{ fontSize: 11, color: 'var(--on-secondary-container)', marginTop: 4 }}>
                ⚑ Flagged: {c.flagged_reason?.replace('_', ' ')}
                {c.is_hidden && (
                  <button
                    onClick={() => handleApprove(c.id)}
                    className="btn-secondary"
                    style={{ marginLeft: 8, padding: '2px 8px', fontSize: 11 }}
                  >
                    Approve
                  </button>
                )}
              </div>
            )}

            {(isModerator || c.user_id === currentUserId) && (
              <button
                onClick={() => handleDelete(c.id)}
                style={{ background: 'none', border: 'none', color: 'var(--error)', fontSize: 11, cursor: 'pointer', padding: 0, marginTop: 4 }}
              >
                Delete
              </button>
            )}
          </div>
        ))
      )}

      {!isModerator && (
        <form onSubmit={handlePost} style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add a comment…"
            maxLength={500}
            style={{ flex: 1, marginBottom: 0 }}
          />
          <button type="submit" className="btn-secondary" disabled={posting}>
            {posting ? '…' : 'Post'}
          </button>
        </form>
      )}
    </div>
  );
}