"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  ChevronLeft,
  CheckCircle2,
  Clock,
  XCircle,
  User,
  Calendar,
  Hash,
  Loader2,
  ClipboardCheck,
} from "lucide-react";

type Status = "PENDING" | "APPROVED" | "REJECTED" | "REPLAY";

interface TrackResult {
  fullName: string;
  tempId: string;
  permanentId?: string;
  role?: string;
  status: Status;
  createdAt: string;
  district?: { name: string };
  city?: string;
}

const statusConfig: Record<
  Status,
  { label: string; color: string; bg: string; border: string; icon: React.ReactNode; desc: string }
> = {
  PENDING: {
    label: "Pending",
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
    icon: <Clock size={22} className="text-amber-500" />,
    desc: "Your application has been received and is currently under review by the admin.",
  },
  APPROVED: {
    label: "Approved",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    icon: <CheckCircle2 size={22} className="text-emerald-500" />,
    desc: "Congratulations! Your application has been approved. You can now log in to your dashboard.",
  },
  REJECTED: {
    label: "Rejected",
    color: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-200",
    icon: <XCircle size={22} className="text-red-500" />,
    desc: "Your application was not approved. Please contact the association for more details.",
  },
  REPLAY: {
    label: "Changes Requested",
    color: "text-purple-600",
    bg: "bg-purple-50",
    border: "border-purple-200",
    icon: <Clock size={22} className="text-purple-500" />,
    desc: "The admin has requested changes to your application. Please login to review the remarks and resubmit.",
  },
};

const steps = [
  { key: "submitted", label: "Application Submitted" },
  { key: "review", label: "Under Review" },
  { key: "decision", label: "Decision" },
];

function getStepState(status: Status, stepKey: string) {
  if (stepKey === "submitted") return "done";
  if (stepKey === "review") return (status === "PENDING" || status === "REPLAY") ? "active" : "done";
  if (stepKey === "decision") {
    if (status === "APPROVED") return "approved";
    if (status === "REJECTED") return "rejected";
    return "pending";
  }
  return "pending";
}

export default function TrackPage() {
  const [tempId, setTempId] = useState("");
  const [result, setResult] = useState<TrackResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempId.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch(
        `${API_BASE}/auth/track-status/${encodeURIComponent(tempId.trim())}`
      );
      
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        if (!res.ok) {
          throw new Error("Tracking endpoint is currently unavailable.");
        }
        throw new Error("Invalid response from server.");
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || "Record not found.");
      setResult(data.user || data);
    } catch (err: any) {
      if (err.name === 'TypeError') {
        setError("Network error. Please check if the server is running.");
      } else {
        setError(err.message || "Could not find registration. Please check your Temporary ID.");
      }
    } finally {
      setLoading(false);
    }
  };

  const cfg = result ? statusConfig[result.status as Status] ?? statusConfig.PENDING : null;

  return (
    <main className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex flex-col items-center justify-center px-4 py-12">
      {/* Back */}
      <div className="w-full max-w-lg mb-6">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-[#FF7400] transition-colors"
        >
          <ChevronLeft size={16} />
          Back to Login
        </Link>
      </div>

      {/* Header */}
      <div className="text-center mb-8">
        <div
          style={{ backgroundColor: "#FF7400" }}
          className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-200"
        >
          <ClipboardCheck size={28} color="#fff" />
        </div>
        <h1 className="text-2xl font-black text-slate-800">Track Registration</h1>
        <p className="text-sm text-slate-500 mt-1 font-medium">
          Enter your Temporary ID to check your application status
        </p>
      </div>

      {/* Search card */}
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl shadow-orange-100/60 border border-orange-100 p-6">
        <form onSubmit={handleTrack} className="flex gap-3">
          <div className="flex-grow relative">
            <Hash
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={tempId}
              onChange={(e) => setTempId(e.target.value)}
              placeholder="e.g. MEM-TEMP-2026"
              className="w-full pl-9 pr-4 py-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:border-[#FF7400] focus:ring-2 focus:ring-[#FF7400]/10 transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !tempId.trim()}
            style={{ backgroundColor: "#FF7400" }}
            className="px-5 py-3 text-white rounded-xl font-bold text-sm flex items-center gap-2 disabled:opacity-60 hover:opacity-90 transition-all shadow-md shadow-orange-200"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Search size={16} />
            )}
            {loading ? "Checking…" : "Track"}
          </button>
        </form>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-medium"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Result */}
        <AnimatePresence>
          {result && cfg && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-6 space-y-4"
            >
              {/* Status banner */}
              <div
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl border ${cfg.bg} ${cfg.border}`}
              >
                {cfg.icon}
                <div>
                  <p className={`text-sm font-black ${cfg.color}`}>
                    {cfg.label}
                  </p>
                  <p className="text-xs text-slate-500 font-medium leading-snug mt-0.5">
                    {cfg.desc}
                  </p>
                </div>
              </div>

              {/* Info card */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div
                    style={{ backgroundColor: "#FF7400" }}
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white font-black text-base"
                  >
                    {(result.fullName || "?").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-extrabold text-slate-800">
                      {result.fullName || "—"}
                    </p>
                    <p className="text-xs text-slate-400 font-medium capitalize">
                      {result.role?.replace(/_/g, " ").toLowerCase() || "Member"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="flex items-start gap-2">
                    <Hash size={13} className="text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Temp ID
                      </p>
                      <p className="text-xs font-bold text-slate-700 font-mono">
                        {result.tempId}
                      </p>
                    </div>
                  </div>

                  {result.permanentId && (
                    <div className="flex items-start gap-2">
                      <Hash size={13} className="text-emerald-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Permanent ID
                        </p>
                        <p className="text-xs font-bold text-emerald-600 font-mono">
                          {result.permanentId}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-2">
                    <Calendar size={13} className="text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Applied On
                      </p>
                      <p className="text-xs font-bold text-slate-700">
                        {new Date(result.createdAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <User size={13} className="text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Location
                      </p>
                      <p className="text-xs font-bold text-slate-700">
                        {result.district?.name || result.city || "—"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress steps */}
              <div className="flex items-center justify-between px-2 pt-1">
                {steps.map((step, idx) => {
                  const state = getStepState(result.status as Status, step.key);
                  const isDone = state === "done" || state === "approved";
                  const isActive = state === "active";
                  const isApproved = state === "approved";
                  const isRejected = state === "rejected";

                  return (
                    <React.Fragment key={step.key}>
                      <div className="flex flex-col items-center gap-1.5">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                            isRejected
                              ? "bg-red-500 border-red-500"
                              : isApproved
                              ? "bg-emerald-500 border-emerald-500"
                              : isDone
                              ? "border-[#FF7400]"
                              : isActive
                              ? "border-amber-400 bg-amber-50"
                              : "border-slate-200 bg-white"
                          }`}
                          style={
                            isDone && !isApproved && !isRejected
                              ? { backgroundColor: "#FF7400" }
                              : {}
                          }
                        >
                          {isRejected ? (
                            <XCircle size={16} color="#fff" />
                          ) : isDone ? (
                            <CheckCircle2 size={16} color="#fff" />
                          ) : isActive ? (
                            <Clock size={14} className="text-amber-500" />
                          ) : (
                            <div className="w-2 h-2 rounded-full bg-slate-200" />
                          )}
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 text-center leading-tight max-w-[70px]">
                          {step.label}
                        </span>
                      </div>
                      {idx < steps.length - 1 && (
                        <div
                          className={`flex-grow h-0.5 mx-2 mb-4 rounded-full ${
                            getStepState(result.status as Status, steps[idx + 1].key) !== "pending"
                              ? "bg-[#FF7400]"
                              : "bg-slate-200"
                          }`}
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>

              {(result.status === "APPROVED" || result.status === "REPLAY") && (
                <Link
                  href="/login"
                  style={{ backgroundColor: "#FF7400" }}
                  className="block w-full py-3 text-center text-white font-bold text-sm rounded-xl shadow-md shadow-orange-200 hover:opacity-90 transition-all"
                >
                  Login to Dashboard →
                </Link>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
