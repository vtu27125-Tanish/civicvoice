# 🏙️ CivicVoice — AI-Powered Civic Grievance Redressal Platform

CivicVoice is a next-generation platform bridging the gap between citizens and local authorities. By leveraging modern web technologies and advanced Artificial Intelligence (Google Gemini 2.5 Flash), CivicVoice transforms how municipal issues—from potholes to broken streetlights—are reported, tracked, and resolved.

---

## ✨ Key Features

### 📸 AI-Powered Smart Reporting
- **Image Auto-Analysis**: Citizens upload photo evidence, and Gemini AI instantly auto-categorizes the issue (e.g., Road Hazards, Water & Sanitation) and extracts a highly descriptive, professional summary.
- **Multimodal Inputs**: Speak, type, or snap a photo. The system normalizes and processes input intelligently.

### 🤖 Autonomous Priority Agent
- **Zero-Touch Dispatch**: On every submission, a background AI agent autonomously scans for similar nearby issues to detect duplicates.
- **Dynamic Priority Scoring**: The agent assigns a Priority Score (0-100) based on severity, category risk, and duplicate volume, posting an official dispatch note directly into the issue's timeline.

### 🔮 Predictive AI Insights Dashboard
- **Proactive Urban Planning**: Officials have access to a real-time analytics dashboard powered by Recharts and Leaflet maps.
- **AI Trend Analysis**: Gemini analyzes recent community reports to identify at-risk infrastructure, predict future hotspots, and suggest actionable preventative maintenance steps.

### 🗺️ Live Hotspot Mapping & Gamification
- **Geospatial Tracking**: Every report is mapped using exact GPS coordinates. High-density complaint areas are automatically clustered.
- **Community XP**: Citizens earn XP for reporting, bringing gamification and community engagement to civil maintenance.

---

## 🛠️ Technology Stack

**Frontend**
- **React** with Vite for lightning-fast UI rendering
- **Framer Motion** for fluid, dynamic micro-animations
- **Recharts** & **React-Leaflet** for interactive data visualization and maps
- **Tailwind CSS v4** with a stunning, premium dark/light adaptive design system and modern micro-interactions

**Backend & AI**
- **Node.js + Express** serving robust REST APIs
- **MySQL** (Aiven Cloud) for reliable relational data storage
- **Socket.IO** for real-time dashboard updates across all clients
- **Google Gemini 2.5 Flash (`@google/genai`)** for complex visual reasoning, predictive analytics, and autonomous agent tasks

---

## ⚙️ Running Locally

### 1. Database Setup
Ensure you have MySQL installed.
```bash
mysql -u root -p < backend/database/schema.sql
```

### 2. Backend
Navigate to the `backend` directory, install dependencies, and configure your environment.
```bash
cd backend
npm install
cp .env.example .env 
```
*Be sure to add your `DB_HOST`, `DB_PASSWORD`, `JWT_SECRET`, and `GEMINI_API_KEY` to your `.env` file.*
```bash
npm run dev
```
The backend server runs on `http://localhost:5000`.

### 3. Frontend
Navigate to the `frontend` directory in a new terminal tab.
```bash
cd frontend
npm install
npm run dev
```
The application will be accessible at `http://localhost:5173`.

---

## 🏛️ Access & Roles

- **Citizen View**: Register a new account from the home screen to access the Smart Report Form.
- **Official Dashboard**: Login with an Admin or Official account (e.g., `admin@civicvoice.com`) to access the Predictive Insights Dashboard and Priority Queue.

---

## 🚀 Deployment

- Frontend optimized for Vercel / Netlify.
- Backend ready for Render / Railway.
- Database hosted on Aiven Cloud MySQL.
