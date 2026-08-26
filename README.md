# 🏙️ CivicVoice — Smart Civic Grievance Redressal Platform

CivicVoice is a next-generation platform bridging the gap between citizens and local municipal authorities in India. By leveraging modern web technologies and **Smart AI**, CivicVoice transforms how local infrastructure issues—from potholes to broken streetlights—are reported, tracked, and resolved.

---

## ✨ Key Features

### 📸 Smart AI-Powered Reporting
- **Image Auto-Analysis**: Citizens upload photo evidence (or capture directly from their mobile camera), and Smart AI instantly auto-categorizes the issue and extracts a highly descriptive, professional summary.
- **Local AI Fallback**: Don't have an AI API key? No problem! The Smart AI features robust local fallback heuristics, meaning auto-fill and category classification work 100% locally and completely seamlessly out-of-the-box!
- **Live Location Reverse-Geocoding**: When filing a report, the map automatically determines your live GPS coordinates and instantly translates them into a human-readable street address using OpenStreetMap integration.

### 📍 Localized to India
- **Geofenced Integrity**: The interactive map is securely bounded to India. If a user attempts to spoof their GPS or manually pan the map outside of Indian territory, the application actively blocks the submission.

### 📱 Premium Mobile-First Experience
- **Adaptive Layout**: Designed for citizens on the go. The UI transforms into a sleek, mobile-optimized experience featuring a floating glassmorphism bottom navigation bar and camera-ready inputs.
- **Micro-Interactions**: Built with Framer Motion, every tap, scroll, and tab switch is accompanied by fluid, highly polished animations and color gradients.

### 🛡️ Secure OTP Authentication
- **Spam Prevention**: New users are greeted with a beautifully designed, simulated 6-digit OTP verification flow. This mimics real-world enterprise email authentication to ensure community data remains secure.

### 🔮 Predictive Analytics Dashboard
- **Proactive Urban Planning**: Municipal officials have access to a real-time analytics dashboard powered by Recharts and Leaflet maps.
- **Zero-Touch Dispatch**: On every submission, the system autonomously assigns a Priority Score (0-100) based on severity and posts an official dispatch note directly into the issue's timeline.

---

## 🛠️ Technology Stack

**Frontend**
- **React** with Vite for lightning-fast UI rendering
- **Framer Motion** for fluid, dynamic micro-animations
- **Recharts** & **React-Leaflet** for interactive data visualization and maps
- **Tailwind CSS v4** with a stunning, premium dark/light adaptive design system

**Backend & AI**
- **Node.js + Express** serving robust REST APIs
- **Smart AI Fallback Engine** providing offline, heuristic-based metadata tagging
- **MySQL** (Aiven Cloud) for reliable relational data storage (when running full-stack)

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
*Note: The platform features a Smart AI fallback, so it runs flawlessly even if you do not provide an AI key.*
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

- **Citizen View**: Register a new account from the home screen using the secure OTP flow to access the Smart Report Form.
- **Official Dashboard**: Login with an Admin or Official account (e.g., `admin@vmc.gov.in`) to access the Predictive Insights Dashboard and Municipal Control Center.

---

## 🚀 Deployment

- Frontend optimized for Vercel / Netlify.
- Backend ready for Render / Railway.
- Database hosted on Aiven Cloud MySQL.
