const STORAGE_KEYS = {
  coins: "sudoku_order_coins",
  progress: "sudoku_order_progress_v4",
};

const DIFFICULTIES = [
  {
    id: "easy",
    title: "Лёгкий",
    size: 9,
    removeCount: 34,
    reward: 30,
    description: "Спокойный старт и ровное поле 9×9.",
    unlockWinsRequired: 0,
  },
  {
    id: "medium",
    title: "Средний",
    size: 9,
    removeCount: 42,
    reward: 45,
    description: "Чуть плотнее и требовательнее.",
    unlockWinsRequired: 5,
  },
  {
    id: "hard",
    title: "Сложный",
    size: 9,
    removeCount: 50,
    reward: 60,
    description: "Меньше подсказок, больше риска.",
    unlockWinsRequired: 5,
  },
  {
    id: "expert",
    title: "Эксперт",
    size: 16,
    removeCount: 96,
    reward: 100,
    description: "Большое поле 16×16 с символами 1–G.",
    unlockWinsRequired: 5,
  },
  {
    id: "abyss",
    title: "Бездна",
    size: 16,
    removeCount: 122,
    reward: 140,
    description: "Тяжёлый режим 16×16 для упорных.",
    unlockWinsRequired: 5,
  },
];

const SYMBOL_SETS = {
  4: ["1", "2", "3", "4"],
  9: ["1", "2", "3", "4", "5", "6", "7", "8", "9"],
  16: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "A", "B", "C", "D", "E", "F", "G"],
};

const SUBGRID_MAP = {
  4: { rows: 2, cols: 2 },
  9: { rows: 3, cols: 3 },
  16: { rows: 4, cols: 4 },
};

const state = {
  difficultyIndex: 0,
  board: [],
  solution: [],
  fixed: [],
  notes: [],
  selected: null,
  notesMode: false,
  lives: 3,
  gameOver: false,
  timerSeconds: 0,
  timerId: null,
  coins: loadCoins(),
  progress: loadProgress(),
  hintsUsedThisGame: 0,
  surrendered: false,
  isEndless: false,
};

const dom = {
  board: document.getElementById("board"),
  boardWrap: document.getElementById("boardWrap"),
  boardTitle: document.getElementById("boardTitle"),
  boardSubtitle: document.getElementById("boardSubtitle"),
  hintMeta: document.getElementById("hintMeta"),
  timeValue: document.getElementById("timeValue"),
  modeStatLabel: document.getElementById("modeStatLabel"),
  modeValue: document.getElementById("modeValue"),
  coinsValue: document.getElementById("coinsValue"),
  modalCoinsValue: document.getElementById("modalCoinsValue"),
  difficultyList: document.getElementById("difficultyList"),
  progressList: document.getElementById("progressList"),
  numberPad: document.getElementById("numberPad"),
  notesBtn: document.getElementById("notesBtn"),
  newGameBtn: document.getElementById("newGameBtn"),
  modeBtn: document.getElementById("modeBtn"),
  modeBtnMeta: document.getElementById("modeBtnMeta"),
  modeBtnBadge: document.getElementById("modeBtnBadge"),
  themeBtn: document.getElementById("themeBtn"),
  themeBtnMeta: document.getElementById("themeBtnMeta"),
  themeBtnBadge: document.getElementById("themeBtnBadge"),
  eraseBtn: document.getElementById("eraseBtn"),
  clearNotesBtn: document.getElementById("clearNotesBtn"),
  hintBtn: document.getElementById("hintBtn"),
  surrenderBtn: document.getElementById("surrenderBtn"),
  overlay: document.getElementById("overlay"),
  gameOverModal: document.getElementById("gameOverModal"),
  winModal: document.getElementById("winModal"),
  surrenderModal: document.getElementById("surrenderModal"),
  endlessResultModal: document.getElementById("endlessResultModal"),
  endlessResultText: document.getElementById("endlessResultText"),
  continueEndlessBtn: document.getElementById("continueEndlessBtn"),
  restartAfterEndlessBtn: document.getElementById("restartAfterEndlessBtn"),
  buyLifeBtn: document.getElementById("buyLifeBtn"),
  restartFromLoseBtn: document.getElementById("restartFromLoseBtn"),
  nextDifficultyBtn: document.getElementById("nextDifficultyBtn"),
  restartAfterWinBtn: document.getElementById("restartAfterWinBtn"),
  restartAfterSurrenderBtn: document.getElementById("restartAfterSurrenderBtn"),
  winText: document.getElementById("winText"),
};

function loadCoins() {
  const raw = localStorage.getItem(STORAGE_KEYS.coins);
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 120;
}

function saveCoins() {
  localStorage.setItem(STORAGE_KEYS.coins, String(state.coins));
}

function getEmptyProgress() {
  return {
    easy: 0,
    medium: 0,
    hard: 0,
    expert: 0,
    abyss: 0,
  };
}

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.progress);
    if (!raw) {
      return getEmptyProgress();
    }
    const parsed = JSON.parse(raw);
    return {
      easy: Number(parsed.easy) || 0,
      medium: Number(parsed.medium) || 0,
      hard: Number(parsed.hard) || 0,
      expert: Number(parsed.expert) || 0,
      abyss: Number(parsed.abyss) || 0,
    };
  } catch {
    return getEmptyProgress();
  }
}

function saveProgress() {
  localStorage.setItem(STORAGE_KEYS.progress, JSON.stringify(state.progress));
}

function getCurrentDifficulty() {
  return DIFFICULTIES[state.difficultyIndex];
}

function getSymbols(size) {
  return SYMBOL_SETS[size];
}

function getPrevDifficulty(index) {
  if (index <= 0) return null;
  return DIFFICULTIES[index - 1];
}

function isDifficultyUnlocked(index) {
  if (index === 0) return true;
  const prev = getPrevDifficulty(index);
  if (!prev) return true;
  return (state.progress[prev.id] || 0) >= 5;
}

function isEndlessUnlockedForIndex(index) {
  const diff = DIFFICULTIES[index];
  return (state.progress[diff.id] || 0) >= 5;
}

function isCurrentEndlessUnlocked() {
  return isEndlessUnlockedForIndex(state.difficultyIndex);
}

function getDifficultyProgressText(index) {
  if (index === 0) {
    return `${Math.min(state.progress.easy || 0, 5)}/5`;
  }

  const prev = getPrevDifficulty(index);
  const current = state.progress[prev.id] || 0;
  return `${Math.min(current, 5)}/5`;
}

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function createRange(n) {
  return Array.from({ length: n }, (_, i) => i);
}

function pattern(r, c, base) {
  return (base * (r % base) + Math.floor(r / base) + c) % (base * base);
}

function generateSolvedBoard(size) {
  const sub = SUBGRID_MAP[size];
  const base = sub.rows;
  const symbols = getSymbols(size);

  const rows = [];
  shuffle(createRange(base)).forEach((band) => {
    shuffle(createRange(base)).forEach((rowInBand) => {
      rows.push(band * base + rowInBand);
    });
  });

  const cols = [];
  shuffle(createRange(base)).forEach((stack) => {
    shuffle(createRange(base)).forEach((colInStack) => {
      cols.push(stack * base + colInStack);
    });
  });

  const shuffledSymbols = shuffle(symbols);
  return rows.map((r) => cols.map((c) => shuffledSymbols[pattern(r, c, base)]));
}

function deepCopyGrid(grid) {
  return grid.map((row) => [...row]);
}

function createEmptyNotes(size) {
  return Array.from({ length: size }, () =>
    Array.from({ length: size }, () => new Set())
  );
}

function getSubgridBounds(size, row, col) {
  const sub = SUBGRID_MAP[size];
  const startRow = Math.floor(row / sub.rows) * sub.rows;
  const startCol = Math.floor(col / sub.cols) * sub.cols;
  return {
    startRow,
    endRow: startRow + sub.rows - 1,
    startCol,
    endCol: startCol + sub.cols - 1,
  };
}

function getMinClueConfig(difficultyId) {
  switch (difficultyId) {
    case "easy":
      return { row: 3, col: 3, box: 3 };
    case "medium":
      return { row: 2, col: 2, box: 2 };
    case "hard":
      return { row: 1, col: 1, box: 1 };
    default:
      return { row: 1, col: 1, box: 1 };
  }
}

function passesClueDistribution(board, config) {
  const size = board.length;
  const sub = SUBGRID_MAP[size];

  for (let row = 0; row < size; row += 1) {
    let count = 0;
    for (let col = 0; col < size; col += 1) {
      if (board[row][col] !== "") count += 1;
    }
    if (count < config.row) return false;
  }

  for (let col = 0; col < size; col += 1) {
    let count = 0;
    for (let row = 0; row < size; row += 1) {
      if (board[row][col] !== "") count += 1;
    }
    if (count < config.col) return false;
  }

  for (let boxRow = 0; boxRow < size; boxRow += sub.rows) {
    for (let boxCol = 0; boxCol < size; boxCol += sub.cols) {
      let count = 0;
      for (let row = boxRow; row < boxRow + sub.rows; row += 1) {
        for (let col = boxCol; col < boxCol + sub.cols; col += 1) {
          if (board[row][col] !== "") count += 1;
        }
      }
      if (count < config.box) return false;
    }
  }

  return true;
}

function getCandidates9x9(board, row, col) {
  if (board[row][col] !== "") return [];

  const symbols = SYMBOL_SETS[9];
  const used = new Set();

  for (let i = 0; i < 9; i += 1) {
    if (board[row][i] !== "") used.add(board[row][i]);
    if (board[i][col] !== "") used.add(board[i][col]);
  }

  const startRow = Math.floor(row / 3) * 3;
  const startCol = Math.floor(col / 3) * 3;

  for (let r = startRow; r < startRow + 3; r += 1) {
    for (let c = startCol; c < startCol + 3; c += 1) {
      if (board[r][c] !== "") used.add(board[r][c]);
    }
  }

  return symbols.filter((symbol) => !used.has(symbol));
}

function findBestEmptyCell9x9(board) {
  let best = null;

  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      if (board[row][col] !== "") continue;
      const candidates = getCandidates9x9(board, row, col);

      if (candidates.length === 0) return { row, col, candidates };
      if (!best || candidates.length < best.candidates.length) {
        best = { row, col, candidates };
      }
    }
  }

  return best;
}

function countSolutions9x9(board, limit = 2) {
  let count = 0;

  function backtrack() {
    if (count >= limit) return;

    const next = findBestEmptyCell9x9(board);
    if (!next) {
      count += 1;
      return;
    }

    const { row, col, candidates } = next;
    if (candidates.length === 0) return;

    for (const candidate of candidates) {
      board[row][col] = candidate;
      backtrack();
      board[row][col] = "";
      if (count >= limit) return;
    }
  }

  backtrack();
  return count;
}

function generateUniquePuzzle9x9(solution, removeCount, difficultyId) {
  const board = deepCopyGrid(solution);
  const config = getMinClueConfig(difficultyId);
  const cells = shuffle(
    Array.from({ length: 81 }, (_, index) => ({
      row: Math.floor(index / 9),
      col: index % 9,
    }))
  );

  let removed = 0;

  for (const { row, col } of cells) {
    if (removed >= removeCount) break;

    const backup = board[row][col];
    board[row][col] = "";

    if (!passesClueDistribution(board, config)) {
      board[row][col] = backup;
      continue;
    }

    const solutions = countSolutions9x9(deepCopyGrid(board), 2);
    if (solutions === 1) {
      removed += 1;
    } else {
      board[row][col] = backup;
    }
  }

  if (removed < removeCount) {
    const leftovers = shuffle(cells.filter(({ row, col }) => board[row][col] !== ""));

    for (const { row, col } of leftovers) {
      if (removed >= removeCount) break;

      const backup = board[row][col];
      board[row][col] = "";

      const solutions = countSolutions9x9(deepCopyGrid(board), 2);
      if (solutions === 1) {
        removed += 1;
      } else {
        board[row][col] = backup;
      }
    }
  }

  return board;
}

function generateBalancedPuzzle(solution, removeCount) {
  const size = solution.length;
  const board = deepCopyGrid(solution);
  const cells = [];

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      cells.push({ row, col });
    }
  }

  shuffle(cells)
    .slice(0, removeCount)
    .forEach(({ row, col }) => {
      board[row][col] = "";
    });

  return board;
}

function generatePuzzle(solution, removeCount, difficultyId) {
  const size = solution.length;

  if (size === 9) {
    return generateUniquePuzzle9x9(solution, removeCount, difficultyId);
  }

  return generateBalancedPuzzle(solution, removeCount);
}

function updateResponsiveCellSize() {
  const size = state.board.length || getCurrentDifficulty().size;
  if (size === 16) {
    document.documentElement.style.setProperty("--cell-size", window.innerWidth < 760 ? "28px" : "40px");
  } else {
    document.documentElement.style.setProperty("--cell-size", window.innerWidth < 430 ? "34px" : window.innerWidth < 760 ? "38px" : "54px");
  }
}

function updateModeButton() {
  const diff = getCurrentDifficulty();
  const unlocked = isCurrentEndlessUnlocked();

  if (!unlocked) {
    dom.modeBtn.disabled = true;
    dom.modeBtn.classList.remove("active");
    dom.modeBtn.classList.add("locked");
    dom.modeBtnMeta.textContent = `Станет доступен после 5 побед на сложности «${diff.title}»`;
    dom.modeBtnBadge.textContent = "Закрыт";
    return;
  }

  dom.modeBtn.disabled = false;
  dom.modeBtn.classList.remove("locked");
  dom.modeBtnMeta.textContent = `Для «${diff.title}» — без жизней, ошибки считаются после заполнения`;

  if (state.isEndless) {
    dom.modeBtn.classList.add("active");
    dom.modeBtnBadge.textContent = "Вкл";
  } else {
    dom.modeBtn.classList.remove("active");
    dom.modeBtnBadge.textContent = "Выкл";
  }
}

function updateThemeButton() {
  const current = document.body.getAttribute("data-theme") || "dark";
  dom.themeBtn.classList.add("theme-switch");
  dom.themeBtn.classList.add("active");
  dom.themeBtnMeta.textContent = "Переключение светлой и тёмной темы";
  dom.themeBtnBadge.textContent = current === "light" ? "Светлая" : "Тёмная";
}

function updateSecondaryStat() {
  if (state.isEndless) {
    dom.modeStatLabel.textContent = "Режим";
    dom.modeValue.textContent = "∞";
    dom.modeValue.classList.remove("lives");
  } else {
    dom.modeStatLabel.textContent = "Жизни";
    const hearts = Array.from({ length: Math.max(state.lives, 0) }, () => "❤").join(" ");
    dom.modeValue.textContent = hearts || "—";
    dom.modeValue.classList.add("lives");
  }
}

function initGame() {
  hideAllModals();
  state.gameOver = false;
  state.lives = 3;
  state.selected = null;
  state.notesMode = false;
  state.timerSeconds = 0;
  state.hintsUsedThisGame = 0;
  state.surrendered = false;

  if (state.isEndless && !isCurrentEndlessUnlocked()) {
    state.isEndless = false;
  }

  updateTimerText();
  updateCoins();
  updateNotesButton();
  updateHintMeta();
  updateModeButton();
  updateThemeButton();
  updateSecondaryStat();
  stopTimer();

  const diff = getCurrentDifficulty();
  state.solution = generateSolvedBoard(diff.size);
  state.board = generatePuzzle(state.solution, diff.removeCount, diff.id);
  state.fixed = state.board.map((row) => row.map((value) => value !== ""));
  state.notes = createEmptyNotes(diff.size);

  updateResponsiveCellSize();
  updateBoardTexts();
  renderDifficultyList();
  renderProgress();
  renderBoard();
  renderNumberPad();
  startTimer();
}

function updateBoardTexts() {
  const diff = getCurrentDifficulty();
  const modeText = state.isEndless ? " · бесконечный" : "";
  dom.boardTitle.textContent = `${diff.title} · поле ${diff.size}×${diff.size}${modeText}`;
  dom.boardSubtitle.textContent = state.isEndless
    ? `${diff.description} Без жизней: ошибки считаются после полного заполнения.`
    : diff.description;
}

function updateHintMeta() {
  if (state.hintsUsedThisGame === 0) {
    dom.hintMeta.textContent = "1-я подсказка бесплатно";
  } else {
    dom.hintMeta.textContent = `Следующая подсказка: 25 монет`;
  }
}

function renderDifficultyList() {
  dom.difficultyList.innerHTML = "";

  DIFFICULTIES.forEach((diff, index) => {
    const unlocked = isDifficultyUnlocked(index);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `difficulty-item ${index === state.difficultyIndex ? "active" : ""} ${unlocked ? "" : "locked"}`;
    btn.innerHTML = `
      <div class="difficulty-main">
        <div>
          <div class="difficulty-name">${diff.title}</div>
          <div class="difficulty-meta">${diff.size}×${diff.size}</div>
        </div>
        <div class="difficulty-badge">${unlocked ? `${diff.reward} мон.` : `${getDifficultyProgressText(index)}`}</div>
      </div>
    `;
    btn.addEventListener("click", () => {
      if (!unlocked) return;
      state.difficultyIndex = index;
      if (state.isEndless && !isCurrentEndlessUnlocked()) {
        state.isEndless = false;
      }
      initGame();
    });
    dom.difficultyList.appendChild(btn);
  });
}

function renderProgress() {
  dom.progressList.innerHTML = "";

  DIFFICULTIES.forEach((diff, index) => {
    const item = document.createElement("div");
    const wins = state.progress[diff.id] || 0;
    const unlocked = isDifficultyUnlocked(index);
    const fullyOpened = index === 0 || unlocked;
    const endlessText = wins >= 5 ? "∞ открыт" : `${Math.min(wins, 5)}/5 до ∞`;

    item.className = `progress-item ${wins > 0 ? "done" : ""}`;
    item.innerHTML = `
      <div class="progress-main">
        <div>
          <div class="progress-name">${diff.title}</div>
          <div class="progress-meta">${fullyOpened ? `Побед: ${wins}` : `Нужно открыть`}</div>
        </div>
        <div class="progress-badge">${fullyOpened ? endlessText : `${getDifficultyProgressText(index)}`}</div>
      </div>
    `;
    dom.progressList.appendChild(item);
  });
}

function getCellSectorClass(size, row, col) {
  const sub = SUBGRID_MAP[size];
  const sectorRow = Math.floor(row / sub.rows);
  const sectorCol = Math.floor(col / sub.cols);
  return (sectorRow + sectorCol) % 2 === 0 ? "sector-a" : "sector-b";
}

function isRelatedCell(row, col, selectedRow, selectedCol) {
  const size = state.board.length;
  const bounds = getSubgridBounds(size, selectedRow, selectedCol);

  return (
    row === selectedRow ||
    col === selectedCol ||
    (
      row >= bounds.startRow &&
      row <= bounds.endRow &&
      col >= bounds.startCol &&
      col <= bounds.endCol
    )
  );
}

function renderBoard() {
  const size = state.board.length;
  const sub = SUBGRID_MAP[size];
  const selectedValue = state.selected
    ? state.board[state.selected.row][state.selected.col]
    : "";

  dom.board.innerHTML = "";
  dom.board.style.gridTemplateColumns = `repeat(${size}, var(--cell-size))`;

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      const value = state.board[row][col];
      const cell = document.createElement("div");
      cell.className = `cell ${getCellSectorClass(size, row, col)}`;
      cell.dataset.row = String(row);
      cell.dataset.col = String(col);

      if (row % sub.rows === 0) cell.classList.add("thick-top");
      if (col % sub.cols === 0) cell.classList.add("thick-left");
      if (row === size - 1) cell.classList.add("thick-bottom");
      if (col === size - 1) cell.classList.add("thick-right");

      if (state.fixed[row][col]) {
        cell.classList.add("fixed");
      } else {
        cell.classList.add("editable");
      }

      if (state.selected && row === state.selected.row && col === state.selected.col) {
        cell.classList.add("selected");
      } else if (state.selected && isRelatedCell(row, col, state.selected.row, state.selected.col)) {
        cell.classList.add("related");
      }

      if (
        selectedValue &&
        value &&
        value === selectedValue &&
        (!state.selected || row !== state.selected.row || col !== state.selected.col)
      ) {
        cell.classList.add("same-value");
      }

      if (value) {
        cell.textContent = value;
      } else {
        renderNotesIntoCell(cell, row, col);
      }

      if (state.notesMode && state.selected && row === state.selected.row && col === state.selected.col) {
        cell.classList.add("notes-mode-preview");
      }

      cell.addEventListener("click", () => {
        state.selected = { row, col };
        renderBoard();
      });

      dom.board.appendChild(cell);
    }
  }
}

function renderNotesIntoCell(cell, row, col) {
  const size = state.board.length;
  const notes = Array.from(state.notes[row][col]).sort(
    (a, b) => getSymbols(size).indexOf(a) - getSymbols(size).indexOf(b)
  );

  if (!notes.length) {
    cell.textContent = "";
    return;
  }

  const symbols = getSymbols(size);
  const columns = size === 16 ? 4 : size === 4 ? 2 : 3;

  const notesGrid = document.createElement("div");
  notesGrid.className = "notes-grid";
  notesGrid.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
  notesGrid.style.gridTemplateRows = `repeat(${Math.ceil(symbols.length / columns)}, 1fr)`;

  symbols.forEach((symbol) => {
    const noteEl = document.createElement("span");
    noteEl.className = "note-item";
    noteEl.textContent = notes.includes(symbol) ? symbol : "";
    notesGrid.appendChild(noteEl);
  });

  cell.appendChild(notesGrid);
}

function renderNumberPad() {
  const size = state.board.length;
  const symbols = getSymbols(size);
  dom.numberPad.innerHTML = "";

  dom.numberPad.style.gridTemplateColumns =
    size <= 9
      ? (window.innerWidth < 760 ? "repeat(3, minmax(0, 1fr))" : "repeat(9, minmax(0, 1fr))")
      : (window.innerWidth < 760 ? "repeat(4, minmax(0, 1fr))" : "repeat(8, minmax(0, 1fr))");

  symbols.forEach((symbol) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "number-btn";
    btn.textContent = symbol;

    if (isSymbolCompleted(symbol)) {
      btn.classList.add("completed");
    }

    btn.addEventListener("click", () => handleSymbolInput(symbol));
    dom.numberPad.appendChild(btn);
  });
}

function isSymbolCompleted(symbol) {
  const size = state.board.length;
  let correctCount = 0;

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      if (state.board[row][col] === symbol && state.solution[row][col] === symbol) {
        correctCount += 1;
      }
    }
  }

  return correctCount === size;
}

function updateNotesButton() {
  dom.notesBtn.textContent = `Заметки: ${state.notesMode ? "вкл" : "выкл"}`;
  dom.notesBtn.classList.toggle("active", state.notesMode);
}

function updateTimerText() {
  const minutes = Math.floor(state.timerSeconds / 60);
  const seconds = state.timerSeconds % 60;
  dom.timeValue.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function startTimer() {
  stopTimer();
  state.timerId = setInterval(() => {
    if (!state.gameOver) {
      state.timerSeconds += 1;
      updateTimerText();
    }
  }, 1000);
}

function stopTimer() {
  if (state.timerId) {
    clearInterval(state.timerId);
    state.timerId = null;
  }
}

function updateCoins() {
  dom.coinsValue.textContent = String(state.coins);
  dom.modalCoinsValue.textContent = String(state.coins);
}

function handleSymbolInput(symbol) {
  if (!state.selected || state.gameOver) return;

  const { row, col } = state.selected;
  if (state.fixed[row][col]) {
    renderBoard();
    return;
  }

  if (state.notesMode) {
    toggleNote(row, col, symbol);
    renderBoard();
    return;
  }

  setCellValue(row, col, symbol);
}

function toggleNote(row, col, symbol) {
  if (state.board[row][col] !== "") return;

  const notesSet = state.notes[row][col];
  if (notesSet.has(symbol)) {
    notesSet.delete(symbol);
  } else {
    notesSet.add(symbol);
  }
}

function isBoardFilled() {
  for (let row = 0; row < state.board.length; row += 1) {
    for (let col = 0; col < state.board.length; col += 1) {
      if (state.board[row][col] === "") {
        return false;
      }
    }
  }
  return true;
}

function countBoardErrors() {
  let errors = 0;

  for (let row = 0; row < state.board.length; row += 1) {
    for (let col = 0; col < state.board.length; col += 1) {
      if (state.board[row][col] !== state.solution[row][col]) {
        errors += 1;
      }
    }
  }

  return errors;
}

function checkEndlessCompletion() {
  if (!isBoardFilled()) return;

  const errors = countBoardErrors();

  if (errors === 0) {
    state.gameOver = true;
    stopTimer();
    dom.endlessResultText.textContent = "Поле заполнено без ошибок. Это чистое прохождение бесконечного режима.";
    dom.continueEndlessBtn.classList.add("hidden");
    showModal(dom.endlessResultModal);
    return;
  }

  dom.endlessResultText.textContent = `Поле заполнено. Ошибок: ${errors}. Можешь продолжить исправлять или начать заново.`;
  dom.continueEndlessBtn.classList.remove("hidden");
  showModal(dom.endlessResultModal);
}

function setCellValue(row, col, value) {
  state.notes[row][col].clear();

  if (state.isEndless) {
    state.board[row][col] = value;
    renderBoard();
    renderNumberPad();
    checkEndlessCompletion();
    return;
  }

  if (value === state.solution[row][col]) {
    state.board[row][col] = value;
    renderBoard();
    renderNumberPad();
    checkWin();
    return;
  }

  state.board[row][col] = value;
  renderBoard();
  markCellInvalid(row, col);

  setTimeout(() => {
    if (state.board[row][col] === value && state.solution[row][col] !== value) {
      state.board[row][col] = "";
      renderBoard();
    }
  }, 380);

  state.lives -= 1;
  updateSecondaryStat();
  renderNumberPad();

  if (state.lives <= 0) {
    state.lives = 0;
    updateSecondaryStat();
    loseGame();
  }
}

function markCellInvalid(row, col) {
  const selector = `.cell[data-row="${row}"][data-col="${col}"]`;
  const cell = dom.board.querySelector(selector);
  if (cell) {
    cell.classList.add("invalid");
  }
}

function eraseSelected() {
  if (!state.selected || state.gameOver) return;

  const { row, col } = state.selected;
  if (state.fixed[row][col]) return;

  if (state.notesMode) {
    state.notes[row][col].clear();
  } else {
    state.board[row][col] = "";
    state.notes[row][col].clear();
  }

  renderBoard();
  renderNumberPad();
}

function clearSelectedNotes() {
  if (!state.selected || state.gameOver) return;

  const { row, col } = state.selected;
  if (state.fixed[row][col]) return;

  state.notes[row][col].clear();
  renderBoard();
}

function useHint() {
  if (state.gameOver) return;

  const price = state.hintsUsedThisGame === 0 ? 0 : 25;
  if (price > 0 && state.coins < price) {
    alert("Недостаточно монет для подсказки.");
    return;
  }

  const candidates = [];
  for (let row = 0; row < state.board.length; row += 1) {
    for (let col = 0; col < state.board.length; col += 1) {
      if (state.board[row][col] !== state.solution[row][col]) {
        candidates.push({ row, col });
      }
    }
  }

  if (!candidates.length) return;

  const target = shuffle(candidates)[0];
  const { row, col } = target;

  if (price > 0) {
    state.coins -= price;
    saveCoins();
    updateCoins();
  }

  state.board[row][col] = state.solution[row][col];
  state.notes[row][col].clear();
  state.selected = { row, col };
  state.hintsUsedThisGame += 1;
  updateHintMeta();
  renderBoard();
  renderNumberPad();

  if (state.isEndless) {
    checkEndlessCompletion();
  } else {
    checkWin();
  }
}

function surrenderGame() {
  if (state.gameOver) return;

  state.surrendered = true;
  state.gameOver = true;
  stopTimer();

  state.board = deepCopyGrid(state.solution);
  state.notes = createEmptyNotes(state.board.length);
  renderBoard();
  renderNumberPad();

  dom.overlay.classList.add("hidden");
  dom.surrenderModal.classList.remove("hidden");
}

function loseGame() {
  state.gameOver = true;
  stopTimer();
  showModal(dom.gameOverModal);
}

function checkWin() {
  const size = state.board.length;

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      if (state.board[row][col] !== state.solution[row][col]) {
        return;
      }
    }
  }

  const diff = getCurrentDifficulty();
  state.progress[diff.id] = (state.progress[diff.id] || 0) + 1;
  saveProgress();

  state.coins += diff.reward;
  saveCoins();
  updateCoins();
  renderProgress();
  renderDifficultyList();
  updateModeButton();

  state.gameOver = true;
  stopTimer();

  const winsOnCurrent = state.progress[diff.id] || 0;
  const nextIndex = Math.min(state.difficultyIndex + 1, DIFFICULTIES.length - 1);
  const hasNext = nextIndex > state.difficultyIndex;
  const nextUnlocked = hasNext ? isDifficultyUnlocked(nextIndex) : false;

  dom.winText.textContent =
    `Сложность «${diff.title}» пройдена. Получено ${diff.reward} монет. Побед на этом уровне: ${winsOnCurrent}.`;

  if (hasNext && nextUnlocked && winsOnCurrent >= 5) {
    dom.nextDifficultyBtn.textContent = "Открыть следующий уровень";
    dom.nextDifficultyBtn.classList.remove("hidden");
    dom.restartAfterWinBtn.classList.add("hidden");
  } else {
    dom.nextDifficultyBtn.classList.add("hidden");
    dom.restartAfterWinBtn.classList.remove("hidden");
    dom.restartAfterWinBtn.textContent = "Играть снова";
  }

  showModal(dom.winModal);
}

function showModal(modal) {
  if (modal === dom.surrenderModal) {
    dom.overlay.classList.add("hidden");
  } else {
    dom.overlay.classList.remove("hidden");
  }

  modal.classList.remove("hidden");
}

function hideAllModals() {
  dom.overlay.classList.add("hidden");
  dom.gameOverModal.classList.add("hidden");
  dom.winModal.classList.add("hidden");
  dom.surrenderModal.classList.add("hidden");
  dom.endlessResultModal.classList.add("hidden");
}

function buyLife() {
  if (state.coins < 50) {
    alert("Недостаточно монет.");
    return;
  }

  state.coins -= 50;
  state.lives += 1;
  saveCoins();
  updateCoins();
  updateSecondaryStat();
  state.gameOver = false;
  hideAllModals();
  startTimer();
}

function goToNextDifficulty() {
  const nextIndex = Math.min(state.difficultyIndex + 1, DIFFICULTIES.length - 1);
  if (isDifficultyUnlocked(nextIndex) && nextIndex !== state.difficultyIndex) {
    state.difficultyIndex = nextIndex;
  }
  state.isEndless = false;
  initGame();
}

function toggleGameMode() {
  if (!isCurrentEndlessUnlocked()) {
    const diff = getCurrentDifficulty();
    alert(`Бесконечный режим для сложности «${diff.title}» откроется после 5 побед на ней.`);
    return;
  }

  state.isEndless = !state.isEndless;
  initGame();
}

function continueEndlessEditing() {
  hideAllModals();
  state.gameOver = false;
}

function applyTheme(theme) {
  document.body.setAttribute("data-theme", theme);
  localStorage.setItem("sudoku_theme", theme);
  updateThemeButton();
}

function initTheme() {
  const saved = localStorage.getItem("sudoku_theme") || "dark";
  applyTheme(saved);
}

function bindEvents() {
  dom.notesBtn.addEventListener("click", () => {
    state.notesMode = !state.notesMode;
    updateNotesButton();
    renderBoard();
  });

  dom.newGameBtn.addEventListener("click", initGame);
  dom.modeBtn.addEventListener("click", toggleGameMode);
  dom.themeBtn.addEventListener("click", () => {
    const current = document.body.getAttribute("data-theme") || "dark";
    applyTheme(current === "light" ? "dark" : "light");
  });

  dom.eraseBtn.addEventListener("click", eraseSelected);
  dom.clearNotesBtn.addEventListener("click", clearSelectedNotes);
  dom.hintBtn.addEventListener("click", useHint);
  dom.surrenderBtn.addEventListener("click", surrenderGame);

  dom.buyLifeBtn.addEventListener("click", buyLife);
  dom.restartFromLoseBtn.addEventListener("click", initGame);
  dom.nextDifficultyBtn.addEventListener("click", goToNextDifficulty);
  dom.restartAfterWinBtn.addEventListener("click", initGame);
  dom.restartAfterSurrenderBtn.addEventListener("click", initGame);
  dom.continueEndlessBtn.addEventListener("click", continueEndlessEditing);
  dom.restartAfterEndlessBtn.addEventListener("click", initGame);

  document.addEventListener("keydown", (event) => {
    if (event.key.toLowerCase() === "n") {
      state.notesMode = !state.notesMode;
      updateNotesButton();
      renderBoard();
      return;
    }

    if (event.key === "Backspace" || event.key === "Delete") {
      eraseSelected();
      return;
    }

    const size = state.board.length;
    const symbols = getSymbols(size);
    const key = event.key.toUpperCase();

    if (symbols.includes(key)) {
      handleSymbolInput(key);
    }
  });

  window.addEventListener("resize", () => {
    updateResponsiveCellSize();
    renderBoard();
    renderNumberPad();
  });
}

initTheme();
bindEvents();
initGame();