"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Loader2, Monitor, ArrowLeft, Trophy, Calendar, CheckCircle2, User, PlayCircle, Search } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9000/api";

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
  ageGroup: string; exactAge?: number; gender: string; weightCategory: string; matNumber?: number;
  rounds: BracketMatch[][]; generated: boolean; saved: boolean;
}

interface Tournament {
  id: string; title: string; date: string; status: string;
}

function MatQueueInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const tournamentId = params?.tournamentId as string;
  const matNumber = Number(searchParams?.get("mat") || 1);

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [categories, setCategories] = useState<DrawCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        
        // Fetch tournament details
        const tRes = await fetch(`${API_BASE}/tournaments/${tournamentId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (tRes.ok) setTournament(await tRes.json());

        // Fetch draws
        const dRes = await fetch(`${API_BASE}/tournaments/${tournamentId}/draws`);
        if (dRes.ok) {
          const data = await dRes.json();
          // Filter draws assigned to this mat
          const drawsArray = Array.isArray(data) ? data : (data.draws || []);
          const matDraws = drawsArray.filter((d: DrawCategory) => (d.matNumber || 1) === matNumber);
          setCategories(matDraws);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    if (tournamentId) {
      fetchData();
      
      // Polling every 10 seconds
      const interval = setInterval(fetchData, 10000);
      
      // Listen for instant match results from Scoreboard tab
      const channel = new BroadcastChannel("tnja_match_results");
      channel.onmessage = (e) => {
        if (e.data && e.data.matchId) {
          fetchData();
        }
      };
      
      return () => {
        clearInterval(interval);
        channel.close();
      };
    }
  }, [tournamentId, matNumber]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-[#FF7400] animate-spin" />
      </div>
    );
  }

  // Extract all pending/in-progress matches
  const matchQueue: { category: string, match: BracketMatch, roundIndex: number }[] = [];
  
  categories.forEach(cat => {
    const catName = `${cat.ageGroup} ${cat.gender} ${cat.weightCategory}`;
    if (cat.rounds && cat.rounds.length > 0) {
      cat.rounds.forEach((round, roundIndex) => {
        round.forEach(match => {
          if (!match.slotA.isBye && !match.slotB.isBye) {
            matchQueue.push({ category: catName, match, roundIndex });
          }
        });
      });
    }
  });

  // Sort queue: First by category name, then by round, then by matchNumber.
  matchQueue.sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    if (a.roundIndex !== b.roundIndex) return a.roundIndex - b.roundIndex;
    return (a.match.matchNumber || 0) - (b.match.matchNumber || 0);
  });

  // Filter by search query
  const filteredQueue = matchQueue.filter(item => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.category.toLowerCase().includes(q) ||
      item.match.slotA.playerName.toLowerCase().includes(q) ||
      item.match.slotB.playerName.toLowerCase().includes(q) ||
      (item.match.slotA.club && item.match.slotA.club.toLowerCase().includes(q)) ||
      (item.match.slotB.club && item.match.slotB.club.toLowerCase().includes(q))
    );
  });

  // Group by category for cleaner UI
  const groupedQueue: Record<string, typeof matchQueue> = {};
  filteredQueue.forEach(item => {
    if (!groupedQueue[item.category]) groupedQueue[item.category] = [];
    groupedQueue[item.category].push(item);
  });

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard/coach/mats" className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm hover:scale-105 transition-transform">
          <ArrowLeft size={18} className="text-slate-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
            Mat {matNumber} Queue 
            <span className="bg-orange-100 text-[#FF7400] text-xs px-3 py-1 rounded-full uppercase tracking-widest font-black border border-orange-200">
              Live
            </span>
          </h1>
          <p className="text-sm font-semibold text-slate-500">{tournament?.title}</p>
        </div>
      </div>

      {/* Search / Filter */}
      {matchQueue.length > 0 && (
        <div className="relative max-w-md">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-slate-700 font-semibold focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow outline-none shadow-sm"
            placeholder="Search players, clubs, or categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      )}

      {categories.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-100 shadow-sm text-center flex flex-col items-center justify-center min-h-[300px]">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
            <Monitor className="w-10 h-10 text-slate-300" />
          </div>
          <h3 className="text-xl font-black text-slate-700">No Categories Assigned</h3>
          <p className="text-slate-500 font-semibold mt-2 max-w-md">
            The administrator hasn't assigned any match categories to Mat {matNumber} yet.
          </p>
        </div>
      ) : filteredQueue.length === 0 && searchQuery ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-100 shadow-sm text-center flex flex-col items-center justify-center min-h-[300px]">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
            <Search className="w-10 h-10 text-slate-300" />
          </div>
          <h3 className="text-xl font-black text-slate-700">No Matches Found</h3>
          <p className="text-slate-500 font-semibold mt-2 max-w-md">
            No matches match your search query "{searchQuery}".
          </p>
        </div>
      ) : filteredQueue.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-emerald-100 shadow-sm text-center flex flex-col items-center justify-center min-h-[300px]">
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-6 text-emerald-500">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-black text-slate-700">All Matches Completed</h3>
          <p className="text-slate-500 font-semibold mt-2 max-w-md">
            There are no pending matches left for Mat {matNumber}. Great job!
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
          <h3 className="font-black text-slate-800 text-lg mb-6 px-2 flex items-center gap-2">
            <Monitor size={20} className="text-[#FF7400]" /> 
            Match Queue ({filteredQueue.length})
          </h3>
          <div className="space-y-8">
            {Object.entries(groupedQueue).map(([category, matches]) => (
              <div key={category} className="space-y-4">
                <div className="bg-slate-100 rounded-xl px-4 py-3 border border-slate-200 flex items-center gap-2">
                  <Trophy size={16} className="text-slate-500" />
                  <h4 className="font-black text-slate-700 uppercase tracking-wide text-sm">{category} <span className="text-slate-400 font-bold ml-1">({matches.length} matches)</span></h4>
                </div>
                
                <div className="space-y-3">
                  {matches.map((item, index) => {
                    const { match } = item;
                    const isReady = match.slotA.playerId && match.slotB.playerId;

                    return (
                      <div key={match.matchId} className="flex flex-col md:flex-row items-center justify-between p-5 rounded-2xl border border-slate-100 bg-slate-50 hover:border-orange-200 hover:shadow-md transition-all gap-4">
                        <div className="flex-1 w-full space-y-3">
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                              Round {match.round} • Match {match.matchNumber}
                            </span>
                          </div>

                    <div className="flex items-center gap-4">
                      <div className="flex-1 bg-white p-3 rounded-xl border border-slate-200 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                          <User size={16} />
                        </div>
                        <div className="truncate">
                          <p className="text-sm font-black text-slate-800 truncate">{match.slotA.playerName || "TBD"}</p>
                          {match.slotA.club && <p className="text-[10px] text-slate-500 font-bold truncate">{match.slotA.club}</p>}
                        </div>
                      </div>

                      <div className="font-black text-slate-300 text-sm">VS</div>

                      <div className="flex-1 bg-white p-3 rounded-xl border border-slate-200 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shrink-0 border border-slate-200">
                          <User size={16} />
                        </div>
                        <div className="truncate">
                          <p className="text-sm font-black text-slate-800 truncate">{match.slotB.playerName || "TBD"}</p>
                          {match.slotB.club && <p className="text-[10px] text-slate-500 font-bold truncate">{match.slotB.club}</p>}
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    disabled={!isReady}
                    onClick={() => {
                      const p = new URLSearchParams();
                      p.set("matchId", match.matchId);
                      p.set("fighterAName", match.slotA.playerName);
                      p.set("fighterAClub", match.slotA.club);
                      p.set("fighterBName", match.slotB.playerName);
                      p.set("fighterBClub", match.slotB.club);
                      p.set("fighterAId", match.slotA.playerId || "");
                      p.set("fighterBId", match.slotB.playerId || "");
                      p.set("matchNumber", match.matchNumber.toString());
                      p.set("matNumber", matNumber.toString());
                      p.set("tournamentTitle", `${category} - Round ${match.round}`);
                      
                      // Open scoreboard in new tab
                      window.open(`/dashboard/admin/tournaments/${tournamentId}/scoreboard?${p.toString()}`, '_blank');
                    }}
                    className={`shrink-0 flex items-center gap-2 px-6 py-4 rounded-2xl font-black transition-all ${
                      match.status === "COMPLETED"
                        ? "bg-emerald-100 text-emerald-700 border-2 border-emerald-200 cursor-default"
                        : !isReady
                        ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                        : match.status === "IN_PROGRESS"
                        ? "bg-orange-100 border-2 border-[#FF7400] text-[#FF7400] hover:bg-orange-200 shadow-md cursor-pointer"
                        : "bg-[#FF7400] text-white hover:bg-orange-600 shadow-md hover:scale-105 cursor-pointer" 
                    }`}
                  >
                    {match.status === "COMPLETED" ? <CheckCircle2 size={20} /> : <PlayCircle size={20} />}
                          {match.status === "COMPLETED" ? "Match Completed" : !isReady ? "Players TBD" : match.status === "IN_PROGRESS" ? "Continue Match" : "Launch Scoreboard"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function MatQueuePage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-slate-500 font-bold">Loading...</div>}>
      <MatQueueInner />
    </Suspense>
  );
}
