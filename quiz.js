// ══════════════════════════════════════════
//   КОНФИГУРАЦИЯ
// ══════════════════════════════════════════
const TIME_LIMIT   = 120 * 60;     // 2 часа
const PASS_PERCENT = 60;

// Количество вопросов
const QUIZ_COUNT = {
  worker: {
    biot: 20,
    pb:   60,
    ptm:  20
  },
  itr: {
    biot: 50,
    pb:   100,
    ptm:  20
  }
};

const TEST_TYPES = {
  biot: { 
    name: "БиОТ", 
    title: "Безопасность и охрана труда",
    workerFile: "biot.json",
    itrFile:    "biot_itr.json"
  },
  pb: { 
    name: "ПБ", 
    title: "Промышленная безопасность",
    workerFile: "pb.json",
    itrFile:    "pb_itr.json"
  },
  ptm: { 
    name: "ПТМ", 
    title: "Пожарно-технический минимум",
    workerFile: "ptm.json",
    itrFile:    "ptm_itr.json"
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
let currentCategory = null;

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
//   ГЛАВНЫЙ ЭКРАН ВЫБОРА
// ══════════════════════════════════════════
function showTestSelection() {

  clearInterval(timerInterval);
  document.getElementById('timer').style.display = 'none';
  document.getElementById('test-type').textContent = 'Пробное тестирование';

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
      <div class="test-card" onclick="selectCategory('${key}')">
        <div class="test-icon">${key === 'biot' ? '🛡️' : key === 'pb' ? '🏭' : '🧯️'}</div>
        <h3>${t.name}</h3>
        <p>${t.title}</p>
      </div>
    `;
  });

  html += `</div></div>`;
  document.getElementById('app').innerHTML = html;
}

function selectCategory(testType) {
  currentTestType = testType;
  const t = TEST_TYPES[testType];

  const html = `
    <div class="selection-screen">
      <h2 style="text-align:center;margin-bottom:30px;">${t.title}</h2>
      <p style="text-align:center;color:var(--muted);margin-bottom:40px;">
        Выберите категорию персонала
      </p>
      <div class="test-cards" style="max-width:720px;">
        <div class="test-card" onclick="startTest('${testType}', 'worker')">
          <div class="test-icon">👷</div>
          <h3>Для рабочих</h3>
          <small style="color:var(--muted);">
            ${testType === 'biot' ? '60 вопросов' : testType === 'pb' ? '100 вопросов' : '20 вопросов'}
          </small>
        </div>
        <div class="test-card" onclick="startTest('${testType}', 'itr')">
          <div class="test-icon">👔</div>
          <h3>Для ИТР</h3>
          <small style="color:var(--muted);">
            ${testType === 'biot' ? '50 вопросов' : testType === 'pb' ? '100 вопросов' : '20 вопросов'}
          </small>
        </div>
      </div>
      <div style="text-align:center;margin-top:40px;">
        <button class="btn btn-outline" onclick="showTestSelection()">← Назад</button>
      </div>
    </div>
  `;

  document.getElementById('app').innerHTML = html;
}

function startTest(type, category) {
  currentCategory = category;
  loadQuestions(type);
}

// ══════════════════════════════════════════
//   ЗАГРУЗКА ВОПРОСОВ
// ══════════════════════════════════════════
async function loadQuestions(type) {
  // Если тест уже начат — показываем предупреждение
  if (currentTestType && !finished) {
    if (!confirm("Внимание!\n\nТекущий тест будет аннулирован.\n\nПродолжить?")) {
      return;
    }
  }
  try {
    const config = TEST_TYPES[type];
    const fileName = currentCategory === 'itr' ? config.itrFile : config.workerFile;
    const filePath = '/testing/' + fileName;

    const res = await fetch(filePath);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    ALL_QUESTIONS = await res.json();
    currentTestType = type;

    const categoryText = currentCategory === 'itr' ? ' (ИТР)' : ' (Рабочие)';
    document.getElementById('test-type').textContent = config.name + categoryText;

    initTest();

  } catch (e) {
    console.error(e);
    document.getElementById('app').innerHTML = `
      <div style="color:#ef4444;text-align:center;padding:100px 20px;">
        ❌ Не удалось загрузить вопросы<br><br>
        <small>Файл: ${currentCategory === 'itr' ? TEST_TYPES[type].itrFile : TEST_TYPES[type].workerFile}</small>
      </div>`;
  }
}

// ══════════════════════════════════════════
//   ИНИЦИАЛИЗАЦИЯ ТЕСТА
// ══════════════════════════════════════════
function initTest() {
  clearInterval(timerInterval);

  let questionCount = currentCategory === 'itr' 
    ? QUIZ_COUNT.itr[currentTestType] 
    : QUIZ_COUNT.worker[currentTestType];

  QUESTIONS = pickRandom(ALL_QUESTIONS, Math.min(questionCount, ALL_QUESTIONS.length));
  TOTAL     = QUESTIONS.length;
  current   = 0;
  answers   = new Array(TOTAL).fill(null);
  finished  = false;
  startTime = Date.now();

  document.getElementById('timer').style.display = '';
  document.getElementById('timer').classList.remove('urgent');

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
    const left = Math.max(0, TIME_LIMIT - elapsed);

    const h = Math.floor(left / 3600);
    const m = Math.floor((left % 3600) / 60);
    const s = left % 60;

    el.textContent = h > 0 
      ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}` 
      : `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;

    el.classList.toggle('urgent', left <= 300);
    if (left === 0) finishTest();
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
  const categoryName = currentCategory === 'itr' ? 'ИТР' : 'Рабочие';
  const letters = ['a','b','c','d','e','f'];

  const resultTitle = passed 
    ? '🎉 Поздравляем! Тест успешно пройден!' 
    : '😔 Тест не пройден';

  const resultSub = passed 
    ? `Отличный результат! Вы набрали ${pct}%`
    : `Набрано ${pct}%. Необходимо минимум ${PASS_PERCENT}% для сдачи.`;

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
          <circle class="fill" cx="65" cy="65" r="58" 
            stroke-dasharray="364" 
            stroke-dashoffset="${364 - (364 * pct / 100)}"/>
        </svg>
        <div class="result-pct">${pct}%</div>
      </div>

      <h2 class="result-title">${resultTitle}</h2>
      <p class="result-sub">${resultSub}<br><small>${categoryName}</small></p>

      <div class="result-stats">
        <div class="stat-pill"><div class="stat-num c">${correct}</div><div class="stat-lbl">Правильно</div></div>
        <div class="stat-pill"><div class="stat-num w">${TOTAL - correct}</div><div class="stat-lbl">Неправильно</div></div>
      </div>

      <div style="margin:30px 0;display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
        <button class="btn btn-primary" onclick="restartTest()">Пройти заново</button>
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

// Глобальные функции
window.showTestSelection = showTestSelection;
window.selectCategory = selectCategory;
window.startTest = startTest;
window.goTo = goTo;
window.selectAnswer = selectAnswer;
window.confirmFinish = confirmFinish;
window.closeModal = closeModal;
window.finishTest = finishTest;
window.restartTest = restartTest;

// ══════════════════════════════════════════
//   СТАРТ
// ══════════════════════════════════════════
showTestSelection();