"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Trophy,
  MapPin,
  Clock,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Filter,
  IndianRupee,
  Users,
  Plus,
  Calendar,
  ChevronRight,
  Hourglass,
  Send,
  MessageSquare,
} from "lucide-react";
import FileUpload from "@/components/common/FileUpload";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9000/api";

// ─── Types ────────────────────────────────────────────────────────────────────
type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED" | "NOT_REQUIRED";

/** Coerce null / undefined from the API to "PENDING" so comparisons are safe */
function safeStatus(val: ApprovalStatus | null | undefined): ApprovalStatus {
  return val ?? "PENDING";
}

/** Normalise the role string regardless of casing / separator from the backend */
function normaliseRole(raw: string): string {
  return raw.toUpperCase().replace(/[- ]/g, "_");
}

interface Tournament {
  id: string;
  title: string;
  date: string;
  dateTo?: string;
  location: string;
  level: string;
  entryFee: number;
  totalSlots: number;
  registrationCount?: number;
  ageFrom: number;
  ageTo: number;
  gender: string;
  beltEligibility?: string;
  allowBPL: boolean;
  status: string;
  districtApproval: ApprovalStatus;
  stateApproval: ApprovalStatus;
  superAdminApproval: ApprovalStatus;
  ceoApproval: ApprovalStatus;
  rejectionRemark?: string;
  hasPendingPlayers?: boolean;
  club?: { name: string; district?: { name: string } };
  bannerImage?: string;
}

// ─── Role configuration ───────────────────────────────────────────────────────
/**
 * Maps each admin role to the approval field they manage.
 * null = this role creates but doesn't sit in an approval queue.
 */
const APPROVAL_LEVEL_MAP: Record<string, string | null> = {
  DISTRICT_PRESIDENT: "district",
  DISTRICT_SECRETARY: "district",
  ZONE_PRESIDENT: null,   // creator only, no approval seat
  ZONE_SECRETARY: null,
  STATE_PRESIDENT: "state",
  STATE_SECRETARY: "state",
  SUPER_ADMIN: "superAdmin",
  CEO: "ceo",
};

/** Roles that are allowed to create tournaments. */
const CAN_CREATE_ROLES = [
  "DISTRICT_PRESIDENT",
  "DISTRICT_SECRETARY",
  "ZONE_PRESIDENT",
  "ZONE_SECRETARY",
  "STATE_PRESIDENT",
  "STATE_SECRETARY",
];

const ROLE_LABEL: Record<string, string> = {
  DISTRICT_PRESIDENT: "District President",
  DISTRICT_SECRETARY: "District Secretary",
  ZONE_PRESIDENT: "Zone President",
  ZONE_SECRETARY: "Zone Secretary",
  STATE_PRESIDENT: "State President",
  STATE_SECRETARY: "State Secretary",
  SUPER_ADMIN: "Super Admin",
  CEO: "CEO",
};

/**
 * Returns true if the tournament belongs in this role's approval queue.
 *
 * Approval chain:
 *   Club created     → District → State → (SuperAdmin OR CEO)
 *   District created →            State → (SuperAdmin OR CEO)  (district auto-skipped)
 *   Zone created     →            State → (SuperAdmin OR CEO)  (district auto-skipped)
 *   State created    →                    (SuperAdmin OR CEO)  (district+state auto-skipped)
 *
 * SuperAdmin and CEO are PARALLEL final approvers.
 * Only ONE of them needs to approve — whichever acts first closes the tournament.
 */
function inApprovalQueue(t: Tournament, role: string): boolean {
  // Coerce null/undefined fields from the API into proper status strings
  const district = safeStatus(t.districtApproval);
  const state = safeStatus(t.stateApproval);
  const superAdmin = safeStatus(t.superAdminApproval);
  const ceo = safeStatus(t.ceoApproval);

  switch (normaliseRole(role)) {
    case "DISTRICT_PRESIDENT":
    case "DISTRICT_SECRETARY":
      return district === "PENDING";

    case "STATE_PRESIDENT":
    case "STATE_SECRETARY":
      // District step must already be resolved (APPROVED or NOT_REQUIRED / auto-skipped)
      return (
        (district === "APPROVED" || district === "NOT_REQUIRED") &&
        state === "PENDING"
      );

    case "SUPER_ADMIN":
      // Super Admin sees their own queue + CEO's queue combined
      return superAdmin === "PENDING" || ceo === "PENDING";

    case "CEO":
      // CEO sees their own queue + Super Admin's queue combined
      return ceo === "PENDING" || superAdmin === "PENDING";

    default:
      console.warn("[Tournaments] unrecognised role in inApprovalQueue:", role);
      return false;
  }
}

const ApprovalChain = () => null;

// ─── Empty form ───────────────────────────────────────────────────────────────
const emptyForm = {
  title: "", dateFrom: "", dateTo: "", location: "", description: "",
  entryFee: "", totalSlots: "", numberOfMats: "1", ageFrom: "0", ageTo: "100",
  gender: "BOTH", allowBPL: false, beltEligibility: "", level: "DISTRICT",
  bannerImage: "",
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function AdminTournamentsPage() {
  const searchParams = useSearchParams();
  const [userRole, setUserRole] = useState<string>("");

  // "approval" = show pending approvals for this role
  // "mine"     = show tournaments created by this role
  // "approved" = show fully approved tournaments
  const [activeTab, setActiveTab] = useState<"approval" | "mine" | "approved">("approval");

  const [allTournaments, setAllTournaments] = useState<Tournament[]>([]);
  const [myTournaments, setMyTournaments] = useState<Tournament[]>([]);
  const [approvedByMeList, setApprovedByMeList] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [replyLoading, setReplyLoading] = useState<Record<string, boolean>>({});
  const [tMessages, setTMessages] = useState<Record<string, { id: string; senderRole: string; senderName: string; message: string; createdAt: string }[]>>({});

  const fetchTournamentMessages = useCallback(async (tournamentId: string) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/tournaments/${tournamentId}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTMessages((prev) => ({ ...prev, [tournamentId]: data }));
      }
    } catch (err) {
      console.error("Failed to fetch tournament messages", err);
    }
  }, []);

  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  // Create modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({ ...emptyForm });
  const [submitLoading, setSubmitLoading] = useState(false);

  // Reject modal
  const [rejectModal, setRejectModal] = useState<{ id: string } | null>(null);
  const [rejectRemark, setRejectRemark] = useState("");

  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Initialise role & active tab ─────────────────────────────────────────────
  useEffect(() => {
    const raw = localStorage.getItem("userRole") || "";
    const role = normaliseRole(raw);
    console.log("[Tournaments] resolved role:", role, "(raw from localStorage:", raw, ")");
    setUserRole(role);

    const tabParam = searchParams.get("tab");
    if (tabParam === "approval" || tabParam === "mine" || tabParam === "approved") {
      setActiveTab(tabParam);
    } else {
      const isCreatorOnly = role === "ZONE_PRESIDENT" || role === "ZONE_SECRETARY";
      setActiveTab(isCreatorOnly ? "mine" : "approval");
    }
  }, [searchParams]);

  // ── Per-tab fetch — fires whenever activeTab or userRole changes ─────────────
  const fetchTabData = useCallback(async (tab: "approval" | "mine" | "approved", role: string) => {
    if (!role) return;
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      if (tab === "approval") {
        const res = await fetch(`${API_BASE}/tournaments/admin`, { headers });
        if (res.ok) {
          const data = await res.json();
          setAllTournaments(data);
          data.forEach((t: any) => fetchTournamentMessages(t.id));
        }
      } else if (tab === "mine") {
        const res = await fetch(`${API_BASE}/tournaments/official/my`, { headers });
        if (res.ok) {
          const data = await res.json();
          setMyTournaments(data);
          data.forEach((t: any) => fetchTournamentMessages(t.id));
        }
      } else if (tab === "approved") {
        const res = await fetch(`${API_BASE}/tournaments/admin/approved`, { headers });
        if (res.ok) {
          const data = await res.json();
          setApprovedByMeList(data);
          data.forEach((t: any) => fetchTournamentMessages(t.id));
        }
      }
    } catch (err) {
      console.error("[Tournaments] fetchTabData error:", err);
    } finally {
      setLoading(false);
    }
  }, [fetchTournamentMessages]);

  useEffect(() => {
    if (!userRole || !activeTab) return;
    fetchTabData(activeTab, userRole);
  }, [activeTab, userRole, fetchTabData]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setIsFilterOpen(false);
      }
    };

    const handleScroll = () => {
      if (isFilterOpen) {
        setIsFilterOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScroll, true);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [isFilterOpen]);

  // ── Derived values ───────────────────────────────────────────────────────────
  const approvalLevel = APPROVAL_LEVEL_MAP[userRole] ?? null;
  const canCreate = CAN_CREATE_ROLES.includes(userRole);
  const hasApprovalRole = approvalLevel !== null;

  const approvalQueue = allTournaments.filter(t => inApprovalQueue(t, userRole));

  const displayedApproval = approvalQueue.filter(
    t => !searchQuery || t.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const displayedMine = myTournaments
    .filter(t => filter === "ALL" || t.status === filter)
    .filter(t => !searchQuery || t.title.toLowerCase().includes(searchQuery.toLowerCase()));

  const displayedApproved = approvedByMeList.filter(
    t => !searchQuery || t.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ── Approve / Reject action ──────────────────────────────────────────────────
  const handleAction = async (id: string, status: "APPROVED" | "REJECTED", remark?: string) => {
    const message = replyTexts[id]?.trim() || remark || "";
    if (status === "REJECTED" && !message) {
      setRejectModal({ id });
      return;
    }
    setActionLoading(id);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/tournaments/${id}/approve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status, remark: message, message, approvalLevel }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update");
      showToast(`Tournament ${status.toLowerCase()} successfully`, "success");
      setReplyTexts(prev => { const n = { ...prev }; delete n[id]; return n; });
      setRejectModal(null);
      setRejectRemark("");
      fetchTabData("approval", userRole);
    } catch (err: any) {
      showToast(err.message || "Something went wrong", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendTournamentReply = async (id: string) => {
    const message = replyTexts[id]?.trim();
    if (!message) return;
    setReplyLoading(prev => ({ ...prev, [id]: true }));
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/tournaments/${id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message }),
      });
      if (!res.ok) throw new Error("Failed to send reply");
      setReplyTexts(prev => { const n = { ...prev }; delete n[id]; return n; });
      await fetchTournamentMessages(id);
      showToast("Reply sent to creator.", "success");
    } catch (err: any) {
      showToast(err.message || "Something went wrong", "error");
    } finally {
      setReplyLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  // ── Create tournament ────────────────────────────────────────────────────────
  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/tournaments/official/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...formData,
          entryFee: Number(formData.entryFee),
          totalSlots: Number(formData.totalSlots),
          numberOfMats: Number(formData.numberOfMats),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create");
      showToast("Tournament created! Awaiting approvals.", "success");
      setIsCreateOpen(false);
      setFormData({ ...emptyForm });
      fetchTabData("mine", userRole);
    } catch (err: any) {
      showToast(err.message || "Something went wrong", "error");
    } finally {
      setSubmitLoading(false);
    }
  };

  // ── Approval chain preview inside Create modal ────────────────────────────────
  const ApprovalChainPreview = () => {
    return null;
  };

  // ── Stat cards ───────────────────────────────────────────────────────────────
  const totalMine = myTournaments.length;
  const approvedMine = myTournaments.filter(t => t.status === "APPROVED").length;
  const pendingQueue = approvalQueue.length;

  const isExpired = (t: { date?: string; dateTo?: string }): boolean => {
    const endDate = t.dateTo || t.date;
    if (!endDate) return false;
    const d = new Date(endDate);
    d.setHours(23, 59, 59, 999);
    return d < new Date();
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8 relative">

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 z-[200] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl text-white font-bold text-sm ${toast.type === "success" ? "bg-emerald-600" : "bg-red-600"
              }`}
          >
            {toast.type === "success" ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Page header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-[#FF7400]">Tournaments</h1>
          <p className="text-slate-500 text-sm mt-1">
            {ROLE_LABEL[userRole] || "Admin"} — Tournament Management
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 px-6 py-4 bg-[#FF7400] text-white font-bold rounded-2xl shadow-lg shadow-[#FF7400]/20 hover:scale-105 active:scale-95 transition-all w-fit"
          >
            <Plus size={20} /> Create Tournament
          </button>
        )}
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Pending my approval */}
        {hasApprovalRole && (
          <div className="bg-white p-6 rounded-[14px] border border-b-[4px] border-amber-400 shadow-md flex flex-col justify-between h-[120px]">
            <p className="text-[11px] font-semibold text-slate-500 tracking-[0.15em]">PENDING MY APPROVAL</p>
            <div className="flex items-center justify-between">
              <h3 className="text-4xl font-black text-slate-900">{pendingQueue}</h3>
              <div className="w-[46px] h-[46px] bg-amber-50 rounded-full flex items-center justify-center shadow-inner">
                <AlertCircle size={22} className="text-amber-500" />
              </div>
            </div>
          </div>
        )}

        {/* My tournaments */}
        {canCreate && (
          <div className="bg-white p-6 rounded-[14px] border border-b-[4px] border-[#FF7400] shadow-md flex flex-col justify-between h-[120px]">
            <p className="text-[11px] font-semibold text-slate-500 tracking-[0.15em]">MY TOURNAMENTS</p>
            <div className="flex items-center justify-between">
              <h3 className="text-4xl font-black text-slate-900">{totalMine}</h3>
              <div className="w-[46px] h-[46px] bg-orange-50 rounded-full flex items-center justify-center shadow-inner">
                <Trophy size={22} className="text-[#FF7400]" />
              </div>
            </div>
          </div>
        )}

        {/* Fully approved (creator view) or Total in system (approver view) */}
        {canCreate ? (
          <div className="bg-white p-6 rounded-[14px] border border-b-[4px] border-emerald-500 shadow-md flex flex-col justify-between h-[120px]">
            <p className="text-[11px] font-semibold text-slate-500 tracking-[0.15em]">FULLY APPROVED</p>
            <div className="flex items-center justify-between">
              <h3 className="text-4xl font-black text-slate-900">{approvedMine}</h3>
              <div className="w-[46px] h-[46px] bg-emerald-50 rounded-full flex items-center justify-center shadow-inner">
                <CheckCircle2 size={22} className="text-emerald-500" />
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="bg-white p-6 rounded-[14px] border border-b-[4px] border-[#FF7400] shadow-md flex flex-col justify-between h-[120px]">
              <p className="text-[11px] font-semibold text-slate-500 tracking-[0.15em]">PENDING IN QUEUE</p>
              <div className="flex items-center justify-between">
                <h3 className="text-4xl font-black text-slate-900">{allTournaments.length}</h3>
                <div className="w-[46px] h-[46px] bg-orange-50 rounded-full flex items-center justify-center shadow-inner">
                  <Trophy size={22} className="text-[#FF7400]" />
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-[14px] border border-b-[4px] border-emerald-500 shadow-md flex flex-col justify-between h-[120px]">
              <p className="text-[11px] font-semibold text-slate-500 tracking-[0.15em]">APPROVED BY ME</p>
              <div className="flex items-center justify-between">
                <h3 className="text-4xl font-black text-slate-900">{approvedByMeList.length}</h3>
                <div className="w-[46px] h-[46px] bg-emerald-50 rounded-full flex items-center justify-center shadow-inner">
                  <CheckCircle2 size={22} className="text-emerald-500" />
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-0 border-b border-slate-200">
        {[
          ...(hasApprovalRole ? [{
            key: "approval" as const,
            label: `Approval Queue${pendingQueue > 0 ? ` (${pendingQueue})` : ""}`,
          }] : []),
          ...(canCreate ? [{ key: "mine" as const, label: "My Tournaments" }] : []),
          { key: "approved" as const, label: "Approved Tournaments" },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-3 text-sm font-bold border-b-2 -mb-[2px] transition-all ${activeTab === tab.key
              ? "border-[#FF7400] text-[#FF7400]"
              : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Search + filter bar ── */}
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-grow w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search tournaments..."
            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#FF7400]/30 font-medium text-sm text-slate-700 shadow-sm"
          />
        </div>

        {/* Status filter only for "My Tournaments" tab */}
        {activeTab === "mine" && (
          <div className="relative" ref={filterRef}>
            <div
              className="p-[1.5px] rounded-[10px] shrink-0 inline-flex shadow-sm"
              style={{ background: "linear-gradient(to right, #552700 0%, #FF0E00 25%, #FFDA00 75%, #FF7400 100%)" }}
            >
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="flex items-center gap-2 px-5 py-2.5 bg-white text-slate-800 font-bold rounded-[8.5px] hover:bg-slate-50 transition-all text-sm"
              >
                <Filter size={16} />
                {filter === "ALL" ? "Filter" : filter}
              </button>
            </div>
            {isFilterOpen && (
              <div className="absolute top-full mt-2 right-0 bg-white border border-slate-200 shadow-xl rounded-[10px] overflow-hidden z-50 w-44">
                {["ALL", "APPROVED", "PENDING", "REJECTED"].map(f => (
                  <button
                    key={f}
                    onClick={() => { setFilter(f); setIsFilterOpen(false); }}
                    className={`w-full text-left px-4 py-3 text-sm font-bold transition-colors ${filter === f ? "bg-orange-50 text-[#FF7400]" : "text-slate-600 hover:bg-slate-50"
                      }`}
                  >
                    {f === "ALL" ? "All Tournaments" : f}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Main content area ── */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={40} className="animate-spin text-[#FF7400]" />
        </div>
      ) : (
        <>
          {/* ════════════ APPROVAL QUEUE ════════════ */}
          {activeTab === "approval" && (
            <>
              {displayedApproval.length === 0 ? (
                <div className="text-center py-20 bg-white border border-slate-200 rounded-3xl">
                  <CheckCircle2 size={40} className="mx-auto mb-3 text-emerald-300" />
                  <h3 className="text-lg font-bold text-slate-500">No Pending Approvals</h3>
                  <p className="text-slate-400 text-sm mt-1">You're all caught up!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {displayedApproval.map(t => (
                    <div key={t.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

                      {/* Top — image + details */}
                      <div className="flex">
                        <div className="w-44 flex-shrink-0 relative" style={{ minHeight: 200 }}>
                          <img src={t.bannerImage || "/homepage/whatjudo/judo1.png"} alt="Judo" className="absolute inset-0 w-full h-full object-cover" />
                        </div>
                        <div className="flex-grow p-5">
                          <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                            {[
                              { label: "Tournament Name", value: t.title },
                              { label: "Level", value: t.level },
                              { label: "Gender", value: t.gender || "—" },
                              { label: "Age", value: `${t.ageFrom}–${t.ageTo} yrs` },
                              { label: "Date", value: new Date(t.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) },
                              { label: "Time", value: new Date(t.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) },
                              { label: "Location", value: t.location },
                              { label: "Tournament Fees", value: t.entryFee === 0 ? "Free" : String(t.entryFee) },
                            ].map(({ label, value }) => (
                              <div key={label}>
                                <p className="text-[11px] font-bold text-[#FF7400] mb-0.5">{label}</p>
                                <p className="text-sm font-semibold text-slate-700 leading-tight">{value}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Tournament Chat Section */}
                      <div className="bg-slate-50/50 border-t border-slate-100 p-5 space-y-3">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <MessageSquare size={13} className="text-[#FF7400]" />
                          Communication History & Comments
                        </h4>

                        {/* Messages list */}
                        {tMessages[t.id]?.length > 0 ? (
                          <div className="space-y-3 max-h-40 overflow-y-auto pr-2">
                            {tMessages[t.id].map((msg) => (
                              <div key={msg.id} className="flex items-start gap-2.5">
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[9px] font-black ${
                                  msg.senderRole === "CLUB" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-[#FF7400]"
                                }`}>
                                  {msg.senderName.charAt(0)}
                                </div>
                                <div className="flex-grow">
                                  <p className="text-xs text-slate-700 font-semibold leading-relaxed">
                                    <span className="font-bold text-slate-900 mr-1.5">{msg.senderName}:</span>
                                    {msg.message}
                                  </p>
                                  <p className="text-[9px] text-slate-400 mt-0.5">
                                    {new Date(msg.createdAt).toLocaleDateString("en-GB")} {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs font-semibold text-slate-400">No communication history yet.</p>
                        )}
                      </div>

                      {/* Bottom row */}
                      <div className="flex items-center px-4 py-3 border-t border-slate-100">
                        {/* Send Reply — fixed width, orange border */}
                        <div className="w-72 rounded-[10px] p-[1.5px]" style={{ background: "linear-gradient(to right, #552700 0%, #FF0E00 25%, #FFDA00 75%, #FF7400 100%)" }}>
                          <div className="flex items-center gap-2 bg-white rounded-[8.5px] px-3 py-2">
                            <input
                              type="text"
                              placeholder="Send Reply"
                              value={replyTexts[t.id] || ""}
                              onChange={(e) => setReplyTexts(prev => ({ ...prev, [t.id]: e.target.value }))}
                              onKeyDown={(e) => e.key === "Enter" && handleSendTournamentReply(t.id)}
                              className="flex-grow bg-transparent text-sm text-slate-600 placeholder-slate-400 outline-none"
                            />
                            <button
                              onClick={() => handleSendTournamentReply(t.id)}
                              disabled={!replyTexts[t.id]?.trim() || replyLoading[t.id]}
                              className="text-slate-400 hover:text-[#FF7400] disabled:opacity-30 transition-colors shrink-0"
                            >
                              {replyLoading[t.id] ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                            </button>
                          </div>
                        </div>

                        {/* Buttons pushed to far right */}
                        <div className="ml-auto flex items-center gap-2">
                          {(safeStatus(t.superAdminApproval) === "APPROVED" || safeStatus(t.ceoApproval) === "APPROVED") ? (
                            <div className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                              <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                              <span className="text-xs font-bold text-emerald-700 whitespace-nowrap">
                                Approved by {safeStatus(t.superAdminApproval) === "APPROVED" ? "Super Admin" : "CEO"}
                              </span>
                            </div>
                          ) : (
                            <>
                              <button
                                onClick={() => handleAction(t.id, "APPROVED")}
                                disabled={actionLoading === t.id}
                                className="px-5 py-2 bg-[#FF7400] text-white text-sm font-bold rounded-lg hover:bg-[#E56900] disabled:opacity-50 transition-all"
                              >
                                {actionLoading === t.id ? <Loader2 size={15} className="animate-spin" /> : "Approve"}
                              </button>
                              <button
                                onClick={() => handleAction(t.id, "REJECTED")}
                                disabled={!!actionLoading}
                                className="px-5 py-2 bg-white border border-slate-300 text-slate-600 text-sm font-bold rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-200 disabled:opacity-50 transition-all"
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Manage link */}
                      <div className="px-4 pb-3">
                        {!t.hasPendingPlayers && (
                          <Link
                            href={`/dashboard/admin/tournaments/${t.id}`}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white font-bold rounded-lg text-xs hover:bg-slate-800 transition-all"
                          >
                            <Trophy size={12} /> Manage / Generate Draw <ChevronRight size={12} />
                          </Link>
                        )}
                        {t.hasPendingPlayers && (
                          <button
                            disabled
                            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-400 font-bold rounded-lg text-xs cursor-not-allowed"
                          >
                            <AlertCircle size={12} /> Resolve Pending Players
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ════════════ APPROVED TOURNAMENTS ════════════ */}
          {activeTab === "approved" && (
            <>
              {loading ? (
                <div className="flex justify-center py-20">
                  <Loader2 size={32} className="animate-spin text-[#FF7400]" />
                </div>
              ) : displayedApproved.length === 0 ? (
                <div className="text-center py-20 bg-white border border-slate-200 rounded-3xl">
                  <CheckCircle2 size={40} className="mx-auto mb-3 text-slate-200" />
                  <h3 className="text-lg font-bold text-slate-500">No Approved Tournaments</h3>
                  <p className="text-slate-400 text-sm mt-1">You haven't approved any tournaments yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {displayedApproved.map(t => (
                    <motion.div
                      key={t.id}
                      whileHover={{ y: -4 }}
                      className="bg-white rounded-[20px] shadow-lg overflow-hidden flex flex-col"
                    >
                      <div className="h-32 bg-gradient-to-br from-emerald-900 via-emerald-700 to-[#FF7400] relative overflow-hidden">
                        {t.bannerImage && <img src={t.bannerImage} alt="Banner" className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-60" />}
                        <div className="absolute inset-0 bg-black/20" />
                        <div className="absolute top-3 left-3 bg-white/20 backdrop-blur text-white text-[10px] font-bold px-3 py-1 rounded-full border border-white/30">
                          {t.level}
                        </div>
                        <div className="absolute top-3 right-3 bg-emerald-500/80 backdrop-blur text-white text-[10px] font-bold px-3 py-1 rounded-full border border-emerald-400/30 flex items-center gap-1">
                          <CheckCircle2 size={10} /> Approved
                        </div>
                        {t.club && (
                          <div className="absolute bottom-3 left-3 right-3 bg-black/40 backdrop-blur rounded-xl p-2.5 border border-white/20">
                            <p className="text-white text-xs font-bold truncate">{t.club.name}</p>
                            {t.club.district && (
                              <p className="text-white/70 text-[10px] truncate">{t.club.district.name}</p>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="p-5 flex-grow flex flex-col">
                        <h3 className="text-lg font-bold text-slate-800 mb-3 leading-snug">{t.title}</h3>

                        <div className="space-y-2 text-sm text-slate-500">
                          <div className="flex items-center gap-2">
                            <Clock size={13} className="text-[#FF7400]" />
                            {new Date(t.date).toLocaleDateString("en-GB")}
                            {t.dateTo && ` – ${new Date(t.dateTo).toLocaleDateString("en-GB")}`}
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin size={13} className="text-[#FF7400]" />{t.location}
                          </div>
                          <div className="flex items-center gap-2">
                            <Users size={13} className="text-[#FF7400]" />
                            Ages: {t.ageFrom}–{t.ageTo} · {t.gender}
                          </div>
                          <div className="flex items-center gap-2">
                            <IndianRupee size={13} className="text-[#FF7400]" />
                            {t.entryFee === 0 ? "Free Entry" : `₹${t.entryFee}`}
                          </div>
                        </div>

                        {!t.hasPendingPlayers && (
                          <Link
                            href={`/dashboard/admin/tournaments/${t.id}`}
                            className="mt-4 flex items-center justify-center gap-2 w-full py-2 bg-slate-900 text-white font-bold rounded-xl text-xs hover:bg-slate-800 transition-all"
                          >
                            <Trophy size={12} /> Manage / Generate Draw
                            <ChevronRight size={12} />
                          </Link>
                        )}
                        {t.hasPendingPlayers && (
                          <button
                            disabled
                            className="mt-4 flex items-center justify-center gap-2 w-full py-2 bg-slate-100 text-slate-400 font-bold rounded-xl text-xs cursor-not-allowed"
                          >
                            <AlertCircle size={12} /> Resolve Pending Players
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ════════════ MY TOURNAMENTS ════════════ */}
          {activeTab === "mine" && (
            <>
              {displayedMine.length === 0 ? (
                <div className="text-center py-20 bg-white border border-slate-200 rounded-3xl">
                  <Trophy size={40} className="mx-auto mb-3 text-slate-200" />
                  <h3 className="text-lg font-bold text-slate-500">No Tournaments Yet</h3>
                  <p className="text-slate-400 text-sm mt-1">
                    Click "Create Tournament" to get started.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {displayedMine.map(t => (
                    <motion.div
                      key={t.id}
                      whileHover={{ y: -4 }}
                      className="bg-white rounded-[20px] shadow-lg overflow-hidden flex flex-col"
                    >
                      {/* Card banner */}
                      <div className="h-28 bg-gradient-to-br from-[#FF7400]/15 to-amber-50 flex items-center justify-center relative overflow-hidden">
                        {t.bannerImage ? (
                          <img src={t.bannerImage} alt="Banner" className="absolute inset-0 w-full h-full object-cover" />
                        ) : (
                          <Trophy size={40} className="text-[#FF7400]/20 absolute" />
                        )}
                        <span className="absolute top-3 left-3 bg-white/90 text-slate-600 text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm">
                          {t.level}
                        </span>
                        {isExpired(t) ? (
                          <span className="absolute top-3 right-3 text-[10px] font-bold px-2.5 py-1 rounded-full border bg-slate-100 text-slate-500 border-slate-300 flex items-center gap-1">
                            <Clock size={10} /> Expired
                          </span>
                        ) : (
                          <span className={`absolute top-3 right-3 text-[10px] font-bold px-2.5 py-1 rounded-full border flex items-center gap-1 ${
                            t.status === "APPROVED" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                            t.status === "CLOSED" ? "bg-indigo-50 text-indigo-700 border-indigo-200" :
                            t.status === "REJECTED" ? "bg-red-50 text-red-600 border-red-200" :
                            "bg-amber-50 text-amber-700 border-amber-200"
                          }`}>
                            {t.status === "APPROVED" ? <><CheckCircle2 size={10} /> Approved</> :
                             t.status === "CLOSED" ? <><CheckCircle2 size={10} /> Concluded</> :
                             t.status === "REJECTED" ? <><XCircle size={10} /> Rejected</> : <><Hourglass size={10} /> Pending</>}
                          </span>
                        )}
                      </div>

                      {/* Card body */}
                      <div className="p-5 flex-grow flex flex-col">
                        <h3 className="text-lg font-bold text-slate-800 mb-3 leading-snug">{t.title}</h3>

                        <div className="space-y-2 text-sm text-slate-500">
                          <div className="flex items-center gap-2">
                            <Clock size={13} className="text-[#FF7400]" />
                            {new Date(t.date).toLocaleDateString("en-GB")}
                            {t.dateTo && ` – ${new Date(t.dateTo).toLocaleDateString("en-GB")}`}
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin size={13} className="text-[#FF7400]" />{t.location}
                          </div>
                          <div className="flex items-center gap-2">
                            <IndianRupee size={13} className="text-[#FF7400]" />
                            {t.entryFee === 0 ? "Free Entry" : `₹${t.entryFee}`}
                          </div>
                        </div>

                        <ApprovalChain />

                        {t.rejectionRemark && (
                          <div className="mt-3 p-3 bg-red-50 rounded-xl border border-red-100 text-xs text-red-700">
                            <span className="font-bold">Rejected: </span>{t.rejectionRemark}
                          </div>
                        )}

                        {/* Tournament Chat Section */}
                        <div className="mt-4 bg-slate-50 border-t border-slate-100 p-4 rounded-xl space-y-3">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <MessageSquare size={13} className="text-[#FF7400]" />
                            Communication History
                          </h4>

                          {/* Messages list */}
                          {tMessages[t.id]?.length > 0 ? (
                            <div className="space-y-3 max-h-32 overflow-y-auto pr-1">
                              {tMessages[t.id].map((msg) => (
                                <div key={msg.id} className="flex items-start gap-2">
                                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[9px] font-black ${
                                    msg.senderRole === "CLUB" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-[#FF7400]"
                                  }`}>
                                    {msg.senderName.charAt(0)}
                                  </div>
                                  <div className="flex-grow">
                                    <p className="text-[11px] text-slate-700 font-semibold leading-relaxed">
                                      <span className="font-bold text-slate-900 mr-1">{msg.senderName}:</span>
                                      {msg.message}
                                    </p>
                                    <p className="text-[8px] text-slate-400">
                                      {new Date(msg.createdAt).toLocaleDateString("en-GB")} {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[10px] font-semibold text-slate-400">No communication history yet.</p>
                          )}
                        </div>

                        {/* Manage button — conditionally visible */}
                        {!t.hasPendingPlayers && (
                          <Link
                            href={`/dashboard/admin/tournaments/${t.id}`}
                            className="mt-3 flex items-center justify-center gap-2 w-full py-2.5 bg-gradient-to-r from-[#FF7400] to-orange-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-orange-500/20 hover:scale-105 active:scale-95 transition-all"
                          >
                            <Trophy size={14} /> Manage Tournament
                            <ChevronRight size={14} />
                          </Link>
                        )}
                        {t.hasPendingPlayers && (
                          <button
                            disabled
                            className="mt-3 flex items-center justify-center gap-2 w-full py-2.5 bg-slate-100 text-slate-400 font-bold rounded-xl text-sm transition-all cursor-not-allowed"
                          >
                            <AlertCircle size={14} /> Resolve Pending Players
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ════════════ CREATE TOURNAMENT MODAL ════════════ */}
      <AnimatePresence>
        {isCreateOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-2xl bg-white rounded-[2.5rem] p-10 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-3xl font-bold text-slate-800">Create Tournament</h2>
                  <p className="text-slate-500 text-sm mt-1">
                    As {ROLE_LABEL[userRole]} — approvals will be routed automatically.
                  </p>
                </div>
                <button
                  onClick={() => setIsCreateOpen(false)}
                  className="p-2 bg-slate-100 text-slate-400 hover:text-red-500 rounded-full transition-all"
                >
                  <XCircle size={26} />
                </button>
              </div>

              {/* Approval chain preview banner */}
              <ApprovalChainPreview />

              <form onSubmit={handleCreate} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Tournament Title *</label>
                    <input
                      required type="text" value={formData.title}
                      onChange={e => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g. District Championship 2026"
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Level</label>
                    <select
                      value={formData.level}
                      onChange={e => setFormData({ ...formData, level: e.target.value })}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 font-semibold"
                    >
                      <option value="CLUB">Club</option>
                      <option value="DISTRICT">District</option>
                      <option value="ZONE">Zonal</option>
                      <option value="STATE">State</option>
                      <option value="NATIONAL">National</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Gender</label>
                    <select
                      value={formData.gender}
                      onChange={e => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 font-semibold"
                    >
                      <option value="BOTH">Both</option>
                      <option value="MALE">Male Only</option>
                      <option value="FEMALE">Female Only</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Start Date *</label>
                    <input
                      required type="date" min={new Date().toISOString().split('T')[0]} value={formData.dateFrom}
                      onChange={e => setFormData({ ...formData, dateFrom: e.target.value })}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">End Date (optional)</label>
                    <input
                      type="date" min={formData.dateFrom || new Date().toISOString().split('T')[0]} value={formData.dateTo}
                      onChange={e => setFormData({ ...formData, dateTo: e.target.value })}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Min Age</label>
                    <input
                      required type="text" maxLength={2} value={formData.ageFrom}
                      onChange={e => setFormData({ ...formData, ageFrom: e.target.value.replace(/\D/g, '') })}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Max Age</label>
                    <input
                      required type="text" maxLength={2} value={formData.ageTo}
                      onChange={e => setFormData({ ...formData, ageTo: e.target.value.replace(/\D/g, '') })}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Venue / Location *</label>
                    <input
                      required type="text" value={formData.location}
                      onChange={e => setFormData({ ...formData, location: e.target.value.replace(/[^a-zA-Z0-9\s,.'-]/g, '') })}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Belt Eligibility</label>
                    <input
                      type="text" value={formData.beltEligibility}
                      onChange={e => setFormData({ ...formData, beltEligibility: e.target.value })}
                      placeholder="e.g. Yellow belt and above"
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Entry Fee (₹)</label>
                    <input
                      required type="text" maxLength={5} value={formData.entryFee}
                      onChange={e => setFormData({ ...formData, entryFee: e.target.value.replace(/\D/g, '') })}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Total Slots</label>
                    <input
                      required type="text" maxLength={4} value={formData.totalSlots}
                      onChange={e => setFormData({ ...formData, totalSlots: e.target.value.replace(/\D/g, '') })}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Number of Mats</label>
                    <input
                      required type="text" maxLength={2} value={formData.numberOfMats}
                      onChange={e => setFormData({ ...formData, numberOfMats: e.target.value.replace(/\D/g, '') })}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50"
                    />
                  </div>

                  <div className="md:col-span-2 flex items-center gap-3">
                    <input
                      type="checkbox" id="bpl_create" checked={formData.allowBPL}
                      onChange={e => setFormData({ ...formData, allowBPL: e.target.checked })}
                      className="w-5 h-5 accent-[#FF7400]"
                    />
                    <label htmlFor="bpl_create" className="text-sm font-bold text-slate-700">
                      Allow BPL Students to Register for Free
                    </label>
                  </div>

                  <div className="md:col-span-2 mt-2">
                    <FileUpload 
                      label="Banner Image (Optional)" 
                      value={formData.bannerImage} 
                      onChange={(url) => setFormData({ ...formData, bannerImage: url })} 
                      accept="image/*" 
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Description *</label>
                    <textarea
                      required value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                      className="w-full h-24 px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 resize-none"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-2">
                  <button
                    type="button" onClick={() => setIsCreateOpen(false)}
                    className="flex-1 py-5 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all"
                  >
                    Discard
                  </button>
                  <button
                    type="submit" disabled={submitLoading}
                    className="flex-1 py-5 bg-[#FF7400] text-white font-bold rounded-2xl shadow-xl shadow-[#FF7400]/20 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2 transition-all"
                  >
                    {submitLoading
                      ? <Loader2 size={20} className="animate-spin" />
                      : <><Calendar size={18} /> Submit Tournament</>}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ════════════ REJECT MODAL ════════════ */}
      <AnimatePresence>
        {rejectModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl"
            >
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Reject Tournament</h2>
              <p className="text-slate-500 text-sm mb-5">
                Provide a reason — it will be visible to the creator.
              </p>
              <textarea
                value={rejectRemark}
                onChange={e => setRejectRemark(e.target.value)}
                placeholder="Enter rejection reason..."
                className="w-full h-32 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/50 resize-none mb-5"
              />
              <div className="flex gap-4">
                <button
                  onClick={() => { setRejectModal(null); setRejectRemark(""); }}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleAction(rejectModal.id, "REJECTED", rejectRemark)}
                  disabled={!rejectRemark.trim() || !!actionLoading}
                  className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
                >
                  {actionLoading
                    ? <Loader2 size={16} className="animate-spin" />
                    : "Confirm Reject"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
