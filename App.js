const API_URL = "http://127.0.0.1:8000/predict";

const LABELS = ["Entire home/apt", "Private room", "Shared room"];

const RULES = {
  latitude:                       v => v !== "" && +v >= -90  && +v <= 90,
  longitude:                      v => v !== "" && +v >= -180 && +v <= 180,
  price:                          v => v !== "" && +v > 0,
  minimum_nights:                 v => v !== "" && +v >= 1   && +v <= 365,
  number_of_reviews:              v => v !== "" && +v >= 0,
  reviews_per_month:              v => v !== "" && +v >= 0,
  calculated_host_listings_count: v => v !== "" && +v >= 0,
  availability_365:               v => v !== "" && +v >= 0   && +v <= 365,
  neighbourhood_group:            v => v !== "",
  neighbourhood:                  v => v.trim() !== "",
};

const MSGS = {
  latitude:                       "Must be between -90 and 90",
  longitude:                      "Must be between -180 and 180",
  price:                          "Must be greater than 0",
  minimum_nights:                 "Must be between 1 and 365",
  number_of_reviews:              "Must be ≥ 0",
  reviews_per_month:              "Must be ≥ 0",
  calculated_host_listings_count: "Must be ≥ 0",
  availability_365:               "Must be between 0 and 365",
  neighbourhood_group:            "Please select a borough",
  neighbourhood:                  "Cannot be empty",
};

function $(id) { return document.getElementById(id); }

function showOnly(id) {
  ["state-empty","state-loading","state-error","state-success"].forEach(s => {
    $(s).classList.toggle("hidden", s !== id);
  });
}

function setErr(field, msg) {
  $("e-" + field).textContent = msg;
  $(field) && $(field).classList.toggle("invalid", !!msg);
}

function clearAll() {
  Object.keys(RULES).forEach(f => setErr(f, ""));
}

function validate() {
  let ok = true;
  clearAll();
  for (const [f, rule] of Object.entries(RULES)) {
    const el = $(f);
    if (!el) continue;
    const v = el.value;
    if (!rule(v)) { setErr(f, MSGS[f]); ok = false; }
  }
  return ok;
}

function payload() {
  return {
    latitude:                       parseFloat($("latitude").value),
    longitude:                      parseFloat($("longitude").value),
    price:                          parseFloat($("price").value),
    minimum_nights:                 parseInt($("minimum_nights").value),
    number_of_reviews:              parseInt($("number_of_reviews").value),
    reviews_per_month:              parseFloat($("reviews_per_month").value),
    calculated_host_listings_count: parseInt($("calculated_host_listings_count").value),
    availability_365:               parseInt($("availability_365").value),
    neighbourhood_group:            $("neighbourhood_group").value,
    neighbourhood:                  $("neighbourhood").value.trim(),
  };
}

function renderResult(data) {
  const { predicted_room_type, probability } = data;

  const pairs = probability
    .map((p, i) => ({ label: LABELS[i] || `Class ${i}`, p }))
    .sort((a, b) => b.p - a.p);

  $("result-type").textContent = predicted_room_type;
  $("conf-val").textContent    = (pairs[0].p * 100).toFixed(1) + "%";

  const bars = $("prob-bars");
  bars.innerHTML = "";
  pairs.forEach(({ label, p }, i) => {
    const pct = (p * 100).toFixed(1);
    const row = document.createElement("div");
    row.className = "prob-row";
    row.innerHTML = `
      <div class="prob-meta">
        <span class="prob-name">${label}</span>
        <span class="prob-pct">${pct}%</span>
      </div>
      <div class="prob-track">
        <div class="prob-fill c${i}" style="width:0%"></div>
      </div>`;
    bars.appendChild(row);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      row.querySelector(".prob-fill").style.width = pct + "%";
    }));
  });

  $("result-time").textContent = "Predicted at " + new Date().toLocaleTimeString();
  showOnly("state-success");
}

async function predict() {
  if (!validate()) return;

  const btn = $("predict-btn");
  btn.disabled = true;
  $("btn-text").textContent = "⏳ Analyzing…";
  showOnly("state-loading");

  try {
    const res = await fetch(API_URL, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(payload()),
    });

    if (!res.ok) {
      let msg = `Server error ${res.status}`;
      try {
        const err = await res.json();
        if (Array.isArray(err.detail)) msg = err.detail.map(e => e.msg).join("; ");
        else if (err.detail) msg = String(err.detail);
      } catch(_) {}
      throw new Error(msg);
    }

    renderResult(await res.json());

  } catch (err) {
    let msg = err.message || "Unknown error";
    if (err instanceof TypeError) {
      msg = "Cannot reach FastAPI at " + API_URL + ". Make sure uvicorn is running.";
    }
    $("err-msg").textContent = msg;
    showOnly("state-error");
  } finally {
    btn.disabled = false;
    $("btn-text").textContent = "🔍 Predict Room Type";
  }
}

$("form").addEventListener("submit", e => { e.preventDefault(); predict(); });

$("reset-btn").addEventListener("click", () => {
  $("form").reset();
  clearAll();
  showOnly("state-empty");
});

Object.keys(RULES).forEach(f => {
  const el = $(f);
  if (el) el.addEventListener("input",  () => setErr(f, ""));
  if (el) el.addEventListener("change", () => setErr(f, ""));
});

showOnly("state-empty");