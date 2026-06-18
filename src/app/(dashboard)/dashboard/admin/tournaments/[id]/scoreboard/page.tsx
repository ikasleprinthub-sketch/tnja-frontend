"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams, useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Download, CheckCircle, RotateCcw, ArrowLeft, RefreshCw, Hand, Activity, StopCircle, PlayCircle, PauseCircle } from "lucide-react";

interface Score { ippon: number; wazaAri: number; yuko: number; shido: number }
type Fighter = "A" | "B";

const OSAEKOMI_IPPON_S   = 20;
const OSAEKOMI_WAZAARI_S = 10;
const emptyScore = (): Score => ({ ippon: 0, wazaAri: 0, yuko: 0, shido: 0 });
const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")} : ${String(s % 60).padStart(2, "0")}`;

const FALLBACK_techniques = [
  "Ippon Seoi Nage", "Morote Seoi Nage", "Seoi Otoshi",
  "O Uchi Gari", "Ko Uchi Gari", "O Soto Gari", "Ko Soto Gari",
  "Harai Goshi", "Uchi Mata", "Hane Goshi", "Koshi Guruma",
  "Tai Otoshi", "Tomoe Nage", "Kata Guruma", "Sumi Gaeshi",
  "De Ashi Barai", "Okuri Ashi Barai", "Sasae Tsuri Komi Ashi",
  "O Soto Otoshi", "Osoto Guruma",
  "Kesa Gatame", "Yoko Shiho Gatame", "Tate Shiho Gatame", "Kami Shiho Gatame",
  "Juji Gatame", "Ude Garami", "Ude Gatame",
  "Hadaka Jime", "Okuri Eri Jime", "Sankaku Jime",
];

const FALLBACK_penalties = [
  "Shido – Passivity", "Shido – False attack", "Shido – Defensive posture",
  "Shido – Out of bounds (Jogai)", "Shido – Leg grab", "Shido – Stalling",
  "Shido – Grip break", "Shido – Blocking", "Shido – Dangerous hold",
  "Hansoku-make – Head dive", "Hansoku-make – Dangerous throw",
  "Hansoku-make – Intentional fall", "Hansoku-make – Direct disqualification",
];

function ScoreboardInner() {
  const sp = useSearchParams();
  const params = useParams();
  const router = useRouter();
  const tournamentId = params?.id as string;
  const matchId = sp.get("matchId") || "";

  const fighterAName    = sp.get("fighterAName")    || "FIGHTER A";
  const fighterBName    = sp.get("fighterBName")    || "FIGHTER B";
  const fighterAClub    = sp.get("fighterAClub")    || "";
  const fighterBClub    = sp.get("fighterBClub")    || "";
  const weightCategory  = sp.get("weightCategory")  || "48 kg";
  const matchNumber     = sp.get("matchNumber")     || "1";
  const matNumber       = sp.get("matNumber")       || "1";

  const [techniques, setTechniques] = useState<string[]>(FALLBACK_techniques);
  const [penalties, setPenalties]   = useState<string[]>(FALLBACK_penalties);

  const [selectedTechA, setSelectedTechA] = useState("");
  const [selectedTechB, setSelectedTechB] = useState("");
  const [selectedPenA, setSelectedPenA] = useState("");
  const [selectedPenB, setSelectedPenB] = useState("");
  const [descA, setDescA] = useState("");
  const [descB, setDescB] = useState("");

  interface MatchLog { id: string; timestamp: number; text: string; type: "score" | "penalty" | "system"; fighter?: Fighter; }
  const [logs, setLogs] = useState<MatchLog[]>([]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:9000/api"}/scoreboard/options`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.techniques?.length) setTechniques(data.techniques);
        if (data?.penalties?.length)  setPenalties(data.penalties);
      })
      .catch(() => {});
  }, []);

  const [scoreA, setScoreA] = useState<Score>(emptyScore());
  const [scoreB, setScoreB] = useState<Score>(emptyScore());
  const [winner, setWinner] = useState<Fighter | null>(null);
  const [winMethod, setWinMethod] = useState("");
  const [matchSaved, setMatchSaved] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  const [durationInput, setDurationInput] = useState(4);
  const [timeLeft, setTimeLeft]   = useState(4 * 60);
  const [maxTime, setMaxTime]     = useState(4 * 60);
  const [running, setRunning]     = useState(false);
  const [goldenScore, setGoldenScore] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (timeLeft > maxTime) setMaxTime(timeLeft);
  }, [timeLeft, maxTime]);

  const [osaActive, setOsaActive] = useState(false);
  const [osaFor, setOsaFor]       = useState<Fighter | null>(null);
  const [osaTime, setOsaTime]     = useState(0);
  const osaRef        = useRef<ReturnType<typeof setInterval> | null>(null);
  const osaMilestones = useRef({ wazaAri: false });

  const [confirmWinner, setConfirmWinner] = useState<Fighter | null>(null);
  const [toastMsg, setToastMsg] = useState("");
  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 4000);
  }, []);

  const saveMatchToDB = useCallback(async (
    currentScoreA = scoreA, currentScoreB = scoreB, currentWinner = winner, currentWinMethod = winMethod, currentLogs = logs
  ) => {
    if (!tournamentId || !matchId) return;
    const token = localStorage.getItem("token");

    try {
      const getRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/tournaments/${tournamentId}/draws`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!getRes.ok) throw new Error("Failed to fetch draws");
      const draws = await getRes.json();
      if (!Array.isArray(draws)) return;

      let targetDraw: any = null;
      for (const draw of draws) {
        if (!Array.isArray(draw.rounds)) continue;
        let matchFound = false;
        const newRounds = draw.rounds.map((r: any[]) => r.map((m: any) => {
          if (m.matchId === matchId) {
            matchFound = true;
            const winnerIdVal = currentWinner ? (currentWinner === "A" ? sp.get("fighterAId") : sp.get("fighterBId")) : null;
            return { ...m, winnerId: winnerIdVal, status: currentWinner ? "COMPLETED" : running ? "IN_PROGRESS" : m.status, scoreA: currentScoreA, scoreB: currentScoreB, winMethod: currentWinMethod, logs: currentLogs, timeLeft };
          }
          return m;
        }));

        if (matchFound) {
          for (let ri = 0; ri < newRounds.length; ri++) {
            for (let mi = 0; mi < newRounds[ri].length; mi++) {
              if (newRounds[ri][mi].matchId === matchId && currentWinner) {
                const nextRi = ri + 1;
                if (nextRi < newRounds.length) {
                  const nextMi = Math.floor(mi / 2);
                  const winnerIdVal = currentWinner === "A" ? sp.get("fighterAId") : sp.get("fighterBId");
                  const winnerSlot = { playerId: winnerIdVal, playerName: currentWinner === "A" ? fighterAName : fighterBName, club: currentWinner === "A" ? fighterAClub : fighterBClub, isBye: false };
                  if (mi % 2 === 0) newRounds[nextRi][nextMi].slotA = winnerSlot;
                  else              newRounds[nextRi][nextMi].slotB = winnerSlot;
                }
              }
            }
          }
          targetDraw = { ...draw, rounds: newRounds };
          break;
        }
      }

      if (!targetDraw) return;

      const postRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/tournaments/${tournamentId}/draws`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ageGroup: targetDraw.ageGroup, gender: targetDraw.gender, weightCategory: targetDraw.weightCategory, rounds: targetDraw.rounds })
      });
      if (!postRes.ok) console.error("Failed to save match to database:", await postRes.text());
    } catch (err) { console.error("Error saving match to DB:", err); }
  }, [tournamentId, matchId, scoreA, scoreB, winner, winMethod, logs, timeLeft, running, sp, fighterAName, fighterBName, fighterAClub, fighterBClub]);

  useEffect(() => {
    if (!tournamentId || !matchId) return;
    const token = localStorage.getItem("token");
    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/tournaments/${tournamentId}/draws`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(r => r.ok ? r.json() : null).then((draws: any[]) => {
        if (!draws || !Array.isArray(draws)) return;
        for (const draw of draws) {
          if (!Array.isArray(draw.rounds)) continue;
          for (const round of draw.rounds) {
            for (const m of round) {
              if (m.matchId === matchId) {
                if (m.scoreA) setScoreA(m.scoreA);
                if (m.scoreB) setScoreB(m.scoreB);
                if (m.winnerId) { const f: Fighter = m.winnerId === sp.get("fighterAId") ? "A" : "B"; setWinner(f); }
                if (m.winMethod) setWinMethod(m.winMethod);
                if (m.logs) setLogs(m.logs);
                if (typeof m.timeLeft === "number") setTimeLeft(m.timeLeft);
                break;
              }
            }
          }
        }
      }).catch(err => console.error("Error restoring match state from DB:", err));
  }, [tournamentId, matchId, sp]);

  const checkWin = useCallback((sA: Score, sB: Score): { w: Fighter | null; m: string } => {
    if (sA.ippon >= 1)   return { w: "A", m: "Ippon" };
    if (sB.ippon >= 1)   return { w: "B", m: "Ippon" };
    if (sA.wazaAri >= 2) return { w: "A", m: "Ippon (2× Waza-ari)" };
    if (sB.wazaAri >= 2) return { w: "B", m: "Ippon (2× Waza-ari)" };
    if (sA.shido >= 3)   return { w: "B", m: "Hansoku-make (3× Shido)" };
    if (sB.shido >= 3)   return { w: "A", m: "Hansoku-make (3× Shido)" };
    return { w: null, m: "" };
  }, []);

  const declareWinner = useCallback((f: Fighter, method: string) => {
    setWinner(f); setWinMethod(method); setRunning(false); setOsaActive(false);
    if (timerRef.current) clearInterval(timerRef.current);
    if (osaRef.current)   clearInterval(osaRef.current);

    const winnerName = f === "A" ? fighterAName : fighterBName;
    const newLogText = `Winner declared: ${winnerName} via ${method}`;
    const nextLogs = [...logs, { id: `${Date.now()}_win`, timestamp: Date.now(), text: newLogText, type: "system" as const }];
    setLogs(nextLogs);

    const sp2 = new URLSearchParams(window.location.search);
    try {
      const ch = new BroadcastChannel("tnja_match_results");
      ch.postMessage({ matchId: sp2.get("matchId")||"", winnerId: f === "A" ? sp2.get("fighterAId")||"" : sp2.get("fighterBId")||"", winnerName, winnerClub: f === "A" ? fighterAClub : fighterBClub });
      ch.close();
    } catch {}

    saveMatchToDB(scoreA, scoreB, f, method, nextLogs);
  }, [fighterAName, fighterBName, fighterAClub, fighterBClub, scoreA, scoreB, logs, saveMatchToDB]);

  const isMatchEnded = checkWin(scoreA, scoreB).w !== null;

  const addScore = useCallback((fighter: Fighter, field: keyof Score) => {
    if (winner || isMatchEnded) {
      showToast("Match has ended! Please undo the score or declare the winner.");
      return;
    }
    setRunning(false);

    const fighterName = fighter === "A" ? fighterAName : fighterBName;
    const label = field === "wazaAri" ? "Waza-ari" : field.toUpperCase();

    if (fighter === "A") {
      setScoreA(prev => {
        const next = { ...prev, [field]: prev[field] + 1 };
        const nextLogs = [...logs, { id: `${Date.now()}_score_a_${field}`, timestamp: Date.now(), text: `${fighterName} scored ${label}`, type: "score" as const, fighter }];
        setLogs(nextLogs);
        saveMatchToDB(next, scoreB, null, "", nextLogs);
        return next;
      });
    } else {
      setScoreB(prev => {
        const next = { ...prev, [field]: prev[field] + 1 };
        const nextLogs = [...logs, { id: `${Date.now()}_score_b_${field}`, timestamp: Date.now(), text: `${fighterName} scored ${label}`, type: "score" as const, fighter }];
        setLogs(nextLogs);
        saveMatchToDB(scoreA, next, null, "", nextLogs);
        return next;
      });
    }
  }, [winner, fighterAName, fighterBName, logs, saveMatchToDB, scoreA, scoreB]);

  const undoScore = (fighter: Fighter, field: keyof Score) => {
    if (winner) return;
    const fighterName = fighter === "A" ? fighterAName : fighterBName;
    const label = field === "wazaAri" ? "Waza-ari" : field.toUpperCase();
    const nextLogs = [...logs, { id: `${Date.now()}_undo_${fighter}_${field}`, timestamp: Date.now(), text: `Undo: ${fighterName} score decreased (${label})`, type: "system" as const, fighter }];
    setLogs(nextLogs);

    if (fighter === "A") {
      setScoreA(p => { const next = { ...p, [field]: Math.max(0, p[field] - 1) }; saveMatchToDB(next, scoreB, null, "", nextLogs); return next; });
    } else {
      setScoreB(p => { const next = { ...p, [field]: Math.max(0, p[field] - 1) }; saveMatchToDB(scoreA, next, null, "", nextLogs); return next; });
    }
  };

  const undoLastScore = (fighter: Fighter) => {
    if (winner) return;
    const fighterLogs = logs.filter(l => l.fighter === fighter && (l.type === "score" || l.type === "penalty"));
    if (fighterLogs.length === 0) return;
    
    const lastAction = fighterLogs[fighterLogs.length - 1];
    const text = lastAction.text.toLowerCase();
    
    let field: keyof Score | null = null;
    if (text.includes("ippon")) field = "ippon";
    else if (text.includes("waza-ari")) field = "wazaAri";
    else if (text.includes("yuko")) field = "yuko";
    else if (text.includes("shido") || text.includes("hansoku-make") || text.includes("disqualified")) field = "shido";

    if (field) {
      // Remove the undone action from the logs so they can click undo again
      const filteredLogs = logs.filter(l => l.id !== lastAction.id);
      const fighterName = fighter === "A" ? fighterAName : fighterBName;
      const label = field === "wazaAri" ? "Waza-ari" : field.toUpperCase();
      const nextLogs = [...filteredLogs, { id: `${Date.now()}_undo_${fighter}_${field}`, timestamp: Date.now(), text: `Undo: ${fighterName} score decreased (${label})`, type: "system" as const, fighter }];
      setLogs(nextLogs);

      if (fighter === "A") {
        setScoreA(p => { const next = { ...p, [field]: Math.max(0, p[field] - 1) }; saveMatchToDB(next, scoreB, null, "", nextLogs); return next; });
      } else {
        setScoreB(p => { const next = { ...p, [field]: Math.max(0, p[field] - 1) }; saveMatchToDB(scoreA, next, null, "", nextLogs); return next; });
      }
    }
  };

  const applyTechnique = (fighter: Fighter, tech: string, desc: string) => {
    const fighterName = fighter === "A" ? fighterAName : fighterBName;
    const logText = `${fighterName} executed ${tech}${desc ? ` - ${desc}` : ""}`;
    const nextLogs = [...logs, { id: `${Date.now()}_tech_${fighter}`, timestamp: Date.now(), text: logText, type: "system" as const, fighter }];
    setLogs(nextLogs);
    saveMatchToDB(fighter === "A" ? scoreA : scoreA, fighter === "B" ? scoreB : scoreB, null, "", nextLogs);
  };

  const applyPenalty = (fighter: Fighter, pen: string, desc: string) => {
    const fighterName = fighter === "A" ? fighterAName : fighterBName;
    setRunning(false);

    const isDirectHansoku = pen.toLowerCase().includes("hansoku-make");
    if (isDirectHansoku) {
      const logText = `${fighterName} disqualified via Hansoku-make (${pen})${desc ? ` - ${desc}` : ""}`;
      const nextLogs = [...logs, { id: `${Date.now()}_pen_disq`, timestamp: Date.now(), text: logText, type: "penalty" as const, fighter }];
      setLogs(nextLogs);

      if (fighter === "A") setScoreA(p => { const nx = { ...p, shido: 3 }; saveMatchToDB(nx, scoreB, null, "", nextLogs); return nx; });
      else setScoreB(p => { const nx = { ...p, shido: 3 }; saveMatchToDB(scoreA, nx, null, "", nextLogs); return nx; });
    } else {
      const logText = `${fighterName} received Shido for ${pen}${desc ? ` - ${desc}` : ""}`;
      const nextLogs = [...logs, { id: `${Date.now()}_pen`, timestamp: Date.now(), text: logText, type: "penalty" as const, fighter }];
      setLogs(nextLogs);

      if (fighter === "A") setScoreA(p => { const nx = { ...p, shido: p.shido + 1 }; saveMatchToDB(nx, scoreB, null, "", nextLogs); return nx; });
      else setScoreB(p => { const nx = { ...p, shido: p.shido + 1 }; saveMatchToDB(scoreA, nx, null, "", nextLogs); return nx; });
    }
  };

  const handleApply = (fighter: Fighter) => {
    if (winner || isMatchEnded) {
      showToast("Match has ended! Please undo the score or declare the winner.");
      return;
    }
    const selectedTech = fighter === "A" ? selectedTechA : selectedTechB;
    const selectedPen = fighter === "A" ? selectedPenA : selectedPenB;
    const desc = fighter === "A" ? descA : descB;
    
    if (selectedPen) applyPenalty(fighter, selectedPen, desc);
    if (selectedTech) applyTechnique(fighter, selectedTech, desc);
    
    if (!selectedPen && !selectedTech && desc) {
      const fighterName = fighter === "A" ? fighterAName : fighterBName;
      const nextLogs = [...logs, { id: `${Date.now()}_custom`, timestamp: Date.now(), text: `${fighterName}: ${desc}`, type: "system" as const, fighter }];
      setLogs(nextLogs);
      saveMatchToDB(scoreA, scoreB, null, "", nextLogs);
    }

    if (fighter === "A") { setSelectedTechA(""); setSelectedPenA(""); setDescA(""); }
    else { setSelectedTechB(""); setSelectedPenB(""); setDescB(""); }
  };

  useEffect(() => {
    if (running) {
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            clearInterval(timerRef.current!); setRunning(false);
            const aS = scoreA.wazaAri * 10 + scoreA.yuko + scoreA.ippon * 100;
            const bS = scoreB.wazaAri * 10 + scoreB.yuko + scoreB.ippon * 100;
            if (aS === bS) { setGoldenScore(true); return durationInput * 60; }
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [running, scoreA, scoreB, durationInput]);

  useEffect(() => {
    if (osaActive && osaFor) {
      osaRef.current = setInterval(() => {
        setOsaTime(t => {
          const next = t + 1;
          if (next === OSAEKOMI_WAZAARI_S && !osaMilestones.current.wazaAri) {
            osaMilestones.current.wazaAri = true;
            if (osaFor === "A") setScoreA(p => { const nx = { ...p, wazaAri: p.wazaAri + 1 }; saveMatchToDB(nx, scoreB, null, "", logs); return nx; });
            else                setScoreB(p => { const nx = { ...p, wazaAri: p.wazaAri + 1 }; saveMatchToDB(scoreA, nx, null, "", logs); return nx; });
          }
          if (next >= OSAEKOMI_IPPON_S) {
            clearInterval(osaRef.current!); setOsaActive(false); setRunning(false);
            if (osaFor === "A") { setScoreA(p => { const nx = { ...p, ippon: p.ippon + 1 }; saveMatchToDB(nx, scoreB, null, "", logs); return nx; }); }
            else                { setScoreB(p => { const nx = { ...p, ippon: p.ippon + 1 }; saveMatchToDB(scoreA, nx, null, "", logs); return nx; }); }
          }
          return next;
        });
      }, 1000);
    } else {
      if (osaRef.current) clearInterval(osaRef.current);
    }
    return () => { if (osaRef.current) clearInterval(osaRef.current); };
  }, [osaActive, osaFor, scoreA, scoreB, saveMatchToDB, logs]);

  const startOsaekomi = (fighter: Fighter) => {
    if (winner || isMatchEnded) {
      showToast("Match has ended! Cannot start Osaekomi.");
      return;
    }
    setOsaActive(true); setOsaFor(fighter); setOsaTime(0);
    osaMilestones.current = { wazaAri: false };
    if (!running) setRunning(true);
  };

  const toketa = () => {
    setOsaActive(false); setOsaFor(null); setOsaTime(0);
    if (osaRef.current) clearInterval(osaRef.current);
  };

  const totalScore = (score: Score) => score.ippon * 100 + score.wazaAri * 10 + score.yuko;

  const timerProgress = Math.max(0, Math.min(1, timeLeft / maxTime));
  const arcLength = 546.637;
  const arcOffset = arcLength - (timerProgress * arcLength);
  const thumbAngle = 135 + (270 * timerProgress);

  return (
    <>
      <div className="fixed inset-0 z-[9999] bg-[#0a0a0a] flex justify-center items-center font-sans select-none overflow-hidden text-white print:hidden">
        <div className="w-full max-w-[1400px] h-full max-h-[900px] flex flex-col bg-[#111111] relative border border-white/10 rounded-lg shadow-2xl overflow-hidden my-auto mx-4">
        
        {/* ══ HEADER ════════════════════════════════════════════════════════ */}
        <div className="flex items-center justify-between px-8 py-4 border-b border-[#333] bg-[#1a1a1a] shadow-md shrink-0">
        <div className="flex items-center">
          <img src="/navbar/Logo.png" alt="TNJA Logo" className="h-16 w-auto object-contain" />
        </div>
        <div className="flex flex-col items-center">
          <h1 className="text-[#f97316] text-xl font-black tracking-wide">Scoreboard</h1>
          <p className="text-gray-400 text-sm font-medium tracking-wide">
            {weightCategory} <span className="text-[#f97316]">●</span> Match {matchNumber} <span className="text-[#f97316]">●</span> Mat {matNumber}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {winner ? (
            <div className="bg-green-600 text-white px-4 py-1.5 rounded-md font-bold text-sm shadow-[0_0_10px_rgba(22,163,74,0.6)] flex items-center gap-2 tracking-widest uppercase">
              <Trophy size={14} /> MATCH FINISHED • WINNER: {winner === "A" ? fighterAName : fighterBName}
            </div>
          ) : (
            <button className="flex items-center gap-2 bg-[#ffcccc] text-red-600 px-4 py-1.5 rounded-md font-bold text-sm">
              <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span> LIVE
            </button>
          )}
          <button onClick={() => window.location.reload()} className="flex items-center gap-2 bg-white text-black px-4 py-1.5 rounded-md font-bold text-sm hover:bg-gray-200">
            <RefreshCw size={14} /> Refresh
          </button>
          {/* <button className="bg-[#facc15] p-1.5 rounded-md text-black hover:bg-yellow-500">
            <Settings size={20} />
          </button> */}
        </div>
      </div>

      {/* ══ MAIN CONTENT ══════════════════════════════════════════════════════ */}
      <div className="flex-1 p-6 flex gap-6 overflow-hidden">
        
        {/* ── PLAYER 1 (ORANGE) ──────────────────────────────────────────── */}
        <div className="flex-[1.2] flex flex-col bg-[#161616] rounded-2xl border border-[#f97316] shadow-[0_0_15px_rgba(249,115,22,0.3)] overflow-hidden p-4 relative">
          <div className="flex justify-between items-start mb-4">
            <span className="bg-[#f97316] text-white text-xs font-bold px-4 py-1.5 rounded-full tracking-wider shadow-lg">PLAYER 1</span>
            <span className="text-3xl">🇮🇳</span>
          </div>
          
          <div className="flex items-center gap-6 mb-4">
            <div className="w-20 h-20 rounded-full border border-gray-600 overflow-hidden bg-[#e65c00] flex items-center justify-center shadow-lg">
              <span className="text-white text-2xl font-black">{fighterAName.substring(0, 2).toUpperCase()}</span>
            </div>
            <div className="flex flex-col">
              <h2 className="text-2xl font-bold text-white mb-1">{fighterAName}</h2>
              <p className="text-sm text-gray-400 mb-2">{fighterAClub}</p>
              <div className="text-xl font-bold text-white">Score : {totalScore(scoreA)}</div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-4">
            <ScoreBox label="IPPON" value={scoreA.ippon} theme="orange" onUndo={() => undoScore("A", "ippon")} />
            <ScoreBox label="WAZA-ARI" value={scoreA.wazaAri} theme="orange" onUndo={() => undoScore("A", "wazaAri")} />
            <ScoreBox label="YUKO" value={scoreA.yuko} theme="orange" onUndo={() => undoScore("A", "yuko")} />
            <ScoreBox label="SHIDO" value={scoreA.shido} theme="orange" onUndo={() => undoScore("A", "shido")} />
          </div>

          <div className="flex flex-col flex-grow">
            <span className="text-xs font-bold tracking-widest text-white mb-2">ACTIONS</span>
            
            <div className="grid grid-cols-5 gap-3 mb-4">
              <ActionBtn icon={<span className="text-[14px]">🥋</span>} label="IPPON" onClick={() => addScore("A", "ippon")} />
              <ActionBtn icon={<span className="text-[14px]">🥋</span>} label="WAZA-ARI" onClick={() => addScore("A", "wazaAri")} />
              <ActionBtn icon={<span className="text-[14px]">🥋</span>} label="YUKO" onClick={() => addScore("A", "yuko")} />
              <ActionBtn icon={<div className="w-3 h-4 bg-yellow-400 rounded-sm shadow-sm" />} label="SHIDO" onClick={() => addScore("A", "shido")} />
              <ActionBtn icon={<div className="w-3 h-4 bg-red-600 rounded-sm shadow-sm" />} label="HANSOKU-MAKE" onClick={() => applyPenalty("A", "Hansoku-make", "")} />
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <button onClick={() => undoLastScore("A")} className="border border-red-700 text-red-500 hover:bg-red-900/30 py-2.5 rounded font-bold text-sm flex items-center justify-center gap-2 transition-colors">
                <RotateCcw size={16} /> UNDO LAST
              </button>
              <button onClick={() => setConfirmWinner("A")} className="border border-green-700 text-green-500 hover:bg-green-900/30 py-2.5 rounded font-bold text-sm flex items-center justify-center gap-2 transition-colors">
                <Trophy size={16} /> WINNER
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <select value={selectedTechA} onChange={e=>setSelectedTechA(e.target.value)} className="bg-transparent border border-[#f97316] text-gray-300 rounded p-3 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 appearance-none">
                <option value="">Select Technique</option>
                {techniques.map(t=><option key={t} value={t} className="bg-[#141414]">{t}</option>)}
              </select>
              <select value={selectedPenA} onChange={e=>setSelectedPenA(e.target.value)} className="bg-transparent border border-[#f97316] text-gray-300 rounded p-3 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 appearance-none">
                <option value="">Select Penalty</option>
                {penalties.map(p=><option key={p} value={p} className="bg-[#141414]">{p}</option>)}
              </select>
            </div>

            <textarea value={descA} onChange={e=>setDescA(e.target.value)} placeholder="Description" className="w-full bg-transparent border border-[#f97316] text-gray-300 rounded p-3 text-sm h-16 resize-none mb-4 focus:outline-none focus:ring-1 focus:ring-orange-500" />
            
            <div className="mt-auto flex justify-center">
              <button onClick={() => handleApply("A")} className="bg-[#16a34a] hover:bg-[#15803d] text-white font-bold py-3 px-16 rounded text-sm transition-colors shadow-[0_0_15px_rgba(22,163,74,0.4)]">
                APPLY
              </button>
            </div>
          </div>
        </div>

        {/* ── CENTER PANEL ────────────────────────────────────────────────── */}
        <div className="w-[380px] shrink-0 flex flex-col gap-6">
          <div className="bg-[#1a1a1a] rounded-2xl flex flex-col items-center justify-center pt-8 pb-4 relative shadow-lg">
            
            <div className="relative flex flex-col items-center justify-center">
              <svg className="w-[260px] h-[260px]">
                <defs>
                  <linearGradient id="timerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f97316" />
                    <stop offset="100%" stopColor="#facc15" />
                  </linearGradient>
                </defs>
                <path 
                  d="M 47.98 212.02 A 116 116 0 1 1 212.02 212.02" 
                  stroke="#333" strokeWidth="6" fill="none" strokeLinecap="round" 
                />
                <path 
                  d="M 47.98 212.02 A 116 116 0 1 1 212.02 212.02" 
                  stroke="url(#timerGrad)" 
                  strokeWidth="14" 
                  fill="none" 
                  strokeLinecap="round" 
                  style={{
                    strokeDasharray: arcLength,
                    strokeDashoffset: arcOffset,
                    transition: "stroke-dashoffset 1s linear"
                  }} 
                />
                
                {/* ── DRAINING THUMB / DOT ── */}
                <g 
                  style={{ 
                    transform: `rotate(${thumbAngle}deg)`, 
                    transformOrigin: "130px 130px",
                    transition: "transform 1s linear" 
                  }}
                >
                  <circle 
                    cx="246" cy="130" r="10" 
                    fill="#f97316" 
                    stroke="#ffffff" 
                    strokeWidth="4" 
                    style={{ filter: "drop-shadow(0px 2px 4px rgba(0,0,0,0.5))" }}
                  />
                  <circle cx="243" cy="127" r="3" fill="#ffffff" opacity="0.6" />
                </g>
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center pb-4">
                <span className="text-[11px] font-black tracking-[0.2em] text-[#5a7fa8] mb-1">{goldenScore ? "GOLDEN SCORE" : "ROUND 1"}</span>
                <span className="text-6xl font-black text-white tabular-nums tracking-tighter mb-1 drop-shadow-md">{fmt(timeLeft)}</span>
                <span className="text-[10px] font-black tracking-[0.1em] text-[#5a7fa8]">TIME REMAINING</span>
              </div>
            </div>

            <div className="flex gap-5 w-full px-4 mt-2 justify-center">
              <button onClick={() => { if (!winner) { setRunning(true); } }} className="bg-[#2ecc71] hover:bg-[#27ae60] text-white pt-2 pb-1.5 w-[90px] rounded-lg font-black text-[11px] tracking-wider flex flex-col items-center gap-1 shadow-[0_4px_10px_rgba(46,204,113,0.3)]">
                <PlayCircle size={18} strokeWidth={2.5}/> START
              </button>
              <button onClick={() => setRunning(false)} className="bg-[#f1c40f] hover:bg-[#d4ac0d] text-black pt-2 pb-1.5 w-[90px] rounded-lg font-black text-[11px] tracking-wider flex flex-col items-center gap-1 shadow-[0_4px_10px_rgba(241,196,15,0.3)]">
                <PauseCircle size={18} strokeWidth={2.5}/> PAUSE
              </button>
              <button onClick={() => { setRunning(false); setTimeLeft(0); }} className="bg-[#e74c3c] hover:bg-[#c0392b] text-white pt-2 pb-1.5 w-[90px] rounded-lg font-black text-[11px] tracking-wider flex flex-col items-center gap-1 shadow-[0_4px_10px_rgba(231,76,60,0.3)]">
                <StopCircle size={18} strokeWidth={2.5}/> STOP
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <span className="text-xs font-bold tracking-widest text-white">OSAEKOMI TIMER</span>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => startOsaekomi("A")} className="bg-[#422006] hover:bg-[#78350f] text-[#f97316] text-xs font-bold py-2.5 rounded border border-[#78350f]">Osaekomi (P1)</button>
              <button onClick={() => startOsaekomi("B")} className="bg-[#424006] hover:bg-[#716a04] text-[#eab308] text-xs font-bold py-2.5 rounded border border-[#716a04]">Osaekomi (P2)</button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => startOsaekomi(osaFor === "A" ? "B" : "A")} className="bg-transparent border border-gray-600 hover:bg-gray-800 text-gray-300 text-xs font-bold py-2.5 rounded">Switch Hold</button>
              <button onClick={toketa} className="bg-transparent border border-gray-600 hover:bg-gray-800 text-gray-300 text-xs font-bold py-2.5 rounded">Toketa</button>
            </div>
          </div>

          <div className="bg-[#1a1a1a] rounded-xl flex-1 p-5 overflow-hidden flex flex-col shadow-lg border border-[#333]">
            <div className="flex justify-between items-center mb-6">
              <span className="text-xs font-bold tracking-widest text-white">MATCH STATISTICS</span>
              <div className="flex flex-col gap-1 items-end">
                <span className="text-[10px] flex items-center gap-2 text-gray-400 font-bold tracking-wider"><span className="w-2.5 h-2.5 rounded-full bg-[#f97316]"></span> PLAYER 1</span>
                <span className="text-[10px] flex items-center gap-2 text-gray-400 font-bold tracking-wider"><span className="w-2.5 h-2.5 rounded-full bg-[#eab308]"></span> PLAYER 2</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin text-xs font-semibold text-gray-300 pr-2 relative">
              <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gradient-to-b from-green-500 via-yellow-500 to-red-500 rounded-full" />
              <div className="flex flex-col gap-4 relative z-10 pl-8 pt-2 pb-2">
                <div className="flex items-center gap-3">
                  <div className="absolute left-[9.5px] w-1.5 h-1.5 rounded-full bg-green-500 ring-4 ring-[#1a1a1a]" />
                  <span className="text-[10px] text-gray-400 font-bold w-8">0:00</span>
                  <span className="text-[10px] text-white font-bold">START</span>
                </div>
                {logs.map((l) => (
                  <div key={l.id} className="flex items-start gap-3">
                    <div className={`absolute left-[9.5px] w-1.5 h-1.5 rounded-full ring-4 ring-[#1a1a1a] ${l.fighter === "A" ? "bg-[#f97316]" : l.fighter === "B" ? "bg-[#eab308]" : "bg-gray-500"}`} />
                    <span className="text-[10px] text-gray-400 font-bold w-8 mt-0.5">{new Date(l.timestamp).toLocaleTimeString([],{minute:'2-digit',second:'2-digit'})}</span>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-white font-bold tracking-wider">
                          {(() => {
                            if (l.text.includes('scored')) return l.text.split('scored ')[1].toUpperCase();
                            if (l.text.includes('Shido')) return 'SHIDO';
                            if (l.text.includes('Hansoku-make')) return 'HANSOKU-MAKE';
                            if (l.text.includes('executed')) return 'TECHNIQUE';
                            if (l.text.includes('Undo')) return 'UNDO';
                            if (l.text.includes('Winner')) return 'RESULT';
                            return 'NOTE';
                          })()}
                        </span>
                        {l.fighter && (
                          <span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${l.fighter === "A" ? "bg-[#f97316] text-white" : "bg-[#eab308] text-black"}`}>
                            PLAYER {l.fighter === "A" ? "1" : "2"}
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] text-gray-500 mt-0.5">{l.text}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* ── PLAYER 2 (YELLOW) ────────────────────────────────────────── */}
        <div className="flex-[1.2] flex flex-col bg-[#161616] rounded-2xl border border-[#eab308] shadow-[0_0_15px_rgba(234,179,8,0.3)] overflow-hidden p-4 relative">
          <div className="flex justify-between items-start mb-4">
            <span className="bg-[#eab308] text-black text-xs font-bold px-4 py-1.5 rounded-full tracking-wider shadow-lg">PLAYER 2</span>
            <span className="text-3xl">🇮🇳</span>
          </div>
          
          <div className="flex items-center gap-6 mb-4">
            <div className="w-20 h-20 rounded-full border border-gray-600 overflow-hidden bg-[#b3a100] flex items-center justify-center shadow-lg">
              <span className="text-white text-2xl font-black">{fighterBName.substring(0, 2).toUpperCase()}</span>
            </div>
            <div className="flex flex-col">
              <h2 className="text-2xl font-bold text-white mb-1">{fighterBName}</h2>
              <p className="text-sm text-gray-400 mb-2">{fighterBClub}</p>
              <div className="text-xl font-bold text-white">Score : {totalScore(scoreB)}</div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-4">
            <ScoreBox label="IPPON" value={scoreB.ippon} theme="yellow" onUndo={() => undoScore("B", "ippon")} />
            <ScoreBox label="WAZA-ARI" value={scoreB.wazaAri} theme="yellow" onUndo={() => undoScore("B", "wazaAri")} />
            <ScoreBox label="YUKO" value={scoreB.yuko} theme="yellow" onUndo={() => undoScore("B", "yuko")} />
            <ScoreBox label="SHIDO" value={scoreB.shido} theme="yellow" onUndo={() => undoScore("B", "shido")} />
          </div>

          <div className="flex flex-col flex-grow">
            <span className="text-xs font-bold tracking-widest text-white mb-2">ACTIONS</span>
            
            <div className="grid grid-cols-5 gap-3 mb-4">
              <ActionBtn icon={<span className="text-[14px]">🥋</span>} label="IPPON" onClick={() => addScore("B", "ippon")} />
              <ActionBtn icon={<span className="text-[14px]">🥋</span>} label="WAZA-ARI" onClick={() => addScore("B", "wazaAri")} />
              <ActionBtn icon={<span className="text-[14px]">🥋</span>} label="YUKO" onClick={() => addScore("B", "yuko")} />
              <ActionBtn icon={<div className="w-3 h-4 bg-yellow-400 rounded-sm shadow-sm" />} label="SHIDO" onClick={() => addScore("B", "shido")} />
              <ActionBtn icon={<div className="w-3 h-4 bg-red-600 rounded-sm shadow-sm" />} label="HANSOKU-MAKE" onClick={() => applyPenalty("B", "Hansoku-make", "")} />
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <button onClick={() => undoLastScore("B")} className="border border-red-700 text-red-500 hover:bg-red-900/30 py-2.5 rounded font-bold text-sm flex items-center justify-center gap-2 transition-colors">
                <RotateCcw size={16} /> UNDO LAST
              </button>
              <button onClick={() => setConfirmWinner("B")} className="border border-green-700 text-green-500 hover:bg-green-900/30 py-2.5 rounded font-bold text-sm flex items-center justify-center gap-2 transition-colors">
                <Trophy size={16} /> WINNER
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <select value={selectedTechB} onChange={e=>setSelectedTechB(e.target.value)} className="bg-transparent border border-[#eab308] text-gray-300 rounded p-3 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-500 appearance-none">
                <option value="">Select Technique</option>
                {techniques.map(t=><option key={t} value={t} className="bg-[#141414]">{t}</option>)}
              </select>
              <select value={selectedPenB} onChange={e=>setSelectedPenB(e.target.value)} className="bg-transparent border border-[#eab308] text-gray-300 rounded p-3 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-500 appearance-none">
                <option value="">Select Penalty</option>
                {penalties.map(p=><option key={p} value={p} className="bg-[#141414]">{p}</option>)}
              </select>
            </div>

            <textarea value={descB} onChange={e=>setDescB(e.target.value)} placeholder="Description" className="w-full bg-transparent border border-[#eab308] text-gray-300 rounded p-3 text-sm h-16 resize-none mb-4 focus:outline-none focus:ring-1 focus:ring-yellow-500" />
            
            <div className="mt-auto flex justify-center">
              <button onClick={() => handleApply("B")} className="bg-[#16a34a] hover:bg-[#15803d] text-white font-bold py-3 px-16 rounded text-sm transition-colors shadow-[0_0_15px_rgba(22,163,74,0.4)]">
                APPLY
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* ══ EXPORT SECTION ════════════════════════════════════════════════════ */}
      <div className="pb-6 flex justify-center shrink-0">
        <div className="bg-[#1a1a1a] border border-[#333] rounded-xl px-8 py-4 flex items-center gap-8 shadow-xl">
          <span className="text-xs font-bold text-gray-500 tracking-widest uppercase">EXPORT</span>
          <div className="flex gap-4">
            <button onClick={() => window.print()} className="bg-white text-black font-bold text-sm px-5 py-2.5 flex items-center gap-2 rounded hover:bg-gray-200 transition-colors">
              <Download size={16} /> Save PDF
            </button>
            <button onClick={()=>saveMatchToDB()} className="bg-white text-black font-bold text-sm px-5 py-2.5 flex items-center gap-2 rounded hover:bg-gray-200 transition-colors">
              <CheckCircle size={16} /> Save Match
            </button>
            <button className="bg-white text-black font-bold text-sm px-5 py-2.5 flex items-center gap-2 rounded hover:bg-gray-200 transition-colors">
              <RotateCcw size={16} /> Load Last Match
            </button>
          </div>
        </div>
      </div>

      {/* ── WINNER OVERLAY MODAL ─────────────────────────────────────────── */}
      <AnimatePresence>
        {winner && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md print:hidden"
          >
            <motion.div 
              initial={{ scale: 0.8, opacity: 0, y: 30 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              className="bg-[#1a1a1a] border-2 border-[#333] p-12 rounded-[2rem] shadow-2xl flex flex-col items-center max-w-2xl w-full text-center relative overflow-hidden"
            >
              <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-green-400 to-green-600" />
              
              <div className="w-24 h-24 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mb-6 ring-4 ring-green-500/20">
                <Trophy size={48} />
              </div>
              <h2 className="text-xl font-black tracking-[0.3em] text-gray-500 mb-2">WINNER DECLARED</h2>
              <h1 className="text-6xl font-black text-white mb-3 leading-tight drop-shadow-lg">
                {winner === "A" ? fighterAName : fighterBName}
              </h1>
              <h3 className="text-2xl font-bold text-gray-400 mb-10">
                {winner === "A" ? fighterAClub : fighterBClub}
              </h3>
              
              <div className="bg-[#111] px-8 py-4 rounded-2xl border border-[#333] mb-10 w-full shadow-inner">
                <span className="text-xs font-bold text-gray-500 tracking-[0.2em] uppercase block mb-2">Method of Victory</span>
                <span className="text-2xl font-black text-[#FF7400] uppercase tracking-wider">{winMethod || "Decision"}</span>
              </div>

              <div className="flex gap-4 w-full">
                <button 
                  onClick={() => window.print()} 
                  className="flex-1 bg-white hover:bg-gray-200 text-black font-black py-4 rounded-xl transition-all shadow-xl shadow-white/10 flex items-center justify-center gap-3 text-lg"
                >
                  <Download size={24} /> Print Report
                </button>
                <button 
                  onClick={() => setWinner(null)} 
                  className="px-8 bg-transparent hover:bg-[#333] text-gray-300 border-2 border-[#444] font-black py-4 rounded-xl transition-all"
                >
                  Dismiss
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── TOAST MESSAGE ─────────────────────────────────────────── */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-red-600 border-2 border-red-400 text-white font-bold px-8 py-4 rounded-full shadow-[0_0_20px_rgba(220,38,38,0.5)] z-[99999] flex items-center gap-3"
          >
            <span className="text-xl">⚠️</span> {toastMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── CONFIRM WINNER MODAL ─────────────────────────────────────────── */}
      <AnimatePresence>
        {confirmWinner && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-sm print:hidden"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.9, opacity: 0, y: 20 }} 
              className="bg-[#1a1a1a] border-2 border-[#333] p-8 rounded-2xl max-w-md w-full text-center shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-red-500 to-orange-500" />
              <h2 className="text-2xl font-black text-white mb-2">Confirm Winner?</h2>
              <p className="text-gray-400 mb-8 font-semibold text-sm">
                Are you sure you want to declare <span className="text-white font-bold">{confirmWinner === "A" ? fighterAName : fighterBName}</span> as the final winner? This will end the match immediately.
              </p>
              <div className="flex gap-4">
                <button onClick={() => setConfirmWinner(null)} className="flex-1 bg-transparent hover:bg-[#333] text-gray-300 border-2 border-[#444] font-black py-3 rounded-xl transition-all">
                  Cancel
                </button>
                <button onClick={() => {
                  const ws = checkWin(scoreA, scoreB);
                  declareWinner(confirmWinner, (ws.w === confirmWinner && ws.m) ? ws.m : "Decision");
                  setConfirmWinner(null);
                }} className="flex-1 bg-green-600 hover:bg-green-500 text-white font-black py-3 rounded-xl shadow-lg shadow-green-500/20 transition-all">
                  Yes, Declare
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

        </div>
      </div>

      {/* ── PRINTABLE MATCH REPORT ─────────────────────────────────────────── */}
      <div className="hidden print:block bg-white text-black font-sans px-16 py-12 absolute inset-0 w-full min-h-screen z-[99999]">
        <style type="text/css" media="print">
          {`
            @page { size: auto; margin: 0mm; }
            html, body { background-color: #ffffff !important; }
          `}
        </style>
        
        <div className="text-center border-b-2 border-black pb-6 mb-8 flex flex-col items-center">
          <img src="/navbar/Logo.png" alt="TNJA Logo" className="w-24 h-24 mb-4 object-contain" />
          <h1 className="text-4xl font-black uppercase tracking-widest mb-2">Tamil Nadu Judo Association</h1>
          <h2 className="text-2xl font-bold text-gray-600 uppercase">Official Match Report</h2>
        </div>

        <div className="flex justify-between items-end mb-10">
          <div className="w-5/12 border-2 border-black rounded-xl p-6 bg-gray-50">
            <span className="text-sm font-bold text-gray-500 uppercase tracking-widest">Player 1 (White)</span>
            <p className="text-3xl font-black mt-2 text-orange-600">{fighterAName}</p>
          </div>
          <div className="text-4xl font-black text-gray-300 pb-6">VS</div>
          <div className="w-5/12 border-2 border-black rounded-xl p-6 bg-gray-50 text-right">
            <span className="text-sm font-bold text-gray-500 uppercase tracking-widest">Player 2 (Blue)</span>
            <p className="text-3xl font-black mt-2 text-yellow-600">{fighterBName}</p>
          </div>
        </div>

        <div className="mb-10">
          <h3 className="text-xl font-bold uppercase tracking-widest border-b border-gray-300 pb-2 mb-4">Final Score</h3>
          <table className="w-full text-center border-collapse">
            <thead>
              <tr className="bg-gray-200">
                <th className="border border-gray-400 p-3">Player</th>
                <th className="border border-gray-400 p-3">Ippon</th>
                <th className="border border-gray-400 p-3">Waza-Ari</th>
                <th className="border border-gray-400 p-3">Yuko</th>
                <th className="border border-gray-400 p-3">Shido</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-400 p-3 font-bold">{fighterAName}</td>
                <td className="border border-gray-400 p-3 text-2xl font-black">{scoreA.ippon}</td>
                <td className="border border-gray-400 p-3 text-2xl font-black">{scoreA.wazaAri}</td>
                <td className="border border-gray-400 p-3 text-2xl font-black">{scoreA.yuko}</td>
                <td className="border border-gray-400 p-3 text-2xl font-black text-red-600">{scoreA.shido}</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-400 p-3 font-bold">{fighterBName}</td>
                <td className="border border-gray-400 p-3 text-2xl font-black">{scoreB.ippon}</td>
                <td className="border border-gray-400 p-3 text-2xl font-black">{scoreB.wazaAri}</td>
                <td className="border border-gray-400 p-3 text-2xl font-black">{scoreB.yuko}</td>
                <td className="border border-gray-400 p-3 text-2xl font-black text-red-600">{scoreB.shido}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mb-10">
          <h3 className="text-xl font-bold uppercase tracking-widest border-b border-gray-300 pb-2 mb-4">Match Log / Timeline</h3>
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-200">
                <th className="border border-gray-400 p-2 w-24">Time</th>
                <th className="border border-gray-400 p-2 w-48">Competitor</th>
                <th className="border border-gray-400 p-2">Action / Description</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-b border-gray-300">
                  <td className="border-x border-gray-300 p-2 font-mono text-gray-600">
                    {new Date(l.timestamp).toLocaleTimeString([], {minute:'2-digit',second:'2-digit'})}
                  </td>
                  <td className="border-x border-gray-300 p-2 font-bold">
                    {l.fighter ? (l.fighter === "A" ? fighterAName : fighterBName) : "- System -"}
                  </td>
                  <td className="border-x border-gray-300 p-2">{l.text}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {winner && (
          <div className="mt-12 p-8 bg-green-50 border-4 border-green-600 rounded-2xl text-center">
            <p className="text-green-800 font-bold tracking-widest uppercase mb-2">Winner Declared</p>
            <h2 className="text-4xl font-black text-green-700">{winner === "A" ? fighterAName : fighterBName}</h2>
            <p className="text-gray-600 font-bold mt-4">Method of Victory: {winMethod}</p>
          </div>
        )}
      </div>
    </>
  );
}

function ScoreBox({ label, value, theme, onUndo }: { label: string; value: number; theme: "orange" | "yellow"; onUndo?: () => void }) {
  const bgClass = theme === "orange" ? "bg-[#452109]" : "bg-[#424006]";
  return (
    <div onClick={onUndo} className={`${bgClass} rounded-lg flex flex-col items-center justify-center py-4 border border-white/5 ${onUndo ? "cursor-pointer hover:bg-white/10 transition-colors" : ""}`}>
      <span className="text-xs text-white/50 font-bold tracking-widest mb-1">{label}</span>
      <span className="text-4xl text-white font-black">{value}</span>
    </div>
  );
}

function ActionBtn({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center justify-center gap-1.5 bg-transparent border border-[#444] hover:bg-[#333] rounded p-2 transition-colors">
      <div className="h-5 flex items-center justify-center">{icon}</div>
      <span className="text-[8px] font-black tracking-wider text-gray-300">{label}</span>
    </button>
  );
}

export default function ScoreboardPage() {
  return (
    <Suspense fallback={<div className="fixed inset-0 z-[9999] bg-[#111] flex items-center justify-center text-white/50 font-bold">Loading Scoreboard...</div>}>
      <ScoreboardInner />
    </Suspense>
  );
}
