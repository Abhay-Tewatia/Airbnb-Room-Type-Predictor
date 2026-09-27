// AirPredict – app.js
 
const API_BASE = "https://airbnb-room-type-predictor-1-mp7g.onrender.com";

/* ─── Room-type metadata ─────────────────────── */
const ROOM_META = {
  'Entire home/apt': {
    icon: '🏠', color: '#6a8cf8',
    desc: 'The listing is the entire property — guests have it all to themselves.'
  },
  'Private room': {
    icon: '🛏', color: '#a78bfa',
    desc: 'A private bedroom within a shared home. Host or other guests may share common areas.'
  },
  'Shared room': {
    icon: '🤝', color: '#34d399',
    desc: 'A shared sleeping space — budget-friendly and great for solo travellers.'
  },
};

/* ─── State ──────────────────────────────────── */
let currentStep = 1;
const TOTAL_STEPS = 4;

/* ─── Particle Canvas ────────────────────────── */
(function initParticles() {
  const canvas = document.getElementById('particle-canvas');
  const ctx = canvas.getContext('2d');
  let W, H, particles;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function makeParticle() {
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.5 + 0.3,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      alpha: Math.random() * 0.5 + 0.1,
    };
  }

  function init() {
    resize();
    particles = Array.from({ length: 120 }, makeParticle);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = W;
      if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H;
      if (p.y > H) p.y = 0;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(106,140,248,${p.alpha})`;
      ctx.fill();
    });
    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize);
  init();
  draw();
})();

/* ─── Step Navigation ────────────────────────── */
function setStep(n) {
  // Hide all sections
  document.querySelectorAll('.form-section').forEach(s => s.classList.remove('active'));
  document.getElementById(`step-${n}`).classList.add('active');

  // Update step indicators
  document.querySelectorAll('.step').forEach(el => {
    const s = parseInt(el.dataset.step);
    el.classList.remove('active', 'done');
    if (s === n) el.classList.add('active');
    if (s < n)  el.classList.add('done');
  });

  // Update progress bar
  document.getElementById('progressBar').style.width = `${(n / TOTAL_STEPS) * 100}%`;
  currentStep = n;
}

function validateStep(n) {
  const fields = getStepFields(n);
  let ok = true;
  fields.forEach(id => {
    const el = document.getElementById(id);
    const errEl = document.getElementById(`err-${id}`);
    const val = el.value.trim();
    let msg = '';
    if (!val) {
      msg = 'This field is required.';
    } else if (el.type === 'number') {
      const num = parseFloat(val);
      if (isNaN(num)) { msg = 'Must be a number.'; }
      else if (el.min !== '' && num < parseFloat(el.min)) {
        msg = `Must be ≥ ${el.min}.`;
      } else if (el.max !== '' && num > parseFloat(el.max)) {
        msg = `Must be ≤ ${el.max}.`;
      }
    }
    if (msg) {
      ok = false;
      el.classList.add('error');
      if (errEl) errEl.textContent = msg;
    } else {
      el.classList.remove('error');
      if (errEl) errEl.textContent = '';
    }
  });
  return ok;
}

function getStepFields(n) {
  return {
    1: ['neighbourhood_group', 'neighbourhood', 'latitude', 'longitude'],
    2: ['price', 'minimum_nights', 'calculated_host_listings_count'],
    3: ['number_of_reviews', 'reviews_per_month'],
    4: ['availability_365'],
  }[n] || [];
}

function nextStep(current) {
  if (!validateStep(current)) return;
  setStep(current + 1);
}
function prevStep(current) { setStep(current - 1); }

/* ─── Range Slider Sync ──────────────────────── */
// Price slider ↔ input
const priceInput  = document.getElementById('price');
const priceSlider = document.getElementById('priceSlider');

priceSlider.addEventListener('input', () => {
  priceInput.value = priceSlider.value;
  updateSliderBg(priceSlider, 1, 1000);
});
priceInput.addEventListener('input', () => {
  const v = Math.min(1000, Math.max(1, priceInput.value || 1));
  priceSlider.value = v;
  updateSliderBg(priceSlider, 1, 1000);
});

// Availability slider
const availSlider  = document.getElementById('availability_365');
const availDisplay = document.getElementById('availDisplay');

availSlider.addEventListener('input', () => {
  const v = parseInt(availSlider.value);
  availDisplay.textContent = v;
  updateSliderBg(availSlider, 0, 365);
  updateBuckets(v);
});

function updateSliderBg(slider, min, max) {
  const pct = ((slider.value - min) / (max - min)) * 100;
  slider.style.setProperty('--pct', pct + '%');
}

function updateBuckets(v) {
  document.getElementById('bucket-low').classList.toggle('active-low',  v >= 0   && v <= 120);
  document.getElementById('bucket-mid').classList.toggle('active-mid',  v > 120  && v <= 250);
  document.getElementById('bucket-high').classList.toggle('active-high', v > 250);
}

// Init slider visuals
updateSliderBg(priceSlider, 1, 1000);
updateSliderBg(availSlider, 0, 365);
updateBuckets(180);

/* ─── Clear errors on input ──────────────────── */
document.querySelectorAll('input, select').forEach(el => {
  el.addEventListener('input', () => {
    el.classList.remove('error');
    const err = document.getElementById(`err-${el.id}`);
    if (err) err.textContent = '';
  });
});

/* ─── Form Submit ────────────────────────────── */
document.getElementById('predictForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!validateStep(4)) return;

  const btn = document.getElementById('predictBtn');
  btn.classList.add('loading');

  const payload = {
    neighbourhood_group:              document.getElementById('neighbourhood_group').value,
    neighbourhood:                    document.getElementById('neighbourhood').value,
    latitude:                  parseFloat(document.getElementById('latitude').value),
    longitude:                 parseFloat(document.getElementById('longitude').value),
    price:                     parseFloat(document.getElementById('price').value),
    minimum_nights:              parseInt(document.getElementById('minimum_nights').value),
    number_of_reviews:           parseInt(document.getElementById('number_of_reviews').value),
    reviews_per_month:         parseFloat(document.getElementById('reviews_per_month').value),
    calculated_host_listings_count: parseInt(document.getElementById('calculated_host_listings_count').value),
    availability_365:            parseInt(document.getElementById('availability_365').value),
  };

  try {
    const res = await fetch(`${API_BASE}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || `Server error ${res.status}`);
    }

    const data = await res.json();
    showResult(data, payload);
  } catch (err) {
    showError(err.message);
  } finally {
    btn.classList.remove('loading');
  }
});

/* ─── Show Result ────────────────────────────── */
function showResult(data, payload) {
  const panel = document.getElementById('resultPanel');
  const type  = data.predicted_room_type;
  const probs = data.probability; // array [p0, p1, p2, ...]

  // Determine class labels from model output order
  // Common Airbnb room types
  const labels = ['Entire home/apt', 'Private room', 'Shared room'];
  const meta   = ROOM_META[type] || { icon: '🏘', color: '#6a8cf8', desc: '' };

  // Header
  document.getElementById('resultIcon').textContent = meta.icon;
  document.getElementById('resultType').textContent = type;

  // Find top confidence
  const topIdx = probs.indexOf(Math.max(...probs));
  const topPct = (Math.max(...probs) * 100).toFixed(1);
  document.getElementById('confidenceBadge').textContent = `${topPct}%`;

  // Probability bars
  const barsContainer = document.getElementById('probBars');
  barsContainer.innerHTML = '';
  const barColors = ['#6a8cf8', '#a78bfa', '#34d399'];

  probs.forEach((p, i) => {
    const label = labels[i] || `Class ${i}`;
    const pct   = (p * 100).toFixed(1);
    const color = barColors[i % barColors.length];
    const isTop = i === topIdx;
    barsContainer.innerHTML += `
      <div class="prob-row">
        <div class="prob-row-header">
          <span class="prob-row-name" style="color:${isTop ? color : ''};font-weight:${isTop ? 700 : 500}">
            ${isTop ? '✦ ' : ''}${label}
          </span>
          <span class="prob-row-pct">${pct}%</span>
        </div>
        <div class="prob-bar-bg">
          <div class="prob-bar-fill" id="bar-${i}" style="background:${isTop ? `linear-gradient(90deg,${color}cc,${color})` : color + '66'}"></div>
        </div>
      </div>
    `;
  });

  // Animate bars after paint
  requestAnimationFrame(() => {
    probs.forEach((p, i) => {
      const bar = document.getElementById(`bar-${i}`);
      if (bar) setTimeout(() => { bar.style.width = `${(p * 100).toFixed(1)}%`; }, 80 * i);
    });
  });

  // Meta summary
  document.getElementById('resultMeta').innerHTML = `
    <strong style="color:var(--text)">Insight:</strong> ${meta.desc}
    &nbsp;·&nbsp; Listing in <em>${payload.neighbourhood}, ${payload.neighbourhood_group}</em>
    at $${payload.price}/night with ${payload.availability_365} days availability.
  `;

  panel.classList.remove('visible');
  panel.offsetHeight; // reflow
  panel.classList.add('visible');
  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ─── Show Error ─────────────────────────────── */
function showError(msg) {
  const panel = document.getElementById('resultPanel');
  panel.innerHTML = `
    <div style="text-align:center;padding:20px 0">
      <div style="font-size:2.5rem;margin-bottom:16px">⚠️</div>
      <div style="font-family:'Space Grotesk',sans-serif;font-size:1.2rem;font-weight:700;color:#f87171;margin-bottom:10px">Prediction Failed</div>
      <div style="font-size:0.88rem;color:var(--text-muted);margin-bottom:24px;word-break:break-word">${msg}</div>
      <p style="font-size:0.8rem;color:var(--text-dim)">Make sure the FastAPI server is running at <code style="color:var(--accent)">${API_BASE}</code></p>
      <button class="btn btn-ghost reset-btn" onclick="resetForm()" style="margin-top:20px;width:100%;justify-content:center">
        Try Again
      </button>
    </div>
  `;
  panel.classList.remove('visible');
  panel.offsetHeight;
  panel.classList.add('visible');
  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ─── Reset ──────────────────────────────────── */
function resetForm() {
  document.getElementById('predictForm').reset();
  document.getElementById('resultPanel').classList.remove('visible');
  document.getElementById('resultPanel').innerHTML = '';
  document.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
  document.querySelectorAll('.field-error').forEach(el => el.textContent = '');
  priceSlider.value = 120;
  updateSliderBg(priceSlider, 1, 1000);
  availDisplay.textContent = '180';
  availSlider.value = 180;
  updateSliderBg(availSlider, 0, 365);
  updateBuckets(180);
  setStep(1);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ─── Initial step ───────────────────────────── */
setStep(1);