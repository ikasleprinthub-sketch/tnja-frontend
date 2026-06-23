"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy, Users, Shuffle, Swords, Monitor, ArrowLeft,
  Star, Grid, List, X, Check, Loader2, Calendar, MapPin,
  Target, Zap, Award, Medal,
  AlertCircle, Clock, Download, BarChart3,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

// ─── Types ───────────────────────────────────────────────────────────────────
type Tab = "overview" | "players" | "draws" | "matches" | "results";
type ViewMode = "list" | "bracket";

interface Tournament {
  id: string; title: string; date: string; dateTo?: string;
  location: string; level: string; entryFee: number; totalSlots: number;
  ageFrom: number; ageTo: number; gender: string; beltEligibility?: string;
  allowBPL: boolean; status: string;
  districtApproval: string; stateApproval: string;
  superAdminApproval: string; ceoApproval: string;
  registrationCount?: number;
  club?: { name: string; district?: { name: string } };
}

interface RegisteredPlayer {
  id: string; name: string; club: string; district: string;
  weight: number; ageGroup: string; gender: string; belt: string;
  seedNumber?: number;
}

interface BracketSlot {
  playerId: string | null; playerName: string;
  club: string; isBye: boolean; seedNumber?: number;
}

interface BracketMatch {
  matchId: string; round: number; matchNumber: number; matNumber: number;
  slotA: BracketSlot; slotB: BracketSlot;
  winnerId: string | null; status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
}

interface DrawCategory {
  ageGroup: string; gender: string; weightCategory: string;
  rounds: BracketMatch[][]; generated: boolean; saved: boolean;
}

interface Seeds {
  1: RegisteredPlayer | null; 2: RegisteredPlayer | null;
  3: RegisteredPlayer | null; 4: RegisteredPlayer | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function nextPow2(n: number): number { let p = 1; while (p < n) p <<= 1; return p; }

// Auto-advance non-BYE players through any BYE match (cascades through all rounds)
function processByeMatches(rounds: BracketMatch[][]): BracketMatch[][] {
  const r = rounds.map(row => row.map(m => ({ ...m })));
  for (let ri = 0; ri < r.length; ri++) {
    for (let mi = 0; mi < r[ri].length; mi++) {
      const m = r[ri][mi];
      if (m.status === "COMPLETED") continue;
      const aIsBye = m.slotA.isBye || (!m.slotA.playerId && m.slotA.playerName !== "TBD");
      const bIsBye = m.slotB.isBye || (!m.slotB.playerId && m.slotB.playerName !== "TBD");
      let winner: BracketSlot | null = null;
      if (aIsBye && m.slotB.playerId) winner = m.slotB;
      else if (bIsBye && m.slotA.playerId) winner = m.slotA;
      if (!winner) continue;
      r[ri][mi] = { ...m, winnerId: winner.playerId, status: "COMPLETED" };
      if (ri + 1 < r.length) {
        const nextIdx = Math.floor(mi / 2);
        const next = { ...r[ri + 1][nextIdx] };
        if (mi % 2 === 0) next.slotA = { ...winner };
        else next.slotB = { ...winner };
        r[ri + 1][nextIdx] = next;
      }
    }
  }
  return r;
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── IJF Bracket Generator ────────────────────────────────────────────────────
function generateIJFBracket(players: RegisteredPlayer[], seeds: Seeds): BracketMatch[][] {
  const N = nextPow2(Math.max(players.length, 2));
  const M = N / 2; // Number of matches in Round 1
  const B = N - players.length; // Number of BYEs
  const slots: (RegisteredPlayer | null | "BYE")[] = new Array(N).fill(null);

  // IJF seed positions: S1=top, S2=bottom, S3=2nd quarter, S4=3rd quarter
  if (seeds[1]) slots[0] = { ...seeds[1], seedNumber: 1 };
  if (seeds[2]) slots[N - 1] = { ...seeds[2], seedNumber: 2 };
  if (seeds[3]) slots[Math.floor(N / 4)] = { ...seeds[3], seedNumber: 3 };
  if (seeds[4]) slots[Math.floor((3 * N) / 4)] = { ...seeds[4], seedNumber: 4 };

  const seededIds = new Set(
    [seeds[1], seeds[2], seeds[3], seeds[4]].filter(Boolean).map((p) => p!.id)
  );
  const nonSeeded = shuffleArray(players.filter((p) => !seededIds.has(p.id)));

  // Determine which matches get a BYE to distribute them evenly and avoid BYE vs BYE
  const byeMatches = new Set<number>();
  if (B > 0) {
    if (B >= 1) byeMatches.add(0);
    if (B >= 2) byeMatches.add(M - 1);
    if (B >= 3) byeMatches.add(Math.floor(M / 4));
    if (B >= 4) byeMatches.add(Math.floor((3 * M) / 4));
    
    let remaining = B - byeMatches.size;
    if (remaining > 0) {
      const available: number[] = [];
      for (let i = 0; i < M; i++) {
        if (!byeMatches.has(i)) available.push(i);
      }
      for (let i = 0; i < remaining; i++) {
        const idx = Math.floor((i * available.length) / remaining);
        byeMatches.add(available[idx]);
      }
    }
  }

  // Assign BYEs to the slots of those matches
  for (const matchIdx of byeMatches) {
    const slotA = matchIdx * 2;
    const slotB = matchIdx * 2 + 1;
    if (slots[slotA] !== null) slots[slotB] = "BYE";
    else if (slots[slotB] !== null) slots[slotA] = "BYE";
    else slots[slotB] = "BYE"; // Default to bottom slot
  }

  // Fill remaining slots with unseeded players
  let ni = 0;
  for (let i = 0; i < N; i++) {
    if (slots[i] === null) {
      slots[i] = nonSeeded[ni++] || null;
    }
  }

  const toSlot = (p: RegisteredPlayer | null | "BYE"): BracketSlot => {
    if (p === "BYE" || p === null) return { playerId: null, playerName: "BYE", club: "", isBye: true };
    return { playerId: p.id, playerName: p.name, club: p.club, isBye: false, seedNumber: p.seedNumber };
  };

  const rounds: BracketMatch[][] = [];
  const r1: BracketMatch[] = [];
  for (let i = 0; i < N; i += 2) {
    r1.push({
      matchId: `M_1_${i / 2 + 1}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      round: 1, matchNumber: i / 2 + 1, matNumber: (i / 2 % 3) + 1,
      slotA: toSlot(slots[i]), slotB: toSlot(slots[i + 1]),
      winnerId: null, status: "PENDING",
    });
  }
  rounds.push(r1);

  let count = N / 2;
  let rNum = 2;
  while (count > 1) {
    count = Math.floor(count / 2);
    const round: BracketMatch[] = [];
    for (let i = 0; i < count; i++) {
      round.push({
        matchId: `M_${rNum}_${i + 1}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        round: rNum, matchNumber: i + 1, matNumber: (i % 3) + 1,
        slotA: { playerId: null, playerName: "TBD", club: "", isBye: false },
        slotB: { playerId: null, playerName: "TBD", club: "", isBye: false },
        winnerId: null, status: "PENDING",
      });
    }
    rounds.push(round);
    rNum++;
  }
  return rounds;
}

function roundName(ri: number, total: number): string {
  const fromEnd = total - ri;
  if (fromEnd === 1) return "🏆 Final";
  if (fromEnd === 2) return "Semi-Final";
  if (fromEnd === 3) return "Quarter-Final";
  return `Round ${ri + 1}`;
}

function findNextMatch(rounds: BracketMatch[][], currentRoundIndex: number, matchIndex: number, winner: BracketSlot) {
  if (currentRoundIndex >= rounds.length - 1) return null;

  const nextRound = rounds[currentRoundIndex + 1];
  const nextMatchIndex = Math.floor(matchIndex / 2);
  const nextMatch = nextRound[nextMatchIndex];

  if (!nextMatch) return null;

  const isSlotA = matchIndex % 2 === 0;
  const opponent = isSlotA ? nextMatch.slotB.playerName : nextMatch.slotA.playerName;

  return {
    roundIndex: currentRoundIndex + 1,
    matchNumber: nextMatch.matchNumber,
    matNumber: nextMatch.matNumber,
    opponent: opponent === "TBD" ? null : opponent,
  };
}

function exportMatchToPDF(
  match: BracketMatch,
  winner: BracketSlot,
  loser: BracketSlot,
  tournament: Tournament | null,
  roundIndex: number,
  nextMatchInfo: any
) {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Match Report</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: #f5f5f5;
          padding: 20px;
        }
        .container {
          max-width: 800px;
          margin: 0 auto;
          background: white;
          padding: 40px;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 3px solid #FF7400;
          padding-bottom: 20px;
        }
        .header h1 {
          font-size: 28px;
          color: #333;
          margin-bottom: 5px;
        }
        .header p {
          color: #666;
          font-size: 14px;
        }
        .tournament-info {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 30px;
          padding: 15px;
          background: #f9f9f9;
          border-radius: 8px;
        }
        .tournament-info div {
          font-size: 13px;
        }
        .tournament-info label {
          color: #FF7400;
          font-weight: bold;
          display: block;
          margin-bottom: 3px;
        }
        .tournament-info span {
          color: #333;
          font-weight: 500;
        }
        .match-details {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 30px;
        }
        .player-card {
          padding: 20px;
          border-radius: 8px;
          border: 2px solid #ddd;
        }
        .player-card.winner {
          border-color: #22c55e;
          background: #f0fdf4;
        }
        .player-card.loser {
          border-color: #ef4444;
          background: #fef2f2;
        }
        .player-card h3 {
          font-size: 14px;
          color: #666;
          text-transform: uppercase;
          margin-bottom: 8px;
          font-weight: bold;
        }
        .player-card .name {
          font-size: 22px;
          font-weight: bold;
          color: #333;
          margin-bottom: 5px;
        }
        .player-card .club {
          font-size: 13px;
          color: #666;
          margin-bottom: 8px;
        }
        .player-card .seed {
          display: inline-block;
          background: #fef3c7;
          color: #b45309;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: bold;
          margin-top: 8px;
        }
        .next-match {
          background: #eff6ff;
          border: 2px solid #3b82f6;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 30px;
        }
        .next-match h3 {
          color: #1e40af;
          font-size: 14px;
          margin-bottom: 10px;
          font-weight: bold;
        }
        .next-match .details {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          font-size: 13px;
        }
        .next-match .details div {
          color: #333;
        }
        .next-match .details label {
          color: #1e40af;
          font-weight: bold;
          display: block;
          margin-bottom: 2px;
        }
        .footer {
          text-align: center;
          color: #999;
          font-size: 12px;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
        }
        .match-meta {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin-bottom: 20px;
          padding: 15px;
          background: #f9f9f9;
          border-radius: 8px;
          font-size: 13px;
        }
        .match-meta label {
          color: #666;
          font-weight: bold;
        }
        .match-meta span {
          color: #333;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⚔️ MATCH REPORT</h1>
          <p>Match Result & Progression Record</p>
        </div>

        <div class="tournament-info">
          <div>
            <label>Tournament</label>
            <span>${tournament?.title || "N/A"}</span>
          </div>
          <div>
            <label>Date</label>
            <span>${tournament?.date || "N/A"}</span>
          </div>
          <div>
            <label>Level</label>
            <span>${tournament?.level || "N/A"}</span>
          </div>
          <div>
            <label>Location</label>
            <span>${tournament?.location || "N/A"}</span>
          </div>
        </div>

        <div class="match-meta">
          <div>
            <label>Mat Number:</label>
            <span>${match.matNumber}</span>
          </div>
          <div>
            <label>Match Number:</label>
            <span>#${match.matchNumber}</span>
          </div>
        </div>

        <div class="match-details">
          <div class="player-card winner">
            <h3>🏆 Winner</h3>
            <div class="name">${winner.playerName}</div>
            <div class="club">${winner.club}</div>
            ${winner.seedNumber ? `<span class="seed">Seed #${winner.seedNumber}</span>` : ""}
          </div>
          <div class="player-card loser">
            <h3>Opponent</h3>
            <div class="name">${loser.playerName}</div>
            <div class="club">${loser.club}</div>
            ${loser.seedNumber ? `<span class="seed">Seed #${loser.seedNumber}</span>` : ""}
          </div>
        </div>

        ${nextMatchInfo ? `
          <div class="next-match">
            <h3>📍 NEXT MATCH</h3>
            <div class="details">
              <div>
                <label>Round:</label>
                <span>${roundName(nextMatchInfo.roundIndex, 5)}</span>
              </div>
              <div>
                <label>Match:</label>
                <span>#${nextMatchInfo.matchNumber}</span>
              </div>
              <div style="grid-column: 1 / -1;">
                <label>Opponent Status:</label>
                <span>${nextMatchInfo.opponent ? `vs ${nextMatchInfo.opponent}` : "⏳ Waiting for opponent to advance"}</span>
              </div>
            </div>
          </div>
        ` : ""}

        <div class="footer">
          <p>Generated on ${new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}</p>
          <p>TNJA Tournament Management System</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const iframe = document.createElement("iframe");
  iframe.style.display = "none";
  document.body.appendChild(iframe);

  iframe.contentWindow?.document.write(html);
  iframe.onload = () => {
    iframe.contentWindow?.print();
    setTimeout(() => document.body.removeChild(iframe), 100);
  };
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function TournamentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tournamentId = params?.id as string;

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [players, setPlayers] = useState<RegisteredPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [viewMode, setViewMode] = useState<ViewMode>("bracket"); // default bracket

  const [ageFilter, setAgeFilter] = useState("ALL");
  const [genderFilter, setGenderFilter] = useState("MALE");
  const [weightFilter, setWeightFilter] = useState("ALL");

  const [draws, setDraws] = useState<Record<string, DrawCategory>>({});
  const drawsRef = useRef<Record<string, DrawCategory>>({});
  const [seeds, setSeeds] = useState<Seeds>({ 1: null, 2: null, 3: null, 4: null });
  const [showSeedModal, setShowSeedModal] = useState(false);
  const [assigningSeed, setAssigningSeed] = useState<1 | 2 | 3 | 4 | null>(null);
  const [champion, setChampion] = useState<{ name: string; club: string; categoryKey: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [drawPhase, setDrawPhase] = useState<"idle" | "shuffling" | "dealing" | "done">("idle");
  const [shuffleKey, setShuffleKey] = useState(0);
  const [autoGenerating, setAutoGenerating] = useState(false);
  const [autoGenProgress, setAutoGenProgress] = useState("");

  // ── Result Submission State ─────────────────────────────────────────────────
  const [placements, setPlacements] = useState<Record<string, "FIRST" | "SECOND" | "THIRD" | "PARTICIPATION">>({});
  const [submittingResults, setSubmittingResults] = useState(false);
  const [placementsAutoDetected, setPlacementsAutoDetected] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  // ── Auto-detect placements from draw results ─────────────────────────────────
  // Runs whenever the draws or players change (e.g. when Results tab is opened)
  const autoDetectPlacements = useCallback(() => {
    if (Object.keys(draws).length === 0 || players.length === 0) return;

    const detected: Record<string, "FIRST" | "SECOND" | "THIRD" | "PARTICIPATION"> = {};

    // Start everyone as PARTICIPATION
    players.forEach((p) => { detected[p.id] = "PARTICIPATION"; });

    // Iterate over every draw category to find final + semi-final losers/winners
    for (const draw of Object.values(draws)) {
      const rounds = draw.rounds;
      if (!rounds || rounds.length === 0) continue;

      const totalRounds = rounds.length;

      // ── Final (last round) ──────────────────────────────────────────────────
      const finalRound = rounds[totalRounds - 1];
      if (finalRound && finalRound.length > 0) {
        const finalMatch = finalRound[0];
        if (finalMatch.status === "COMPLETED" && finalMatch.winnerId) {
          // 🥇 Gold: winner of the final
          detected[finalMatch.winnerId] = "FIRST";

          // 🥈 Silver: loser of the final
          const silverPlayerId =
            finalMatch.winnerId === finalMatch.slotA.playerId
              ? finalMatch.slotB.playerId
              : finalMatch.slotA.playerId;
          if (silverPlayerId) detected[silverPlayerId] = "SECOND";
        }
      }

      // ── Semi-Finals (second-to-last round, if exists) ────────────────────────
      if (totalRounds >= 2) {
        const semiRound = rounds[totalRounds - 2];
        for (const match of semiRound) {
          if (match.status === "COMPLETED" && match.winnerId) {
            // 🥉 Bronze: loser of each semi-final
            const bronzePlayerId =
              match.winnerId === match.slotA.playerId
                ? match.slotB.playerId
                : match.slotA.playerId;
            if (bronzePlayerId && detected[bronzePlayerId] === "PARTICIPATION") {
              detected[bronzePlayerId] = "THIRD";
            }
          }
        }
      }
    }

    setPlacements(detected);
    setPlacementsAutoDetected(true);
  }, [draws, players]);

  const handleConcludeTournament = async () => {
    if (!window.confirm("Are you sure you want to conclude this tournament and submit the final results? This will CLOSE the tournament and allow participants to download their certificates. This action cannot be undone.")) return;

    const results = players.map((p) => ({
      playerId: p.id,
      placement: placements[p.id] || "PARTICIPATION",
    }));

    setSubmittingResults(true);
    try {
      const res = await fetch(`${API_BASE}/tournaments/${tournamentId}/results`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ results }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Tournament concluded! Certificates are now available for download. 🏆");
        fetchTournament();
      } else {
        showToast(data.error || "Failed to submit results", false);
      }
    } catch {
      showToast("Error submitting results", false);
    } finally {
      setSubmittingResults(false);
    }
  };

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  };


  const categoryKey = (age: string, gender: string, weight: string) =>
    `${age}_${gender}_${weight}`;
  const currentKey = categoryKey(ageFilter, genderFilter, weightFilter);

  // ── Fetch tournament ────────────────────────────────────────────────────────
  const fetchTournament = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/tournaments/${tournamentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setTournament(await res.json());
    } catch (e) { console.error(e); }
  }, [tournamentId, token]);

  // ── Fetch registered players ────────────────────────────────────────────────
  const fetchPlayers = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/tournaments/${tournamentId}/registrations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const raw = await res.json();
        // normalise: backend may return nested player objects
        const normalised: RegisteredPlayer[] = (Array.isArray(raw) ? raw : raw.registrations || []).map(
          (r: any) => ({
            id: r.playerId || r.player?.id || r.id,
            name: r.player?.fullName || r.playerName || r.name || "Unknown",
            club: r.player?.club?.name || r.club || "",
            district: r.player?.district?.name || r.district || "",
            weight: Math.ceil(Number(r.weightCategory || r.weight || 0) / 5) * 5,
            ageGroup: r.ageGroup || "SENIOR",
            gender: r.gender || r.player?.gender || "MALE",
            belt: r.belt || r.player?.belt || "",
          })
        );
        setPlayers(normalised);
      }
    } catch (e) { console.error(e); }
  }, [tournamentId, token]);

  // ── Fetch existing draws ────────────────────────────────────────────────────
  const fetchDraws = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/tournaments/${tournamentId}/draws`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const drawMap: Record<string, DrawCategory> = {};
        (Array.isArray(data) ? data : []).forEach((d: DrawCategory) => {
          let roundsArr = d.rounds;
          if (typeof roundsArr === "string") {
            try { roundsArr = JSON.parse(roundsArr); } catch (err) {}
          }
          if (!Array.isArray(roundsArr)) roundsArr = [];
          
          drawMap[categoryKey(d.ageGroup, d.gender, d.weightCategory)] = {
            ...d,
            rounds: processByeMatches(roundsArr),
            generated: true, saved: true,
          };
        });
        setDraws(drawMap);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [tournamentId, token]);

  useEffect(() => {
    fetchTournament();
    fetchPlayers();
    fetchDraws();
  }, [fetchTournament, fetchPlayers, fetchDraws]);

  // Auto-detect placements whenever the Results tab becomes active or draws/players update
  useEffect(() => {
    if (activeTab === "results") {
      autoDetectPlacements();
    }
  }, [activeTab, autoDetectPlacements]);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const filteredPlayers = players.filter((p) => {
    if (ageFilter !== "ALL" && p.ageGroup !== ageFilter) return false;
    if (genderFilter !== "ALL" && p.gender !== genderFilter) return false;
    if (weightFilter !== "ALL" && String(p.weight) !== weightFilter) return false;
    return true;
  });

  const weightOptions = [...new Set(players.map((p) => String(p.weight)))].sort(
    (a, b) => +a - +b
  );
  const currentDraw = draws[currentKey];

  // ── Actions ─────────────────────────────────────────────────────────────────
  const handleAssignSeed = (seedNum: 1 | 2 | 3 | 4, player: RegisteredPlayer) => {
    setSeeds((prev) => {
      const n = { ...prev };
      (Object.keys(n) as unknown as (1 | 2 | 3 | 4)[]).forEach((k) => {
        if (n[k]?.id === player.id) n[k] = null;
      });
      n[seedNum] = { ...player, seedNumber: seedNum };
      return n;
    });
    setAssigningSeed(null);
  };

  const handleGenerateAndSaveDraw = (isShuffle = false) => {
    if (ageFilter === "ALL") {
      showToast("Please select a specific Age Group to generate a manual draw, or use 'Auto-Generate Categories'.", false);
      return;
    }

    if (filteredPlayers.length < 2) {
      showToast("Need at least 2 players to generate a draw", false);
      return;
    }

    const hasActive = currentDraw?.rounds?.some(r => r.some(m => m.status === "COMPLETED" || m.status === "IN_PROGRESS"));
    if (hasActive) {
      showToast("Cannot shuffle or re-generate because matches have already started or completed in this category!", false);
      return;
    }

    if (isShuffle && currentDraw?.generated) {
      if (!window.confirm("Are you sure you want to completely re-shuffle this bracket? All unsaved matches will be lost.")) return;
    }

    setDrawPhase(isShuffle ? "shuffling" : "dealing");
    if (isShuffle) setShuffleKey(k => k + 1);
    
    const rawRounds = generateIJFBracket(filteredPlayers, seeds);
    const rounds = processByeMatches(rawRounds);
    
    setTimeout(async () => {
      const newDraw = {
        ageGroup: ageFilter, gender: genderFilter,
        weightCategory: weightFilter, rounds, generated: true, saved: false,
      };

      setDraws((prev) => ({ ...prev, [currentKey]: newDraw }));
      setDrawPhase("done");
      
      setSaving(true);
      try {
        const res = await fetch(`${API_BASE}/tournaments/${tournamentId}/draws`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            ageGroup: newDraw.ageGroup, gender: newDraw.gender,
            weightCategory: newDraw.weightCategory, rounds: newDraw.rounds,
          }),
        });
        if (res.ok) {
          const updatedDraw = await res.json();
          let backendRounds = updatedDraw.draw?.rounds || newDraw.rounds;
          if (typeof backendRounds === "string") {
            try { backendRounds = JSON.parse(backendRounds); } catch (err) {}
          }
          if (!Array.isArray(backendRounds)) backendRounds = newDraw.rounds;

          setDraws((prev) => ({
            ...prev,
            [currentKey]: {
              ...newDraw,
              rounds: backendRounds,
              saved: true
            }
          }));
          showToast(isShuffle ? "Bracket re-shuffled and auto-saved! 🏆" : "Draw generated and auto-saved! 🏆");
          await fetchDraws();
        } else {
          showToast("Failed to auto-save draw", false);
        }
      } catch { showToast("Error auto-saving draw", false); }
      finally { setSaving(false); }

    }, isShuffle ? 900 : 700);
  };

  const handleShuffle = () => handleGenerateAndSaveDraw(true);
  const handleGenerateDraw = () => handleGenerateAndSaveDraw(false);

  const handleAutoGenerateAllDraws = async () => {
    if (players.length === 0) {
      showToast("No players registered in the tournament", false);
      return;
    }

    // Filter players based on current age and gender dropdowns (ignore weight filter to generate all weights)
    const targetPlayers = players.filter((p) => {
      if (ageFilter !== "ALL" && p.ageGroup !== ageFilter) return false;
      if (genderFilter !== "ALL" && p.gender !== genderFilter) return false;
      return true;
    });

    if (targetPlayers.length === 0) {
      showToast("No players found for the selected Age and Gender.", false);
      return;
    }

    // Group players by category
    const categoryGroups: Record<string, RegisteredPlayer[]> = {};
    targetPlayers.forEach((p) => {
      const key = categoryKey(p.ageGroup, p.gender, String(p.weight));
      if (!categoryGroups[key]) categoryGroups[key] = [];
      categoryGroups[key].push(p);
    });

    // Filter categories with 2 or more players AND no active matches
    let skippedActive = 0;
    const eligibleCategories = Object.entries(categoryGroups).filter(([catKey, catPlayers]) => {
      if (catPlayers.length < 2) return false;
      const draw = draws[catKey];
      const hasActive = draw?.rounds?.some(r => r.some(m => m.status === "COMPLETED" || m.status === "IN_PROGRESS"));
      if (hasActive) {
        skippedActive++;
        return false;
      }
      return true;
    });

    if (eligibleCategories.length === 0) {
      showToast(skippedActive > 0 ? "All eligible categories already have active matches." : "No categories found with 2 or more players", false);
      return;
    }

    let confirmMsg = `Found ${eligibleCategories.length} eligible categories. This will auto-shuffle and generate draws for them.`;
    if (skippedActive > 0) confirmMsg += `\n\n(Skipped ${skippedActive} categories because they already have active matches.)`;
    confirmMsg += `\n\nProceed?`;
    
    if (!window.confirm(confirmMsg)) return;

    setAutoGenerating(true);
    let successCount = 0;

    try {
      for (const [key, catPlayers] of eligibleCategories) {
        const firstPlayer = catPlayers[0];
        const ageGroup = firstPlayer.ageGroup;
        const gender = firstPlayer.gender;
        const weightCategory = String(firstPlayer.weight);
        const displayLabel = `${ageGroup} ${gender} ${weightCategory}kg`;

        setAutoGenProgress(`Generating & saving draw for ${displayLabel}...`);

        const emptySeeds: Seeds = { 1: null, 2: null, 3: null, 4: null };
        const rounds = processByeMatches(generateIJFBracket(catPlayers, emptySeeds));

        try {
          const res = await fetch(`${API_BASE}/tournaments/${tournamentId}/draws`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              ageGroup,
              gender,
              weightCategory,
              rounds,
            }),
          });
          if (res.ok) {
            successCount++;
          } else {
            console.error(`Failed to save draw for ${key}`);
          }
        } catch (err) {
          console.error(`Error saving draw for ${key}:`, err);
        }
      }

      showToast(`Successfully auto-generated and saved draws for ${successCount} categories!`);
      await fetchDraws();
    } catch (err) {
      console.error("Error in bulk draw generation:", err);
      showToast("An error occurred during bulk generation", false);
    } finally {
      setAutoGenerating(false);
      setAutoGenProgress("");
    }
  };

  const openScoreboard = (match: BracketMatch) => {
    const p = new URLSearchParams({
      matchId: match.matchId,
      fighterAId:   match.slotA.playerId || "",
      fighterBId:   match.slotB.playerId || "",
      fighterAName: match.slotA.playerName,
      fighterBName: match.slotB.playerName,
      fighterAClub: match.slotA.club,
      fighterBClub: match.slotB.club,
      weightCategory: weightFilter === "ALL" ? "" : `${weightFilter} kg`,
      matchNumber: String(match.matchNumber),
      matNumber: String(match.matNumber),
      tournamentTitle: tournament?.title || "TNJA Championship",
      round: String(match.round),
    });
    window.open(
      `/dashboard/admin/tournaments/${tournamentId}/scoreboard?${p.toString()}`,
      "_blank"
    );
  };

  // ── Handle match result from scoreboard tab ──────────────────────────────────
  const handleMatchResult = useCallback((
    matchId: string, winnerId: string, winnerName: string, winnerClub: string
  ) => {
    const prev = drawsRef.current;
    const newDraws = { ...prev };
    let affectedCatKey = "";

    for (const catKey of Object.keys(newDraws)) {
      const cat = newDraws[catKey];
      const newRounds: BracketMatch[][] = cat.rounds.map(r => r.map(m => ({ ...m })));

      let foundRi = -1, foundMi = -1;
      for (let ri = 0; ri < newRounds.length; ri++) {
        for (let mi = 0; mi < newRounds[ri].length; mi++) {
          if (newRounds[ri][mi].matchId === matchId) { foundRi = ri; foundMi = mi; break; }
        }
        if (foundRi !== -1) break;
      }
      if (foundRi === -1) continue;

      if (newRounds[foundRi][foundMi].status === "COMPLETED") {
        alert("This match is already completed and locked. You cannot change the winner.");
        return;
      }

      newRounds[foundRi][foundMi] = { ...newRounds[foundRi][foundMi], winnerId, status: "COMPLETED" };

      if (foundRi + 1 < newRounds.length) {
        const nextMatchIdx = Math.floor(foundMi / 2);
        const winnerSlot: BracketSlot = { playerId: winnerId, playerName: winnerName, club: winnerClub, isBye: false };
        const nextMatch = { ...newRounds[foundRi + 1][nextMatchIdx] };
        if (foundMi % 2 === 0) nextMatch.slotA = winnerSlot;
        else                   nextMatch.slotB = winnerSlot;
        newRounds[foundRi + 1][nextMatchIdx] = nextMatch;
      }

      if (foundRi === newRounds.length - 1) {
        setTimeout(() => setChampion({ name: winnerName, club: winnerClub, categoryKey: catKey }), 0);
      }

      newDraws[catKey] = { ...cat, rounds: newRounds, saved: true };
      affectedCatKey = catKey;
      break;
    }

    drawsRef.current = newDraws;
    setDraws(newDraws);

    // Auto-save the affected draw so next-round matches persist after refresh
    if (affectedCatKey) {
      const draw = newDraws[affectedCatKey];
      fetch(`${API_BASE}/tournaments/${tournamentId}/draws`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          ageGroup: draw.ageGroup,
          gender: draw.gender,
          weightCategory: draw.weightCategory,
          rounds: draw.rounds,
        }),
      }).catch(() => {
        // mark unsaved if server save fails
        setDraws(d => ({ ...d, [affectedCatKey]: { ...d[affectedCatKey], saved: false } }));
      });
    }
  }, [token, tournamentId]);

  // Keep drawsRef in sync with draws state
  useEffect(() => { drawsRef.current = draws; }, [draws]);

  // ── Listen for results from scoreboard tab via BroadcastChannel ──────────────
  useEffect(() => {
    const channel = new BroadcastChannel("tnja_match_results");
    channel.onmessage = (e) => {
      const { matchId, winnerId, winnerName, winnerClub } = e.data;
      if (matchId && winnerName) handleMatchResult(matchId, winnerId, winnerName, winnerClub);
    };
    return () => channel.close();
  }, [handleMatchResult]);

  // ── Category filters UI ─────────────────────────────────────────────────────
  const CategoryFilters = () => {
    const allAgeGroups = [...new Set(players.map((p) => p.ageGroup))].sort((a, b) => a.localeCompare(b));

    return (
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3">
          Filter by Category
        </p>
        <div className="flex flex-wrap gap-3">
          <select value={ageFilter} onChange={(e) => setAgeFilter(e.target.value)}
            className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-300">
            <option value="ALL">All Age Groups</option>
            {allAgeGroups.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        <select value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)}
          className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-300">
          <option value="MALE">Male</option>
          <option value="FEMALE">Female</option>
        </select>
        <select value={weightFilter} onChange={(e) => setWeightFilter(e.target.value)}
          className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-300">
          <option value="ALL">All Weights</option>
          {weightOptions.map((w) => <option key={w} value={w}>{w} kg</option>)}
        </select>
        <span className="ml-auto text-sm font-bold text-slate-500 self-center">
          {filteredPlayers.length} players
        </span>
      </div>
    </div>
    );
  };

  // ── Expired check ────────────────────────────────────────────────────────────
  const expired = (() => {
    if (!tournament) return false;
    const end = tournament.dateTo || tournament.date;
    if (!end) return false;
    const d = new Date(end);
    d.setHours(23, 59, 59, 999);
    return d < new Date();
  })();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin text-[#FF7400]" size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 z-[200] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl text-white font-bold text-sm ${toast.ok ? "bg-emerald-600" : "bg-red-600"}`}>
            {toast.ok ? <Check size={18} /> : <X size={18} />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Back + header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()}
          className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
          <ArrowLeft size={20} className="text-slate-600" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-slate-800">{tournament?.title || "Tournament"}</h1>
          <p className="text-sm text-slate-500 font-semibold mt-0.5">Tournament Management Hub</p>
        </div>
      </div>

      {/* Summary banner */}
      {tournament && (
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 text-white">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Calendar, label: "Date", value: new Date(tournament.date).toLocaleDateString("en-GB") },
              { icon: MapPin, label: "Location", value: tournament.location },
              { icon: Users, label: "Players", value: `${players.length} / ${tournament.totalSlots}` },
              { icon: Trophy, label: "Level", value: tournament.level },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center shrink-0">
                  <Icon size={18} className="text-orange-400" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">{label}</p>
                  <p className="text-sm font-extrabold">{value}</p>
                </div>
              </div>
            ))}
          </div>
          {/* CLOSED badge */}
          {tournament.status === "CLOSED" && (
            <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-3">
              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 border border-emerald-400/30 rounded-xl">
                <Check size={15} className="text-emerald-400" />
                <span className="text-emerald-300 font-black text-sm">Tournament Concluded — Certificates Available</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Expired banner */}
      {expired && (
        <div className="flex items-center gap-4 px-6 py-4 bg-slate-800 border border-slate-600 rounded-2xl">
          <div className="w-10 h-10 bg-slate-600 rounded-xl flex items-center justify-center shrink-0">
            <Clock size={24} className="text-slate-300" />
          </div>
          <div>
            <p className="text-white font-black text-sm">Tournament Expired</p>
            <p className="text-slate-400 text-xs font-semibold mt-0.5">
              This tournament date has passed. You can view details and results but cannot generate draws or open scoreboards.
            </p>
          </div>
        </div>
      )}


      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl w-fit">
        {(["overview", "players", "draws", "matches", "results"] as Tab[]).map((tab) => {
          // Results tab is ALWAYS accessible — even for expired/CLOSED tournaments
          // Draws and matches are locked once the tournament date has passed
          const lockedByExpiry = expired && (tab === "draws" || tab === "matches");
          return (
            <button
              key={tab}
              onClick={() => !lockedByExpiry && setActiveTab(tab)}
              title={lockedByExpiry ? "Not available — tournament has expired" : undefined}
              className={`px-5 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-1.5 ${
                lockedByExpiry
                  ? "text-slate-300 cursor-not-allowed"
                  : activeTab === tab
                  ? "bg-white text-[#FF7400] shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {lockedByExpiry && <span className="text-[10px]">🔒</span>}
              {tab === "players" ? `Players (${players.length})` : tab === "draws" ? "Draw Generation" : tab === "results" ? "Results & Reports" : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          );
        })}
      </div>

      {/* ══ OVERVIEW ══════════════════════════════════════════════════════════ */}
      {activeTab === "overview" && tournament && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-1">
            <h3 className="font-black text-slate-800 text-base mb-4">Tournament Info</h3>
            {[
              { l: "Title", v: tournament.title },
              { l: "Level", v: tournament.level },
              { l: "Gender", v: tournament.gender },
              { l: "Age Range", v: `${tournament.ageFrom} – ${tournament.ageTo} yrs` },
              { l: "Entry Fee", v: `₹${tournament.entryFee}` },
              { l: "Total Slots", v: String(tournament.totalSlots) },
              { l: "Belt", v: tournament.beltEligibility || "All belts" },
              { l: "BPL Allowed", v: tournament.allowBPL ? "Yes" : "No" },
            ].map(({ l, v }) => (
              <div key={l} className="flex justify-between py-2.5 border-b border-slate-50 last:border-0">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{l}</span>
                <span className="text-sm font-extrabold text-slate-700">{v}</span>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-1">
            <h3 className="font-black text-slate-800 text-base mb-4">Approval Status</h3>
            {[
              { l: "District", v: tournament.districtApproval },
              { l: "State", v: tournament.stateApproval },
              { l: "Super Admin", v: tournament.superAdminApproval },
              { l: "CEO", v: tournament.ceoApproval },
              { l: "Overall", v: tournament.status },
            ]
              .filter((item) => tournament.status !== "APPROVED" || item.l === "Overall")
              .map(({ l, v }) => (
              <div key={l} className="flex justify-between items-center py-2.5 border-b border-slate-50 last:border-0">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{l}</span>
                <span className={`text-[10px] font-black px-3 py-1 rounded-full ${
                  v === "APPROVED" ? "bg-emerald-100 text-emerald-700" :
                  v === "REJECTED" ? "bg-red-100 text-red-700" :
                  v === "NOT_REQUIRED" ? "bg-slate-100 text-slate-400" :
                  "bg-amber-100 text-amber-700"}`}>
                  {v}
                </span>
              </div>
            ))}

            <div className="pt-4 p-4 bg-orange-50 rounded-2xl mt-4">
              <p className="text-xs font-black text-orange-700 mb-2">Quick Actions</p>
              <div className="flex gap-2">
                <button onClick={() => setActiveTab("draws")}
                  className="flex-1 py-2.5 bg-[#FF7400] text-white rounded-xl text-xs font-black hover:scale-105 transition-all">
                  Generate Draw
                </button>
                <button onClick={() => setActiveTab("matches")}
                  className="flex-1 py-2.5 bg-slate-700 text-white rounded-xl text-xs font-black hover:scale-105 transition-all">
                  View Matches
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ PLAYERS ═══════════════════════════════════════════════════════════ */}
      {activeTab === "players" && (
        <div className="space-y-4">
          <CategoryFilters />
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            {filteredPlayers.length === 0 ? (
              <div className="py-16 text-center space-y-4">
                <Users size={40} className="mx-auto text-slate-200" />
                <div>
                  <p className="text-slate-500 font-bold text-base">No players registered yet</p>
                  <p className="text-slate-400 text-sm mt-1">Players register via the Player dashboard.</p>
                </div>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {["#", "Name", "Club", "District", "Weight", "Age Group", "Belt"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredPlayers.map((p, i) => (
                    <tr key={p.id} className="border-b border-slate-50 hover:bg-orange-50/30 transition-colors">
                      <td className="px-4 py-3 text-sm font-bold text-slate-400">{i + 1}</td>
                      <td className="px-4 py-3 text-sm font-extrabold text-slate-800">{p.name}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-600">{p.club || "—"}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-500">{p.district || "—"}</td>
                      <td className="px-4 py-3 text-sm font-bold text-orange-600">{p.weight} kg</td>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-500">{p.ageGroup}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-500">{p.belt || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ══ CHAMPION BANNER ═══════════════════════════════════════════════════ */}
      <AnimatePresence>
        {champion && activeTab === "draws" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85 }}
            className="bg-gradient-to-r from-yellow-400 via-[#FF7400] to-yellow-500 rounded-3xl p-6 shadow-2xl shadow-orange-500/30 flex items-center gap-5"
          >
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
              <Trophy size={32} className="text-white" />
            </div>
            <div>
              <p className="text-white/70 text-xs font-black uppercase tracking-widest mb-0.5">🏆 Tournament Champion</p>
              <h2 className="text-2xl font-black text-white leading-tight">{champion.name}</h2>
              <p className="text-white/80 text-sm font-bold">{champion.club}</p>
            </div>
            <button onClick={() => setChampion(null)} className="ml-auto text-white/50 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ DRAWS ═════════════════════════════════════════════════════════════ */}
      {activeTab === "draws" && expired && (
        <ExpiredBlock label="Draw Generation" />
      )}
      {activeTab === "draws" && !expired && (
        <div className="space-y-4">
          <CategoryFilters />

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3 items-center">
            {tournament?.status !== "APPROVED" ? (
              <div className="flex items-center gap-2 px-5 py-3 bg-red-50 text-red-600 rounded-2xl text-sm font-bold border border-red-200">
                <AlertCircle size={18} /> Tournament must be approved before you can manage draws.
              </div>
            ) : (
              <>
                <button onClick={() => setShowSeedModal(true)}
                  disabled={drawPhase === "shuffling" || drawPhase === "dealing" || autoGenerating}
                  className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 text-white rounded-2xl font-bold text-sm shadow-lg shadow-amber-500/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50">
                  <Star size={16} /> Manage Seeds (IJF)
                </button>
                <button onClick={handleShuffle}
                  disabled={filteredPlayers.length < 2 || drawPhase === "shuffling" || drawPhase === "dealing" || autoGenerating}
                  className="flex items-center gap-2 px-5 py-2.5 bg-slate-700 text-white rounded-2xl font-bold text-sm shadow-lg shadow-slate-700/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                  {drawPhase === "shuffling"
                    ? <><Loader2 size={15} className="animate-spin" /> Shuffling & Saving...</>
                    : <><Shuffle size={16} /> {currentDraw?.generated ? "Re-Shuffle Bracket" : "Shuffle Players"}</>}
                </button>
                {!currentDraw?.generated && (
                  <button onClick={handleGenerateDraw}
                    disabled={filteredPlayers.length < 2 || drawPhase === "shuffling" || drawPhase === "dealing" || autoGenerating}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#FF7400] text-white rounded-2xl font-bold text-sm shadow-lg shadow-orange-500/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                    {drawPhase === "dealing"
                      ? <><Loader2 size={15} className="animate-spin" /> Generating...</>
                      : <><Zap size={16} /> Generate & Save Bracket</>}
                  </button>
                )}
                <button onClick={handleAutoGenerateAllDraws}
                  disabled={players.length < 2 || drawPhase === "shuffling" || drawPhase === "dealing" || autoGenerating}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-sm shadow-lg shadow-indigo-500/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                  {autoGenerating ? (
                    <><Loader2 size={15} className="animate-spin" /> Generating All...</>
                  ) : (
                    <><Zap size={16} /> Auto-Generate {ageFilter === "ALL" ? "All Categories" : ageFilter}</>
                  )}
                </button>
                {currentDraw?.saved && (
                  <span className="flex items-center gap-2 px-5 py-2.5 bg-emerald-50 text-emerald-700 rounded-2xl font-bold text-sm border border-emerald-200">
                    <Check size={16} /> Auto-Saved ✓
                  </span>
                )}
              </>
            )}
          </div>

          {/* Progress status for bulk auto generation */}
          {autoGenerating && (
            <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center gap-3">
              <Loader2 className="animate-spin text-indigo-600 shrink-0" size={18} />
              <span className="text-sm font-bold text-indigo-700">{autoGenProgress}</span>
            </div>
          )}

          {/* Seed pills */}
          <div className="flex flex-wrap gap-2">
            {([1, 2, 3, 4] as const).map((n) => (
              <div key={n}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border ${seeds[n] ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-slate-50 border-slate-200 text-slate-400"}`}>
                <span className="w-5 h-5 bg-amber-500 text-white rounded-lg flex items-center justify-center text-[10px] font-black">S{n}</span>
                {seeds[n] ? seeds[n]!.name : "Unassigned"}
              </div>
            ))}
          </div>

          {/* ── Dealing animation overlay ── */}
          <AnimatePresence>
            {drawPhase === "dealing" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm pointer-events-none"
              >
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-center"
                >
                  <div className="flex gap-3 justify-center mb-4">
                    {filteredPlayers.slice(0, Math.min(8, filteredPlayers.length)).map((p, i) => (
                      <motion.div
                        key={p.id}
                        initial={{ y: 0, x: 0, rotate: 0, opacity: 1 }}
                        animate={{
                          y: [0, -60, -20, 20],
                          x: [0, (i - 4) * 30, (i - 4) * 80, (i - 4) * 120],
                          rotate: [0, (i % 2 === 0 ? -15 : 15), (i % 2 === 0 ? 5 : -5), 0],
                          opacity: [1, 1, 0.5, 0],
                        }}
                        transition={{ duration: 0.6, delay: i * 0.05, ease: "easeInOut" }}
                        className="w-12 h-16 bg-white rounded-xl shadow-xl border border-slate-200 flex flex-col items-center justify-center overflow-hidden"
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-sm ${p.gender === "FEMALE" ? "bg-pink-400" : "bg-blue-500"}`}>
                          {p.name.charAt(0)}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  <p className="text-white font-black text-lg">Dealing cards to bracket...</p>
                  <p className="text-white/50 text-sm mt-1">{filteredPlayers.length} players</p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Main content: players list OR bracket ── */}
          <AnimatePresence mode="wait">
            {!currentDraw?.generated ? (
              /* Player cards list — pre-draw */
              <motion.div
                key="player-list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, x: 100, transition: { duration: 0.3 } }}
                className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden"
              >
                {filteredPlayers.length === 0 ? (
                  <div className="py-16 text-center space-y-4">
                    <Target size={48} className="mx-auto text-slate-200" />
                    <div>
                      <p className="text-slate-500 font-bold text-lg">No Players in This Category</p>
                      <p className="text-slate-400 text-sm mt-1">Select a different category filter above.</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <p className="font-black text-slate-800">
                        {filteredPlayers.length} Players Ready
                        <span className="ml-2 text-xs font-semibold text-slate-400">
                          — assign seeds then click Generate Draw
                        </span>
                      </p>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {filteredPlayers.map((p, i) => (
                        <motion.div
                          key={`${p.id}-${shuffleKey}`}
                          layoutId={`player-card-${p.id}`}
                          initial={{ opacity: 0, y: 30, scale: 0.85 }}
                          animate={{
                            opacity: 1,
                            y: drawPhase === "shuffling" ? [0, -12, 8, -5, 0] : 0,
                            x: drawPhase === "shuffling" ? [0, (i % 2 === 0 ? -8 : 8), (i % 3 === 0 ? 5 : -5), 0] : 0,
                            scale: drawPhase === "shuffling" ? [1, 0.92, 1.04, 0.97, 1] : 1,
                            rotate: drawPhase === "shuffling" ? [0, (i % 2 === 0 ? -6 : 6), (i % 3 === 0 ? 3 : -3), 0] : 0,
                          }}
                          transition={{
                            opacity: { delay: i * 0.04, duration: 0.3 },
                            y: drawPhase === "shuffling"
                              ? { duration: 0.7, delay: i * 0.05, ease: "easeInOut" }
                              : { delay: i * 0.04, duration: 0.4, type: "spring" },
                            x: drawPhase === "shuffling"
                              ? { duration: 0.7, delay: i * 0.05 }
                              : { delay: i * 0.04 },
                            scale: drawPhase === "shuffling"
                              ? { duration: 0.7, delay: i * 0.05 }
                              : { delay: i * 0.04, duration: 0.4, type: "spring" },
                            rotate: drawPhase === "shuffling"
                              ? { duration: 0.7, delay: i * 0.05 }
                              : { delay: i * 0.04 },
                          }}
                          className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm hover:shadow-md hover:border-orange-300 transition-shadow cursor-default"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-sm text-white shrink-0 ${p.gender === "FEMALE" ? "bg-pink-400" : "bg-blue-500"}`}>
                              {p.name.charAt(0)}
                            </div>
                            <div className="overflow-hidden">
                              <p className="text-xs font-black text-slate-800 truncate leading-tight">{p.name}</p>
                              <p className="text-[9px] text-slate-400 truncate">{p.gender === "FEMALE" ? "Female" : "Male"} · {p.club || p.district}</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                              {p.weight} kg
                            </span>
                            {seeds[1]?.id === p.id && <span className="text-[8px] font-black text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">S1</span>}
                            {seeds[2]?.id === p.id && <span className="text-[8px] font-black text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">S2</span>}
                            {seeds[3]?.id === p.id && <span className="text-[8px] font-black text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">S3</span>}
                            {seeds[4]?.id === p.id && <span className="text-[8px] font-black text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">S4</span>}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              /* Bracket — post-generate */
              <motion.div
                key={`bracket-${currentKey}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden"
              >
                <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-black text-slate-800">
                    Draw — {filteredPlayers.length} Players
                    <span className="ml-2 text-xs font-semibold text-slate-400">
                      {ageFilter !== "ALL" ? ageFilter : ""} {genderFilter !== "ALL" ? genderFilter : ""} {weightFilter !== "ALL" ? `${weightFilter}kg` : ""}
                    </span>
                  </h3>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => { 
                        const hasActive = currentDraw.rounds.some(r => r.some(m => m.status === "COMPLETED" || m.status === "IN_PROGRESS"));
                        if (hasActive) {
                          showToast("Cannot re-draw the bracket because matches have already started or completed!", false);
                          return;
                        }
                        if (window.confirm("Are you sure you want to re-draw this bracket? This will wipe the current bracket.")) {
                          setDraws(p => ({ ...p, [currentKey]: { ...currentDraw!, generated: false, saved: false } })); 
                          setDrawPhase("idle"); 
                        }
                      }}
                      className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                        currentDraw.rounds.some(r => r.some(m => m.status === "COMPLETED" || m.status === "IN_PROGRESS"))
                          ? "text-slate-300 cursor-not-allowed"
                          : "text-slate-500 hover:text-red-500 hover:bg-red-50"
                      }`}>
                      ↺ Re-draw
                    </button>
                    <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                      {(["bracket", "list"] as ViewMode[]).map((v) => (
                        <button key={v} onClick={() => setViewMode(v)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === v ? "bg-white text-[#FF7400] shadow-sm" : "text-slate-400"}`}>
                          {v === "bracket" ? <><Grid size={12} className="inline mr-1" />Bracket</> : <><List size={12} className="inline mr-1" />List</>}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {viewMode === "list" ? (
                  <div className="divide-y divide-slate-50">
                    {currentDraw.rounds.map((round, ri) => (
                      <div key={ri} className="p-5">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">
                          {roundName(ri, currentDraw.rounds.length)}
                        </h4>
                        <div className="space-y-2">
                          {round.map((match, mi) => (
                            <motion.div
                              key={match.matchId}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: ri * 0.15 + mi * 0.04, type: "spring", stiffness: 300, damping: 25 }}
                              className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl hover:bg-orange-50/30 transition-colors"
                            >
                              <div className="flex items-center gap-4">
                                <span className="text-[10px] font-black text-slate-400 min-w-[80px]">
                                  Mat {match.matNumber} · #{match.matchNumber}
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className={`text-sm font-bold flex items-center gap-1 ${match.slotA.isBye ? "text-slate-300" : match.winnerId === match.slotA.playerId ? "text-emerald-600" : match.status === "COMPLETED" ? "text-slate-400 line-through" : "text-slate-800"}`}>
                                    {match.slotA.playerName}
                                    {match.winnerId && match.winnerId === match.slotA.playerId && <Trophy size={12} />}
                                  </span>
                                  <span className="text-[10px] font-black text-slate-300">vs</span>
                                  <span className={`text-sm font-bold flex items-center gap-1 ${match.slotB.isBye ? "text-slate-300" : match.winnerId === match.slotB.playerId ? "text-emerald-600" : match.status === "COMPLETED" ? "text-slate-400 line-through" : "text-slate-800"}`}>
                                    {match.winnerId && match.winnerId === match.slotB.playerId && <Trophy size={12} />}
                                    {match.slotB.playerName}
                                  </span>
                                </div>
                              </div>
                              {match.slotA.playerName !== "TBD" && match.slotB.playerName !== "TBD" && !match.slotA.isBye && !match.slotB.isBye && match.status !== "COMPLETED" && (
                                <button onClick={() => openScoreboard(match)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FF7400] text-white rounded-xl text-[10px] font-black hover:scale-105 transition-all">
                                  <Monitor size={11} /> Scoreboard
                                </button>
                              )}
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-5 bg-slate-50/50 overflow-auto">
                    <BracketView
                      key={currentKey}
                      rounds={currentDraw.rounds}
                      onOpenScoreboard={openScoreboard}
                      players={filteredPlayers}
                    />
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ══ MATCHES ═══════════════════════════════════════════════════════════ */}
      {activeTab === "matches" && expired && (
        <ExpiredBlock label="Match Scoreboard" />
      )}
      {activeTab === "matches" && !expired && (
        <div className="space-y-4">
          <CategoryFilters />

          {currentDraw?.generated ? (
            <div className="space-y-4">
              {currentDraw.rounds.map((round, ri) => (
                <div key={ri} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
                    <h3 className="font-black">{roundName(ri, currentDraw.rounds.length)}</h3>
                    <span className="text-xs font-bold text-slate-400">{round.length} match{round.length !== 1 ? "es" : ""}</span>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {round.map((match) => (
                      <div key={match.matchId}
                        className="p-5 flex items-center justify-between hover:bg-orange-50/20 transition-colors">
                        <div className="flex items-center gap-5">
                          <div className="text-center w-10">
                            <p className="text-[9px] font-black text-slate-400 uppercase">Mat</p>
                            <p className="text-2xl font-black text-slate-700">{match.matNumber}</p>
                          </div>
                          <div className="w-px h-10 bg-slate-100" />
                          <div className="text-center w-10">
                            <p className="text-[9px] font-black text-slate-400 uppercase">Match</p>
                            <p className="text-2xl font-black text-slate-700">#{match.matchNumber}</p>
                          </div>
                          <div className="w-px h-10 bg-slate-100" />
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <motion.p
                                key={`${match.matchId}-slotA-${match.slotA.playerName}`}
                                initial={match.slotA.playerName !== "TBD" ? { opacity: 0, scale: 0.8, y: -10 } : { opacity: 1, scale: 1, y: 0 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                className={`text-sm font-black flex items-center justify-end gap-1 ${match.slotA.isBye ? "text-slate-300" : match.slotA.playerName === "TBD" ? "text-slate-400" : match.winnerId === match.slotA.playerId ? "text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg" : match.status === "COMPLETED" ? "text-slate-400 line-through" : "text-slate-800"}`}>
                                {match.slotA.playerName}
                                {match.winnerId === match.slotA.playerId && <Trophy size={14} className="text-emerald-500" />}
                                {match.slotA.seedNumber && (
                                  <span className="ml-1.5 text-[9px] font-black text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full">S{match.slotA.seedNumber}</span>
                                )}
                              </motion.p>
                              <p className="text-xs text-slate-400 font-semibold">{match.slotA.club}</p>
                            </div>
                            <span className="text-xs font-black text-slate-300 bg-slate-100 px-2.5 py-1 rounded-lg">VS</span>
                            <div>
                              <motion.p
                                key={`${match.matchId}-slotB-${match.slotB.playerName}`}
                                initial={match.slotB.playerName !== "TBD" ? { opacity: 0, scale: 0.8, y: -10 } : { opacity: 1, scale: 1, y: 0 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                className={`text-sm font-black flex items-center gap-1 ${match.slotB.isBye ? "text-slate-300" : match.slotB.playerName === "TBD" ? "text-slate-400" : match.winnerId === match.slotB.playerId ? "text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg" : match.status === "COMPLETED" ? "text-slate-400 line-through" : "text-slate-800"}`}>
                                {match.winnerId === match.slotB.playerId && <Trophy size={14} className="text-emerald-500" />}
                                {match.slotB.playerName}
                                {match.slotB.seedNumber && (
                                  <span className="ml-1.5 text-[9px] font-black text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full">S{match.slotB.seedNumber}</span>
                                )}
                              </motion.p>
                              <p className="text-xs text-slate-400 font-semibold">{match.slotB.club}</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className={`text-[10px] font-black px-3 py-1 rounded-full ${
                            match.status === "COMPLETED" ? "bg-emerald-100 text-emerald-700" :
                            match.status === "IN_PROGRESS" ? "bg-orange-100 text-orange-700" :
                            "bg-slate-100 text-slate-400"
                          }`}>
                            {match.status}
                          </span>
                          {match.slotA.playerName !== "TBD" && match.slotB.playerName !== "TBD" && match.status !== "COMPLETED" && (
                            <button onClick={() => openScoreboard(match)}
                              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#FF7400] to-orange-500 text-white rounded-xl text-xs font-black shadow-lg shadow-orange-500/20 hover:scale-105 active:scale-95 transition-all">
                              <Monitor size={13} /> Open Scoreboard ↗
                            </button>
                          )}
                          {match.slotA.playerId && !match.slotB.playerId && match.status !== "COMPLETED" && (
                            <span className="text-xs text-amber-600 font-bold px-3 py-1 bg-amber-50 rounded-xl border border-amber-100">Waiting for opponent...</span>
                          )}
                          {(match.slotA.isBye || match.slotB.isBye) && (
                            <span className="text-xs text-slate-400 font-bold px-3 py-1 bg-slate-50 rounded-xl">BYE — auto advance</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm py-20 text-center">
              <Swords size={48} className="mx-auto text-slate-200 mb-4" />
              <p className="text-slate-500 font-bold text-lg">No Draw for This Category</p>
              <p className="text-slate-400 font-semibold text-sm mt-1">Generate a draw first</p>
              <button onClick={() => setActiveTab("draws")}
                className="mt-5 px-6 py-2.5 bg-[#FF7400] text-white rounded-2xl font-bold text-sm shadow-lg shadow-orange-500/20 hover:scale-105 transition-all">
                Go to Draw Generation →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ══ RESULTS & REPORTS ══════════════════════════════════════════════════ */}
      {activeTab === "results" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                <BarChart3 size={24} /> Match Results & Reports
              </h2>
              <p className="text-slate-500 text-sm mt-1">View completed matches, winners, and generate PDF reports</p>
            </div>
          </div>

          {/* ── Conclude Tournament Panel ── */}
          {tournament?.status !== "CLOSED" ? (
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 border border-slate-700 shadow-xl">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 bg-[#FF7400]/20 rounded-2xl flex items-center justify-center shrink-0">
                  <Award size={24} className="text-[#FF7400]" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Conclude Tournament & Issue Certificates</h3>
                  <p className="text-slate-400 text-sm mt-1">Assign final placements to players, then click Conclude. All participants can then download their certificates.</p>
                </div>
              </div>

              {players.length === 0 ? (
                <div className="text-center py-8 text-slate-400 font-semibold">No registered players found.</div>
              ) : (
                <div className="space-y-3">
                  {/* Auto-detect status banner */}
                  {placementsAutoDetected && (
                    <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-emerald-900/40 border border-emerald-500/30 rounded-xl mb-2">
                      <div className="flex items-center gap-2">
                        <Check size={14} className="text-emerald-400 shrink-0" />
                        <p className="text-emerald-300 text-xs font-bold">
                          Auto-detected: {Object.values(placements).filter(v => v === "FIRST").length} Gold · {Object.values(placements).filter(v => v === "SECOND").length} Silver · {Object.values(placements).filter(v => v === "THIRD").length} Bronze · {players.filter(p => !placements[p.id] || placements[p.id] === "PARTICIPATION").length} Participants
                        </p>
                      </div>
                      <button
                        onClick={autoDetectPlacements}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-xs font-bold transition-all shrink-0"
                      >
                        <Zap size={11} className="text-[#FF7400]" /> Re-detect
                      </button>
                    </div>
                  )}
                  {/* Placement Legend */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {[
                      { label: "1st Place", icon: <Trophy size={14} />, value: "FIRST", color: "bg-yellow-500" },
                      { label: "2nd Place", icon: <Medal size={14} />, value: "SECOND", color: "bg-slate-400" },
                      { label: "3rd Place", icon: <Medal size={14} />, value: "THIRD", color: "bg-orange-600" },
                      { label: "Participation", icon: <Award size={14} />, value: "PARTICIPATION", color: "bg-blue-500" },
                    ].map((p) => (
                      <span key={p.value} className={`flex items-center gap-1.5 px-3 py-1 ${p.color} text-white text-xs font-black rounded-full`}>
                        {p.icon} {p.label}
                      </span>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
                    {players.map((player) => {
                      const placement = placements[player.id] || "PARTICIPATION";
                      const placementColors: Record<string, string> = {
                        FIRST: "border-yellow-400 bg-yellow-500/10",
                        SECOND: "border-slate-400 bg-slate-400/10",
                        THIRD: "border-orange-500 bg-orange-500/10",
                        PARTICIPATION: "border-slate-600 bg-slate-700/30",
                      };
                      const placementLabels: Record<string, string> = {
                        FIRST: "🥇 1st Place",
                        SECOND: "🥈 2nd Place",
                        THIRD: "🥉 3rd Place",
                        PARTICIPATION: "🎖️ Participant",
                      };
                      return (
                        <div key={player.id} className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${placementColors[placement]}`}>
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-sm text-white shrink-0 ${player.gender === "FEMALE" ? "bg-pink-500" : "bg-blue-600"}`}>
                            {player.name.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-black text-white truncate">{player.name}</p>
                            <p className="text-[11px] text-slate-400 truncate">{player.club || player.district}</p>
                          </div>
                          <div className="relative shrink-0">
                            <button
                              onClick={() => setOpenDropdownId(openDropdownId === player.id ? null : player.id)}
                              className="flex items-center justify-between w-[120px] gap-2 text-xs font-bold bg-slate-700 border border-slate-600 text-white rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#FF7400]"
                            >
                              <span className="flex items-center gap-1.5">
                                {placement === "FIRST" && <><Trophy size={14} className="text-yellow-500"/> 1st Place</>}
                                {placement === "SECOND" && <><Medal size={14} className="text-slate-400"/> 2nd Place</>}
                                {placement === "THIRD" && <><Medal size={14} className="text-orange-600"/> 3rd Place</>}
                                {placement === "PARTICIPATION" && <><Award size={14} className="text-blue-500"/> Participant</>}
                              </span>
                            </button>
                            <AnimatePresence>
                              {openDropdownId === player.id && (
                                <>
                                  <div className="fixed inset-0 z-40" onClick={() => setOpenDropdownId(null)} />
                                  <motion.div
                                    initial={{ opacity: 0, y: -5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -5 }}
                                    transition={{ duration: 0.15 }}
                                    className="absolute right-0 mt-2 w-36 bg-slate-800 border border-slate-600 rounded-xl shadow-xl z-50 overflow-hidden"
                                  >
                                    {[
                                      { val: "FIRST", label: "1st Place", icon: <Trophy size={14} className="text-yellow-500"/> },
                                      { val: "SECOND", label: "2nd Place", icon: <Medal size={14} className="text-slate-400"/> },
                                      { val: "THIRD", label: "3rd Place", icon: <Medal size={14} className="text-orange-600"/> },
                                      { val: "PARTICIPATION", label: "Participant", icon: <Award size={14} className="text-blue-500"/> }
                                    ].map(opt => (
                                      <button
                                        key={opt.val}
                                        onClick={() => {
                                          setPlacements(prev => ({ ...prev, [player.id]: opt.val as any }));
                                          setOpenDropdownId(null);
                                        }}
                                        className="w-full text-left px-3 py-2 text-xs font-bold text-white hover:bg-slate-700 flex items-center gap-2 transition-colors"
                                      >
                                        {opt.icon} {opt.label}
                                      </button>
                                    ))}
                                  </motion.div>
                                </>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-4 flex items-center justify-between border-t border-slate-700 mt-4">
                    <p className="text-slate-400 text-xs font-semibold">
                      {Object.values(placements).filter(v => v === "FIRST").length} Gold · {Object.values(placements).filter(v => v === "SECOND").length} Silver · {Object.values(placements).filter(v => v === "THIRD").length} Bronze · {players.filter(p => !placements[p.id] || placements[p.id] === "PARTICIPATION").length} Participants
                    </p>
                    <button
                      onClick={handleConcludeTournament}
                      disabled={submittingResults || players.length === 0}
                      className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#FF7400] to-orange-500 text-white rounded-2xl font-black text-sm shadow-lg shadow-orange-500/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submittingResults ? <><Loader2 size={16} className="animate-spin" /> Concluding...</> : <><Trophy size={16} /> Conclude & Issue Certificates</>}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-4 px-6 py-4 bg-emerald-900/30 border border-emerald-500/40 rounded-2xl">
              <Check size={24} className="text-emerald-400 shrink-0" />
              <div>
                <p className="text-emerald-300 font-black">Tournament Concluded</p>
                <p className="text-emerald-400/70 text-xs mt-0.5">All participants can now download their certificates from their dashboard.</p>
              </div>
            </div>
          )}

          <CategoryFilters />

          {currentDraw?.generated ? (
            <div className="space-y-6">
              {/* Completed Matches */}
              {currentDraw.rounds.map((round, ri) => {
                const completedMatches = round.filter(m => m.status === "COMPLETED");
                if (completedMatches.length === 0) return null;

                return (
                  <motion.div
                    key={ri}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden"
                  >
                    <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white flex items-center justify-between">
                      <h3 className="font-black">{roundName(ri, currentDraw.rounds.length)} Results</h3>
                      <span className="text-xs font-bold text-emerald-100">{completedMatches.length} completed</span>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {completedMatches.map((match) => {
                        const winner = match.winnerId === match.slotA.playerId ? match.slotA : match.slotB;
                        const loser = match.winnerId === match.slotA.playerId ? match.slotB : match.slotA;
                        const nextMatchInfo = findNextMatch(currentDraw.rounds, ri, round.indexOf(match), winner);

                        return (
                          <div key={match.matchId} className="p-6 hover:bg-emerald-50/30 transition-colors">
                            <div className="flex items-start justify-between gap-6">
                              <div className="flex-1 space-y-4">
                                {/* Match Header */}
                                <div className="flex items-center gap-4">
                                  <div className="text-center w-14">
                                    <p className="text-[10px] font-black text-slate-400 uppercase">Mat</p>
                                    <p className="text-2xl font-black text-slate-800">{match.matNumber}</p>
                                  </div>
                                  <div className="h-10 w-px bg-slate-200" />
                                  <div className="text-center w-14">
                                    <p className="text-[10px] font-black text-slate-400 uppercase">Match</p>
                                    <p className="text-2xl font-black text-slate-800">#{match.matchNumber}</p>
                                  </div>
                                </div>

                                {/* Winner & Loser */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {/* Winner */}
                                  <motion.div
                                    initial={{ scale: 0.95, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ delay: 0.1 }}
                                    className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-4 border-2 border-emerald-300"
                                  >
                                    <div className="flex items-center gap-2 mb-2">
                                      <Trophy size={16} className="text-emerald-600" />
                                      <p className="text-xs font-black text-emerald-600 uppercase">Winner</p>
                                    </div>
                                    <p className="text-lg font-black text-emerald-700">{winner.playerName}</p>
                                    <p className="text-xs text-emerald-600 font-semibold mt-1">{winner.club}</p>
                                    {winner.seedNumber && (
                                      <span className="mt-2 inline-block text-[9px] font-black text-amber-600 bg-amber-100 px-2 py-1 rounded-full">
                                        Seed #{winner.seedNumber}
                                      </span>
                                    )}
                                  </motion.div>

                                  {/* Loser */}
                                  <motion.div
                                    initial={{ scale: 0.95, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ delay: 0.15 }}
                                    className="bg-slate-50 rounded-2xl p-4 border border-slate-200"
                                  >
                                    <p className="text-xs font-black text-slate-400 uppercase mb-2">Loser</p>
                                    <p className="text-lg font-bold text-slate-700">{loser.playerName}</p>
                                    <p className="text-xs text-slate-500 font-semibold mt-1">{loser.club}</p>
                                    {loser.seedNumber && (
                                      <span className="mt-2 inline-block text-[9px] font-black text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                                        Seed #{loser.seedNumber}
                                      </span>
                                    )}
                                  </motion.div>
                                </div>

                                {/* Next Match Info */}
                                {nextMatchInfo && (
                                  <motion.div
                                    initial={{ scale: 0.95, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ delay: 0.2 }}
                                    className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-4 border border-blue-200 mt-4"
                                  >
                                    <p className="text-xs font-black text-blue-600 uppercase mb-2">📍 Next Match</p>
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                      <div>
                                        <p className="text-[10px] text-blue-600 font-bold uppercase">Round</p>
                                        <p className="font-black text-blue-700">{roundName(nextMatchInfo.roundIndex, currentDraw.rounds.length)}</p>
                                      </div>
                                      <div>
                                        <p className="text-[10px] text-blue-600 font-bold uppercase">Match #{nextMatchInfo.matchNumber}</p>
                                        <p className="font-black text-blue-700">Mat {nextMatchInfo.matNumber}</p>
                                      </div>
                                      <div className="col-span-2">
                                        <p className="text-[10px] text-blue-600 font-bold uppercase">Opponent Status</p>
                                        <p className="font-semibold text-blue-700">
                                          {nextMatchInfo.opponent
                                            ? `vs ${nextMatchInfo.opponent}`
                                            : "⏳ Waiting for opponent to advance"}
                                        </p>
                                      </div>
                                    </div>
                                  </motion.div>
                                )}
                              </div>

                              {/* Export PDF Button */}
                              <button
                                onClick={() => exportMatchToPDF(match, winner, loser, tournament, ri, nextMatchInfo)}
                                className="flex-shrink-0 px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-2xl font-black text-sm flex items-center gap-2 hover:scale-105 transition-all shadow-lg shadow-blue-500/30 whitespace-nowrap"
                              >
                                <Download size={16} />
                                Export PDF
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                );
              })}

              {/* No Completed Matches */}
              {currentDraw.rounds.every(r => !r.some(m => m.status === "COMPLETED")) && (
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm py-20 text-center">
                  <Clock size={48} className="mx-auto text-slate-200 mb-4" />
                  <p className="text-slate-500 font-bold text-lg">No Completed Matches Yet</p>
                  <p className="text-slate-400 font-semibold text-sm mt-1">Complete some matches to see results here</p>
                  <button onClick={() => setActiveTab("matches")}
                    className="mt-5 px-6 py-2.5 bg-[#FF7400] text-white rounded-2xl font-bold text-sm shadow-lg shadow-orange-500/20 hover:scale-105 transition-all">
                    Go to Matches →
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm py-20 text-center">
              <BarChart3 size={48} className="mx-auto text-slate-200 mb-4" />
              <p className="text-slate-500 font-bold text-lg">No Draw for This Category</p>
              <p className="text-slate-400 font-semibold text-sm mt-1">Generate a draw first to start matches</p>
              <button onClick={() => setActiveTab("draws")}
                className="mt-5 px-6 py-2.5 bg-[#FF7400] text-white rounded-2xl font-bold text-sm shadow-lg shadow-orange-500/20 hover:scale-105 transition-all">
                Go to Draw Generation →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ══ SEED MODAL ════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showSeedModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">

              <div className="p-6 bg-gradient-to-r from-amber-500 to-orange-500 text-white flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-lg font-black flex items-center gap-2">
                    <Award size={20} /> IJF Seeding Management
                  </h3>
                  <p className="text-amber-100 text-xs font-semibold mt-0.5">
                    S1 → top bracket · S2 → bottom · S3 & S4 → opposite halves (can only meet in Final)
                  </p>
                </div>
                <button onClick={() => { setShowSeedModal(false); setAssigningSeed(null); }}
                  className="p-2 hover:bg-white/20 rounded-xl transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-3 overflow-y-auto flex-grow">
                {([1, 2, 3, 4] as const).map((seedNum) => (
                  <div key={seedNum}
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center shrink-0">
                        <span className="text-white font-black">S{seedNum}</span>
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-700">
                          {seeds[seedNum]?.name || `Seed ${seedNum} — Unassigned`}
                        </p>
                        {seeds[seedNum] && (
                          <p className="text-xs text-slate-400 font-semibold">
                            {seeds[seedNum]?.club} · {seeds[seedNum]?.weight}kg
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setAssigningSeed(assigningSeed === seedNum ? null : seedNum)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${assigningSeed === seedNum ? "bg-orange-500 text-white" : "bg-white border border-slate-200 text-slate-700 hover:border-orange-300 hover:text-orange-600"}`}>
                        {seeds[seedNum] ? "Change" : "Assign"}
                      </button>
                      {seeds[seedNum] && (
                        <button onClick={() => setSeeds((s) => ({ ...s, [seedNum]: null }))}
                          className="px-3 py-1.5 bg-red-50 text-red-500 rounded-xl text-xs font-bold hover:bg-red-100 transition-all">
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {/* Player picker */}
                <AnimatePresence>
                  {assigningSeed && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border border-orange-200 rounded-2xl overflow-hidden bg-orange-50/50">
                      <p className="px-4 py-3 text-xs font-black text-orange-700 border-b border-orange-100 uppercase tracking-wider">
                        Select player for Seed {assigningSeed}
                      </p>
                      <div className="max-h-48 overflow-y-auto">
                        {filteredPlayers.length === 0 ? (
                          <p className="p-4 text-sm text-slate-400 text-center">No players in selected category</p>
                        ) : (
                          filteredPlayers.map((p) => (
                            <button key={p.id} onClick={() => handleAssignSeed(assigningSeed, p)}
                              className="w-full flex items-center justify-between px-4 py-3 hover:bg-orange-100 transition-colors text-left border-b border-orange-50 last:border-0">
                              <span className="text-sm font-bold text-slate-800">{p.name}</span>
                              <span className="text-xs text-slate-400 font-semibold">{p.club} · {p.weight}kg</span>
                            </button>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex justify-between pt-2">
                  <button onClick={() => setSeeds({ 1: null, 2: null, 3: null, 4: null })}
                    className="px-4 py-2 text-slate-400 hover:text-red-500 text-sm font-bold transition-colors">
                    Clear All Seeds
                  </button>
                  <button onClick={() => { setShowSeedModal(false); setAssigningSeed(null); }}
                    className="px-6 py-2.5 bg-[#FF7400] text-white rounded-2xl font-bold text-sm shadow-lg shadow-orange-500/20 hover:scale-105 transition-all">
                    Done ✓
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Expired block ────────────────────────────────────────────────────────────
function ExpiredBlock({ label }: { label: string }) {
  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm py-20 text-center space-y-3">
      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
        <Clock size={32} className="text-slate-400" />
      </div>
      <p className="text-slate-700 font-black text-lg">{label} Unavailable</p>
      <p className="text-slate-400 font-semibold text-sm max-w-sm mx-auto">
        This tournament has expired. {label} is only available for active and upcoming tournaments.
      </p>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function clubCode(name: string): string {
  if (!name || name === "BYE" || name === "TBD") return name || "---";
  // Take first 3 uppercase letters (consonants preferred)
  const upper = name.toUpperCase().replace(/[^A-Z]/g, "");
  return upper.slice(0, 3) || "---";
}

// ─── Bracket View Component (reference-style with SVG connectors) ─────────────
const MATCH_H = 68;
const MATCH_W = 210;
const CONN_W  = 44;
const G0      = 6;

function BracketView({
  rounds,
  onOpenScoreboard,
  players,
}: {
  rounds: BracketMatch[][];
  onOpenScoreboard: (match: BracketMatch) => void;
  players: RegisteredPlayer[];
}) {
  if (!rounds || rounds.length === 0) return null;

  const numR1   = rounds[0].length;
  const totalH  = Math.max(numR1 * (MATCH_H + G0) - G0, MATCH_H);
  const totalW  = rounds.length * MATCH_W + rounds.length * CONN_W + (MATCH_W - 20);

  const slotH   = (ri: number) => totalH / (numR1 / Math.pow(2, ri));
  const mTop    = (ri: number, mi: number) => { const s = slotH(ri); return mi * s + (s - MATCH_H) / 2; };
  const mCenterY = (ri: number, mi: number) => mTop(ri, mi) + MATCH_H / 2;

  const weightGroups = Array.from(new Set(players.map(p => p.weight))).sort((a, b) => a - b);

  return (
    <div className="flex gap-6">
      {/* ── Left: Player List ────────────────────────────────────────────── */}
      <div className="w-56 shrink-0">
        {weightGroups.map((w) => {
          const wPlayers = players.filter(p => p.weight === w);
          return (
            <div key={w} className="mb-4">
              <p className="text-xs font-black text-blue-600 mb-2 pb-1 border-b border-slate-100">
                {w} kg <span className="text-slate-400 font-semibold">({wPlayers.length} players)</span>
              </p>
              <div className="space-y-1">
                {wPlayers.map((p) => (
                  <div key={p.id} className="flex items-center gap-2 py-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[10px] font-black text-white ${p.gender === "FEMALE" ? "bg-pink-400" : "bg-blue-500"}`}>
                      {p.name.charAt(0)}
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-[11px] font-bold text-slate-800 truncate leading-tight">{p.name}</p>
                      <p className="text-[9px] text-slate-400 truncate">{p.gender === "FEMALE" ? "Female" : "Male"} · {p.district || p.club}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Right: Bracket ───────────────────────────────────────────────── */}
      <div className="flex-grow overflow-x-auto">
        <div style={{ minWidth: totalW + 24, userSelect: "none" }}>

          {/* Round headers */}
          <div className="flex mb-3">
            {rounds.map((_, ri) => (
              <div key={ri} className="flex shrink-0" style={{ width: MATCH_W + CONN_W }}>
                <div style={{ width: MATCH_W }}
                  className="text-center text-[10px] font-black text-slate-500 uppercase tracking-wider py-1 bg-slate-100 rounded-lg mr-0">
                  {roundName(ri, rounds.length)}
                </div>
              </div>
            ))}
            {/* Champion Header */}
            {rounds.length > 0 && (
              <div className="flex shrink-0" style={{ width: MATCH_W - 20 }}>
                <div style={{ width: "100%" }}
                  className="text-center text-[10px] font-black text-orange-600 uppercase tracking-wider py-1 bg-orange-100 border border-orange-200 rounded-lg shadow-sm">
                  🏆 Winner
                </div>
              </div>
            )}
          </div>

          {/* Bracket area */}
          <div className="relative" style={{ height: totalH, width: totalW }}>

            {/* SVG connector lines */}
            <svg
              className="absolute inset-0 pointer-events-none"
              width={totalW} height={totalH}
              style={{ zIndex: 0 }}
            >
              {rounds.map((round, ri) => {
                if (ri >= rounds.length - 1) return null;
                const xBase = ri * (MATCH_W + CONN_W) + MATCH_W;
                const xMid  = xBase + CONN_W / 2;
                const xNext = xBase + CONN_W;

                return round.map((_, mi) => {
                  if (mi % 2 !== 0) return null;
                  const y1   = mCenterY(ri, mi);
                  const y2   = mi + 1 < round.length ? mCenterY(ri, mi + 1) : y1;
                  const midY = (y1 + y2) / 2;

                  return (
                    <motion.g
                      key={`${ri}-${mi}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: ri * 0.18 + mi * 0.07 + 0.3 }}
                      stroke="#CBD5E1" strokeWidth={1.5} fill="none"
                    >
                      <line x1={xBase} y1={y1}   x2={xMid}  y2={y1} />
                      {mi + 1 < round.length && (
                        <>
                          <line x1={xBase} y1={y2}   x2={xMid}  y2={y2} />
                          <line x1={xMid}  y1={y1}   x2={xMid}  y2={y2} />
                        </>
                      )}
                      <line x1={xMid} y1={midY} x2={xNext} y2={midY} />
                    </motion.g>
                  );
                });
              })}

              {/* Final Winner Connector */}
              {(() => {
                if (rounds.length === 0) return null;
                const finalMatch = rounds[rounds.length - 1][0];
                if (finalMatch && finalMatch.status === "COMPLETED" && finalMatch.winnerId) {
                  const xBase = (rounds.length - 1) * (MATCH_W + CONN_W) + MATCH_W;
                  const y1 = mCenterY(rounds.length - 1, 0);
                  return (
                    <motion.g key="winner-line" initial={{ opacity: 0, pathLength: 0 }} animate={{ opacity: 1, pathLength: 1 }} transition={{ delay: 0.5, duration: 0.8 }} stroke="#FF7400" strokeWidth={2.5} fill="none">
                      <line x1={xBase} y1={y1} x2={xBase + CONN_W} y2={y1} />
                    </motion.g>
                  );
                }
                return null;
              })()}
            </svg>

            {/* Match cards */}
            {rounds.map((round, ri) => {
              const xOffset = ri * (MATCH_W + CONN_W);
              return round.map((match, mi) => {
                const top = mTop(ri, mi);
                const isWinnerA = match.winnerId && match.winnerId === match.slotA.playerId;
                const isWinnerB = match.winnerId && match.winnerId === match.slotB.playerId;
                const staggerDelay = ri * 0.18 + mi * 0.07;

                return (
                  <motion.div
                    key={match.matchId}
                    style={{ position: "absolute", top, left: xOffset, width: MATCH_W, zIndex: 1 }}
                    initial={{ opacity: 0, x: -60, scale: 0.8, rotateY: -25 }}
                    animate={{ opacity: 1, x: 0, scale: 1, rotateY: 0 }}
                    transition={{ delay: staggerDelay, type: "spring", stiffness: 280, damping: 22 }}
                    className="group bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:border-blue-300 transition-shadow"
                  >
                    {/* Player A row */}
                    <div className={`flex items-center gap-1.5 px-3 py-2 border-b border-slate-100 min-h-[34px] ${match.slotA.isBye ? "opacity-25" : ""} ${isWinnerA ? "bg-emerald-50" : "hover:bg-blue-50/50"} transition-colors`}>
                      {match.slotA.seedNumber && (
                        <span className="shrink-0 text-[8px] font-black text-amber-600 bg-amber-100 w-4 h-4 rounded flex items-center justify-center">
                          {match.slotA.seedNumber}
                        </span>
                      )}
                      {!match.slotA.isBye && match.slotA.club && (
                        <span className="shrink-0 text-[9px] font-black text-blue-600">[{clubCode(match.slotA.club)}]</span>
                      )}
                      <span className={`text-[11px] font-bold truncate leading-tight ${match.slotA.isBye ? "text-slate-300 italic" : isWinnerA ? "text-emerald-700" : "text-slate-800"}`}>
                        {match.slotA.playerName}
                      </span>
                      {isWinnerA && <span className="ml-auto text-emerald-500 text-[9px] shrink-0">✓</span>}
                    </div>

                    {/* Player B row */}
                    <div className={`flex items-center gap-1.5 px-3 py-2 min-h-[34px] ${match.slotB.isBye ? "opacity-25" : ""} ${isWinnerB ? "bg-emerald-50" : "hover:bg-blue-50/50"} transition-colors`}>
                      {match.slotB.seedNumber && (
                        <span className="shrink-0 text-[8px] font-black text-amber-600 bg-amber-100 w-4 h-4 rounded flex items-center justify-center">
                          {match.slotB.seedNumber}
                        </span>
                      )}
                      {!match.slotB.isBye && match.slotB.club && (
                        <span className="shrink-0 text-[9px] font-black text-blue-600">[{clubCode(match.slotB.club)}]</span>
                      )}
                      <span className={`text-[11px] font-bold truncate leading-tight ${match.slotB.isBye ? "text-slate-300 italic" : isWinnerB ? "text-emerald-700" : "text-slate-800"}`}>
                        {match.slotB.playerName}
                      </span>
                      {isWinnerB && <span className="ml-auto text-emerald-500 text-[9px] shrink-0">✓</span>}
                    </div>

                    {/* Match info + Scoreboard button */}
                    <div className="flex items-center justify-between px-2 py-0.5 bg-slate-50 border-t border-slate-100">
                      <span className="text-[8px] text-slate-400 font-semibold">
                        {match.status === "COMPLETED" ? "✓ Done" : `Mat ${match.matNumber} · #${match.matchNumber}`}
                      </span>
                      {!match.slotA.isBye && !match.slotB.isBye &&
                       match.slotA.playerName !== "TBD" && match.slotB.playerName !== "TBD" &&
                       match.status !== "COMPLETED" && (
                        <button
                          onClick={() => onOpenScoreboard(match)}
                          className="text-[8px] font-black text-orange-500 hover:text-orange-700 transition-colors flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
                          <Monitor size={8} /> Scoreboard ↗
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              });
            })}

            {/* Champion Node */}
            {(() => {
              if (rounds.length === 0) return null;
              const finalMatch = rounds[rounds.length - 1][0];
              if (!finalMatch || finalMatch.status !== "COMPLETED" || !finalMatch.winnerId) return null;
              
              const isSlotAWinner = finalMatch.winnerId === finalMatch.slotA.playerId;
              const championName = isSlotAWinner ? finalMatch.slotA.playerName : finalMatch.slotB.playerName;
              const championClub = isSlotAWinner ? finalMatch.slotA.club : finalMatch.slotB.club;
              const top = mCenterY(rounds.length - 1, 0) - MATCH_H / 2;
              const xOffset = rounds.length * (MATCH_W + CONN_W);

              return (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5, x: -20 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  transition={{ delay: 0.7, type: "spring", stiffness: 200, damping: 15 }}
                  style={{ position: "absolute", top, left: xOffset, width: MATCH_W - 20, height: MATCH_H, zIndex: 2 }}
                  className="bg-gradient-to-r from-orange-500 to-[#FF7400] rounded-xl shadow-xl shadow-orange-500/30 overflow-hidden flex items-center justify-center border border-white"
                >
                  <div className="absolute top-0 right-0 w-16 h-16 bg-white opacity-10 rounded-bl-full" />
                  <div className="absolute bottom-0 left-0 w-10 h-10 bg-white opacity-10 rounded-tr-full" />
                  
                  <div className="flex items-center gap-3 w-full px-4 relative z-10">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shrink-0 shadow-inner">
                      <Trophy size={20} className="text-[#FF7400]" />
                    </div>
                    <div className="flex flex-col min-w-0 flex-grow">
                      <span className="text-[9px] font-black text-orange-100 uppercase tracking-widest leading-none mb-0.5">Gold Medalist</span>
                      <span className="text-sm font-black text-white truncate leading-tight">{championName}</span>
                      <span className="text-[10px] font-bold text-orange-200 truncate leading-tight">{championClub || "---"}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
