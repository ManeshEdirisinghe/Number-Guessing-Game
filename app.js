let currentLevel = '';
let secretNumber = 0;
let attemptsRemaining = 0;
let maxNumber = 0;
let guessHistory = [];
let bestScores = {
    beginner: null,
    medium: null,
    hard: null
};

const levelConfig = {
    beginner: { max: 50, attempts: 10, title: '🌱 Beginner Mode' },
    medium: { max: 100, attempts: 7, title: '⚡ Medium Mode' },
    hard: { max: 200, attempts: 5, title: '🔥 Hard Mode' }
};

// Audio Context for sound effects
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    if (type === 'win') {
        // Victory fanfare
        const notes = [523.25, 659.25, 783.99, 1046.50];
        let time = audioContext.currentTime;
        notes.forEach((freq, i) => {
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            osc.connect(gain);
            gain.connect(audioContext.destination);
            osc.frequency.value = freq;
            osc.type = 'sine';
            gain.gain.setValueAtTime(0.3, time);
            gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);
            osc.start(time + i * 0.15);
            osc.stop(time + i * 0.15 + 0.3);
        });
    } else if (type === 'low') {
        // Gentle, encouraging tone - "you've got this"
        oscillator.frequency.value = 220;
        oscillator.type = 'triangle';
        gainNode.gain.setValueAtTime(0.25, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.8);
    } else if (type === 'high') {
        // Bright, celebratory chime - achievement unlocked
        const now = audioContext.currentTime;

        // Play a pleasing chord progression
        oscillator.frequency.value = 523.25; // C5
        oscillator.type = 'sine';

        // Second harmonic for richness
        const osc2 = audioContext.createOscillator();
        const gain2 = audioContext.createGain();
        osc2.connect(gain2);
        gain2.connect(audioContext.destination);
        osc2.frequency.value = 659.25; // E5
        osc2.type = 'sine';

        // Bright, uplifting envelope
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
        gain2.gain.setValueAtTime(0.2, now);
        gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.6);

        oscillator.start();
        osc2.start();
        oscillator.stop(now + 0.6);
        osc2.stop(now + 0.6);
    } else if (type === 'lose') {
        // Empathetic "aw" sound - supportive, not harsh
        const now = audioContext.currentTime;
        oscillator.frequency.setValueAtTime(400, now);
        oscillator.frequency.exponentialRampToValueAtTime(150, now + 0.6);
        oscillator.type = 'sine'; // Softer than sawtooth
        gainNode.gain.setValueAtTime(0.25, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
        oscillator.start();
        oscillator.stop(now + 0.7);
    }
}

// Confetti animation
function createConfetti() {
    const canvas = document.getElementById('confettiCanvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const confettiPieces = [];
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f7dc6f', '#bb8fce', '#52de97'];

    for (let i = 0; i < 150; i++) {
        confettiPieces.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height - canvas.height,
            size: Math.random() * 10 + 5,
            speedY: Math.random() * 3 + 2,
            speedX: Math.random() * 2 - 1,
            color: colors[Math.floor(Math.random() * colors.length)],
            rotation: Math.random() * 360,
            rotationSpeed: Math.random() * 5 - 2.5
        });
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        confettiPieces.forEach((piece, index) => {
            ctx.save();
            ctx.translate(piece.x, piece.y);
            ctx.rotate(piece.rotation * Math.PI / 180);
            ctx.fillStyle = piece.color;
            ctx.fillRect(-piece.size / 2, -piece.size / 2, piece.size, piece.size);
            ctx.restore();

            piece.y += piece.speedY;
            piece.x += piece.speedX;
            piece.rotation += piece.rotationSpeed;

            if (piece.y > canvas.height) {
                confettiPieces.splice(index, 1);
            }
        });

        if (confettiPieces.length > 0) {
            requestAnimationFrame(animate);
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }

    animate();
}

// Theme toggle
function toggleTheme() {
    const body = document.body;
    const themeToggle = document.getElementById('themeToggle');

    if (body.getAttribute('data-theme') === 'dark') {
        body.removeAttribute('data-theme');
        themeToggle.textContent = '🌙';
    } else {
        body.setAttribute('data-theme', 'dark');
        themeToggle.textContent = '☀️';
    }
}

function startGame(level) {
    currentLevel = level;
    const config = levelConfig[level];

    maxNumber = config.max;
    attemptsRemaining = config.attempts;
    secretNumber = Math.floor(Math.random() * maxNumber) + 1;
    guessHistory = [];

    document.getElementById('menuScreen').style.display = 'none';
    document.getElementById('gameScreen').classList.add('active');
    document.getElementById('levelTitle').textContent = config.title;
    document.getElementById('rangeDisplay').textContent = `Guess between 1-${maxNumber}`;
    document.getElementById('attemptsLeft').textContent = attemptsRemaining;
    document.getElementById('bestScore').textContent = bestScores[level] || '-';
    document.getElementById('guessInput').max = maxNumber;
    document.getElementById('guessInput').value = '';
    document.getElementById('message').style.display = 'none';
    document.getElementById('historyArea').style.display = 'none';
    document.getElementById('guessInput').disabled = false;
    document.getElementById('guessInput').focus();
}

function makeGuess() {
    const guessInput = document.getElementById('guessInput');
    const guess = parseInt(guessInput.value);
    const messageDiv = document.getElementById('message');

    if (isNaN(guess) || guess < 1 || guess > maxNumber) {
        messageDiv.textContent = `⚠️ Please enter a number between 1 and ${maxNumber}`;
        messageDiv.className = 'message';
        messageDiv.style.display = 'flex';
        return;
    }

    if (guessHistory.includes(guess)) {
        messageDiv.textContent = '🔁 You already tried that number!';
        messageDiv.className = 'message';
        messageDiv.style.display = 'flex';
        return;
    }

    guessHistory.push(guess);
    attemptsRemaining--;

    document.getElementById('attemptsLeft').textContent = attemptsRemaining;
    updateHistory();

    if (guess === secretNumber) {
        const score = levelConfig[currentLevel].attempts - attemptsRemaining;
        if (!bestScores[currentLevel] || score < bestScores[currentLevel]) {
            bestScores[currentLevel] = score;
            document.getElementById('bestScore').textContent = score;
        }
        messageDiv.textContent = `🎉 PERFECT! You won in ${guessHistory.length} ${guessHistory.length === 1 ? 'try' : 'tries'}! 🏆`;
        messageDiv.className = 'message correct';
        messageDiv.style.display = 'flex';
        guessInput.disabled = true;

        // Victory effects
        playSound('win');
        createConfetti();
    } else if (attemptsRemaining === 0) {
        messageDiv.textContent = `💔 Game Over! The number was ${secretNumber}`;
        messageDiv.className = 'message';
        messageDiv.style.display = 'flex';
        guessInput.disabled = true;
        playSound('lose');
    } else if (guess > secretNumber) {
        messageDiv.textContent = `📉 Too High! ${attemptsRemaining} ${attemptsRemaining === 1 ? 'try' : 'tries'} left`;
        messageDiv.className = 'message too-high';
        messageDiv.style.display = 'flex';
        playSound('high');
    } else {
        messageDiv.textContent = `📈 Too Low! ${attemptsRemaining} ${attemptsRemaining === 1 ? 'try' : 'tries'} left`;
        messageDiv.className = 'message too-low';
        messageDiv.style.display = 'flex';
        playSound('low');
    }

    guessInput.value = '';
    guessInput.focus();
}

function updateHistory() {
    const historyArea = document.getElementById('historyArea');
    const historyList = document.getElementById('historyList');

    historyArea.style.display = 'block';
    historyList.innerHTML = guessHistory.map(g =>
        `<span class="history-item">${g}</span>`
    ).join('');
}

function resetGame() {
    document.getElementById('guessInput').disabled = false;
    startGame(currentLevel);
}

function backToMenu() {
    document.getElementById('gameScreen').classList.remove('active');
    document.getElementById('menuScreen').style.display = 'block';
}

document.getElementById('guessInput').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        makeGuess();
    }
});

// Handle window resize for confetti canvas
window.addEventListener('resize', () => {
    const canvas = document.getElementById('confettiCanvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});