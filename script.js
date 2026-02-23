const countdownEl = document.getElementById("countdown");
const phaseEl = document.getElementById("current-phase");
const infoEl = document.getElementById("info");

const refreshBtn = document.getElementById("refreshBtn");
refreshBtn.addEventListener("click", fetchPrayer);
const testModeCheckbox = document.getElementById("testModeCheckbox");
const testMaghribInput = document.getElementById("testMaghribTime");

let maghribTime = null;

// get Maghrib time from API
async function fetchPrayer() {

  if (testModeCheckbox.checked) {
    // Use simulated time
    const fakeTimeStr = testMaghribInput.value; // HH:MM
    maghribTime = parseTimeString(fakeTimeStr);
    infoEl.textContent = `Test Mode: Maghrib at ${fakeTimeStr}`;
    startTimer();
    return;
  }

  phaseEl.textContent = "Fetching prayer times…";
  try {
    const res = await fetch(
      `https://api.aladhan.com/v1/timingsByCity?city=Islamabad&country=Pakistan&method=2`
    );
    const data = await res.json();
    const maghribStr = data.data.timings.Maghrib; // HH:MM format
    maghribTime = parseTimeString(maghribStr);

    infoEl.textContent = `Maghrib: ${maghribStr}`;
    startTimer();
  } catch (err) {
    phaseEl.textContent = "Error fetching prayer time";
    console.error(err);
  }
}

function parseTimeString(t) {
  const [h, m] = t.split(":").map(Number);
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0);
  return d;
}

function startTimer() {
  if (!maghribTime) return;

  setInterval(() => {
    const now = new Date();

    // compute intervals
    const exerciseStart = new Date(maghribTime.getTime() - 30 * 60 * 1000);
    const meditateStart = new Date(maghribTime.getTime() - 15 * 60 * 1000);
    const eatEnd = new Date(maghribTime.getTime() + 13 * 60 * 1000);

    let phase, diff;

    if (now < exerciseStart) {
      phase = "Before exercise";
      diff = exerciseStart - now;
    } else if (now < meditateStart) {
      phase = "Exercise";
      diff = meditateStart - now;
    } else if (now < maghribTime) {
      phase = "Meditate";
      diff = maghribTime - now;
    } else if (now < eatEnd) {
      phase = "Eat";
      diff = eatEnd - now;
    } else {
      phase = "Masjid / Done";
      diff = 0;
    }

    // Highlight active segment
    document.querySelectorAll(".segment").forEach(el => {
    el.classList.remove("active");
    });

    if (phase === "Exercise") {
    document.getElementById("seg-exercise").classList.add("active");
    }
    if (phase === "Meditate") {
    document.getElementById("seg-meditate").classList.add("active");
    }
    if (phase === "Eat") {
    document.getElementById("seg-eat").classList.add("active");
    }
    if (phase === "Masjid / Done") {
    document.getElementById("seg-masjid").classList.add("active");
    }


    phaseEl.textContent = phase;
    countdownEl.textContent = formatDiff(diff);

    const routineStart = exerciseStart;
    const routineEnd = eatEnd;
    const totalDuration = routineEnd - routineStart;

    const elapsed = now - routineStart;
    let percent = (elapsed / totalDuration) * 100;

    if (percent < 0) percent = 0;
    if (percent > 100) percent = 100;

    document.getElementById("nowLine").style.left = percent + "%";


  }, 1000);
}

function formatDiff(ms) {
  if (ms <= 0) return "00:00:00";
  const total = Math.floor(ms / 1000);
  const h = String(Math.floor(total / 3600)).padStart(2, "0");
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

fetchPrayer();
