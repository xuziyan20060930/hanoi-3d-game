// =========================================
// === DATA STRUCTURES & STATE MANAGEMENT ===
// =========================================
const gameState = {
    disksCount: 4,
    pegs: [[], [], []], // Using arrays as stacks
    moves: 0,
    isAutoSolving: false,
    selectedPegIndex: null,
};

// =========================================
// === DOM ELEMENT REFERENCES ===
// =========================================
const dom = {
    diskCountInput: document.getElementById('diskCount'),
    movesCountDisplay: document.getElementById('movesCount'),
    gameBoard: document.getElementById('gameBoard'),
    messageArea: document.getElementById('messageArea'),
    resetBtn: document.getElementById('resetBtn'),
    autoSolveBtn: document.getElementById('autoSolveBtn'),
};

// =========================================
// === INITIALIZATION & RENDERING ===
// =========================================
function initGame(disksCount) {
    if (gameState.isAutoSolving) return;
    
    gameState.disksCount = parseInt(disksCount);
    gameState.moves = 0;
    gameState.selectedPegIndex = null;
    
    // FR-02: Reset pegs. Largest at bottom (index 0 of array).
    gameState.pegs = [
        Array.from({ length: gameState.disksCount }, (_, i) => i + 1), // e.g., [4, 3, 2, 1]
        [],
        []
    ];

    render();
    updateMessage("Game started! Select a disk to move.");
}

function render() {
    // Clear existing disks from DOM
    document.querySelectorAll('.disk').forEach(d => d.remove());

    // Render pegs and disks
    const pegElements = document.querySelectorAll('.peg-container');
    pegElements.forEach((pegEl, index) => {
        const pegData = gameState.pegs[index];
        // FR-03: Render disks based on array data
        pegData.forEach((diskSize, stackIndex) => {
            const diskEl = createDiskElement(diskSize);
            // Position disk vertically based on its stack index
            diskEl.style.bottom = `${40 + (stackIndex * 30)}px`;
            pegEl.appendChild(diskEl);
        });
    });

    // Update move counter
    dom.movesCountDisplay.textContent = gameState.moves;
}

function createDiskElement(size) {
    const disk = document.createElement('div');
    disk.className = 'disk';
    disk.dataset.size = size;
    
    // FR-03: Width proportional to size
    const minWidth = 60;
    const maxWidth = 180;
    const width = minWidth + ((size - 1) / (gameState.disksCount - 1)) * (maxWidth - minWidth);
    disk.style.width = `${width}px`;

    // Rainbow colors
    const hue = (size / gameState.disksCount) * 360;
    disk.style.background = `linear-gradient(180deg, hsl(${hue}, 80%, 60%), hsl(${hue}, 80%, 40%))`;
    disk.textContent = size; // Show size for debugging/clarity

    return disk;
}

// =========================================
// === EVENT HANDLING (FR-04, FR-05) ===
// =========================================
function handlePegClick(pegIndex) {
    if (gameState.isAutoSolving) return;

    // If no peg is selected, try to select the top disk of this peg
    if (gameState.selectedPegIndex === null) {
        if (gameState.pegs[pegIndex].length === 0) {
            updateMessage("This peg is empty!", true);
            return;
        }
        gameState.selectedPegIndex = pegIndex;
        highlightDisk(pegIndex, true);
        updateMessage(`Selected disk ${gameState.pegs[pegIndex][gameState.pegs[pegIndex].length - 1]}. Now click a destination peg.`);
    
    // If a peg IS selected, try to move the disk there
    } else {
        const fromPeg = gameState.selectedPegIndex;
        const toPeg = pegIndex;

        // FR-05: Validate move
        if (isValidMove(fromPeg, toPeg)) {
            executeMove(fromPeg, toPeg);
            render(); // Re-render after successful move
            checkWin();
        } else {
            // Invalid move feedback
            updateMessage(`⚠️ Cannot place a larger disk on a smaller one!`, true);
            shakeElement(dom.gameBoard.children[toPeg]);
        }
        
        // Deselect after attempting a move
        highlightDisk(gameState.selectedPegIndex, false);
        gameState.selectedPegIndex = null;
    }
}

function isValidMove(from, to) {
    const fromTopDisk = gameState.pegs[from][gameState.pegs[from].length - 1];
    const toTopDisk = gameState.pegs[to][gameState.pegs[to].length - 1];

    // A move is valid if the destination peg is empty OR the moving disk is smaller than the destination's top disk.
    return toTopDisk === undefined || fromTopDisk < toTopDisk;
}

function executeMove(from, to) {
    // FR-10: Increment move counter only for valid moves
    gameState.moves++;
    
    // FR-01: Use array methods push/pop to simulate stack behavior
    const disk = gameState.pegs[from].pop();
    gameState.pegs[to].push(disk);
    
    updateMessage(`Moved disk ${disk} from Peg ${String.fromCharCode(65 + from)} to Peg ${String.fromCharCode(65 + to)}.`);
}

// =========================================
// === AUTO-SOLVE LOGIC (FR-07) ===
// =========================================
let autoSolveSteps = [];

function generateAutoSolveSteps(n, from, aux, to) {
    if (n === 1) {
        autoSolveSteps.push({ from, to });
        return;
    }
    generateAutoSolveSteps(n - 1, from, to, aux);
    autoSolveSteps.push({ from, to });
    generateAutoSolveSteps(n - 1, aux, from, to);
}

async function startAutoSolve() {
    if (gameState.isAutoSolving) return;
    
    gameState.isAutoSolving = true;
    dom.autoSolveBtn.disabled = true;
    dom.diskCountInput.disabled = true;
    updateMessage("Auto-solving... please watch.");

    autoSolveSteps = [];
    // Generate the sequence of moves
    generateAutoSolveSteps(gameState.disksCount, 0, 1, 2);

    // Execute moves with a delay
    for (const step of autoSolveSteps) {
        await sleep(700); // Delay for visualization
        if (!gameState.isAutoSolving) break; // Allow cancellation
        
        executeMove(step.from, step.to);
        render();
    }

    if (gameState.isAutoSolving) { // Check if it wasn't cancelled
        checkWin(true); // Pass flag to indicate auto-solve completion
    }

    gameState.isAutoSolving = false;
    dom.autoSolveBtn.disabled = false;
    dom.diskCountInput.disabled = false;
}

function cancelAutoSolve() {
    gameState.isAutoSolving = false;
}

// =========================================
// === HELPER FUNCTIONS ===
// =========================================
function updateMessage(text, isWarning = false) {
    dom.messageArea.textContent = text;
    dom.messageArea.classList.toggle('warning-text', isWarning);
    if (isWarning) {
        dom.messageArea.classList.add('shake');
        setTimeout(() => dom.messageArea.classList.remove('shake'), 400);
    }
}

function highlightDisk(pegIndex, isSelected) {
    const pegEl = dom.gameBoard.children[pegIndex];
    const topDisk = pegEl.querySelector('.disk:last-child');
    if (topDisk) topDisk.classList.toggle('selected', isSelected);
}

function shakeElement(element) {
    element.classList.add('shake');
    setTimeout(() => element.classList.remove('shake'), 400);
}

function checkWin(isAutoSolveEnd = false) {
    // FR-06: Win detection
    if (gameState.pegs[2].length === gameState.disksCount) {
        const winText = `🎉 Victory in ${gameState.moves} moves! 🎉`;
        dom.messageArea.innerHTML = `<span class="win-message">${winText}</span>`;
        
        if (!isAutoSolveEnd) { // Only disable if player won manually
            // Disable further interaction
            gameState.isAutoSolving = true; // Use this flag to block clicks
        }
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// =========================================
// === EVENT LISTENERS SETUP ===
// =========================================
dom.diskCountInput.addEventListener('change', () => initGame(dom.diskCountInput.value));
dom.resetBtn.addEventListener('click', () => initGame(dom.diskCountInput.value));
dom.autoSolveBtn.addEventListener('click', startAutoSolve);

// Delegate clicks on the game board to the pegs
dom.gameBoard.addEventListener('click', (e) => {
    const pegContainer = e.target.closest('.peg-container');
    if (pegContainer) {
        const pegIndex = Array.from(dom.gameBoard.children).indexOf(pegContainer);
        handlePegClick(pegIndex);
    }
});

// Initial setup on page load
window.onload = () => {
    // Create peg structure dynamically
    ['A', 'B', 'C'].forEach((label, index) => {
        const pegDiv = document.createElement('div');
        pegDiv.className = 'peg-container';
        pegDiv.innerHTML = `
            <div class="peg-rod"></div>
            <div class="peg-base"></div>
            <span class="peg-label">${label}</span>
        `;
        dom.gameBoard.appendChild(pegDiv);
    });
    initGame(dom.diskCountInput.value);
};