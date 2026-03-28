// ══════════════════════════════════════════
//   КОНФИГУРАЦИЯ
// ══════════════════════════════════════════
const TIME_LIMIT   = 120 * 60;     // 20 минут
const PASS_PERCENT = 60;          // проходной балл
const QUIZ_COUNT   = 20;          // по умолчанию

const TEST_TYPES = {
  biot: { 
    name: "БиОТ", 
    file: "biot.json", 
    title: "Безопасность и охрана труда",
    quizCount: 20,
    description: "20 вопросов из базы 100"
  },
  pb: { 
    name: "ПБ", 
    file: "pb.json", 
    title: "Промышленная безопасность",
    quizCount: 60,
    description: "60 вопросов (вся база)"
  },
  ptm: { 
    name: "ПТМ", 
    file: "ptm.json", 
    title: "Пожарно-технический минимум",
    quizCount: 20,
    description: "20 вопросов (вся база)"
  }
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
let currentTestType = null;

// ══════════════════════════════════════════
//   УТИЛИТЫ
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
// Возврат на главный экран выбора теста
function goToMainScreen() {
  // Если тест уже завершён или ещё не начат — просто показываем выбор
  if (finished || !currentTestType) {
    showTestSelection();
    return;
  }

  // Если тест в процессе — спрашиваем подтверждение
  if (confirm("Выйти на главный экран? Текущий прогресс будет потерян.")) {
    showTestSelection();
  }
}
function showTestSelection() {
  clearInterval(timerInterval);
  document.getElementById('timer').style.display = 'none';
  document.getElementById('test-type').textContent = 'Пробные тестирования';

  let html = `
    <div class="selection-screen">
      <h2 style="text-align:center;margin-bottom:40px;font-family:'Unbounded',sans-serif;">
        Выберите тип теста
      </h2>
      <div class="test-cards">
  `;

  Object.keys(TEST_TYPES).forEach(key => {
    const t = TEST_TYPES[key];
    html += `
      <div class="test-card" onclick="startTest('${key}')">
        <div class="test-icon">${key === 'biot' ? '🛡️' : key === 'pb' ? '👷🏼‍♂️' : '👨🏼‍🚒'}</div>
        <h3>${t.name}</h3>
        <p>${t.title}</p>
        <small style="color:var(--muted);margin-top:8px;display:block;">${t.description}</small>
      </div>
    `;
  });

  html += `</div></div>`;
  document.getElementById('app').innerHTML = html;
}

// ══════════════════════════════════════════
//   ЗАГРУЗКА ВОПРОСОВ
// ══════════════════════════════════════════
async function loadQuestions(type) {
  try {
    const config = TEST_TYPES[type];
    const res = await fetch('/testing/' + config.file);   // ← поменяй путь, если нужно

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    ALL_QUESTIONS = await res.json();
    currentTestType = type;

    document.getElementById('test-type').textContent = config.name;
    initTest();

  } catch (e) {
    console.error(e);
    document.getElementById('app').innerHTML = `
      <div style="color:#ef4444;text-align:center;padding:80px 20px;">
        ❌ Не удалось загрузить <b>${TEST_TYPES[type].file}</b><br><br>
        Проверьте наличие файла и путь к нему.
      </div>`;
  }
}

function startTest(type) {
  loadQuestions(type);
}

// ══════════════════════════════════════════
//   ИНИЦИАЛИЗАЦИЯ ТЕСТА
// ══════════════════════════════════════════
function initTest() {
  clearInterval(timerInterval);

  const config = TEST_TYPES[currentTestType];
  const count = config.quizCount || QUIZ_COUNT;

  QUESTIONS = pickRandom(ALL_QUESTIONS, Math.min(count, ALL_QUESTIONS.length));
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
    if (left === 0) finishTest();
  }, 500);
}

// ══════════════════════════════════════════
//   РЕНДЕР
// ══════════════════════════════════════════
function render() {
  if (finished) {
    renderResult();
    return;
  }
  renderQuiz();
}

function renderQuiz() {
  const q = QUESTIONS[current];
  const letters = ['a','b','c','d','e','f'];
  const answered = answers.filter(a => a !== null).length;
  const pct = answered / TOTAL * 100;

  document.getElementById('app').innerHTML = `
    <div class="nav-card">
      <div class="nav-label">Навигация по тесту</div>
      <div class="nav-dots">
        ${QUESTIONS.map((_, i) => `
          <button class="nav-dot ${i === current ? 'active' : ''} ${answers[i] !== null ? 'answered' : ''}" 
                  onclick="goTo(${i})">${i + 1}</button>
        `).join('')}
      </div>
    </div>

    <div class="progress-bar-wrap">
      <div class="progress-bar-track">
        <div class="progress-bar-fill" style="width:${pct}%"></div>
      </div>
    </div>

    <div class="question-card">
      <div class="question-header">
        <div class="q-num">Вопрос ${current + 1} <span style="opacity:.4">/ ${TOTAL}</span></div>
        <div class="q-text">${q.text}</div>
      </div>
      <div class="options">
        ${q.options.map((opt, i) => `
          <div class="option ${answers[current] === i ? 'selected' : ''}" 
               onclick="selectAnswer(${i})">
            <div class="opt-letter">${letters[i]}</div>
            <div class="opt-text">${opt}</div>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="footer-bar">
      <div class="progress-info">Отвечено: <b>${answered}</b> из <b>${TOTAL}</b></div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        ${current > 0 ? `<button class="btn btn-outline" onclick="goTo(${current - 1})">← Назад</button>` : ''}
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

  let correct = 0;
  QUESTIONS.forEach((q, i) => {
    if (answers[i] === q.answer) correct++;
  });

  const pct = Math.round((correct / TOTAL) * 100);
  const passed = pct >= PASS_PERCENT;
  const letters = ['a','b','c','d','e','f'];

  const reviewHTML = QUESTIONS.map((q, i) => {
    const userAns = answers[i];
    return `
      <div class="review-item">
        <div class="ri-q"><b>Вопрос ${i+1}.</b> ${q.text}</div>
        <div class="ri-answers">
          ${q.options.map((opt, j) => {
            let cls = '';
            if (j === q.answer) cls = 'correct';
            else if (j === userAns && userAns !== q.answer) cls = 'wrong';
            return `<div class="ri-ans ${cls}">${letters[j]}. ${opt}${j === q.answer ? ' ✓' : j === userAns ? ' ✗' : ''}</div>`;
          }).join('')}
        </div>
      </div>`;
  }).join('');

  document.getElementById('app').innerHTML = `
    <div class="result-screen">
      <div class="result-circle">
        <svg viewBox="0 0 130 130">
          <circle class="track" cx="65" cy="65" r="58"/>
          <circle class="fill" cx="65" cy="65" r="58" stroke-dasharray="364" stroke-dashoffset="${364 - (364 * pct / 100)}"/>
        </svg>
        <div class="result-pct">${pct}%</div>
      </div>

      <h2 class="result-title">${passed ? '🎉 Тест пройден!' : '😔 Тест не пройден'}</h2>
      <p class="result-sub">${correct} из ${TOTAL} правильных ответов</p>

      <div class="result-stats">
        <div class="stat-pill"><div class="stat-num c">${correct}</div><div class="stat-lbl">Правильно</div></div>
        <div class="stat-pill"><div class="stat-num w">${TOTAL - correct}</div><div class="stat-lbl">Неправильно</div></div>
      </div>

      <div style="margin: 30px 0; display:flex; gap:12px; justify-content:center; flex-wrap:wrap;">
        <button class="btn btn-primary" onclick="restartTest()">Новый тест</button>
        <button class="btn btn-outline" onclick="showTestSelection()">← Выбрать другой тест</button>
      </div>

      <div class="review-section">
        <div class="review-title">Разбор ответов</div>
        ${reviewHTML}
      </div>
    </div>
  `;
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

function restartTest() {
  if (currentTestType) initTest();
}

// Глобальные функции для onclick
window.goToMainScreen = goToMainScreen;
window.goTo = goTo;
window.selectAnswer = selectAnswer;
window.confirmFinish = confirmFinish;
window.closeModal = closeModal;
window.finishTest = finishTest;
window.restartTest = restartTest;
window.showTestSelection = showTestSelection;
window.startTest = startTest;

// ══════════════════════════════════════════
//   СТАРТ
// ══════════════════════════════════════════
showTestSelection();