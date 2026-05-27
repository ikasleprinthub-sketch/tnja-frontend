"use client";

import React, { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, Trophy, Flag, Timer } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Score {
  ippon: number;
  wazaAri: number;
  yuko: number;
  shido: number;
}
type Fighter = "A" | "B";

const MATCH_SECONDS = 4 * 60;       // 4:00
const OSAEKOMI_IPPON_S = 20;        // 20s hold → Ippon
const OSAEKOMI_WAZAARI_S = 10;      // 10s hold → Waza-ari

const emptyScore = (): Score => ({ ippon: 0, wazaAri: 0, yuko: 0, shido: 0 });

function fmt(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

// ─── Inner scoreboard (needs Suspense for useSearchParams) ────────────────────
function ScoreboardInner() {
  const sp = useSearchParams();

  const fighterAName   = sp.get("fighterAName")   || "Fighter A";
  const fighterBName   = sp.get("fighterBName")   || "Fighter B";
  const fighterAClub   = sp.get("fighterAClub")   || "";
  const fighterBClub   = sp.get("fighterBClub")   || "";
  const weightCategory = sp.get("weightCategory") || "";
  const matchNumber    = sp.get("matchNumber")    || "1";
  const matNumber      = sp.get("matNumber")      || "1";
  const tournamentTitle = sp.get("tournamentTitle") || "TNJA Championship";

  // ── Score state ────────────────────────────────────────────────────────────
  const [scoreA, setScoreA] = useState<Score>(emptyScore());
  const [scoreB, setScoreB] = useState<Score>(emptyScore());
  const [winner, setWinner] = useState<Fighter | null>(null);
  const [winMethod, setWinMethod] = useState("");

  // ── Timer ──────────────────────────────────────────────────────────────────
  const [timeLeft, setTimeLeft] = useState(MATCH_SECONDS);
  const [running, setRunning] = useState(false);
  const [goldenScore, setGoldenScore] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Osaekomi ───────────────────────────────────────────────────────────────
  const [osaActive, setOsaActive] = useState(false);
  const [osaFor, setOsaFor]       = useState<Fighter | null>(null);
  const [osaTime, setOsaTime]     = useState(0);
  const osaRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // track which milestones have been auto-awarded per osaekomi session
  const osaMilestonesRef = useRef({ wazaAri: false });

  // ── Auto-win checker ────────────────────────────────────────────────────────
  const checkWin = useCallback((sA: Score, sB: Score): { w: Fighter | null; m: string } => {
    if (sA.ippon >= 1)    return { w: "A", m: "Ippon" };
    if (sB.ippon >= 1)    return { w: "B", m: "Ippon" };
    if (sA.wazaAri >= 2)  return { w: "A", m: "Ippon (2× Waza-ari)" };
    if (sB.wazaAri >= 2)  return { w: "B", m: "Ippon (2× Waza-ari)" };
    if (sA.shido >= 3)    return { w: "B", m: "Hansoku-make (3× Shido)" };
    if (sB.shido >= 3)    return { w: "A", m: "Hansoku-make (3× Shido)" };
    return { w: null, m: "" };
  }, []);

  const declareWinner = useCallback((f: Fighter, method: string) => {
    setWinner(f);
    setWinMethod(method);
    setRunning(false);
    setOsaActive(false);
    if (timerRef.current)  clearInterval(timerRef.current);
    if (osaRef.current)    clearInterval(osaRef.current);
  }, []);

  // ── Add / undo score ────────────────────────────────────────────────────────
  const addScore = useCallback((fighter: Fighter, field: keyof Score) => {
    if (winner) return;
    if (fighter === "A") {
      setScoreA((prev) => {
        const next = { ...prev, [field]: prev[field] + 1 };
        const { w, m } = checkWin(next, scoreB);
        if (w) setTimeout(() => declareWinner(w, m), 0);
        return next;
      });
    } else {
      setScoreB((prev) => {
        const next = { ...prev, [field]: prev[field] + 1 };
        const { w, m } = checkWin(scoreA, next);
        if (w) setTimeout(() => declareWinner(w, m), 0);
        return next;
      });
    }
  }, [winner, scoreA, scoreB, checkWin, declareWinner]);

  const undoScore = (fighter: Fighter, field: keyof Score) => {
    if (winner) return;
    if (fighter === "A") setScoreA((p) => ({ ...p, [field]: Math.max(0, p[field] - 1) }));
    else                 setScoreB((p) => ({ ...p, [field]: Math.max(0, p[field] - 1) }));
  };

  // ── Timer tick ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (running) {
      timerRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) {
            clearInterval(timerRef.current!);
            setRunning(false);
            handleTimeUp();
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  // ── Osaekomi tick ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (osaActive && osaFor) {
      osaRef.current = setInterval(() => {
        setOsaTime((t) => {
          const next = t + 1;
          // Auto-award Waza-ari at 10s
          if (next === OSAEKOMI_WAZAARI_S && !osaMilestonesRef.current.wazaAri) {
            osaMilestonesRef.current.wazaAri = true;
            addScore(osaFor, "wazaAri");
          }
          // Auto-award Ippon at 20s
          if (next >= OSAEKOMI_IPPON_S) {
            clearInterval(osaRef.current!);
            setOsaActive(false);
            addScore(osaFor, "ippon");
            return next;
          }
          return next;
        });
      }, 1000);
    } else {
      if (osaRef.current) clearInterval(osaRef.current);
    }
    return () => { if (osaRef.current) clearInterval(osaRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [osaActive, osaFor]);

  const startOsaekomi = (fighter: Fighter) => {
    if (winner) return;
    setOsaActive(true);
    setOsaFor(fighter);
    setOsaTime(0);
    osaMilestonesRef.current = { wazaAri: false };
  };

  const toketa = () => {
    setOsaActive(false);
    setOsaFor(null);
    setOsaTime(0);
    if (osaRef.current) clearInterval(osaRef.current);
  };

  const handleTimeUp = () => {
    const aScore = scoreA.wazaAri * 10 + scoreA.yuko + scoreA.ippon * 100;
    const bScore = scoreB.wazaAri * 10 + scoreB.yuko + scoreB.ippon * 100;
    if (aScore > bScore)      declareWinner("A", "Decision");
    else if (bScore > aScore) declareWinner("B", "Decision");
    else {
      // Tie → Golden Score
      setGoldenScore(true);
      setTimeLeft(MATCH_SECONDS);
    }
  };

  const resetAll = () => {
    setScoreA(emptyScore()); setScoreB(emptyScore());
    setWinner(null); setWinMethod("");
    setGoldenScore(false); setTimeLeft(MATCH_SECONDS);
    setRunning(false); toketa();
  };

  const matchEnded = winner !== null;

  // ─── Render ────────────────────────────────────────────────────────────────
  // fixed inset-0 z-[9999] makes it fullscreen over any parent layout
  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950 text-white flex flex-col select-none">

      {/* ── Header bar ──────────────────────────────────────────────────────── */}
      <div className="shrink-0 bg-slate-900 border-b border-slate-800 py-3 px-6 text-center">
        <p className="text-xs font-black text-slate-300 uppercase tracking-widest truncate">
          {tournamentTitle}
        </p>
        <div className="flex items-center justify-center gap-4 mt-0.5">
          <span className="text-[10px] font-bold text-slate-500">Mat {matNumber}</span>
          <span className="text-slate-700">·</span>
          <span className="text-[10px] font-bold text-slate-500">Match #{matchNumber}</span>
          {weightCategory && <>
            <span className="text-slate-700">·</span>
            <span className="text-[10px] font-bold text-orange-400">{weightCategory}</span>
          </>}
          {goldenScore && (
            <span className="text-[10px] font-black text-yellow-400 bg-yellow-400/10 px-3 py-0.5 rounded-full animate-pulse">
              ⚡ GOLDEN SCORE
            </span>
          )}
        </div>
      </div>

      {/* ── Main layout: A | Center | B ────────────────────────────────────── */}
      <div className="flex-grow flex flex-col md:flex-row min-h-0">

        {/* Fighter A — BLUE */}
        <FighterPanel
          fighter="A"
          name={fighterAName}
          club={fighterAClub}
          side="blue"
          score={scoreA}
          isWinner={winner === "A"}
          matchEnded={matchEnded}
          onAddScore={(f) => addScore("A", f)}
          onUndoScore={(f) => undoScore("A", f)}
          onDeclareWinner={() => declareWinner("A", "Referee Decision")}
          onStartOsa={() => startOsaekomi("A")}
          osaActive={osaActive && osaFor === "A"}
        />

        {/* ── Center column ─────────────────────────────────────────────────── */}
        <div className="shrink-0 flex flex-col items-center justify-between gap-4 py-6 px-5 bg-slate-900 border-x border-slate-800 w-full md:w-52">

          {/* Timer */}
          <div className="text-center w-full">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">
              {goldenScore ? "Golden Score" : "Match Timer"}
            </p>
            <div className={`text-6xl font-black tabular-nums leading-none ${timeLeft <= 30 && !goldenScore ? "text-red-400" : "text-white"}`}>
              {fmt(timeLeft)}
            </div>

            {/* Timer buttons */}
            {!matchEnded && (
              <div className="flex gap-2 justify-center mt-3">
                {!running ? (
                  <button onClick={() => setRunning(true)}
                    className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 rounded-xl font-black text-sm transition-all">
                    ▶ Start
                  </button>
                ) : (
                  <button onClick={() => setRunning(false)}
                    className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 rounded-xl font-black text-sm transition-all">
                    ⏸ Pause
                  </button>
                )}
                <button onClick={() => { setRunning(false); setTimeLeft(MATCH_SECONDS); setGoldenScore(false); }}
                  className="p-2.5 bg-slate-700 hover:bg-slate-600 rounded-xl transition-all">
                  <RotateCcw size={15} />
                </button>
              </div>
            )}
          </div>

          {/* Osaekomi */}
          {!matchEnded && (
            <div className="w-full bg-slate-800 rounded-2xl p-4 space-y-3">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider text-center">
                Osaekomi (Ground Hold)
              </p>

              {osaActive ? (
                <>
                  {/* Progress bar */}
                  <div className="text-center">
                    <p className="text-4xl font-black text-orange-400 tabular-nums">{osaTime}s</p>
                    <p className="text-[9px] text-slate-400 mt-0.5">
                      {osaFor === "A" ? fighterAName.split(" ")[0] : fighterBName.split(" ")[0]} holding
                    </p>
                    <div className="w-full bg-slate-700 rounded-full h-2 mt-2">
                      <div
                        className={`h-2 rounded-full transition-all ${osaTime >= OSAEKOMI_WAZAARI_S ? "bg-orange-500" : "bg-blue-500"}`}
                        style={{ width: `${(osaTime / OSAEKOMI_IPPON_S) * 100}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[8px] text-slate-500 mt-0.5 px-0.5">
                      <span>0s</span>
                      <span className="text-amber-400">10s=W</span>
                      <span className="text-orange-400">20s=I</span>
                    </div>
                  </div>
                  <button onClick={toketa}
                    className="w-full py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl text-xs font-black transition-colors">
                    Toketa (Escaped)
                  </button>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => startOsaekomi("A")}
                    className="py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-xl text-[10px] font-black transition-colors">
                    {fighterAName.split(" ")[0]}
                  </button>
                  <button onClick={() => startOsaekomi("B")}
                    className="py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl text-[10px] font-black transition-colors">
                    {fighterBName.split(" ")[0]}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Rules reminder */}
          <div className="w-full space-y-1 text-center">
            {[
              "2 Waza-ari → Ippon (auto)",
              "3 Shido → Hansoku-make (auto)",
              "10s hold → Waza-ari",
              "20s hold → Ippon",
            ].map((r) => (
              <p key={r} className="text-[9px] text-slate-600 font-semibold">{r}</p>
            ))}
          </div>

          {/* Reset */}
          {!matchEnded && (
            <button onClick={resetAll}
              className="text-[10px] text-slate-600 hover:text-slate-400 font-bold transition-colors">
              ↺ Reset Match
            </button>
          )}
        </div>

        {/* Fighter B — WHITE/RED */}
        <FighterPanel
          fighter="B"
          name={fighterBName}
          club={fighterBClub}
          side="red"
          score={scoreB}
          isWinner={winner === "B"}
          matchEnded={matchEnded}
          onAddScore={(f) => addScore("B", f)}
          onUndoScore={(f) => undoScore("B", f)}
          onDeclareWinner={() => declareWinner("B", "Referee Decision")}
          onStartOsa={() => startOsaekomi("B")}
          osaActive={osaActive && osaFor === "B"}
        />
      </div>

      {/* ── Winner overlay ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {winner && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-3xl p-10 text-center shadow-2xl max-w-sm w-full mx-6">
              <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-5 shadow-2xl shadow-orange-500/40">
                <Trophy size={36} className="text-white" />
              </div>
              <p className="text-slate-500 font-black uppercase tracking-widest text-[10px] mb-2">
                Winner — {winner === "A" ? "Blue" : "White"}
              </p>
              <h2 className="text-2xl font-black text-white leading-tight mb-1">
                {winner === "A" ? fighterAName : fighterBName}
              </h2>
              <p className="text-slate-400 font-bold text-sm mb-3">
                {winner === "A" ? fighterAClub : fighterBClub}
              </p>
              <div className="px-4 py-2 bg-orange-500/20 rounded-2xl text-orange-400 font-black text-sm mb-6 inline-block">
                {winMethod}
              </div>

              {/* Final scores */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                {[
                  { label: fighterAName.split(" ")[0], score: scoreA, side: "blue" },
                  { label: fighterBName.split(" ")[0], score: scoreB, side: "red" },
                ].map(({ label, score, side }) => (
                  <div key={label} className={`p-3 rounded-2xl ${side === "blue" ? "bg-blue-900/30" : "bg-red-900/30"}`}>
                    <p className={`text-xs font-black mb-2 ${side === "blue" ? "text-blue-400" : "text-red-400"}`}>{label}</p>
                    <p className="text-[9px] text-slate-400">I:{score.ippon} W:{score.wazaAri} Y:{score.yuko} S:{score.shido}</p>
                  </div>
                ))}
              </div>

              <button onClick={resetAll}
                className="w-full py-3 bg-slate-700 hover:bg-slate-600 rounded-2xl font-black text-sm transition-all">
                New Match / Reset
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Fighter Panel ────────────────────────────────────────────────────────────
interface FighterPanelProps {
  fighter: Fighter; name: string; club: string;
  side: "blue" | "red"; score: Score;
  isWinner: boolean; matchEnded: boolean;
  onAddScore: (f: keyof Score) => void;
  onUndoScore: (f: keyof Score) => void;
  onDeclareWinner: () => void;
  onStartOsa: () => void;
  osaActive: boolean;
}

function FighterPanel({
  fighter, name, club, side, score, isWinner, matchEnded,
  onAddScore, onUndoScore, onDeclareWinner, onStartOsa, osaActive,
}: FighterPanelProps) {
  const isBlue = side === "blue";
  const c = isBlue
    ? { panel: "bg-blue-950/40", badge: "bg-blue-500", text: "text-blue-400", ring: "ring-blue-500" }
    : { panel: "bg-red-950/40",  badge: "bg-red-500",  text: "text-red-400",  ring: "ring-red-500" };

  return (
    <div className={`flex-1 flex flex-col p-5 gap-4 ${c.panel} ${isWinner ? `ring-4 ${c.ring} ring-opacity-60` : ""}`}>

      {/* Name card */}
      <div className={`rounded-2xl p-4 text-center border ${isBlue ? "border-blue-800/40 bg-blue-900/20" : "border-red-800/40 bg-red-900/20"} ${isWinner ? "border-amber-400/50" : ""}`}>
        {isWinner && <p className="text-amber-400 font-black text-[10px] uppercase tracking-widest mb-1">🏆 Winner</p>}
        <h2 className="text-xl font-black text-white leading-tight">{name}</h2>
        {club && <p className={`text-sm font-bold ${c.text} mt-0.5`}>{club}</p>}
        <span className={`mt-2 inline-block text-[10px] font-black px-3 py-0.5 rounded-full ${c.badge} text-white`}>
          {isBlue ? "BLUE" : "WHITE"}
        </span>
      </div>

      {/* Score display — 2×2 grid */}
      <div className="grid grid-cols-2 gap-3 flex-grow">
        {([
          { key: "ippon" as const,   label: "IPPON",    color: "text-yellow-400", bg: "bg-yellow-400/10 border border-yellow-400/20" },
          { key: "wazaAri" as const, label: "WAZA-ARI", color: "text-orange-400", bg: "bg-orange-400/10 border border-orange-400/20" },
          { key: "yuko" as const,    label: "YUKO",     color: "text-slate-300",  bg: "bg-slate-700/60" },
          { key: "shido" as const,   label: "SHIDO",    color: "text-red-400",    bg: "bg-red-400/10 border border-red-400/20" },
        ]).map(({ key, label, color, bg }) => (
          <div key={key} className={`${bg} rounded-2xl p-4 text-center`}>
            <p className={`text-5xl font-black tabular-nums ${color}`}>{score[key]}</p>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider mt-1.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Scoring controls */}
      {!matchEnded && (
        <div className="space-y-2">
          {/* Add buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => onAddScore("ippon")}
              className="py-3 bg-yellow-500 hover:bg-yellow-400 rounded-xl text-sm font-black text-slate-900 hover:scale-105 active:scale-95 transition-all">
              + Ippon
            </button>
            <button onClick={() => onAddScore("wazaAri")}
              className="py-3 bg-orange-500 hover:bg-orange-400 rounded-xl text-sm font-black text-white hover:scale-105 active:scale-95 transition-all">
              + Waza-ari
            </button>
            <button onClick={() => onAddScore("yuko")}
              className="py-3 bg-slate-600 hover:bg-slate-500 rounded-xl text-sm font-black text-white hover:scale-105 active:scale-95 transition-all">
              + Yuko
            </button>
            <button onClick={() => onAddScore("shido")}
              className="py-3 bg-red-600 hover:bg-red-500 rounded-xl text-sm font-black text-white hover:scale-105 active:scale-95 transition-all">
              + Shido
            </button>
          </div>

          {/* Undo buttons */}
          <div className="grid grid-cols-2 gap-2">
            {(["ippon", "wazaAri", "yuko", "shido"] as const).map((f) => (
              <button key={f} onClick={() => onUndoScore(f)}
                className="py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl text-[9px] font-black transition-colors">
                Undo {f === "wazaAri" ? "W-A" : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* Osaekomi button */}
          <button onClick={onStartOsa} disabled={osaActive}
            className={`w-full py-2.5 rounded-xl text-xs font-black transition-all ${
              osaActive
                ? "bg-orange-500/20 text-orange-400 cursor-not-allowed"
                : isBlue
                  ? "bg-blue-600/30 text-blue-300 hover:bg-blue-600/40"
                  : "bg-red-600/30 text-red-300 hover:bg-red-600/40"
            }`}>
            {osaActive ? "⏱ Holding..." : "⏱ Start Osaekomi (Hold)"}
          </button>

          {/* Declare winner (referee decision) */}
          <button onClick={onDeclareWinner}
            className={`w-full py-2.5 ${isBlue ? "bg-blue-600 hover:bg-blue-500" : "bg-red-600 hover:bg-red-500"} rounded-xl text-xs font-black text-white hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-1.5`}>
            <Trophy size={13} /> Declare Winner
          </button>

          {/* Red card / Hansoku-make */}
          <button onClick={() => onAddScore("shido")}
            className="w-full py-2 bg-red-700/30 hover:bg-red-700/50 text-red-400 rounded-xl text-[10px] font-black transition-colors flex items-center justify-center gap-1.5">
            <Flag size={11} /> Red Card (Hansoku-make)
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Page export with Suspense ────────────────────────────────────────────────
export default function ScoreboardPage() {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 z-[9999] bg-slate-950 flex items-center justify-center">
        <div className="text-white text-xl font-black">Loading scoreboard...</div>
      </div>
    }>
      <ScoreboardInner />
    </Suspense>
  );
}
