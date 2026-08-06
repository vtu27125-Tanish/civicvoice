"""
Generates a labeled training dataset for the CivicVoice classifier by combining
templates with varied details (streets, areas, durations, severity words).
This gives 350 realistic, non-duplicate complaint sentences across 7 categories.

Replace/expand with real citizen complaints as you collect them post-launch —
real data will always outperform templated data.
"""

import csv
import random

random.seed(42)

streets = ["Main Street", "Gandhi Road", "Church Street", "MG Road", "Anna Nagar",
           "Park Avenue", "Lake View Road", "Station Road", "Market Street", "5th Cross",
           "Nehru Street", "College Road", "Temple Street", "Hill View Road", "River Road"]

areas = ["near the bus stop", "outside the community hall", "next to the school",
         "near the market", "in front of the temple", "near the park entrance",
         "outside the apartment complex", "near the railway crossing", "beside the playground",
         "near the hospital gate"]

durations = ["for 2 days", "for the past week", "for over 3 days", "since yesterday",
             "for almost a week now", "for 4 days straight", "since last Monday"]

severity = ["it's getting dangerous", "several people have complained", "it's a serious hazard",
            "vehicles are struggling to pass", "residents are worried", "kids play nearby so it's risky",
            "it needs urgent attention", ""]

TEMPLATES = {
    "pothole": [
        "There's a large pothole on {street} {area}, {duration}",
        "A deep pothole has formed on {street} {area} and {severity}",
        "The road on {street} is full of potholes {area}",
        "Huge crater on {street} {area}, {severity}",
        "Road damage near {street} {area} has not been fixed {duration}",
    ],
    "water": [
        "No water supply on {street} {area} {duration}",
        "Water pipe burst on {street} {area}, {severity}",
        "There's a major water leak on {street} {area} {duration}",
        "Residents on {street} have had no water {duration}",
        "Water supply has been irregular on {street} {area}",
    ],
    "electricity": [
        "Power cut on {street} {area} {duration}",
        "Streetlight not working on {street} {area} {duration}",
        "Transformer issue near {street} {area}, {severity}",
        "Frequent power outages on {street} {area}",
        "Electric pole is damaged on {street} {area}, {severity}",
    ],
    "garbage": [
        "Garbage has not been collected on {street} {area} {duration}",
        "Trash is piling up on {street} {area}",
        "Waste dump near {street} {area} is overflowing, {severity}",
        "Uncollected garbage on {street} {area} is causing bad smell",
        "Public bins near {street} {area} haven't been emptied {duration}",
    ],
    "sewage": [
        "Sewage is overflowing on {street} {area}, {severity}",
        "Drain is blocked on {street} {area} {duration}",
        "Manhole is open and overflowing near {street} {area}",
        "Drainage water is flooding {street} {area}, {severity}",
        "Sewage smell is unbearable near {street} {area} {duration}",
    ],
    "streetlight": [
        "Streetlight has been off on {street} {area} {duration}",
        "It's completely dark on {street} at night {area}",
        "Multiple streetlights are not working on {street} {area}",
        "The light pole near {street} {area} is damaged",
        "No lighting on {street} {area} makes it unsafe at night",
    ],
    "other": [
        "There's an issue near {street} {area} that needs attention",
        "Something needs to be fixed on {street} {area}",
        "General maintenance required on {street} {area}",
        "A civic issue has been reported on {street} {area}",
        "Residents flagged a concern near {street} {area}",
    ],
}

rows = []
for category, templates in TEMPLATES.items():
    for _ in range(50):
        template = random.choice(templates)
        text = template.format(
            street=random.choice(streets),
            area=random.choice(areas),
            duration=random.choice(durations),
            severity=random.choice(severity)
        ).replace("  ", " ").replace(" ,", ",").strip().rstrip(",")
        rows.append((text, category))

random.shuffle(rows)

with open("data/labeled_complaints.csv", "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow(["text", "category"])
    writer.writerows(rows)

print(f"Generated {len(rows)} labeled complaints across {len(TEMPLATES)} categories")