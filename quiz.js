// ══════════════════════════════════════════
//   КОНФИГУРАЦИЯ
// ══════════════════════════════════════════
const TIME_LIMIT   = 120 * 60;     // 2 часа
const PASS_PERCENT = 60;

const QUIZ_COUNT = {
  worker: { biot: 20, pb: 60, ptm: 20 },
  itr:    { biot: 50, pb: 100, ptm: 20 }
};

const TEST_TYPES = {
  biot: { name: "БиОТ", title: "Безопасность и охрана труда", workerFile: "biot.json", itrFile: "biot_itr.json" },
  pb:   { name: "ПБ",   title: "Промышленная безопасность", workerFile: "pb.json",   itrFile: "pb_itr.json" },
  ptm:  { name: "ПТМ",  title: "Пожарно-технический минимум", workerFile: "ptm.json",  itrFile: "ptm_itr.json" }
};

// ══════════════════════════════════════════
//   СОСТОЯНИЕ
// ══════════════════════════════════════════
let currentUser = null;           // { tabNumber, fullName, position }
let ALL_QUESTIONS = [];
let QUESTIONS = [];
let TOTAL = 0;
let current = 0;
let answers = [];
let finished = false;
let startTime = Date.now();
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
//   АВТОРИЗАЦИЯ
// ══════════════════════════════════════════
async function showLoginScreen(error = '') {
  let html = `
    <div class="selection-screen" style="padding-top:100px;">
      <div style="max-width:420px;margin:0 auto;background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:40px 32px;">
        <h2 style="text-align:center;margin-bottom:10px;">Вход в систему</h2>
        <p style="text-align:center;color:var(--muted);margin-bottom:30px;">Введите свой табельный номер</p>
        
        ${error ? `<p style="color:#ef4444;text-align:center;margin-bottom:20px;">${error}</p>` : ''}
        
        <input type="text" id="tabInput" placeholder="Табельный номер (например: 00123)" 
               style="width:100%;padding:16px 20px;border-radius:12px;border:1px solid var(--border);background:var(--surface2);color:var(--text);font-size:16px;margin-bottom:20px;text-align:center;">
        
        <button class="btn btn-primary" onclick="login()" style="width:100%;padding:16px;">Войти</button>
      </div>
    </div>
  `;
  document.getElementById('app').innerHTML = html;
  document.getElementById('main-header').style.display = 'none';

  // Автофокус
  setTimeout(() => {
    const input = document.getElementById('tabInput');
    if (input) input.focus();
  }, 100);
}

async function login() {
  const tabNumber = document.getElementById('tabInput').value.trim();
  if (!tabNumber) {
    showLoginScreen('Введите табельный номер');
    return;
  }

  try {
    const res = await fetch('/testing/employees.json');
    if (!res.ok) throw new Error('Не удалось загрузить базу сотрудников');
    
    const data = await res.json();
    const employee = data.employees.find(e => e.tabNumber === tabNumber);

    if (employee) {
      currentUser = employee;
      document.getElementById('main-header').style.display = 'flex';
      document.getElementById('user-info').innerHTML = `
        <strong>${employee.fullName}</strong><br>
        <small style="color:var(--muted)">${employee.position}</small>
      `;
      showTestSelection();
    } else {
      showLoginScreen('Табельный номер не найден');
    }
  } catch (e) {
    console.error(e);
    showLoginScreen('Ошибка загрузки базы. Проверьте файл employees.json');
  }
}

function logout() {
  if (confirm('Выйти из аккаунта?')) {
    currentUser = null;
    showLoginScreen();
  }
}

// ══════════════════════════════════════════
//   ЭКРАНЫ ТЕСТОВ (остальное без изменений)
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
        <div class="test-icon">${key === 'biot' ? '🛡️' : key === 'pb' ? '🏭' : '🧯'}</div>
        <h3>${t.name}</h3>
        <p>${t.title}</p>
      </div>
    `;
  });

  html += `</div></div>`;
  document.getElementById('app').innerHTML = html;
}

// ... (все остальные функции остаются точно такими же, как в твоей предыдущей версии:
// selectCategory, startTest, loadQuestions, initTest, startTimer, render, renderQuiz, 
// renderResult, selectAnswer, goTo, confirmFinish, closeModal, finishTest, restartTest)

function selectCategory(testType) { /* твой код */ }
function startTest(type, category) { /* твой код */ }
async function loadQuestions(type) { /* твой код */ }
function initTest() { /* твой код */ }
function startTimer() { /* твой код */ }
function render() { /* твой код */ }
function renderQuiz() { /* твой код */ }
function renderResult() { /* твой код */ }
function selectAnswer(idx) { /* твой код */ }
function goTo(idx) { /* твой код */ }
function confirmFinish() { /* твой код */ }
function closeModal() { /* твой код */ }
function finishTest() { /* твой код */ }
function restartTest() { /* твой код */ }

// Глобальные функции для onclick
window.showTestSelection = showTestSelection;
window.selectCategory = selectCategory;
window.startTest = startTest;
window.goTo = goTo;
window.selectAnswer = selectAnswer;
window.confirmFinish = confirmFinish;
window.closeModal = closeModal;
window.finishTest = finishTest;
window.restartTest = restartTest;
window.login = login;
window.logout = logout;

// ══════════════════════════════════════════
//   СТАРТ ПРИЛОЖЕНИЯ
// ══════════════════════════════════════════
showLoginScreen();