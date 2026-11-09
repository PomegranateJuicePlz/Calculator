const display = document.getElementById("display");
const MAX_VISIBLE = 16;
const MAX_HISTORY = 50;

let expr = [];
let cursor = 0;
let showingResult = false;
let isError = false;
let history = [];
let historyIndex = -1;

function saveState() {
    const state = {
        expr: expr,
        cursor: cursor,
        showingResult: showingResult,
        isError: isError,
        history: history
    };
    localStorage.setItem("calculator", JSON.stringify(state));
}

function loadState() {
    const saved = JSON.parse(localStorage.getItem("calculator"));
    if (saved !== null && saved.expr !== undefined) {
        expr = saved.expr;
        cursor = saved.cursor;
        showingResult = saved.showingResult;
        isError = saved.isError;
        if (saved.history !== undefined) {
            history = saved.history;
        }
    }
    if (cursor < 0 || cursor > expr.length) {
        cursor = expr.length;
    }
}

function setFontSize(length) {
    let size = 28;
    if (length > 9) {
        size = 28 * 9 / length;
    }
    if (size < 16) {
        size = 16;
    }
    display.style.fontSize = size + "px";
}

function render() {
    display.classList.remove("error");
    display.classList.remove("history");

    if (historyIndex !== -1) {
        const entry = history[historyIndex];
        let text = entry.problem + "=" + entry.answer;
        if (text.length > MAX_VISIBLE) {
            text = "..." + text.slice(text.length - MAX_VISIBLE + 3);
        }
        display.classList.add("history");
        setFontSize(text.length);
        display.innerHTML = text;
        return;
    }

    if (isError) {
        display.innerHTML = "Error";
        display.classList.add("error");
        display.style.fontSize = "28px";
        return;
    }

    setFontSize(expr.length);

    let start = 0;
    if (expr.length > MAX_VISIBLE) {
        start = expr.length - MAX_VISIBLE;
        if (cursor < start) {
            start = cursor;
        }
    }
    let end = start + MAX_VISIBLE;
    if (end > expr.length) {
        end = expr.length;
    }

    let before = "";
    for (let i = start; i < cursor; i++) {
        before = before + expr[i];
    }
    let after = "";
    for (let i = cursor; i < end; i++) {
        after = after + expr[i];
    }

    display.innerHTML = before + '<span class="caret">|</span>' + after;
}

function update() {
    render();
    saveState();
}

function isDigit(ch) {
    return ch >= "0" && ch <= "9";
}

function toCharacters(text) {
    const chars = [];
    for (let i = 0; i < text.length; i++) {
        chars.push(text[i]);
    }
    return chars;
}

function toText(chars) {
    let text = "";
    for (let i = 0; i < chars.length; i++) {
        text = text + chars[i];
    }
    return text;
}

function numberHasDot() {
    let i = cursor - 1;
    while (i >= 0 && (isDigit(expr[i]) || expr[i] === ".")) {
        if (expr[i] === ".") {
            return true;
        }
        i--;
    }
    i = cursor;
    while (i < expr.length && (isDigit(expr[i]) || expr[i] === ".")) {
        if (expr[i] === ".") {
            return true;
        }
        i++;
    }
    return false;
}

function useHistoryAnswer() {
    if (historyIndex !== -1) {
        expr = toCharacters(history[historyIndex].answer);
        cursor = expr.length;
        showingResult = true;
        isError = false;
        historyIndex = -1;
    }
}

function useHistoryProblem() {
    if (historyIndex !== -1) {
        expr = toCharacters(history[historyIndex].problem);
        cursor = expr.length;
        showingResult = false;
        isError = false;
        historyIndex = -1;
        return true;
    }
    return false;
}

function pressKey(value) {
    useHistoryAnswer();

    if (isError) {
        expr = [];
        cursor = 0;
        isError = false;
    }

    if (showingResult) {
        if (isDigit(value) || value === "." || value === "(") {
            expr = [];
            cursor = 0;
        }
        showingResult = false;
    }

    if (value === "." && numberHasDot()) {
        update();
        return;
    }

    expr.splice(cursor, 0, value);
    cursor++;
    update();
}

function moveLeft() {
    if (useHistoryProblem()) {
        update();
        return;
    }
    if (isError) {
        clearAll();
        return;
    }
    showingResult = false;
    if (cursor > 0) {
        cursor--;
    }
    update();
}

function moveRight() {
    if (useHistoryProblem()) {
        update();
        return;
    }
    if (isError) {
        clearAll();
        return;
    }
    showingResult = false;
    if (cursor < expr.length) {
        cursor++;
    }
    update();
}

function moveUp() {
    if (history.length === 0) {
        return;
    }
    if (historyIndex === -1) {
        historyIndex = history.length - 1;
    } else if (historyIndex > 0) {
        historyIndex--;
    }
    render();
}

function moveDown() {
    if (historyIndex === -1) {
        return;
    }
    if (historyIndex < history.length - 1) {
        historyIndex++;
    } else {
        historyIndex = -1;
    }
    render();
}

function clearAll() {
    expr = [];
    cursor = 0;
    showingResult = false;
    isError = false;
    historyIndex = -1;
    update();
}

function equals() {
    useHistoryAnswer();

    if (isError || expr.length === 0) {
        update();
        return;
    }

    const problem = toText(expr);
    const answer = calculate(expr);

    if (mathError) {
        expr = [];
        cursor = 0;
        isError = true;
        showingResult = false;
    } else {
        if (!showingResult) {
            history.push({ problem: problem, answer: "" + answer });
            if (history.length > MAX_HISTORY) {
                history.shift();
            }
        }
        expr = toCharacters("" + answer);
        cursor = expr.length;
        showingResult = true;
    }
    update();
}

let tokens = [];
let position = 0;
let mathError = false;

function calculate(chars) {
    mathError = false;
    tokens = makeTokens(chars);
    position = 0;

    if (tokens.length === 0) {
        mathError = true;
        return 0;
    }

    let answer = readAddSubtract();

    if (position < tokens.length) {
        mathError = true;
    }
    if (isNaN(answer) || answer === Infinity || answer === -Infinity) {
        mathError = true;
    }

    answer = Math.round(answer * 10000000000) / 10000000000;
    return answer;
}

function makeTokens(chars) {
    const list = [];
    let i = 0;
    while (i < chars.length) {
        if (isDigit(chars[i]) || chars[i] === ".") {
            let numberText = "";
            let dots = 0;
            while (i < chars.length && (isDigit(chars[i]) || chars[i] === ".")) {
                if (chars[i] === ".") {
                    dots++;
                }
                numberText = numberText + chars[i];
                i++;
            }
            if (dots > 1 || numberText === ".") {
                mathError = true;
            }
            list.push({ type: "number", value: Number(numberText) });
        } else {
            list.push({ type: "operator", value: chars[i] });
            i++;
        }
    }
    return list;
}

function nextIs(operator) {
    return position < tokens.length &&
        tokens[position].type === "operator" &&
        tokens[position].value === operator;
}

function nextStartsValue() {
    return position < tokens.length &&
        (tokens[position].type === "number" || nextIs("("));
}

function readAddSubtract() {
    let value = readMultiplyDivide();
    while (nextIs("+") || nextIs("-")) {
        const operator = tokens[position].value;
        position++;
        const right = readMultiplyDivide();
        if (operator === "+") {
            value = value + right;
        } else {
            value = value - right;
        }
    }
    return value;
}

function readMultiplyDivide() {
    let value = readNegative();
    while (true) {
        if (nextIs("*")) {
            position++;
            value = value * readNegative();
        } else if (nextIs("/")) {
            position++;
            const right = readNegative();
            if (right === 0) {
                mathError = true;
            }
            value = value / right;
        } else if (nextStartsValue()) {
            value = value * readNegative();
        } else {
            return value;
        }
    }
}

function readNegative() {
    if (nextIs("-")) {
        position++;
        return -readNegative();
    }
    if (nextIs("+")) {
        position++;
        return readNegative();
    }
    return readPower();
}

function readPower() {
    const base = readPercent();
    if (nextIs("^")) {
        position++;
        return Math.pow(base, readNegative());
    }
    return base;
}

function readPercent() {
    let value = readNumberOrParentheses();
    while (nextIs("%")) {
        position++;
        value = value / 100;
    }
    return value;
}

function readNumberOrParentheses() {
    if (position >= tokens.length) {
        mathError = true;
        return 0;
    }

    const token = tokens[position];

    if (token.type === "number") {
        position++;
        return token.value;
    }

    if (nextIs("(")) {
        position++;
        const value = readAddSubtract();
        if (nextIs(")")) {
            position++;
        } else if (position < tokens.length) {
            mathError = true;
        }
        return value;
    }

    mathError = true;
    return 0;
}

const keys = document.getElementsByClassName("key");
for (let i = 0; i < keys.length; i++) {
    keys[i].addEventListener("click", (event) => {
        pressKey(event.target.innerText);
    });
}

document.getElementById("equals").addEventListener("click", (event) => {
    equals();
});

document.getElementById("clear").addEventListener("click", (event) => {
    clearAll();
});

document.getElementById("left").addEventListener("click", (event) => {
    moveLeft();
});

document.getElementById("right").addEventListener("click", (event) => {
    moveRight();
});

document.getElementById("up").addEventListener("click", (event) => {
    moveUp();
});

document.getElementById("down").addEventListener("click", (event) => {
    moveDown();
});

loadState();
render();
