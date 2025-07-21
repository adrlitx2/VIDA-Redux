import React, { useState, useEffect, useCallback } from 'react';
import { X, Play, Pause, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ProcessingLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  progress: number;
  isComplete: boolean;
  estimatedTime?: number;
}

// Snake Game Component
const SnakeGame: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [snake, setSnake] = useState([[10, 10]]);
  const [food, setFood] = useState([15, 15]);
  const [direction, setDirection] = useState([0, 1]);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const resetGame = () => {
    setSnake([[10, 10]]);
    setFood([15, 15]);
    setDirection([0, 1]);
    setGameOver(false);
    setScore(0);
    setIsPlaying(false);
  };

  const moveSnake = useCallback(() => {
    if (!isPlaying || gameOver) return;
    
    setSnake(currentSnake => {
      const newSnake = [...currentSnake];
      const head = [newSnake[0][0] + direction[0], newSnake[0][1] + direction[1]];
      
      // Check boundaries
      if (head[0] < 0 || head[0] >= 20 || head[1] < 0 || head[1] >= 20) {
        setGameOver(true);
        setIsPlaying(false);
        return currentSnake;
      }
      
      // Check self collision
      if (newSnake.some(segment => segment[0] === head[0] && segment[1] === head[1])) {
        setGameOver(true);
        setIsPlaying(false);
        return currentSnake;
      }
      
      newSnake.unshift(head);
      
      // Check food collision
      if (head[0] === food[0] && head[1] === food[1]) {
        setScore(prev => prev + 10);
        setFood([
          Math.floor(Math.random() * 20),
          Math.floor(Math.random() * 20)
        ]);
      } else {
        newSnake.pop();
      }
      
      return newSnake;
    });
  }, [direction, food, isPlaying, gameOver]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isPlaying) return;
      
      switch (e.key) {
        case 'ArrowUp': setDirection([-1, 0]); break;
        case 'ArrowDown': setDirection([1, 0]); break;
        case 'ArrowLeft': setDirection([0, -1]); break;
        case 'ArrowRight': setDirection([0, 1]); break;
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isPlaying]);

  useEffect(() => {
    if (isPlaying && !gameOver) {
      const interval = setInterval(moveSnake, 200);
      return () => clearInterval(interval);
    }
  }, [moveSnake, isPlaying, gameOver]);

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="flex items-center justify-between w-full">
        <div className="text-sm font-medium">Score: {score}</div>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => setIsPlaying(!isPlaying)}
            disabled={gameOver}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button size="sm" onClick={resetGame}>
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-20 gap-0 border-2 border-gray-300 bg-gray-100">
        {Array.from({ length: 400 }).map((_, i) => {
          const row = Math.floor(i / 20);
          const col = i % 20;
          const isSnake = snake.some(segment => segment[0] === row && segment[1] === col);
          const isFood = food[0] === row && food[1] === col;
          
          return (
            <div
              key={i}
              className={`w-4 h-4 ${
                isSnake ? 'bg-green-500' : isFood ? 'bg-red-500' : 'bg-gray-100'
              }`}
            />
          );
        })}
      </div>
      
      {gameOver && (
        <div className="text-center">
          <div className="text-red-500 font-bold">Game Over!</div>
          <div className="text-sm text-gray-600">Use arrow keys to control</div>
        </div>
      )}
      
      {!isPlaying && !gameOver && (
        <div className="text-sm text-gray-600">Use arrow keys to control</div>
      )}
    </div>
  );
};

// Tic Tac Toe Game Component
const TicTacToeGame: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [board, setBoard] = useState(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState(true);
  const [winner, setWinner] = useState<string | null>(null);

  const calculateWinner = (squares: (string | null)[]) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ];
    
    for (const [a, b, c] of lines) {
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return squares[a];
      }
    }
    return null;
  };

  const handleClick = (index: number) => {
    if (board[index] || winner) return;
    
    const newBoard = [...board];
    newBoard[index] = isXNext ? 'X' : 'O';
    setBoard(newBoard);
    setIsXNext(!isXNext);
    
    const newWinner = calculateWinner(newBoard);
    if (newWinner) {
      setWinner(newWinner);
    }
  };

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setIsXNext(true);
    setWinner(null);
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="flex items-center justify-between w-full">
        <div className="text-sm font-medium">
          {winner ? `Winner: ${winner}` : `Next: ${isXNext ? 'X' : 'O'}`}
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={resetGame}>
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-1 w-48 h-48">
        {board.map((cell, index) => (
          <button
            key={index}
            onClick={() => handleClick(index)}
            className="w-16 h-16 border-2 border-gray-300 bg-white hover:bg-gray-50 
                     text-2xl font-bold flex items-center justify-center
                     transition-colors duration-200"
          >
            {cell}
          </button>
        ))}
      </div>
      
      {winner && (
        <div className="text-center">
          <div className="text-green-500 font-bold">🎉 {winner} Wins!</div>
        </div>
      )}
      
      {!winner && board.every(cell => cell) && (
        <div className="text-center">
          <div className="text-yellow-500 font-bold">It's a Draw!</div>
        </div>
      )}
    </div>
  );
};

// Memory Game Component
const MemoryGame: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [cards, setCards] = useState<{ id: number; symbol: string; isFlipped: boolean; isMatched: boolean }[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const symbols = ['🎮', '🎯', '🎲', '🎪', '🎨', '🎭', '🎺', '🎸'];

  const initializeGame = () => {
    const gameCards = [...symbols, ...symbols].map((symbol, index) => ({
      id: index,
      symbol,
      isFlipped: false,
      isMatched: false
    }));
    
    // Shuffle cards
    for (let i = gameCards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [gameCards[i], gameCards[j]] = [gameCards[j], gameCards[i]];
    }
    
    setCards(gameCards);
    setFlippedCards([]);
    setMoves(0);
    setIsComplete(false);
  };

  useEffect(() => {
    initializeGame();
  }, []);

  const handleCardClick = (cardId: number) => {
    if (flippedCards.length >= 2 || cards[cardId].isMatched || cards[cardId].isFlipped) return;
    
    const newCards = [...cards];
    newCards[cardId].isFlipped = true;
    setCards(newCards);
    
    const newFlippedCards = [...flippedCards, cardId];
    setFlippedCards(newFlippedCards);
    
    if (newFlippedCards.length === 2) {
      setMoves(prev => prev + 1);
      
      const [first, second] = newFlippedCards;
      if (newCards[first].symbol === newCards[second].symbol) {
        // Match found
        newCards[first].isMatched = true;
        newCards[second].isMatched = true;
        setCards(newCards);
        setFlippedCards([]);
        
        // Check if game is complete
        if (newCards.every(card => card.isMatched)) {
          setIsComplete(true);
        }
      } else {
        // No match - flip back after delay
        setTimeout(() => {
          const resetCards = [...newCards];
          resetCards[first].isFlipped = false;
          resetCards[second].isFlipped = false;
          setCards(resetCards);
          setFlippedCards([]);
        }, 1000);
      }
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="flex items-center justify-between w-full">
        <div className="text-sm font-medium">Moves: {moves}</div>
        <div className="flex gap-2">
          <Button size="sm" onClick={initializeGame}>
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-4 gap-2 w-64">
        {cards.map((card) => (
          <button
            key={card.id}
            onClick={() => handleCardClick(card.id)}
            className={`w-14 h-14 border-2 border-gray-300 rounded-lg 
                     text-2xl flex items-center justify-center
                     transition-all duration-300 transform hover:scale-105
                     ${card.isFlipped || card.isMatched 
                       ? 'bg-blue-100 border-blue-300' 
                       : 'bg-gray-200 hover:bg-gray-300'
                     }`}
          >
            {card.isFlipped || card.isMatched ? card.symbol : '❓'}
          </button>
        ))}
      </div>
      
      {isComplete && (
        <div className="text-center">
          <div className="text-green-500 font-bold">🎉 Congratulations!</div>
          <div className="text-sm text-gray-600">Completed in {moves} moves</div>
        </div>
      )}
    </div>
  );
};

// Number Puzzle Game (2048-style)
const NumberPuzzle: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [grid, setGrid] = useState<number[][]>(Array(4).fill(null).map(() => Array(4).fill(0)));
  const [score, setScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);

  const addRandomTile = (currentGrid: number[][]) => {
    const emptyCells: [number, number][] = [];
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        if (currentGrid[i][j] === 0) {
          emptyCells.push([i, j]);
        }
      }
    }
    
    if (emptyCells.length > 0) {
      const [row, col] = emptyCells[Math.floor(Math.random() * emptyCells.length)];
      currentGrid[row][col] = Math.random() < 0.9 ? 2 : 4;
    }
  };

  const initializeGame = () => {
    const newGrid = Array(4).fill(null).map(() => Array(4).fill(0));
    addRandomTile(newGrid);
    addRandomTile(newGrid);
    setGrid(newGrid);
    setScore(0);
    setIsGameOver(false);
  };

  useEffect(() => {
    initializeGame();
  }, []);

  const moveLeft = () => {
    const newGrid = grid.map(row => [...row]);
    let moved = false;
    let newScore = score;
    
    for (let i = 0; i < 4; i++) {
      const row = newGrid[i].filter(cell => cell !== 0);
      for (let j = 0; j < row.length - 1; j++) {
        if (row[j] === row[j + 1]) {
          row[j] *= 2;
          newScore += row[j];
          row[j + 1] = 0;
        }
      }
      const filteredRow = row.filter(cell => cell !== 0);
      while (filteredRow.length < 4) {
        filteredRow.push(0);
      }
      
      if (JSON.stringify(filteredRow) !== JSON.stringify(newGrid[i])) {
        moved = true;
      }
      newGrid[i] = filteredRow;
    }
    
    if (moved) {
      addRandomTile(newGrid);
      setGrid(newGrid);
      setScore(newScore);
    }
  };

  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    if (isGameOver) return;
    
    switch (e.key) {
      case 'ArrowLeft': moveLeft(); break;
      // Add other directions as needed
    }
  }, [isGameOver]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="flex items-center justify-between w-full">
        <div className="text-sm font-medium">Score: {score}</div>
        <div className="flex gap-2">
          <Button size="sm" onClick={initializeGame}>
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-4 gap-2 w-64 h-64 bg-gray-200 p-2 rounded-lg">
        {grid.flat().map((cell, index) => (
          <div
            key={index}
            className={`w-14 h-14 rounded flex items-center justify-center text-lg font-bold
                     ${cell === 0 ? 'bg-gray-300' : 
                       cell <= 4 ? 'bg-yellow-200' :
                       cell <= 16 ? 'bg-orange-200' :
                       cell <= 64 ? 'bg-red-200' : 'bg-purple-200'
                     }`}
          >
            {cell > 0 && cell}
          </div>
        ))}
      </div>
      
      <div className="text-xs text-gray-600 text-center">
        Use arrow keys to move tiles
      </div>
    </div>
  );
};

// Simon Says Game Component
const SimonGame: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [sequence, setSequence] = useState<number[]>([]);
  const [playerSequence, setPlayerSequence] = useState<number[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isShowingSequence, setIsShowingSequence] = useState(false);
  const [activeColor, setActiveColor] = useState<number | null>(null);
  const [round, setRound] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [message, setMessage] = useState('Click Start to begin!');

  const colors = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500'];
  const colorNames = ['Red', 'Blue', 'Green', 'Yellow'];

  const startGame = () => {
    setSequence([]);
    setPlayerSequence([]);
    setRound(0);
    setGameOver(false);
    setIsPlaying(true);
    setMessage('Watch the sequence!');
    nextRound();
  };

  const nextRound = () => {
    const newColor = Math.floor(Math.random() * 4);
    const newSequence = [...sequence, newColor];
    setSequence(newSequence);
    setPlayerSequence([]);
    setRound(prev => prev + 1);
    showSequence(newSequence);
  };

  const showSequence = async (seq: number[]) => {
    setIsShowingSequence(true);
    setMessage('Watch carefully...');
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    for (let i = 0; i < seq.length; i++) {
      setActiveColor(seq[i]);
      await new Promise(resolve => setTimeout(resolve, 600));
      setActiveColor(null);
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    setIsShowingSequence(false);
    setMessage('Your turn! Repeat the sequence.');
  };

  const handleColorClick = (colorIndex: number) => {
    if (isShowingSequence || gameOver) return;
    
    const newPlayerSequence = [...playerSequence, colorIndex];
    setPlayerSequence(newPlayerSequence);
    
    // Check if correct
    if (newPlayerSequence[newPlayerSequence.length - 1] !== sequence[newPlayerSequence.length - 1]) {
      setGameOver(true);
      setMessage(`Game Over! You reached round ${round}`);
      setIsPlaying(false);
      return;
    }
    
    // Check if sequence complete
    if (newPlayerSequence.length === sequence.length) {
      setMessage('Correct! Get ready for the next round...');
      setTimeout(() => {
        nextRound();
      }, 1000);
    }
  };

  const resetGame = () => {
    setSequence([]);
    setPlayerSequence([]);
    setRound(0);
    setGameOver(false);
    setIsPlaying(false);
    setMessage('Click Start to begin!');
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="flex items-center justify-between w-full">
        <div className="text-sm font-medium">Round: {round}</div>
        <div className="flex gap-2">
          <Button size="sm" onClick={resetGame}>
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div className="text-center">
        <div className="text-sm font-medium mb-2">{message}</div>
        {!isPlaying && !gameOver && (
          <Button onClick={startGame} className="mb-4">
            <Play className="h-4 w-4 mr-2" />
            Start Game
          </Button>
        )}
      </div>
      
      <div className="grid grid-cols-2 gap-4 w-48 h-48">
        {colors.map((color, index) => (
          <button
            key={index}
            onClick={() => handleColorClick(index)}
            className={`w-20 h-20 rounded-lg border-4 transition-all duration-200 
                     ${color} ${activeColor === index ? 'opacity-100 scale-110' : 'opacity-70'}
                     ${isShowingSequence ? 'cursor-not-allowed' : 'hover:opacity-90 hover:scale-105'}
                     ${gameOver ? 'cursor-not-allowed opacity-50' : ''}
                     border-white shadow-lg`}
            disabled={isShowingSequence || gameOver}
            title={colorNames[index]}
          />
        ))}
      </div>
      
      {gameOver && (
        <div className="text-center">
          <div className="text-red-500 font-bold mb-2">Game Over!</div>
          <Button onClick={startGame} size="sm">
            Play Again
          </Button>
        </div>
      )}
    </div>
  );
};

export const ProcessingLightbox: React.FC<ProcessingLightboxProps> = ({
  isOpen,
  onClose,
  progress,
  isComplete,
  estimatedTime = 600 // 10 minutes default
}) => {
  const [showGames, setShowGames] = useState(false);
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [timeElapsed, setTimeElapsed] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setShowGames(false);
      setSelectedGame(null);
      setTimeElapsed(0);
      return;
    }

    // Show games after 3 seconds
    const timer = setTimeout(() => {
      setShowGames(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getEstimatedRemaining = () => {
    const progressDecimal = progress / 100;
    const estimatedTotal = progressDecimal > 0 ? timeElapsed / progressDecimal : estimatedTime;
    return Math.max(0, estimatedTotal - timeElapsed);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">VIDA³ Processing</h2>
            <p className="text-gray-600 mt-1">
              Converting your image to a 3D avatar
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Progress Section */}
        <div className="p-6 border-b border-gray-200">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="text-sm font-medium text-gray-700">
                Progress: {progress}%
              </div>
              <div className="text-sm text-gray-500">
                {formatTime(timeElapsed)} elapsed
              </div>
            </div>
            
            <Progress value={progress} className="h-3" />
            
            <div className="flex justify-between text-xs text-gray-500">
              <span>Processing can take up to 10 minutes</span>
              <span>
                ~{formatTime(Math.round(getEstimatedRemaining()))} remaining
              </span>
            </div>
          </div>

          {/* Status Messages */}
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              </div>
              <div>
                <p className="text-sm text-blue-800 font-medium">
                  {progress < 20 ? 'Analyzing your image...' :
                   progress < 40 ? 'Generating 3D mesh...' :
                   progress < 60 ? 'Creating textures...' :
                   progress < 80 ? 'Optimizing geometry...' :
                   progress < 100 ? 'Finalizing avatar...' : 'Complete!'}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  We're using advanced AI to create a high-quality 3D avatar from your image. 
                  The process involves mesh generation, texture mapping, and optimization for the best results.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Games Section */}
        {showGames && !isComplete && (
          <div className="p-6">
            {!selectedGame ? (
              <div>
                <div className="text-center mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Pass the time with a quick game!
                  </h3>
                  <p className="text-sm text-gray-600">
                    Choose a game to play while your avatar is being processed
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <Card 
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setSelectedGame('snake')}
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">🐍 Snake</CardTitle>
                      <CardDescription className="text-sm">
                        Classic snake game with arrow keys
                      </CardDescription>
                    </CardHeader>
                  </Card>
                  
                  <Card 
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setSelectedGame('tictactoe')}
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">⭕ Tic Tac Toe</CardTitle>
                      <CardDescription className="text-sm">
                        Play against yourself or a friend
                      </CardDescription>
                    </CardHeader>
                  </Card>
                  
                  <Card 
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setSelectedGame('memory')}
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">🧠 Memory</CardTitle>
                      <CardDescription className="text-sm">
                        Match pairs of emoji cards
                      </CardDescription>
                    </CardHeader>
                  </Card>
                  
                  <Card 
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setSelectedGame('simon')}
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">🎵 Simon Says</CardTitle>
                      <CardDescription className="text-sm">
                        Remember and repeat the sequence
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </div>
              </div>
            ) : (
              <div>
                <div className="mb-4 text-center">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {selectedGame === 'snake' ? '🐍 Snake Game' :
                     selectedGame === 'tictactoe' ? '⭕ Tic Tac Toe' :
                     selectedGame === 'memory' ? '🧠 Memory Game' :
                     selectedGame === 'simon' ? '🎵 Simon Says' :
                     '🔢 Number Puzzle'}
                  </h3>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-6">
                  {selectedGame === 'snake' && (
                    <SnakeGame onClose={() => setSelectedGame(null)} />
                  )}
                  {selectedGame === 'tictactoe' && (
                    <TicTacToeGame onClose={() => setSelectedGame(null)} />
                  )}
                  {selectedGame === 'memory' && (
                    <MemoryGame onClose={() => setSelectedGame(null)} />
                  )}
                  {selectedGame === 'simon' && (
                    <SimonGame onClose={() => setSelectedGame(null)} />
                  )}
                  {selectedGame === 'puzzle' && (
                    <NumberPuzzle onClose={() => setSelectedGame(null)} />
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Completion Message */}
        {isComplete && (
          <div className="p-6 text-center">
            <div className="text-green-600 text-6xl mb-4">🎉</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              Avatar Complete!
            </h3>
            <p className="text-gray-600 mb-4">
              Your 3D avatar has been successfully generated and is ready to use.
            </p>
            <Button onClick={onClose} className="bg-blue-600 hover:bg-blue-700">
              View Your Avatar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};