import { useState, useCallback, useEffect, useRef } from 'react';

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
export type Position = { x: number; y: number };
export type Difficulty = 'easy' | 'medium' | 'hard';
export type GameState = 'idle' | 'playing' | 'paused' | 'gameover';

const GRID_SIZE = 20;

const SPEED_MAP: Record<Difficulty, number> = {
  easy: 180,
  medium: 120,
  hard: 70,
};

const getInitialSnake = (): Position[] => [
  { x: 10, y: 10 },
  { x: 9, y: 10 },
  { x: 8, y: 10 },
];

const getRandomFood = (snake: Position[]): Position => {
  let food: Position;
  do {
    food = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
  } while (snake.some((seg) => seg.x === food.x && seg.y === food.y));
  return food;
};

const getOppositeDirection = (dir: Direction): Direction => {
  const opposites: Record<Direction, Direction> = {
    UP: 'DOWN',
    DOWN: 'UP',
    LEFT: 'RIGHT',
    RIGHT: 'LEFT',
  };
  return opposites[dir];
};

export function useSnakeGame() {
  const [snake, setSnake] = useState<Position[]>(getInitialSnake());
  const [food, setFood] = useState<Position>(() => getRandomFood(getInitialSnake()));
  const [direction, setDirection] = useState<Direction>('RIGHT');
  const [gameState, setGameState] = useState<GameState>('idle');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('snake-high-score');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [lastEaten, setLastEaten] = useState<number>(0);

  const directionRef = useRef<Direction>(direction);
  const nextDirectionRef = useRef<Direction | null>(null);
  const gameStateRef = useRef<GameState>(gameState);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    directionRef.current = direction;
  }, [direction]);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  const clearGameLoop = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const moveSnake = useCallback(() => {
    if (gameStateRef.current !== 'playing') return;

    setSnake((prevSnake) => {
      const currentDirection = nextDirectionRef.current || directionRef.current;
      if (nextDirectionRef.current) {
        setDirection(nextDirectionRef.current);
        nextDirectionRef.current = null;
      }

      const head = prevSnake[0];
      let newHead: Position;

      switch (currentDirection) {
        case 'UP':
          newHead = { x: head.x, y: head.y - 1 };
          break;
        case 'DOWN':
          newHead = { x: head.x, y: head.y + 1 };
          break;
        case 'LEFT':
          newHead = { x: head.x - 1, y: head.y };
          break;
        case 'RIGHT':
          newHead = { x: head.x + 1, y: head.y };
          break;
      }

      // Check wall collision
      if (
        newHead.x < 0 ||
        newHead.x >= GRID_SIZE ||
        newHead.y < 0 ||
        newHead.y >= GRID_SIZE
      ) {
        setGameState('gameover');
        return prevSnake;
      }

      // Check self collision
      if (prevSnake.some((seg) => seg.x === newHead.x && seg.y === newHead.y)) {
        setGameState('gameover');
        return prevSnake;
      }

      const newSnake = [newHead, ...prevSnake];

      // Check food collision
      setFood((prevFood) => {
        if (newHead.x === prevFood.x && newHead.y === prevFood.y) {
          setScore((prev) => {
            const newScore = prev + 10;
            setHighScore((prevHigh) => {
              if (newScore > prevHigh) {
                localStorage.setItem('snake-high-score', String(newScore));
                return newScore;
              }
              return prevHigh;
            });
            return newScore;
          });
          setLastEaten(Date.now());
          const nextFood = getRandomFood(newSnake);
          return nextFood;
        }
        // Remove tail if no food eaten
        newSnake.pop();
        return prevFood;
      });

      return newSnake;
    });
  }, []);

  const startGameLoop = useCallback(() => {
    clearGameLoop();
    const speed = SPEED_MAP[difficulty];
    intervalRef.current = window.setInterval(moveSnake, speed);
  }, [difficulty, moveSnake, clearGameLoop]);

  const startGame = useCallback(() => {
    setSnake(getInitialSnake());
    setFood(getRandomFood(getInitialSnake()));
    setDirection('RIGHT');
    directionRef.current = 'RIGHT';
    nextDirectionRef.current = null;
    setScore(0);
    setGameState('playing');
  }, []);

  const togglePause = useCallback(() => {
    if (gameStateRef.current === 'playing') {
      setGameState('paused');
      clearGameLoop();
    } else if (gameStateRef.current === 'paused') {
      setGameState('playing');
    }
  }, [clearGameLoop]);

  const changeDirection = useCallback((newDir: Direction) => {
    const current = nextDirectionRef.current || directionRef.current;
    if (newDir !== getOppositeDirection(current) && newDir !== current) {
      nextDirectionRef.current = newDir;
    }
  }, []);

  const changeDifficulty = useCallback((newDiff: Difficulty) => {
    setDifficulty(newDiff);
  }, []);

  // Game loop effect
  useEffect(() => {
    if (gameState === 'playing') {
      startGameLoop();
    } else {
      clearGameLoop();
    }
    return clearGameLoop;
  }, [gameState, difficulty, startGameLoop, clearGameLoop]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameStateRef.current === 'idle' || gameStateRef.current === 'gameover') {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          startGame();
          return;
        }
      }

      if (e.key === ' ' || e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        if (gameStateRef.current === 'playing' || gameStateRef.current === 'paused') {
          togglePause();
        }
        return;
      }

      if (gameStateRef.current !== 'playing') return;

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault();
          changeDirection('UP');
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          changeDirection('DOWN');
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          changeDirection('LEFT');
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          changeDirection('RIGHT');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [changeDirection, startGame, togglePause]);

  return {
    snake,
    food,
    direction,
    gameState,
    score,
    highScore,
    difficulty,
    lastEaten,
    gridSize: GRID_SIZE,
    startGame,
    togglePause,
    changeDirection,
    changeDifficulty,
  };
}
