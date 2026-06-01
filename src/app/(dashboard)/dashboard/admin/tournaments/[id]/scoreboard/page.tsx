"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Maximize, Download } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Score {
  ippon: number;
  wazaAri: number;
  yuko: number;
  shido: number;
}
type Fighter = "A" | "B";

const MATCH_SECONDS      = 4 * 60;
const OSAEKOMI_IPPON_S   = 20;
const OSAEKOMI_WAZAARI_S = 10;

const emptyScore = (): Score => ({ ippon: 0, wazaAri: 0, yuko: 0, shido: 0 });

function fmt(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

// ─── Inner scoreboard ─────────────────────────────────────────────────────────
function ScoreboardInner() {
  const sp = useSearchParams();

  const fighterAId      = sp.get("fighterAId")      || "";
  const fighterBId      = sp.get("fighterBId")      || "";
  const fighterAName    = sp.get("fighterAName")    || "FIGHTER WHITE";
  const fighterBName    = sp.get("fighterBName")    || "FIGHTER BLUE";
  const fighterAClub    = sp.get("fighterAClub")    || "Club A";
  const fighterBClub    = sp.get("fighterBClub")    || "Club B";
  const weightCategory  = sp.get("weightCategory")  || "— kg";
  const matchNumber     = sp.get("matchNumber")     || "1";
  const matNumber       = sp.get("matNumber")       || "1";
  const tournamentTitle = sp.get("tournamentTitle") || "TNJA Championship";

  const [scoreA, setScoreA] = useState<Score>(emptyScore());
  const [scoreB, setScoreB] = useState<Score>(emptyScore());
  const [winner, setWinner] = useState<Fighter | null>(null);
  const [winMethod, setWinMethod] = useState("");

  const [timeLeft, setTimeLeft]         = useState(MATCH_SECONDS);
  const [durationInput, setDurationInput] = useState(4);
  const [running, setRunning]           = useState(false);
  const [timerStarted, setTimerStarted] = useState(false);
  const [goldenScore, setGoldenScore]   = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [osaActive, setOsaActive] = useState(false);
  const [osaFor, setOsaFor]       = useState<Fighter | null>(null);
  const [osaTime, setOsaTime]     = useState(0);
  const osaRef         = useRef<ReturnType<typeof setInterval> | null>(null);
  const osaMilestones  = useRef({ wazaAri: false });

  const [resultSent, setResultSent] = useState(false);

  const checkWin = useCallback(
    (sA: Score, sB: Score): { w: Fighter | null; m: string } => {
      if (sA.ippon >= 1)   return { w: "A", m: "Ippon" };
      if (sB.ippon >= 1)   return { w: "B", m: "Ippon" };
      if (sA.wazaAri >= 2) return { w: "A", m: "Ippon (2× Waza-ari)" };
      if (sB.wazaAri >= 2) return { w: "B", m: "Ippon (2× Waza-ari)" };
      if (sA.shido >= 3)   return { w: "B", m: "Hansoku-make (3× Shido)" };
      if (sB.shido >= 3)   return { w: "A", m: "Hansoku-make (3× Shido)" };
      return { w: null, m: "" };
    }, []
  );

  const sendResultToBracket = useCallback((f: Fighter, method: string) => {
    const matchId = sp.get("matchId") || "";
    if (!matchId) return;
    const winnerId   = f === "A" ? fighterAId   : fighterBId;
    const winnerName = f === "A" ? fighterAName : fighterBName;
    const winnerClub = f === "A" ? fighterAClub : fighterBClub;
    const channel = new BroadcastChannel("tnja_match_results");
    channel.postMessage({ matchId, winnerId, winnerName, winnerClub, winMethod: method });
    channel.close();
    setResultSent(true);
  }, [sp, fighterAId, fighterBId, fighterAName, fighterBName, fighterAClub, fighterBClub]);

  const declareWinner = useCallback((f: Fighter, method: string) => {
    setWinner(f); setWinMethod(method); setRunning(false); setOsaActive(false);
    if (timerRef.current) clearInterval(timerRef.current);
    if (osaRef.current)   clearInterval(osaRef.current);
  }, []);

  const canScore = running && !winner;

  const addScore = useCallback((fighter: Fighter, field: keyof Score) => {
    if (!canScore) return;
    setRunning(false);
    if (fighter === "A") {
      setScoreA((prev) => {
        const next = { ...prev, [field]: prev[field] + 1 };
        const { w, m } = checkWin(next, scoreB);
        if (w) setTimeout(() => declareWinner(w, m), 50);
        return next;
      });
    } else {
      setScoreB((prev) => {
        const next = { ...prev, [field]: prev[field] + 1 };
        const { w, m } = checkWin(scoreA, next);
        if (w) setTimeout(() => declareWinner(w, m), 50);
        return next;
      });
    }
  }, [running, canScore, scoreA, scoreB, checkWin, declareWinner]);

  const undoScore = (fighter: Fighter, field: keyof Score) => {
    if (winner) return;
    if (fighter === "A") setScoreA((p) => ({ ...p, [field]: Math.max(0, p[field] - 1) }));
    else                 setScoreB((p) => ({ ...p, [field]: Math.max(0, p[field] - 1) }));
  };

  const toggleTimer = () => {
    if (winner) return;
    if (!running) { setRunning(true); setTimerStarted(true); }
    else          { setRunning(false); }
  };

  const stopTimer = () => setRunning(false);

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
  }, [running]);

  useEffect(() => {
    if (osaActive && osaFor) {
      osaRef.current = setInterval(() => {
        setOsaTime((t) => {
          const next = t + 1;
          if (next === OSAEKOMI_WAZAARI_S && !osaMilestones.current.wazaAri) {
            osaMilestones.current.wazaAri = true;
            if (osaFor === "A") setScoreA((p) => { const nx = { ...p, wazaAri: p.wazaAri + 1 }; const { w, m } = checkWin(nx, scoreB); if (w) setTimeout(() => declareWinner(w, m), 50); return nx; });
            else                setScoreB((p) => { const nx = { ...p, wazaAri: p.wazaAri + 1 }; const { w, m } = checkWin(scoreA, nx); if (w) setTimeout(() => declareWinner(w, m), 50); return nx; });
          }
          if (next >= OSAEKOMI_IPPON_S) {
            clearInterval(osaRef.current!); setOsaActive(false); setRunning(false);
            if (osaFor === "A") setScoreA((p) => { const nx = { ...p, ippon: p.ippon + 1 }; setTimeout(() => declareWinner("A", "Ippon (Osaekomi 20s)"), 50); return nx; });
            else                setScoreB((p) => { const nx = { ...p, ippon: p.ippon + 1 }; setTimeout(() => declareWinner("B", "Ippon (Osaekomi 20s)"), 50); return nx; });
            return next;
          }
          return next;
        });
      }, 1000);
    } else {
      if (osaRef.current) clearInterval(osaRef.current);
    }
    return () => { if (osaRef.current) clearInterval(osaRef.current); };
  }, [osaActive, osaFor, scoreA, scoreB, checkWin, declareWinner]);

  const startOsaekomi = (fighter: Fighter) => {
    if (winner) return;
    setOsaActive(true); setOsaFor(fighter); setOsaTime(0);
    osaMilestones.current = { wazaAri: false };
    if (!running) setRunning(true);
  };

  const toketa = () => { setOsaActive(false); setOsaFor(null); setOsaTime(0); if (osaRef.current) clearInterval(osaRef.current); };

  const handleTimeUp = () => {
    const aScore = scoreA.wazaAri * 10 + scoreA.yuko + scoreA.ippon * 100;
    const bScore = scoreB.wazaAri * 10 + scoreB.yuko + scoreB.ippon * 100;
    if (aScore > bScore) declareWinner("A", "Decision");
    else if (bScore > aScore) declareWinner("B", "Decision");
    else { setGoldenScore(true); setTimeLeft(MATCH_SECONDS); }
  };

  const resetAll = () => {
    setScoreA(emptyScore()); setScoreB(emptyScore());
    setWinner(null); setWinMethod(""); setResultSent(false);
    setGoldenScore(false); setTimeLeft(durationInput * 60);
    setRunning(false); setTimerStarted(false); toketa();
  };

  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value) || 0;
    setDurationInput(val);
    if (!timerStarted) setTimeLeft(val * 60);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    else document.exitFullscreen();
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[9999] bg-[#0a0a0a] flex flex-col font-sans select-none overflow-hidden">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-2 bg-[#111] border-b border-white/10 shrink-0">
        <div className="text-[#FF7400] text-[10px] font-black uppercase tracking-[0.2em]">TNJA</div>
        <h1 className="text-white/80 text-xs font-bold text-center truncate flex-grow mx-6">{tournamentTitle}</h1>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-white/40 bg-white/5 px-2.5 py-1 rounded">{weightCategory}</span>
          <span className="text-[10px] font-black text-white/40 bg-white/5 px-2.5 py-1 rounded">MAT {matNumber}</span>
          <span className="text-[10px] font-black text-white/40 bg-white/5 px-2.5 py-1 rounded">#{matchNumber}</span>
          <button onClick={toggleFullscreen} className="ml-1 text-white/30 hover:text-white transition-colors">
            <Maximize size={13} />
          </button>
        </div>
      </div>

      {/* Golden Score strip */}
      {goldenScore && (
        <div className="bg-amber-500 text-black text-[10px] font-black text-center py-1 tracking-[0.3em] uppercase animate-pulse shrink-0">
          ⚡ GOLDEN SCORE — SUDDEN DEATH
        </div>
      )}

      {/* ── Main 3-column scoreboard ───────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── WHITE (Fighter A) ── */}
        <div className="flex-1 bg-white flex flex-col">

          {/* Name bar */}
          <div className="px-6 pt-5 pb-4 border-b-2 border-gray-100">
            <div className="text-[9px] font-black text-gray-400 uppercase tracking-[0.25em] mb-1">WHITE</div>
            <div className="text-2xl font-black text-black leading-tight">{fighterAName}</div>
            <div className="text-sm font-bold text-gray-400 mt-0.5">{fighterAClub}</div>
          </div>

          {/* Big scores */}
          <div className="flex justify-center items-end gap-6 px-4 py-5 border-b border-gray-100">
            {/* Ippon */}
            <div className="flex flex-col items-center">
              <div className={`text-[72px] font-black leading-none tabular-nums transition-colors ${scoreA.ippon > 0 ? "text-emerald-600" : "text-gray-200"}`}>{scoreA.ippon}</div>
              <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">Ippon</div>
            </div>
            <div className="w-px h-16 bg-gray-100 self-center" />
            {/* Waza-ari */}
            <div className="flex flex-col items-center">
              <div className={`text-[72px] font-black leading-none tabular-nums transition-colors ${scoreA.wazaAri > 0 ? "text-amber-500" : "text-gray-200"}`}>{scoreA.wazaAri}</div>
              <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">Waza-ari</div>
            </div>
            <div className="w-px h-16 bg-gray-100 self-center" />
            {/* Shido */}
            <div className="flex flex-col items-center">
              <div className={`text-[72px] font-black leading-none tabular-nums transition-colors ${scoreA.shido > 0 ? "text-red-500" : "text-gray-200"}`}>{scoreA.shido}</div>
              <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">Shido</div>
            </div>
          </div>

          {/* Osaekomi indicator */}
          {osaActive && osaFor === "A" && (
            <div className="mx-4 mt-2 bg-amber-400 text-black font-black text-center py-2 rounded-xl text-sm animate-pulse">
              🤼 OSAEKOMI {osaTime}s
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-auto px-4 pb-5 space-y-2">
            <div className="grid grid-cols-4 gap-2">
              <button onClick={() => addScore("A", "ippon")} disabled={!canScore}
                className="py-4 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-black rounded-xl text-xs disabled:opacity-25 transition-all">
                +IPPON
              </button>
              <button onClick={() => addScore("A", "wazaAri")} disabled={!canScore}
                className="py-4 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-black rounded-xl text-xs disabled:opacity-25 transition-all">
                +WAZA
              </button>
              <button onClick={() => addScore("A", "yuko")} disabled={!canScore}
                className="py-4 bg-slate-400 hover:bg-slate-500 active:scale-95 text-white font-black rounded-xl text-xs disabled:opacity-25 transition-all">
                +YUKO
              </button>
              <button onClick={() => addScore("A", "shido")} disabled={!canScore}
                className="py-4 bg-white border-2 border-red-500 text-red-600 hover:bg-red-50 active:scale-95 font-black rounded-xl text-xs disabled:opacity-25 transition-all">
                SHIDO
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => undoScore("A", "ippon")}
                className="py-3 bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-700 font-black rounded-xl text-xs transition-all">
                ↩ UNDO
              </button>
              <button onClick={() => declareWinner("A", "Decision")}
                className="py-3 bg-black hover:bg-gray-900 active:scale-95 text-white font-black rounded-xl text-xs transition-all">
                🏆 WIN — WHITE
              </button>
            </div>
          </div>
        </div>

        {/* ── CENTER — Timer + Osaekomi + Controls ── */}
        <div className="w-[220px] shrink-0 bg-[#0d0d0d] flex flex-col items-center border-x border-white/10">

          {/* Timer */}
          <div className="flex-1 flex flex-col items-center justify-center w-full px-4">
            <div className={`text-[64px] font-black tabular-nums leading-none drop-shadow-lg tracking-tight ${
              goldenScore ? "text-amber-400" : running ? "text-[#ff3333]" : "text-white/60"
            }`}>
              {fmt(timeLeft)}
            </div>
            {goldenScore && <div className="text-amber-400 text-[9px] font-black uppercase tracking-widest mt-1">Golden Score</div>}

            {/* Duration picker (only before start) */}
            {!timerStarted && (
              <div className="flex items-center gap-1.5 mt-3">
                <span className="text-white/30 text-[10px] font-bold">Duration</span>
                <input type="number" value={durationInput} onChange={handleDurationChange}
                  className="w-12 bg-white/10 text-white text-center font-black py-1 rounded text-sm" />
                <span className="text-white/30 text-[10px] font-bold">min</span>
              </div>
            )}

            {/* Start / End */}
            <div className="flex gap-2 w-full mt-4">
              <button onClick={toggleTimer} className={`flex-1 py-3 font-black text-xs rounded-xl transition-all active:scale-95 ${
                running ? "bg-amber-500 text-black" : "bg-emerald-600 text-white hover:bg-emerald-500"
              }`}>
                {running ? "⏸ PAUSE" : "▶ START"}
              </button>
              <button onClick={stopTimer}
                className="flex-1 py-3 bg-red-700 hover:bg-red-600 text-white font-black text-xs rounded-xl transition-all active:scale-95">
                ⏹ END
              </button>
            </div>
          </div>

          {/* Osaekomi controls */}
          <div className="w-full px-3 pb-3 space-y-2">
            <div className="border-t border-white/10 pt-3">
              <div className="text-white/25 text-[8px] font-black uppercase tracking-widest text-center mb-2">Osaekomi</div>
              {osaActive && (
                <div className={`text-center text-3xl font-black tabular-nums mb-2 animate-pulse ${osaTime >= 15 ? "text-emerald-400" : "text-amber-400"}`}>
                  {osaTime}s
                </div>
              )}
              <div className="grid grid-cols-2 gap-1.5">
                <button onClick={() => startOsaekomi("A")} disabled={!!winner}
                  className="py-2.5 bg-white/10 hover:bg-white/20 text-white font-black text-[9px] rounded-lg disabled:opacity-30 active:scale-95 transition-all">
                  WHITE
                </button>
                <button onClick={() => startOsaekomi("B")} disabled={!!winner}
                  className="py-2.5 bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 font-black text-[9px] rounded-lg disabled:opacity-30 active:scale-95 transition-all">
                  BLUE
                </button>
                <button onClick={() => startOsaekomi(osaFor === "A" ? "B" : "A")} disabled={!osaActive || !!winner}
                  className="py-2.5 bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 font-black text-[9px] rounded-lg disabled:opacity-30 active:scale-95 transition-all">
                  SWITCH
                </button>
                <button onClick={toketa} disabled={!osaActive}
                  className="py-2.5 bg-red-600/30 hover:bg-red-600/50 text-red-300 font-black text-[9px] rounded-lg disabled:opacity-30 active:scale-95 transition-all">
                  TOKETA
                </button>
              </div>
            </div>
            <button onClick={resetAll}
              className="w-full py-2 bg-white/5 hover:bg-white/10 text-white/30 hover:text-white font-black text-[9px] rounded-lg transition-all active:scale-95">
              ↺ RESET ALL
            </button>
          </div>
        </div>

        {/* ── BLUE (Fighter B) ── */}
        <div className="flex-1 bg-[#0e2a6e] flex flex-col">

          {/* Name bar */}
          <div className="px-6 pt-5 pb-4 border-b-2 border-blue-800/50">
            <div className="text-[9px] font-black text-blue-400 uppercase tracking-[0.25em] mb-1">BLUE</div>
            <div className="text-2xl font-black text-white leading-tight">{fighterBName}</div>
            <div className="text-sm font-bold text-blue-300 mt-0.5">{fighterBClub}</div>
          </div>

          {/* Big scores */}
          <div className="flex justify-center items-end gap-6 px-4 py-5 border-b border-blue-800/30">
            <div className="flex flex-col items-center">
              <div className={`text-[72px] font-black leading-none tabular-nums transition-colors ${scoreB.ippon > 0 ? "text-emerald-400" : "text-white/15"}`}>{scoreB.ippon}</div>
              <div className="text-[9px] font-black text-blue-400 uppercase tracking-widest mt-1">Ippon</div>
            </div>
            <div className="w-px h-16 bg-blue-800/40 self-center" />
            <div className="flex flex-col items-center">
              <div className={`text-[72px] font-black leading-none tabular-nums transition-colors ${scoreB.wazaAri > 0 ? "text-amber-400" : "text-white/15"}`}>{scoreB.wazaAri}</div>
              <div className="text-[9px] font-black text-blue-400 uppercase tracking-widest mt-1">Waza-ari</div>
            </div>
            <div className="w-px h-16 bg-blue-800/40 self-center" />
            <div className="flex flex-col items-center">
              <div className={`text-[72px] font-black leading-none tabular-nums transition-colors ${scoreB.shido > 0 ? "text-red-400" : "text-white/15"}`}>{scoreB.shido}</div>
              <div className="text-[9px] font-black text-blue-400 uppercase tracking-widest mt-1">Shido</div>
            </div>
          </div>

          {/* Osaekomi indicator */}
          {osaActive && osaFor === "B" && (
            <div className="mx-4 mt-2 bg-amber-400 text-black font-black text-center py-2 rounded-xl text-sm animate-pulse">
              🤼 OSAEKOMI {osaTime}s
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-auto px-4 pb-5 space-y-2">
            <div className="grid grid-cols-4 gap-2">
              <button onClick={() => addScore("B", "ippon")} disabled={!canScore}
                className="py-4 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-black rounded-xl text-xs disabled:opacity-25 transition-all">
                +IPPON
              </button>
              <button onClick={() => addScore("B", "wazaAri")} disabled={!canScore}
                className="py-4 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-black rounded-xl text-xs disabled:opacity-25 transition-all">
                +WAZA
              </button>
              <button onClick={() => addScore("B", "yuko")} disabled={!canScore}
                className="py-4 bg-slate-600 hover:bg-slate-500 active:scale-95 text-white font-black rounded-xl text-xs disabled:opacity-25 transition-all">
                +YUKO
              </button>
              <button onClick={() => addScore("B", "shido")} disabled={!canScore}
                className="py-4 bg-transparent border-2 border-red-400 text-red-300 hover:bg-red-900/30 active:scale-95 font-black rounded-xl text-xs disabled:opacity-25 transition-all">
                SHIDO
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => undoScore("B", "ippon")}
                className="py-3 bg-blue-900/60 hover:bg-blue-900 active:scale-95 text-blue-200 font-black rounded-xl text-xs transition-all">
                ↩ UNDO
              </button>
              <button onClick={() => declareWinner("B", "Decision")}
                className="py-3 bg-blue-500 hover:bg-blue-400 active:scale-95 text-white font-black rounded-xl text-xs transition-all">
                🏆 WIN — BLUE
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom bar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-2 bg-[#111] border-t border-white/10 shrink-0">
        <div className="text-white/20 text-[9px] font-black uppercase tracking-[0.2em]">TNJA © 2026</div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/30 hover:text-white/70 rounded text-[10px] font-bold transition-colors">
            <Download size={10} /> PDF
          </button>
          <button
            onClick={() => winner && sendResultToBracket(winner, winMethod)}
            disabled={!winner || resultSent}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded text-[10px] font-black transition-all active:scale-95 ${
              resultSent ? "bg-emerald-900/50 text-emerald-400 cursor-default" :
              winner ? "bg-[#FF7400] text-white hover:bg-[#E56900] shadow-lg shadow-orange-500/20" :
              "bg-white/5 text-white/20 cursor-not-allowed"
            }`}
          >
            🏆 {resultSent ? "Sent to Bracket ✓" : "Send to Bracket"}
          </button>
        </div>
      </div>

      {/* ── Winner overlay ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {winner && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.75, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 24 }}
              className={`text-center px-10 py-12 max-w-sm w-full mx-6 rounded-3xl shadow-2xl border ${
                winner === "A"
                  ? "bg-white border-gray-200"
                  : "bg-[#0e2a6e] border-blue-700"
              }`}
            >
              {/* Trophy */}
              <motion.div
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
                className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-[#FF7400] rounded-full flex items-center justify-center mx-auto mb-5 shadow-xl shadow-orange-500/30">
                <Trophy size={36} className="text-white" />
              </motion.div>

              <div className={`text-[9px] font-black uppercase tracking-[0.35em] mb-2 ${winner === "A" ? "text-gray-400" : "text-blue-400"}`}>
                {winner === "A" ? "WHITE WINS" : "BLUE WINS"}
              </div>
              <div className={`text-3xl font-black leading-tight mb-1 ${winner === "A" ? "text-black" : "text-white"}`}>
                {winner === "A" ? fighterAName : fighterBName}
              </div>
              <div className={`text-sm font-bold mb-3 ${winner === "A" ? "text-gray-400" : "text-blue-300"}`}>
                {winner === "A" ? fighterAClub : fighterBClub}
              </div>
              <div className={`inline-flex px-4 py-1.5 rounded-xl font-black text-sm mb-7 ${
                winner === "A" ? "bg-black/5 text-black/60" : "bg-white/10 text-white/70"
              }`}>
                {winMethod}
              </div>

              <button
                onClick={() => winner && sendResultToBracket(winner, winMethod)}
                disabled={resultSent}
                className={`w-full py-4 rounded-2xl font-black text-sm transition-all mb-2 active:scale-95 ${
                  resultSent
                    ? "bg-emerald-500/20 text-emerald-400 cursor-default"
                    : "bg-[#FF7400] hover:bg-[#E56900] text-white shadow-lg shadow-orange-500/20"
                }`}
              >
                {resultSent ? "✓ Result Sent to Bracket" : "🏆 Send Result to Bracket"}
              </button>
              <button onClick={resetAll}
                className={`w-full py-3 rounded-2xl font-black text-sm transition-all active:scale-95 ${
                  winner === "A" ? "bg-black/5 hover:bg-black/10 text-black/50" : "bg-white/10 hover:bg-white/15 text-white/50"
                }`}>
                ↺ New Match / Reset
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ScoreboardPage() {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 z-[9999] bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-white/30 text-xs font-black uppercase tracking-[0.3em]">Loading scoreboard...</div>
      </div>
    }>
      <ScoreboardInner />
    </Suspense>
  );
}
