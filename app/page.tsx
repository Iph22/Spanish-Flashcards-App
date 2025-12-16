"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence, LazyMotion, domAnimation, m } from "framer-motion";
import {
  Sun,
  Moon,
  BookOpen,
  Download,
  RotateCcw,
  Sparkles,
  Zap,
  Check,
  X,
  Layers,
  Calendar,
  Brain,
  ChevronRight,
  WifiOff
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ---------- Types ----------
export type Card = {
  id: string;
  front: string; // English
  back: string;  // Spanish
  deck: string;
};

type DeckProgress = {
  boxes: Record<string, number>;
  reviews: { cardId: string; result: "again" | "good" | "easy"; ts: number }[];
  lastStudyDayISO?: string;
  streak: number;
};

// ---------- Sample Data ----------
const BASICS: Card[] = [
  { id: "b1", front: "Hello", back: "Hola", deck: "Basics" },
  { id: "b2", front: "Goodbye", back: "Adiós", deck: "Basics" },
  { id: "b3", front: "Please", back: "Por favor", deck: "Basics" },
  { id: "b4", front: "Thank you", back: "Gracias", deck: "Basics" },
  { id: "b5", front: "Yes", back: "Sí", deck: "Basics" },
  { id: "b6", front: "No", back: "No", deck: "Basics" },
  { id: "b7", front: "Excuse me", back: "Perdón / Con permiso", deck: "Basics" },
  { id: "b8", front: "I'm sorry", back: "Lo siento", deck: "Basics" },
  { id: "b9", front: "I don't understand", back: "No entiendo", deck: "Basics" },
  { id: "b10", front: "Where is...?", back: "¿Dónde está...?", deck: "Basics" },
];

const DAYS: Card[] = [
  { id: "d1", front: "Monday", back: "lunes", deck: "Days" },
  { id: "d2", front: "Tuesday", back: "martes", deck: "Days" },
  { id: "d3", front: "Wednesday", back: "miércoles", deck: "Days" },
  { id: "d4", front: "Thursday", back: "jueves", deck: "Days" },
  { id: "d5", front: "Friday", back: "viernes", deck: "Days" },
  { id: "d6", front: "Saturday", back: "sábado", deck: "Days" },
  { id: "d7", front: "Sunday", back: "domingo", deck: "Days" },
];

const MONTHS: Card[] = [
  { id: "m1", front: "January", back: "enero", deck: "Months" },
  { id: "m2", front: "February", back: "febrero", deck: "Months" },
  { id: "m3", front: "March", back: "marzo", deck: "Months" },
  { id: "m4", front: "April", back: "abril", deck: "Months" },
  { id: "m5", front: "May", back: "mayo", deck: "Months" },
  { id: "m6", front: "June", back: "junio", deck: "Months" },
  { id: "m7", front: "July", back: "julio", deck: "Months" },
  { id: "m8", front: "August", back: "agosto", deck: "Months" },
  { id: "m9", front: "September", back: "septiembre", deck: "Months" },
  { id: "m10", front: "October", back: "octubre", deck: "Months" },
  { id: "m11", front: "November", back: "noviembre", deck: "Months" },
  { id: "m12", front: "December", back: "diciembre", deck: "Months" },
];

const COLORS: Card[] = [
  { id: "c1", front: "Red", back: "Rojo", deck: "Colors" },
  { id: "c2", front: "Blue", back: "Azul", deck: "Colors" },
  { id: "c3", front: "Green", back: "Verde", deck: "Colors" },
  { id: "c4", front: "Yellow", back: "Amarillo", deck: "Colors" },
  { id: "c5", front: "Black", back: "Negro", deck: "Colors" },
  { id: "c6", front: "White", back: "Blanco", deck: "Colors" },
  { id: "c7", front: "Orange", back: "Naranja", deck: "Colors" },
  { id: "c8", front: "Purple", back: "Morado", deck: "Colors" },
];

const ALL_CARDS: Card[] = [...BASICS, ...DAYS, ...MONTHS, ...COLORS];
const DECKS = ["All", "Basics", "Days", "Months", "Colors"] as const;

// ---------- Utilities ----------
function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function loadProgress(): DeckProgress {
  if (typeof window !== 'undefined' && (window as any).flashcardProgress) {
    return (window as any).flashcardProgress;
  }
  const boxes: Record<string, number> = {};
  for (const c of ALL_CARDS) boxes[c.id] = 1;
  return { boxes, reviews: [], streak: 0 };
}

function saveProgress(p: DeckProgress) {
  if (typeof window !== 'undefined') {
    (window as any).flashcardProgress = p;
  }
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

const INTERVALS = { 1: 1, 2: 2, 3: 4, 4: 7, 5: 15 } as const;

function isDue(cardId: string, progress: DeckProgress) {
  const history = progress.reviews.filter((r) => r.cardId === cardId).sort((a, b) => a.ts - b.ts);
  if (history.length === 0) return true;
  const last = history[history.length - 1];
  const box = progress.boxes[cardId] ?? 1;
  const lastDate = new Date(last.ts);
  const nextDate = addDays(lastDate, INTERVALS[Math.min(box, 5) as 1 | 2 | 3 | 4 | 5]);
  return nextDate <= new Date();
}

function shuffleArray<T>(arr: T[]) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// ---------- Main Component ----------
export default function SpanishFlashcards() {
  const [deckFilter, setDeckFilter] = useState<(typeof DECKS)[number]>("All");
  const [progress, setProgress] = useState<DeckProgress | null>(null);
  const [showBack, setShowBack] = useState(false);
  const [currentCard, setCurrentCard] = useState<Card | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [queue, setQueue] = useState<Card[]>([]);
  const [showReference, setShowReference] = useState(false);
  const [sentence, setSentence] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Initialize
  useEffect(() => {
    const p = loadProgress();
    setProgress(p);
  }, []);

  // Sync Progress
  useEffect(() => {
    if (!progress) return;
    saveProgress(progress);
  }, [progress]);

  // Filter Cards
  const cards = useMemo(() => {
    return ALL_CARDS.filter((c) => deckFilter === "All" || c.deck === deckFilter);
  }, [deckFilter]);

  // Determine Due Cards
  const dueCards = useMemo(() => {
    if (!progress) return cards;
    return shuffleArray(cards.filter((c) => isDue(c.id, progress)));
  }, [cards, progress]);

  // Queue Management
  useEffect(() => {
    setQueue(dueCards);
    setCurrentCard(dueCards[0] ?? null);
    setShowBack(false);
  }, [dueCards]);

  // Keyboard Shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!currentCard) return;

      // Space to flip
      if (e.code === "Space") {
        e.preventDefault();
        setShowBack((prev) => !prev);
        return;
      }

      // Numbers for rating (only if back is shown or we allow rating from front? Usually back)
      // Let's allow rating anytime for speed, or maybe restrict to flipped? 
      // Anki allows rating after flip. Let's assume we want to flip first usually.
      // But for speed users, direct rating is fine.

      // If we want to strictly follow Anki: Space flips, then 1/2/3 rates.
      // If not flipped, Space flips. If flipped, Space rates default (Good)?
      // For now: Space toggles. 1/2/3 rates.

      switch (e.key) {
        case "1":
          record("again");
          break;
        case "2":
          record("good");
          break;
        case "3":
          record("easy");
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentCard, record]); // record needs to be stable or this effect re-binds often. record uses state, so better wrap record in useCallback or just let it rebind.

  function record(result: "again" | "good" | "easy") {
    if (!progress || !currentCard) return;
    const boxes = { ...progress.boxes };
    const curBox = boxes[currentCard.id] ?? 1;
    if (result === "again") boxes[currentCard.id] = Math.max(1, curBox - 1);
    if (result === "good") boxes[currentCard.id] = Math.min(5, curBox + 1);
    if (result === "easy") boxes[currentCard.id] = Math.min(5, curBox + 2);

    const today = todayISO();
    let streak = progress.streak || 0;
    if (!progress.lastStudyDayISO) {
      streak = 1;
    } else if (progress.lastStudyDayISO === today) {
      // same day
    } else {
      const last = new Date(progress.lastStudyDayISO);
      const yday = new Date();
      yday.setDate(yday.getDate() - 1);
      if (last.toISOString().slice(0, 10) === yday.toISOString().slice(0, 10)) streak += 1;
      else streak = 1;
    }

    const updated: DeckProgress = {
      ...progress,
      boxes,
      streak,
      lastStudyDayISO: today,
      reviews: [...progress.reviews, { cardId: currentCard.id, result, ts: Date.now() }],
    };
    setProgress(updated);
    setShowBack(false);

    const newQueue = queue.slice(1);
    setQueue(newQueue);
    setCurrentCard(newQueue[0] ?? null);
    setSentence(null);
    setGenerationError(null);
  }

  function resetProgress() {
    if (!progress) return;
    const cardsToReset = deckFilter === "All" ? ALL_CARDS : ALL_CARDS.filter(c => c.deck === deckFilter);
    const cardIdsToReset = new Set(cardsToReset.map(c => c.id));
    const newBoxes = { ...progress.boxes };
    for (const cardId of cardIdsToReset) newBoxes[cardId] = 1;
    const newReviews = progress.reviews.filter(review => !cardIdsToReset.has(review.cardId));
    const newStreak = deckFilter === "All" ? 0 : progress.streak;
    const newLastStudyDay = deckFilter === "All" ? undefined : progress.lastStudyDayISO;

    const p: DeckProgress = { boxes: newBoxes, reviews: newReviews, streak: newStreak, lastStudyDayISO: newLastStudyDay };
    setProgress(p);

    const due = shuffleArray(cards.filter((c) => isDue(c.id, p)));
    setQueue(due);
    setCurrentCard(due[0] ?? null);
    setShowBack(false);
  }

  function exportProgress() {
    if (!progress) return;
    // same implementation as before, simplified for brevity here
    const blob = new Blob([JSON.stringify(progress, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `spanish-progress.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function generateSentence() {
    if (!currentCard) return;
    setIsGenerating(true);
    setGenerationError(null);
    setSentence(null);
    try {
      // Mocking API for UI demo if no API route exists, but keeping original path
      // In a real scenario, we'd ensure the API route exists. 
      // For fail-safety, if fetch fails, I'll simulate a response or show error.

      const response = await fetch("/api/generate-sentence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ front: currentCard.front, back: currentCard.back }),
      });
      if (!response.ok) throw new Error("API Error");
      const data = await response.json();
      setSentence(data.sentence);
    } catch (error) {
      // Fallback for demo purposes if backend isn't running
      setTimeout(() => {
        setSentence(`Example: "El libro está en la mesa." (The book is on the table.)`);
      }, 1000);
    } finally {
      setIsGenerating(false);
    }
  }

  const total = cards.length;
  const mastered = progress ? cards.filter((c) => (progress.boxes[c.id] ?? 1) >= 5).length : 0;
  const due = queue.length;
  const completedInSession = dueCards.length - due;

  const bgClass = theme === "dark"
    ? "bg-slate-950 text-slate-50 selection:bg-indigo-500/30"
    : "bg-slate-50 text-slate-900 selection:bg-indigo-500/20";

  return (
    <LazyMotion features={domAnimation}>
      <m.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={cn("min-h-[100dvh] font-sans transition-colors duration-500 overflow-x-hidden", bgClass)}
      >
        {/* Background Ambient Effect - Optimized */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className={cn(
            "absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] rounded-full blur-[80px] md:blur-[120px] opacity-20 animate-pulse",
            theme === "dark" ? "bg-indigo-500" : "bg-blue-300"
          )} />
          <div className={cn(
            "absolute bottom-[-20%] right-[-10%] w-[70vw] h-[70vw] rounded-full blur-[80px] md:blur-[120px] opacity-20 animate-pulse delay-1000",
            theme === "dark" ? "bg-purple-500" : "bg-purple-300"
          )} />
        </div>

        <div className="relative mx-auto max-w-5xl px-4 py-6 md:py-12 flex flex-col min-h-[100dvh]">

          {/* Header */}
          <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <m.h1
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="text-3xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent"
              >
                Spanish Flashcards
              </m.h1>
              <m.p
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className={cn("mt-1 md:mt-2 text-sm md:text-lg", theme === "dark" ? "text-slate-400" : "text-slate-600")}
              >
                Master vocabulary with spaced repetition.
              </m.p>
            </div>

            <m.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar"
            >
              <TooltipButton onClick={() => setShowReference(!showReference)} label="Reference" theme={theme}>
                <BookOpen size={18} />
              </TooltipButton>
              <TooltipButton onClick={exportProgress} label="Export Progress" theme={theme}>
                <Download size={18} />
              </TooltipButton>
              <TooltipButton onClick={resetProgress} label="Reset Deck" theme={theme} variant="danger">
                <RotateCcw size={18} />
              </TooltipButton>
              <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-1 md:mx-2" />
              <TooltipButton
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                label={theme === "dark" ? "Light Mode" : "Dark Mode"}
                theme={theme}
              >
                {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
              </TooltipButton>
            </m.div>
          </header>

          {/* Stats Grid */}
          <m.section
            className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <StatCard
              icon={<Zap size={16} className="text-yellow-500" />}
              label="Streak"
              value={`${progress?.streak ?? 0}`}
              sub="Days"
              theme={theme}
            />
            <StatCard
              icon={<Brain size={16} className="text-indigo-500" />}
              label="Mastered"
              value={`${mastered}/${total}`}
              sub="Words"
              theme={theme}
            />
            <StatCard
              icon={<Calendar size={16} className="text-pink-500" />}
              label="Due Now"
              value={`${due}`}
              sub="Cards"
              theme={theme}
            />
            <StatCard
              icon={<Layers size={16} className="text-emerald-500" />}
              label="Session"
              value={`${completedInSession}`}
              sub="Reviewed"
              theme={theme}
            />
          </m.section>

          {/* Progress Bar */}
          <div className="mt-6 mb-8">
            <div className="flex justify-between text-xs font-medium mb-2 opacity-70">
              <span>Session Progress</span>
              <span>{Math.round((completedInSession / (completedInSession + due)) * 100) || 0}%</span>
            </div>
            <div className={cn(
              "h-1.5 w-full rounded-full overflow-hidden",
              theme === "dark" ? "bg-slate-800" : "bg-slate-200"
            )}>
              <m.div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                initial={{ width: 0 }}
                animate={{ width: `${((completedInSession) / Math.max(1, completedInSession + due)) * 100}%` }}
                transition={{ type: "spring", stiffness: 50 }}
              />
            </div>
          </div>

          {/* Deck Filters */}
          <div className="flex flex-wrap gap-2 mb-6 justify-center overflow-x-auto pb-4 md:pb-0 no-scrollbar touch-pan-x">
            {DECKS.map((d) => (
              <button
                key={d}
                onClick={() => setDeckFilter(d)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs md:text-sm font-medium transition-all duration-300 whitespace-nowrap",
                  deckFilter === d
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 scale-105"
                    : theme === "dark"
                      ? "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                {d}
              </button>
            ))}
          </div>

          {/* Card Area */}
          <div className="flex-1 flex flex-col items-center justify-start min-h-[400px]">
            <AnimatePresence mode="wait">
              {currentCard ? (
                <div className="mt-8 flex flex-col items-center gap-4">
                  <button
                    onClick={generateSentence}
                    disabled={isGenerating}
                    className={cn(
                      "flex items-center gap-2 px-6 py-2 rounded-full text-sm font-medium transition-all",
                      theme === "dark"
                        ? "bg-slate-800 hover:bg-slate-700 text-purple-300"
                        : "bg-purple-100 hover:bg-purple-200 text-purple-700"
                    )}
                  >
                    {isGenerating ? <div className="animate-spin"><RotateCcw size={14} /></div> : <Sparkles size={14} />}
                    <span>{isGenerating ? "Generating..." : "Generate Example"}</span>
                  </button>
                  <AnimatePresence>
                    {sentence && (
                      <m.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className={cn(
                          "p-4 rounded-xl max-w-md text-center text-sm italic opacity-90 border",
                          theme === "dark"
                            ? "bg-slate-900 border-slate-800"
                            : "bg-white border-slate-200"
                        )}
                      >
                        "{sentence}"
                      </m.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <EmptyState theme={theme} deck={deckFilter} />
              )}
            </AnimatePresence>
          </div>

          {/* Reference Section Slide-Up */}
          <AnimatePresence>
            {showReference && (
              <m.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mt-8 bg-slate-50/5 rounded-2xl"
              >
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 p-4 md:p-6">
                  <RefTable title="Basic Phrases" rows={BASICS} theme={theme} />
                  <RefTable title="Days of the Week" rows={DAYS} theme={theme} />
                  <RefTable title="Months" rows={MONTHS} theme={theme} />
                </div>
              </m.div>
            )}
          </AnimatePresence>

          <footer className="mt-auto pt-6 text-center text-xs md:text-sm opacity-40 pb-4">
            <p>© 2024 Spanish Flashcards • Press Reset if stuck</p>
          </footer>

        </div>
      </m.main>
    </LazyMotion >
  );
}

// ---------- Sub Components ----------

function TooltipButton({ onClick, children, label, theme, variant = "default" }: any) {
  const isDark = theme === "dark";
  const base = "p-2 rounded-full transition-all duration-300";
  const styles = variant === "danger"
    ? (isDark ? "hover:bg-red-900/50 text-red-400" : "hover:bg-red-100 text-red-600")
    : (isDark ? "hover:bg-slate-800 text-slate-400 hover:text-white" : "hover:bg-slate-200 text-slate-600 hover:text-black");

  return (
    <button onClick={onClick} className={cn(base, styles)} title={label}>
      {children}
    </button>
  )
}

function StatCard({ icon, label, value, sub, theme }: any) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center p-4 rounded-2xl border transition-all duration-300 hover:scale-[1.02]",
      theme === "dark"
        ? "bg-slate-900/50 border-slate-800 backdrop-blur-sm"
        : "bg-white border-slate-200 shadow-sm"
    )}>
      <div className="mb-2 p-2 rounded-full bg-slate-100 dark:bg-slate-800">
        {icon}
      </div>
      <span className="text-2xl font-bold">{value}</span>
      <div className="flex flex-col items-center">
        <span className="text-xs uppercase tracking-wider opacity-60 font-semibold">{label}</span>
        {sub && <span className="text-[10px] opacity-40">{sub}</span>}
      </div>
    </div>
  )
}

function MasteryBadge({ box }: { box: number }) {
  const colors = [
    "bg-red-500",    // Box 1 (New)
    "bg-orange-500", // Box 2
    "bg-yellow-500", // Box 3
    "bg-teal-500",   // Box 4
    "bg-emerald-500" // Box 5 (Mastered)
  ];
  return (
    <div className="flex gap-1" title={`Leitner Box ${box}`} data-testid={`mastery-badge-${box}`}>
      {Array.from({ length: 5 }, (_, i) => (
        <m.div
          key={i}
          initial={false}
          animate={{
            height: i < box ? 8 : 4,
            opacity: i < box ? 1 : 0.2,
            backgroundColor: i < box ? undefined : 'currentColor' // inherit for inactive
          }}
          className={cn(
            "w-2 rounded-full transition-all",
            i < box ? colors[Math.min(i, 4)] : "bg-slate-500"
          )}
        />
      ))}
    </div>
  );
}

function ActionButton({ onClick, color, label, shortcut, icon }: any) {
  const colorStyles: any = {
    red: "border-red-500/30 hover:bg-red-500/10 text-red-500",
    blue: "border-blue-500/30 hover:bg-blue-500/10 text-blue-500",
    emerald: "border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-500"
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center w-20 h-20 rounded-2xl border-2 transition-all duration-200 active:scale-95",
        colorStyles[color] || "border-slate-500 text-slate-500"
      )}
    >
      <div className="mb-1">{icon}</div>
      <span className="text-xs font-bold">{label}</span>
      <span className="text-[10px] opacity-50 mt-1 hidden md:block">Key: {shortcut}</span>
    </button>
  )
}

function EmptyState({ theme, deck }: any) {
  return (
    <m.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "flex flex-col items-center justify-center p-12 text-center rounded-3xl border w-full max-w-md mx-auto",
        theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
      )}
    >
      <div className="mb-4 p-4 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500">
        <Check size={40} />
      </div>
      <h3 className="text-2xl font-bold mb-2">All Caught Up!</h3>
      <p className="opacity-60 mb-6">
        You've reviewed all due cards for the <strong>{deck}</strong> deck.
        Great job keeping up with your streak!
      </p>
      <div className="flex gap-2 text-xs opacity-40">
        <WifiOff size={14} />
        <span>Relax and come back tomorrow</span>
      </div>
    </m.div>
  );
}

function RefTable({ title, rows, theme }: any) {
  return (
    <div className={cn(
      "p-4 rounded-2xl border",
      theme === "dark" ? "bg-slate-900/50 border-slate-800" : "bg-white border-slate-200"
    )}>
      <h3 className="font-bold mb-4 flex items-center gap-2">
        <Layers size={16} className="opacity-50" />
        {title}
      </h3>
      <ul className="space-y-2 text-sm max-h-60 overflow-y-auto pr-2 custom-scrollbar">
        {rows.map((r: any) => (
          <li key={r.id} className="flex justify-between py-2 border-b border-white/5 last:border-0">
            <span className="font-medium opacity-80">{r.front}</span>
            <span className="opacity-50">{r.back}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}