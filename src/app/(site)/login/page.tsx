"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Mail, Lock, ArrowRight, User, ShieldCheck } from "lucide-react";
import Breadcrumb from "@/components/common/Breadcrumb";
import Button from "@/components/common/Button";

export default function LoginPage() {
  const [formData, setFormData] = useState({
    identifier: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
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

      // Redirect based on role/status
      if (data.user.status === "REJECTED") {
        router.push("/dashboard/resubmit");
      } else if (data.role === "SUPER_ADMIN" || data.role === "DISTRICT_ADMIN") {
        router.push("/dashboard/admin");
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
    <main className="bg-white min-h-screen pb-20">
      {/* Banner Section */}
      <section className="bg-[#F6F6F6] relative overflow-hidden h-[150px] flex items-center mb-16">
        <div className="max-w-[1200px] mx-auto w-full px-4 relative z-10">
          <h1 className="text-[32px] font-bold text-[#1A1A1A] mb-2 tracking-tight">
            Account Login
          </h1>
          
          <Breadcrumb 
            items={[
              { label: "Home", href: "/" },
              { label: "Login" }
            ]} 
          />
        </div>
      </section>

      <div className="max-w-[1200px] mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Left Side: Information */}
          <div className="lg:col-span-7 space-y-8">
            <div>
              <p className="text-[#FF7400] font-bold uppercase tracking-[0.25em] text-[11px] mb-4">
                Access your Portal
              </p>
              <h2 className="text-4xl md:text-[42px] font-bold text-[#1A1A1A] tracking-tight leading-tight mb-6">
                Sign in to Tamil Nadu <br /> Judo Association
              </h2>
              <p className="text-gray-500 max-w-xl leading-relaxed">
                Welcome back! Log in to your member portal to manage your profile, 
                view upcoming events, and stay connected with the Tamil Nadu Judo community.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[#F8F9FA] p-6 border border-[#E9ECEF] rounded-sm">
                <div className="w-10 h-10 bg-white shadow-sm border border-[#EEEEEE] rounded-full flex items-center justify-center text-[#FF7400] mb-4">
                  <User size={20} />
                </div>
                <h4 className="font-bold text-[#1A1A1A] mb-2">Member Portal</h4>
                <p className="text-[13px] text-gray-500">Access your student, player, or coach profile and registration status.</p>
              </div>
              <div className="bg-[#F8F9FA] p-6 border border-[#E9ECEF] rounded-sm">
                <div className="w-10 h-10 bg-white shadow-sm border border-[#EEEEEE] rounded-full flex items-center justify-center text-[#FF7400] mb-4">
                  <ShieldCheck size={20} />
                </div>
                <h4 className="font-bold text-[#1A1A1A] mb-2">Admin Dashboard</h4>
                <p className="text-[13px] text-gray-500">District Presidents and Secretaries can manage approvals and events.</p>
              </div>
            </div>
          </div>

          {/* Right Side: Login Form */}
          <div className="lg:col-span-5">
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white border border-[#DEE2E6] p-8 md:p-10 shadow-[0_10px_30px_rgba(0,0,0,0.05)] rounded-sm"
            >
              <h3 className="text-2xl font-bold text-[#1A1A1A] mb-8">Login</h3>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 text-red-600 text-sm font-medium">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-800 uppercase tracking-wider">Email or Temporary ID</label>
                  <div className="relative">
                    <input
                      type="text"
                      name="identifier"
                      value={formData.identifier}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-4 bg-[#F8F9FA] border border-[#DEE2E6] rounded text-sm focus:outline-none focus:border-[#FF7400] focus:ring-1 focus:ring-[#FF7400]/20 transition-all"
                      placeholder="Enter your Email or Temp ID"
                      required
                    />
                    <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-800 uppercase tracking-wider">Password</label>
                  <div className="relative">
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-4 bg-[#F8F9FA] border border-[#DEE2E6] rounded text-sm focus:outline-none focus:border-[#FF7400] focus:ring-1 focus:ring-[#FF7400]/20 transition-all"
                      placeholder="••••••••"
                      required
                    />
                    <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 rounded border-[#DEE2E6] text-[#FF7400] focus:ring-[#FF7400]/20" />
                    <span className="text-xs text-gray-500 font-medium">Remember me</span>
                  </label>
                  <Link href="#" className="text-xs text-[#FF7400] font-bold hover:underline">
                    Forgot Password?
                  </Link>
                </div>

                <Button 
                  type="submit" 
                  variant="primary" 
                  className="w-full py-4 rounded-full text-sm font-bold flex items-center justify-center gap-2"
                  disabled={loading}
                >
                  {loading ? "Signing in..." : "Login to Account"}
                  {!loading && <ArrowRight size={18} />}
                </Button>
              </form>

              <div className="mt-8 pt-8 border-t border-[#DEE2E6] text-center">
                <p className="text-gray-500 text-sm">
                  Don't have an account?{" "}
                  <Link href="/register" className="text-[#FF7400] font-bold hover:underline">
                    Register Now
                  </Link>
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </main>
  );
}
