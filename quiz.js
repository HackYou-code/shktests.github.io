// ══════════════════════════════════════════
//   КОНФИГУРАЦИЯ
// ══════════════════════════════════════════
const TIME_LIMIT   = 20 * 60; // секунд (20 минут)
const PASS_PERCENT = 60;      // минимальный % для сдачи
const QUIZ_COUNT   = 20;      // сколько вопросов показывать за тест

// Названия тестов
const TEST_TYPES = {
  biot: { name: "БиОТ", file: "biot.json", title: "Биология и охрана труда" },
  pb:   { name: "ПБ",   file: "pb.json",   title: "Пожарная безопасность" },
  ptm:  { name: "ПТМ",  file: "ptm.json",  title: "Промышленная травмобезопасность" }
};

// ══════════════════════════════════════════
//   СОСТОЯНИЕ
// ══════════════════════════════════════════
let ALL_QUESTIONS = [];
let QUESTIONS     = [];
let TOTAL         = 0;
let current       = 0;
let answers       = [];
let finished      = false;
let startTime     = Date.now();
let timerInterval;
let currentTestType = null;   // "biot", "pb" или "ptm"

// ══════════════════════════════════════════
//   УТИЛИТЫ (остаются без изменений)
// ══════════════════════════════════════════
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickRandom(pool, n) {
  return shuffle(pool).slice(0, n);
}

// ══════════════════════════════════════════
//   ЭКРАН ВЫБОРА ТЕСТА
// ══════════════════════════════════════════
function showTestSelection() {
  clearInterval(timerInterval);
  document.getElementById('timer').style.display = 'none';
  document.getElementById('test-type').textContent = 'Промежуточная аттестация';

  const html = `
    <div class="selection-screen">
      <h2 style="text-align:center;margin-bottom:40px;font-family:'Unbounded',sans-serif;">
        Выберите тип теста
      </h2>
      <div class="test-cards">
        <div class="test-card" onclick="startTest('biot')">
          <div class="test-icon">🧬</div>
          <h3>БиОТ</h3>
          <p>Биология и охрана труда</p>
        </div>
        <div class="test-card" onclick="startTest('pb')">
          <div class="test-icon">🔥</div>
          <h3>ПБ</h3>
          <p>Пожарная безопасность</p>
        </div>
        <div class="test-card" onclick="startTest('ptm')">
          <div class="test-icon">🛠️</div>
          <h3>ПТМ</h3>
          <p>Промышленная травмобезопасность</p>
        </div>
      </div>
    </div>
  `;

  document.getElementById('app').innerHTML = html;
}

// ══════════════════════════════════════════
//   ЗАГРУЗКА ВОПРОСОВ
// ══════════════════════════════════════════
async function loadQuestions(type) {
  try {
    const config = TEST_TYPES[type];
    const res = await fetch(config.file);
    ALL_QUESTIONS = await res.json();
    currentTestType = type;

    document.getElementById('test-type').textContent = config.name;
    initTest();
  } catch (e) {
    document.getElementById('app').innerHTML = `
      <div style="color:#ef4444;text-align:center;padding:60px;font-family:sans-serif">
        ❌ Не удалось загрузить вопросы для выбранного теста.<br><br>
        <small>Убедитесь, что файл <b>${TEST_TYPES[type].file}</b> существует в папке.</small>
      </div>`;
  }
}

// ══════════════════════════════════════════
//   ИНИЦИАЛИЗАЦИЯ ТЕСТА
// ══════════════════════════════════════════
function startTest(type) {
  loadQuestions(type);
}

function initTest() {
  clearInterval(timerInterval);

  QUESTIONS = pickRandom(ALL_QUESTIONS, Math.min(QUIZ_COUNT, ALL_QUESTIONS.length));
  TOTAL     = QUESTIONS.length;
  current   = 0;
  answers   = new Array(TOTAL).fill(null);
  finished  = false;
  startTime = Date.now();

  const timerEl = document.getElementById('timer');
  timerEl.style.display = '';
  timerEl.classList.remove('urgent');

  startTimer();
  render();
}

// ══════════════════════════════════════════
//   ТАЙМЕР, РЕНДЕР и остальные функции (оставляем почти без изменений)
// ══════════════════════════════════════════
function startTimer() {
  const el = document.getElementById('timer');
  timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const left    = Math.max(0, TIME_LIMIT - elapsed);
    const m = String(Math.floor(left / 60)).padStart(2, '0');
    const s = String(left % 60).padStart(2, '0');
    el.textContent = `${m}:${s}`;
    el.classList.toggle('urgent', left <= 60);
    if (left === 0) { clearInterval(timerInterval); finishTest(); }
  }, 500);
}

function render() {
  if (finished) { renderResult(); return; }
  renderQuiz();
}

// ... (renderQuiz остаётся без изменений)

// Обновлённый renderResult с кнопкой возврата к выбору
function renderResult() {
  clearInterval(timerInterval);
  document.getElementById('timer').style.display = 'none';

  let correct = 0, wrong = 0, skipped = 0;
  QUESTIONS.forEach((q, i) => {
    if (answers[i] === null)           skipped++;
    else if (answers[i] === q.answer)  correct++;
    else                               wrong++;
  });

  const pct    = Math.round(correct / TOTAL * 100);
  const passed = pct >= PASS_PERCENT;

  const r    = 58;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  const letters    = ['a','b','c','d','e','f'];
  const reviewHTML = QUESTIONS.map((q, i) => {
    const userAns = answers[i];
    return `
      <div class="review-item">
        <div class="ri-q"><b>Вопрос ${i + 1}.</b> ${q.text}</div>
        <div class="ri-answers">
          ${q.options.map((opt, j) => {
            let cls = '';
            if (j === q.answer)                              cls = 'correct';
            else if (j === userAns && userAns !== q.answer)  cls = 'wrong';
            return `<div class="ri-ans ${cls}">
              ${letters[j]}. ${opt}${j === q.answer ? ' ✓' : j === userAns ? ' ✗' : ''}
            </div>`;
          }).join('')}
        </div>
      </div>
    `;
  }).join('');

  document.getElementById('app').innerHTML = `
    <div class="result-screen">
      <div class="result-circle">
        <svg viewBox="0 0 130 130">
          <circle class="track" cx="65" cy="65" r="${r}" />
          <circle class="fill"  cx="65" cy="65" r="${r}"
            stroke-dasharray="${circ}"
            stroke-dashoffset="${circ}"
            id="fillCircle"/>
        </svg>
        <div class="result-pct" id="pctNum">0%</div>
      </div>

      <h2 class="result-title">${passed ? '🎉 Тест пройден!' : '😔 Тест не пройден'}</h2>
      <p class="result-sub">
        ${passed
          ? 'Отличный результат! Вы успешно справились с заданием.'
          : `Наберите не менее ${PASS_PERCENT}% для успешной сдачи.`}
      </p>

      <div class="result-stats">
        <div class="stat-pill">
          <div class="stat-num c">${correct}</div>
          <div class="stat-lbl">Правильных</div>
        </div>
        <div class="stat-pill">
          <div class="stat-num w">${wrong}</div>
          <div class="stat-lbl">Неверных</div>
        </div>
        <div class="stat-pill">
          <div class="stat-num sk">${skipped}</div>
          <div class="stat-lbl">Пропущено</div>
        </div>
      </div>

      <div style="display:flex; gap:12px; justify-content:center; flex-wrap:wrap;">
        <button class="btn btn-primary" onclick="restartTest()">🔀 Новый тест (${TEST_TYPES[currentTestType].name})</button>
        <button class="btn btn-outline" onclick="showTestSelection()">← Выбрать другой тест</button>
      </div>

      <div class="review-section">
        <div class="review-title">Разбор ответов</div>
        ${reviewHTML}
      </div>
    </div>
  `;

  // Анимация круга
  setTimeout(() => {
    const fillEl = document.getElementById('fillCircle');
    const numEl  = document.getElementById('pctNum');
    if (!fillEl || !numEl) return;
    fillEl.style.transition       = 'stroke-dashoffset 1.2s ease';
    fillEl.style.strokeDashoffset = circ - dash;
    let count = 0;
    const step = pct / 60;
    const iv   = setInterval(() => {
      count = Math.min(count + step, pct);
      numEl.textContent = Math.round(count) + '%';
      if (count >= pct) clearInterval(iv);
    }, 16);
  }, 100);
}

// Остальные функции (selectAnswer, goTo, confirmFinish и т.д.) остаются **без изменений**

function selectAnswer(idx) {
  if (finished) return;
  answers[current] = idx;
  render();
}

function goTo(idx) {
  if (idx < 0 || idx >= TOTAL) return;
  current = idx;
  render();
}

function confirmFinish() {
  const unanswered = answers.filter(a => a === null).length;
  if (unanswered > 0) {
    document.getElementById('modal').classList.add('show');
  } else {
    finishTest();
  }
}

function closeModal() {
  document.getElementById('modal').classList.remove('show');
}

function finishTest() {
  closeModal();
  finished = true;
  render();
}

function restartTest() {
  if (currentTestType) {
    initTest();
  }
}

// ══════════════════════════════════════════
//   СТАРТ ПРИЛОЖЕНИЯ
// ══════════════════════════════════════════
showTestSelection();   // ← Теперь начинаем с выбора теста
