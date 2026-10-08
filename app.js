const FACES = [1, 2, 3, 4, 5, 6];
const STORAGE_KEY = "dice-stats";
const ROLL_DURATION_MS = 900;
const ROLL_INTERVAL_MS = 90;

const DICE_DOTS = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

const state = {
  counts: Object.fromEntries(FACES.map((n) => [n, 0])),
  totalRolls: 0,
  currentRoll: null,
};

let isRolling = false;
let rollTimer = null;

const diceFace = document.getElementById("diceFace");
const currentRollEl = document.getElementById("currentRoll");
const totalRollsEl = document.getElementById("totalRolls");
const statsBody = document.getElementById("statsBody");
const chartYAxis = document.getElementById("chartYAxis");
const chartBars = document.getElementById("chartBars");
const chartXAxis = document.getElementById("chartXAxis");
const rollBtn = document.getElementById("rollBtn");
const resetBtn = document.getElementById("resetBtn");

function rollDice() {
  return Math.floor(Math.random() * 6) + 1;
}

function calcProbability(count, total) {
  if (total === 0) return 0;
  return Math.round((count / total) * 100);
}

function formatProbability(value) {
  return `${value}%`;
}

function renderDiceFace(face) {
  if (!face) {
    diceFace.dataset.face = "0";
    diceFace.innerHTML = '<span class="dice-placeholder">?</span>';
    return;
  }

  diceFace.dataset.face = String(face);
  const activeDots = new Set(DICE_DOTS[face]);
  diceFace.innerHTML = Array.from({ length: 9 }, (_, index) => {
    const cls = activeDots.has(index) ? "dot active" : "dot";
    return `<span class="${cls}"></span>`;
  }).join("");
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    const saved = JSON.parse(raw);
    if (!saved || typeof saved !== "object") return;

    FACES.forEach((face) => {
      const count = Number(saved.counts?.[face]);
      state.counts[face] = Number.isFinite(count) && count >= 0 ? count : 0;
    });

    const total = Number(saved.totalRolls);
    state.totalRolls = Number.isFinite(total) && total >= 0 ? total : 0;

    const current = Number(saved.currentRoll);
    state.currentRoll =
      Number.isFinite(current) && FACES.includes(current) ? current : null;
  } catch {
    // ignore corrupted storage
  }
}

function saveState() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      counts: state.counts,
      totalRolls: state.totalRolls,
      currentRoll: state.currentRoll,
    })
  );
}

function clearState() {
  localStorage.removeItem(STORAGE_KEY);
}

function renderStatsTable() {
  statsBody.innerHTML = FACES.map((face) => {
    const count = state.counts[face];
    const probability = calcProbability(count, state.totalRolls);
    return `
      <tr>
        <td>${face}</td>
        <td>${count} 次</td>
        <td>${formatProbability(probability)}</td>
      </tr>
    `;
  }).join("");
}

function renderChart() {
  const maxCount = Math.max(1, ...FACES.map((face) => state.counts[face]));
  const ticks = 5;
  const step = Math.max(1, Math.ceil(maxCount / ticks));

  chartYAxis.innerHTML = Array.from({ length: ticks + 1 }, (_, index) => {
    const value = step * (ticks - index);
    return `<span class="y-tick">${value}</span>`;
  }).join("");

  chartBars.innerHTML = FACES.map((face) => {
    const count = state.counts[face];
    const height = state.totalRolls === 0 ? 0 : (count / maxCount) * 100;
    return `
      <div class="bar-group">
        <div class="bar-track">
          <div
            class="bar-fill"
            style="height: ${height}%"
            title="${face} 点：${count} 次"
          ></div>
        </div>
        <span class="bar-value">${count}</span>
      </div>
    `;
  }).join("");

  chartXAxis.innerHTML = FACES.map(
    (face) => `<span class="x-label">${face}</span>`
  ).join("");
}

function setControlsDisabled(disabled) {
  rollBtn.disabled = disabled;
  resetBtn.disabled = disabled;
}

function render() {
  renderDiceFace(state.currentRoll);

  if (state.currentRoll === null) {
    currentRollEl.textContent = "—";
  } else {
    currentRollEl.textContent = state.currentRoll;
  }

  totalRollsEl.textContent = state.totalRolls;
  renderStatsTable();
  renderChart();
}

function handleRoll() {
  if (isRolling) return;

  isRolling = true;
  setControlsDisabled(true);
  diceFace.classList.add("rolling");

  const result = rollDice();
  let elapsed = 0;

  rollTimer = setInterval(() => {
    renderDiceFace(rollDice());
    elapsed += ROLL_INTERVAL_MS;

    if (elapsed >= ROLL_DURATION_MS) {
      clearInterval(rollTimer);
      rollTimer = null;
      diceFace.classList.remove("rolling");

      state.currentRoll = result;
      state.counts[result] += 1;
      state.totalRolls += 1;
      saveState();
      render();

      isRolling = false;
      setControlsDisabled(false);
    }
  }, ROLL_INTERVAL_MS);
}

function handleReset() {
  if (isRolling) {
    clearInterval(rollTimer);
    rollTimer = null;
    isRolling = false;
    diceFace.classList.remove("rolling");
  }

  FACES.forEach((face) => {
    state.counts[face] = 0;
  });
  state.totalRolls = 0;
  state.currentRoll = null;
  clearState();
  setControlsDisabled(false);
  render();
}

rollBtn.addEventListener("click", handleRoll);
resetBtn.addEventListener("click", handleReset);

loadState();
render();
