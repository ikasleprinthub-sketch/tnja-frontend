"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Maximize, Save, Download, RefreshCw } from "lucide-react";

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

  // A is White (Left), B is Blue (Right)
  const fighterAName    = sp.get("fighterAName")    || "BHAVANA RUSTAM SINGH";
  const fighterBName    = sp.get("fighterBName")    || "YOGESHWARI ANIL KALYANKAR";
  const fighterAClub    = sp.get("fighterAClub")    || "Raigad";
  const fighterBClub    = sp.get("fighterBClub")    || "Dhule";
  const weightCategory  = sp.get("weightCategory")  || "48 kg";
  const matchNumber     = sp.get("matchNumber")     || "1";
  const matNumber       = sp.get("matNumber")       || "2";
  const tournamentTitle = sp.get("tournamentTitle") || "52th SENIOR STATE & NATIONAL SELECTION JUDO CHAMPIONSHIP 2025-26, MUMBAI";

  // ── Scores ────────────────────────────────────────────────────────────────
  const [scoreA, setScoreA] = useState<Score>(emptyScore()); // White
  const [scoreB, setScoreB] = useState<Score>(emptyScore()); // Blue
  const [winner, setWinner] = useState<Fighter | null>(null);
  const [winMethod, setWinMethod] = useState("");

  // ── Timer ─────────────────────────────────────────────────────────────────
  const [timeLeft, setTimeLeft]       = useState(MATCH_SECONDS);
  const [durationInput, setDurationInput] = useState(4);
  const [running, setRunning]         = useState(false);
  const [timerStarted, setTimerStarted] = useState(false);
  const [goldenScore, setGoldenScore] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Osaekomi ──────────────────────────────────────────────────────────────
  const [osaActive, setOsaActive] = useState(false);
  const [osaFor, setOsaFor]       = useState<Fighter | null>(null);
  const [osaTime, setOsaTime]     = useState(0);
  const osaRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const osaMilestones = useRef({ wazaAri: false });

  // ── Auto-win checker ──────────────────────────────────────────────────────
  const checkWin = useCallback(
    (sA: Score, sB: Score): { w: Fighter | null; m: string } => {
      if (sA.ippon >= 1)   return { w: "A", m: "Ippon" };
      if (sB.ippon >= 1)   return { w: "B", m: "Ippon" };
      if (sA.wazaAri >= 2) return { w: "A", m: "Ippon (2× Waza-ari)" };
      if (sB.wazaAri >= 2) return { w: "B", m: "Ippon (2× Waza-ari)" };
      if (sA.shido >= 3)   return { w: "B", m: "Hansoku-make (3× Shido)" };
      if (sB.shido >= 3)   return { w: "A", m: "Hansoku-make (3× Shido)" };
      return { w: null, m: "" };
    },
    []
  );

  const declareWinner = useCallback(
    (f: Fighter, method: string) => {
      setWinner(f);
      setWinMethod(method);
      setRunning(false);
      setOsaActive(false);
      if (timerRef.current) clearInterval(timerRef.current);
      if (osaRef.current)   clearInterval(osaRef.current);
    },
    []
  );

  // ── Add score ─────────────────────────────────────────────────────────────
  const canScore = running && !winner;

  const addScore = useCallback(
    (fighter: Fighter, field: keyof Score) => {
      if (!canScore) return;

      // Only pause timer if it's running
      if (running) {
        setRunning(false);
      }

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
    },
    [running, canScore, scoreA, scoreB, checkWin, declareWinner]
  );

  const undoScore = (fighter: Fighter, field: keyof Score) => {
    if (winner) return;
    if (fighter === "A") setScoreA((p) => ({ ...p, [field]: Math.max(0, p[field] - 1) }));
    else                 setScoreB((p) => ({ ...p, [field]: Math.max(0, p[field] - 1) }));
  };

  // ── Timer Actions ────────────────────────────────────────────────────────
  const toggleTimer = () => {
    if (winner) return;
    if (!running) {
      setRunning(true);
      setTimerStarted(true);
    } else {
      setRunning(false);
    }
  };

  const stopTimer = () => {
    setRunning(false);
  };

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

  // ── Osaekomi tick ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (osaActive && osaFor) {
      osaRef.current = setInterval(() => {
        setOsaTime((t) => {
          const next = t + 1;
          if (next === OSAEKOMI_WAZAARI_S && !osaMilestones.current.wazaAri) {
            osaMilestones.current.wazaAri = true;
            if (osaFor === "A") setScoreA((p) => {
              const nx = { ...p, wazaAri: p.wazaAri + 1 };
              const { w, m } = checkWin(nx, scoreB);
              if (w) setTimeout(() => declareWinner(w, m), 50);
              return nx;
            });
            else setScoreB((p) => {
              const nx = { ...p, wazaAri: p.wazaAri + 1 };
              const { w, m } = checkWin(scoreA, nx);
              if (w) setTimeout(() => declareWinner(w, m), 50);
              return nx;
            });
          }
          if (next >= OSAEKOMI_IPPON_S) {
            clearInterval(osaRef.current!);
            setOsaActive(false);
            setRunning(false);
            if (osaFor === "A") setScoreA((p) => {
              const nx = { ...p, ippon: p.ippon + 1 };
              setTimeout(() => declareWinner("A", "Ippon (Osaekomi 20s)"), 50);
              return nx;
            });
            else setScoreB((p) => {
              const nx = { ...p, ippon: p.ippon + 1 };
              setTimeout(() => declareWinner("B", "Ippon (Osaekomi 20s)"), 50);
              return nx;
            });
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
    setOsaActive(true);
    setOsaFor(fighter);
    setOsaTime(0);
    osaMilestones.current = { wazaAri: false };
    if (!running) setRunning(true);
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
      setGoldenScore(true);
      setTimeLeft(MATCH_SECONDS);
    }
  };

  const resetAll = () => {
    setScoreA(emptyScore()); setScoreB(emptyScore());
    setWinner(null); setWinMethod("");
    setGoldenScore(false); 
    setTimeLeft(durationInput * 60);
    setRunning(false); setTimerStarted(false);
    toketa();
  };

  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value) || 0;
    setDurationInput(val);
    if (!timerStarted) setTimeLeft(val * 60);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[9999] bg-[#090b10] flex flex-col font-sans overflow-y-auto">
      <div className="max-w-[1400px] w-full mx-auto p-4 flex flex-col gap-4">
        
        {/* ── Top Header Bar ─────────────────────────────────────────────── */}
        <div className="bg-white text-black rounded-lg py-3 px-6 flex items-center justify-center relative shadow-md border border-gray-200">
           {/* Logos placeholders */}
           <div className="absolute left-6 top-1/2 -translate-y-1/2 flex gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center border border-blue-200"><span className="text-[10px] font-bold text-blue-800">LOGO</span></div>
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center border border-red-200"><span className="text-[10px] font-bold text-red-800">LOGO</span></div>
           </div>
           <h1 className="text-xl md:text-2xl font-bold tracking-wide text-center">
             {tournamentTitle}
           </h1>
        </div>

        {/* ── Info & Duration Bar ────────────────────────────────────────── */}
        <div className="flex items-center justify-between text-white bg-[#10141e] rounded-lg p-3 border border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-400">Duration</span>
            <input 
              type="number" 
              value={durationInput} 
              onChange={handleDurationChange}
              className="w-16 bg-white text-black text-center font-bold py-1 rounded" 
            />
            <span className="text-sm font-semibold text-gray-400">min</span>
          </div>
          
          <div className="flex flex-col items-center">
            <span className="text-xs text-gray-400 font-bold mb-1">Match Information</span>
            <div className="flex gap-2">
              <div className="bg-white text-black font-bold px-6 py-1 rounded text-sm min-w-[80px] text-center">{weightCategory}</div>
              <div className="bg-white text-black font-bold px-6 py-1 rounded text-sm min-w-[60px] text-center">{matNumber}</div>
              <div className="bg-white text-black font-bold px-6 py-1 rounded text-sm min-w-[60px] text-center">{matchNumber}</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-400">Controls</span>
            <button className="flex items-center gap-2 bg-[#090b10] border border-white/20 hover:bg-white/10 px-4 py-1.5 rounded text-sm font-semibold transition-colors">
              <RefreshCw size={14} className="text-blue-400" /> Scorecard
            </button>
          </div>
        </div>

        {/* ── Main Scoreboard Area ───────────────────────────────────────── */}
        <div className="flex gap-4 items-stretch min-h-[500px]">
          
          {/* Fighter A — WHITE */}
          <div className="flex-[1.2] bg-white rounded-xl overflow-hidden flex flex-col border-2 border-gray-200 shadow-xl">
            {/* Fighter Info */}
            <div className="flex items-center gap-4 p-4 border-b border-gray-100">
              <div className="w-20 h-24 bg-gray-200 rounded object-cover overflow-hidden flex-shrink-0 border border-gray-300 flex items-center justify-center">
                <span className="text-xs text-gray-400">Photo</span>
              </div>
              <div className="flex-1 flex flex-col gap-2">
                <div>
                  <label className="text-xs text-gray-500 font-semibold mb-1 block">Name</label>
                  <input type="text" readOnly value={fighterAName} className="w-full border border-gray-300 rounded px-3 py-2 text-black font-bold bg-gray-50 focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-semibold mb-1 block">Club / Team</label>
                  <input type="text" readOnly value={fighterAClub} className="w-full border border-gray-300 rounded px-3 py-2 text-black font-bold bg-gray-50 focus:outline-none" />
                </div>
              </div>
            </div>

            {/* Scores */}
            <div className="flex justify-between px-8 py-6">
              <ScoreBox label="IPPON" value={scoreA.ippon} color="text-black" />
              <ScoreBox label="WAZA-ARI" value={scoreA.wazaAri} color="text-black" />
              <ScoreBox label="YUKO" value={scoreA.yuko} color="text-black" />
              <ScoreBox label="SHIDO" value={scoreA.shido} color="text-black" />
            </div>

            {/* Actions */}
            <div className="px-4 pb-6 mt-auto">
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <span className="text-sm font-bold text-gray-700 mb-3 block">Actions</span>
                <div className="grid grid-cols-5 gap-2 mb-2">
                  <ActionBtn label="Ippon" onClick={() => addScore("A", "ippon")} disabled={!canScore} className="bg-[#16a34a] text-white hover:bg-[#15803d]" />
                  <ActionBtn label="Waza-ari" onClick={() => addScore("A", "wazaAri")} disabled={!canScore} className="bg-[#eab308] text-white hover:bg-[#ca8a04]" />
                  <ActionBtn label="Yuko" onClick={() => addScore("A", "yuko")} disabled={!canScore} className="bg-[#6b7280] text-white hover:bg-[#4b5563]" />
                  <ActionBtn label="Shido" onClick={() => addScore("A", "shido")} disabled={!canScore} className="bg-white text-gray-800 border-2 border-[#eab308] hover:bg-gray-100" />
                  <ActionBtn label="Red Card" onClick={() => addScore("A", "shido")} disabled={!canScore} className="bg-white text-gray-800 border-2 border-red-500 hover:bg-gray-100" />
                </div>
                <div className="grid grid-cols-5 gap-2 mb-4">
                  <div className="col-span-1">
                     <ActionBtn label="Undo" onClick={() => undoScore("A", "ippon")} className="bg-white border border-gray-300 text-gray-800 hover:bg-gray-100 w-full" />
                  </div>
                  <div className="col-span-2">
                     <ActionBtn label="Declare Winner" onClick={() => declareWinner("A", "Decision")} className="bg-[#16a34a] text-white hover:bg-[#15803d] w-full" />
                  </div>
                </div>
                
                {/* Selectors */}
                <div className="flex gap-2">
                  <div className="flex flex-1 gap-1">
                    <select className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-600 bg-white">
                      <option>Select Technique</option>
                    </select>
                    <button className="px-4 py-2 text-green-700 font-bold text-sm border border-green-200 bg-green-50 rounded-lg hover:bg-green-100">Apply</button>
                  </div>
                  <div className="flex flex-1 gap-1">
                    <select className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-600 bg-white">
                      <option>Select Penalty</option>
                    </select>
                    <button className="px-4 py-2 text-[#eab308] font-bold text-sm border border-[#fef08a] bg-[#fef9c3] rounded-lg hover:bg-[#fef08a]">Apply</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── CENTER COLUMN ──────────────────────────────────────────────── */}
          <div className="w-[280px] shrink-0 flex flex-col gap-3">
            <div className="bg-[#10141e] border border-white/10 rounded-xl flex flex-col items-center justify-center p-6 shadow-xl flex-1">
              <div className="text-[80px] font-black text-[#ff3333] tabular-nums leading-none tracking-tight drop-shadow-[0_0_15px_rgba(255,51,51,0.3)]">
                {fmt(timeLeft)}
              </div>
              <div className="flex gap-2 w-full mt-6">
                <button onClick={toggleTimer} className="flex-1 border border-white/20 bg-transparent hover:bg-white/10 text-white font-bold py-2 rounded text-sm transition-colors uppercase tracking-wider">
                  {running ? "Pause" : "Start"}
                </button>
                <button onClick={stopTimer} className="flex-1 border border-white/20 bg-transparent hover:bg-white/10 text-white font-bold py-2 rounded text-sm transition-colors uppercase tracking-wider">
                  End
                </button>
              </div>
            </div>

            <div className="bg-[#10141e] border border-white/10 rounded-xl p-4 flex flex-col gap-2 shadow-xl">
              <div className="text-center text-xs font-semibold text-gray-400 mb-1 border-b border-white/10 pb-2">Osaekomi Timer Controls</div>
              {osaActive && (
                 <div className="text-center text-3xl font-black text-[#eab308] tabular-nums mb-1">{osaTime}s</div>
              )}
              <button onClick={() => startOsaekomi("A")} className="w-full py-2 bg-transparent border border-white/30 text-white text-sm font-semibold rounded hover:bg-white/10 transition-colors">
                Osaekomi (White)
              </button>
              <button onClick={() => startOsaekomi("B")} className="w-full py-2 bg-transparent border border-blue-500/50 text-blue-300 text-sm font-semibold rounded hover:bg-blue-900/30 transition-colors">
                Osaekomi (Blue)
              </button>
              <button onClick={() => startOsaekomi(osaFor === "A" ? "B" : "A")} className="w-full py-2 bg-[#eab308] hover:bg-[#ca8a04] text-black text-sm font-bold rounded transition-colors">
                Switch Hold
              </button>
              <button onClick={toketa} className="w-full py-2 bg-[#dc2626] hover:bg-[#b91c1c] text-white text-sm font-bold rounded transition-colors">
                Toketa
              </button>
            </div>

            <div className="flex flex-col gap-2 mt-auto">
              <button onClick={toggleFullscreen} className="w-full py-2.5 bg-gray-600 hover:bg-gray-500 text-white text-sm font-bold rounded transition-colors">
                Fullscreen
              </button>
              <button onClick={resetAll} className="w-full py-2.5 bg-transparent border border-white/20 hover:bg-white/10 text-white text-sm font-bold rounded transition-colors">
                Reset
              </button>
            </div>
          </div>

          {/* Fighter B — BLUE */}
          <div className="flex-[1.2] bg-[#02143b] rounded-xl overflow-hidden flex flex-col border-2 border-blue-900 shadow-xl relative">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20 pointer-events-none" />
            
            {/* Fighter Info */}
            <div className="flex items-center gap-4 p-4 border-b border-blue-800/50 relative z-10">
              <div className="w-20 h-24 bg-white rounded object-cover overflow-hidden flex-shrink-0 border border-gray-300 flex items-center justify-center">
                <span className="text-xs text-gray-500">Photo</span>
              </div>
              <div className="flex-1 flex flex-col gap-2">
                <div>
                  <label className="text-xs text-blue-300 font-semibold mb-1 block">Name</label>
                  <input type="text" readOnly value={fighterBName} className="w-full border border-blue-800/50 rounded px-3 py-2 text-white font-bold bg-[#041d4a] focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs text-blue-300 font-semibold mb-1 block">Club / Team</label>
                  <input type="text" readOnly value={fighterBClub} className="w-full border border-blue-800/50 rounded px-3 py-2 text-white font-bold bg-[#041d4a] focus:outline-none" />
                </div>
              </div>
            </div>

            {/* Scores */}
            <div className="flex justify-between px-8 py-6 relative z-10">
              <ScoreBox label="IPPON" value={scoreB.ippon} color="text-white" />
              <ScoreBox label="WAZA-ARI" value={scoreB.wazaAri} color="text-white" />
              <ScoreBox label="YUKO" value={scoreB.yuko} color="text-white" />
              <ScoreBox label="SHIDO" value={scoreB.shido} color="text-blue-200" />
            </div>

            {/* Actions */}
            <div className="px-4 pb-6 mt-auto relative z-10">
              <div className="bg-[#0f2a63] p-4 rounded-xl border border-blue-800/50">
                <span className="text-sm font-bold text-blue-200 mb-3 block">Actions</span>
                <div className="grid grid-cols-5 gap-2 mb-2">
                  <ActionBtn label="Ippon" onClick={() => addScore("B", "ippon")} disabled={!canScore} className="bg-[#16a34a] text-white hover:bg-[#15803d]" />
                  <ActionBtn label="Waza-ari" onClick={() => addScore("B", "wazaAri")} disabled={!canScore} className="bg-[#eab308] text-white hover:bg-[#ca8a04]" />
                  <ActionBtn label="Yuko" onClick={() => addScore("B", "yuko")} disabled={!canScore} className="bg-[#6b7280] text-white hover:bg-[#4b5563]" />
                  <ActionBtn label="Shido" onClick={() => addScore("B", "shido")} disabled={!canScore} className="bg-transparent text-white border-2 border-[#eab308] hover:bg-blue-900/50" />
                  <ActionBtn label="Red Card" onClick={() => addScore("B", "shido")} disabled={!canScore} className="bg-transparent text-white border-2 border-red-500 hover:bg-blue-900/50" />
                </div>
                <div className="grid grid-cols-5 gap-2 mb-4">
                  <div className="col-span-1">
                     <ActionBtn label="Undo" onClick={() => undoScore("B", "ippon")} className="bg-white text-gray-800 hover:bg-gray-200 w-full" />
                  </div>
                  <div className="col-span-2">
                     <ActionBtn label="Declare Winner" onClick={() => declareWinner("B", "Decision")} className="bg-[#2563eb] text-white hover:bg-[#1d4ed8] w-full" />
                  </div>
                </div>
                
                {/* Selectors */}
                <div className="flex gap-2">
                  <div className="flex flex-1 gap-1">
                    <select className="flex-1 border border-blue-800 rounded-lg px-3 py-2 text-sm text-blue-200 bg-[#041d4a]">
                      <option>Select Technique</option>
                    </select>
                    <button className="px-4 py-2 text-green-400 font-bold text-sm border border-green-800 bg-green-900/30 rounded-lg hover:bg-green-900/50">Apply</button>
                  </div>
                  <div className="flex flex-1 gap-1">
                    <select className="flex-1 border border-blue-800 rounded-lg px-3 py-2 text-sm text-blue-200 bg-[#041d4a]">
                      <option>Select Penalty</option>
                    </select>
                    <button className="px-4 py-2 text-[#eab308] font-bold text-sm border border-yellow-800 bg-yellow-900/30 rounded-lg hover:bg-yellow-900/50">Apply</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Bottom Controls ────────────────────────────────────────────── */}
        <div className="flex justify-center gap-3 mt-2">
          <button className="flex items-center gap-2 px-5 py-2 bg-transparent border border-white/20 text-white rounded text-sm font-semibold hover:bg-white/10 transition-colors">
            Save to PDF
          </button>
          <button className="flex items-center gap-2 px-5 py-2 bg-[#16a34a] text-white rounded text-sm font-bold hover:bg-[#15803d] transition-colors shadow-lg">
            Save Match (localStorage)
          </button>
          <button className="flex items-center gap-2 px-5 py-2 bg-transparent border border-white/20 text-white rounded text-sm font-semibold hover:bg-white/10 transition-colors">
            Load Last Match
          </button>
        </div>
        
        <div className="text-center mt-2 pb-6 text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em]">
          MAHAJUDO © BLACKTROUNCE STUDIO
        </div>

      </div>

      {/* ── Winner overlay ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {winner && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.7, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 280, damping: 22 }}
              className="text-center px-10 py-12 max-w-md w-full mx-6 bg-gradient-to-b from-[#1a1a2e] to-[#0d0d14] border border-white/10 rounded-3xl shadow-2xl"
            >
              {/* Trophy */}
              <motion.div
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
                className="w-24 h-24 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-orange-500/40">
                <Trophy size={44} className="text-white" />
              </motion.div>

              <p className={`text-xs font-black uppercase tracking-[0.3em] mb-3 ${winner === "A" ? "text-gray-300" : "text-blue-400"}`}>
                {winner === "A" ? "WHITE WINS" : "BLUE WINS"}
              </p>
              <h2 className="text-3xl font-black text-white leading-tight mb-1">
                {winner === "A" ? fighterAName : fighterBName}
              </h2>
              <p className="text-white/40 font-bold text-sm mb-4">
                {winner === "A" ? fighterAClub : fighterBClub}
              </p>
              <div className="inline-flex px-5 py-2 bg-[#FF7400]/20 border border-[#FF7400]/30 rounded-2xl text-[#FF7400] font-black text-sm mb-8">
                {winMethod}
              </div>

              <button onClick={resetAll}
                className="w-full py-4 bg-white/10 hover:bg-white/15 rounded-2xl font-black text-sm text-white/70 hover:text-white transition-all">
                ↺ New Match / Reset
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function ScoreBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[11px] font-bold tracking-wider text-gray-500">{label}</span>
      <span className={`text-[40px] font-black tabular-nums leading-none ${color}`}>{value}</span>
    </div>
  );
}

function ActionBtn({ label, onClick, className, disabled }: { label: string; onClick: () => void; className?: string; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} className={`py-2 rounded text-xs font-bold transition-all ${disabled ? 'opacity-40 cursor-not-allowed grayscale' : ''} ${className}`}>
      {label}
    </button>
  );
}

export default function ScoreboardPage() {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 z-[9999] bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-white/40 text-sm font-black uppercase tracking-widest">Loading scoreboard...</div>
      </div>
    }>
      <ScoreboardInner />
    </Suspense>
  );
}
