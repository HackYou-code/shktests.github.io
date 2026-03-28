// ══════════════════════════════════════════
//   КОНФИГУРАЦИЯ
// ══════════════════════════════════════════
const TIME_LIMIT   = 20 * 60; // секунд (20 минут)
const PASS_PERCENT = 60;      // минимальный % для сдачи
const QUIZ_COUNT   = 20;      // сколько вопросов показывать за тест

// ══════════════════════════════════════════
//   СОСТОЯНИЕ
// ══════════════════════════════════════════
let ALL_QUESTIONS = []; // все вопросы из JSON (банк)
let QUESTIONS     = []; // случайные 20 для текущего теста
let TOTAL         = 0;
let current       = 0;
let answers       = [];
let finished      = false;
let startTime     = Date.now();
let timerInterval;
let CURRENT_TEST = null;

// ══════════════════════════════════════════
//   УТИЛИТЫ
// ══════════════════════════════════════════

// Перемешать массив (алгоритм Fisher-Yates)
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Выбрать n случайных вопросов из банка
function pickRandom(pool, n) {
  return shuffle(pool).slice(0, n);
}

function startTest(type) {
  CURRENT_TEST = type;

  document.getElementById('start-screen').style.display = 'none';
  document.getElementById('app').innerHTML = '';

  loadQuestions(type);
}
// ══════════════════════════════════════════
//   ЗАГРУЗКА ВОПРОСОВ ИЗ JSON
// ══════════════════════════════════════════
async function loadQuestions(type) {
  try {
    const res = await fetch(`questions_${type}.json`);
    ALL_QUESTIONS = await res.json();
    initTest();
  } catch (e) {
    document.getElementById('app').innerHTML =
      `<div style="color:#ef4444;text-align:center;padding:60px">
        ❌ Ошибка загрузки теста (${type})
      </div>`;
  }
}

// ══════════════════════════════════════════
//   ИНИЦИАЛИЗАЦИЯ ТЕСТА (новая случайная выборка)
// ══════════════════════════════════════════
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
//   ТАЙМЕР
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

// ══════════════════════════════════════════
//   РЕНДЕР
// ══════════════════════════════════════════
function render() {
  if (finished) { renderResult(); return; }
  renderQuiz();
}

function renderQuiz() {
  const q        = QUESTIONS[current];
  const letters  = ['a','b','c','d','e','f'];
  const answered = answers.filter(a => a !== null).length;
  const pct      = answered / TOTAL * 100;

  document.getElementById('app').innerHTML = `
    <!-- НАВИГАЦИЯ -->
    <div class="nav-card">
      <div class="nav-label">Навигация по тесту</div>
      <div class="nav-dots">
        ${QUESTIONS.map((_, i) => `
          <button
            class="nav-dot ${i === current ? 'active' : ''} ${answers[i] !== null ? 'answered' : ''}"
            onclick="goTo(${i})"
          >${i + 1}</button>
        `).join('')}
      </div>
    </div>

    <!-- ПРОГРЕСС-БАР -->
    <div class="progress-bar-wrap">
      <div class="progress-bar-track">
        <div class="progress-bar-fill" style="width:${pct}%"></div>
      </div>
    </div>

    <!-- КАРТОЧКА ВОПРОСА -->
    <div class="question-card">
      <div class="question-header">
        <div class="q-num">Вопрос ${current + 1} <span style="opacity:.4;font-weight:400">/ ${TOTAL}</span></div>
        <div class="q-text">${q.text}</div>
      </div>
      <div class="options">
        ${q.options.map((opt, i) => `
          <div
            class="option ${answers[current] === i ? 'selected' : ''}"
            onclick="selectAnswer(${i})"
          >
            <div class="opt-letter">${letters[i]}</div>
            <div class="opt-text">${opt}</div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- НИЖНЯЯ ПАНЕЛЬ -->
    <div class="footer-bar">
      <div class="progress-info">Отвечено: <b>${answered}</b> из <b>${TOTAL}</b></div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        ${current > 0
          ? `<button class="btn btn-outline" onclick="goTo(${current - 1})">← Назад</button>`
          : ''}
        ${current < TOTAL - 1
          ? `<button class="btn btn-primary" onclick="goTo(${current + 1})">Следующий →</button>`
          : `<button class="btn btn-primary" onclick="confirmFinish()">Завершить тест ✓</button>`}
        <button class="btn btn-danger" onclick="confirmFinish()">Закончить попытку</button>
      </div>
    </div>
  `;
}

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
          : `Наберите не менее ${PASS_PERCENT}% для успешной сдачи. Попробуйте ещё раз!`}
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

      <button class="btn btn-primary" onclick="restartTest()">🔀 Новый случайный тест</button>

      <div class="review-section">
        <div class="review-title">Разбор ответов</div>
        ${reviewHTML}
      </div>
    </div>
  `;

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

// ══════════════════════════════════════════
//   ДЕЙСТВИЯ
// ══════════════════════════════════════════
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

// Перезапуск = новая случайная выборка из банка
function restartTest() {
  initTest();
}

// ══════════════════════════════════════════
//   СТАРТ
// ══════════════════════════════════════════
startTest(type)
