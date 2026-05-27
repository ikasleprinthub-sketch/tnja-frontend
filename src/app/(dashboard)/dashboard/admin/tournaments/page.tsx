"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
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
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

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
  club?: { name: string; district?: { name: string } };
}

// ─── Role configuration ───────────────────────────────────────────────────────
/**
 * Maps each admin role to the approval field they manage.
 * null = this role creates but doesn't sit in an approval queue.
 */
const APPROVAL_LEVEL_MAP: Record<string, string | null> = {
  DISTRICT_PRESIDENT: "district",
  DISTRICT_SECRETARY: "district",
  ZONE_PRESIDENT:     null,   // creator only, no approval seat
  ZONE_SECRETARY:     null,
  STATE_PRESIDENT:    "state",
  STATE_SECRETARY:    "state",
  SUPER_ADMIN:        "superAdmin",
  CEO:                "ceo",
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
  ZONE_PRESIDENT:     "Zone President",
  ZONE_SECRETARY:     "Zone Secretary",
  STATE_PRESIDENT:    "State President",
  STATE_SECRETARY:    "State Secretary",
  SUPER_ADMIN:        "Super Admin",
  CEO:                "CEO",
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
  const district     = safeStatus(t.districtApproval);
  const state        = safeStatus(t.stateApproval);
  const superAdmin   = safeStatus(t.superAdminApproval);
  const ceo          = safeStatus(t.ceoApproval);

  // "Final approval already done" = either superAdmin OR ceo has approved
  const finalApprovalDone = superAdmin === "APPROVED" || ceo === "APPROVED";

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
      // Show every tournament where SuperAdmin hasn't acted yet
      return superAdmin === "PENDING";

    case "CEO":
      // Show every tournament where CEO hasn't acted yet
      return ceo === "PENDING";

    default:
      console.warn("[Tournaments] unrecognised role in inApprovalQueue:", role);
      return false;
  }
}

// ─── Approval chain badge colours ─────────────────────────────────────────────
const BADGE_CFG: Record<ApprovalStatus, { label: string; cls: string }> = {
  PENDING:      { label: "Pending",  cls: "bg-amber-100 text-amber-700 border-amber-200" },
  APPROVED:     { label: "Approved", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  REJECTED:     { label: "Rejected", cls: "bg-red-100 text-red-700 border-red-200" },
  NOT_REQUIRED: { label: "N/A",      cls: "bg-slate-100 text-slate-400 border-slate-200" },
};

const ApprovalChain = ({ t }: { t: Tournament }) => {
  // Coerce nulls so badge lookups never crash
  const superAdminStatus = safeStatus(t.superAdminApproval);
  const ceoStatus        = safeStatus(t.ceoApproval);

  // Final approval is done if EITHER superAdmin OR ceo has approved
  const finalApproved = superAdminStatus === "APPROVED" || ceoStatus === "APPROVED";
  const finalRejected = superAdminStatus === "REJECTED" || ceoStatus === "REJECTED";
  const finalStatus: ApprovalStatus = finalApproved
    ? "APPROVED"
    : finalRejected
    ? "REJECTED"
    : "PENDING";

  // Who gave the final approval/rejection
  const finalActor = superAdminStatus === "APPROVED"
    ? "Super Admin"
    : ceoStatus === "APPROVED"
    ? "CEO"
    : superAdminStatus === "REJECTED"
    ? "Super Admin"
    : ceoStatus === "REJECTED"
    ? "CEO"
    : null;

  return (
    <div className="mt-4 pt-4 border-t border-slate-100">
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Approval Chain</p>
      <div className="flex flex-wrap items-center gap-1.5">
        {/* Step 1 — District */}
        {(
          [
            { key: "districtApproval" as keyof Tournament, label: "District" },
            { key: "stateApproval"    as keyof Tournament, label: "State"    },
          ]
        ).map(({ key, label }) => {
          const status = safeStatus(t[key] as ApprovalStatus | null | undefined);
          const cfg = BADGE_CFG[status] ?? BADGE_CFG.PENDING;
          return (
            <React.Fragment key={String(key)}>
              <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-bold ${cfg.cls}`}>
                <span className="opacity-60">{label}:</span> {cfg.label}
              </span>
              <span className="text-slate-300 text-[9px]">→</span>
            </React.Fragment>
          );
        })}

        {/* Final step — SuperAdmin OR CEO (parallel) */}
        <span
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-bold ${
            BADGE_CFG[finalStatus].cls
          }`}
        >
          <span className="opacity-60">
            {finalActor ? finalActor : "SuperAdmin / CEO"}:
          </span>
          {BADGE_CFG[finalStatus].label}
        </span>
      </div>
    </div>
  );
};

// ─── Empty form ───────────────────────────────────────────────────────────────
const emptyForm = {
  title: "", dateFrom: "", dateTo: "", location: "", description: "",
  entryFee: "", totalSlots: "", ageFrom: "0", ageTo: "100",
  gender: "BOTH", allowBPL: false, beltEligibility: "", level: "DISTRICT",
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function AdminTournamentsPage() {
  const [userRole, setUserRole] = useState<string>("");

  // "approval" = show pending approvals for this role
  // "mine"     = show tournaments created by this role
  const [activeTab, setActiveTab] = useState<"approval" | "mine">("approval");

  const [allTournaments,  setAllTournaments]  = useState<Tournament[]>([]);
  const [myTournaments,   setMyTournaments]   = useState<Tournament[]>([]);
  const [loading,         setLoading]         = useState(false);
  const [actionLoading,   setActionLoading]   = useState<string | null>(null);

  const [searchQuery,   setSearchQuery]   = useState("");
  const [filter,        setFilter]        = useState("ALL");
  const [isFilterOpen,  setIsFilterOpen]  = useState(false);

  // Create modal
  const [isCreateOpen,   setIsCreateOpen]   = useState(false);
  const [formData,       setFormData]       = useState({ ...emptyForm });
  const [submitLoading,  setSubmitLoading]  = useState(false);

  // Reject modal
  const [rejectModal,  setRejectModal]  = useState<{ id: string } | null>(null);
  const [rejectRemark, setRejectRemark] = useState("");

  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Initialise role ──────────────────────────────────────────────────────────
  useEffect(() => {
    const raw  = localStorage.getItem("userRole") || "";
    const role = normaliseRole(raw);   // e.g. "superAdmin" → "SUPER_ADMIN"
    console.log("[Tournaments] resolved role:", role, "(raw from localStorage:", raw, ")");
    setUserRole(role);
    // Zone officials don't have an approval queue → default to "mine" tab
    const isCreatorOnly = role === "ZONE_PRESIDENT" || role === "ZONE_SECRETARY";
    setActiveTab(isCreatorOnly ? "mine" : "approval");
  }, []);

  // ── Fetch all tournaments (for approval queue) ────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/tournaments/admin`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        console.log("[Tournaments] /admin returned", data.length, "tournaments:", data);
        setAllTournaments(data);
      } else {
        console.error("[Tournaments] /admin responded with status", res.status);
      }
    } catch (err) {
      console.error("[Tournaments] fetchAll error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Fetch my created tournaments ─────────────────────────────────────────────
  const fetchMine = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/tournaments/official/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setMyTournaments(await res.json());
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    if (!userRole) return;
    fetchAll();
    if (CAN_CREATE_ROLES.includes(userRole)) fetchMine();
  }, [userRole, fetchAll, fetchMine]);

  // ── Derived values ───────────────────────────────────────────────────────────
  const approvalLevel = APPROVAL_LEVEL_MAP[userRole] ?? null;
  const canCreate     = CAN_CREATE_ROLES.includes(userRole);
  const hasApprovalRole = approvalLevel !== null;

  const approvalQueue = allTournaments.filter(t => inApprovalQueue(t, userRole));

  const displayedApproval = approvalQueue.filter(
    t => !searchQuery || t.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const displayedMine = myTournaments
    .filter(t => filter === "ALL" || t.status === filter)
    .filter(t => !searchQuery || t.title.toLowerCase().includes(searchQuery.toLowerCase()));

  // ── Approve / Reject action ──────────────────────────────────────────────────
  const handleAction = async (id: string, status: "APPROVED" | "REJECTED", remark?: string) => {
    if (status === "REJECTED" && !remark) {
      setRejectModal({ id });
      return;
    }
    setActionLoading(id);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/tournaments/${id}/approve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        // approvalLevel tells the backend WHICH field to update
        body: JSON.stringify({ status, remark, approvalLevel }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update");
      showToast(`Tournament ${status.toLowerCase()} successfully`, "success");
      setRejectModal(null);
      setRejectRemark("");
      fetchAll();
    } catch (err: any) {
      showToast(err.message || "Something went wrong", "error");
    } finally {
      setActionLoading(null);
    }
  };

  // ── Create tournament ────────────────────────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/tournaments/official/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...formData,
          entryFee:   Number(formData.entryFee),
          totalSlots: Number(formData.totalSlots),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create");
      showToast("Tournament created! Awaiting approvals.", "success");
      setIsCreateOpen(false);
      setFormData({ ...emptyForm });
      fetchMine();
    } catch (err: any) {
      showToast(err.message || "Something went wrong", "error");
    } finally {
      setSubmitLoading(false);
    }
  };

  // ── Approval chain preview inside Create modal ────────────────────────────────
  const ApprovalChainPreview = () => {
    const isStateRole =
      userRole === "STATE_PRESIDENT" || userRole === "STATE_SECRETARY";
    const isDistrictRole =
      userRole === "DISTRICT_PRESIDENT" || userRole === "DISTRICT_SECRETARY";

    // Steps before the final parallel step
    const sequentialSteps: { label: string; skipped: boolean }[] = [];

    // District step
    if (!isStateRole) {
      sequentialSteps.push({
        label: "District",
        skipped: isDistrictRole || userRole === "ZONE_PRESIDENT" || userRole === "ZONE_SECRETARY",
      });
    }

    // State step
    sequentialSteps.push({ label: "State", skipped: isStateRole });

    return (
      <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-2xl">
        <p className="text-xs font-bold text-blue-700 mb-2">
          Approval chain for your tournament:
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {sequentialSteps.map((s) => (
            <React.Fragment key={s.label}>
              <span
                className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                  s.skipped
                    ? "bg-slate-100 text-slate-400 border-slate-200"
                    : "bg-amber-100 text-amber-700 border-amber-200"
                }`}
              >
                {s.skipped ? `${s.label} ⏭ Auto-skip` : `${s.label} ✓ Required`}
              </span>
              <span className="text-slate-300 text-xs">→</span>
            </React.Fragment>
          ))}

          {/* Final parallel step — SuperAdmin OR CEO */}
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold border bg-amber-100 text-amber-700 border-amber-200">
            Super Admin <span className="opacity-60 font-normal">or</span> CEO ✓ One required
          </span>
        </div>
        <p className="text-[10px] text-blue-500 mt-2 font-semibold">
          ℹ️ Final approval: Super Admin and CEO are parallel — only one needs to approve.
        </p>
      </div>
    );
  };

  // ── Stat cards ───────────────────────────────────────────────────────────────
  const totalMine    = myTournaments.length;
  const approvedMine = myTournaments.filter(t => t.status === "APPROVED").length;
  const pendingQueue = approvalQueue.length;

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
            className={`fixed top-6 right-6 z-[200] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl text-white font-bold text-sm ${
              toast.type === "success" ? "bg-emerald-600" : "bg-red-600"
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
              <p className="text-[11px] font-semibold text-slate-500 tracking-[0.15em]">TOTAL IN SYSTEM</p>
              <div className="flex items-center justify-between">
                <h3 className="text-4xl font-black text-slate-900">{allTournaments.length}</h3>
                <div className="w-[46px] h-[46px] bg-orange-50 rounded-full flex items-center justify-center shadow-inner">
                  <Trophy size={22} className="text-[#FF7400]" />
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-[14px] border border-b-[4px] border-emerald-500 shadow-md flex flex-col justify-between h-[120px]">
              <p className="text-[11px] font-semibold text-slate-500 tracking-[0.15em]">APPROVED</p>
              <div className="flex items-center justify-between">
                <h3 className="text-4xl font-black text-slate-900">{allTournaments.filter(t => t.status === "APPROVED").length}</h3>
                <div className="w-[46px] h-[46px] bg-emerald-50 rounded-full flex items-center justify-center shadow-inner">
                  <CheckCircle2 size={22} className="text-emerald-500" />
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Tabs (only shown when role has BOTH approval + create) ── */}
      {canCreate && hasApprovalRole && (
        <div className="flex gap-0 border-b border-slate-200">
          {[
            {
              key: "approval" as const,
              label: `Approval Queue${pendingQueue > 0 ? ` (${pendingQueue})` : ""}`,
            },
            { key: "mine" as const, label: "My Tournaments" },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-3 text-sm font-bold border-b-2 -mb-[2px] transition-all ${
                activeTab === tab.key
                  ? "border-[#FF7400] text-[#FF7400]"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

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
        {(activeTab === "mine" || (!hasApprovalRole && canCreate)) && (
          <div className="relative">
            <div
              className="p-[1.5px] rounded-[10px] inline-flex shadow-sm"
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
                    className={`w-full text-left px-4 py-3 text-sm font-bold transition-colors ${
                      filter === f ? "bg-orange-50 text-[#FF7400]" : "text-slate-600 hover:bg-slate-50"
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
          {(activeTab === "approval" || (!canCreate && hasApprovalRole)) && (
            <>
              {displayedApproval.length === 0 ? (
                <div className="text-center py-20 bg-white border border-slate-200 rounded-3xl">
                  <CheckCircle2 size={40} className="mx-auto mb-3 text-emerald-300" />
                  <h3 className="text-lg font-bold text-slate-500">No Pending Approvals</h3>
                  <p className="text-slate-400 text-sm mt-1">You're all caught up!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {displayedApproval.map(t => (
                    <motion.div
                      key={t.id}
                      whileHover={{ y: -4 }}
                      className="bg-white rounded-[20px] shadow-lg overflow-hidden flex flex-col"
                    >
                      {/* Card banner */}
                      <div className="h-32 bg-gradient-to-br from-blue-900 via-indigo-700 to-[#FF7400] relative overflow-hidden">
                        <div className="absolute inset-0 bg-black/20" />
                        <div className="absolute top-3 left-3 bg-white/20 backdrop-blur text-white text-[10px] font-bold px-3 py-1 rounded-full border border-white/30">
                          {t.level}
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
                            <Users size={13} className="text-[#FF7400]" />
                            Ages: {t.ageFrom}–{t.ageTo} · {t.gender}
                          </div>
                          <div className="flex items-center gap-2">
                            <IndianRupee size={13} className="text-[#FF7400]" />
                            {t.entryFee === 0 ? "Free Entry" : `₹${t.entryFee}`}
                          </div>
                        </div>

                        <ApprovalChain t={t} />

                        {/* Action buttons */}
                        <div className="flex gap-2 mt-4">
                          <button
                            onClick={() => handleAction(t.id, "APPROVED")}
                            disabled={actionLoading === t.id}
                            className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-sm flex justify-center items-center disabled:opacity-50 transition-all"
                          >
                            {actionLoading === t.id
                              ? <Loader2 size={15} className="animate-spin" />
                              : "Approve"}
                          </button>
                          <button
                            onClick={() => handleAction(t.id, "REJECTED")}
                            disabled={!!actionLoading}
                            className="flex-1 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl text-sm disabled:opacity-50 transition-all"
                          >
                            Reject
                          </button>
                        </div>

                        {/* Manage link — always visible */}
                        <Link
                          href={`/dashboard/admin/tournaments/${t.id}`}
                          className="mt-2 flex items-center justify-center gap-2 w-full py-2 bg-slate-900 text-white font-bold rounded-xl text-xs hover:bg-slate-800 transition-all"
                        >
                          <Trophy size={12} /> Manage / Generate Draw
                          <ChevronRight size={12} />
                        </Link>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ════════════ MY TOURNAMENTS ════════════ */}
          {(activeTab === "mine" && canCreate) && (
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
                        <Trophy size={36} className="text-[#FF7400]/25" />
                        <span className="absolute top-3 left-3 bg-white/90 text-slate-600 text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm">
                          {t.level}
                        </span>
                        <span
                          className={`absolute top-3 right-3 text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                            t.status === "APPROVED"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : t.status === "REJECTED"
                              ? "bg-red-50 text-red-600 border-red-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {t.status}
                        </span>
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

                        <ApprovalChain t={t} />

                        {t.rejectionRemark && (
                          <div className="mt-3 p-3 bg-red-50 rounded-xl border border-red-100 text-xs text-red-700">
                            <span className="font-bold">Rejected: </span>{t.rejectionRemark}
                          </div>
                        )}

                        {/* Manage button — always visible */}
                        <Link
                          href={`/dashboard/admin/tournaments/${t.id}`}
                          className="mt-3 flex items-center justify-center gap-2 w-full py-2.5 bg-gradient-to-r from-[#FF7400] to-orange-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-orange-500/20 hover:scale-105 active:scale-95 transition-all"
                        >
                          <Trophy size={14} /> Manage Tournament
                          <ChevronRight size={14} />
                        </Link>
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
                      <option value="DISTRICT">District</option>
                      <option value="ZONAL">Zonal</option>
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
                      required type="date" value={formData.dateFrom}
                      onChange={e => setFormData({ ...formData, dateFrom: e.target.value })}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">End Date (optional)</label>
                    <input
                      type="date" value={formData.dateTo}
                      onChange={e => setFormData({ ...formData, dateTo: e.target.value })}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Min Age</label>
                    <input
                      required type="number" min="0" value={formData.ageFrom}
                      onChange={e => setFormData({ ...formData, ageFrom: e.target.value })}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Max Age</label>
                    <input
                      required type="number" min="0" value={formData.ageTo}
                      onChange={e => setFormData({ ...formData, ageTo: e.target.value })}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Venue / Location *</label>
                    <input
                      required type="text" value={formData.location}
                      onChange={e => setFormData({ ...formData, location: e.target.value })}
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
                      required type="number" min="0" value={formData.entryFee}
                      onChange={e => setFormData({ ...formData, entryFee: e.target.value })}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Total Slots</label>
                    <input
                      required type="number" min="2" value={formData.totalSlots}
                      onChange={e => setFormData({ ...formData, totalSlots: e.target.value })}
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
