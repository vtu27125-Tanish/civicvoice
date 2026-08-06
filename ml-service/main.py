"""
CivicVoice ML Microservice
Classifies citizen complaints into a category + urgency score.
Also provides duplicate detection (TF-IDF cosine similarity) and
hotspot clustering (DBSCAN) for the official dashboard.

Start with a rule/keyword-based baseline (Week 1-4), then swap in
the trained classifier (train_classifier.py) once you have labeled data.
"""

from fastapi import FastAPI, UploadFile, File, Form
from pydantic import BaseModel
from typing import List, Optional
import pickle
import os
import numpy as np
import cv2
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.cluster import DBSCAN
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from deep_translator import GoogleTranslator

sentiment_analyzer = SentimentIntensityAnalyzer()

app = FastAPI(title="CivicVoice ML Service")

MODEL_PATH = "model.pkl"
VECTORIZER_PATH = "vectorizer.pkl"

model = None
vectorizer = None

if os.path.exists(MODEL_PATH) and os.path.exists(VECTORIZER_PATH):
    with open(MODEL_PATH, "rb") as f:
        model = pickle.load(f)
    with open(VECTORIZER_PATH, "rb") as f:
        vectorizer = pickle.load(f)


class ComplaintText(BaseModel):
    text: str
    language: str = "en"  # ISO code e.g. 'ta' for Tamil, 'hi' for Hindi


# --- Baseline keyword rules (used until the trained model is ready) ---
CATEGORY_KEYWORDS = {
    "pothole": ["pothole", "road damage", "crater", "broken road"],
    "water": ["water leak", "no water", "pipe burst", "water supply"],
    "electricity": ["power cut", "transformer", "electric pole", "streetlight not working", "no electricity"],
    "garbage": ["garbage", "trash", "waste", "dump", "not collected"],
    "sewage": ["sewage", "drain overflow", "manhole", "drainage"],
}

URGENT_KEYWORDS = ["overflow", "danger", "accident", "urgent", "collapsed", "fire", "injury", "exposed wire"]


def rule_based_classify(text: str):
    text_lower = text.lower()
    category = "other"
    for cat, keywords in CATEGORY_KEYWORDS.items():
        if any(kw in text_lower for kw in keywords):
            category = cat
            break

    urgency = "high" if any(kw in text_lower for kw in URGENT_KEYWORDS) else "medium"
    return category, urgency


def sentiment_escalated_urgency(text: str, base_urgency: str) -> str:
    """
    Uses VADER sentiment analysis to escalate urgency when a complaint's tone
    is strongly negative/distressed, even if it doesn't contain an explicit
    'urgent' keyword — e.g. "this is absolutely unbearable, my kids can't
    even walk here" should escalate even without the word 'danger'.
    """
    scores = sentiment_analyzer.polarity_scores(text)
    # compound ranges -1 (very negative) to +1 (very positive)
    if scores["compound"] <= -0.6 and base_urgency != "high":
        return "high"
    if scores["compound"] <= -0.3 and base_urgency == "low":
        return "medium"
    return base_urgency


@app.post("/classify")
def classify(complaint: ComplaintText):
    text = complaint.text

    # Translate to English first if the citizen spoke/typed in another language —
    # the classifier and sentiment model were trained/tuned on English text.
    translated_text = text
    if complaint.language and complaint.language != "en":
        try:
            translated_text = GoogleTranslator(source=complaint.language, target="en").translate(text)
        except Exception as e:
            print(f"Translation failed, using original text: {e}")
            translated_text = text

    if model and vectorizer:
        # Trained model path (once you've run train_classifier.py)
        X = vectorizer.transform([translated_text])
        category = model.predict(X)[0]
        _, base_urgency = rule_based_classify(translated_text)
    else:
        category, base_urgency = rule_based_classify(translated_text)

    urgency = sentiment_escalated_urgency(translated_text, base_urgency)

    return {
        "category": category,
        "urgency": urgency,
        "translated_text": translated_text if translated_text != text else None
    }


@app.get("/health")
def health():
    return {"status": "ML service running", "model_loaded": model is not None}


# --- Duplicate detection ---
# TF-IDF + cosine similarity: lighter than a transformer embedding model,
# no heavy downloads, and still gives genuine vector-similarity duplicate
# detection rather than exact string matching.

class Candidate(BaseModel):
    id: int
    text: str

class DuplicateCheckRequest(BaseModel):
    new_text: str
    candidates: List[Candidate]
    threshold: float = 0.55  # cosine similarity cutoff; tune based on real complaints

@app.post("/check-duplicate")
def check_duplicate(req: DuplicateCheckRequest):
    if not req.candidates:
        return {"duplicate_of": None, "similarity": 0.0}

    texts = [req.new_text] + [c.text for c in req.candidates]
    tfidf = TfidfVectorizer(stop_words="english").fit_transform(texts)
    sims = cosine_similarity(tfidf[0:1], tfidf[1:]).flatten()

    best_idx = int(np.argmax(sims))
    best_score = float(sims[best_idx])

    if best_score >= req.threshold:
        return {"duplicate_of": req.candidates[best_idx].id, "similarity": round(best_score, 4)}
    return {"duplicate_of": None, "similarity": round(best_score, 4)}


# --- Hotspot clustering ---
# DBSCAN on lat/lng: groups nearby reports into hotspots without needing
# a predefined number of clusters (unlike k-means) — fits naturally
# growing/shrinking complaint clusters as new reports come in.

class ReportPoint(BaseModel):
    id: int
    lat: float
    lng: float
    category: str

class HotspotRequest(BaseModel):
    reports: List[ReportPoint]
    eps_meters: float = 150.0  # cluster radius in meters
    min_samples: int = 3       # minimum reports to form a hotspot

@app.post("/cluster-hotspots")
def cluster_hotspots(req: HotspotRequest):
    if len(req.reports) < req.min_samples:
        return {"hotspots": []}

    coords = np.array([[r.lat, r.lng] for r in req.reports])
    # Convert meters to approximate degrees (rough, fine for city-scale clustering)
    eps_degrees = req.eps_meters / 111_000

    labels = DBSCAN(eps=eps_degrees, min_samples=req.min_samples).fit_predict(coords)

    hotspots = []
    for cluster_id in set(labels):
        if cluster_id == -1:
            continue  # noise point, not part of any cluster
        members = [req.reports[i] for i in range(len(req.reports)) if labels[i] == cluster_id]
        center_lat = float(np.mean([m.lat for m in members]))
        center_lng = float(np.mean([m.lng for m in members]))
        categories = [m.category for m in members]
        dominant_category = max(set(categories), key=categories.count)

        hotspots.append({
            "cluster_lat": center_lat,
            "cluster_lng": center_lng,
            "report_count": len(members),
            "dominant_category": dominant_category,
            "report_ids": [m.id for m in members]
        })

    return {"hotspots": hotspots}


# --- Image verification ---
# Honest scope note: this checks photo QUALITY/authenticity signals (not blank,
# not a screenshot/plain color, not heavily blurred) using OpenCV — it does not
# do deep-learning category matching (e.g. "is this really a pothole"), which
# would need a vision model like CLIP. That's a heavier dependency; this keeps
# the pipeline fast and light while still catching low-effort/fake uploads.

@app.post("/verify-image")
async def verify_image(file: UploadFile = File(...)):
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if img is None:
        return {"valid": False, "reason": "Could not read image file"}

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Blur detection: variance of the Laplacian. Low variance = blurry/flat image.
    blur_score = cv2.Laplacian(gray, cv2.CV_64F).var()

    # Blank/near-uniform image detection (e.g. accidental all-black or all-white upload)
    std_dev = float(np.std(gray))

    # Brightness check (rejects near-black or overexposed photos)
    mean_brightness = float(np.mean(gray))

    issues = []
    if blur_score < 30:
        issues.append("Image appears too blurry")
    if std_dev < 8:
        issues.append("Image appears blank or near-uniform (not a real photo)")
    if mean_brightness < 15:
        issues.append("Image is too dark to verify")
    if mean_brightness > 245:
        issues.append("Image is overexposed/blank white")

    return {
        "valid": len(issues) == 0,
        "issues": issues,
        "blur_score": round(float(blur_score), 2),
        "brightness": round(mean_brightness, 2)
    }


# --- Citizen chatbot ---
# Honest scope note: this is intent-based (regex/keyword matching against a
# small set of supported questions), not an LLM. A production RAG chatbot would
# call an LLM API (OpenAI/Anthropic) with report data as context — that needs
# an API key you'd add to .env. This version works fully offline and covers
# the common "where's my complaint" questions citizens actually ask.

import re

class ChatbotRequest(BaseModel):
    message: str
    report_status: Optional[str] = None   # passed in by backend if a report_id was found
    report_id: Optional[int] = None
    category: Optional[str] = None

STATUS_RESPONSES = {
    "reported": "Your report has been received and is waiting to be verified by an official.",
    "verified": "Your report has been verified and is waiting to be assigned to a department.",
    "assigned": "Your report has been assigned to the relevant department and work is being scheduled.",
    "in_progress": "Your report is currently being worked on.",
    "resolved": "Good news — your report has been marked as resolved!",
    "rejected": "Your report was reviewed and marked as not actionable. Contact support if you think this is wrong."
}

@app.post("/chatbot")
def chatbot(req: ChatbotRequest):
    msg = req.message.lower()

    # Intent: asking about a specific report's status (report_id resolved by backend from message)
    if req.report_id and req.report_status:
        status_text = STATUS_RESPONSES.get(req.report_status, "Status unknown.")
        return {"reply": f"Report #{req.report_id} ({req.category or 'general'}): {status_text}"}

    # Intent: general "how do I report an issue"
    if re.search(r"how (do|can) i report|submit a (complaint|report|issue)", msg):
        return {"reply": "Tap 'Report an Issue', describe the problem (by typing or speaking), confirm your location, and submit — you'll get a tracking number instantly."}

    # Intent: asking what categories are supported
    if re.search(r"what (can|kind of) (issues|things|categories)", msg):
        return {"reply": "You can report potholes, water supply issues, electricity/streetlight faults, garbage collection, and sewage/drainage problems."}

    # Intent: asking about duplicate reports
    if re.search(r"duplicate|already reported|someone else", msg):
        return {"reply": "If someone nearby already reported the same issue, we automatically link your report to theirs so it adds weight instead of creating a separate ticket."}

    # Fallback
    return {"reply": "I can help with report status, how to submit a report, or supported categories. Could you rephrase your question, or provide your report number (e.g. '#12')?"}