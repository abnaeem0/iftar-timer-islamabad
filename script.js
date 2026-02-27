// ---------------- EXISTING ELEMENTS ----------------
const countdownEl = document.getElementById("countdown");
const phaseEl = document.getElementById("current-phase");
const infoEl = document.getElementById("info");

const refreshBtn = document.getElementById("refreshBtn");
refreshBtn.addEventListener("click", fetchPrayer);

const testModeCheckbox = document.getElementById("testModeCheckbox");
const testMaghribInput = document.getElementById("testMaghribTime");

let maghribTime = null;

// ---------------- NEW ELEMENTS ----------------

// Sehri / Fajr tracking elements
const fajrPassedEl = document.getElementById("fajr-passed");
const fajrNextEl = document.getElementById("fajr-next");



// ---------------- UTILITY FUNCTIONS ----------------

// Parse HH:MM string into a Date object for today
function parseTimeString(t) {
  const [h, m] = t.split(":").map(Number);
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0);
}

// Format milliseconds as HH:MM:SS
function formatDiff(ms) {
  if (ms <= 0) return "00:00:00";
  const total = Math.floor(ms / 1000);
  const h = String(Math.floor(total / 3600)).padStart(2, "0");
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

// ---------------- FETCH MAGHRIB AND START TIMER ----------------
async function fetchPrayer() {

    // ---------------- TEST MODE ----------------
  if (testModeCheckbox.checked) {
    const fakeMaghribStr = testMaghribInput.value; // HH:MM
    maghribTime = parseTimeString(fakeMaghribStr);

    // Use default times for Fajr & Asr in test mode
    todayFajr = parseTimeString("05:00"); // default Fajr
    tomorrowFajr = new Date(todayFajr.getTime() + 24*60*60*1000);
    asrShafi = parseTimeString("15:30"); // default Shafi Asr

    infoEl.textContent = `Test Mode: Maghrib at ${fakeMaghribStr}`;

    // Start timers and update Fajr tracking
    startTimer();
    updateFajrTracking({Fajr: "05:00"}); // pass fake todayFajr
    // Update the prayer times section
    const timesEl = document.getElementById("islamabadTimes");
    timesEl.innerHTML = `
      <p>Fajr: 05:00</p>
      <p>Sunrise: 06:15</p>
      <p>Zuhr: 12:30</p>
      <p>Asr Shafi: 15:30</p>
      <p>Asr Hanafi: 15:45</p>
      <p>Maghrib: ${fakeMaghribStr}</p>
      <p>Isha: 18:45</p>
    `;
    return; // stop function so no API calls run
  }

  phaseEl.textContent = "Fetching prayer times…";

  try {
    // ---------------- 1. Fetch today Hanafi (method=2) ----------------
    const resToday = await fetch(
      `https://api.aladhan.com/v1/timingsByCity?city=Islamabad&country=Pakistan&method=1&school=1`
    );
    const dataToday = await resToday.json();
    const timingsHanafi = dataToday.data.timings;

    // Store variables
    maghribTime = parseTimeString(timingsHanafi.Maghrib);
    todayFajr = parseTimeString(timingsHanafi.Fajr);
    const asrHanafi = parseTimeString(timingsHanafi.Asr);

    // ---------------- 2. Fetch today Shafi Asr only (method=1) ----------------
    const resShafi = await fetch(
      `https://api.aladhan.com/v1/timingsByCity?city=Islamabad&country=Pakistan&method=1&school=0`
    );
    const dataShafi = await resShafi.json();
    const asrShafi = parseTimeString(dataShafi.data.timings.Asr);

    // ---------------- 3. Fetch tomorrow Fajr (Hanafi) ----------------
    const tomorrowDate = new Date();
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrowDateStr = `${String(tomorrowDate.getDate()).padStart(2,'0')}-${String(tomorrowDate.getMonth()+1).padStart(2,'0')}-${tomorrowDate.getFullYear()}`;

    const resTomorrow = await fetch(
      `https://api.aladhan.com/v1/timingsByCity/${tomorrowDateStr}?city=Islamabad&country=Pakistan&method=1&school=1`
    );
    const dataTomorrow = await resTomorrow.json();
    const tomorrowFajrStr = dataTomorrow.data.timings.Fajr;
    tomorrowFajr = parseTimeString(tomorrowFajrStr);

    // ---------------- 4. Update Fajr / Sehri timers ----------------
    updateFajrTracking(timingsHanafi);

    // ---------------- 5. Update Islamabads prayer times section ----------------
    const timesEl = document.getElementById("islamabadTimes");
    timesEl.innerHTML = `
      <p>Fajr: ${timingsHanafi.Fajr}</p>
      <p>Sunrise: ${timingsHanafi.Sunrise}</p>
      <p>Zuhr: ${timingsHanafi.Dhuhr}</p>
      <p>Asr Shafi: ${dataShafi.data.timings.Asr}</p>
      <p>Asr Hanafi: ${timingsHanafi.Asr}</p>
      <p>Maghrib: ${timingsHanafi.Maghrib}</p>
      <p>Isha: ${timingsHanafi.Isha}</p>
    `;

    // ---------------- 6. Start your existing Maghrib timer ----------------
    startTimer();

    // ---------------- 7. Display info ----------------
    infoEl.textContent = `Maghrib: ${timingsHanafi.Maghrib}`;

  } catch (err) {
    phaseEl.textContent = "Error fetching prayer times";
    console.error(err);
  }
}


// ---------------- TIMER FUNCTION ----------------
function startTimer() {
  if (!maghribTime) return;

  setInterval(() => {
    const now = new Date();

    // ---------------- EXISTING MAGHRIB TIMELINE ----------------
    const exerciseStart = new Date(maghribTime.getTime() - 30 * 60 * 1000);
    const duaStart = new Date(maghribTime.getTime() - 15 * 60 * 1000);
    const eatEnd = new Date(maghribTime.getTime() + 13 * 60 * 1000);

    let phase, diff;

    if (now < exerciseStart) {
      phase = "Before exercise";
      diff = exerciseStart - now;
    } else if (now < duaStart) {
      phase = "Exercise";
      diff = duaStart - now;
    } else if (now < maghribTime) {
      phase = "Dua";
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
    if (phase === "Exercise") document.getElementById("seg-exercise").classList.add("active");
    if (phase === "Dua") document.getElementById("seg-dua").classList.add("active");
    if (phase === "Eat") document.getElementById("seg-eat").classList.add("active");

    phaseEl.textContent = phase;
    countdownEl.textContent = formatDiff(diff);

    const routineStart = exerciseStart;
    const routineEnd = eatEnd;
    const totalDuration = routineEnd - routineStart;

    const elapsed = now - routineStart;
    let percent = (elapsed / totalDuration) * 100;
    percent = Math.max(0, Math.min(100, percent));
    document.getElementById("nowLine").style.left = percent + "%";

    // ---------------- NEW: Update Sehri / Fajr timers every second ----------------
    updateFajrTracking();
  }, 1000);
}

// ---------------- NEW FUNCTION: SEHRI / FAJR TRACKING ----------------
let todayFajr = null;
let tomorrowFajr = null;

function updateFajrTracking(timings = null) {
  const now = new Date();

  // If timings are provided, set today Fajr
  if (timings && timings.Fajr) {
    todayFajr = parseTimeString(timings.Fajr);
  }

  // If no today Fajr yet, estimate 5:00 AM
  if (!todayFajr) todayFajr = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 5, 0, 0);

  // Compute next Fajr (tomorrow)
  tomorrowFajr = new Date(todayFajr.getTime() + 24 * 60 * 60 * 1000);

  // Format the actual time as HH:MM
  const fajrTimeStr = todayFajr.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Time since today's Fajr
  const sinceFajr = now - todayFajr;
  fajrPassedEl.textContent = `${fajrTimeStr} — ${formatDiff(sinceFajr)} passed`;

  // Time until next Fajr
  const untilNextFajr = tomorrowFajr - now;
  fajrNextEl.textContent = `${fajrTimeStr} — ${formatDiff(untilNextFajr)} left`;
}




// ---------------- INITIAL FETCH ----------------
fetchPrayer();
