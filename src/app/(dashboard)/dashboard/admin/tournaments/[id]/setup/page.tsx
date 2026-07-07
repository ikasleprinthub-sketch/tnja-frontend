"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, X, Edit2, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9000/api";

interface Tournament {
  id: string; title: string; date: string;
}

interface RegisteredPlayer {
  id: string; name: string; club: string; district: string;
  weight: number; weightLabel?: string; ageGroup: string; gender: string; belt: string;
  status?: string; regId?: string; tnjaId?: string; height?: string;
}

export default function TournamentSetupPage() {
  const params = useParams();
  const router = useRouter();
  const tournamentId = params?.id as string;

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [players, setPlayers] = useState<RegisteredPlayer[]>([]);
  const [loading, setLoading] = useState(true);

  const [matAssignments, setMatAssignments] = useState<{id: string, matNumber: string, refereeName: string}[]>([]);
  const [setupTotalMats, setSetupTotalMats] = useState("");
  const [setupRefereeName, setSetupRefereeName] = useState("");
  const [editingMatId, setEditingMatId] = useState<string | null>(null);
  const [totalMatsCount, setTotalMatsCount] = useState<number | "">("");
  const [matsConfirmed, setMatsConfirmed] = useState(false);
  const [selectedMatForAssignment, setSelectedMatForAssignment] = useState<number | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  };

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";

  useEffect(() => {
    if (!tournamentId) return;
    const saved = localStorage.getItem(`tournament_${tournamentId}_mats`);
    if (saved) {
      try {
        setMatAssignments(JSON.parse(saved));
      } catch (e) {}
    }
  }, [tournamentId]);

  useEffect(() => {
    if (!tournamentId) return;
    localStorage.setItem(`tournament_${tournamentId}_mats`, JSON.stringify(matAssignments));
  }, [matAssignments, tournamentId]);

  const fetchTournament = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/tournaments/${tournamentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setTournament(await res.json());
    } catch (e) { console.error(e); }
  }, [tournamentId, token]);

  const fetchPlayers = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/tournaments/${tournamentId}/registrations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const mapped = data.map((r: any) => ({
          id: r.player.id,
          name: r.player.fullName,
          club: r.coach?.club?.name || r.player.club?.name || "N/A",
          district: r.player.district?.name || "N/A",
          weight: r.weight ? parseFloat(r.weight) : 0,
          weightLabel: r.weight,
          ageGroup: `${r.player.age} Years`,
          gender: r.player.gender,
          belt: r.player.presentGradeInJudo || "N/A",
          status: r.status,
          regId: r.id,
          tnjaId: r.player.permanentId || r.player.tempId,
          height: r.height,
        }));
        setPlayers(mapped);
      }
    } catch (e) {
      console.error(e);
    }
  }, [tournamentId, token]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchTournament();
      await fetchPlayers();
      setLoading(false);
    };
    load();
  }, [fetchTournament, fetchPlayers]);


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="w-10 h-10 text-[#FF7400] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10 font-sans text-slate-800">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl font-bold text-white max-w-md ${
              toast.ok ? "bg-emerald-600" : "bg-red-600"
            }`}
          >
            {toast.ok ? <CheckCircle2 size={24} className="text-emerald-200" /> : <AlertCircle size={24} className="text-red-200" />}
            <span className="leading-tight">{toast.msg}</span>
            <button onClick={() => setToast(null)} className="ml-2 hover:bg-black/20 p-1.5 rounded-xl transition-colors">
              <X size={18} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard/admin/tournaments" className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm hover:scale-105 transition-transform">
            <ArrowLeft size={18} className="text-slate-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-800">Tournament Setup</h1>
            <p className="text-sm font-semibold text-slate-500">{tournament?.title} • Complete this before proceeding to matches</p>
          </div>
        </div>


        {/* Mat Assignment Section */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-6">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-black text-slate-800 text-base">Mat & Referee Assignment</h3>
          </div>

          {!matsConfirmed ? (
            <div className="flex flex-col md:flex-row items-end gap-4 bg-slate-50 p-6 rounded-2xl border border-slate-200">
              <div className="flex-1 w-full">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Total Number of Mats</label>
                <input
                  type="number"
                  min="1"
                  value={totalMatsCount}
                  onChange={(e) => setTotalMatsCount(Number(e.target.value) || "")}
                  placeholder="e.g. 3"
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50"
                />
              </div>
              <button
                onClick={() => {
                  if (totalMatsCount && totalMatsCount > 0) {
                    setMatsConfirmed(true);
                    setSelectedMatForAssignment(1);
                  }
                }}
                disabled={!totalMatsCount}
                className="w-full md:w-auto py-3 px-8 bg-[#FF7400] text-white font-black rounded-xl hover:bg-orange-600 disabled:opacity-50 transition-colors shadow-sm"
              >
                Confirm Mats
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* LEFT SIDE: MATS LIST */}
              <div className="col-span-1 md:border-r border-slate-100 md:pr-4 space-y-2">
                <div className="flex justify-between items-center mb-4">
                   <h4 className="font-bold text-slate-600">Mats ({totalMatsCount})</h4>
                   <button onClick={() => setMatsConfirmed(false)} className="text-xs text-[#FF7400] font-bold hover:underline">Edit Total</button>
                </div>
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {Array.from({ length: Number(totalMatsCount) }, (_, i) => i + 1).map(matNum => {
                    const isSelected = selectedMatForAssignment === matNum;
                    const assigned = matAssignments.find(m => Number(m.matNumber) === matNum);
                    return (
                      <button
                        key={matNum}
                        onClick={() => setSelectedMatForAssignment(matNum)}
                        className={`w-full text-left px-4 py-3 rounded-xl font-bold transition-all flex justify-between items-center ${
                          isSelected 
                            ? "bg-[#FF7400] text-white shadow-md scale-[1.02]" 
                            : assigned 
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100" 
                              : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        <span>Mat {matNum}</span>
                        {assigned && <span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-full ${isSelected ? 'bg-orange-500 text-white' : 'bg-emerald-200 text-emerald-800'}`}>Assigned</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* RIGHT SIDE: REFEREE ASSIGNMENT */}
              <div className="col-span-1 md:col-span-2 md:pl-2">
                {selectedMatForAssignment ? (
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-6">
                    <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
                      <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-[#FF7400] font-black">
                        {selectedMatForAssignment}
                      </div>
                      <h4 className="font-black text-slate-800 text-lg">Assign Referee to Mat {selectedMatForAssignment}</h4>
                    </div>
                    
                    {(() => {
                      const assigned = matAssignments.find(m => Number(m.matNumber) === selectedMatForAssignment);
                      return assigned && !editingMatId ? (
                        <div className="bg-white p-5 rounded-xl border border-emerald-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <div>
                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Current Referee</p>
                            <p className="font-black text-slate-800 text-xl">{assigned.refereeName}</p>
                          </div>
                          <div className="flex gap-2 w-full sm:w-auto">
                            <button 
                              onClick={() => {
                                setEditingMatId(assigned.id);
                                setSetupRefereeName(assigned.refereeName);
                              }}
                              className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 hover:text-[#FF7400] hover:bg-orange-50 rounded-lg transition-colors font-bold text-sm"
                            >
                              <Edit2 size={14} /> Edit
                            </button>
                            <button 
                              onClick={() => {
                                if (window.confirm("Remove this referee assignment?")) {
                                  setMatAssignments(prev => prev.filter(m => m.id !== assigned.id));
                                }
                              }}
                              className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors font-bold text-sm"
                            >
                              <X size={14} /> Remove
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-5">
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Search Referee / ID</label>
                            <div className="relative">
                              <input
                                type="text"
                                value={setupRefereeName}
                                onChange={(e) => setSetupRefereeName(e.target.value)}
                                placeholder="Type referee name or ID..."
                                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl font-semibold focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 shadow-sm text-slate-800"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-3 pt-2">
                            {editingMatId && (
                              <button
                                onClick={() => {
                                  setEditingMatId(null);
                                  setSetupRefereeName("");
                                }}
                                className="px-6 py-2.5 bg-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-300 transition-colors"
                              >
                                Cancel
                              </button>
                            )}
                            <button
                              onClick={() => {
                                if (!setupRefereeName) return;
                                if (editingMatId) {
                                  setMatAssignments(prev => prev.map(m => m.id === editingMatId ? { ...m, refereeName: setupRefereeName } : m));
                                  setEditingMatId(null);
                                } else {
                                  // Remove any existing assignment for this mat first just in case
                                  setMatAssignments(prev => {
                                    const filtered = prev.filter(m => Number(m.matNumber) !== selectedMatForAssignment);
                                    return [...filtered, { id: Date.now().toString(), matNumber: selectedMatForAssignment.toString(), refereeName: setupRefereeName }];
                                  });
                                }
                                setSetupRefereeName("");
                              }}
                              disabled={!setupRefereeName}
                              className="py-2.5 px-8 bg-[#FF7400] text-white font-black rounded-xl hover:bg-orange-600 disabled:opacity-50 transition-colors shadow-md"
                            >
                              {editingMatId ? "Update Assignment" : "Assign Referee"}
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-slate-400 font-bold p-8 bg-slate-50/50 rounded-3xl border-2 border-slate-200 border-dashed text-center">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                      <AlertCircle size={32} className="text-slate-300" />
                    </div>
                    <p className="text-lg text-slate-500">Select a mat from the left</p>
                    <p className="text-sm font-normal mt-1">to search and assign a referee</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Proceed Action */}
        <div className="pt-6">
          <button
            onClick={() => router.push(`/dashboard/admin/tournaments/${tournamentId}`)}
            className="w-full py-4 bg-slate-900 text-white font-black text-lg rounded-2xl hover:bg-slate-800 hover:scale-[1.02] transition-all shadow-xl flex items-center justify-center gap-2"
          >
            Proceed to Tournament Hub ↗
          </button>
        </div>

      </div>
    </div>
  );
}
