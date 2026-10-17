/* ═══════════════════════════════════════════════
   PlantDoc AI — Core Application Logic
   ═══════════════════════════════════════════════ */

/* ─────────────────────────────────────────────
   1. CONFIG & STATE
   ───────────────────────────────────────────── */

const CONFIG = {
  API_BASE: window.location.origin,
  MAX_IMAGE_SIZE: 1024,           // Max dimension for compression
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
};

const STATE = {
  language: localStorage.getItem('plantdoc_lang') || 'English',
  currentImage: null,       // { base64, mimeType, dataUrl }
  currentDiagnosis: null,   // Parsed JSON from API
  conversationHistory: [],  // Multi-turn contents[]
  isLoading: false,
};


/* ─────────────────────────────────────────────
   2. i18n — TRILINGUAL SUPPORT
   ───────────────────────────────────────────── */

const TRANSLATIONS = {
  English: {
    hero_badge: 'Powered by Gemma 4 AI',
    hero_title_1: 'Your plant is trying to',
    hero_title_2: 'tell you something.',
    hero_subtitle: 'Take a photo of a sick plant and get a likely diagnosis, a confidence level, and low-cost steps you can take today.',
    hero_cta: 'Start Diagnosis',
    hero_card_1: 'Disease Detection',
    hero_card_2: 'Pest Identification',
    hero_card_3: 'Nutrient Analysis',
    diagnose_title: 'Upload Your Plant Photo',
    diagnose_subtitle: 'Our AI will analyze it and provide a detailed health assessment.',
    upload_text: 'Drag a photo here or click to upload',
    upload_hint: 'JPEG, PNG, or WebP — max 10MB',
    btn_upload: 'Choose File',
    btn_camera: 'Take Photo',
    context_title: 'Optional Details',
    context_hint: 'Help the AI give a better diagnosis.',
    label_plant_type: 'Plant type (if known)',
    label_location: 'Location / Climate',
    label_symptoms: 'Describe what you see',
    placeholder_plant_type: 'e.g. Tomato, Rose, Wheat...',
    placeholder_location: 'e.g. Punjab, humid, summer...',
    placeholder_symptoms: 'e.g. Yellow spots on leaves, curling edges...',
    btn_diagnose: 'Analyze Plant',
    results_title: 'Diagnosis Results',
    plant_identified: 'Plant Identified',
    likely_issues: 'Likely Issues',
    what_cant_tell: "What I Can't Tell",
    follow_up_questions: 'Follow-up Questions',
    treatment_steps: 'Treatment Steps',
    when_to_get_help: 'When to Get Help',
    chat_title: 'Follow-up Chat',
    chat_subtitle: 'Ask more questions — the AI remembers your photo and diagnosis.',
    chat_placeholder: 'Ask a follow-up question...',
    history_title: 'Diagnosis History',
    history_subtitle: 'Your past plant diagnoses, saved locally in your browser.',
    history_empty: 'No diagnoses yet. Upload a plant photo to get started!',
    clear_history: 'Clear History',
    history: 'History',
    footer_disclaimer: 'This tool provides AI-based estimates only. Always confirm diagnoses with your local agricultural extension office before using any treatments or pesticides.',
    healthy_status: '✓ This plant appears healthy',
    unhealthy_status: '⚠ Potential issues detected',
    error_no_image: 'Please upload a plant photo first.',
    error_api: 'Failed to get diagnosis. Please try again.',
    error_parse: 'Could not parse the AI response. Showing raw response below.',
    cost_free: 'FREE',
    cost_low: 'LOW COST',
    cost_medium: 'MEDIUM COST',
    urgency_immediate: 'DO NOW',
    urgency_this_week: 'THIS WEEK',
    urgency_when_possible: 'WHEN POSSIBLE',
  },

  'Roman Urdu': {
    hero_badge: 'Gemma 4 AI se Powered',
    hero_title_1: 'Aapka paudha aapko kuch',
    hero_title_2: 'batana chahta hai.',
    hero_subtitle: 'Beemar paudhe ki photo lo aur fori tashkhees, confidence level, aur kam kharche wale ilaaj ke qadam hasil karo.',
    hero_cta: 'Tashkhees Shuru Karo',
    hero_card_1: 'Beemari Ki Shanakht',
    hero_card_2: 'Keeron Ki Pehchaan',
    hero_card_3: 'Ghiza Ka Jaiza',
    diagnose_title: 'Apne Paudhe Ki Photo Upload Karein',
    diagnose_subtitle: 'Hamara AI iski jaanch kar ke sehat ka mukamal jaiza dega.',
    upload_text: 'Photo yahan drag karein ya click karein',
    upload_hint: 'JPEG, PNG, ya WebP — zyada se zyada 10MB',
    btn_upload: 'File Chunein',
    btn_camera: 'Photo Lein',
    context_title: 'Ikhtiyari Tafseelat',
    context_hint: 'AI ko behtar tashkhees mein madad karein.',
    label_plant_type: 'Paudhe ki qism (agar maloom ho)',
    label_location: 'Jagah / Mausam',
    label_symptoms: 'Aap kya dekh rahe hain',
    placeholder_plant_type: 'Maslan: Tamatar, Gulab, Gehun...',
    placeholder_location: 'Maslan: Punjab, humid, garmi...',
    placeholder_symptoms: 'Maslan: Patton par peele dabbe, kinaron ka murjhana...',
    btn_diagnose: 'Paudhe Ka Jaiza Lein',
    results_title: 'Tashkhees Ke Nataij',
    plant_identified: 'Paudha Pehchana Gaya',
    likely_issues: 'Mumkina Masail',
    what_cant_tell: 'Jo Main Nahi Bata Sakta',
    follow_up_questions: 'Mazeed Sawalat',
    treatment_steps: 'Ilaaj Ke Qadam',
    when_to_get_help: 'Maahir Se Kab Milein',
    chat_title: 'Mazeed Baat Cheet',
    chat_subtitle: 'Mazeed sawal poochein — AI aapki photo aur tashkhees yaad rakhta hai.',
    chat_placeholder: 'Mazeed sawal poochein...',
    history_title: 'Tashkhees Ki Tareekh',
    history_subtitle: 'Aapki pichli tashkheesein, aapke browser mein mehfooz.',
    history_empty: 'Abhi tak koi tashkhees nahi. Shuru karne ke liye paudhe ki photo upload karein!',
    clear_history: 'Tareekh Saaf Karein',
    history: 'Tareekh',
    footer_disclaimer: 'Yeh tool sirf AI par mabni andaaze deta hai. Koi bhi ilaaj ya keetnashak istemal karne se pehle apne maqaami ziraati daftar se zaroor tasdeeq karein.',
    healthy_status: '✓ Yeh paudha sehat mand lagta hai',
    unhealthy_status: '⚠ Mumkina masail ka pata chala hai',
    error_no_image: 'Pehle paudhe ki photo upload karein.',
    error_api: 'Tashkhees nahi ho saki. Dobara koshish karein.',
    error_parse: 'AI ka jawab samajh nahi aaya. Neeche asal jawab dikhaya ja raha hai.',
    cost_free: 'MUFT',
    cost_low: 'KAM KHARCHA',
    cost_medium: 'DARMIYANA KHARCHA',
    urgency_immediate: 'ABHI KARO',
    urgency_this_week: 'IS HAFTE',
    urgency_when_possible: 'JAB MUMKIN HO',
  },

  'اردو': {
    hero_badge: 'Gemma 4 AI سے تقویت یافتہ',
    hero_title_1: 'آپ کا پودا آپ کو کچھ',
    hero_title_2: 'بتانا چاہتا ہے۔',
    hero_subtitle: 'بیمار پودے کی تصویر لیں اور فوری تشخیص، اعتماد کی سطح، اور کم خرچ علاج کے اقدامات حاصل کریں۔',
    hero_cta: 'تشخیص شروع کریں',
    hero_card_1: 'بیماری کی شناخت',
    hero_card_2: 'کیڑوں کی پہچان',
    hero_card_3: 'غذائیت کا جائزہ',
    diagnose_title: 'اپنے پودے کی تصویر اپلوڈ کریں',
    diagnose_subtitle: 'ہمارا AI اس کا جائزہ لے کر تفصیلی صحت کی تشخیص دے گا۔',
    upload_text: 'تصویر یہاں ڈریگ کریں یا کلک کریں',
    upload_hint: 'JPEG, PNG, یا WebP — زیادہ سے زیادہ 10MB',
    btn_upload: 'فائل چنیں',
    btn_camera: 'تصویر لیں',
    context_title: 'اختیاری تفصیلات',
    context_hint: 'AI کو بہتر تشخیص میں مدد کریں۔',
    label_plant_type: 'پودے کی قسم (اگر معلوم ہو)',
    label_location: 'مقام / موسم',
    label_symptoms: 'آپ کیا دیکھ رہے ہیں',
    placeholder_plant_type: 'مثلاً: ٹماٹر، گلاب، گندم...',
    placeholder_location: 'مثلاً: پنجاب، مرطوب، گرمی...',
    placeholder_symptoms: 'مثلاً: پتوں پر پیلے دھبے، کناروں کا مرجھانا...',
    btn_diagnose: 'پودے کا جائزہ لیں',
    results_title: 'تشخیص کے نتائج',
    plant_identified: 'پودا پہچانا گیا',
    likely_issues: 'ممکنہ مسائل',
    what_cant_tell: 'جو میں نہیں بتا سکتا',
    follow_up_questions: 'مزید سوالات',
    treatment_steps: 'علاج کے اقدامات',
    when_to_get_help: 'ماہر سے کب ملیں',
    chat_title: 'مزید بات چیت',
    chat_subtitle: 'مزید سوال پوچھیں — AI آپ کی تصویر اور تشخیص یاد رکھتا ہے۔',
    chat_placeholder: 'مزید سوال پوچھیں...',
    history_title: 'تشخیص کی تاریخ',
    history_subtitle: 'آپ کی پچھلی تشخیصیں، آپ کے براؤزر میں محفوظ۔',
    history_empty: 'ابھی تک کوئی تشخیص نہیں۔ شروع کرنے کے لیے پودے کی تصویر اپلوڈ کریں!',
    clear_history: 'تاریخ صاف کریں',
    history: 'تاریخ',
    footer_disclaimer: 'یہ ٹول صرف AI پر مبنی اندازے دیتا ہے۔ کوئی بھی علاج یا کیڑے مار دوا استعمال کرنے سے پہلے اپنے مقامی زرعی دفتر سے ضرور تصدیق کریں۔',
    healthy_status: '✓ یہ پودا صحت مند لگتا ہے',
    unhealthy_status: '⚠ ممکنہ مسائل کا پتہ چلا ہے',
    error_no_image: 'پہلے پودے کی تصویر اپلوڈ کریں۔',
    error_api: 'تشخیص نہیں ہو سکی۔ دوبارہ کوشش کریں۔',
    error_parse: 'AI کا جواب سمجھ نہیں آیا۔',
    cost_free: 'مفت',
    cost_low: 'کم خرچ',
    cost_medium: 'درمیانہ خرچ',
    urgency_immediate: 'ابھی کریں',
    urgency_this_week: 'اس ہفتے',
    urgency_when_possible: 'جب ممکن ہو',
  },
};

function t(key) {
  return TRANSLATIONS[STATE.language]?.[key] || TRANSLATIONS['English'][key] || key;
}

function applyLanguage() {
  const lang = STATE.language;
  const isRTL = lang === 'اردو';
  document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
  document.documentElement.lang = isRTL ? 'ur' : (lang === 'Roman Urdu' ? 'ur-Latn' : 'en');

  // Update all data-i18n elements
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.textContent = t(key);
  });

  // Update placeholders
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    el.placeholder = t(key);
  });

  // Update active language button
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });

  localStorage.setItem('plantdoc_lang', lang);
}


/* ─────────────────────────────────────────────
   3. IMAGE HANDLING
   ───────────────────────────────────────────── */

function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        const maxDim = CONFIG.MAX_IMAGE_SIZE;

        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        const base64 = dataUrl.split(',')[1];
        resolve({
          base64,
          mimeType: 'image/jpeg',
          dataUrl,
        });
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function handleImageFile(file) {
  if (!file) return;

  if (!CONFIG.ALLOWED_TYPES.includes(file.type)) {
    showError(t('error_no_image') + ' Use JPEG, PNG, or WebP.');
    return;
  }

  if (file.size > CONFIG.MAX_FILE_SIZE) {
    showError('Image is too large. Please use a photo under 10MB.');
    return;
  }

  compressImage(file).then(imageData => {
    STATE.currentImage = imageData;

    // Show preview
    const preview = document.getElementById('uploadPreview');
    const placeholder = document.getElementById('uploadPlaceholder');
    const previewImg = document.getElementById('previewImage');

    previewImg.src = imageData.dataUrl;
    preview.hidden = false;
    placeholder.hidden = true;

    // Enable diagnose button
    document.getElementById('btnDiagnose').disabled = false;
  }).catch(err => {
    console.error('Image processing error:', err);
    showError('Failed to process image. Please try another photo.');
  });
}


/* ─────────────────────────────────────────────
   4. API LAYER
   ───────────────────────────────────────────── */

async function callDiagnoseAPI() {
  if (!STATE.currentImage) {
    showError(t('error_no_image'));
    return null;
  }

  const plantType = document.getElementById('plantType').value.trim();
  const location = document.getElementById('location').value.trim();
  const symptoms = document.getElementById('symptoms').value.trim();

  let context = '';
  if (plantType) context += `Plant type: ${plantType}. `;
  if (location) context += `Location/climate: ${location}. `;
  if (symptoms) context += `Observed symptoms: ${symptoms}. `;

  try {
    const response = await fetch(`${CONFIG.API_BASE}/api/diagnose`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: STATE.currentImage.base64,
        mimeType: STATE.currentImage.mimeType,
        context: context || undefined,
        language: STATE.language,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    // Server now returns { diagnosis, rawText } or { rawText } or { error }
    return data;
  } catch (err) {
    console.error('Diagnose API error:', err);
    throw err;
  }
}

async function callChatAPI(userMessage) {
  // Build conversation history with image in first message
  if (STATE.conversationHistory.length === 0) {
    // First chat message — include the system context and image
    STATE.conversationHistory.push({
      role: 'user',
      parts: [
        {
          text: `You are a plant health assistant. The user previously received a diagnosis for their plant. Here is the diagnosis context: ${JSON.stringify(STATE.currentDiagnosis)}. The user has a follow-up question. Answer helpfully in ${STATE.language}. ${STATE.language === 'Roman Urdu' ? '(Write Urdu in English alphabets)' : ''} Do NOT return JSON — respond in plain, conversational text.`,
        },
        {
          inline_data: {
            mime_type: STATE.currentImage.mimeType,
            data: STATE.currentImage.base64,
          },
        },
      ],
    });
    STATE.conversationHistory.push({
      role: 'model',
      parts: [{ text: 'I have reviewed your plant photo and diagnosis. Please ask your follow-up question.' }],
    });
  }

  // Add user message
  STATE.conversationHistory.push({
    role: 'user',
    parts: [{ text: userMessage }],
  });

  try {
    const response = await fetch(`${CONFIG.API_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: STATE.conversationHistory }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    const aiText = extractTextFromResponse(data);

    // Add AI response to history
    STATE.conversationHistory.push({
      role: 'model',
      parts: [{ text: aiText }],
    });

    return aiText;
  } catch (err) {
    console.error('Chat API error:', err);
    // Remove the failed user message
    STATE.conversationHistory.pop();
    throw err;
  }
}


/* ─────────────────────────────────────────────
   5. RESPONSE PARSING
   ───────────────────────────────────────────── */

function extractTextFromResponse(data) {
  try {
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } catch {
    return '';
  }
}

function parseStructuredResponse(data) {
  const rawText = extractTextFromResponse(data);
  if (!rawText) return null;

  // Try direct JSON parse
  try {
    return JSON.parse(rawText);
  } catch {
    // Try extracting JSON from markdown code blocks
    const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1].trim());
      } catch { /* fall through */ }
    }

    // Try finding JSON object in text
    const braceMatch = rawText.match(/\{[\s\S]*\}/);
    if (braceMatch) {
      try {
        return JSON.parse(braceMatch[0]);
      } catch { /* fall through */ }
    }

    return null;
  }
}


/* ─────────────────────────────────────────────
   6. UI RENDERING
   ───────────────────────────────────────────── */

function showError(message) {
  // Remove existing errors
  document.querySelectorAll('.error-banner').forEach(el => el.remove());

  const banner = document.createElement('div');
  banner.className = 'error-banner';
  banner.innerHTML = `<i class="ph ph-warning-circle"></i><span>${escapeHtml(message)}</span>`;

  const diagnoseSection = document.getElementById('diagnose');
  diagnoseSection.querySelector('.diagnose-grid').prepend(banner);

  setTimeout(() => banner.remove(), 8000);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function showSkeleton() {
  const section = document.getElementById('results-section');
  const skeleton = document.getElementById('resultsSkeleton');
  const content = document.getElementById('resultsContent');

  section.hidden = false;
  skeleton.hidden = false;
  content.hidden = true;
  section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function hideSkeleton() {
  document.getElementById('resultsSkeleton').hidden = true;
  document.getElementById('resultsContent').hidden = false;
}

function renderResults(diagnosis) {
  STATE.currentDiagnosis = diagnosis;

  // Plant ID Card
  document.getElementById('resultPhoto').src = STATE.currentImage.dataUrl;
  document.getElementById('plantName').textContent = diagnosis.plant || 'Unknown';
  renderConfidenceBadge(
    document.getElementById('plantConfidence'),
    diagnosis.plant_confidence || 'low'
  );

  const healthStatus = document.getElementById('healthStatus');
  if (diagnosis.is_healthy) {
    healthStatus.className = 'health-status healthy';
    healthStatus.textContent = t('healthy_status');
  } else {
    healthStatus.className = 'health-status unhealthy';
    healthStatus.textContent = t('unhealthy_status');
  }

  // Issues
  const issuesList = document.getElementById('issuesList');
  issuesList.innerHTML = '';
  if (diagnosis.likely_issues && diagnosis.likely_issues.length > 0) {
    diagnosis.likely_issues.forEach(issue => {
      issuesList.appendChild(createIssueItem(issue));
    });
    document.getElementById('issuesCard').style.display = '';
  } else {
    document.getElementById('issuesCard').style.display = 'none';
  }

  // Limitations
  const limitationsText = document.getElementById('limitationsText');
  limitationsText.textContent = diagnosis.what_i_cant_tell || '';
  document.getElementById('limitationsCard').style.display =
    diagnosis.what_i_cant_tell ? '' : 'none';

  // Follow-up Questions
  const questionsList = document.getElementById('questionsList');
  questionsList.innerHTML = '';
  if (diagnosis.follow_up_questions && diagnosis.follow_up_questions.length > 0) {
    diagnosis.follow_up_questions.forEach(q => {
      const btn = document.createElement('button');
      btn.className = 'question-btn';
      btn.textContent = q;
      btn.addEventListener('click', () => {
        sendFollowUpFromQuestion(q);
      });
      questionsList.appendChild(btn);
    });
    document.getElementById('questionsCard').style.display = '';
  } else {
    document.getElementById('questionsCard').style.display = 'none';
  }

  // Treatment Steps
  const treatmentList = document.getElementById('treatmentList');
  treatmentList.innerHTML = '';
  if (diagnosis.treatment_steps && diagnosis.treatment_steps.length > 0) {
    diagnosis.treatment_steps.forEach((step, i) => {
      treatmentList.appendChild(createTreatmentItem(step, i + 1));
    });
    document.getElementById('treatmentCard').style.display = '';
  } else {
    document.getElementById('treatmentCard').style.display = 'none';
  }

  // When to Get Help
  document.getElementById('helpText').textContent = diagnosis.when_to_get_help || '';
  document.getElementById('helpCard').style.display =
    diagnosis.when_to_get_help ? '' : 'none';

  // Safety Note
  document.getElementById('safetyText').textContent =
    diagnosis.safety_note || t('footer_disclaimer');

  hideSkeleton();

  // Show chat section
  const chatSection = document.getElementById('chat-section');
  chatSection.hidden = false;

  // Save to history
  saveDiagnosisToHistory(diagnosis);
}

function renderConfidenceBadge(container, level) {
  const dotsCount = level === 'high' ? 3 : level === 'medium' ? 2 : 1;
  container.className = `confidence-badge ${level}`;
  container.innerHTML = `
    <span class="confidence-dots">
      ${[1, 2, 3].map(i =>
        `<span class="confidence-dot ${i <= dotsCount ? 'filled' : ''}"></span>`
      ).join('')}
    </span>
    <span class="confidence-label">${level.toUpperCase()}</span>
  `;
}

function createIssueItem(issue) {
  const div = document.createElement('div');
  div.className = 'issue-item';

  const categoryLabels = {
    disease: '🦠 Disease',
    pest: '🐛 Pest',
    nutrient_deficiency: '🧪 Nutrient',
    environmental_stress: '🌡 Environment',
  };

  div.innerHTML = `
    <div class="issue-header">
      <span class="issue-name">${escapeHtml(issue.name || '')}</span>
      <div style="display:flex;gap:var(--space-2);align-items:center;">
        <span class="issue-category">${categoryLabels[issue.category] || issue.category || ''}</span>
        <span class="confidence-badge ${issue.confidence || 'low'}">
          <span class="confidence-dots">
            ${[1, 2, 3].map(i =>
              `<span class="confidence-dot ${i <= (issue.confidence === 'high' ? 3 : issue.confidence === 'medium' ? 2 : 1) ? 'filled' : ''}"></span>`
            ).join('')}
          </span>
          <span class="confidence-label">${(issue.confidence || 'low').toUpperCase()}</span>
        </span>
      </div>
    </div>
    <p class="issue-reasoning">${escapeHtml(issue.reasoning || '')}</p>
  `;
  return div;
}

function createTreatmentItem(step, index) {
  const div = document.createElement('div');
  div.className = 'treatment-item';
  div.innerHTML = `
    <div class="treatment-number">${index}</div>
    <div class="treatment-content">
      <p class="treatment-step-text">${escapeHtml(step.step || '')}</p>
      <div class="treatment-tags">
        <span class="treatment-tag tag-cost-${step.cost || 'free'}">${t('cost_' + (step.cost || 'free'))}</span>
        <span class="treatment-tag tag-urgency-${step.urgency || 'when_possible'}">${t('urgency_' + (step.urgency || 'when_possible'))}</span>
      </div>
    </div>
  `;
  return div;
}

function renderRawResponse(text) {
  hideSkeleton();
  const content = document.getElementById('resultsContent');
  content.hidden = false;
  content.innerHTML = `
    <div class="result-card">
      <div class="error-banner">
        <i class="ph ph-warning-circle"></i>
        <span>${t('error_parse')}</span>
      </div>
      <pre style="white-space:pre-wrap;word-break:break-word;font-size:0.8125rem;color:var(--color-text-secondary);line-height:1.7;padding:var(--space-4);background:var(--color-bg-alt);border-radius:var(--radius-md);">${escapeHtml(text)}</pre>
    </div>
  `;
}


/* ─────────────────────────────────────────────
   7. CHAT UI
   ───────────────────────────────────────────── */

function addChatMessage(text, role) {
  const container = document.getElementById('chatMessages');
  const msg = document.createElement('div');
  msg.className = `chat-message ${role}`;
  msg.innerHTML = `
    <div class="chat-avatar">
      <i class="ph ${role === 'ai' ? 'ph-plant' : 'ph-user'}"></i>
    </div>
    <div class="chat-bubble">${escapeHtml(text)}</div>
  `;
  container.appendChild(msg);
  container.scrollTop = container.scrollHeight;
}

function sendFollowUpFromQuestion(question) {
  const chatSection = document.getElementById('chat-section');
  chatSection.hidden = false;
  chatSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

  document.getElementById('chatInput').value = question;
  handleSendChat();
}

async function handleSendChat() {
  const input = document.getElementById('chatInput');
  const message = input.value.trim();
  if (!message || STATE.isLoading) return;

  input.value = '';
  addChatMessage(message, 'user');
  document.getElementById('btnSendChat').disabled = true;

  try {
    const aiResponse = await callChatAPI(message);
    addChatMessage(aiResponse, 'ai');
  } catch (err) {
    addChatMessage(t('error_api'), 'ai');
  } finally {
    document.getElementById('btnSendChat').disabled = false;
    input.focus();
  }
}


/* ─────────────────────────────────────────────
   8. CASE HISTORY (localStorage)
   ───────────────────────────────────────────── */

function saveDiagnosisToHistory(diagnosis) {
  const history = getHistory();
  const entry = {
    id: Date.now(),
    date: new Date().toISOString(),
    thumbnail: STATE.currentImage.dataUrl,
    plant: diagnosis.plant || 'Unknown',
    mainIssue: diagnosis.likely_issues?.[0]?.name || (diagnosis.is_healthy ? 'Healthy' : 'Unknown'),
    confidence: diagnosis.likely_issues?.[0]?.confidence || diagnosis.plant_confidence || 'low',
    language: STATE.language,
  };

  history.unshift(entry);
  // Keep only last 20
  if (history.length > 20) history.splice(20);
  localStorage.setItem('plantdoc_history', JSON.stringify(history));
  renderHistory();
}

function getHistory() {
  try {
    return JSON.parse(localStorage.getItem('plantdoc_history') || '[]');
  } catch {
    return [];
  }
}

function renderHistory() {
  const history = getHistory();
  const container = document.getElementById('historyList');
  const emptyState = document.getElementById('historyEmpty');
  const clearBtn = document.getElementById('btnClearHistory');

  container.innerHTML = '';

  if (history.length === 0) {
    container.appendChild(emptyState);
    emptyState.hidden = false;
    clearBtn.hidden = true;
    return;
  }

  emptyState.hidden = true;
  clearBtn.hidden = false;

  history.forEach(entry => {
    const card = document.createElement('div');
    card.className = 'history-card';
    card.innerHTML = `
      <img class="history-card-thumb" src="${entry.thumbnail}" alt="${escapeHtml(entry.plant)}" loading="lazy">
      <div class="history-card-body">
        <div class="history-card-plant">${escapeHtml(entry.plant)}</div>
        <div class="history-card-issue">${escapeHtml(entry.mainIssue)}</div>
        <div class="history-card-date">${new Date(entry.date).toLocaleDateString()}</div>
      </div>
    `;
    container.appendChild(card);
  });
}

function clearHistory() {
  if (confirm('Are you sure you want to clear all diagnosis history?')) {
    localStorage.removeItem('plantdoc_history');
    renderHistory();
  }
}


/* ─────────────────────────────────────────────
   9. EVENT HANDLERS
   ───────────────────────────────────────────── */

async function handleDiagnose() {
  if (!STATE.currentImage || STATE.isLoading) return;

  STATE.isLoading = true;
  STATE.conversationHistory = [];
  const btn = document.getElementById('btnDiagnose');
  btn.classList.add('loading');
  btn.disabled = true;

  showSkeleton();

  try {
    const serverResponse = await callDiagnoseAPI();

    if (serverResponse.diagnosis) {
      // Server extracted JSON successfully
      STATE.currentDiagnosis = serverResponse.diagnosis;
      renderResults(serverResponse.diagnosis);
    } else if (serverResponse.rawText) {
      // Server couldn't extract JSON — show raw text
      renderRawResponse(serverResponse.rawText);
    } else {
      renderRawResponse('No response received from the AI. Please try again.');
    }
  } catch (err) {
    document.getElementById('resultsSkeleton').hidden = true;
    document.getElementById('results-section').hidden = true;
    showError(err.message || t('error_api'));
  } finally {
    STATE.isLoading = false;
    btn.classList.remove('loading');
    btn.disabled = false;
  }
}

function handleRemoveImage() {
  STATE.currentImage = null;
  document.getElementById('uploadPreview').hidden = true;
  document.getElementById('uploadPlaceholder').hidden = false;
  document.getElementById('previewImage').src = '';
  document.getElementById('btnDiagnose').disabled = true;

  // Reset results
  document.getElementById('results-section').hidden = true;
  document.getElementById('chat-section').hidden = true;
  STATE.conversationHistory = [];
  STATE.currentDiagnosis = null;
}


/* ─────────────────────────────────────────────
   10. SCROLL REVEAL (IntersectionObserver)
   ───────────────────────────────────────────── */

function initScrollReveal() {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) {
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: '-40px 0px' }
  );

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}


/* ─────────────────────────────────────────────
   11. NAVBAR SCROLL EFFECT
   ───────────────────────────────────────────── */

function initNavScroll() {
  const navbar = document.getElementById('navbar');
  let lastScroll = 0;

  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    navbar.classList.toggle('scrolled', scrollY > 80);
    lastScroll = scrollY;
  }, { passive: true });
}


/* ─────────────────────────────────────────────
   12. INITIALIZATION
   ───────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  // Apply saved language
  applyLanguage();

  // Language selector
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      STATE.language = btn.dataset.lang;
      applyLanguage();
    });
  });

  // Upload zone - click
  const uploadArea = document.getElementById('uploadArea');
  const imageInput = document.getElementById('imageInput');

  document.getElementById('btnUpload').addEventListener('click', (e) => {
    e.stopPropagation();
    imageInput.removeAttribute('capture');
    imageInput.click();
  });

  document.getElementById('btnCamera').addEventListener('click', (e) => {
    e.stopPropagation();
    imageInput.setAttribute('capture', 'environment');
    imageInput.click();
  });

  uploadArea.addEventListener('click', () => {
    if (!STATE.currentImage) {
      imageInput.removeAttribute('capture');
      imageInput.click();
    }
  });

  imageInput.addEventListener('change', (e) => {
    handleImageFile(e.target.files[0]);
  });

  // Drag and drop
  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('drag-over');
  });

  uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('drag-over');
  });

  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) handleImageFile(file);
  });

  // Remove image
  document.getElementById('btnRemoveImage').addEventListener('click', (e) => {
    e.stopPropagation();
    handleRemoveImage();
  });

  // Diagnose button
  document.getElementById('btnDiagnose').addEventListener('click', handleDiagnose);

  // Chat
  const chatInput = document.getElementById('chatInput');
  const btnSend = document.getElementById('btnSendChat');

  chatInput.addEventListener('input', () => {
    btnSend.disabled = !chatInput.value.trim();
  });

  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendChat();
    }
  });

  btnSend.addEventListener('click', handleSendChat);

  // History
  document.getElementById('btnClearHistory').addEventListener('click', clearHistory);
  renderHistory();

  // Scroll effects
  initScrollReveal();
  initNavScroll();

  console.log('🌿 PlantDoc AI initialized');
});
