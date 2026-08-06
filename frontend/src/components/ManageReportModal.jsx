import { useEffect, useState } from 'react';
import {
  fetchDuplicateCandidates, mergeReports, unmergeReports,
  reassignReport, fetchDepartments
} from '../api';
import CommentSection from './CommentSection';

export default function ManageReportModal({ token, reportId, onClose, onChanged }) {
  const [data, setData] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reassignDept, setReassignDept] = useState('');
  const [reassignCategory, setReassignCategory] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [dupData, deptData] = await Promise.all([
        fetchDuplicateCandidates(token, reportId),
        fetchDepartments(token)
      ]);
      setData(dupData);
      setDepartments(deptData);
      setReassignDept(dupData.report.department_id || '');
      setReassignCategory(dupData.report.category || '');
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

  async function handleMerge(candidateId) {
    setError('');
    try {
      await mergeReports(token, reportId, candidateId);
      await load();
      onChanged();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleUnmerge(linkId) {
    setError('');
    try {
      await unmergeReports(token, reportId, linkId);
      await load();
      onChanged();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleReassign() {
    setSaving(true);
    setError('');
    try {
      await reassignReport(token, reportId, {
        department_id: reassignDept || null,
        category: reassignCategory || null
      });
      await load();
      onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(19,27,46,0.5)', backdropFilter: 'blur(2px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20
    }}>
      <div style={{
        background: 'white', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 560,
        maxHeight: '85vh', overflowY: 'auto', padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.25)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, margin: 0 }}>Manage report #{reportId}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--on-surface-variant)' }}>✕</button>
        </div>

        {error && <p className="error-text">{error}</p>}

        {loading ? (
          <p style={{ fontSize: 14, color: 'var(--on-surface-variant)' }}>Loading…</p>
        ) : (
          <>
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 13, color: 'var(--on-surface-variant)', marginBottom: 4 }}>{data.report.description}</p>
              <span className="tag" style={{ textTransform: 'capitalize' }}>{data.report.category}</span>{' '}
              <span className={`tag urgency-${data.report.urgency_score}`}>{data.report.urgency_score}</span>
            </div>

            <div className="label-caps" style={{ marginBottom: 8 }}>Reassign department / category</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
              <select className="filter-select" style={{ flex: 1 }} value={reassignDept} onChange={(e) => setReassignDept(e.target.value)}>
                <option value="">No department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              <select className="filter-select" style={{ flex: 1 }} value={reassignCategory} onChange={(e) => setReassignCategory(e.target.value)}>
                <option value="pothole">Pothole</option>
                <option value="water">Water</option>
                <option value="electricity">Electricity</option>
                <option value="garbage">Garbage</option>
                <option value="sewage">Sewage</option>
                <option value="streetlight">Streetlight</option>
                <option value="other">Other</option>
              </select>
              <button className="btn-secondary" onClick={handleReassign} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>

            {data.linked.length > 0 && (
              <>
                <div className="label-caps" style={{ marginBottom: 8 }}>Linked duplicates</div>
                {data.linked.map((r) => (
                  <div key={r.link_id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 12px', background: 'var(--surface-container-low)', borderRadius: 8, marginBottom: 8
                  }}>
                    <div>
                      <span className="mono" style={{ fontSize: 12 }}>#{r.id}</span>{' '}
                      <span style={{ fontSize: 13 }}>{r.description.slice(0, 50)}...</span>
                      {r.similarity_score === 1 && (
                        <span style={{ fontSize: 11, color: 'var(--on-surface-variant)', marginLeft: 6 }}>(manual)</span>
                      )}
                    </div>
                    <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => handleUnmerge(r.link_id)}>
                      Unmerge
                    </button>
                  </div>
                ))}
              </>
            )}

            <div className="label-caps" style={{ marginBottom: 8, marginTop: 20 }}>
              Possible duplicates nearby (same category)
            </div>
            {data.candidates.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--on-surface-variant)' }}>No unlinked nearby reports found.</p>
            ) : (
              data.candidates.map((r) => (
                <div key={r.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 12px', border: '1px solid var(--outline-variant)', borderRadius: 8, marginBottom: 8
                }}>
                  <div>
                    <span className="mono" style={{ fontSize: 12 }}>#{r.id}</span>{' '}
                    <span style={{ fontSize: 13 }}>{r.description.slice(0, 50)}...</span>
                  </div>
                  <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => handleMerge(r.id)}>
                    Merge as duplicate
                  </button>
                </div>
              ))
            )}

            <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--outline-variant)' }}>
              <CommentSection token={token} reportId={reportId} isModerator />
            </div>
          </>
        )}
      </div>
    </div>
  );
}