"""
Train the complaint category classifier.

Usage:
  1. Fill data/labeled_complaints.csv with columns: text, category
     (aim for 200-500 rows, covering all categories evenly)
  2. Run: python train_classifier.py
  3. This produces model.pkl and vectorizer.pkl, auto-loaded by main.py
"""

import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.svm import LinearSVC
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
import pickle

DATA_PATH = "data/labeled_complaints.csv"

df = pd.read_csv(DATA_PATH)
print(f"Loaded {len(df)} labeled complaints")
print(df['category'].value_counts())

X_train, X_test, y_train, y_test = train_test_split(
    df['text'], df['category'], test_size=0.2, random_state=42, stratify=df['category']
)

vectorizer = TfidfVectorizer(max_features=3000, ngram_range=(1, 2))
X_train_vec = vectorizer.fit_transform(X_train)
X_test_vec = vectorizer.transform(X_test)

clf = LinearSVC()
clf.fit(X_train_vec, y_train)

y_pred = clf.predict(X_test_vec)
print("\nClassification Report:")
print(classification_report(y_test, y_pred))

with open("model.pkl", "wb") as f:
    pickle.dump(clf, f)
with open("vectorizer.pkl", "wb") as f:
    pickle.dump(vectorizer, f)

print("\nSaved model.pkl and vectorizer.pkl — restart main.py to use the trained model.")
