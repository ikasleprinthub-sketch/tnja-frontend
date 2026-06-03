"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy, Users, Shuffle, Swords, Monitor, ArrowLeft,
  Star, Grid, List, X, Check, Loader2, Calendar, MapPin,
  Target, Zap, Award,
  AlertCircle, Clock,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

// ─── Types ───────────────────────────────────────────────────────────────────
type Tab = "overview" | "players" | "draws" | "matches";
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
  const slots: (RegisteredPlayer | null)[] = new Array(N).fill(null);

  // IJF seed positions: S1=top, S2=bottom, S3=2nd quarter, S4=3rd quarter
  if (seeds[1]) slots[0] = { ...seeds[1], seedNumber: 1 };
  if (seeds[2]) slots[N - 1] = { ...seeds[2], seedNumber: 2 };
  if (seeds[3]) slots[Math.floor(N / 4)] = { ...seeds[3], seedNumber: 3 };
  if (seeds[4]) slots[Math.floor((3 * N) / 4)] = { ...seeds[4], seedNumber: 4 };

  const seededIds = new Set(
    [seeds[1], seeds[2], seeds[3], seeds[4]].filter(Boolean).map((p) => p!.id)
  );
  const nonSeeded = shuffleArray(players.filter((p) => !seededIds.has(p.id)));

  let ni = 0;
  for (let i = 0; i < N; i++) {
    if (slots[i] === null) slots[i] = nonSeeded[ni++] || null;
  }

  const toSlot = (p: RegisteredPlayer | null): BracketSlot =>
    p
      ? { playerId: p.id, playerName: p.name, club: p.club, isBye: false, seedNumber: p.seedNumber }
      : { playerId: null, playerName: "BYE", club: "", isBye: true };

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
  const [genderFilter, setGenderFilter] = useState("ALL");
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
            weight: Number(r.weightCategory || r.weight || 0),
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
          drawMap[categoryKey(d.ageGroup, d.gender, d.weightCategory)] = {
            ...d,
            rounds: processByeMatches(d.rounds),
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
  const handleShuffle = () => {
    setDrawPhase("shuffling");
    setShuffleKey(k => k + 1);
    setTimeout(() => {
      // draw shuffled
      setDrawPhase("idle");
      setDraws((prev) => {
        const d = prev[currentKey];
        if (!d) return prev;
        return { ...prev, [currentKey]: { ...d, generated: false, saved: false } };
      });
      showToast("Players shuffled randomly");
    }, 900);
  };

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

  const handleGenerateDraw = () => {
    if (filteredPlayers.length < 2) {
      showToast("Need at least 2 players to generate a draw", false);
      return;
    }
    setDrawPhase("dealing");
    const rawRounds = generateIJFBracket(filteredPlayers, seeds);
    const rounds = processByeMatches(rawRounds);
    setTimeout(() => {
      setDraws((prev) => ({
        ...prev,
        [currentKey]: {
          ageGroup: ageFilter, gender: genderFilter,
          weightCategory: weightFilter, rounds, generated: true, saved: false,
        },
      }));
      setDrawPhase("done");
      showToast(`Draw generated for ${filteredPlayers.length} players`);
    }, 700);
  };

  const handleSaveDraw = async () => {
    const draw = draws[currentKey];
    if (!draw) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/tournaments/${tournamentId}/draws`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          ageGroup: draw.ageGroup, gender: draw.gender,
          weightCategory: draw.weightCategory, rounds: draw.rounds,
        }),
      });
      if (res.ok) {
        setDraws((prev) => ({ ...prev, [currentKey]: { ...draw, saved: true } }));
        showToast("Draw saved successfully!");
      } else {
        showToast("Failed to save draw", false);
      }
    } catch { showToast("Error saving draw", false); }
    finally { setSaving(false); }
  };

  const handleAutoGenerateAllDraws = async () => {
    if (players.length === 0) {
      showToast("No players registered in the tournament", false);
      return;
    }

    // Group players by category
    const categoryGroups: Record<string, RegisteredPlayer[]> = {};
    players.forEach((p) => {
      const key = categoryKey(p.ageGroup, p.gender, String(p.weight));
      if (!categoryGroups[key]) categoryGroups[key] = [];
      categoryGroups[key].push(p);
    });

    // Filter categories with 2 or more players
    const eligibleCategories = Object.entries(categoryGroups).filter(
      ([_, catPlayers]) => catPlayers.length >= 2
    );

    if (eligibleCategories.length === 0) {
      showToast("No categories found with 2 or more players", false);
      return;
    }

    const confirmMsg = `Found ${eligibleCategories.length} categories with 2 or more players. This will auto-shuffle and generate draws for all of them. Any existing draws for these categories will be overwritten. Proceed?`;
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
  const CategoryFilters = () => (
    <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3">
        Filter by Category
      </p>
      <div className="flex flex-wrap gap-3">
        <select value={ageFilter} onChange={(e) => setAgeFilter(e.target.value)}
          className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-300">
          <option value="ALL">All Age Groups</option>
          <option value="SENIOR">Senior (15+)</option>
          <option value="JUNIOR">Junior (U21)</option>
          <option value="CADET">Cadet (U18)</option>
          <option value="SUB_JUNIOR">Sub Junior (12–15)</option>
        </select>
        <select value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)}
          className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-300">
          <option value="ALL">All Genders</option>
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
        {(["overview", "players", "draws", "matches"] as Tab[]).map((tab) => {
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
              {tab === "players" ? `Players (${players.length})` : tab === "draws" ? "Draw Generation" : tab.charAt(0).toUpperCase() + tab.slice(1)}
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
                    ? <><Loader2 size={15} className="animate-spin" /> Shuffling...</>
                    : <><Shuffle size={16} /> Shuffle Players</>}
                </button>
                <button onClick={handleGenerateDraw}
                  disabled={filteredPlayers.length < 2 || drawPhase === "shuffling" || drawPhase === "dealing" || autoGenerating}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#FF7400] text-white rounded-2xl font-bold text-sm shadow-lg shadow-orange-500/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                  {drawPhase === "dealing"
                    ? <><Loader2 size={15} className="animate-spin" /> Dealing Cards...</>
                    : <><Zap size={16} /> Generate Draw</>}
                </button>
                <button onClick={handleAutoGenerateAllDraws}
                  disabled={players.length < 2 || drawPhase === "shuffling" || drawPhase === "dealing" || autoGenerating}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-sm shadow-lg shadow-indigo-500/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                  {autoGenerating ? (
                    <><Loader2 size={15} className="animate-spin" /> Generating All...</>
                  ) : (
                    <><Zap size={16} /> Auto-Generate All Category Draws</>
                  )}
                </button>
                {currentDraw?.generated && !currentDraw.saved && (
                  <button onClick={handleSaveDraw} disabled={saving}
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all">
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                    Save Draw
                  </button>
                )}
                {currentDraw?.saved && (
                  <span className="flex items-center gap-2 px-5 py-2.5 bg-emerald-50 text-emerald-700 rounded-2xl font-bold text-sm border border-emerald-200">
                    <Check size={16} /> Draw Saved ✓
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
                    <button onClick={() => { setDraws(p => ({ ...p, [currentKey]: { ...currentDraw!, generated: false, saved: false } })); setDrawPhase("idle"); }}
                      className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
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
                                  <span className={`text-sm font-bold ${match.slotA.isBye ? "text-slate-300" : "text-slate-800"}`}>
                                    {match.slotA.playerName}
                                  </span>
                                  <span className="text-[10px] font-black text-slate-300">vs</span>
                                  <span className={`text-sm font-bold ${match.slotB.isBye ? "text-slate-300" : "text-slate-800"}`}>
                                    {match.slotB.playerName}
                                  </span>
                                </div>
                              </div>
                              {ri === 0 && !match.slotA.isBye && !match.slotB.isBye && (
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
                              <p className={`text-sm font-black ${match.slotA.isBye ? "text-slate-300" : "text-slate-800"}`}>
                                {match.slotA.playerName}
                                {match.slotA.seedNumber && (
                                  <span className="ml-1.5 text-[9px] font-black text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full">S{match.slotA.seedNumber}</span>
                                )}
                              </p>
                              <p className="text-xs text-slate-400 font-semibold">{match.slotA.club}</p>
                            </div>
                            <span className="text-xs font-black text-slate-300 bg-slate-100 px-2.5 py-1 rounded-lg">VS</span>
                            <div>
                              <p className={`text-sm font-black ${match.slotB.isBye ? "text-slate-300" : "text-slate-800"}`}>
                                {match.slotB.playerName}
                                {match.slotB.seedNumber && (
                                  <span className="ml-1.5 text-[9px] font-black text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full">S{match.slotB.seedNumber}</span>
                                )}
                              </p>
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
                          {match.slotA.playerId && match.slotB.playerId && match.status !== "COMPLETED" && (
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
  const totalW  = rounds.length * MATCH_W + (rounds.length - 1) * CONN_W;

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
              <div key={ri} className="flex shrink-0" style={{ width: ri < rounds.length - 1 ? MATCH_W + CONN_W : MATCH_W }}>
                <div style={{ width: MATCH_W }}
                  className="text-center text-[10px] font-black text-slate-500 uppercase tracking-wider py-1 bg-slate-100 rounded-lg mr-0">
                  {roundName(ri, rounds.length)}
                </div>
              </div>
            ))}
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
                       match.slotA.playerId && match.slotB.playerId &&
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
          </div>
        </div>
      </div>
    </div>
  );
}
