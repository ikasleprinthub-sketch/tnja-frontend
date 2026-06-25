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
  Phone,
  Plus,
  ChevronDown,
} from "lucide-react";

type UserRole = "STUDENT" | "COACH" | "MEMBER" | "CLUB" | "DISTRICT_PRESIDENT" | "DISTRICT_SECRETARY" | "ZONE_PRESIDENT" | "ZONE_SECRETARY" | "STATE_PRESIDENT" | "STATE_SECRETARY" | "CEO";

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
  validUntil?: string;
  wins?: number;
  losses?: number;
  draws?: number;
  coachId?: string | null;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9000/api";

const PROMOTABLE_ROLES = [
  { id: "MEMBER", label: "General Member" },
  { id: "DISTRICT_PRESIDENT", label: "District President" },
  { id: "DISTRICT_SECRETARY", label: "District Secretary" },
  { id: "ZONE_PRESIDENT", label: "Zone President" },
  { id: "ZONE_SECRETARY", label: "Zone Secretary" },
  { id: "STATE_PRESIDENT", label: "State President" },
  { id: "STATE_SECRETARY", label: "State Secretary" },
  { id: "CEO", label: "CEO" },
];

const getPermanentIdLabel = (role: string) => {
  if (role === "STUDENT") return "Player ID";
  if (role === "COACH") return "Coach ID";
  if (role === "CLUB") return "Club ID";
  return "Member ID";
};

const getTemporaryIdLabel = (role: string) => {
  if (role === "STUDENT") return "Temp Player ID";
  if (role === "COACH") return "Temp Coach ID";
  if (role === "CLUB") return "Temp Club ID";
  return "Temp Member ID";
};

export default function UserManagementPage() {
  const [users, setUsers] = useState<TNJAUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "ALL">("ALL");
  const [genderFilter, setGenderFilter] = useState<string>("ALL");
  const [selectedUser, setSelectedUser] = useState<TNJAUser | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [promoteModalOpen, setPromoteModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [newPermanentId, setNewPermanentId] = useState("");
  const [promoteRole, setPromoteRole] = useState("");
  const [promoteDistrictId, setPromoteDistrictId] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // Match stats and coach state
  const [wins, setWins] = useState<number>(0);
  const [losses, setLosses] = useState<number>(0);
  const [draws, setDraws] = useState<number>(0);
  const [coachId, setCoachId] = useState<string>("");
  const [coachesList, setCoachesList] = useState<any[]>([]);
  const [districtsList, setDistrictsList] = useState<any[]>([]);

  // Create User State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createType, setCreateType] = useState<"STUDENT" | "CLUB" | "MEMBER">("STUDENT");
  const [createForm, setCreateForm] = useState({
    fullName: "", name: "", email: "", mobileNumber: "", districtId: "", talukId: "",
    gender: "MALE", dob: "", aadhaarNumber: "", bloodGroup: "", address: "", city: "", state: "",
    addressPincode: "", nationality: "Indian", annualIncome: "", schoolName: "", grade: "",
    areaOfInterest: "", areaOfStudy: "", preferLocation: "", clubId: "",
    address1: "", address2: "", pincode: "", president: "", secretary: "", coach: "",
    fatherName: "", addressLine1: "", addressLine2: ""
  });
  const [taluksList, setTaluksList] = useState<any[]>([]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams();
      if (debouncedSearchQuery) params.append("search", debouncedSearchQuery);
      if (roleFilter !== "ALL") params.append("role", roleFilter);
      if (genderFilter !== "ALL") params.append("gender", genderFilter);

      const res = await fetch(`${API_BASE}/users/all?${params.toString()}`, {
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
  }, [debouncedSearchQuery, roleFilter, genderFilter]);

  const fetchCoaches = async () => {
    try {
      const res = await fetch(`${API_BASE}/coaches`);
      const data = await res.json();
      if (res.ok) {
        setCoachesList(data);
      }
    } catch (err) {
      console.error("Failed to fetch coaches list:", err);
    }
  };

  const fetchDistricts = async () => {
    try {
      const res = await fetch(`${API_BASE}/districts`);
      const data = await res.json();
      if (res.ok) setDistrictsList(data);
    } catch (err) {
      console.error("Failed to fetch districts list:", err);
    }
  };

  useEffect(() => {
    fetchCoaches();
    fetchDistricts();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    if (createForm.districtId) {
      fetch(`${API_BASE}/districts/${createForm.districtId}/taluks`)
        .then(res => res.json())
        .then(data => setTaluksList(data))
        .catch(err => console.error(err));
    } else {
      setTaluksList([]);
    }
  }, [createForm.districtId]);

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleEdit = (user: TNJAUser) => {
    setSelectedUser(user);
    setNewPermanentId(user.permanentId || "");
    setNewPassword("");
    setWins(user.wins || 0);
    setLosses(user.losses || 0);
    setDraws(user.draws || 0);
    setCoachId(user.coachId || "");
    setEditModalOpen(true);
  };

  const handlePromoteClick = (user: TNJAUser) => {
    setSelectedUser(user);
    setPromoteRole(user.role);
    setPromoteDistrictId("");
    setPromoteModalOpen(true);
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
          wins: selectedUser.role === "STUDENT" ? wins : undefined,
          losses: selectedUser.role === "STUDENT" ? losses : undefined,
          draws: selectedUser.role === "STUDENT" ? draws : undefined,
          coachId: selectedUser.role === "STUDENT" ? (coachId || null) : undefined,
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

  const handlePromoteConfirm = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/member/promote`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          memberId: selectedUser.id,
          role: promoteRole,
          districtId: promoteDistrictId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Promotion failed");
      showToast(`Member promoted to ${promoteRole} successfully`, "success");
      setPromoteModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreate = async () => {
    setActionLoading(true);
    try {
      const token = localStorage.getItem("token");
      let endpoint = "";
      if (createType === "STUDENT") endpoint = "/admin/create-student";
      if (createType === "CLUB") endpoint = "/admin/create-club";
      if (createType === "MEMBER") endpoint = "/admin/create-member";

      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Creation failed");
      showToast(`${createType} created successfully`, "success");
      setCreateModalOpen(false);
      fetchUsers();
      setCreateForm({ 
        fullName: "", name: "", email: "", mobileNumber: "", districtId: "", talukId: "",
        gender: "MALE", dob: "", aadhaarNumber: "", bloodGroup: "", address: "", city: "", state: "",
        addressPincode: "", nationality: "Indian", annualIncome: "", schoolName: "", grade: "",
        areaOfInterest: "", areaOfStudy: "", preferLocation: "", clubId: "",
        address1: "", address2: "", pincode: "", president: "", secretary: "", coach: "",
        fatherName: "", addressLine1: "", addressLine2: ""
      });
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setActionLoading(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    if (!debouncedSearchQuery) return true;
    const q = debouncedSearchQuery.toLowerCase();
    return (
      u.fullName?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.mobileNumber?.includes(q) ||
      u.tempId?.toLowerCase().includes(q) ||
      u.permanentId?.toLowerCase().includes(q)
    );
  });

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case "CLUB": return <Building2 size={16} />;
      case "STUDENT": return <GraduationCap size={16} />;
      case "COACH": return <Shield size={16} />;
      default: return <User size={16} />;
    }
  };

  const getRoleLabel = (role: UserRole) => {
    const found = PROMOTABLE_ROLES.find(r => r.id === role);
    return found ? found.label : role;
  };

  const isMemberRole = (role: string) => {
    return ["MEMBER", "DISTRICT_PRESIDENT", "DISTRICT_SECRETARY", "ZONE_PRESIDENT", "ZONE_SECRETARY", "STATE_PRESIDENT", "STATE_SECRETARY", "CEO"].includes(role);
  };

  const roleColors: Record<string, string> = {
    CLUB: "bg-purple-100 text-purple-700",
    STUDENT: "bg-blue-100 text-blue-700",
    COACH: "bg-emerald-100 text-emerald-700",
    MEMBER: "bg-amber-100 text-amber-700",
    DISTRICT_PRESIDENT: "bg-orange-100 text-orange-700",
    DISTRICT_SECRETARY: "bg-orange-100 text-orange-700",
    ZONE_PRESIDENT: "bg-rose-100 text-rose-700",
    ZONE_SECRETARY: "bg-rose-100 text-rose-700",
    STATE_PRESIDENT: "bg-red-100 text-red-700",
    STATE_SECRETARY: "bg-red-100 text-red-700",
    CEO: "bg-slate-800 text-white",
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

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800">User Management</h1>
          <p className="text-slate-500 text-sm mt-1">Manage passwords, IDs and roles for all registered users.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-[#FF7400] text-white rounded-xl font-semibold hover:bg-orange-600 transition-all text-sm shadow-sm"
          >
            <Plus size={16} />
            Create New
          </button>
          <button
            onClick={fetchUsers}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 font-semibold hover:bg-slate-50 transition-all text-sm shadow-sm"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
        <div className="flex w-full lg:w-auto gap-4 shrink-0 items-center">
          <div className="relative w-full lg:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Search by name, email, or IDs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400] transition-all text-black"
            />
          </div>
          <div className="relative shrink-0">
            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
              className="appearance-none h-full w-full pl-5 pr-12 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400] hover:border-[#FF7400] hover:shadow-md transition-all text-slate-700 font-semibold shadow-sm cursor-pointer"
            >
              <option value="ALL">All Genders</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
          </div>
        </div>
        
        <div className="flex gap-4 overflow-x-auto pb-2 w-full lg:w-auto lg:justify-end scrollbar-hide">
          {["ALL", "CLUB", "STUDENT", "COACH", "MEMBER"].map((r) => {
            const label = r === "ALL" ? "All Users" : r === "CLUB" ? "Clubs" : r === "STUDENT" ? "Players" : r === "COACH" ? "Coaches" : "Members";
            return (
              <button
                key={r}
                onClick={() => setRoleFilter(r as any)}
                className={`min-w-[130px] px-8 py-3 rounded-2xl text-base transition-all whitespace-nowrap border ${
                  roleFilter === r
                    ? "bg-gradient-to-r from-amber-100 to-amber-400 text-slate-900 border-amber-400 shadow-[0_8px_20px_-6px_rgba(251,191,36,0.6)] font-black"
                    : "bg-white text-slate-700 border-orange-200 hover:border-[#FF7400] hover:bg-orange-50 font-bold shadow-sm"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-20 text-center flex flex-col items-center gap-4">
            <Loader2 size={40} className="animate-spin text-[#FF7400]" />
            <p className="text-slate-400">Fetching users...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            {filteredUsers.map((u) => (
              <div key={u.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:-translate-y-1 hover:shadow-md transition-all duration-300">
                
                {/* Header Section: Avatar, Name, Email */}
                <div className="p-5 border-b border-slate-100 flex items-start gap-4">
                  <div className={`w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center font-black text-white shadow-inner bg-gradient-to-br ${
                    u.role === "CLUB" ? "from-purple-500 to-indigo-600" :
                    u.role === "STUDENT" ? "from-[#FF7400] to-orange-600" :
                    u.role === "COACH" ? "from-emerald-500 to-teal-600" :
                    "from-amber-500 to-orange-600"
                  }`}>
                    {u.fullName.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-slate-800 text-sm truncate">{u.fullName}</h4>
                    <div className="flex items-center gap-1.5 mt-1 text-[10px] font-medium text-slate-500 truncate">
                      <Mail size={12} className="text-black" /> {u.email}
                    </div>
                    {u.mobileNumber && (
                      <div className="flex items-center gap-1.5 mt-1 text-[10px] font-medium text-slate-500">
                        <Phone size={12} className="text-black" /> {u.mobileNumber}
                      </div>
                    )}
                  </div>
                </div>

                {/* Body Section: Details */}
                <div className="p-5 space-y-4 flex-grow bg-slate-50/50">
                  <div className="flex justify-between items-center">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${roleColors[u.role] || "bg-slate-100 text-slate-600"}`}>
                      {getRoleIcon(u.role)}
                      {getRoleLabel(u.role)}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black tracking-widest ${
                      u.status === "APPROVED" ? "bg-emerald-100 text-emerald-700 border border-emerald-200" : 
                      u.status === "REJECTED" ? "bg-red-100 text-red-700 border border-red-200" : "bg-amber-100 text-amber-700 border border-amber-200"
                    }`}>
                      {u.status}
                    </span>
                  </div>

                  {u.districtName && (
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
                      <MapPin size={12} className="text-[#FF7400]" /> {u.districtName} District
                    </div>
                  )}

                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-slate-400 font-bold uppercase">{getTemporaryIdLabel(u.role)}</span>
                      <code className="bg-white border border-slate-200 px-2 py-0.5 rounded-md text-[#FF7400] font-mono shadow-sm">{u.tempId}</code>
                    </div>
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-slate-400 font-bold uppercase">{getPermanentIdLabel(u.role)}</span>
                      <code className="bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md text-blue-800 font-mono shadow-sm">{u.permanentId || "NOT SET"}</code>
                    </div>
                  </div>
                </div>

                {/* Footer Section: Actions */}
                <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-white">
                  <div className="text-[10px] font-semibold text-slate-400 flex flex-col gap-1">
                    <span className="flex items-center gap-1"><Calendar size={12} /> Joined {new Date(u.createdAt).toLocaleDateString()}</span>
                    {u.validUntil && (
                      <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                        <CheckCircle2 size={10} /> Valid until {new Date(u.validUntil).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {isMemberRole(u.role) && (
                      <button
                        onClick={() => handlePromoteClick(u)}
                        className="px-3 py-1.5 text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-100 hover:bg-blue-600 hover:text-white rounded-lg transition-all flex items-center gap-1"
                        title="Promote Member"
                      >
                        <Shield size={12} /> Promote
                      </button>
                    )}
                    <button
                      onClick={() => handleEdit(u)}
                      className="px-3 py-1.5 text-[10px] font-bold text-[#FF7400] bg-orange-50 border border-orange-100 hover:bg-[#FF7400] hover:text-white rounded-lg transition-all flex items-center gap-1"
                      title="Manage Credentials"
                    >
                      <Edit size={12} /> Edit
                    </button>
                  </div>
                </div>

              </div>
            ))}
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
                    {selectedUser ? getPermanentIdLabel(selectedUser.role) : "Permanent ID"}
                  </label>
                  <div className="relative">
                    <IdCard className="absolute left-4 top-1/2 -translate-y-1/2 text-black" size={18} />
                    <input
                      type="text"
                      value={newPermanentId}
                      readOnly
                      placeholder={selectedUser ? `Enter ${getPermanentIdLabel(selectedUser.role)}` : "Enter Permanent ID"}
                      className="w-full pl-12 pr-4 py-4 text-slate-500 bg-slate-100 border border-slate-200 rounded-2xl cursor-not-allowed focus:outline-none transition-all font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2 ml-1">
                    Reset Password
                  </label>
                  <div className="relative">
                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-black" size={18} />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password (leave blank to keep current)"
                      className="w-full pl-12 pr-12 py-4 text-black bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400] transition-all"
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

                {selectedUser.role === "STUDENT" && (
                  <>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2 ml-1">
                          Wins
                        </label>
                        <input
                          type="number"
                          value={wins}
                          onChange={(e) => setWins(Number(e.target.value) || 0)}
                          className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400] transition-all font-bold text-slate-700"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2 ml-1">
                          Losses
                        </label>
                        <input
                          type="number"
                          value={losses}
                          onChange={(e) => setLosses(Number(e.target.value) || 0)}
                          className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400] transition-all font-bold text-slate-700"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2 ml-1">
                          Draws
                        </label>
                        <input
                          type="number"
                          value={draws}
                          onChange={(e) => setDraws(Number(e.target.value) || 0)}
                          className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400] transition-all font-bold text-slate-700"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2 ml-1">
                        Assigned Coach
                      </label>
                      <select
                        value={coachId}
                        onChange={(e) => setCoachId(e.target.value)}
                        className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF7400] transition-all font-bold text-slate-700"
                      >
                        <option value="">No Coach Assigned</option>
                        {coachesList.map((coach: any) => (
                          <option key={coach.id} value={coach.id}>
                            {coach.fullName}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
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

      {/* Promote Modal */}
      <AnimatePresence>
        {promoteModalOpen && selectedUser && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-lg bg-white rounded-3xl p-8 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl">
                    <Shield size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800">Promote Member</h3>
                    <p className="text-slate-500 text-sm">{selectedUser.fullName}</p>
                  </div>
                </div>
                <button onClick={() => setPromoteModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2 ml-1">
                    Select Role
                  </label>
                  <select
                    value={promoteRole}
                    onChange={(e) => setPromoteRole(e.target.value)}
                    className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-slate-700"
                  >
                    {PROMOTABLE_ROLES.map(r => (
                      <option key={r.id} value={r.id}>{r.label}</option>
                    ))}
                  </select>
                </div>
                {["DISTRICT_PRESIDENT", "DISTRICT_SECRETARY"].includes(promoteRole) && (
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2 ml-1 mt-4">
                      Assign District
                    </label>
                    <select
                      value={promoteDistrictId}
                      onChange={(e) => setPromoteDistrictId(e.target.value)}
                      className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-slate-700"
                    >
                      <option value="">Select District</option>
                      {districtsList.map((d: any) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                    <p className="text-[10px] text-slate-400 mt-4 leading-relaxed">
                      Promoting a member gives them additional privileges. They will see a different dashboard corresponding to their new role and the district assigned to them.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-4 mt-10">
                <button
                  onClick={() => setPromoteModalOpen(false)}
                  className="flex-grow py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePromoteConfirm}
                  disabled={actionLoading}
                  className="flex-grow py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {actionLoading ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle2 size={20} />}
                  Confirm Promotion
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create User Modal */}
      <AnimatePresence>
        {createModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-2xl bg-white rounded-3xl p-8 shadow-2xl my-auto max-h-screen overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl">
                    <Plus size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800">Create New Entity</h3>
                    <p className="text-slate-500 text-sm">Force create an approved Player, Club, or Member.</p>
                  </div>
                </div>
                <button onClick={() => setCreateModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2 ml-1">
                    Entity Type
                  </label>
                  <select
                    value={createType}
                    onChange={(e) => setCreateType(e.target.value as any)}
                    className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold text-slate-700"
                  >
                    <option value="STUDENT">Player</option>
                    <option value="CLUB">Club</option>
                    <option value="MEMBER">Member</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {createType === "CLUB" ? (
                    <>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2 ml-1">
                          Club Name
                        </label>
                        <input
                          type="text"
                          value={createForm.name}
                          onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                          placeholder="Enter Club Name"
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2 ml-1">Address Line 1</label>
                        <input type="text" value={createForm.address1} onChange={(e) => setCreateForm({ ...createForm, address1: e.target.value })} placeholder="Address Line 1" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2 ml-1">Address Line 2 (Optional)</label>
                        <input type="text" value={createForm.address2} onChange={(e) => setCreateForm({ ...createForm, address2: e.target.value })} placeholder="Address Line 2" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2 ml-1">Pincode</label>
                        <input type="text" value={createForm.pincode} onChange={(e) => setCreateForm({ ...createForm, pincode: e.target.value })} placeholder="Pincode" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2 ml-1">President Name</label>
                        <input type="text" value={createForm.president} onChange={(e) => setCreateForm({ ...createForm, president: e.target.value })} placeholder="President Name" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2 ml-1">Secretary Name</label>
                        <input type="text" value={createForm.secretary} onChange={(e) => setCreateForm({ ...createForm, secretary: e.target.value })} placeholder="Secretary Name" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2 ml-1">Coach Name</label>
                        <input type="text" value={createForm.coach} onChange={(e) => setCreateForm({ ...createForm, coach: e.target.value })} placeholder="Coach Name" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm" />
                      </div>
                    </>
                  ) : (
                    <div className="md:col-span-2">
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2 ml-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={createForm.fullName}
                        onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                        placeholder="Enter Full Name"
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2 ml-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={createForm.email}
                      onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                      placeholder="Enter Email Address"
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2 ml-1">
                      Mobile Number
                    </label>
                    <input
                      type="text"
                      value={createForm.mobileNumber}
                      onChange={(e) => setCreateForm({ ...createForm, mobileNumber: e.target.value })}
                      placeholder="10-digit Mobile Number"
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2 ml-1">
                      District
                    </label>
                    <select
                      value={createForm.districtId}
                      onChange={(e) => setCreateForm({ ...createForm, districtId: e.target.value, talukId: "" })}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                    >
                      <option value="">Select District</option>
                      {districtsList.map((d: any) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2 ml-1">
                      Taluk
                    </label>
                    <select
                      value={createForm.talukId}
                      onChange={(e) => setCreateForm({ ...createForm, talukId: e.target.value })}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                    >
                      <option value="">Select Taluk</option>
                      {taluksList.map((t: any) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>

                  {createType !== "CLUB" && (
                    <>
                      <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2 ml-1">
                          Gender
                        </label>
                        <select
                          value={createForm.gender}
                          onChange={(e) => setCreateForm({ ...createForm, gender: e.target.value })}
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                        >
                          <option value="MALE">Male</option>
                          <option value="FEMALE">Female</option>
                          <option value="OTHER">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2 ml-1">
                          Date of Birth
                        </label>
                        <input
                          type="date"
                          value={createForm.dob}
                          onChange={(e) => setCreateForm({ ...createForm, dob: e.target.value })}
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2 ml-1">
                          Aadhaar Number
                        </label>
                        <input
                          type="text"
                          value={createForm.aadhaarNumber}
                          onChange={(e) => setCreateForm({ ...createForm, aadhaarNumber: e.target.value })}
                          placeholder="12-digit Aadhaar Number"
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                        />
                      </div>
                    </>
                  )}

                  {createType === "STUDENT" && (
                    <>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2 ml-1">Blood Group</label>
                        <input type="text" value={createForm.bloodGroup} onChange={(e) => setCreateForm({ ...createForm, bloodGroup: e.target.value })} placeholder="e.g. O+, A-" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2 ml-1">Address</label>
                        <input type="text" value={createForm.address} onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })} placeholder="Full Address" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2 ml-1">City</label>
                        <input type="text" value={createForm.city} onChange={(e) => setCreateForm({ ...createForm, city: e.target.value })} placeholder="City" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2 ml-1">State</label>
                        <input type="text" value={createForm.state} onChange={(e) => setCreateForm({ ...createForm, state: e.target.value })} placeholder="State" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2 ml-1">Pincode</label>
                        <input type="text" value={createForm.addressPincode} onChange={(e) => setCreateForm({ ...createForm, addressPincode: e.target.value })} placeholder="Pincode" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2 ml-1">Nationality</label>
                        <input type="text" value={createForm.nationality} onChange={(e) => setCreateForm({ ...createForm, nationality: e.target.value })} placeholder="Nationality" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2 ml-1">Annual Income</label>
                        <input type="number" value={createForm.annualIncome} onChange={(e) => setCreateForm({ ...createForm, annualIncome: e.target.value })} placeholder="Annual Income" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2 ml-1">School Name</label>
                        <input type="text" value={createForm.schoolName} onChange={(e) => setCreateForm({ ...createForm, schoolName: e.target.value })} placeholder="School Name" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2 ml-1">Grade</label>
                        <input type="text" value={createForm.grade} onChange={(e) => setCreateForm({ ...createForm, grade: e.target.value })} placeholder="Grade" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2 ml-1">Area of Interest</label>
                        <input type="text" value={createForm.areaOfInterest} onChange={(e) => setCreateForm({ ...createForm, areaOfInterest: e.target.value })} placeholder="Area of Interest" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2 ml-1">Area of Study</label>
                        <input type="text" value={createForm.areaOfStudy} onChange={(e) => setCreateForm({ ...createForm, areaOfStudy: e.target.value })} placeholder="Area of Study" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2 ml-1">Prefer Location</label>
                        <input type="text" value={createForm.preferLocation} onChange={(e) => setCreateForm({ ...createForm, preferLocation: e.target.value })} placeholder="Prefer Location" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm" />
                      </div>
                    </>
                  )}

                  {createType === "MEMBER" && (
                    <>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2 ml-1">Father's Name</label>
                        <input type="text" value={createForm.fatherName} onChange={(e) => setCreateForm({ ...createForm, fatherName: e.target.value })} placeholder="Father's Name" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2 ml-1">Blood Group</label>
                        <input type="text" value={createForm.bloodGroup} onChange={(e) => setCreateForm({ ...createForm, bloodGroup: e.target.value })} placeholder="e.g. O+, A-" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2 ml-1">Address Line 1</label>
                        <input type="text" value={createForm.addressLine1} onChange={(e) => setCreateForm({ ...createForm, addressLine1: e.target.value })} placeholder="Address Line 1" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm" />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2 ml-1">Address Line 2 (Optional)</label>
                        <input type="text" value={createForm.addressLine2} onChange={(e) => setCreateForm({ ...createForm, addressLine2: e.target.value })} placeholder="Address Line 2" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2 ml-1">City</label>
                        <input type="text" value={createForm.city} onChange={(e) => setCreateForm({ ...createForm, city: e.target.value })} placeholder="City" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2 ml-1">Pincode</label>
                        <input type="text" value={createForm.addressPincode} onChange={(e) => setCreateForm({ ...createForm, addressPincode: e.target.value })} placeholder="Pincode" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm" />
                      </div>
                    </>
                  )}

                </div>
              </div>

              <div className="flex gap-4 mt-10">
                <button
                  onClick={() => setCreateModalOpen(false)}
                  className="flex-grow py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={actionLoading}
                  className="flex-grow py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {actionLoading ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                  Create {createType === "STUDENT" ? "Player" : createType === "CLUB" ? "Club" : "Member"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
