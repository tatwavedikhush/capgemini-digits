import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, 
  Timer, 
  Settings, 
  Play, 
  RotateCcw, 
  ChevronRight, 
  Target, 
  Zap, 
  Clock,
  XCircle,
  CheckCircle2,
  BarChart3,
  ArrowLeft
} from 'lucide-react';
import { generateQuestion, Difficulty, Question } from './utils/gameLogic';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type GameState = 'START' | 'PLAYING' | 'RESULTS';
type GameMode = 'Quick Practice' | 'Endless' | 'Difficulty Practice' | 'Mixed Challenge';

interface Stats {
  score: number;
  correct: number;
  incorrect: number;
  timeout: number;
  totalQuestions: number;
  accuracy: number;
  avgTime: number;
  currentStreak: number;
  longestStreak: number;
  history: { question: Question; userAnswer: string; isCorrect: boolean; time: number }[];
}

const INITIAL_STATS: Stats = {
  score: 0,
  correct: 0,
  incorrect: 0,
  timeout: 0,
  totalQuestions: 0,
  accuracy: 0,
  avgTime: 0,
  currentStreak: 0,
  longestStreak: 0,
  history: []
};

const TIMER_DURATION = 10;

export default function App() {
  const [gameState, setGameState] = useState<GameState>('START');
  const [difficulty, setDifficulty] = useState<Difficulty>('Easy');
  const [gameMode, setGameMode] = useState<GameMode>('Quick Practice');
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION);
  const [stats, setStats] = useState<Stats>(INITIAL_STATS);
  const [bestScore, setBestScore] = useState(0);
  const [questionCount, setQuestionCount] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | 'timeout' | null>(null);

  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  // Load best score
  useEffect(() => {
    const saved = localStorage.getItem('digit-rush-best');
    if (saved) setBestScore(parseInt(saved));
  }, []);

  const startNewGame = useCallback(() => {
    setStats(INITIAL_STATS);
    setGameState('PLAYING');
    setQuestionCount(0);
    nextQuestion();
  }, [difficulty, gameMode]);

  const nextQuestion = useCallback(() => {
    setFeedback(null);
    setUserAnswer('');
    setTimeLeft(TIMER_DURATION);
    
    let nextDifficulty = difficulty;
    if (gameMode === 'Mixed Challenge') {
      const levels: Difficulty[] = ['Easy', 'Medium', 'Hard', 'Expert'];
      nextDifficulty = levels[Math.floor(Math.random() * levels.length)];
    }

    const q = generateQuestion(nextDifficulty);
    setCurrentQuestion(q);
    setQuestionCount(prev => prev + 1);
    startTimeRef.current = Date.now();

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 0.1) {
          handleTimeout();
          return 0;
        }
        return prev - 0.1;
      });
    }, 100);
  }, [difficulty, gameMode]);

  const handleTimeout = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setFeedback('timeout');
    updateStats(null, true);
    
    setTimeout(() => {
      checkGameEnd();
    }, 800);
  }, []);

  const checkGameEnd = useCallback(() => {
    if (gameMode === 'Quick Practice' && questionCount >= 20) {
      endGame();
    } else {
      nextQuestion();
    }
  }, [gameMode, questionCount, nextQuestion]);

  const updateStats = (isCorrect: boolean | null, isTimeout = false) => {
    const timeTaken = (Date.now() - startTimeRef.current) / 1000;
    
    setStats(prev => {
      const newCorrect = isCorrect ? prev.correct + 1 : prev.correct;
      const newIncorrect = isCorrect === false ? prev.incorrect + 1 : prev.incorrect;
      const newTimeout = isTimeout ? prev.timeout + 1 : prev.timeout;
      const newTotal = prev.totalQuestions + 1;
      const newStreak = isCorrect ? prev.currentStreak + 1 : 0;
      
      const newHistory = [...prev.history, {
        question: currentQuestion!,
        userAnswer: userAnswer || '?',
        isCorrect: !!isCorrect,
        time: timeTaken
      }];

      return {
        ...prev,
        score: prev.score + (isCorrect ? 10 : 0),
        correct: newCorrect,
        incorrect: newIncorrect,
        timeout: newTimeout,
        totalQuestions: newTotal,
        accuracy: (newCorrect / newTotal) * 100,
        avgTime: (prev.avgTime * prev.totalQuestions + timeTaken) / newTotal,
        currentStreak: newStreak,
        longestStreak: Math.max(prev.longestStreak, newStreak),
        history: newHistory
      };
    });
  };

  const handleSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    if (gameState !== 'PLAYING' || feedback || !currentQuestion || userAnswer === '') return;

    if (timerRef.current) clearInterval(timerRef.current);

    const isCorrect = parseInt(userAnswer) === currentQuestion.answer;
    setFeedback(isCorrect ? 'correct' : 'incorrect');
    updateStats(isCorrect);

    setTimeout(() => {
      checkGameEnd();
    }, 800);
  }, [userAnswer, currentQuestion, gameState, feedback, checkGameEnd]);

  const quitGame = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (confirm('Are you sure you want to quit this challenge?')) {
      setGameState('START');
    } else {
      // Resume timer logic if needed, but since it's only 10s, 
      // the confirm dialog pauses execution anyway in most browsers.
      // For a better UX, we just resume the timer by calling nextQuestion or similar,
      // but simpler is to just let it be.
      if (gameState === 'PLAYING') {
        timerRef.current = window.setInterval(() => {
          setTimeLeft(prev => {
            if (prev <= 0.1) {
              handleTimeout();
              return 0;
            }
            return prev - 0.1;
          });
        }, 100);
      }
    }
  }, [gameState, handleTimeout]);

  const endGame = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setGameState('RESULTS');
    if (stats.score > bestScore) {
      setBestScore(stats.score);
      localStorage.setItem('digit-rush-best', stats.score.toString());
    }
  };

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'PLAYING') return;
      if (e.key >= '0' && e.key <= '9') {
        setUserAnswer(prev => prev + e.key);
      } else if (e.key === 'Backspace') {
        setUserAnswer(prev => prev.slice(0, -1));
      } else if (e.key === 'Enter') {
        handleSubmit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, handleSubmit]);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 overflow-hidden relative">
      {/* Background decoration */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full" />
      </div>

      <AnimatePresence mode="wait">
        {gameState === 'START' && (
          <motion.div 
            key="start"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="z-10 w-full max-w-2xl glass p-8 rounded-3xl border-purple-500/20"
          >
            <div className="text-center mb-8">
              <motion.h1 
                className="text-6xl font-black mb-2 tracking-tighter bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent italic"
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
              >
                DIGIT RUSH
              </motion.h1>
              <p className="text-gray-400 font-medium tracking-widest text-sm uppercase">Train Your Brain. Beat the Clock.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div className="space-y-4">
                <h3 className="flex items-center gap-2 text-sm font-bold text-gray-500 uppercase tracking-widest">
                  <Settings className="w-4 h-4" /> Difficulty
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {(['Easy', 'Medium', 'Hard', 'Expert'] as Difficulty[]).map((d) => (
                    <button
                      key={d}
                      onClick={() => setDifficulty(d)}
                      className={cn(
                        "px-4 py-3 rounded-xl font-bold transition-all border",
                        difficulty === d 
                          ? "bg-purple-600 border-purple-400 shadow-[0_0_20px_rgba(147,51,234,0.3)]" 
                          : "bg-white/5 border-white/10 hover:bg-white/10"
                      )}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="flex items-center gap-2 text-sm font-bold text-gray-500 uppercase tracking-widest">
                  <Target className="w-4 h-4" /> Mode
                </h3>
                <div className="grid grid-cols-1 gap-2">
                  {(['Quick Practice', 'Endless', 'Difficulty Practice', 'Mixed Challenge'] as GameMode[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => setGameMode(m)}
                      className={cn(
                        "px-4 py-3 rounded-xl font-bold transition-all border text-left flex justify-between items-center",
                        gameMode === m 
                          ? "bg-blue-600 border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.3)]" 
                          : "bg-white/5 border-white/10 hover:bg-white/10"
                      )}
                    >
                      {m}
                      {gameMode === m && <ChevronRight className="w-4 h-4" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center gap-6">
              <button
                onClick={startNewGame}
                className="group relative px-12 py-5 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl font-black text-xl tracking-tighter shadow-2xl hover:scale-105 transition-all"
              >
                <span className="flex items-center gap-3">
                  START CHALLENGE <Play className="w-6 h-6 fill-current" />
                </span>
                <div className="absolute inset-0 bg-white/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>

              {bestScore > 0 && (
                <div className="flex gap-8 text-gray-400 font-bold">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    <span>BEST: {bestScore}</span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {gameState === 'PLAYING' && currentQuestion && (
          <motion.div 
            key="game"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="z-10 w-full max-w-3xl flex flex-col items-center gap-6"
          >
            {/* HUD Header */}
            <div className="w-full flex justify-between items-center mb-2">
              <button 
                onClick={quitGame}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all text-gray-400 hover:text-white group"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                <span className="text-xs font-bold uppercase tracking-widest">Quit Game</span>
              </button>
              
              <div className="flex items-center gap-2 glass px-4 py-2 rounded-xl border-white/5">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Question</span>
                <span className="text-sm font-black text-blue-400">
                  {gameMode === 'Quick Practice' ? `${questionCount}/20` : questionCount}
                </span>
              </div>
            </div>

            {/* HUD */}
            <div className="w-full flex justify-between items-center glass px-6 py-4 rounded-2xl border-white/5">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Score</span>
                <span className="text-2xl font-black text-purple-400">{stats.score}</span>
              </div>
              
              <div className="relative w-20 h-20 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="transparent"
                    className="text-white/10"
                  />
                  <motion.circle
                    cx="40"
                    cy="40"
                    r="36"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="transparent"
                    strokeDasharray={226}
                    animate={{ strokeDashoffset: 226 - (226 * timeLeft) / TIMER_DURATION }}
                    className={cn(
                      "transition-colors duration-200",
                      timeLeft > 2 ? "text-blue-500" : "text-red-500"
                    )}
                  />
                </svg>
                <span className={cn(
                  "absolute text-2xl font-black tabular-nums",
                  timeLeft <= 2 && "text-red-500 animate-pulse"
                )}>
                  {Math.ceil(timeLeft)}
                </span>
              </div>

              <div className="flex flex-col items-end">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Streak</span>
                <div className="flex items-center gap-2">
                  <Zap className={cn("w-5 h-5", stats.currentStreak > 0 ? "text-yellow-500 fill-yellow-500" : "text-gray-600")} />
                  <span className="text-2xl font-black text-blue-400">{stats.currentStreak}</span>
                </div>
              </div>
            </div>

            {/* Question Area */}
            <div className="w-full glass p-12 rounded-[40px] flex flex-col items-center justify-center min-h-[300px] border-white/10 relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentQuestion.equation}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="text-6xl md:text-8xl font-black tracking-tight text-center"
                >
                  {currentQuestion.equation.split(' ').map((part, i) => (
                    <span 
                      key={i} 
                      className={cn(
                        "mx-2",
                        part === '?' ? "text-purple-500 underline decoration-8 underline-offset-8" : "text-white"
                      )}
                    >
                      {part === '?' ? (userAnswer || '?') : part}
                    </span>
                  ))}
                </motion.div>
              </AnimatePresence>

              {/* Feedback Overlay */}
              <AnimatePresence>
                {feedback && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-[40px] backdrop-blur-sm z-20"
                  >
                    {feedback === 'correct' && (
                      <div className="flex flex-col items-center text-green-500">
                        <CheckCircle2 className="w-24 h-24 mb-4" />
                        <span className="text-4xl font-black uppercase tracking-tighter">Correct!</span>
                        <span className="text-xl font-bold">+10 PTS</span>
                      </div>
                    )}
                    {feedback === 'incorrect' && (
                      <div className="flex flex-col items-center text-red-500">
                        <XCircle className="w-24 h-24 mb-4" />
                        <span className="text-4xl font-black uppercase tracking-tighter">Wrong!</span>
                        <span className="text-xl font-bold text-white/60">Answer: {currentQuestion.answer}</span>
                      </div>
                    )}
                    {feedback === 'timeout' && (
                      <div className="flex flex-col items-center text-orange-500">
                        <Clock className="w-24 h-24 mb-4" />
                        <span className="text-4xl font-black uppercase tracking-tighter">Time's Up!</span>
                        <span className="text-xl font-bold text-white/60">Answer: {currentQuestion.answer}</span>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Input / Keypad */}
            <div className="w-full max-w-md grid grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, 'OK'].map((key) => (
                <button
                  key={key}
                  onClick={() => {
                    if (key === 'C') setUserAnswer(prev => prev.slice(0, -1));
                    else if (key === 'OK') handleSubmit();
                    else setUserAnswer(prev => prev + key.toString());
                  }}
                  className={cn(
                    "h-20 rounded-2xl text-2xl font-black transition-all border",
                    key === 'OK' 
                      ? "bg-green-600 border-green-400 text-white col-span-1" 
                      : key === 'C'
                      ? "bg-red-900/40 border-red-500/30 text-red-400"
                      : "bg-white/5 border-white/10 hover:bg-white/20 active:scale-95"
                  )}
                >
                  {key}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {gameState === 'RESULTS' && (
          <motion.div 
            key="results"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="z-10 w-full max-w-4xl glass p-8 rounded-3xl border-white/10"
          >
            <div className="text-center mb-8">
              <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-5xl font-black tracking-tighter mb-2 italic">CHALLENGE COMPLETE</h2>
              <p className="text-gray-400 font-bold uppercase tracking-widest">Here's how you performed</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { label: 'Score', value: stats.score, color: 'text-purple-400', icon: Trophy },
                { label: 'Accuracy', value: `${Math.round(stats.accuracy)}%`, color: 'text-green-400', icon: Target },
                { label: 'Avg Time', value: `${stats.avgTime.toFixed(2)}s`, color: 'text-blue-400', icon: Clock },
                { label: 'Streak', value: stats.longestStreak, color: 'text-yellow-400', icon: Zap },
              ].map((stat, i) => (
                <div key={i} className="bg-white/5 p-6 rounded-2xl border border-white/5 text-center">
                  <stat.icon className={cn("w-6 h-6 mx-auto mb-2", stat.color)} />
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">{stat.label}</div>
                  <div className={cn("text-3xl font-black", stat.color)}>{stat.value}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" /> Performance Breakdown
                </h3>
                <div className="space-y-2">
                  {[
                    { label: 'Correct Answers', value: stats.correct, color: 'bg-green-500' },
                    { label: 'Incorrect Answers', value: stats.incorrect, color: 'bg-red-500' },
                    { label: 'Timeouts', value: stats.timeout, color: 'bg-orange-500' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <div className="flex-1 text-sm font-bold text-gray-400">{item.label}</div>
                      <div className="w-32 h-2 bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className={cn("h-full", item.color)} 
                          style={{ width: `${(item.value / stats.totalQuestions) * 100}%` }} 
                        />
                      </div>
                      <div className="w-8 text-right font-black">{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                  <RotateCcw className="w-4 h-4" /> Review Errors
                </h3>
                <div className="max-h-[200px] overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                  {stats.history.filter(h => !h.isCorrect).length > 0 ? (
                    stats.history.filter(h => !h.isCorrect).map((h, i) => (
                      <div key={i} className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl flex justify-between items-center">
                        <span className="font-bold text-sm">{h.question.fullEquation}</span>
                        <span className="text-xs font-bold text-red-400 uppercase">You: {h.userAnswer}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-gray-500 text-sm italic py-4 text-center">No errors! Perfect run.</div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={startNewGame}
                className="px-8 py-4 bg-purple-600 rounded-2xl font-black text-lg tracking-tighter hover:bg-purple-500 transition-all flex items-center justify-center gap-2"
              >
                TRY AGAIN <RotateCcw className="w-5 h-5" />
              </button>
              <button
                onClick={() => setGameState('START')}
                className="px-8 py-4 bg-white/5 border border-white/10 rounded-2xl font-black text-lg tracking-tighter hover:bg-white/10 transition-all flex items-center justify-center gap-2"
              >
                MAIN MENU
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
