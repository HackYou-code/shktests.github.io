// ══════════════════════════════════════════
//   КОНФИГУРАЦИЯ ТЕСТОВ
// ══════════════════════════════════════════
const TESTS = {
  biot: {
    id: "biot",
    title: "БиОТ",
    subtitle: "Безопасность и охрана труда",
    file: "biot-questions.json",
    logo: "БТ",
    color: "#FF5722"
  },
  pb: {
    id: "pb",
    title: "ПБ",
    subtitle: "Пожарная безопасность",
    file: "pb-questions.json",
    logo: "ПБ",
    color: "#FF9800"
  },
  ptm: {
    id: "ptm",
    title: "ПТМ",
    subtitle: "Промышленная безопасность",
    file: "ptm-questions.json",
    logo: "ПТМ",
    color: "#E91E63"
  }
};

let CURRENT_TEST = null;
let ALL_QUESTIONS = [];
let QUESTIONS = [];
let TOTAL = 0;
let current = 0;
let answers = [];
let finished = false;
let startTime = Date.now();
let timerInterval;

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

function pickRandom(pool, n = 20) {
  return shuffle(pool).slice(0, Math.min(n, pool.length));
}

// ══════════════════════════════════════════
//   ЭКРАН ВЫБОРА ТЕСТА
// ══════════════════════════════════════════
function renderTestSelection() {
  document.getElementById('timer').style.display = 'none';
  document.getElementById('logo-mark').textContent = "OT";
  document.getElementById('logo-mark').style.background = "#FF5722";
  document.getElementById('test-title').textContent = "Выбор теста";
  document.getElementById('test-subtitle').textContent = "Промежуточная аттестация";

  let html = `
    <div style="padding: 40px 20px; text-align: center;">
      <h1 style="font-family: 'Unbounded', sans-serif; font-size: 28px; margin-bottom: 8px; color: var(--text);">
        Выберите тест
      </h1>
      <p style="color: var(--muted); margin-bottom: 50px;">Промежуточная аттестация по безопасности</p>

      <div style="display: flex; flex-direction: column; gap: 16px; max-width: 460px; margin: 0 auto;">
  `;

  Object.values(TESTS).forEach(test => {
    html += `
      <button onclick="startTest('${test.id}')" 
        style="background: var(--surface); border: 1.5px solid var(--border); 
               padding: 24px 24px; border-radius: 18px; text-align: left;
               transition: all 0.25s; cursor: pointer; width: 100%;">
        <div style="display: flex; align-items: center; gap: 18px;">
          <div style="width: 56px; height: 56px; background: ${test.color}; 
                      border-radius: 14px; display: grid; place-items: center;
                      font-family: 'Unbounded', sans-serif; font-size: 19px; 
                      font-weight: 900; color: #fff; flex-shrink: 0; box-shadow: 0 4px 15px rgba(0,0,0,0.3);">
            ${test.logo}
          </div>
          <div style="flex: 1;">
            <div style="font-size: 20px; font-weight: 600; margin-bottom: 4px;">${test.title}</div>
            <div style="color: var(--muted); font-size: 14.5px;">${test.subtitle}</div>
          </div>
        </div>
      </button>
    `;
  });

  html += `</div></div>`;
  document.getElementById('app').innerHTML = html;
}

// ══════════════════════════════════════════
//   ЗАПУСК ТЕСТА
// ══════════════════════════════════════════
async function startTest(testId) {
  CURRENT_TEST = TESTS[testId];
  if (!CURRENT_TEST) return;

  // Обновляем шапку
  const logoEl = document.getElementById('logo-mark');
  logoEl.textContent = CURRENT_TEST.logo;
  logoEl.style.background = CURRENT_TEST.color;

  document.getElementById('test-title').textContent = CURRENT_TEST.title;
  document.getElementById('test-subtitle').textContent = CURRENT_TEST.subtitle;

  try {
    const res = await fetch(CURRENT_TEST.file);
    ALL_QUESTIONS = await res.json();

    if (!ALL_QUESTIONS || ALL_QUESTIONS.length === 0) throw new Error();

    initTest();
  } catch (e) {
    document.getElementById('app').innerHTML = `
      <div style="color:#ef4444; text-align:center; padding:100px 20px;">
        ❌ Не удалось загрузить вопросы для теста <strong>${CURRENT_TEST.title}</strong><br><br>
        <small style="color:#7a7a8c">Проверьте наличие файла <b>${CURRENT_TEST.file}</b></small>
      </div>`;
  }
}

function initTest() {
  clearInterval(timerInterval);

  QUESTIONS = pickRandom(ALL_QUESTIONS, 20);
  TOTAL     = QUESTIONS.length;
  current   = 0;
  answers   = new Array(TOTAL).fill(null);
  finished  = false;
  startTime = Date.now();

  document.getElementById('timer').style.display = '';
  startTimer();
  render();
}

function startTimer() {
  const el = document.getElementById('timer');
  timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const left = Math.max(0, 20 * 60 - elapsed);
    const m = String(Math.floor(left / 60)).padStart(2, '0');
    const s = String(left % 60).padStart(2, '0');
    el.textContent = `${m}:${s}`;
    el.classList.toggle('urgent', left <= 60);
    if (left === 0) finishTest();
  }, 500);
}

// Рендер теста (вопрос + навигация)
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
            onclick="goTo(${i})">${i+1}</button>
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
          <div class="option ${answers[current] === i ? 'selected' : ''}" onclick="selectAnswer(${i})">
            <div class="opt-letter">${letters[i]}</div>
            <div class="opt-text">${opt}</div>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="footer-bar">
      <div class="progress-info">Отвечено: <b>${answered}</b> из <b>${TOTAL}</b></div>
      <div style="display:flex; gap:10px; flex-wrap:wrap">
        ${current > 0 ? `<button class="btn btn-outline" onclick="goTo(${current-1})">← Назад</button>` : ''}
        ${current < TOTAL-1 
          ? `<button class="btn btn-primary" onclick="goTo(${current+1})">Следующий →</button>` 
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
    if (answers[i] === null) skipped++;
    else if (answers[i] === q.answer) correct++;
    else wrong++;
  });

  const pct = Math.round((correct / TOTAL) * 100);
  const passed = pct >= 60;

  const letters = ['a','b','c','d','e','f'];

  const reviewHTML = QUESTIONS.map((q, i) => {
    const user = answers[i];
    return `
      <div class="review-item">
        <div class="ri-q"><b>Вопрос ${i+1}.</b> ${q.text}</div>
        <div class="ri-answers">
          ${q.options.map((opt, j) => {
            let cls = '';
            if (j === q.answer) cls = 'correct';
            else if (j === user && user !== q.answer) cls = 'wrong';
            return `<div class="ri-ans ${cls}">
              ${letters[j]}. ${opt} ${j === q.answer ? '✓' : j === user ? '✗' : ''}
            </div>`;
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
            stroke-dasharray="364.42" stroke-dashoffset="364.42" id="fillCircle"/>
        </svg>
        <div class="result-pct" id="pctNum">0%</div>
      </div>

      <h2 class="result-title">${passed ? '🎉 Тест пройден!' : '😔 Тест не пройден'}</h2>
      <p class="result-sub">
        ${passed ? 'Отличный результат!' : `Нужно набрать минимум 60%. Попробуйте ещё раз.`}
      </p>

      <div class="result-stats">
        <div class="stat-pill"><div class="stat-num c">${correct}</div><div class="stat-lbl">Правильных</div></div>
        <div class="stat-pill"><div class="stat-num w">${wrong}</div><div class="stat-lbl">Неверных</div></div>
        <div class="stat-pill"><div class="stat-num sk">${skipped}</div><div class="stat-lbl">Пропущено</div></div>
      </div>

      <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; margin: 30px 0;">
        <button class="btn btn-primary" onclick="restartTest()">🔄 Пройти этот тест заново</button>
        <button class="btn btn-outline" onclick="goBackToSelection()">← К выбору тестов</button>
      </div>

      <div class="review-section">
        <div class="review-title">Разбор ответов</div>
        ${reviewHTML}
      </div>
    </div>
  `;

  // Анимация круга
  setTimeout(() => {
    const fill = document.getElementById('fillCircle');
    const num = document.getElementById('pctNum');
    if (!fill || !num) return;
    fill.style.strokeDashoffset = 364.42 - (pct / 100 * 364.42);
    let count = 0;
    const interval = setInterval(() => {
      count = Math.min(count + Math.ceil(pct / 40), pct);
      num.textContent = count + '%';
      if (count >= pct) clearInterval(interval);
    }, 25);
  }, 300);
}

// Действия
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
  if (answers.filter(a => a === null).length > 0) {
    document.getElementById('modal').classList.add('show');
  } else {
    finishTest();
  }
}

function closeModal() { document.getElementById('modal').classList.remove('show'); }
function finishTest() { closeModal(); finished = true; render(); }

function restartTest() { initTest(); }

function goBackToSelection() {
  clearInterval(timerInterval);
  CURRENT_TEST = null;
  renderTestSelection();
}

// Запуск приложения
renderTestSelection();
