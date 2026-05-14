"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Filter,
  User,
  Shield,
  GraduationCap,
  Building2,
  RefreshCw,
  Loader2,
  Key,
  IdCard,
  Edit,
  Save,
  X,
  CheckCircle2,
  XCircle,
  Mail,
  Calendar,
  MapPin,
  Eye,
  EyeOff,
} from "lucide-react";

type UserRole = "STUDENT" | "COACH" | "MEMBER" | "CLUB";

interface TNJAUser {
  id: string;
  fullName: string;
  email: string;
  mobileNumber?: string;
  districtName?: string;
  tempId: string;
  permanentId: string | null;
  status: string;
  role: UserRole;
  createdAt: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export default function UserManagementPage() {
  const [users, setUsers] = useState<TNJAUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "ALL">("ALL");
  const [selectedUser, setSelectedUser] = useState<TNJAUser | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [newPermanentId, setNewPermanentId] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/users/all`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch users");
      setUsers(data);
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleEdit = (user: TNJAUser) => {
    setSelectedUser(user);
    setNewPermanentId(user.permanentId || "");
    setNewPassword("");
    setEditModalOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/users/credentials`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: selectedUser.id,
          role: selectedUser.role,
          permanentId: newPermanentId,
          password: newPassword || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");
      showToast("User credentials updated successfully", "success");
      setEditModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setActionLoading(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.tempId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.permanentId && u.permanentId.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesRole = roleFilter === "ALL" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case "CLUB": return <Building2 size={16} />;
      case "STUDENT": return <GraduationCap size={16} />;
      case "COACH": return <Shield size={16} />;
      case "MEMBER": return <User size={16} />;
    }
  };

  const roleColors: Record<UserRole, string> = {
    CLUB: "bg-purple-100 text-purple-700",
    STUDENT: "bg-blue-100 text-blue-700",
    COACH: "bg-emerald-100 text-emerald-700",
    MEMBER: "bg-amber-100 text-amber-700",
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
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

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800">User Management</h1>
          <p className="text-slate-500 text-sm mt-1">Manage passwords and IDs for all registered users.</p>
        </div>
        <button
          onClick={fetchUsers}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 font-semibold hover:bg-slate-50 transition-all text-sm shadow-sm"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-grow w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Search by name, email, or IDs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400] transition-all"
          />
        </div>
        <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm w-fit">
          {["ALL", "CLUB", "STUDENT", "COACH", "MEMBER"].map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                roleFilter === r ? "bg-[#FF7400] text-white shadow-md" : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-20 text-center flex flex-col items-center gap-4">
            <Loader2 size={40} className="animate-spin text-[#FF7400]" />
            <p className="text-slate-400">Fetching users...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-8 py-5 text-sm font-bold text-slate-400 uppercase">User Details</th>
                  <th className="px-8 py-5 text-sm font-bold text-slate-400 uppercase">Role & Status</th>
                  <th className="px-8 py-5 text-sm font-bold text-slate-400 uppercase">Login IDs</th>
                  <th className="px-8 py-5 text-sm font-bold text-slate-400 uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm bg-gradient-to-br ${
                          u.role === "CLUB" ? "from-purple-500 to-indigo-600" :
                          u.role === "STUDENT" ? "from-[#FF7400] to-orange-600" :
                          u.role === "COACH" ? "from-emerald-500 to-teal-600" :
                          "from-amber-500 to-orange-600"
                        }`}>
                          {u.fullName.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800">{u.fullName}</h4>
                          <div className="flex flex-col gap-1 mt-1">
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                              <Mail size={10} /> {u.email}
                            </div>
                            {u.mobileNumber && (
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                                <span className="font-bold text-slate-300">📞</span> {u.mobileNumber}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${roleColors[u.role]}`}>
                            {getRoleIcon(u.role)}
                            {u.role}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black tracking-widest ${
                            u.status === "APPROVED" ? "bg-emerald-100 text-emerald-600" : 
                            u.status === "REJECTED" ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"
                          }`}>
                            {u.status}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1">
                          {u.districtName && (
                            <div className="flex items-center gap-1 text-[10px] font-bold text-[#FF7400]">
                              <MapPin size={10} /> {u.districtName}
                            </div>
                          )}
                          <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                            <Calendar size={10} /> {new Date(u.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-slate-400 font-medium w-12 text-[10px] uppercase">Temp</span>
                          <code className="bg-slate-100 px-2 py-0.5 rounded text-[#FF7400] font-mono">{u.tempId}</code>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-slate-400 font-medium w-12 text-[10px] uppercase">Perm</span>
                          <code className="bg-blue-50 px-2 py-0.5 rounded text-blue-800 font-mono">{u.permanentId || "NOT SET"}</code>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button
                        onClick={() => handleEdit(u)}
                        className="p-2 text-[#FF7400] hover:bg-orange-50 rounded-xl transition-all"
                        title="Manage Credentials"
                      >
                        <Edit size={20} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {editModalOpen && selectedUser && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-lg bg-white rounded-3xl p-8 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-orange-100 text-[#FF7400] rounded-2xl">
                    <Key size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800">Manage Credentials</h3>
                    <p className="text-slate-500 text-sm">{selectedUser.fullName}</p>
                  </div>
                </div>
                <button onClick={() => setEditModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2 ml-1">
                    Permanent ID
                  </label>
                  <div className="relative">
                    <IdCard className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      value={newPermanentId}
                      onChange={(e) => setNewPermanentId(e.target.value)}
                      placeholder="Enter Permanent ID"
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400] transition-all font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2 ml-1">
                    Reset Password
                  </label>
                  <div className="relative">
                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password (leave blank to keep current)"
                      className="w-full pl-12 pr-12 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400] transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2 ml-1">
                    Warning: Changing password will lock the user out until they use the new one.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 mt-10">
                <button
                  onClick={() => setEditModalOpen(false)}
                  className="flex-grow py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdate}
                  disabled={actionLoading}
                  className="flex-grow py-4 bg-[#FF7400] text-white font-bold rounded-2xl shadow-lg shadow-orange-500/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {actionLoading ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                  Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
