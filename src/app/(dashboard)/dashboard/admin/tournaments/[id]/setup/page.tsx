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
  const [step, setStep] = useState<0|1|2|3>(0);

  const [matAssignments, setMatAssignments] = useState<{
    refereeId: any;id: string, matNumber: string, refereeName: string
}[]>([]);
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

  const [savingMats, setSavingMats] = useState(false);
  const [checkingReferee, setCheckingReferee] = useState(false);
  
  const fetchMats = useCallback(async () => {
    if (!tournamentId) return;
    try {
      const res = await fetch(`${API_BASE}/tournaments/${tournamentId}/mats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.mats && data.mats.length > 0) {
          setMatAssignments(data.mats.map((m: any) => ({
            id: m.id || Date.now().toString(),
            matNumber: m.matNumber.toString(),
            refereeId: m.refereeId || "",
            refereeName: m.referee?.fullName || ""
          })));
          setTotalMatsCount(data.mats.length);
          setMatsConfirmed(true);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, [tournamentId, token]);

  const fetchTournament = useCallback(async () => {
    if (!tournamentId) return;
    try {
      const res = await fetch(`${API_BASE}/tournaments/${tournamentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setTournament(await res.json());
    } catch (e) { console.error(e); }
  }, [tournamentId, token]);

  const fetchPlayers = useCallback(async () => {
    if (!tournamentId) return;
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
      await fetchMats();
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
          <Link href={`/dashboard/admin/tournaments/${tournamentId}`} className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm hover:scale-105 transition-transform">
            <ArrowLeft size={18} className="text-slate-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-800">Tournament Setup</h1>
            <p className="text-sm font-semibold text-slate-500">{tournament?.title || "Tournament"} • Complete this before proceeding</p>
          </div>
        </div>

        {(() => {
          const matsConfigured = totalMatsCount && totalMatsCount > 0;
          const officialsAssigned = matsConfigured && matAssignments.length === totalMatsCount && matAssignments.every(m => m.refereeId);

          return (
            <>
              {/* Step 0: Overview Checklist */}
              {step === 0 && (
                <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-6">
                  <div>
                    <h3 className="font-black text-slate-800 text-xl mb-2">Tournament Setup</h3>
                    <p className="text-slate-500 font-bold text-sm">Before starting the tournament complete the following steps.</p>
                  </div>
                  
                  <div className="space-y-4 pt-6 border-t border-slate-100">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 size={24} className="text-emerald-500" /> 
                      <span className="font-black text-slate-700 text-lg">Registration Closed</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {matsConfigured ? <CheckCircle2 size={24} className="text-emerald-500" /> : <X size={24} className="text-red-500" />}
                      <span className={`font-black text-lg ${matsConfigured ? 'text-slate-700' : 'text-slate-400'}`}>{matsConfigured ? 'Mats Configured' : 'Mats Not Configured'}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {officialsAssigned ? <CheckCircle2 size={24} className="text-emerald-500" /> : <X size={24} className="text-red-500" />}
                      <span className={`font-black text-lg ${officialsAssigned ? 'text-slate-700' : 'text-slate-400'}`}>{officialsAssigned ? 'Officials Assigned' : 'Officials Not Assigned'}</span>
                    </div>
                  </div>

                  <div className="pt-8">
                    <button onClick={() => setStep(1)} className="py-4 px-10 bg-[#FF7400] text-white font-black rounded-xl shadow-lg hover:scale-[1.02] transition-all">
                      [ Configure Mats ]
                    </button>
                  </div>
                </div>
              )}

              {/* Step 1: Configure Mats */}
              {step === 1 && (
                <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-6">
                  <div>
                    <h3 className="font-black text-slate-800 text-xl mb-2">Step 1 — Configure Mats</h3>
                    <p className="text-slate-500 font-bold text-sm">The organizer enters the total number of mats.</p>
                  </div>
                  <div className="pt-6 border-t border-slate-100">
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Total Mats</label>
                    <input
                      type="number"
                      min="1"
                      value={totalMatsCount}
                      onChange={(e) => setTotalMatsCount(Number(e.target.value) || "")}
                      placeholder="[ 4 ]"
                      className="w-full max-w-[200px] px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50"
                    />
                  </div>
                  <div className="flex gap-4 pt-8">
                    <button onClick={() => setStep(0)} className="px-8 py-4 bg-slate-100 text-slate-600 font-black rounded-xl hover:bg-slate-200 transition-colors">Back</button>
                    <button 
                      onClick={() => {
                        if (totalMatsCount && totalMatsCount > 0) {
                          setMatsConfirmed(true);
                          setSelectedMatForAssignment(1);
                          setStep(2);
                        }
                      }}
                      disabled={!totalMatsCount}
                      className="px-10 py-4 bg-[#FF7400] text-white font-black rounded-xl shadow-lg disabled:opacity-50 transition-all hover:scale-[1.02]"
                    >
                      [ Continue ]
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Assign Officials */}
              {step === 2 && (
                <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-2">
                    <h3 className="font-black text-slate-800 text-xl">Step 2 — Assign Officials</h3>
                    <button onClick={() => setStep(1)} className="text-sm text-[#FF7400] font-black hover:underline w-fit">Edit Total Mats</button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-6 border-t border-slate-100">
                    {/* LEFT SIDE: MATS LIST */}
                    <div className="col-span-1 md:border-r border-slate-100 md:pr-6 space-y-2">
                      <h4 className="font-black text-slate-400 uppercase tracking-widest text-xs mb-4">Mats</h4>
                      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {Array.from({ length: Number(totalMatsCount) }, (_, i) => i + 1).map(matNum => {
                          const isSelected = selectedMatForAssignment === matNum;
                          const assigned = matAssignments.find(m => Number(m.matNumber) === matNum && m.refereeId);
                          return (
                            <button
                              key={matNum}
                              onClick={() => setSelectedMatForAssignment(matNum)}
                              className={`w-full text-left px-5 py-4 rounded-2xl font-black transition-all flex justify-between items-center ${
                                isSelected 
                                  ? "bg-[#FF7400] text-white shadow-md scale-[1.02]" 
                                  : assigned 
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100" 
                                    : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100"
                              }`}
                            >
                              <span className="text-lg">Mat {matNum}</span>
                              {assigned && <span className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded-md ${isSelected ? 'bg-orange-500 text-white' : 'bg-emerald-200 text-emerald-800'}`}>Assigned</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* RIGHT SIDE: REFEREE ASSIGNMENT */}
                    <div className="col-span-1 md:col-span-2 md:pl-2">
                      {selectedMatForAssignment ? (
                        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 space-y-6">
                          <div className="flex items-center gap-4 border-b border-slate-200 pb-5">
                            <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center text-[#FF7400] font-black text-xl">
                              {selectedMatForAssignment}
                            </div>
                            <h4 className="font-black text-slate-800 text-xl">Assign Referee</h4>
                          </div>
                          
                          {(() => {
                            const assigned = matAssignments.find(m => Number(m.matNumber) === selectedMatForAssignment);
                            return assigned && assigned.refereeId && !editingMatId ? (
                              <div className="bg-white p-6 rounded-2xl border border-emerald-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div>
                                  <p className="text-[11px] font-black text-emerald-600 uppercase tracking-widest mb-1.5">Current Referee</p>
                                  <p className="font-black text-slate-800 text-2xl">{assigned.refereeName}</p>
                                </div>
                                <div className="flex gap-2 w-full sm:w-auto">
                                  <button 
                                    onClick={() => {
                                      setEditingMatId(assigned.id);
                                      setSetupRefereeName(assigned.refereeName);
                                    }}
                                    className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-4 py-3 bg-slate-100 text-slate-600 hover:text-[#FF7400] hover:bg-orange-50 rounded-xl transition-colors font-bold text-sm"
                                  >
                                    <Edit2 size={16} /> Edit
                                  </button>
                                  <button 
                                    onClick={() => {
                                      if (window.confirm("Remove this referee assignment?")) {
                                        setMatAssignments(prev => prev.filter(m => m.id !== assigned.id));
                                      }
                                    }}
                                    className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-4 py-3 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl transition-colors font-bold text-sm"
                                  >
                                    <X size={16} /> Remove
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-6">
                                <div>
                                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Search Referee / ID</label>
                                  <div className="relative">
                                    <input
                                      type="text"
                                      value={setupRefereeName}
                                      onChange={(e) => setSetupRefereeName(e.target.value)}
                                      placeholder="Type referee name or ID..."
                                      className="w-full px-5 py-4 bg-white border border-slate-300 rounded-2xl font-bold focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 shadow-sm text-slate-800 text-lg"
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
                                      className="px-6 py-3 bg-slate-200 text-slate-700 font-black rounded-xl hover:bg-slate-300 transition-colors"
                                    >
                                      Cancel
                                    </button>
                                  )}
                                  <button
                                    onClick={async () => {
                                      if (!setupRefereeName) return;
                                      setCheckingReferee(true);
                                      try {
                                        const res = await fetch(`${API_BASE}/referees/search?id=${setupRefereeName}`);
                                        const data = await res.json();
                                        if (res.ok) {
                                          if (editingMatId) {
                                            setMatAssignments(prev => prev.map(m => m.id === editingMatId ? { ...m, refereeId: data.id, refereeName: data.name } : m));
                                            setEditingMatId(null);
                                          } else {
                                            setMatAssignments(prev => {
                                              const filtered = prev.filter(m => Number(m.matNumber) !== selectedMatForAssignment);
                                              return [...filtered, { id: Date.now().toString(), matNumber: selectedMatForAssignment!.toString(), refereeId: data.id, refereeName: data.name }];
                                            });
                                          }
                                          setSetupRefereeName("");
                                        } else {
                                          showToast(data.error || "Referee not found", false);
                                        }
                                      } catch (e) {
                                        showToast("Error checking referee", false);
                                      } finally {
                                        setCheckingReferee(false);
                                      }
                                    }}
                                    disabled={!setupRefereeName || checkingReferee}
                                    className="py-3 px-8 bg-[#FF7400] text-white font-black rounded-xl hover:bg-orange-600 disabled:opacity-50 transition-colors shadow-md flex items-center gap-2"
                                  >
                                    {checkingReferee ? <Loader2 size={18} className="animate-spin" /> : null}
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
                  
                  <div className="pt-8 flex gap-4 border-t border-slate-100 mt-8">
                    <button onClick={() => setStep(1)} className="px-8 py-4 bg-slate-100 text-slate-600 font-black rounded-xl hover:bg-slate-200 transition-colors">Back</button>
                    <button
                      onClick={async () => {
                        setSavingMats(true);
                        try {
                          const payloadMats = [];
                          const maxMats = Number(totalMatsCount) || 1;
                          for (let i = 1; i <= maxMats; i++) {
                            const assigned = matAssignments.find(m => Number(m.matNumber) === i);
                            payloadMats.push({
                              matNumber: i,
                              refereeId: assigned ? assigned.refereeId : ""
                            });
                          }
                          const res = await fetch(`${API_BASE}/tournaments/${tournamentId}/mats`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                            body: JSON.stringify({ assignments: payloadMats })
                          });
                          if (res.ok) {
                            setStep(3);
                          } else {
                            showToast("Failed to save assignments", false);
                          }
                        } catch (e) {
                          showToast("Error saving assignments", false);
                        } finally {
                          setSavingMats(false);
                        }
                      }}
                      disabled={savingMats}
                      className="flex-1 py-4 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl shadow-xl flex items-center justify-center gap-2 transition-transform hover:scale-[1.01]"
                    >
                      {savingMats && <Loader2 className="animate-spin" size={20} />}
                      Store this permanently.
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Success & Start Tournament */}
              {step === 3 && (
                <div className="bg-white rounded-3xl p-10 border border-slate-100 shadow-sm space-y-6 text-center">
                  <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 size={48} className="text-emerald-500" />
                  </motion.div>
                  <h3 className="font-black text-slate-800 text-3xl">Setup Complete!</h3>
                  <p className="text-slate-500 font-bold text-lg mb-8">All mats are configured and officials are assigned.</p>
                  
                  <div className="pt-8 border-t border-slate-100 max-w-md mx-auto">
                    <button
                      onClick={async () => {
                        try {
                          const res = await fetch(`${API_BASE}/tournaments/${tournamentId}/start`, {
                            method: "PUT",
                            headers: { Authorization: `Bearer ${token}` }
                          });
                          if (res.ok) {
                            showToast("Tournament started! Registrations closed.", true);
                            router.push(`/dashboard/admin/tournaments/${tournamentId}`);
                          } else {
                            const err = await res.json();
                            showToast(err.error || "Failed to start", false);
                          }
                        } catch (e) {
                          showToast("Failed to start", false);
                        }
                      }}
                      className="w-full py-5 bg-[#10B981] hover:bg-[#059669] text-white font-black text-xl rounded-2xl shadow-xl shadow-emerald-500/20 hover:scale-[1.03] transition-all"
                    >
                      Start Tournament Now
                    </button>
                  </div>
                </div>
              )}
            </>
          );
        })()}
      </div>
    </div>
  );
}