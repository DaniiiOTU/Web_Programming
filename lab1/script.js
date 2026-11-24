'use strict';

const STORAGE_KEY = 'itmo-lab1-variant22682-results';
const canvas = document.getElementById('graph');
const ctx = canvas.getContext('2d');
const form = document.getElementById('point-form');
const yInput = document.getElementById('y');
const message = document.getElementById('form-message');
const resultsBody = document.getElementById('results-body');
const clearButton = document.getElementById('clear-history');

let results = loadResults();

function loadResults() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(saved) ? saved : [];
  } catch (error) {
    return [];
  }
}

function saveResults() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(results));
  } catch (error) {
    message.textContent = 'Не удалось сохранить историю в localStorage браузера.';
  }
}

function selectedValues(name) {
  return Array.from(form.querySelectorAll(`input[name="${name}"]:checked`))
    .map((input) => Number(input.value));
}

function parseY(raw) {
  // Поддерживаем и десятичную запятую, и десятичную точку.
  const normalized = raw.trim().replace(',', '.');
  if (normalized === '') return NaN;
  return Number(normalized);
}

function pointHits(x, y, r) {
  // Область по рисунку варианта:
  // I квадрант: прямоугольник 0 <= x <= R/2, 0 <= y <= R;
  // II квадрант: четверть круга радиуса R/2;
  // III квадрант: треугольник с вершинами (-R/2, 0), (0, 0), (0, -R).
  const inRectangle = x >= 0 && x <= r / 2 && y >= 0 && y <= r;
  const inQuarterCircle = x <= 0 && y >= 0 && (x * x + y * y <= (r / 2) * (r / 2));
  const inTriangle = x <= 0 && y <= 0 && x >= -r / 2 && y >= 2 * x;
  return inRectangle || inQuarterCircle || inTriangle;
}

function formatDate(timestamp) {
  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'short',
    timeStyle: 'medium'
  }).format(new Date(timestamp));
}

function renderResults() {
  resultsBody.replaceChildren();
  if (results.length === 0) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 5;
    cell.textContent = 'Пока нет результатов. Отправьте форму, чтобы проверить точку.';
    row.appendChild(cell);
    resultsBody.appendChild(row);
    return;
  }

  // Новые результаты показываются первыми.
  [...results].reverse().forEach((item) => {
    const row = document.createElement('tr');
    [item.x, item.y, item.r, item.hit ? 'Да' : 'Нет', formatDate(item.timestamp)].forEach((value, index) => {
      const cell = document.createElement('td');
      cell.textContent = String(value);
      if (index === 3) cell.className = item.hit ? 'hit' : 'miss';
      row.appendChild(cell);
    });
    resultsBody.appendChild(row);
  });
}

function drawGraph() {
  const width = canvas.width;
  const height = canvas.height;
  const centerX = width / 2;
  const centerY = height / 2;
  const scale = 40; // пикселей на одну координатную единицу

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  const selectedR = selectedValues('r');
  const r = selectedR.length ? selectedR[selectedR.length - 1] : 3;
  const px = (x) => centerX + x * scale;
  const py = (y) => centerY - y * scale;

  // Заштрихованная область варианта.
  ctx.fillStyle = 'rgba(37, 139, 245, 0.82)';
  // Прямоугольник в I квадранте.
  ctx.fillRect(px(0), py(r), (r / 2) * scale, r * scale);
  // Четверть круга во II квадранте.
  ctx.beginPath();
  ctx.moveTo(px(0), py(0));
  ctx.arc(px(0), py(0), (r / 2) * scale, Math.PI, 1.5 * Math.PI, false);
  ctx.closePath();
  ctx.fill();
  // Треугольник в IV квадранте.
  ctx.beginPath();
  ctx.moveTo(px(-r / 2), py(0));
  ctx.lineTo(px(0), py(0));
  ctx.lineTo(px(0), py(-r));
  ctx.closePath();
  ctx.fill();

  // Сетка и оси.
  ctx.strokeStyle = '#dce4ef';
  ctx.lineWidth = 1;
  for (let i = -5; i <= 5; i += 1) {
    if (i !== 0) {
      ctx.beginPath(); ctx.moveTo(px(i), 0); ctx.lineTo(px(i), height); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, py(i)); ctx.lineTo(width, py(i)); ctx.stroke();
    }
  }
  ctx.strokeStyle = '#172b4d';
  ctx.lineWidth = 1.7;
  ctx.beginPath(); ctx.moveTo(18, centerY); ctx.lineTo(width - 18, centerY); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(centerX, height - 18); ctx.lineTo(centerX, 18); ctx.stroke();
  // Стрелки осей.
  ctx.beginPath();
  ctx.moveTo(width - 18, centerY); ctx.lineTo(width - 27, centerY - 5);
  ctx.moveTo(width - 18, centerY); ctx.lineTo(width - 27, centerY + 5);
  ctx.moveTo(centerX, 18); ctx.lineTo(centerX - 5, 27);
  ctx.moveTo(centerX, 18); ctx.lineTo(centerX + 5, 27);
  ctx.stroke();

  ctx.fillStyle = '#172b4d';
  ctx.font = '13px Arial';
  ctx.fillText('x', width - 14, centerY - 8);
  ctx.fillText('y', centerX + 8, 17);
  ctx.fillText('0', centerX + 6, centerY + 15);
  for (let i = -5; i <= 5; i += 1) {
    if (i !== 0) {
      ctx.fillText(String(i), px(i) - 4, centerY + 16);
      ctx.fillText(String(i), centerX + 7, py(i) + 4);
    }
  }
  ctx.fillText(`R=${r}`, 12, 18);

  // Отмечаем все сохранённые точки; цвет показывает результат.
  results.forEach((item) => {
    const x = px(item.x);
    const y = py(item.y);
    if (x >= 0 && x <= width && y >= 0 && y <= height) {
      ctx.beginPath();
      ctx.arc(x, y, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = item.hit ? '#15803d' : '#c62828';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  });
}

function showError(text, invalid = false) {
  message.textContent = text;
  yInput.classList.toggle('invalid', invalid);
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  yInput.classList.remove('invalid');

  const xs = selectedValues('x');
  const rs = selectedValues('r');
  const y = parseY(yInput.value);

  if (xs.length === 0) {
    showError('Выберите хотя бы одно значение X.');
    return;
  }
  if (!Number.isFinite(y) || y < -3 || y > 5) {
    showError('Введите число Y в диапазоне от −3 до 5.', true);
    return;
  }
  if (rs.length === 0) {
    showError('Выберите хотя бы одно значение R.');
    return;
  }

  const timestamp = Date.now();
  // При нескольких выбранных X и R проверяется каждая комбинация.
  xs.forEach((x) => {
    rs.forEach((r) => {
      results.push({ x, y, r, hit: pointHits(x, y, r), timestamp });
    });
  });
  saveResults();
  renderResults();
  drawGraph();
  showError(`Готово: добавлено проверок — ${xs.length * rs.length}.`);
});

yInput.addEventListener('input', () => {
  yInput.classList.remove('invalid');
  if (message.textContent) message.textContent = '';
});

form.querySelectorAll('input[name="r"]').forEach((input) => {
  input.addEventListener('change', drawGraph);
});

clearButton.addEventListener('click', () => {
  results = [];
  saveResults();
  renderResults();
  drawGraph();
  showError('История очищена.');
});

renderResults();
drawGraph();
