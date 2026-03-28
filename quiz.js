// ══════════════════════════════════════════
//   КОНФИГУРАЦИЯ
// ══════════════════════════════════════════
const TIME_LIMIT   = 20 * 60;     // 20 минут
const PASS_PERCENT = 60;          // проходной балл 60%
const QUIZ_COUNT   = 20;          // базовое количество (используется для БиОТ)

// Настройки для каждого типа теста
const TEST_TYPES = {
  biot: { 
    name: "БиОТ", 
    file: "biot.json", 
    title: "Биология и охрана труда",
    quizCount: 20,      // из 100
    description: "20 вопросов из базы 100"
  },
  pb: { 
    name: "ПБ", 
    file: "pb.json", 
    title: "Пожарная безопасность",
    quizCount: 60,      // все 60
    description: "60 вопросов (вся база)"
  },
  ptm: { 
    name: "ПТМ", 
    file: "ptm.json", 
    title: "Промышленная травмобезопасность",
    quizCount: 20,      // все 20
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
function showTestSelection() {
  clearInterval(timerInterval);
  document.getElementById('timer').style.display = 'none';
  document.getElementById('test-type').textContent = 'Промежуточная аттестация';

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
        <div class="test-icon">${key === 'biot' ? '🧬' : key === 'pb' ? '🔥' : '🛠️'}</div>
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
//   ЗАГРУЗКА ВОПРОСОВ (обновлено для GitHub Pages)
// ══════════════════════════════════════════
async function loadQuestions(type) {
  try {
    const config = TEST_TYPES[type];
    
    // Важно для GitHub Pages: используем относительный путь с './'
    const filePath = './' + config.file;
    
    console.log(`Пытаемся загрузить: ${filePath}`); // для отладки

    const res = await fetch(filePath);
    
    if (!res.ok) {
      throw new Error(`HTTP ошибка ${res.status}: ${res.statusText}`);
    }

    ALL_QUESTIONS = await res.json();
    currentTestType = type;

    document.getElementById('test-type').textContent = config.name;
    initTest();

  } catch (e) {
    console.error("Ошибка загрузки JSON:", e);
    
    document.getElementById('app').innerHTML = `
      <div style="color:#ef4444; text-align:center; padding:80px 20px; font-family:sans-serif;">
        ❌ Не удалось загрузить <b>${TEST_TYPES[type].file}</b><br><br>
        
        <small style="line-height:1.6;">
          • Убедитесь, что файл <b>${TEST_TYPES[type].file}</b> лежит <u>в корне репозитория</u><br>
          • Сайт должен быть опубликован с ветки <b>main</b> (или gh-pages)<br>
          • Попробуйте очистить кэш (Ctrl + Shift + R)<br>
          • Проверьте прямую ссылку: <br>
          <span style="color:#888;">https://ваш-логин.github.io/${TEST_TYPES[type].file}</span>
        </small>
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
    if (left === 0) { clearInterval(timerInterval); finishTest(); }
  }, 500);
}

// renderQuiz(), renderResult(), selectAnswer(), goTo(), confirmFinish(), finishTest() и restartTest() — остаются такими же, как в предыдущей версии.

function render() {
  if (finished) { renderResult(); return; }
  renderQuiz();
}

// renderQuiz() — без изменений (можно оставить старую версию)
function renderQuiz() {
  const q        = QUESTIONS[current];
  const letters  = ['a','b','c','d','e','f'];
  const answered = answers.filter(a => a !== null).length;
  const pct      = answered / TOTAL * 100;

  document.getElementById('app').innerHTML = `
    <div class="nav-card">
      <div class="nav-label">Навигация по тесту</div>
      <div class="nav-dots">
        ${QUESTIONS.map((_, i) => `
          <button class="nav-dot ${i === current ? 'active' : ''} ${answers[i] !== null ? 'answered' : ''}" onclick="goTo(${i})">${i + 1}</button>
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
        <div class="q-num">Вопрос ${current + 1} <span style="opacity:.4;font-weight:400">/ ${TOTAL}</span></div>
        <div class="q-text">${q.text}</div>
      </div>
      <div class="options">
        ${q.options.map((opt, i) => `
          <div class="option ${answers[current] === i ? 'selected' : ''}" onclick="selectAnswer(${i})">
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

// renderResult() с кнопкой возврата к выбору (оставь старую версию или используй из предыдущего сообщения)

function renderResult() {
  // ... (полностью та же функция, что была в предыдущей версии с кнопками "Новый тест" и "← Выбрать другой тест")
  // Для краткости здесь не дублирую — просто скопируй renderResult из моего предыдущего ответа.
}

// Остальные функции (selectAnswer, goTo, confirmFinish, closeModal, finishTest, restartTest) — без изменений

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

// ══════════════════════════════════════════
//   СТАРТ
// ══════════════════════════════════════════
showTestSelection();
