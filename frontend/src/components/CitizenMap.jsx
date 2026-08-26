import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { fetchFeed } from '../api';

const URGENCY_COLOR = { high: '#BA1A1A', medium: '#FEB700', low: '#003434' };

const CATEGORY_LABEL = {
  pothole: 'Pothole', water: 'Water', electricity: 'Electricity',
  garbage: 'Garbage', sewage: 'Sewage', streetlight: 'Streetlight', other: 'Other'
};

export default function CitizenMap({ token }) {
  const [reports, setReports] = useState([]);
  const [myLocation, setMyLocation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeed(token)
      .then(setReports)
      .catch(() => setReports([]))
      .finally(() => setLoading(false));

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setMyLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {} // silently ignore — map still works without it, just centers on reports instead
      );
    }
  }, [token]);

  const center = myLocation
    ? [myLocation.lat, myLocation.lng]
    : reports.length > 0
      ? [reports[0].lat, reports[0].lng]
      : [13.0827, 80.2707];

  return (
    <div className="app-shell">
      <div className="eyebrow">Vexa AI</div>
      <h1 className="page-title" style={{ fontSize: 26 }}>Nearby reports</h1>
      <p className="page-sub">See what's already been reported around you — colored by urgency.</p>

      <div className="card map-card" style={{ height: 420 }}>
        {loading ? (
          <div className="empty-state">Loading map…</div>
        ) : (
          <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {myLocation && (
              <Marker position={[myLocation.lat, myLocation.lng]}>
                <Popup>You are here</Popup>
              </Marker>
            )}
            {reports.map((r) => (
              <CircleMarker
                key={r.id}
                center={[r.lat, r.lng]}
                radius={9}
                pathOptions={{ color: URGENCY_COLOR[r.urgency_score] || '#003434', fillOpacity: 0.75 }}
              >
                <Popup>
                  <strong>{CATEGORY_LABEL[r.category] || r.category}</strong><br />
                  Status: <span style={{ textTransform: 'capitalize' }}>{r.status.replace('_', ' ')}</span><br />
                  {r.vote_count > 0 && <>👍 {r.vote_count} confirmed<br /></>}
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        )}
      </div>

      <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 12, color: 'var(--on-surface-variant)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: URGENCY_COLOR.high, display: 'inline-block' }} /> High urgency
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: URGENCY_COLOR.medium, display: 'inline-block' }} /> Medium
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: URGENCY_COLOR.low, display: 'inline-block' }} /> Low
        </span>
      </div>
    </div>
  );
}