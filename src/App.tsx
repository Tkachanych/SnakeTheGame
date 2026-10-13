import { useRef, useCallback, useEffect } from 'react';
import { useSnakeGame, Direction } from './hooks/useSnakeGame';

function App() {
  const {
    snake,
    food,
    gameState,
    score,
    highScore,
    difficulty,
    lastEaten,
    gridSize,
    startGame,
    togglePause,
    changeDirection,
    changeDifficulty,
  } = useSnakeGame();

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Touch controls
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStartRef.current) return;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStartRef.current.x;
      const dy = touch.clientY - touchStartRef.current.y;
      const minSwipe = 30;

      if (Math.abs(dx) < minSwipe && Math.abs(dy) < minSwipe) {
        // Tap - toggle pause or start
        if (gameState === 'idle' || gameState === 'gameover') {
          startGame();
        } else {
          togglePause();
        }
        return;
      }

      if (gameState !== 'playing') return;

      let direction: Direction;
      if (Math.abs(dx) > Math.abs(dy)) {
        direction = dx > 0 ? 'RIGHT' : 'LEFT';
      } else {
        direction = dy > 0 ? 'DOWN' : 'UP';
      }
      changeDirection(direction);
      touchStartRef.current = null;
    },
    [gameState, startGame, togglePause, changeDirection]
  );

  // Canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const container = containerRef.current;
    if (!container) return;

    const size = Math.min(container.clientWidth, container.clientHeight, 500);
    const cellSize = size / gridSize;
    canvas.width = size;
    canvas.height = size;

    // Clear
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, size, size);

    // Draw grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= gridSize; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellSize, 0);
      ctx.lineTo(i * cellSize, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * cellSize);
      ctx.lineTo(size, i * cellSize);
      ctx.stroke();
    }

    // Draw food with glow
    const foodX = food.x * cellSize + cellSize / 2;
    const foodY = food.y * cellSize + cellSize / 2;
    const foodRadius = cellSize * 0.4;

    // Food glow
    const glowGradient = ctx.createRadialGradient(foodX, foodY, 0, foodX, foodY, cellSize);
    glowGradient.addColorStop(0, 'rgba(255, 80, 80, 0.4)');
    glowGradient.addColorStop(1, 'rgba(255, 80, 80, 0)');
    ctx.fillStyle = glowGradient;
    ctx.fillRect(food.x * cellSize - cellSize / 2, food.y * cellSize - cellSize / 2, cellSize * 2, cellSize * 2);

    // Food body
    const foodGradient = ctx.createRadialGradient(
      foodX - foodRadius * 0.3,
      foodY - foodRadius * 0.3,
      0,
      foodX,
      foodY,
      foodRadius
    );
    foodGradient.addColorStop(0, '#ff6b6b');
    foodGradient.addColorStop(1, '#ee5a24');
    ctx.fillStyle = foodGradient;
    ctx.beginPath();
    ctx.arc(foodX, foodY, foodRadius, 0, Math.PI * 2);
    ctx.fill();

    // Draw snake
    snake.forEach((segment, index) => {
      const x = segment.x * cellSize;
      const y = segment.y * cellSize;
      const padding = 1;

      if (index === 0) {
        // Head
        const headGradient = ctx.createLinearGradient(x, y, x + cellSize, y + cellSize);
        headGradient.addColorStop(0, '#00d2ff');
        headGradient.addColorStop(1, '#3a7bd5');
        ctx.fillStyle = headGradient;
        ctx.shadowColor = '#00d2ff';
        ctx.shadowBlur = 8;
        roundRect(ctx, x + padding, y + padding, cellSize - padding * 2, cellSize - padding * 2, 4);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Eyes
        const eyeSize = cellSize * 0.12;
        ctx.fillStyle = '#fff';
        const eyeOffset = cellSize * 0.25;
        ctx.beginPath();
        ctx.arc(x + cellSize / 2 - eyeOffset, y + cellSize / 2 - eyeOffset * 0.3, eyeSize, 0, Math.PI * 2);
        ctx.arc(x + cellSize / 2 + eyeOffset, y + cellSize / 2 - eyeOffset * 0.3, eyeSize, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Body
        const progress = index / snake.length;
        const hue = 180 + progress * 40;
        const lightness = 55 - progress * 15;
        ctx.fillStyle = `hsl(${hue}, 80%, ${lightness}%)`;
        ctx.shadowColor = `hsl(${hue}, 80%, ${lightness}%)`;
        ctx.shadowBlur = 3;
        roundRect(ctx, x + padding, y + padding, cellSize - padding * 2, cellSize - padding * 2, 3);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    });

    // Draw "eat" flash effect
    if (Date.now() - lastEaten < 200) {
      ctx.fillStyle = 'rgba(0, 210, 255, 0.05)';
      ctx.fillRect(0, 0, size, size);
    }
  }, [snake, food, gridSize, lastEaten]);

  // Responsive canvas resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      const size = Math.min(container.clientWidth, container.clientHeight, 500);
      canvas.width = size;
      canvas.height = size;
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const difficultyLabel = {
    easy: 'Лёгкий',
    medium: 'Средний',
    hard: 'Сложный',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-indigo-950 flex flex-col items-center justify-center p-4 select-none overflow-hidden">
      {/* Header */}
      <div className="w-full max-w-lg mb-4">
        <h1 className="text-3xl md:text-4xl font-bold text-center bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
          🐍 Змейка
        </h1>
        <p className="text-center text-gray-400 text-sm mt-1">Классическая аркадная игра</p>
      </div>

      {/* Score Board */}
      <div className="flex items-center justify-between w-full max-w-lg mb-3 px-2">
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="text-xs text-gray-400 uppercase tracking-wider">Счёт</div>
            <div className="text-2xl font-bold text-cyan-400">{score}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-400 uppercase tracking-wider">Рекорд</div>
            <div className="text-2xl font-bold text-yellow-400">{highScore}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Сложность:</span>
          <div className="flex gap-1">
            {(['easy', 'medium', 'hard'] as const).map((diff) => (
              <button
                key={diff}
                onClick={() => changeDifficulty(diff)}
                className={`px-2 py-1 rounded text-xs font-medium transition-all duration-200 ${
                  difficulty === diff
                    ? diff === 'easy'
                      ? 'bg-green-500/20 text-green-400 ring-1 ring-green-500/50'
                      : diff === 'medium'
                      ? 'bg-yellow-500/20 text-yellow-400 ring-1 ring-yellow-500/50'
                      : 'bg-red-500/20 text-red-400 ring-1 ring-red-500/50'
                    : 'bg-gray-800/50 text-gray-500 hover:text-gray-300'
                }`}
              >
                {difficultyLabel[diff]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Game Area */}
      <div
        ref={containerRef}
        className="relative w-full max-w-lg aspect-square flex items-center justify-center"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="relative rounded-xl overflow-hidden shadow-2xl shadow-cyan-500/10 border border-gray-700/50">
          <canvas ref={canvasRef} className="block" />

          {/* Overlay for idle state */}
          {gameState === 'idle' && (
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center animate-fade-in">
              <div className="text-6xl mb-4 animate-bounce">🐍</div>
              <h2 className="text-2xl font-bold text-white mb-2">Готовы играть?</h2>
              <p className="text-gray-300 text-sm mb-6 text-center px-4">
                Управление: WASD / Стрелки / Свайпы
              </p>
              <button
                onClick={startGame}
                className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold rounded-lg shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 hover:scale-105 transition-all duration-200"
              >
                Начать игру
              </button>
              <p className="text-gray-500 text-xs mt-4">или нажмите Пробел / Enter</p>
            </div>
          )}

          {/* Overlay for paused state */}
          {gameState === 'paused' && (
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center animate-fade-in">
              <div className="text-5xl mb-4">⏸️</div>
              <h2 className="text-2xl font-bold text-white mb-2">Пауза</h2>
              <button
                onClick={togglePause}
                className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-lg shadow-lg shadow-green-500/30 hover:shadow-green-500/50 hover:scale-105 transition-all duration-200"
              >
                Продолжить
              </button>
              <p className="text-gray-500 text-xs mt-4">или нажмите Пробел / Esc</p>
            </div>
          )}

          {/* Overlay for game over state */}
          {gameState === 'gameover' && (
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center animate-fade-in">
              <div className="text-5xl mb-4">💀</div>
              <h2 className="text-2xl font-bold text-red-400 mb-2">Игра окончена!</h2>
              <p className="text-3xl font-bold text-white mb-1">{score} очков</p>
              {score >= highScore && score > 0 && (
                <p className="text-yellow-400 text-sm mb-4 animate-pulse">🏆 Новый рекорд!</p>
              )}
              <button
                onClick={startGame}
                className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold rounded-lg shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 hover:scale-105 transition-all duration-200 mt-2"
              >
                Играть снова
              </button>
              <p className="text-gray-500 text-xs mt-4">или нажмите Пробел / Enter</p>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="w-full max-w-lg mt-4 flex flex-col items-center gap-3">
        {/* Action buttons */}
        <div className="flex gap-3">
          {gameState === 'playing' && (
            <button
              onClick={togglePause}
              className="px-5 py-2 bg-gray-800/80 text-gray-300 font-medium rounded-lg border border-gray-700/50 hover:bg-gray-700/80 hover:text-white transition-all duration-200"
            >
              ⏸ Пауза
            </button>
          )}
          {(gameState === 'playing' || gameState === 'paused') && (
            <button
              onClick={startGame}
              className="px-5 py-2 bg-gray-800/80 text-gray-300 font-medium rounded-lg border border-gray-700/50 hover:bg-gray-700/80 hover:text-white transition-all duration-200"
            >
              🔄 Заново
            </button>
          )}
        </div>

        {/* Mobile D-pad */}
        <div className="md:hidden grid grid-cols-3 gap-1 w-36 h-36 mt-2">
          <div></div>
          <button
            onTouchStart={(e) => {
              e.preventDefault();
              if (gameState === 'playing') changeDirection('UP');
            }}
            className="bg-gray-800/80 rounded-lg flex items-center justify-center text-2xl text-gray-300 active:bg-cyan-600/30 active:text-cyan-300 border border-gray-700/50 transition-colors"
          >
            ▲
          </button>
          <div></div>
          <button
            onTouchStart={(e) => {
              e.preventDefault();
              if (gameState === 'playing') changeDirection('LEFT');
            }}
            className="bg-gray-800/80 rounded-lg flex items-center justify-center text-2xl text-gray-300 active:bg-cyan-600/30 active:text-cyan-300 border border-gray-700/50 transition-colors"
          >
            ◀
          </button>
          <button
            onTouchStart={(e) => {
              e.preventDefault();
              if (gameState === 'playing') changeDirection('DOWN');
            }}
            className="bg-gray-800/80 rounded-lg flex items-center justify-center text-2xl text-gray-300 active:bg-cyan-600/30 active:text-cyan-300 border border-gray-700/50 transition-colors"
          >
            ▼
          </button>
          <button
            onTouchStart={(e) => {
              e.preventDefault();
              if (gameState === 'playing') changeDirection('RIGHT');
            }}
            className="bg-gray-800/80 rounded-lg flex items-center justify-center text-2xl text-gray-300 active:bg-cyan-600/30 active:text-cyan-300 border border-gray-700/50 transition-colors"
          >
            ▶
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 text-center text-gray-600 text-xs">
        <p className="hidden md:block">WASD / Стрелки — управление • Пробел — пауза</p>
        <p className="md:hidden">Свайп или кнопки — управление • Тап — пауза</p>
      </div>
    </div>
  );
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export default App;
