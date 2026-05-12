"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { 
  AlertCircle, 
  RotateCcw, 
  FileText, 
  CheckCircle2,
  ArrowRight,
  Upload
} from "lucide-react";
import Link from "next/link";

export default function ResubmitPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Mock rejection data
  const rejectionData = {
    type: "Player Registration",
    remark: "The uploaded Aadhaar card photo is blurry. Please upload a clear scan of the front and back of your Aadhaar card.",
    date: "May 10, 2024",
    rejectedBy: "Chennai District President"
  };

  const handleResubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Mock API call
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
    }, 2000);
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white rounded-[2.5rem] p-10 shadow-xl border border-slate-200 text-center"
        >
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="text-3xl font-bold text-slate-800 mb-4">Resubmitted!</h2>
          <p className="text-slate-500 mb-8">
            Your application has been resubmitted successfully. It is now "Waiting for Approval" again.
          </p>
          <Link 
            href="/login"
            className="block w-full py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-all"
          >
            Back to Login
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-6">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Rejection Alert */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border-2 border-red-100 rounded-[2rem] p-8 flex items-start gap-6"
        >
          <div className="p-4 bg-red-100 text-red-600 rounded-2xl">
            <AlertCircle size={32} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-xl font-bold text-red-900">Application Rejected</h2>
              <span className="text-xs font-bold bg-red-200 text-red-800 px-2 py-0.5 rounded uppercase">Replay Required</span>
            </div>
            <p className="text-red-700 font-medium mb-4">{rejectionData.remark}</p>
            <div className="flex items-center gap-4 text-xs text-red-500 font-bold uppercase tracking-wider">
              <span>Rejected On: {rejectionData.date}</span>
              <span>By: {rejectionData.rejectedBy}</span>
            </div>
          </div>
        </motion.div>

        {/* Resubmission Form */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-200"
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
              <RotateCcw size={24} />
            </div>
            <h3 className="text-2xl font-bold text-slate-800">Edit & Resubmit</h3>
          </div>

          <form onSubmit={handleResubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Update Documents</label>
                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer group">
                  <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:text-blue-500 group-hover:bg-blue-100 transition-all">
                    <Upload size={28} />
                  </div>
                  <p className="text-slate-500 font-medium">Click to upload or drag and drop new documents</p>
                  <p className="text-xs text-slate-400 mt-2">Aadhaar Card, Passport size photo, etc. (Max 5MB)</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">Review Details</label>
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-3 mb-2">
                    <FileText size={18} className="text-blue-500" />
                    <span className="font-bold text-slate-700">Registration Info</span>
                  </div>
                  <p className="text-sm text-slate-500">You can update your personal information if any corrections are needed.</p>
                  <button type="button" className="mt-4 text-blue-600 text-sm font-bold flex items-center gap-1 hover:underline">
                    Edit Profile Details <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-6 border-t border-slate-100">
              <Link 
                href="/login"
                className="flex-grow py-5 bg-slate-100 text-slate-600 text-center font-bold rounded-2xl hover:bg-slate-200 transition-all"
              >
                Cancel
              </Link>
              <button 
                type="submit"
                disabled={isSubmitting}
                className="flex-grow py-5 bg-blue-600 text-white font-bold rounded-2xl shadow-xl shadow-blue-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {isSubmitting ? "Submitting..." : "Resubmit Application"}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
