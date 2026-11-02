
const display = document.getElementById('display');
const upBtn = document.querySelector('[data-action="up"]');
const downBtn = document.querySelector('[data-action="down"]');

const HISTORY_KEY = 'history';
const HISTORY_LIMIT = 50;

let expr = '';
let cursor = 0;
let showingResult = false;
let isError = false;

let history = loadHistory();
let historyIndex = history.length;
let draft = '';

function loadHistory() {
    try {
        const saved = JSON.parse(sessionStorage.getItem(HISTORY_KEY));
        if (Array.isArray(saved)) return saved.filter((s) => typeof s === 'string');
    } catch (err) {

    }
    return [];
}

function saveHistory() {
    try {
        sessionStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (err) {
    }
}

function addToHistory(entry) {
    if (history[history.length - 1] !== entry) history.push(entry);
    if (history.length > HISTORY_LIMIT) history.shift();
    historyIndex = history.length;
    draft = '';
    saveHistory();
}

function render() {
    display.textContent = '';
    display.classList.toggle('error', isError);

    const before = document.createElement('span');
    before.textContent = expr.slice(0, cursor);

    const caret = document.createElement('span');
    caret.className = 'caret';

    const after = document.createElement('span');
    after.textContent = expr.slice(cursor);

    display.append(before, caret, after);

    const pad = 20;
    const left = caret.offsetLeft;
    if (left < display.scrollLeft + pad) {
        display.scrollLeft = Math.max(0, left - pad);
    } else if (left > display.scrollLeft + display.clientWidth - pad) {
        display.scrollLeft = left - display.clientWidth + pad;
    }
}

function resetIfError() {
    if (isError) {
        expr = '';
        cursor = 0;
        isError = false;
    }
}

function numberAtCursorHasDot() {
    let start = cursor;
    let end = cursor;
    while (start > 0 && /[\d.]/.test(expr[start - 1])) start--;
    while (end < expr.length && /[\d.]/.test(expr[end])) end++;
    return expr.slice(start, end).includes('.');
}

function insert(value) {
    resetIfError();

    if (showingResult) {
        if (/[\d.(]/.test(value)) {
            expr = '';
            cursor = 0;
        }
        showingResult = false;
    }

    if (value === '.' && numberAtCursorHasDot()) return render();

    expr = expr.slice(0, cursor) + value + expr.slice(cursor);
    cursor += value.length;
    historyIndex = history.length;
    render();
}

function moveLeft() {
    resetIfError();
    showingResult = false;
    if (cursor > 0) cursor--;
    render();
}

function moveRight() {
    resetIfError();
    showingResult = false;
    if (cursor < expr.length) cursor++;
    render();
}

function showLine(text) {
    expr = text;
    cursor = expr.length;
    isError = false;
    showingResult = false;
    render();
}

function historyUp() {
    if (historyIndex === 0) return;
    if (historyIndex === history.length) draft = isError ? '' : expr;
    historyIndex--;
    showLine(history[historyIndex]);
}

function historyDown() {
    if (historyIndex >= history.length) return; // already on the live line
    historyIndex++;
    showLine(historyIndex === history.length ? draft : history[historyIndex]);
}

function backspace() {
    resetIfError();
    showingResult = false;
    if (cursor > 0) {
        expr = expr.slice(0, cursor - 1) + expr.slice(cursor);
        cursor--;
    }
    historyIndex = history.length;
    render();
}

function deleteForward() {
    resetIfError();
    showingResult = false;
    if (cursor < expr.length) {
        expr = expr.slice(0, cursor) + expr.slice(cursor + 1);
    }
    historyIndex = history.length;
    render();
}

function clearAll() {
    expr = '';
    cursor = 0;
    showingResult = false;
    isError = false;
    historyIndex = history.length;
    draft = '';
    render();
}

function equals() {
    if (isError || showingResult || expr.trim() === '') return;
    const entry = expr; // save the expression, not the result
    try {
        const value = eval(expr.replaceAll('^', '**'));
        expr = String(value);
        isError = false;
    } catch (e) {
        expr = 'Error';
        isError = true;
    }
    addToHistory(entry);
    cursor = expr.length;
    showingResult = !isError;
    render();
}

document.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', () => {
        const { value, action } = btn.dataset;
        if (value !== undefined) insert(value);
        else if (action === 'equals') equals();
        else if (action === 'clear') clearAll();
        else if (action === 'left') moveLeft();
        else if (action === 'right') moveRight();
        else if (action === 'up') historyUp();
        else if (action === 'down') historyDown();
    });
});

document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key;

    if (/^[0-9]$/.test(k) || '.+-*/^%()'.includes(k)) insert(k);
    else if (k === 'x' || k === 'X') insert('*');
    else if (k === 'Enter' || k === '=') equals();
    else if (k === 'Backspace') backspace();
    else if (k === 'Delete') deleteForward();
    else if (k === 'ArrowLeft') moveLeft();
    else if (k === 'ArrowRight') moveRight();
    else if (k === 'ArrowUp') historyUp();
    else if (k === 'ArrowDown') historyDown();
    else if (k === 'Escape' || k === 'c' || k === 'C') clearAll();
    else return;

    e.preventDefault();
});

render();