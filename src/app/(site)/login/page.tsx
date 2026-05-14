"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { User, ShieldCheck, Eye, EyeOff, ArrowLeft, ChevronLeft } from "lucide-react";
import Image from "next/image";

export default function LoginPage() {
  const [formData, setFormData] = useState({
    identifier: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      // Store auth data
      localStorage.setItem("token", data.token);
      localStorage.setItem("userRole", data.role);
      localStorage.setItem("userName", data.user.fullName);
      localStorage.setItem("userStatus", data.user.status || "APPROVED");
      localStorage.setItem("userEmail", data.user.email);

      // Check if password change is required
      if (data.user.mustChangePassword) {
        router.push("/dashboard/change-password");
        return;
      }

      // Redirect based on role/status
      if (data.user.status === "REJECTED") {
        router.push("/dashboard/resubmit");
      } else if (data.role === "SUPER_ADMIN" || data.role === "DISTRICT_ADMIN") {
        router.push("/dashboard/admin");
      } else if (data.role === "PLAYER") {
        router.push("/dashboard/player");
      } else {
        router.push("/dashboard/member");
      }
    } catch (err: any) {
      setError(err.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen flex items-center justify-center bg-[#E58311]">
      {/* Background with Blur/Overlay */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/login-bg1.png"
          alt="Login Background"
          fill
          className="object-cover opacity-60"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-br from-orange-600/30 to-transparent mix-blend-overlay"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-[1100px] mx-4"
      >
        <div className="bg-white rounded-[35px] shadow-[0_20px_60px_rgba(0,0,0,0.15)] overflow-hidden p-6 md:p-8 relative">
          {/* Back Button */}
          <Link 
            href="/" 
            className="absolute top-6 left-6 flex items-center gap-2 text-gray-400 hover:text-[#FF7400] transition-colors font-semibold text-sm group"
          >
            <div className="p-2 rounded-full bg-gray-50 group-hover:bg-orange-50 transition-colors">
              <ChevronLeft  size={18} />
            </div>
            Back 
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center pt-8 md:pt-4">
            
            {/* Left Section: Form */}
            <div className="flex flex-col items-center">
              <div className="relative mb-14">
                <div 
                  className="px-6 pt-4 pb-1 border-b-2 border-[#FF7400]"
                  style={{ background: 'linear-gradient(360deg, rgba(255, 218, 0, 0.6) 0%, rgba(255, 255, 255, 0.8) 80%)' }}
                >
                  <h1 className=" text-[28px] font-semibold bg-gradient-to-b from-[#FFB800] to-[#FF7400] bg-clip-text text-transparent  tracking-tight">
                    Sign In
                  </h1>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="w-full max-w-md space-y-8">
                {error && (
                  <div className="p-3 bg-red-50 border-l-4 border-red-500 text-red-600 text-sm font-medium">
                    {error}
                  </div>
                )}

                {/* Username Input */}
                <div className="relative group">
                  <div className="absolute -top-3 left-4 px-2 bg-white text-base font-medium text-gray-700 transition-all group-focus-within:text-[#FF7400] z-10">
                    Username
                  </div>
                  <div className="relative shadow-[0_4px_12px_-4px_rgba(255,218,0,0.8)] rounded-xl">
                    <input
                      type="text"
                      name="identifier"
                      value={formData.identifier}
                      onChange={handleChange}
                      className="w-full px-5 py-4 bg-white border-2 border-[#FF7400] rounded-xl text-gray-700 focus:outline-none transition-all placeholder:text-gray-300"
                      placeholder="Temp-Id,Permenant-Id,Email"
                      required
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="relative group">
                  <div className="absolute -top-3 left-4 px-2 bg-white text-base font-medium text-gray-700 transition-all group-focus-within:text-[#FF7400] z-10">
                    Password
                  </div>
                  <div className="relative shadow-[0_4px_12px_-4px_rgba(255,218,0,0.8)] rounded-xl">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      className="w-full px-5 py-4 bg-white border-2 border-[#FF7400] rounded-xl text-gray-700 focus:outline-none transition-all placeholder:text-gray-300"
                      placeholder="**************************"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-800 hover:text-[#FF7400] transition-colors"
                    >
                      {showPassword ? <Eye size={24} /> : <EyeOff size={24} />}
                    </button>
                  </div>
                </div>

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between px-1">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 rounded border-2 border-[#FFDAB9] text-[#FF7400] focus:ring-[#FF7400]/20 cursor-pointer" 
                    />
                    <span className="text-sm text-gray-500 font-semibold group-hover:text-gray-700 transition-colors">Remember Me</span>
                  </label>
                  <Link href="/forgot-password" className="text-xs text-gray-400 font-medium hover:text-[#FF7400] transition-colors italic">
                    Forgot Password?
                  </Link>
                </div>

                {/* Login Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-[#FF7400] to-[#FF9D00] text-white text-xl font-bold rounded-xl shadow-[0_8px_0_rgba(0,0,0,0.1),0_10px_20px_rgba(0,0,0,0.1)] active:shadow-none active:translate-y-[2px] transition-all disabled:opacity-70"
                >
                  {loading ? "Signing in..." : "Login In"}
                </button>
              </form>

              {/* Portal Links */}
              <div className="mt-20 grid grid-cols-2 gap-4 w-full max-w-lg">
                <div className="bg-white px-4 py-6 rounded-[30px] shadow-[0_15px_45px_rgba(0,0,0,0.07)] text-center relative group hover:shadow-[0_20px_55px_rgba(0,0,0,0.1)] transition-all flex flex-col items-center">
                  <div className="absolute -top-8 w-16 h-16 bg-white rounded-full shadow-[0_15px_35px_rgba(0,0,0,0.12)] flex items-center justify-center text-[#FF7400]">
                    <User size={32} strokeWidth={1.5} />
                  </div>
                  <h4 className="mt-4 font-bold text-[#FF7400] text-base">Member Portal</h4>
                  <p className="text-[10px] text-gray-500 mt-1 leading-relaxed px-1 font-medium">Access your student, player, or coach profile</p>
                </div>

                <div className="bg-white px-4 py-6 rounded-[30px] shadow-[0_15px_45px_rgba(0,0,0,0.07)] text-center relative group hover:shadow-[0_20px_55px_rgba(0,0,0,0.1)] transition-all flex flex-col items-center">
                  <div className="absolute -top-8 w-16 h-16 bg-white rounded-full shadow-[0_15px_35px_rgba(0,0,0,0.12)] flex items-center justify-center text-[#FF7400]">
                    <ShieldCheck size={32} strokeWidth={1.5} />
                  </div>
                  <h4 className="mt-4 font-bold text-[#FF7400] text-base">Admin Dashboard</h4>
                  <p className="text-[10px] text-gray-500 mt-1 leading-relaxed px-1 font-medium">Manage approvals and events</p>
                </div>
              </div>
            </div>

            {/* Right Section: Image */}
            <div className="hidden lg:block h-full min-h-[480px]">
              <div 
                className="relative h-full w-full rounded-[30px] overflow-hidden border-[2px] border-[#FFDA00]"
                style={{
                  boxShadow: 'inset 4px 4px 8px rgba(0, 0, 0, 0.24), inset -4px -4px 8px rgba(0, 0, 0, 0.25)'
                }}
              >
                <Image
                  src="/images/login-side1.png"
                  alt="Martial Arts Action"
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-orange-600/20 to-transparent pointer-events-none"></div>
              </div>
            </div>

          </div>
        </div>
      </motion.div>
    </main>
  );
}
