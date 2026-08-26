const express = require('express');
const { GoogleGenAI, Type } = require('@google/genai');

const router = express.Router();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "dummy",
  httpOptions: {
    headers: {
      "User-Agent": "civicvoice-backend",
    },
  },
});

async function getBase64FromUrl(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = response.headers.get("content-type") || "image/jpeg";
    return {
      data: buffer.toString("base64"),
      mimeType: contentType,
    };
  } catch (error) {
    console.warn("Notice: Error fetching image URL:", error);
    return null;
  }
}

function generateFallbackAnalyze(text) {
  const normalized = (text || "").toLowerCase();
  
  let category = "other";
  if (normalized.includes("road") || normalized.includes("pothole") || normalized.includes("pavement")) {
    category = "pothole";
  } else if (normalized.includes("water") || normalized.includes("leak") || normalized.includes("pipe")) {
    category = "water";
  } else if (normalized.includes("light") || normalized.includes("bulb") || normalized.includes("dark")) {
    category = "streetlight";
  } else if (normalized.includes("garbage") || normalized.includes("trash") || normalized.includes("waste")) {
    category = "garbage";
  } else if (normalized.includes("sewage") || normalized.includes("drain")) {
    category = "sewage";
  } else if (normalized.includes("electricity") || normalized.includes("power")) {
    category = "electricity";
  }

  let severity = "medium";
  if (normalized.includes("urgent") || normalized.includes("critical") || normalized.includes("danger")) {
    severity = "high";
  } else if (normalized.includes("minor") || normalized.includes("small")) {
    severity = "low";
  }

  let title = text ? (text.length > 50 ? text.substring(0, 47) + "..." : text) : "New Community Issue";
  title = title.charAt(0).toUpperCase() + title.slice(1);

  let description = text || "No detailed description was provided.";

  return {
    title,
    category,
    severity,
    description: `[Diagnostic Fallback] ${description}`,
  };
}

function generateFallbackInsights(issues) {
  const counts = {};
  const validIssues = issues || [];
  validIssues.forEach((i) => {
    const cat = i.category || "other";
    counts[cat] = (counts[cat] || 0) + 1;
  });

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const primaryAtRisk = sorted[0]?.[0] || "pothole";
  const secondaryAtRisk = sorted[1]?.[0] || "water";

  return {
    generalTrend: `Community activity analysis shows active reports concentrated in "${primaryAtRisk}".`,
    categoriesAtRisk: [
      {
        category: primaryAtRisk,
        riskLevel: sorted[0]?.[1] && sorted[0][1] > 3 ? "High" : "Medium",
        reason: `High concentration of community reports indicates elevated maintenance needs.`,
      },
      {
        category: secondaryAtRisk,
        riskLevel: "Medium",
        reason: "Steady inflow of civic logs calls for preventive maintenance.",
      },
    ],
    suggestedActions: [
      `Deploy targeted repair crews to hotspots identified in "${primaryAtRisk}".`,
      "Incentivize local citizen hero sign-ups to report issues before they become critical."
    ],
    communityTip: "Help keep our neighborhood safe! Snap a clear, well-lit picture when reporting issues.",
  };
}


router.post("/analyze-issue", async (req, res) => {
  try {
    const { text, imageBase64, mimeType } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      console.warn("Gemini API Key missing, generating fallback analysis.");
      return res.json(generateFallbackAnalyze(text));
    }

    let contents = [];

    if (imageBase64) {
      if (imageBase64.startsWith("http://") || imageBase64.startsWith("https://")) {
        const imgRes = await getBase64FromUrl(imageBase64);
        if (imgRes) {
          contents.push({
            inlineData: { mimeType: imgRes.mimeType, data: imgRes.data },
          });
        }
      } else {
        const cleanBase64 = imageBase64.startsWith("data:") 
          ? imageBase64.replace(/^data:image\/\w+;base64,/, "")
          : imageBase64;
        const resolvedMime = imageBase64.startsWith("data:")
          ? (imageBase64.match(/^data:([^;]+);base64,/)?.[1] || "image/jpeg")
          : (mimeType || "image/jpeg");
        
        contents.push({
          inlineData: { mimeType: resolvedMime, data: cleanBase64 },
        });
      }
    }

    const promptText = `
      You are an advanced AI Community Infrastructure assistant. Analyze this reported local community issue.
      ${text ? `User Description of the issue: "${text}"` : ""}
      ${imageBase64 ? "An image has been provided. Analyze the visual elements to understand the issue." : ""}

      Categorize it, predict the severity level, and refine the description so that local municipality workers can action it easily.
    `;
    contents.push({ text: promptText });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: contents,
      config: {
        systemInstruction: "You are an expert civic engineer and hyperlocal community issue resolver. Classify and assess citizen complaints.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "A concise, professional title summarizing the issue." },
            category: { type: Type.STRING, description: "Must be exactly one of: 'pothole', 'water', 'electricity', 'garbage', 'sewage', 'streetlight', 'other'." },
            severity: { type: Type.STRING, description: "The urgency of the issue. Must be exactly one of: 'low', 'medium', 'high'." },
            description: { type: Type.STRING, description: "A clean, grammatically polished, professional, and descriptive paragraph outlining the issue clearly for maintenance crews." },
          },
          required: ["title", "category", "severity", "description"],
        },
      },
    });

    const resultText = response.text;
    if (!resultText) throw new Error("No response returned from Gemini API");

    return res.json(JSON.parse(resultText.trim()));
  } catch (error) {
    console.log("[Gemini Status] Offline or error. Safely routing to local heuristic model.", error.message);
    return res.json(generateFallbackAnalyze(req.body.text));
  }
});


router.post("/predictive-insights", async (req, res) => {
  const { issues } = req.body;
  if (!issues || !Array.isArray(issues)) {
    return res.status(400).json({ error: "Issues array is required." });
  }

  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.json(generateFallbackInsights(issues));
    }

    const issuesSummary = issues.map((issue) => ({
      category: issue.category,
      severity: issue.urgency_score || issue.severity,
      status: issue.status,
      date: issue.created_at,
    }));

    const promptText = `
      Analyze the following list of active and resolved community issues:
      ${JSON.stringify(issuesSummary, null, 2)}
      Generate community-wide predictive insights, risk analysis, and hotspots.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: promptText,
      config: {
        systemInstruction: "You are a senior Urban Planner and Smart Cities Advisor. Analyze the community complaint logs to find hidden trends, upcoming infrastructure bottlenecks, and actionable recommendations.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            generalTrend: { type: Type.STRING, description: "A high-level urban trend summary (2-3 sentences)." },
            categoriesAtRisk: {
              type: Type.ARRAY,
              description: "List of problem categories predicted to increase in frequency or risk.",
              items: {
                type: Type.OBJECT,
                properties: {
                  category: { type: Type.STRING, description: "The infrastructure category." },
                  riskLevel: { type: Type.STRING, description: "Must be Low, Medium, High, or Critical." },
                  reason: { type: Type.STRING, description: "A short, data-backed explanation for this risk prediction." },
                },
                required: ["category", "riskLevel", "reason"],
              },
            },
            suggestedActions: {
              type: Type.ARRAY,
              description: "Preventative actions the community can take to avoid these issues scaling up.",
              items: { type: Type.STRING },
            },
            communityTip: { type: Type.STRING, description: "An inspiring, positive tip for local citizens to act as community heroes." },
          },
          required: ["generalTrend", "categoriesAtRisk", "suggestedActions", "communityTip"],
        },
      },
    });

    const resultText = response.text;
    if (!resultText) throw new Error("No response returned from Gemini API");

    return res.json(JSON.parse(resultText.trim()));
  } catch (error) {
    console.log("[Gemini Status] Predictive insights offline.", error.message);
    return res.json(generateFallbackInsights(issues));
  }
});


router.post("/auto-agent", async (req, res) => {
  const { newIssue, existingIssues } = req.body;

  const fallbackAgent = () => {
    const severityScore = { high: 85, medium: 45, low: 20 };
    const priorityScore = severityScore[newIssue.severity] || 45;

    const nearby = (existingIssues || []).filter((iss) => {
      if (iss.id === newIssue.id) return false;
      const dist = Math.sqrt(
        Math.pow((iss.lat - newIssue.lat) * 111, 2) +
        Math.pow((iss.lng - newIssue.lng) * 111, 2)
      );
      return dist < 1 && iss.category === newIssue.category;
    });

    const isDuplicate = nearby.length > 0;
    const dispatchNote = isDuplicate
      ? `[Auto-Agent] ⚠️ Possible duplicate detected — ${nearby.length} similar issue(s) reported within 1km. Priority score: ${priorityScore}/100.`
      : `[Auto-Agent] ✅ Issue registered and scanned — no nearby duplicates found. Priority score: ${priorityScore}/100.`;

    return { priorityScore, isDuplicate, nearbyIssueIds: nearby.map(i => i.id), dispatchNote };
  };

  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.json(fallbackAgent());
    }

    const existingSummary = (existingIssues || [])
      .slice(0, 20)
      .map((i) => ({
        id: i.id,
        category: i.category,
        severity: i.urgency_score || i.severity,
        lat: i.lat,
        lng: i.lng,
      }));

    const prompt = `
You are an autonomous Civic Issue Management Agent. A new issue has just been submitted. Perform 3 steps autonomously:

STEP 1 — DUPLICATE DETECTION:
Check if any existing issue is likely a duplicate (same category AND within approx 1km using lat/lng). List IDs.

STEP 2 — PRIORITY SCORING:
Calculate a priority score from 0-100 based on severity and category risk.

STEP 3 — AUTO DISPATCH NOTE:
Write a concise first status update (1-2 sentences). Prefix with "[Auto-Agent]".

NEW ISSUE:
${JSON.stringify({ id: newIssue.id, category: newIssue.category, severity: newIssue.severity, lat: newIssue.lat, lng: newIssue.lng }, null, 2)}

EXISTING ISSUES:
${JSON.stringify(existingSummary, null, 2)}
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are an autonomous civic infrastructure management agent. Analyse submitted issues, detect duplicates, compute priority scores, and generate professional dispatch notes without any human intervention.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            priorityScore: { type: Type.INTEGER },
            isDuplicate: { type: Type.BOOLEAN },
            nearbyIssueIds: { type: Type.ARRAY, items: { type: Type.STRING } },
            dispatchNote: { type: Type.STRING },
          },
          required: ["priorityScore", "isDuplicate", "nearbyIssueIds", "dispatchNote"],
        },
      },
    });

    const resultText = response.text;
    if (!resultText) throw new Error("No response returned from Gemini API");

    return res.json(JSON.parse(resultText.trim()));
  } catch (error) {
    console.log("[Gemini Status] Auto-agent error.", error.message);
    return res.json(fallbackAgent());
  }
});

module.exports = router;
