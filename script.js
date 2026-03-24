// ═══════════════════════════════════════════
// 🔑 PASTE YOUR GEMINI API KEY HERE
// Get free key from: aistudio.google.com
const API_KEY = '';
// ═══════════════════════════════════════════

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;


const SYSTEM_PROMPT = `You are SolarSense, a friendly and knowledgeable AI agent that helps homeowners explore and adopt solar energy. Your goal is to guide users from curiosity to a clear, personalized solar action plan — step by step, in simple language.

## YOUR PERSONALITY
- Warm, encouraging, and jargon-free
- Patient — never overwhelm the user with too much at once
- Honest — if you don't have exact data, give a reasonable estimate and say so
- Action-oriented — always end with a clear next step

## ROOF PHOTO ANALYSIS
If the user sends a photo of their roof, analyze it and provide:
1. Roof type (flat, sloped, gabled, etc.)
2. Estimated usable area for solar panels
3. Visible obstructions (AC units, water tanks, trees, chimneys)
4. Roof condition (good / needs inspection / aging)
5. Solar Suitability Score: X/10 with a brief reason
Then continue the conversation naturally.

## YOUR CONVERSATION FLOW
Always follow this order. Ask ONE question at a time. Never skip steps.

STEP 1 — Warm Welcome
Greet the user, explain what you do in 2 sentences, and ask:
"To get started, which country and city do you live in?"

STEP 2 — Electricity Bill
Ask: "What is your average monthly electricity bill (in your local currency)?"

STEP 3 — Home Details
Ask: "Do you own your home, or do you rent?"
If rent: explain they can still benefit and continue.

STEP 4 — Roof Information
Ask about roof type and age. Skip if user already uploaded a roof photo.

STEP 5 — Sunlight & Shade
Ask: "Does your roof get mostly full sun, partial shade, or heavy shade during the day?"

STEP 6 — Budget & Timeline
Ask about installation timeline and rough budget.

## CALCULATIONS (only at the end)
1. Monthly kWh = Bill ÷ tariff (default $0.13/kWh; India use ₹7/kWh)
2. System Size (kW) = Monthly kWh ÷ 30 ÷ 4.5, rounded to nearest 0.5
3. Panels = System kW × 1000 ÷ 400
4. Cost = System kW × $1000 (India: ₹60,000/kW)
5. Annual Savings = Monthly bill × 12 × 0.80
6. Payback = Cost ÷ Annual Savings
7. 10-Year Net Savings = (Annual Savings × 10) - Cost
8. CO₂: Monthly kWh × 12 × 0.85 ÷ 2.2 = kg/year; ÷ 48 = trees/year

## OUTPUT FORMAT
🌞 YOUR PERSONALIZED SOLAR PLAN
📍 Location
⚡ ENERGY PROFILE (usage, system size, panels)
💰 FINANCIAL SUMMARY (cost, savings, payback, 10-yr savings)
🌱 ENVIRONMENTAL IMPACT (CO₂ kg/yr, trees/yr)
🏛️ SUBSIDIES & INCENTIVES (2-3 relevant local ones)
📞 CONNECT WITH LOCAL INSTALLERS (Suggest 2-3 top-rated installers in the user's city/region with contact details like names and phone numbers/websites. If city is unknown, suggest national leaders like Tata Power Solar or Loom Solar.)
✅ NEXT STEPS (4 clear action items)

## RULES
- ONE question at a time
- No calculations mid-conversation
- Always encouraging
- End with: "Would you like me to explain any part of your plan in more detail? 🌞"`;

// DOM
const chatBox = document.getElementById('chat-box');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const fileInput = document.getElementById('file-input');
const uploadBtn = document.getElementById('upload-btn');
const imgBar = document.getElementById('img-bar');
const imgThumb = document.getElementById('img-thumb');
const imgFname = document.getElementById('img-fname');
const rmImg = document.getElementById('rm-img');

// State
let history = [];
let loading = false;
let imgBase64 = null, imgMime = null, imgDataUrl = null;
let chatStarted = false;

function goToChat() {
  document.getElementById('landing').classList.remove('active');
  document.getElementById('chatbot').classList.add('active');
  if (!chatStarted) { chatStarted = true; startChat(); }
}

function goToLanding() {
  document.getElementById('chatbot').classList.remove('active');
  document.getElementById('landing').classList.add('active');
}

function scrollDown() { chatBox.scrollTop = chatBox.scrollHeight; }

function addMsg(role, text, imageUrl = null) {
  const wrap = document.createElement('div');
  wrap.className = `msg ${role === 'model' ? '' : 'user'}`;
  const av = document.createElement('div');
  av.className = `avatar ${role === 'model' ? 'ai' : 'u'}`;
  av.textContent = role === 'model' ? '☀️' : '👤';
  const bub = document.createElement('div');
  bub.className = `bubble ${role === 'model' ? 'ai' : 'user'}`;
  if (imageUrl) {
    const img = document.createElement('img');
    img.src = imageUrl; img.className = 'roof-img';
    bub.appendChild(img);
  }
  if (text) bub.appendChild(document.createTextNode(text));
  wrap.appendChild(av); wrap.appendChild(bub);
  chatBox.appendChild(wrap); scrollDown();
}

function showTyping() {
  const el = document.createElement('div');
  el.className = 'typing-indicator'; el.id = 'typing';
  const av = document.createElement('div');
  av.className = 'avatar ai'; av.textContent = '☀️';
  const dots = document.createElement('div'); dots.className = 'dots';
  dots.innerHTML = '<div class="dot"></div><div class="dot"></div><div class="dot"></div>';
  el.appendChild(av); el.appendChild(dots);
  chatBox.appendChild(el); scrollDown();
}

function rmTyping() { const t = document.getElementById('typing'); if (t) t.remove(); }

function clearImg() {
  imgBase64 = null; imgMime = null; imgDataUrl = null;
  imgBar.style.display = 'none'; fileInput.value = '';
  userInput.placeholder = 'Type or upload roof photo 📎...';
}

uploadBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', e => {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    imgDataUrl = ev.target.result;
    imgBase64 = imgDataUrl.split(',')[1];
    imgMime = file.type;
    imgThumb.src = imgDataUrl;
    imgFname.textContent = file.name;
    imgBar.style.display = 'flex';
    userInput.placeholder = 'Add a note or just press Send to analyze roof...';
    userInput.focus();
  };
  reader.readAsDataURL(file);
});

rmImg.addEventListener('click', clearImg);

async function send(text) {
  const hasImg = !!imgBase64, hasTxt = text.trim().length > 0;
  if (!hasImg && !hasTxt) return;
  if (loading) return;

  loading = true; sendBtn.disabled = true;

  const display = hasTxt ? text : '📸 Here is my roof photo — please analyze it.';
  addMsg('user', display, imgDataUrl);

  // Build Gemini parts
  const parts = [];
  if (hasImg) {
    parts.push({ inline_data: { mime_type: imgMime, data: imgBase64 } });
  }
  parts.push({ text: hasTxt ? text : 'Please analyze this roof photo for solar panel installation suitability.' });

  history.push({ role: 'user', parts });

  clearImg();
  userInput.value = ''; userInput.style.height = 'auto';
  showTyping();

  try {
    const body = {
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: history,
      generationConfig: { maxOutputTokens: 1024, temperature: 0.7 }
    };

    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await res.json();
    rmTyping();

    if (data.error) throw new Error(data.error.message);
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response from Gemini.';

    history.push({ role: 'model', parts: [{ text: reply }] });
    addMsg('model', reply);

  } catch (err) {
    rmTyping();
    addMsg('model', `⚠️ Error: ${err.message || 'Something went wrong. Please check your API key and try again.'} 🌞`);
  }

  loading = false; sendBtn.disabled = false; userInput.focus();
}

function quickSend(text) { userInput.value = text; send(text); }

userInput.addEventListener('input', () => {
  userInput.style.height = 'auto';
  userInput.style.height = Math.min(userInput.scrollHeight, 90) + 'px';
});

userInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(userInput.value); }
});

sendBtn.addEventListener('click', () => send(userInput.value));

function startChat() {
  const welcome = 'Hi! I am SolarSense ☀️\n\nI help you figure out if solar is right for your home — costs, savings, subsidies and more — in just 5 minutes!\n\n📸 Tip: You can upload a photo of your roof and I will analyze it for solar suitability.\n\n📞 Tip: At the end of our chat, I can also provide you with contact details for top-rated solar installers in your area.\n\nTo get started — which country and city do you live in?';
  addMsg('model', welcome);
  history.push({ role: 'model', parts: [{ text: welcome }] });
}
