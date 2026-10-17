require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

/* ─────────────────────────────────────────────
   1. SECURITY MIDDLEWARE
   ───────────────────────────────────────────── */

app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://unpkg.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://unpkg.com"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: true,
  methods: ['GET', 'POST'],
  maxAge: 86400,
}));

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests. Please wait a moment before trying again.',
    retryAfter: 60,
  },
});

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));


/* ─────────────────────────────────────────────
   2. GEMINI API CONFIG
   ───────────────────────────────────────────── */

const GEMINI_MODEL = 'gemma-4-26b-a4b-it';

function getGeminiUrl() {
  const apiKey = process.env.GEMINI_API_KEY;
  return `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
}

if (!process.env.GEMINI_API_KEY) {
  console.warn('⚠️  GEMINI_API_KEY not found in environment variables. Set it in .env locally or in Vercel project settings.');
}


/* ─────────────────────────────────────────────
   3. JSON EXTRACTION HELPER
   ───────────────────────────────────────────── */

/**
 * Extract the first valid JSON object from text that may contain prose preamble.
 * Uses character-level brace counting to handle nested objects correctly.
 */
function extractJsonFromText(text) {
  if (!text) return null;

  // 1. Direct parse (model returned clean JSON)
  try { return JSON.parse(text.trim()); } catch { /* continue */ }

  // 2. Markdown code block: ```json ... ``` or ``` ... ```
  const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) {
    try { return JSON.parse(codeBlock[1].trim()); } catch { /* continue */ }
  }

  // 3. Brace-counting — finds the outermost complete JSON object in prose
  const start = text.indexOf('{');
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\' && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') depth++;
    if (ch === '}') {
      depth--;
      if (depth === 0) {
        try { return JSON.parse(text.slice(start, i + 1)); } catch { /* continue */ }
      }
    }
  }

  return null;
}

/**
 * Parse Gemma's bullet-point prose analysis into structured JSON.
 * The model consistently uses markdown bullet points with identifiable
 * patterns we can extract from.
 */
function parseAnalysisToJson(text) {
  if (!text || text.length < 50) return null;

  const lower = text.toLowerCase();

  // ── Extract plant name ──
  let plant = null;
  const plantPatterns = [
    /Plant[:\s]+\**\s*([A-Z][a-z]{2,}(?:\s+[a-z]+)?)/im,           // "Plant: Tomato"
    /(?:^|\n)\s*\**\s*([A-Z][a-z]{2,}(?:\s+[a-z]+)?)\s+plant\b/m,  // "Tomato plant"
    /(?:identified as|appears to be|this is (?:a|an))\s+\**\s*([A-Z][a-z]{2,})/i,
    /^[\s*]*([A-Z][a-z]{2,15})\s*[\(*.,\n]/m,                      // "Tomato (*Solanum..."
  ];
  for (const pat of plantPatterns) {
    const m = text.match(pat);
    if (m) {
      const name = m[1].replace(/\*+/g, '').replace(/\s*\(.*$/, '').trim();
      if (!/^(the|this|that|it|is|or|and|with|plant|confirmed|analysis|treatment|collapses)$/i.test(name) && name.length >= 3) {
        plant = name;
        break;
      }
    }
  }

  // ── Determine confidence for plant ID ──
  let plantConf = 'medium';
  if (/\bconfirm/i.test(text) || /\bhigh\s+confidence\b/i.test(text.slice(0, 300))) plantConf = 'high';
  if (/\bunsure\b|not certain|cannot confirm/i.test(text.slice(0, 300))) plantConf = 'low';

  // ── Extract likely issues ──
  const issues = [];
  const categories = { disease: 'disease', fungal: 'disease', bacterial: 'disease', viral: 'disease',
    blight: 'disease', rot: 'disease', wilt: 'disease', mildew: 'disease', rust: 'disease', spot: 'disease',
    pest: 'pest', insect: 'pest', aphid: 'pest', mite: 'pest', whitefly: 'pest',
    nutrient: 'nutrient_deficiency', deficiency: 'nutrient_deficiency', nitrogen: 'nutrient_deficiency',
    magnesium: 'nutrient_deficiency', iron: 'nutrient_deficiency', potassium: 'nutrient_deficiency',
    overwater: 'environmental_stress', underwater: 'environmental_stress', sunburn: 'environmental_stress',
    heat: 'environmental_stress', cold: 'environmental_stress', drought: 'environmental_stress',
    stress: 'environmental_stress', wind: 'environmental_stress' };

  // Common disease/issue patterns in Gemma's output
  const issuePatterns = [
    /(?:early|late)\s+blight/gi, /septoria\s+leaf\s+spot/gi, /powdery\s+mildew/gi,
    /downy\s+mildew/gi, /leaf\s+spot/gi, /root\s+rot/gi, /bacterial\s+wilt/gi,
    /fusarium\s+wilt/gi, /mosaic\s+virus/gi, /anthracnose/gi, /rust(?:\s+disease)?/gi,
    /aphid(?:s)?/gi, /whitefl(?:y|ies)/gi, /spider\s+mite/gi, /thrip(?:s)?/gi,
    /nitrogen\s+deficiency/gi, /magnesium\s+deficiency/gi, /iron\s+deficiency/gi,
    /nutrient\s+deficiency/gi, /overwatering/gi, /underwatering/gi, /sunburn/gi,
    /heat\s+stress/gi, /cold\s+damage/gi, /transplant\s+shock/gi,
  ];

  const foundIssues = new Set();
  for (const pattern of issuePatterns) {
    const match = text.match(pattern);
    if (match && !foundIssues.has(match[0].toLowerCase())) {
      foundIssues.add(match[0].toLowerCase());
      // Find a confidence mention near this issue
      const idx = text.indexOf(match[0]);
      const nearby = text.slice(Math.max(0, idx - 100), idx + 200).toLowerCase();
      let conf = 'medium';
      if (/\bhigh\b/.test(nearby)) conf = 'high';
      if (/\blow\b/.test(nearby)) conf = 'low';

      // Determine category
      let cat = 'disease';
      const lowerName = match[0].toLowerCase();
      for (const [keyword, catVal] of Object.entries(categories)) {
        if (lowerName.includes(keyword)) { cat = catVal; break; }
      }

      // Extract nearby reasoning text
      const reasonStart = Math.max(0, idx - 10);
      const reasonEnd = Math.min(text.length, idx + 200);
      let reasoning = text.slice(reasonStart, reasonEnd).replace(/[\*\n]+/g, ' ').trim();
      if (reasoning.length > 150) reasoning = reasoning.slice(0, 150) + '...';

      issues.push({ name: match[0], confidence: conf, reasoning, category: cat });
    }
    if (issues.length >= 3) break;
  }

  // ── Fallback: check for generic mentions if no specific issues found ──
  if (issues.length === 0) {
    // Look for "healthy" indication
    if (/\bhealthy\b/i.test(text) && !/\bunhealthy\b|not healthy/i.test(text)) {
      return {
        plant, plant_confidence: plantConf, likely_issues: [],
        what_i_cant_tell: 'Full assessment may require physical inspection.',
        follow_up_questions: ['How often do you water this plant?', 'Has the weather changed recently?'],
        treatment_steps: [], when_to_get_help: 'If symptoms develop later.',
        is_healthy: true,
        safety_note: 'Always consult your local agricultural extension office for professional assessment.',
      };
    }
  }

  if (issues.length === 0 && !plant) return null; // Couldn't parse anything useful

  // ── Extract follow-up questions ──
  const questions = [];
  const qPatterns = text.match(/(?:\?\s*$|\?\s*\n)/gm);
  if (qPatterns) {
    const lines = text.split('\n');
    for (const line of lines) {
      const cleaned = line.replace(/^\s*[\*\-\d\.]+\s*/, '').trim();
      if (cleaned.endsWith('?') && cleaned.length > 15 && questions.length < 3) {
        questions.push(cleaned.replace(/\*+/g, ''));
      }
    }
  }
  if (questions.length === 0) {
    questions.push('How often do you water this plant?', 'Are other nearby plants showing similar symptoms?');
  }

  // ── Extract treatment steps ──
  const treatments = [];
  const treatmentKeywords = ['remove', 'prune', 'mulch', 'spray', 'apply', 'avoid',
    'dispose', 'cut', 'treat', 'fungicide', 'neem', 'compost', 'irrigat', 'drain'];
  const tLines = text.split('\n');
  for (const line of tLines) {
    const cleaned = line.replace(/^\s*[\*\-\d\.]+\s*/, '').trim();
    // Skip lines that are questions, headings, labels, or too short
    if (cleaned.endsWith('?') || cleaned.endsWith(':') || cleaned.length < 20 || treatments.length >= 3) continue;
    // Skip lines that look like analysis/description/prompt echoes rather than action
    if (/^(?:is it|could be|possibly|likely|diagnosis|symptom|note|confidence|low-cost|treatment|soil moisture|watering frequency|irrigation frequency|what are|how often|when should)/i.test(cleaned)) continue;
    // Skip lines that contain numbers like "6. What are..." (prompt echoes)
    if (/^\d+\.\s+(?:What|How|When|Where|Why|If)/i.test(cleaned)) continue;
    // Skip prompt echoes that leaked into the analysis
    if (/treatment steps the farmer|low-cost treatment|follow-up questions|what plant is this|health problems do you see/i.test(cleaned)) continue;
    const lowerCleaned = cleaned.toLowerCase();
    if (treatmentKeywords.some(kw => lowerCleaned.includes(kw))) {
      let cost = 'free';
      if (/buy|purchase|fungicide|spray|neem oil|baking soda/i.test(cleaned)) cost = 'low';
      if (/professional|commercial|systemic/i.test(cleaned)) cost = 'medium';
      let urgency = 'this_week';
      if (/immediate|right away|now|today|first|asap/i.test(cleaned)) urgency = 'immediate';
      if (/when possible|optional|later|preventive/i.test(cleaned)) urgency = 'when_possible';
      treatments.push({ step: cleaned.replace(/\*+/g, '').replace(/\([^)]*\)/g, '').replace(/^[A-Za-z\s]+:\s*/, '').trim().slice(0, 200), cost, urgency });
    }
  }
  if (treatments.length === 0) {
    treatments.push(
      { step: 'Remove affected leaves and dispose of them (do not compost).', cost: 'free', urgency: 'immediate' },
      { step: 'Water at the base of the plant, not from above, to prevent splash.', cost: 'free', urgency: 'immediate' },
      { step: 'Add mulch around the base to prevent soil-borne spores from splashing.', cost: 'low', urgency: 'this_week' },
    );
  }

  // ── Extract "what I can't tell" ──
  let cantTell = 'A single photo may not reveal root conditions, soil quality, or early-stage internal infections.';
  const cantMatch = text.match(/(?:cannot|can't|can not)\s+(?:tell|determine|see|assess)\s+([^.]+\.)/i);
  if (cantMatch) cantTell = cantMatch[0].replace(/\*+/g, '').trim();

  // ── Extract "when to get help" ──
  let getHelp = 'If symptoms worsen or spread to other plants despite treatment.';
  const helpMatch = text.match(/(?:consult|seek|get help|visit|contact|see)\s+(?:an?\s+)?(?:expert|extension|specialist|professional|agronomist)([^.]*\.)/i);
  if (helpMatch) getHelp = helpMatch[0].replace(/\*+/g, '').trim();

  return {
    plant: plant || null,
    plant_confidence: plantConf,
    likely_issues: issues,
    what_i_cant_tell: cantTell,
    follow_up_questions: questions.slice(0, 3),
    treatment_steps: treatments.slice(0, 3),
    when_to_get_help: getHelp,
    is_healthy: issues.length === 0,
    safety_note: 'Always consult your local agricultural extension office before using any treatments or pesticides.',
  };
}


/* ─────────────────────────────────────────────
   4. SYSTEM PROMPT BUILDER
   ───────────────────────────────────────────── */

function buildSystemPrompt(language) {
  const langNote = language === 'Roman Urdu'
    ? 'Write all string values in Roman Urdu (Urdu written with English/Latin letters, e.g. "Yeh paudha theek nahi lagta").'
    : language === 'اردو'
    ? 'Write all string values in Urdu script.'
    : 'Write all string values in English.';

  return `You are a careful plant health assistant for farmers and home gardeners.
Analyze the provided plant photo and return your diagnosis.

${langNote}

CRITICAL: Your ENTIRE response must be a single valid JSON object. Do NOT write any text before or after the JSON. Do NOT use markdown. Do NOT use code blocks. Start your response with { and end with }.

Required JSON structure:
{
  "plant": "species name or null",
  "plant_confidence": "low",
  "likely_issues": [
    {
      "name": "issue name",
      "confidence": "high",
      "reasoning": "what you see in the photo",
      "category": "disease"
    }
  ],
  "what_i_cant_tell": "what the photo cannot reveal",
  "follow_up_questions": ["question 1", "question 2"],
  "treatment_steps": [
    {
      "step": "what to do",
      "cost": "free",
      "urgency": "immediate"
    }
  ],
  "when_to_get_help": "when to see an expert",
  "is_healthy": false,
  "safety_note": "always consult local agricultural extension office"
}

Rules:
- plant_confidence must be exactly: "low", "medium", or "high"
- category must be exactly one of: "disease", "pest", "nutrient_deficiency", "environmental_stress"
- cost must be exactly: "free", "low", or "medium"
- urgency must be exactly: "immediate", "this_week", or "when_possible"
- Up to 3 likely_issues, ranked by probability
- If plant is healthy: set is_healthy to true, likely_issues to []
- Up to 3 follow_up_questions
- No specific pesticide dosages
- safety_note must mention local agricultural extension office`;
}


/* ─────────────────────────────────────────────
   5. API ROUTES
   ───────────────────────────────────────────── */

/**
 * POST /api/diagnose
 * Body: { image: base64, mimeType: string, context?: string, language?: string }
 * Returns: { diagnosis: Object } or { rawText: string } on parse failure
 */
app.post(['/api/diagnose', '/diagnose'], apiLimiter, async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server. Please add it to your environment variables in Vercel.' });
    }

    const { image, mimeType, context, language } = req.body;

    if (!image || !mimeType) {
      return res.status(400).json({ error: 'image and mimeType are required.' });
    }

    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedMimeTypes.includes(mimeType)) {
      return res.status(400).json({ error: 'Unsupported image type. Use JPEG, PNG, or WebP.' });
    }

    if (image.length > 13_400_000) {
      return res.status(400).json({ error: 'Image too large. Max 10MB.' });
    }

    const lang = language || 'English';
    const langInstruction = lang === 'Roman Urdu'
      ? 'Respond in Roman Urdu (Urdu written with English letters).'
      : lang === 'اردو'
      ? 'Respond in Urdu script.'
      : 'Respond in English.';

    const userMsg = context
      ? `Analyze this plant image. Context: ${context}`
      : 'Analyze this plant image.';

    // ── STEP 1: Get natural language analysis from Gemma ──
    const analysisPrompt = `You are a careful plant health assistant for farmers and home gardeners.
${langInstruction}
Analyze the plant photo and describe:
1. What plant is this? (if identifiable)
2. What health problems do you see? (diseases, pests, nutrient deficiencies, environmental stress)
3. How confident are you? (low / medium / high) for each issue
4. What can you NOT tell from this photo alone?
5. What 2-3 follow-up questions would help you diagnose better?
6. What are 2-3 low-cost treatment steps the farmer can do today?
7. When should they seek expert help?
Be honest — if the plant looks healthy, say so. Do not invent problems.`;

    const step1Res = await fetch(getGeminiUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: analysisPrompt }] },
        contents: [{
          role: 'user',
          parts: [
            { text: userMsg },
            { inline_data: { mime_type: mimeType, data: image } },
          ],
        }],
        generationConfig: { temperature: 0.3, topP: 0.9, topK: 40, maxOutputTokens: 2048 },
      }),
    });

    if (!step1Res.ok) {
      const errBody = await step1Res.text();
      console.error('Gemini step1 error:', step1Res.status, errBody);
      return res.status(502).json({ error: 'AI service error. Please try again.' });
    }

    const step1Data = await step1Res.json();
    const analysis = step1Data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!analysis) {
      return res.status(502).json({ error: 'No response from AI. Please try again.' });
    }

    console.log('✅ Step 1 analysis received:', analysis.slice(0, 100));

    // ── STEP 2: Parse the prose analysis into structured JSON ──
    // Gemma consistently refuses to output raw JSON, so we parse its
    // structured bullet-point analysis server-side instead.
    const diagnosis = parseAnalysisToJson(analysis);

    if (diagnosis) {
      console.log(`✅ Diagnosis OK: plant=${diagnosis.plant}, issues=${diagnosis.likely_issues?.length}`);
      return res.json({ diagnosis, rawText: analysis });
    }

    // Also try extracting JSON directly (in case model did output JSON)
    const jsonDirect = extractJsonFromText(analysis);
    if (jsonDirect) {
      console.log(`✅ Direct JSON: plant=${jsonDirect.plant}`);
      return res.json({ diagnosis: jsonDirect, rawText: analysis });
    }

    console.warn('⚠️  Parse failed. Returning raw text.');
    return res.json({ rawText: analysis });


  } catch (err) {
    console.error('Diagnose error:', err.message);
    res.status(500).json({ error: 'Internal server error.' });
  }
});


/**
 * POST /api/chat
 * Body: { contents: Array (full Gemini conversation history) }
 * Returns: Gemini API response passthrough
 */
app.post(['/api/chat', '/chat'], apiLimiter, async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server. Please add it to your environment variables in Vercel.' });
    }

    const { contents } = req.body;

    if (!contents || !Array.isArray(contents) || contents.length === 0) {
      return res.status(400).json({ error: 'contents array is required.' });
    }

    if (contents.length > 20) {
      return res.status(400).json({ error: 'Conversation too long. Start a new diagnosis.' });
    }

    const payload = {
      contents,
      generationConfig: { temperature: 0.4, topP: 0.95, topK: 40, maxOutputTokens: 2048 },
    };

    const geminiRes = await fetch(getGeminiUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!geminiRes.ok) {
      const errBody = await geminiRes.text();
      console.error('Gemini chat error:', geminiRes.status, errBody);
      return res.status(502).json({ error: 'AI service error. Please try again.' });
    }

    const data = await geminiRes.json();
    res.json(data);
  } catch (err) {
    console.error('Chat error:', err.message);
    res.status(500).json({ error: 'Internal server error.' });
  }
});


/* ─────────────────────────────────────────────
   6. STATIC FALLBACK & START
   ───────────────────────────────────────────── */

app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`
  🌿 PlantDoc AI
  ──────────────────────────────
  Local:   http://localhost:${PORT}
  Model:   ${GEMINI_MODEL}
  Env:     ${process.env.NODE_ENV || 'development'}
  ──────────────────────────────
    `);
  });
}

module.exports = app;
