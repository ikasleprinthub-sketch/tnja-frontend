"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Monitor, Download, CheckCircle, RotateCcw } from "lucide-react";

interface Score { ippon: number; wazaAri: number; yuko: number; shido: number }
type Fighter = "A" | "B";

const OSAEKOMI_IPPON_S   = 20;
const OSAEKOMI_WAZAARI_S = 10;
const emptyScore = (): Score => ({ ippon: 0, wazaAri: 0, yuko: 0, shido: 0 });
const fmt = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

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
  "Shido – Passivity",
  "Shido – False attack",
  "Shido – Defensive posture",
  "Shido – Out of bounds (Jogai)",
  "Shido – Leg grab",
  "Shido – Stalling",
  "Shido – Grip break",
  "Shido – Blocking",
  "Shido – Dangerous hold",
  "Hansoku-make – Head dive",
  "Hansoku-make – Dangerous throw",
  "Hansoku-make – Intentional fall",
  "Hansoku-make – Direct disqualification",
];

function ScoreboardInner() {
  const sp = useSearchParams();
  const params = useParams();
  const tournamentId = params?.id as string;
  const matchId = sp.get("matchId") || "";

  const fighterAName    = sp.get("fighterAName")    || "FIGHTER A";
  const fighterBName    = sp.get("fighterBName")    || "FIGHTER B";
  const fighterAClub    = sp.get("fighterAClub")    || "";
  const fighterBClub    = sp.get("fighterBClub")    || "";
  const weightCategory  = sp.get("weightCategory")  || "48 kg";
  const matchNumber     = sp.get("matchNumber")     || "1";
  const matNumber       = sp.get("matNumber")       || "1";
  const tournamentTitle = sp.get("tournamentTitle") || "TNJA CHAMPIONSHIP";

  const [techniques, setTechniques] = useState<string[]>(FALLBACK_techniques);
  const [penalties, setPenalties]   = useState<string[]>(FALLBACK_penalties);

  // Selector states
  const [selectedTechA, setSelectedTechA] = useState("");
  const [selectedTechB, setSelectedTechB] = useState("");
  const [selectedPenA, setSelectedPenA] = useState("");
  const [selectedPenB, setSelectedPenB] = useState("");

  // Overlay/modal state for assigning scores to applied techniques
  const [techModal, setTechModal] = useState<{ fighter: Fighter; technique: string } | null>(null);

  // Match logs state
  interface MatchLog {
    id: string;
    timestamp: number;
    text: string;
    type: "score" | "penalty" | "system";
  }
  const [logs, setLogs] = useState<MatchLog[]>([]);

  // Fetch techniques and penalties options from backend
  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/scoreboard/options`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.techniques?.length) setTechniques(data.techniques);
        if (data?.penalties?.length)  setPenalties(data.penalties);
      })
      .catch(() => {}); // keep fallback on error
  }, []);

  const [scoreA, setScoreA] = useState<Score>(emptyScore());
  const [scoreB, setScoreB] = useState<Score>(emptyScore());
  const [winner, setWinner] = useState<Fighter | null>(null);
  const [winMethod, setWinMethod] = useState("");
  const [matchSaved, setMatchSaved] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  const [durationInput, setDurationInput] = useState(4);
  const [timeLeft, setTimeLeft]   = useState(4 * 60);
  const [running, setRunning]     = useState(false);
  const [timerStarted, setTimerStarted] = useState(false);
  const [goldenScore, setGoldenScore]   = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [osaActive, setOsaActive] = useState(false);
  const [osaFor, setOsaFor]       = useState<Fighter | null>(null);
  const [osaTime, setOsaTime]     = useState(0);
  const osaRef        = useRef<ReturnType<typeof setInterval> | null>(null);
  const osaMilestones = useRef({ wazaAri: false });

  // Log helper
  const addLog = useCallback((text: string, type: "score" | "penalty" | "system") => {
    setLogs(prev => [
      ...prev,
      {
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        timestamp: Date.now(),
        text,
        type
      }
    ]);
  }, []);

  // Direct save match state to database
  const saveMatchToDB = useCallback(async (
    currentScoreA = scoreA,
    currentScoreB = scoreB,
    currentWinner = winner,
    currentWinMethod = winMethod,
    currentLogs = logs
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

            return {
              ...m,
              winnerId: winnerIdVal,
              status: currentWinner ? "COMPLETED" : running ? "IN_PROGRESS" : m.status,
              scoreA: currentScoreA,
              scoreB: currentScoreB,
              winMethod: currentWinMethod,
              logs: currentLogs,
              timeLeft,
            };
          }
          return m;
        }));

        if (matchFound) {
          // If match completed, advance the winner
          for (let ri = 0; ri < newRounds.length; ri++) {
            for (let mi = 0; mi < newRounds[ri].length; mi++) {
              if (newRounds[ri][mi].matchId === matchId && currentWinner) {
                const nextRi = ri + 1;
                if (nextRi < newRounds.length) {
                  const nextMi = Math.floor(mi / 2);
                  const winnerIdVal = currentWinner === "A" ? sp.get("fighterAId") : sp.get("fighterBId");
                  const winnerSlot = {
                    playerId: winnerIdVal,
                    playerName: currentWinner === "A" ? fighterAName : fighterBName,
                    club: currentWinner === "A" ? fighterAClub : fighterBClub,
                    isBye: false,
                  };
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
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ageGroup: targetDraw.ageGroup,
          gender: targetDraw.gender,
          weightCategory: targetDraw.weightCategory,
          rounds: targetDraw.rounds,
        })
      });

      if (!postRes.ok) {
        console.error("Failed to save match to database:", await postRes.text());
      }
    } catch (err) {
      console.error("Error saving match to DB:", err);
    }
  }, [tournamentId, matchId, scoreA, scoreB, winner, winMethod, logs, timeLeft, running, sp, fighterAName, fighterBName, fighterAClub, fighterBClub]);

  // Restore match state from DB on mount
  useEffect(() => {
    if (!tournamentId || !matchId) return;
    const token = localStorage.getItem("token");
    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/tournaments/${tournamentId}/draws`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.ok ? r.json() : null)
      .then((draws: any[]) => {
        if (!draws || !Array.isArray(draws)) return;
        for (const draw of draws) {
          if (!Array.isArray(draw.rounds)) continue;
          for (const round of draw.rounds) {
            for (const m of round) {
              if (m.matchId === matchId) {
                if (m.scoreA) setScoreA(m.scoreA);
                if (m.scoreB) setScoreB(m.scoreB);
                if (m.winnerId) {
                  const f: Fighter = m.winnerId === sp.get("fighterAId") ? "A" : "B";
                  setWinner(f);
                }
                if (m.winMethod) setWinMethod(m.winMethod);
                if (m.logs) setLogs(m.logs);
                if (typeof m.timeLeft === "number") setTimeLeft(m.timeLeft);
                break;
              }
            }
          }
        }
      })
      .catch(err => console.error("Error restoring match state from DB:", err));
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
    const nextLogs = [
      ...logs,
      {
        id: `${Date.now()}_win`,
        timestamp: Date.now(),
        text: newLogText,
        type: "system" as const
      }
    ];
    setLogs(nextLogs);

    // Broadcast result to tournament page
    const sp2 = new URLSearchParams(window.location.search);
    const matchId    = sp2.get("matchId") || "";
    const fighterAId = sp2.get("fighterAId") || "";
    const fighterBId = sp2.get("fighterBId") || "";
    const winnerId   = f === "A" ? fighterAId : fighterBId;
    const winnerClub = f === "A" ? fighterAClub : fighterBClub;
    try {
      const ch = new BroadcastChannel("tnja_match_results");
      ch.postMessage({ matchId, winnerId, winnerName, winnerClub });
      ch.close();
    } catch {}

    // Direct Save to DB
    saveMatchToDB(scoreA, scoreB, f, method, nextLogs);
  }, [fighterAName, fighterBName, fighterAClub, fighterBClub, scoreA, scoreB, logs, saveMatchToDB]);

  const canScore = running && !winner;

  const addScore = useCallback((fighter: Fighter, field: keyof Score) => {
    if (!canScore) return;
    setRunning(false);

    const fighterName = fighter === "A" ? fighterAName : fighterBName;
    const label = field === "wazaAri" ? "Waza-ari" : field.toUpperCase();

    if (fighter === "A") {
      setScoreA(prev => {
        const next = { ...prev, [field]: prev[field] + 1 };
        const logText = `${fighterName} scored ${label}`;
        const nextLogs = [
          ...logs,
          {
            id: `${Date.now()}_score_a_${field}`,
            timestamp: Date.now(),
            text: logText,
            type: "score" as const
          }
        ];
        setLogs(nextLogs);

        const { w, m } = checkWin(next, scoreB);
        if (w) setTimeout(() => declareWinner(w, m), 50);
        else saveMatchToDB(next, scoreB, null, "", nextLogs);

        return next;
      });
    } else {
      setScoreB(prev => {
        const next = { ...prev, [field]: prev[field] + 1 };
        const logText = `${fighterName} scored ${label}`;
        const nextLogs = [
          ...logs,
          {
            id: `${Date.now()}_score_b_${field}`,
            timestamp: Date.now(),
            text: logText,
            type: "score" as const
          }
        ];
        setLogs(nextLogs);

        const { w, m } = checkWin(scoreA, next);
        if (w) setTimeout(() => declareWinner(w, m), 50);
        else saveMatchToDB(scoreA, next, null, "", nextLogs);

        return next;
      });
    }
  }, [canScore, scoreA, scoreB, checkWin, declareWinner, fighterAName, fighterBName, logs, saveMatchToDB]);

  const undoScore = (fighter: Fighter, field: keyof Score) => {
    if (winner) return;
    const fighterName = fighter === "A" ? fighterAName : fighterBName;
    const label = field === "wazaAri" ? "Waza-ari" : field.toUpperCase();
    
    const logText = `Undo: ${fighterName} score decreased (${label})`;
    const nextLogs = [
      ...logs,
      {
        id: `${Date.now()}_undo_${fighter}_${field}`,
        timestamp: Date.now(),
        text: logText,
        type: "system" as const
      }
    ];
    setLogs(nextLogs);

    if (fighter === "A") {
      setScoreA(p => {
        const next = { ...p, [field]: Math.max(0, p[field] - 1) };
        saveMatchToDB(next, scoreB, null, "", nextLogs);
        return next;
      });
    } else {
      setScoreB(p => {
        const next = { ...p, [field]: Math.max(0, p[field] - 1) };
        saveMatchToDB(scoreA, next, null, "", nextLogs);
        return next;
      });
    }
  };

  const applyTechnique = (fighter: Fighter) => {
    const selectedTech = fighter === "A" ? selectedTechA : selectedTechB;
    if (!selectedTech) return;
    if (!canScore) return;
    setTechModal({ fighter, technique: selectedTech });
  };

  const confirmTechnique = (scoreField: "ippon" | "wazaAri" | "yuko") => {
    if (!techModal) return;
    const { fighter, technique } = techModal;
    setTechModal(null);

    const fighterName = fighter === "A" ? fighterAName : fighterBName;
    const label = scoreField === "wazaAri" ? "Waza-ari" : scoreField.toUpperCase();
    
    setRunning(false);

    if (fighter === "A") setSelectedTechA("");
    else setSelectedTechB("");

    if (fighter === "A") {
      setScoreA(prev => {
        const next = { ...prev, [scoreField]: prev[scoreField] + 1 };
        const logText = `${fighterName} scored ${label} via ${technique}`;
        const nextLogs = [
          ...logs,
          {
            id: `${Date.now()}_tech_a`,
            timestamp: Date.now(),
            text: logText,
            type: "score" as const
          }
        ];
        setLogs(nextLogs);

        const { w, m } = checkWin(next, scoreB);
        if (w) setTimeout(() => declareWinner(w, `${m} (${technique})`), 50);
        else saveMatchToDB(next, scoreB, null, "", nextLogs);

        return next;
      });
    } else {
      setScoreB(prev => {
        const next = { ...prev, [scoreField]: prev[scoreField] + 1 };
        const logText = `${fighterName} scored ${label} via ${technique}`;
        const nextLogs = [
          ...logs,
          {
            id: `${Date.now()}_tech_b`,
            timestamp: Date.now(),
            text: logText,
            type: "score" as const
          }
        ];
        setLogs(nextLogs);

        const { w, m } = checkWin(scoreA, next);
        if (w) setTimeout(() => declareWinner(w, `${m} (${technique})`), 50);
        else saveMatchToDB(scoreA, next, null, "", nextLogs);

        return next;
      });
    }
  };

  const applyPenalty = (fighter: Fighter) => {
    const selectedPen = fighter === "A" ? selectedPenA : selectedPenB;
    if (!selectedPen) return;
    if (!canScore) return;

    const fighterName = fighter === "A" ? fighterAName : fighterBName;

    if (fighter === "A") setSelectedPenA("");
    else setSelectedPenB("");

    setRunning(false);

    const isDirectHansoku = selectedPen.toLowerCase().includes("hansoku-make");

    if (isDirectHansoku) {
      const opponent = fighter === "A" ? "B" : "A";
      const winReason = `Hansoku-make (${selectedPen})`;
      const logText = `${fighterName} disqualified via Hansoku-make (${selectedPen})`;
      const nextLogs = [
        ...logs,
        {
          id: `${Date.now()}_pen_disq`,
          timestamp: Date.now(),
          text: logText,
          type: "penalty" as const
        }
      ];
      setLogs(nextLogs);

      if (fighter === "A") {
        setScoreA(prev => {
          const next = { ...prev, shido: 3 };
          setTimeout(() => declareWinner(opponent, winReason), 50);
          return next;
        });
      } else {
        setScoreB(prev => {
          const next = { ...prev, shido: 3 };
          setTimeout(() => declareWinner(opponent, winReason), 50);
          return next;
        });
      }
    } else {
      if (fighter === "A") {
        setScoreA(prev => {
          const next = { ...prev, shido: prev.shido + 1 };
          const logText = `${fighterName} received Shido for ${selectedPen}`;
          const nextLogs = [
            ...logs,
            {
              id: `${Date.now()}_pen_a`,
              timestamp: Date.now(),
              text: logText,
              type: "penalty" as const
            }
          ];
          setLogs(nextLogs);

          const { w, m } = checkWin(next, scoreB);
          if (w) setTimeout(() => declareWinner(w, m), 50);
          else saveMatchToDB(next, scoreB, null, "", nextLogs);

          return next;
        });
      } else {
        setScoreB(prev => {
          const next = { ...prev, shido: prev.shido + 1 };
          const logText = `${fighterName} received Shido for ${selectedPen}`;
          const nextLogs = [
            ...logs,
            {
              id: `${Date.now()}_pen_b`,
              timestamp: Date.now(),
              text: logText,
              type: "penalty" as const
            }
          ];
          setLogs(nextLogs);

          const { w, m } = checkWin(scoreA, next);
          if (w) setTimeout(() => declareWinner(w, m), 50);
          else saveMatchToDB(scoreA, next, null, "", nextLogs);

          return next;
        });
      }
    }
  };

  useEffect(() => {
    if (running) {
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            clearInterval(timerRef.current!);
            setRunning(false);
            const aS = scoreA.wazaAri * 10 + scoreA.yuko + scoreA.ippon * 100;
            const bS = scoreB.wazaAri * 10 + scoreB.yuko + scoreB.ippon * 100;
            if (aS > bS)      setTimeout(() => declareWinner("A", "Decision"), 50);
            else if (bS > aS) setTimeout(() => declareWinner("B", "Decision"), 50);
            else { setGoldenScore(true); return durationInput * 60; }
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [running, scoreA, scoreB, durationInput, declareWinner]);

  useEffect(() => {
    if (osaActive && osaFor) {
      osaRef.current = setInterval(() => {
        setOsaTime(t => {
          const next = t + 1;
          if (next === OSAEKOMI_WAZAARI_S && !osaMilestones.current.wazaAri) {
            osaMilestones.current.wazaAri = true;
            if (osaFor === "A") setScoreA(p => { const nx = { ...p, wazaAri: p.wazaAri + 1 }; const { w, m } = checkWin(nx, scoreB); if (w) setTimeout(() => declareWinner(w, m), 50); return nx; });
            else                setScoreB(p => { const nx = { ...p, wazaAri: p.wazaAri + 1 }; const { w, m } = checkWin(scoreA, nx); if (w) setTimeout(() => declareWinner(w, m), 50); return nx; });
          }
          if (next >= OSAEKOMI_IPPON_S) {
            clearInterval(osaRef.current!); setOsaActive(false); setRunning(false);
            if (osaFor === "A") { setScoreA(p => { const nx = { ...p, ippon: p.ippon + 1 }; setTimeout(() => declareWinner("A", "Ippon (Osaekomi 20s)"), 50); return nx; }); }
            else                { setScoreB(p => { const nx = { ...p, ippon: p.ippon + 1 }; setTimeout(() => declareWinner("B", "Ippon (Osaekomi 20s)"), 50); return nx; }); }
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

  const toketa = () => {
    setOsaActive(false); setOsaFor(null); setOsaTime(0);
    if (osaRef.current) clearInterval(osaRef.current);
  };

  const resetAll = () => {
    setScoreA(emptyScore()); setScoreB(emptyScore());
    setWinner(null); setWinMethod(""); setGoldenScore(false);
    setTimeLeft(durationInput * 60); setRunning(false); setTimerStarted(false);
    setLogs([]);
    toketa();
    setMatchSaved(false);
    setSaveMessage("");
    saveMatchToDB(emptyScore(), emptyScore(), null, "", []);
  };

  const handleSaveMatch = async () => {
    if (!winner) return;
    setSaveMessage("💾 Saving match result...");
    try {
      await saveMatchToDB(scoreA, scoreB, winner, winMethod, logs);
      setMatchSaved(true);
      setSaveMessage("✅ Match result saved to database!");
      setTimeout(() => setSaveMessage(""), 2000);
    } catch (err) {
      setSaveMessage("❌ Failed to save match result");
      setTimeout(() => setSaveMessage(""), 2000);
    }
  };

  const downloadMatchReport = () => {
    if (!winner) return;

    const winnerName = winner === "A" ? fighterAName : fighterBName;
    const winnerClub = winner === "A" ? fighterAClub : fighterBClub;
    const loserName = winner === "A" ? fighterBName : fighterAName;
    const loserClub = winner === "A" ? fighterBClub : fighterAClub;

    const winnerScore = winner === "A" ? scoreA : scoreB;
    const loserScore = winner === "A" ? scoreB : scoreA;

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Match Report - ${matchNumber}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body {
            width: 100%;
            height: 100%;
          }
          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            background: white;
            padding: 20px;
          }
          .container {
            max-width: 900px;
            margin: 0 auto;
            background: white;
            padding: 40px;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 4px solid #FF7400;
            padding-bottom: 20px;
          }
          .header h1 {
            font-size: 32px;
            color: #333;
            margin-bottom: 5px;
            font-weight: black;
          }
          .header p {
            color: #666;
            font-size: 14px;
            margin: 2px 0;
          }
          .tournament-info {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 15px;
            margin-bottom: 30px;
            padding: 15px;
            background: #f9f9f9;
            border-radius: 8px;
            border: 1px solid #e0e0e0;
          }
          .info-item {
            font-size: 12px;
          }
          .info-label {
            color: #FF7400;
            font-weight: bold;
            display: block;
            margin-bottom: 3px;
            text-transform: uppercase;
          }
          .info-value {
            color: #333;
            font-weight: 600;
            font-size: 14px;
          }
          .match-meta {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr 1fr;
            gap: 12px;
            margin-bottom: 25px;
          }
          .meta-card {
            background: #f0f0f0;
            padding: 12px;
            border-radius: 6px;
            border-left: 4px solid #FF7400;
            text-align: center;
          }
          .meta-card .label {
            font-size: 10px;
            color: #666;
            font-weight: bold;
            text-transform: uppercase;
            margin-bottom: 3px;
          }
          .meta-card .value {
            font-size: 18px;
            color: #333;
            font-weight: black;
          }
          .fighters-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
          }
          .fighter-card {
            padding: 20px;
            border-radius: 10px;
            border: 2px solid #ddd;
          }
          .fighter-card.winner {
            border-color: #22c55e;
            background: #f0fdf4;
          }
          .fighter-card.loser {
            border-color: #999;
            background: #f9f9f9;
          }
          .fighter-card h3 {
            font-size: 13px;
            color: #FF7400;
            text-transform: uppercase;
            margin-bottom: 8px;
            font-weight: bold;
          }
          .fighter-card .name {
            font-size: 24px;
            font-weight: black;
            color: #333;
            margin-bottom: 5px;
          }
          .fighter-card .club {
            font-size: 13px;
            color: #666;
            margin-bottom: 12px;
            font-weight: 600;
          }
          .score-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr 1fr;
            gap: 8px;
            margin-top: 10px;
          }
          .score-item {
            text-align: center;
            padding: 8px;
            background: white;
            border-radius: 6px;
            border: 1px solid #e0e0e0;
          }
          .score-item .label {
            font-size: 10px;
            color: #666;
            font-weight: bold;
            text-transform: uppercase;
            margin-bottom: 2px;
          }
          .score-item .value {
            font-size: 20px;
            color: #333;
            font-weight: black;
          }
          .result-section {
            background: #fef3c7;
            padding: 20px;
            border-radius: 10px;
            border: 2px solid #fbbf24;
            margin-bottom: 25px;
            text-align: center;
          }
          .result-section .label {
            font-size: 11px;
            color: #b45309;
            font-weight: bold;
            text-transform: uppercase;
            margin-bottom: 5px;
          }
          .result-section .method {
            font-size: 20px;
            color: #333;
            font-weight: black;
          }
          .logs-section {
            background: #f9f9f9;
            padding: 15px;
            border-radius: 8px;
            border: 1px solid #e0e0e0;
            margin-bottom: 25px;
          }
          .logs-section h4 {
            font-size: 12px;
            color: #FF7400;
            font-weight: bold;
            text-transform: uppercase;
            margin-bottom: 10px;
          }
          .log-item {
            font-size: 12px;
            color: #555;
            padding: 5px 0;
            border-bottom: 1px solid #e0e0e0;
          }
          .log-item:last-child {
            border-bottom: none;
          }
          .footer {
            text-align: center;
            color: #999;
            font-size: 11px;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
          }
          @media print {
            body {
              background: white;
              padding: 0;
            }
            .container {
              box-shadow: none;
              border: none;
              padding: 0;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚔️ JUDO MATCH REPORT</h1>
            <p>Official Match Record</p>
          </div>

          <div class="tournament-info">
            <div class="info-item">
              <span class="info-label">Tournament</span>
              <span class="info-value">${tournamentTitle || "TNJA Championship"}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Weight Category</span>
              <span class="info-value">${weightCategory}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Date</span>
              <span class="info-value">${new Date().toLocaleDateString("en-IN")}</span>
            </div>
          </div>

          <div class="match-meta">
            <div class="meta-card">
              <div class="label">Mat</div>
              <div class="value">${matNumber}</div>
            </div>
            <div class="meta-card">
              <div class="label">Match</div>
              <div class="value">#${matchNumber}</div>
            </div>
            <div class="meta-card">
              <div class="label">Duration</div>
              <div class="value">${Math.floor((durationInput * 60 - timeLeft) / 60)}:${String((durationInput * 60 - timeLeft) % 60).padStart(2, "0")}</div>
            </div>
            <div class="meta-card">
              <div class="label">Time Left</div>
              <div class="value">${fmt(timeLeft)}</div>
            </div>
          </div>

          <div class="fighters-section">
            <div class="fighter-card winner">
              <h3>🏆 WINNER</h3>
              <div class="name">${winnerName}</div>
              <div class="club">${winnerClub}</div>
              <div class="score-grid">
                <div class="score-item">
                  <div class="label">Ippon</div>
                  <div class="value">${winnerScore.ippon}</div>
                </div>
                <div class="score-item">
                  <div class="label">Waza-ari</div>
                  <div class="value">${winnerScore.wazaAri}</div>
                </div>
                <div class="score-item">
                  <div class="label">Yuko</div>
                  <div class="value">${winnerScore.yuko}</div>
                </div>
                <div class="score-item">
                  <div class="label">Shido</div>
                  <div class="value">${winnerScore.shido}</div>
                </div>
              </div>
            </div>

            <div class="fighter-card loser">
              <h3>⚪ OPPONENT</h3>
              <div class="name">${loserName}</div>
              <div class="club">${loserClub}</div>
              <div class="score-grid">
                <div class="score-item">
                  <div class="label">Ippon</div>
                  <div class="value">${loserScore.ippon}</div>
                </div>
                <div class="score-item">
                  <div class="label">Waza-ari</div>
                  <div class="value">${loserScore.wazaAri}</div>
                </div>
                <div class="score-item">
                  <div class="label">Yuko</div>
                  <div class="value">${loserScore.yuko}</div>
                </div>
                <div class="score-item">
                  <div class="label">Shido</div>
                  <div class="value">${loserScore.shido}</div>
                </div>
              </div>
            </div>
          </div>

          <div class="result-section">
            <div class="label">Decision</div>
            <div class="method">${winMethod}</div>
          </div>

          ${logs && logs.length > 0 ? `
            <div class="logs-section">
              <h4>Match Events Log</h4>
              ${logs.map((log: any) => `<div class="log-item">• ${log.text}</div>`).join("")}
            </div>
          ` : ""}

          <div class="footer">
            <p>Generated: ${new Date().toLocaleString("en-IN")}</p>
            <p>TNJA © Tamil Nadu Judo Association</p>
            <p>Match Record - Official Document</p>
          </div>
        </div>
        <script>
          window.addEventListener('load', function() {
            setTimeout(function() {
              window.print();
            }, 250);
          });
        </script>
      </body>
      </html>
    `;

    try {
      const newWindow = window.open("", "PRINT", "width=900,height=600");
      if (newWindow) {
        newWindow.document.write(html);
        newWindow.document.close();
      }
    } catch (err) {
      console.error("Error opening print dialog:", err);
      // Fallback: use blob URL
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const printWindow = window.open(url, "PRINT", "width=900,height=600");
      if (printWindow) {
        printWindow.addEventListener("load", () => {
          setTimeout(() => printWindow.print(), 250);
        });
      }
    }
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

  const saveToLocal = () => {
    localStorage.setItem("tnja_last_match", JSON.stringify({ scoreA, scoreB, winner, winMethod, fighterAName, fighterBName }));
  };

  const loadLast = () => {
    const saved = localStorage.getItem("tnja_last_match");
    if (saved) { const d = JSON.parse(saved); setScoreA(d.scoreA); setScoreB(d.scoreB); }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-[#0a0a0f] flex flex-col font-sans select-none overflow-y-auto">
      <div className="max-w-[1440px] w-full mx-auto px-4 py-3 flex flex-col gap-3">

        {/* ── Top Header ──────────────────────────────────────────────────── */}
        <div className="bg-white rounded-md py-3 px-8 flex items-center justify-center relative shadow border border-gray-200 min-h-[64px]">
          <div className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-blue-100 border-2 border-blue-300 flex items-center justify-center overflow-hidden">
              <span className="text-[9px] font-black text-blue-700 text-center leading-tight">TNJA</span>
            </div>
            <div className="w-11 h-11 rounded-full bg-orange-100 border-2 border-orange-300 flex items-center justify-center overflow-hidden">
              <span className="text-[9px] font-black text-orange-700 text-center leading-tight">JFA</span>
            </div>
            <div className="w-11 h-11 rounded-full bg-green-100 border-2 border-green-300 flex items-center justify-center overflow-hidden">
              <span className="text-[9px] font-black text-green-700 text-center leading-tight">IJF</span>
            </div>
          </div>
          <h1 className="text-base md:text-lg font-black text-center tracking-wide text-black uppercase px-40">
            {tournamentTitle}
          </h1>
        </div>

        {/* ── Info Bar ────────────────────────────────────────────────────── */}
        <div className="bg-[#111827] rounded-md px-5 py-2.5 flex items-center justify-between border border-white/10">
          {/* Duration */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-400">Duration</span>
            <input
              type="number" value={durationInput} onChange={handleDurationChange}
              className="w-14 bg-white text-black text-center font-bold py-1 px-1 rounded text-sm border-0 focus:outline-none"
            />
            <span className="text-xs font-semibold text-gray-400">min</span>
          </div>

          {/* Match Info */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Match Information</span>
            <div className="flex gap-2">
              <div className="bg-white text-black font-bold px-5 py-1.5 rounded text-sm min-w-[80px] text-center shadow-sm">
                {weightCategory}
              </div>
              <div className="bg-white text-black font-bold px-5 py-1.5 rounded text-sm min-w-[100px] text-center shadow-sm">
                Match # {matchNumber}
              </div>
              <div className="bg-white text-black font-bold px-5 py-1.5 rounded text-sm min-w-[90px] text-center shadow-sm">
                Mat # {matNumber}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-400">Controls</span>
            <button className="flex items-center gap-1.5 bg-transparent border border-blue-500/60 hover:bg-blue-900/30 px-4 py-1.5 rounded text-sm font-bold text-blue-400 transition-colors">
              <Monitor size={13} className="text-blue-400" /> Scorecard
            </button>
          </div>
        </div>

        {/* ── Main Area ───────────────────────────────────────────────────── */}
        <div className="flex gap-3 items-stretch">

          {/* ── FIGHTER A — WHITE ──────────────────────────────────────────── */}
          <div className="flex-[1.15] bg-[#f0f2f5] rounded-xl flex flex-col border-2 border-gray-300 shadow-xl overflow-hidden">
            {/* Info */}
            <div className="flex items-start gap-3 p-4 border-b border-gray-200 bg-white">
              <div className="w-[72px] h-[84px] bg-gray-200 border border-gray-300 rounded flex-shrink-0 flex items-center justify-center overflow-hidden">
                <span className="text-[10px] text-gray-400 font-semibold">Photo</span>
              </div>
              <div className="flex-1 flex flex-col gap-2">
                <div>
                  <label className="text-[10px] text-gray-500 font-semibold block mb-0.5">Name</label>
                  <input readOnly value={fighterAName}
                    className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-black font-bold bg-white text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 font-semibold block mb-0.5">Club / Team</label>
                  <input readOnly value={fighterAClub}
                    className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-black font-semibold bg-white text-sm focus:outline-none" />
                </div>
              </div>
            </div>

            {/* Scores */}
            <div className="flex justify-between items-center px-6 py-5 border-b border-gray-200 bg-white">
              <ScoreCol label="IPPON"    value={scoreA.ippon}    big />
              <ScoreCol label="WAZA-ARI" value={scoreA.wazaAri} big />
              <ScoreCol label="YUKO"     value={scoreA.yuko}     big />
              <ScoreCol label="SHIDO"    value={scoreA.shido}    />
            </div>

            {/* Actions */}
            <div className="p-4 flex flex-col gap-3 bg-[#f0f2f5] flex-grow">
              <span className="text-xs font-bold text-gray-600">Actions</span>
              <div className="flex gap-1.5 flex-wrap">
                <Btn label="Ippon"    onClick={() => addScore("A","ippon")}   disabled={!canScore} cls="bg-[#198754] text-white hover:bg-[#157347]" />
                <Btn label="Waza-ari" onClick={() => addScore("A","wazaAri")} disabled={!canScore} cls="bg-[#ffc107] text-black hover:bg-[#e0a800]" />
                <Btn label="Yuko"     onClick={() => addScore("A","yuko")}    disabled={!canScore} cls="bg-[#6c757d] text-white hover:bg-[#5a6268]" />
                <Btn label="Shido"    onClick={() => addScore("A","shido")}   disabled={!canScore} cls="bg-white text-[#ffc107] border-2 border-[#ffc107] hover:bg-yellow-50" />
                <Btn label="Red Card" onClick={() => addScore("A","shido")}   disabled={!canScore} cls="bg-white text-red-600 border-2 border-red-500 hover:bg-red-50" />
              </div>
              <div className="flex gap-1.5">
                <Btn label="Undo"           onClick={() => undoScore("A","ippon")}       cls="bg-white text-gray-800 border border-gray-300 hover:bg-gray-100" />
                <Btn label="Declare Winner" onClick={() => declareWinner("A","Decision")} cls="bg-[#198754] text-white hover:bg-[#157347] flex-1" />
              </div>
              <div className="flex gap-2">
                <div className="flex flex-1 gap-1">
                  <select
                    value={selectedTechA}
                    onChange={(e) => setSelectedTechA(e.target.value)}
                    className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-xs text-gray-600 bg-white focus:outline-none"
                  >
                    <option value="">Select Technique</option>
                    {techniques.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <button
                    onClick={() => applyTechnique("A")}
                    className="px-3 py-1.5 text-[#198754] font-bold text-xs border border-[#198754] rounded hover:bg-green-50"
                  >
                    Apply
                  </button>
                </div>
                <div className="flex flex-1 gap-1">
                  <select
                    value={selectedPenA}
                    onChange={(e) => setSelectedPenA(e.target.value)}
                    className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-xs text-gray-600 bg-white focus:outline-none"
                  >
                    <option value="">Select Penalty</option>
                    {penalties.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <button
                    onClick={() => applyPenalty("A")}
                    className="px-3 py-1.5 text-[#ffc107] font-bold text-xs border border-[#ffc107] rounded hover:bg-yellow-50"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── CENTER ──────────────────────────────────────────────────────── */}
          <div className="w-[270px] shrink-0 flex flex-col gap-2">
            {/* Timer */}
            <div className="bg-[#111827] border border-white/10 rounded-xl flex flex-col items-center justify-center py-5 px-4 shadow-xl">
              {goldenScore && (
                <div className="text-[10px] font-black text-yellow-400 uppercase tracking-widest mb-1">Golden Score</div>
              )}
              <div className="text-[72px] font-black text-[#ff2222] tabular-nums leading-none tracking-tight" style={{ fontVariantNumeric: "tabular-nums" }}>
                {fmt(timeLeft)}
              </div>
              {osaActive && (
                <div className="text-2xl font-black text-[#ffc107] tabular-nums mt-1">{osaTime}s</div>
              )}
              <div className="flex gap-2 w-full mt-4">
                <button onClick={() => { if (!winner) { setRunning(r => !r); setTimerStarted(true); } }}
                  className="flex-1 border border-white/30 bg-transparent hover:bg-white/10 text-white font-bold py-1.5 rounded text-sm transition-colors">
                  {running ? "Pause" : "Start"}
                </button>
                <button onClick={() => setRunning(false)}
                  className="flex-1 border border-white/30 bg-transparent hover:bg-white/10 text-white font-bold py-1.5 rounded text-sm transition-colors">
                  End
                </button>
              </div>
            </div>

            {/* Osaekomi */}
            <div className="bg-[#111827] border border-white/10 rounded-xl p-3 flex flex-col gap-1.5 shadow-xl">
              <div className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest pb-1 border-b border-white/10">
                Osaekomi Timer Controls
              </div>
              <button onClick={() => startOsaekomi("A")}
                className="w-full py-2 bg-[#1a1a1a] border border-white/20 text-white text-xs font-bold rounded hover:bg-white/10 transition-colors">
                Osaekomi (White)
              </button>
              <button onClick={() => startOsaekomi("B")}
                className="w-full py-2 bg-[#1a1a1a] border border-white/20 text-white text-xs font-bold rounded hover:bg-white/10 transition-colors">
                Osaekomi (Blue)
              </button>
              <button onClick={() => startOsaekomi(osaFor === "A" ? "B" : "A")}
                className="w-full py-2 bg-[#ffc107] hover:bg-[#e0a800] text-black text-xs font-bold rounded transition-colors">
                Switch Hold
              </button>
              <button onClick={toketa}
                className="w-full py-2 bg-[#dc3545] hover:bg-[#c82333] text-white text-xs font-bold rounded transition-colors">
                Toketa
              </button>
            </div>

            {/* Match Logs Console */}
            <div className="bg-[#111827] border border-white/10 rounded-xl p-3 flex flex-col gap-2 shadow-xl flex-grow min-h-[160px] max-h-[220px]">
              <div className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest pb-1 border-b border-white/10">
                Match Log
              </div>
              <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-1 text-[11px] text-gray-300 scrollbar-thin">
                {logs.length === 0 ? (
                  <div className="text-gray-500 text-center py-4 italic">No events logged.</div>
                ) : (
                  logs.map(l => (
                    <div key={l.id} className="leading-tight border-b border-white/5 pb-1">
                      <span className="text-[9px] text-gray-500 font-mono mr-1">
                        {new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                      <span className={
                        l.type === "score" ? "text-green-400 font-semibold" :
                        l.type === "penalty" ? "text-yellow-400 font-semibold" :
                        "text-gray-400 font-semibold"
                      }>
                        {l.text}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Utility */}
            <button onClick={toggleFullscreen}
              className="w-full py-2 bg-[#6c757d] hover:bg-[#5a6268] text-white text-xs font-bold rounded transition-colors">
              Fullscreen
            </button>
            <button onClick={resetAll}
              className="w-full py-2 bg-[#1a1a1a] border border-white/20 hover:bg-white/10 text-white text-xs font-bold rounded transition-colors">
              Reset
            </button>
          </div>

          {/* ── FIGHTER B — BLUE ────────────────────────────────────────────── */}
          <div className="flex-[1.15] bg-[#001f5b] rounded-xl flex flex-col border-2 border-[#0d3b9e] shadow-xl overflow-hidden">
            {/* Info */}
            <div className="flex items-start gap-3 p-4 border-b border-blue-800/50 bg-[#002170]">
              <div className="w-[72px] h-[84px] bg-[#001040] border border-blue-700 rounded flex-shrink-0 flex items-center justify-center overflow-hidden">
                <span className="text-[10px] text-blue-400 font-semibold">Photo</span>
              </div>
              <div className="flex-1 flex flex-col gap-2">
                <div>
                  <label className="text-[10px] text-blue-300 font-semibold block mb-0.5">Name</label>
                  <input readOnly value={fighterBName}
                    className="w-full border border-blue-700/60 rounded px-2.5 py-1.5 text-white font-bold bg-[#001040] text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="text-[10px] text-blue-300 font-semibold block mb-0.5">Club / Team</label>
                  <input readOnly value={fighterBClub}
                    className="w-full border border-blue-700/60 rounded px-2.5 py-1.5 text-white font-semibold bg-[#001040] text-sm focus:outline-none" />
                </div>
              </div>
            </div>

            {/* Scores */}
            <div className="flex justify-between items-center px-6 py-5 border-b border-blue-800/40 bg-[#001f5b]">
              <ScoreCol label="IPPON"    value={scoreB.ippon}    big white />
              <ScoreCol label="WAZA-ARI" value={scoreB.wazaAri} big white />
              <ScoreCol label="YUKO"     value={scoreB.yuko}     big white />
              <ScoreCol label="SHIDO"    value={scoreB.shido}    white />
            </div>

            {/* Actions */}
            <div className="p-4 flex flex-col gap-3 flex-grow">
              <span className="text-xs font-bold text-blue-200">Actions</span>
              <div className="flex gap-1.5 flex-wrap">
                <Btn label="Ippon"    onClick={() => addScore("B","ippon")}   disabled={!canScore} cls="bg-[#198754] text-white hover:bg-[#157347]" />
                <Btn label="Waza-ari" onClick={() => addScore("B","wazaAri")} disabled={!canScore} cls="bg-[#ffc107] text-black hover:bg-[#e0a800]" />
                <Btn label="Yuko"     onClick={() => addScore("B","yuko")}    disabled={!canScore} cls="bg-[#6c757d] text-white hover:bg-[#5a6268]" />
                <Btn label="Shido"    onClick={() => addScore("B","shido")}   disabled={!canScore} cls="bg-transparent text-[#ffc107] border-2 border-[#ffc107] hover:bg-blue-900/40" />
                <Btn label="Red Card" onClick={() => addScore("B","shido")}   disabled={!canScore} cls="bg-transparent text-red-400 border-2 border-red-500 hover:bg-blue-900/40" />
              </div>
              <div className="flex gap-1.5">
                <Btn label="Undo"           onClick={() => undoScore("B","ippon")}       cls="bg-white text-gray-800 border border-gray-300 hover:bg-gray-100" />
                <Btn label="Declare Winner" onClick={() => declareWinner("B","Decision")} cls="bg-[#0d6efd] text-white hover:bg-[#0b5ed7] flex-1" />
              </div>
              <div className="flex gap-2">
                <div className="flex flex-1 gap-1">
                  <select
                    value={selectedTechB}
                    onChange={(e) => setSelectedTechB(e.target.value)}
                    className="flex-1 border border-blue-700/60 rounded px-2 py-1.5 text-xs text-blue-200 bg-[#001040] focus:outline-none"
                  >
                    <option value="">Select Technique</option>
                    {techniques.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <button
                    onClick={() => applyTechnique("B")}
                    className="px-3 py-1.5 text-[#198754] font-bold text-xs border border-[#198754] rounded hover:bg-green-900/30"
                  >
                    Apply
                  </button>
                </div>
                <div className="flex flex-1 gap-1">
                  <select
                    value={selectedPenB}
                    onChange={(e) => setSelectedPenB(e.target.value)}
                    className="flex-1 border border-blue-700/60 rounded px-2 py-1.5 text-xs text-blue-200 bg-[#001040] focus:outline-none"
                  >
                    <option value="">Select Penalty</option>
                    {penalties.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <button
                    onClick={() => applyPenalty("B")}
                    className="px-3 py-1.5 text-[#ffc107] font-bold text-xs border border-[#ffc107] rounded hover:bg-yellow-900/30"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Bottom Buttons ───────────────────────────────────────────────── */}
        <div className="flex justify-center gap-3 py-1">
          <button
            className="px-5 py-2 bg-transparent border border-white/30 text-white rounded text-xs font-bold hover:bg-white/10 transition-colors">
            Save to PDF
          </button>
          <button onClick={() => { saveToLocal(); saveMatchToDB(); }}
            className="px-5 py-2 bg-[#198754] hover:bg-[#157347] text-white rounded text-xs font-bold shadow-lg shadow-green-900/30 transition-colors">
            Save Match (DB & Local)
          </button>
          <button onClick={loadLast}
            className="px-5 py-2 bg-transparent border border-white/30 text-white rounded text-xs font-bold hover:bg-white/10 transition-colors">
            Load Last Match
          </button>
        </div>

        <div className="text-center pb-4 text-[10px] text-gray-600 font-bold uppercase tracking-[0.25em]">
          TNJA © TAMIL NADU JUDO ASSOCIATION
        </div>
      </div>

      {/* ── Winner Overlay ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {winner && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/85 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.7, y: 40, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 280, damping: 22 }}
              className="text-center px-10 py-12 max-w-md w-full mx-6 bg-gradient-to-b from-[#1a1a2e] to-[#0d0d1a] border border-white/10 rounded-3xl shadow-2xl"
            >
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring" }}
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

              {/* Save Status Message */}
              {saveMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 px-4 py-2 bg-blue-500/20 border border-blue-400/50 rounded-xl text-blue-300 text-xs font-black text-center"
                >
                  {saveMessage}
                </motion.div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2">
                <button
                  onClick={handleSaveMatch}
                  className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 rounded-2xl font-black text-sm text-white transition-all shadow-lg shadow-green-500/30 flex items-center justify-center gap-2"
                >
                  <CheckCircle size={16} /> Save Match Result
                </button>

                <button
                  onClick={downloadMatchReport}
                  className="w-full py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 rounded-2xl font-black text-sm text-white transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2"
                >
                  <Download size={16} /> Download Report (PDF)
                </button>

                <button
                  onClick={resetAll}
                  className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-2xl font-black text-sm text-white/70 hover:text-white transition-all flex items-center justify-center gap-2"
                >
                  <RotateCcw size={16} /> New Match / Reset
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Technique Score Type Selector Modal ────────────────────────────── */}
      <AnimatePresence>
        {techModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/70 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-[#111827] border border-white/10 rounded-2xl p-6 max-w-sm w-full mx-4 text-center shadow-2xl text-white"
            >
              <h3 className="text-lg font-bold mb-1">Apply Score</h3>
              <p className="text-xs text-gray-400 mb-5">
                Select score for <span className="text-orange-400 font-bold">{techModal.technique}</span> executed by{" "}
                <span className="text-white font-bold">
                  {techModal.fighter === "A" ? fighterAName : fighterBName}
                </span>
              </p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => confirmTechnique("ippon")}
                  className="py-3 bg-[#198754] hover:bg-[#157347] rounded-xl font-bold text-sm transition-all"
                >
                  Ippon
                </button>
                <button
                  onClick={() => confirmTechnique("wazaAri")}
                  className="py-3 bg-[#ffc107] hover:bg-[#e0a800] text-black rounded-xl font-bold text-sm transition-all"
                >
                  Waza-ari
                </button>
                <button
                  onClick={() => confirmTechnique("yuko")}
                  className="py-3 bg-[#6c757d] hover:bg-[#5a6268] rounded-xl font-bold text-sm transition-all"
                >
                  Yuko
                </button>
                <button
                  onClick={() => setTechModal(null)}
                  className="py-2.5 bg-transparent border border-white/20 hover:bg-white/10 rounded-xl text-xs text-gray-400 font-bold transition-all mt-2"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ScoreCol({ label, value, big, white }: { label: string; value: number; big?: boolean; white?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className={`text-[10px] font-bold tracking-widest ${white ? "text-blue-300" : "text-gray-500"}`}>{label}</span>
      <span className={`font-black tabular-nums leading-none ${big ? "text-[44px]" : "text-[28px]"} ${white ? "text-white" : "text-black"}`}>
        {value}
      </span>
    </div>
  );
}

function Btn({ label, onClick, cls, disabled }: { label: string; onClick: () => void; cls?: string; disabled?: boolean }) {
  return (
    <button
      onClick={onClick} disabled={disabled}
      className={`px-3 py-2 rounded text-xs font-bold transition-all whitespace-nowrap ${disabled ? "opacity-40 cursor-not-allowed" : ""} ${cls}`}
    >
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
