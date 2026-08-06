# CivicVoice — AI-Powered Civic Grievance Redressal Platform

Citizens report local issues (potholes, water leaks, garbage, electricity faults) via
voice or text — an ML microservice auto-categorizes and prioritizes each report, and
officials track/resolve them on a real-time dashboard.

## Project Structure
```
civicvoice/
├── backend/          # Node.js + Express + MySQL + Socket.IO
│   ├── src/
│   │   ├── config/db.js
│   │   ├── middleware/auth.js
│   │   ├── routes/authRoutes.js
│   │   ├── routes/reportRoutes.js
│   │   └── server.js
│   └── database/schema.sql
├── ml-service/       # Python + FastAPI (classification microservice)
│   ├── main.py
│   ├── train_classifier.py
│   └── data/labeled_complaints.csv
└── frontend/         # React (to be built next)
```

## Setup — Backend
```bash
cd backend
npm install
cp .env.example .env      # fill in your MySQL password + JWT secret
mysql -u root -p < database/schema.sql
npm run dev                # starts on http://localhost:5000
```

## Setup — ML Service
```bash
cd ml-service
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
Test it:
```bash
curl -X POST http://localhost:8000/classify \
  -H "Content-Type: application/json" \
  -d '{"text": "Sewage overflowing near the school, dangerous"}'
```

## Training the real classifier (Week 5 task)
1. Expand `ml-service/data/labeled_complaints.csv` to 200–500 rows across all categories
2. Run `python train_classifier.py`
3. It saves `model.pkl` + `vectorizer.pkl` — restart `main.py`, it auto-loads them

## API Endpoints (Backend)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Create citizen/official account |
| POST | /api/auth/login | Login, returns JWT |
| POST | /api/reports | Submit a new report (auto-classified) |
| GET | /api/reports | List reports (filterable by category/status/urgency) |
| GET | /api/reports/:id | Report detail + status history |
| PATCH | /api/reports/:id/status | Official updates status |
| GET | /api/reports/analytics/summary | Dashboard stats |

## What's Next
- [ ] React frontend (citizen report form + official dashboard)
- [ ] Google Speech-to-Text integration for voice input
- [ ] Sentence-BERT duplicate detection
- [ ] DBSCAN hotspot clustering job
- [ ] Deploy (Render/Railway + PlanetScale/Railway MySQL)
