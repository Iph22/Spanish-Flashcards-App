"use client";

import React, { useEffect, useMemo, useState } from "react";

// ---------- Types ----------
export type Card = {
  id: string;
  front: string; // English
  back: string;  // Spanish
  deck: string;
};

type DeckProgress = {
  // Leitner box number for each card (1..5). Higher = better known.
  boxes: Record<string, number>;
  // Review history for simple stats
  reviews: { cardId: string; result: "again" | "good" | "easy"; ts: number }[];
  // Streak tracking
  lastStudyDayISO?: string; // YYYY-MM-DD
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
  // Use in-memory storage instead of localStorage for artifacts
  if (typeof window !== 'undefined' && (window as any).flashcardProgress) {
    return (window as any).flashcardProgress;
  }
  // initialize all cards in box 1
  const boxes: Record<string, number> = {};
  for (const c of ALL_CARDS) boxes[c.id] = 1;
  return { boxes, reviews: [], streak: 0 };
}

function saveProgress(p: DeckProgress) {
  // Use in-memory storage instead of localStorage for artifacts
  if (typeof window !== 'undefined') {
    (window as any).flashcardProgress = p;
  }
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// Simple Leitner schedule: box n -> next review in 1, 2, 4, 7, 15 days
const INTERVALS = { 1: 1, 2: 2, 3: 4, 4: 7, 5: 15 } as const;

function isDue(cardId: string, progress: DeckProgress) {
  const history = progress.reviews.filter((r) => r.cardId === cardId).sort((a, b) => a.ts - b.ts);
  if (history.length === 0) return true; // new card due now
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

function classNames(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(" ");
}

// ---------- Component ----------
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

  useEffect(() => {
    const p = loadProgress();
    setProgress(p);
  }, []);

  // Streak maintenance and save progress
  useEffect(() => {
    if (!progress) return;
    saveProgress(progress);
  }, [progress]);

  const cards = useMemo(() => {
    return ALL_CARDS.filter((c) => deckFilter === "All" || c.deck === deckFilter);
  }, [deckFilter]);

  const dueCards = useMemo(() => {
    if (!progress) return cards;
    return shuffleArray(cards.filter((c) => isDue(c.id, progress)));
  }, [cards, progress]);

  useEffect(() => {
    setQueue(dueCards);
    setCurrentCard(dueCards[0] ?? null);
    setShowBack(false);
  }, [dueCards]);

  function record(result: "again" | "good" | "easy") {
    if (!progress || !currentCard) return;
    const boxes = { ...progress.boxes };
    const curBox = boxes[currentCard.id] ?? 1;
    if (result === "again") boxes[currentCard.id] = Math.max(1, curBox - 1);
    if (result === "good") boxes[currentCard.id] = Math.min(5, curBox + 1);
    if (result === "easy") boxes[currentCard.id] = Math.min(5, curBox + 2);

    // streak calculation
    const today = todayISO();
    let streak = progress.streak || 0;
    if (!progress.lastStudyDayISO) {
      streak = 1;
    } else if (progress.lastStudyDayISO === today) {
      // no change in streak for same day
    } else {
      const last = new Date(progress.lastStudyDayISO);
      const yday = new Date();
      yday.setDate(yday.getDate() - 1);
      if (last.toISOString().slice(0, 10) === yday.toISOString().slice(0, 10)) streak += 1;
      else streak = 1; // reset streak
    }

    const updated: DeckProgress = {
      ...progress,
      boxes,
      streak,
      lastStudyDayISO: today,
      reviews: [
        ...progress.reviews,
        { cardId: currentCard.id, result, ts: Date.now() },
      ],
    };
    setProgress(updated);
    setShowBack(false);

    // Move to next card
    const newQueue = queue.slice(1);
    setQueue(newQueue);
    setCurrentCard(newQueue[0] ?? null);
    setSentence(null);
    setGenerationError(null);
  }

  function resetProgress() {
    const boxes: Record<string, number> = {};
    for (const c of ALL_CARDS) boxes[c.id] = 1;
    const p: DeckProgress = { boxes, reviews: [], streak: 0 };
    setProgress(p);
  }

  function exportProgress() {
    if (!progress) return;

    // Calculate stats based on the actual data structure
    const totalWords = Object.keys(progress.boxes).length;
    const masteredWords = Object.values(progress.boxes).filter(box => box >= 5).length;
    const totalReviews = progress.reviews.length;
    const correctReviews = progress.reviews.filter(r => r.result === "good" || r.result === "easy").length;
    const overallAccuracy = totalReviews > 0 ? Math.round((correctReviews / totalReviews) * 100) : 0;

    // Create formatted report
    const report = `SPANISH LEARNING PROGRESS REPORT
Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}

=== OVERALL STATISTICS ===
Total Words: ${totalWords}
Words Mastered (Box 5): ${masteredWords}
Mastery Rate: ${totalWords > 0 ? Math.round((masteredWords / totalWords) * 100) : 0}%
Overall Accuracy: ${overallAccuracy}%
Current Streak: ${progress.streak} days
Total Reviews: ${totalReviews}

=== LEITNER BOX DISTRIBUTION ===
${[1, 2, 3, 4, 5].map(box => {
      const count = Object.values(progress.boxes).filter(b => b === box).length;
      return `Box ${box}: ${count} cards`;
    }).join('\n')}

=== RECENT ACTIVITY ===
${progress.reviews.slice(-10).reverse().map(review => {
      const card = ALL_CARDS.find(c => c.id === review.cardId);
      const date = new Date(review.ts).toLocaleDateString();
      const time = new Date(review.ts).toLocaleTimeString();
      return `${date} ${time}: ${card?.front || 'Unknown'} - ${review.result}`;
    }).join('\n') || 'No recent activity'}

=== CARDS BY DECK ===
${DECKS.slice(1).map(deck => {
      const deckCards = ALL_CARDS.filter(c => c.deck === deck);
      const deckMastered = deckCards.filter(c => (progress.boxes[c.id] ?? 1) >= 5).length;
      return `${deck}: ${deckMastered}/${deckCards.length} mastered`;
    }).join('\n')}

Report generated by Spanish Learning App - Built by David Iphy`;

    // Create and download the file
    const blob = new Blob([report], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `spanish-progress-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function generateSentence() {
    if (!currentCard) return;

    setIsGenerating(true);
    setGenerationError(null);
    setSentence(null);

    try {
      const response = await fetch("/api/generate-sentence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          front: currentCard.front,
          back: currentCard.back,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate sentence.");
      }

      const data = await response.json();
      setSentence(data.sentence);
    } catch (error) {
      setGenerationError("Could not fetch an example sentence. Please try again.");
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  }

  const total = cards.length;
  const mastered = progress ? cards.filter((c) => (progress.boxes[c.id] ?? 1) >= 5).length : 0;
  const due = queue.length + (currentCard ? 1 : 0);
  const completedInSession = dueCards.length - due;

  return (
    <main className={classNames(
      "min-h-screen transition-colors duration-300",
      theme === "dark" ? "bg-neutral-950 text-neutral-100" : "bg-white text-black"
    )}>
      <div className="mx-auto max-w-5xl px-4 py-8">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Spanish Flashcards</h1>
            <p className={theme === "dark" ? "text-neutral-400" : "text-neutral-600"}>
              Basics • Days • Months • Colors — track your streak and mastery.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowReference(!showReference)}
              className={classNames(
                "rounded-2xl border px-3 py-2 text-sm",
                theme === "dark" ? "border-neutral-700 hover:bg-neutral-800" : "border-neutral-400 hover:bg-neutral-200"
              )}
            >
              Reference
            </button>
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className={classNames(
                "rounded-2xl border px-3 py-2 text-sm",
                theme === "dark" ? "border-neutral-700 hover:bg-neutral-800" : "border-neutral-400 hover:bg-neutral-200"
              )}
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
            <button onClick={exportProgress} className={classNames(
              "rounded-2xl border px-3 py-2 text-sm",
              theme === "dark" ? "border-neutral-700 hover:bg-neutral-800" : "border-neutral-400 hover:bg-neutral-200"
            )}>Export</button>
            <button onClick={resetProgress} className="rounded-2xl border border-red-800 text-red-300 px-3 py-2 text-sm hover:bg-red-900/40">Reset</button>
          </div>
        </header>

        {/* Stats */}
        <section className="mt-6 grid gap-4 sm:grid-cols-4">
          <StatCard
            label="Streak"
            value={`${progress?.streak ?? 0} day${(progress?.streak ?? 0) === 1 ? "" : "s"}`}
            hint={progress?.lastStudyDayISO ? `Last: ${progress.lastStudyDayISO}` : "Start today"}
            theme={theme}
          />
          <StatCard
            label="Mastered"
            value={`${mastered}/${total}`}
            hint="Box 5 cards"
            theme={theme}
          />
          <StatCard
            label="Due now"
            value={`${due}`}
            hint="Cards scheduled today"
            theme={theme}
          />
          <StatCard
            label="Session"
            value={`${completedInSession}`}
            hint="Cards reviewed today"
            theme={theme}
          />
        </section>

        {/* Progress Bar */}
        {dueCards.length > 0 && (
          <div className={classNames(
            "mt-4 w-full rounded-full h-3 overflow-hidden",
            theme === "dark" ? "bg-neutral-800" : "bg-neutral-200"
          )}>
            <div
              className="h-3 bg-gradient-to-r from-teal-500 to-emerald-500 transition-all duration-500 ease-out"
              style={{ width: `${((completedInSession) / dueCards.length) * 100}%` }}
            ></div>
          </div>
        )}

        {/* Controls */}
        <section className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2 flex-wrap">
            {DECKS.map((d) => (
              <button
                key={d}
                onClick={() => setDeckFilter(d)}
                className={classNames(
                  "rounded-full px-3 py-1 text-sm border transition-colors",
                  deckFilter === d
                    ? "border-teal-500 bg-teal-500/20 text-teal-300"
                    : theme === "dark"
                      ? "border-neutral-700 hover:bg-neutral-800"
                      : "border-neutral-400 hover:bg-neutral-200"
                )}
              >
                {d}
              </button>
            ))}
          </div>
          <p className={classNames("text-sm", theme === "dark" ? "text-neutral-400" : "text-neutral-600")}>
            Progress is saved in your session.
          </p>
        </section>

        {/* Card */}
        <section className="mt-6">
          {currentCard ? (
            <div className="mx-auto max-w-xl">
              <div
                className="group relative h-60 cursor-pointer select-none [perspective:1200px]"
                onClick={() => setShowBack((s) => !s)}
              >
                <div className={classNames(
                  "absolute inset-0 rounded-2xl border p-6 text-center shadow-xl transition-transform duration-500 [transform-style:preserve-3d]",
                  showBack ? "[transform:rotateY(180deg)]" : "",
                  theme === "dark" ? "border-neutral-700 bg-neutral-900" : "border-neutral-300 bg-white"
                )}>
                  {/* Front */}
                  <div className="absolute inset-0 grid place-items-center [backface-visibility:hidden]">
                    <div>
                      <p className={classNames("text-xs uppercase tracking-wide", theme === "dark" ? "text-neutral-400" : "text-neutral-500")}>
                        English
                      </p>
                      <p className="mt-2 text-3xl font-semibold">{currentCard.front}</p>
                      <p className={classNames("mt-2 text-sm", theme === "dark" ? "text-neutral-500" : "text-neutral-600")}>
                        Deck: {currentCard.deck}
                      </p>
                      <MasteryBadge box={progress?.boxes[currentCard.id] ?? 1} />
                    </div>
                  </div>
                  {/* Back */}
                  <div className="absolute inset-0 grid place-items-center [backface-visibility:hidden] [transform:rotateY(180deg)]">
                    <div>
                      <p className={classNames("text-xs uppercase tracking-wide", theme === "dark" ? "text-neutral-400" : "text-neutral-500")}>
                        Español
                      </p>
                      <p className="mt-2 text-3xl font-semibold">{currentCard.back}</p>
                      <p className={classNames("mt-2 text-sm", theme === "dark" ? "text-neutral-500" : "text-neutral-600")}>
                        Tap to flip back
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Review actions */}
              <div className="mt-4 flex items-center justify-center gap-2">
                <button
                  onClick={() => record("again")}
                  className={classNames(
                    "rounded-xl border px-4 py-2 text-sm transition-colors",
                    theme === "dark"
                      ? "border-red-700 bg-red-950/40 hover:bg-red-900/40 text-red-300"
                      : "border-red-400 hover:bg-red-100 text-red-700"
                  )}
                >
                  Again
                </button>
                <button
                  onClick={() => record("good")}
                  className={classNames(
                    "rounded-xl border px-4 py-2 text-sm transition-colors",
                    theme === "dark"
                      ? "border-teal-700 bg-teal-950/40 hover:bg-teal-900/40 text-teal-300"
                      : "border-teal-400 hover:bg-teal-100 text-teal-700"
                  )}
                >
                  Good
                </button>
                <button
                  onClick={() => record("easy")}
                  className={classNames(
                    "rounded-xl border px-4 py-2 text-sm transition-colors",
                    theme === "dark"
                      ? "border-emerald-700 bg-emerald-950/40 hover:bg-emerald-900/40 text-emerald-300"
                      : "border-emerald-400 hover:bg-emerald-100 text-emerald-700"
                  )}
                >
                  Easy
                </button>
              </div>

              {/* Queue info */}
              <p className={classNames("mt-3 text-center text-sm", theme === "dark" ? "text-neutral-400" : "text-neutral-600")}>
                {queue.length} cards left in queue • Box {progress?.boxes[currentCard.id] ?? 1}
              </p>

              {/* AI Sentence Generation */}
              <div className="mt-6 text-center">
                <button
                  onClick={generateSentence}
                  disabled={isGenerating}
                  className={classNames(
                    "rounded-xl border px-4 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                    theme === "dark"
                      ? "border-purple-700 bg-purple-950/40 text-purple-300 hover:bg-purple-900/40"
                      : "border-purple-400 bg-purple-100 text-purple-700 hover:bg-purple-200"
                  )}
                >
                  {isGenerating ? "Generating..." : "✨ Generate Example"}
                </button>

                {generationError && (
                  <p className="mt-2 text-sm text-red-400">{generationError}</p>
                )}

                {sentence && (
                  <div className={classNames(
                    "mt-4 rounded-lg p-4 text-left text-sm",
                    theme === "dark" ? "bg-neutral-800" : "bg-neutral-100"
                  )}>
                    <p className="whitespace-pre-wrap font-mono">{sentence}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <EmptyState theme={theme} />
          )}
        </section>

        {/* Reference tables */}
        {showReference && (
          <section className="mt-10">
            <h2 className="text-xl font-semibold">Reference Tables</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <RefTable title="Basic Phrases" rows={BASICS} theme={theme} />
              <RefTable title="Days of the Week" rows={DAYS} theme={theme} />
              <RefTable title="Months" rows={MONTHS} theme={theme} />
              <RefTable title="Colors" rows={COLORS} theme={theme} />
            </div>
          </section>
        )}

        {/* Mini About */}
        <footer className={classNames(
          "mt-16 border-t pt-6 text-sm",
          theme === "dark" ? "border-neutral-800 text-neutral-400" : "border-neutral-300 text-neutral-600"
        )}>
          <p>
            Built to support Spanish learning with spaced repetition, streak tracking, and progress visualization.
            Uses the Leitner box system for optimal memory retention. Production by David Iphy
          </p>
        </footer>
      </div>
    </main>
  );
}

function MasteryBadge({ box }: { box: number }) {
  const colors = [
    "bg-neutral-400", // Box 1
    "bg-blue-400",    // Box 2
    "bg-indigo-400",  // Box 3
    "bg-teal-400",    // Box 4
    "bg-emerald-500"  // Box 5
  ];
  return (
    <div className="mt-3 flex justify-center gap-1">
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          className={classNames(
            "h-2 w-2 rounded-full transition-all duration-300",
            i < box ? colors[Math.min(i, 4)] : "bg-neutral-600"
          )}
        />
      ))}
    </div>
  );
}

function EmptyState({ theme }: { theme: "dark" | "light" }) {
  return (
    <div className={classNames(
      "mx-auto max-w-xl rounded-2xl border p-6 text-center",
      theme === "dark" ? "border-neutral-800 bg-neutral-900" : "border-neutral-300 bg-white"
    )}>
      <h3 className="text-lg font-semibold">All caught up! 🎉</h3>
      <p className={classNames("mt-2", theme === "dark" ? "text-neutral-400" : "text-neutral-600")}>
        No cards are due right now for the selected deck. Check back later or switch decks to continue studying.
      </p>
    </div>
  );
}

function StatCard({ label, value, hint, theme }: { label: string; value: string; hint?: string; theme: "dark" | "light" }) {
  return (
    <div className={classNames(
      "rounded-2xl border p-4",
      theme === "dark" ? "border-neutral-800 bg-neutral-900" : "border-neutral-300 bg-neutral-100"
    )}>
      <p className={classNames(
        "text-xs uppercase tracking-wide",
        theme === "dark" ? "text-neutral-400" : "text-neutral-600"
      )}>{label}</p>
      <p className={classNames(
        "mt-2 text-2xl font-semibold",
        theme === "dark" ? "text-white" : "text-black"
      )}>{value}</p>
      {hint && <p className={classNames(
        "mt-1 text-xs",
        theme === "dark" ? "text-neutral-500" : "text-neutral-500"
      )}>{hint}</p>}
    </div>
  );
}

function RefTable({ title, rows, theme }: { title: string; rows: Card[]; theme: "dark" | "light" }) {
  return (
    <div className={classNames(
      "rounded-2xl border p-4",
      theme === "dark" ? "border-neutral-800 bg-neutral-900" : "border-neutral-300 bg-white"
    )}>
      <h3 className={classNames("text-sm font-semibold mb-3", theme === "dark" ? "text-neutral-200" : "text-neutral-800")}>
        {title}
      </h3>
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {rows.map((r) => (
          <div key={r.id} className={classNames(
            "flex justify-between text-sm py-1 border-b",
            theme === "dark" ? "border-neutral-800" : "border-neutral-200"
          )}>
            <span>{r.front}</span>
            <span className={theme === "dark" ? "text-neutral-300" : "text-neutral-700"}>{r.back}</span>
          </div>
        ))}
      </div>
    </div>
  );
}