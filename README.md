# 🌿 PlantDoc AI

**AI-powered plant health diagnosis for farmers and home gardeners.**

Take a photo of a sick plant and get a likely diagnosis, confidence levels, and low-cost treatment steps you can take today — in English, Roman Urdu, or Urdu script.

![PlantDoc AI](https://img.shields.io/badge/Powered%20by-Gemma%204%20AI-10b981?style=for-the-badge&logo=google&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Hacktober](https://img.shields.io/badge/Hacktober-2026-ff6600?style=for-the-badge)

---

## What Makes This Different

PlantDoc AI is not a generic image classifier. It behaves like a plant doctor:

- **Honest confidence levels** — gives top 2–3 likely causes ranked by probability, and tells you what it *can't* determine from a single photo
- **Follow-up questions** — asks things the photo can't answer ("Is it on old or new leaves? How often do you water?") and lets you refine the diagnosis through conversation
- **Low-cost, practical treatments** — home remedies and cheap options first, with urgency labels (immediate / this week / when possible)
- **Trilingual support** — English, Roman Urdu (اردو in English letters), and Urdu script (اردو) for Pakistani and South Asian farmers
- **Privacy-first architecture** — your API key stays on the server, never exposed to the browser

---

## Features

| Feature | Description |
|---|---|
| 📷 **Image Upload** | Drag & drop, click to upload, or use your phone camera |
| 🔬 **AI Diagnosis** | Identifies plant species + up to 3 health issues with confidence levels |
| 💬 **Follow-up Chat** | Conversational follow-up to refine diagnosis with context |
| 💊 **Treatment Plans** | Actionable steps with cost (free/low/medium) and urgency labels |
| 🌍 **3 Languages** | English, Roman Urdu, Urdu script — switch instantly |
| 📋 **Case History** | Local history of past diagnoses stored in your browser |
| 🛡️ **Security Hardened** | Helmet CSP headers, rate limiting, API key proxying |
| 🖼️ **Test Images** | 5 bundled test images (early blight, aphids, powdery mildew, overwatering, healthy plant) |

---

## Tech Stack

- **Frontend**: Vanilla HTML5, CSS3, JavaScript (no framework)
- **Backend**: Node.js + Express 5
- **AI Model**: Google Gemma 4 (`gemma-4-26b-a4b-it`) via Gemini API
- **Security**: Helmet, express-rate-limit, CORS
- **Icons**: Phosphor Icons
- **Fonts**: Inter (Google Fonts)

---

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A [Google AI Studio](https://aistudio.google.com/apikey) API key (free tier works)

### Installation

```bash
# Clone the repo
git clone https://github.com/talhasarfraz689/plantdoc-ai.git
cd plantdoc-ai

# Install dependencies
npm install

# Create your environment file
cp .env.example .env
# Edit .env and add your Gemini API key

# Start the server
npm start
```

Then open **http://localhost:3000** in your browser.

### Environment Variables

| Variable | Description | Required |
|---|---|---|
| `GEMINI_API_KEY` | Your Google Gemini API key | Yes |
| `PORT` | Server port (default: 3000) | No |
| `NODE_ENV` | `development` or `production` | No |

---

## Project Structure

```
plantdoc-ai/
├── server.js              # Express backend with API proxying + prose parser
├── package.json           # Dependencies and scripts
├── .env                   # API key (git-ignored)
├── .gitignore
├── README.md
└── public/
    ├── index.html         # Semantic HTML5 with trilingual support
    ├── styles.css         # Dark emerald design system
    ├── app.js             # Frontend logic, i18n, compression, chat
    └── test-images/       # 5 bundled test images
        ├── early-blight.jpg
        ├── aphids.jpg
        ├── powdery-mildew.jpg
        ├── overwatering.jpg
        └── healthy-plant.jpg
```

---

## Architecture

```
┌──────────────┐     POST /api/diagnose     ┌──────────────┐     generateContent     ┌──────────────┐
│              │  ───────────────────────►   │              │  ──────────────────►    │              │
│   Browser    │     { image, language }     │   Express    │     { image + prompt }  │  Gemma 4 AI  │
│   (public/)  │                            │   Server     │                         │  (Gemini API)│
│              │  ◄───────────────────────   │              │  ◄──────────────────    │              │
└──────────────┘     { diagnosis }           └──────────────┘     prose analysis      └──────────────┘
                                                   │
                                          Server-side prose
                                          parser extracts
                                          structured JSON
```

**Key architectural decision**: The API key never reaches the browser. All AI calls are proxied through the Express backend.

---

## Major Challenges & Solutions

### 1. Gemma 4 Refuses to Output JSON

**Problem**: Unlike GPT or Claude, the `gemma-4-26b-a4b-it` model consistently refuses to output raw JSON when analyzing images. It always produces structured bullet-point markdown prose first, regardless of how aggressively the prompt asks for JSON. Setting `responseMimeType: 'application/json'` throws a 500 error (unsupported by this model).

**What we tried**:
- Direct JSON-only system prompts → model ignored them completely
- `responseMimeType: 'application/json'` → 500 Internal Error (unsupported)
- Two-step approach (analyze, then ask model to convert to JSON) → Step 2 returned 500 errors or more prose instead of JSON
- Multi-turn conversation (model "said" the analysis, user asks for JSON) → also 500 errors

**Solution**: Server-side prose parser. Since Gemma's output is *consistently structured* (bullet points, named sections, recognizable patterns), we built a regex-based `parseAnalysisToJson()` function that extracts plant name, issues, confidence levels, treatments, follow-up questions, and limitations directly from the prose. This is actually more reliable than forcing the model to output JSON, because the model's natural analysis format is always well-structured.

### 2. Plant Name Extraction

**Problem**: The model outputs plant names in wildly different formats across requests:
- `"* Plant: Tomato (confirmed by user...)"`
- `"Tomato plant (confirmed by visual...)"`
- `"Tomato (*Solanum lycopersicum*)."`
- `"**Tomato** — identified by leaf shape"`

Early regex attempts captured fragments like "To" (2 chars) or "collapses" (wrong word entirely) due to lazy quantifiers interacting with optional trailing patterns.

**Solution**: A priority-ordered array of 4 regex patterns, each requiring a minimum of 3 lowercase characters after the initial capital, with a blocklist of common false-positive words (`the`, `this`, `confirmed`, `collapses`, etc.). The patterns are tried in order: `Plant: X` → `X plant` → `identified as X` → first capitalized word.

### 3. Treatment Steps Contaminated by Prompt Echoes

**Problem**: Gemma sometimes echoes parts of the system prompt instruction into its analysis output (e.g., "6. What are 2-3 low-cost treatment steps the farmer can do today?"). These leaked into the extracted treatment steps.

**Solution**: Multi-layered filtering:
- Skip lines ending in `?` (questions) or `:` (headings)
- Skip lines starting with analysis-like phrases ("could be", "likely", "diagnosis")
- Skip numbered prompt echoes (`6. What are...`)
- Skip lines containing known prompt phrases ("treatment steps the farmer", "follow-up questions")
- Strip label prefixes ("Sanitation: ", "Watering Management: ") from remaining steps

### 4. API Key Security

**Problem**: Exposing the Gemini API key in frontend JavaScript is a common mistake in demo projects. Anyone could extract it from the browser's DevTools.

**Solution**: All API calls go through the Express backend (`/api/diagnose`, `/api/chat`). The key lives only in `.env` (git-ignored). The backend adds Helmet CSP headers, CORS restrictions, and rate limiting (10 requests/minute per IP).

### 5. Image Size & Compression

**Problem**: Phone camera photos can be 5–15MB, which is too large for the Gemini API and makes requests slow.

**Solution**: Client-side canvas-based compression before upload. Images are resized to max 1024px on the longest side and compressed to JPEG quality 0.7, typically reducing file size to 100–300KB while preserving enough detail for diagnosis.

---

## API Endpoints

### `POST /api/diagnose`
Initial plant diagnosis from an image.

**Request body**:
```json
{
  "image": "base64-encoded-image-data",
  "mimeType": "image/jpeg",
  "context": "Tomato plant, Punjab, summer season",
  "language": "English"
}
```

**Response**:
```json
{
  "diagnosis": {
    "plant": "Tomato",
    "plant_confidence": "high",
    "likely_issues": [
      {
        "name": "Early Blight",
        "confidence": "high",
        "reasoning": "Concentric ring-shaped brown spots with yellowing...",
        "category": "disease"
      }
    ],
    "follow_up_questions": ["Are spots on older or newer leaves?"],
    "treatment_steps": [
      { "step": "Remove affected leaves immediately", "cost": "free", "urgency": "immediate" }
    ],
    "what_i_cant_tell": "Cannot determine root condition from photo",
    "when_to_get_help": "If disease spreads to stem or fruit",
    "is_healthy": false,
    "safety_note": "Consult your local agricultural extension office"
  },
  "rawText": "Original AI analysis in prose form..."
}
```

### `POST /api/chat`
Follow-up conversation with context from the diagnosis.

---

## Language Support

| Language | Code | Example |
|---|---|---|
| English | `EN` | "This tomato plant has Early Blight" |
| Roman Urdu | `RU` | "Is tamatar ke paudhay ko Early Blight hai" |
| Urdu Script | `اردو` | "اس ٹماٹر کے پودے کو ارلی بلائٹ ہے" |

Roman Urdu (Urdu written in English/Latin characters) is widely used by Pakistani farmers who may not have Urdu keyboard input but are more comfortable reading in their native language.

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is open source under the [MIT License](LICENSE).

---

## Acknowledgments

- [Google Gemma 4](https://ai.google.dev/) — open-weight AI model powering the diagnosis
- [Phosphor Icons](https://phosphoricons.com/) — beautiful icon set
- [Inter Font](https://rsms.me/inter/) — clean, readable typeface
- Built for **Hacktober 2026** 🎃

---

<p align="center">
  <strong>Built with 💚 for farmers and gardeners everywhere</strong><br>
  <em>Because every plant deserves a doctor</em>
</p>
