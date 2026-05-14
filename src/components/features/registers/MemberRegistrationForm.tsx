"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '@/components/common/Button';
import { Check, Asterisk, User, Mail, Smartphone, MapPin, Calendar, Camera, FileText } from 'lucide-react';
import { MemberRegistrationData } from '@/types/registration';

const RequiredSymbol = () => <Asterisk size={10} className="text-red-500 stroke-[4px]" />;

const SectionHeader = ({ title }: { title: string }) => (
  <div className="bg-[#F8F9FA] border border-[#E9ECEF] py-4 px-6 mb-8 rounded-sm">
    <h2 className="text-lg font-bold text-[#2B1300] tracking-tight">{title}</h2>
  </div>
);

const InputField = ({ label, name, placeholder, required = false, type = "text", icon: Icon, value, onChange, maxLength }: any) => (
  <div className="flex flex-col gap-2 w-full">
    <label className="text-xs font-bold text-gray-800 flex items-center gap-1">
      {label} {required && <RequiredSymbol />}
    </label>
    <div className="relative">
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        maxLength={maxLength}
        className={`w-full ${Icon ? 'pl-10' : 'px-4'} py-3 bg-white border border-[#DEE2E6] rounded text-sm focus:outline-none focus:border-[#FF7400] focus:ring-1 focus:ring-[#FF7400]/20 transition-all placeholder:text-gray-400`}
      />
      {Icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          <Icon size={18} />
        </div>
      )}
    </div>
  </div>
);

const SelectField = ({ label, name, options, required = false, value, onChange }: any) => (
  <div className="flex flex-col gap-2 w-full">
    <label className="text-xs font-bold text-gray-800 flex items-center gap-1">
      {label} {required && <RequiredSymbol />}
    </label>
    <select
      name={name}
      value={value}
      onChange={onChange}
      className="w-full px-4 py-3 bg-white border border-[#DEE2E6] rounded text-sm focus:outline-none focus:border-[#FF7400] focus:ring-1 focus:ring-[#FF7400]/20 transition-all text-gray-700"
    >
      <option value="">Select</option>
      {options.map((opt: any) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
);

const FileUploadField = ({ label, required = false, description, icon: Icon }: any) => (
  <div className="flex flex-col gap-2 w-full h-full">
    {label && (
      <label className="text-xs font-bold text-gray-800 flex items-center justify-center gap-1 mb-2">
        {label} {required && <RequiredSymbol />}
      </label>
    )}
    <div className="border-2 border-dashed border-[#DEE2E6] rounded-sm p-8 flex flex-col items-center justify-center text-center gap-3 bg-[#FCFCFC] hover:bg-[#F8F9FA] transition-colors cursor-pointer group h-full min-h-[180px]">
      <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm border border-[#EEEEEE] group-hover:scale-110 transition-transform">
        {Icon ? <Icon size={24} className="text-gray-400" /> : <Camera size={24} className="text-gray-400" />}
      </div>
      <div>
        <p className="text-xs font-bold text-gray-600">Drag files to upload</p>
        <p className="text-[10px] text-gray-400">or</p>
        <p className="text-xs font-bold text-[#FF7400]">Choose File</p>
      </div>
    </div>
    {description && (
      <div className="mt-4 bg-[#D32F2F] text-white p-3 text-[10px] leading-relaxed font-medium">
        {description}
      </div>
    )}
  </div>
);

const MemberRegistrationForm = () => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [districts, setDistricts] = useState<{id: string, name: string}[]>([]);
  const [taluks, setTaluks] = useState<{id: string, name: string}[]>([]);

  const [formData, setFormData] = useState<MemberRegistrationData>({
    districtId: '',
    talukId: '',
    taluk: '',
    pincode: '',
    fullName: '',
    fatherName: '',
    dob: '',
    bloodGroup: '',
    gender: '',
    addressLine1: '',
    addressLine2: '',
    addressPincode: '',
    city: '',
    mobileNumber: '',
    alternateMobileNumber: '',
    email: '',
    aadhaarNumber: '',
    agreedToTerms: false
  });

  useEffect(() => {
    const fetchData = async () => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      try {
        const response = await fetch(`${apiUrl}/districts`);
        if (response.ok) setDistricts(await response.json());
      } catch (err) {
        console.error("Failed to fetch districts:", err);
      }
    };
    fetchData();
  }, []);

  const handleDistrictChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const districtId = e.target.value;
    setFormData(prev => ({ ...prev, districtId, talukId: '', taluk: '', pincode: '' }));
    setTaluks([]);
    
    if (districtId) {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      try {
        const response = await fetch(`${apiUrl}/districts/${districtId}/taluks`);
        if (response.ok) {
          setTaluks(await response.json());
        }
      } catch (err) {
        console.error("Failed to fetch taluks:", err);
      }
    }
  };

  const handleTalukChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const talukId = e.target.value;
    const selectedTaluk = taluks.find(t => t.id === talukId);
    
    if (selectedTaluk) {
      setFormData(prev => ({ 
        ...prev, 
        talukId,
        taluk: selectedTaluk.name, 
        pincode: (selectedTaluk as any).pincode || '' 
      }));
    } else {
      setFormData(prev => ({ ...prev, talukId: '', taluk: '', pincode: '' }));
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.agreedToTerms) {
      setError("Please agree to the Terms and Privacy policy.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/register/member`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess(result);
      } else {
        setError(result.error || "Something went wrong");
      }
    } catch (err) {
      setError("Failed to connect to server");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-[800px] mx-auto p-12 text-center bg-white border border-[#DEE2E6] rounded-sm shadow-xl mt-10">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Check className="text-green-600" size={40} />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Registration Submitted!</h2>
        <p className="text-gray-600 mb-8">Your member application has been submitted and is currently <strong>awaiting admin approval</strong>.</p>
        
        <div className="bg-[#F8F9FA] p-6 rounded-lg mb-8 border border-[#E9ECEF]">
          <p className="text-sm text-gray-500 uppercase font-bold tracking-wider mb-2">Your Temporary ID</p>
          <p className="text-4xl font-mono font-bold text-[#FF7400]">{success.tempId || 'PENDING'}</p>
        </div>

        <div className="text-left space-y-4 bg-orange-50/50 p-6 rounded-lg border border-orange-100 mb-8">
          <h4 className="font-bold text-[#FF7400]">Next Steps:</h4>
          <ul className="text-sm text-gray-700 space-y-2 list-disc pl-5">
            <li><strong>Admin Review:</strong> Our team will review your member registration details.</li>
            <li><strong>Payment Email:</strong> Once approved, a **payment link/method** will be sent to your registered email address.</li>
            <li><strong>Permanent ID Email:</strong> After your payment is verified, your **Permanent ID** will be generated and sent to you via email to activate your account.</li>
          </ul>
        </div>

        <p className="text-sm text-gray-600">
          A confirmation email has been sent to <strong>{formData.email}</strong>. Use your Temporary ID to track your application status.
        </p>

        <Button 
          variant="primary" 
          className="mt-10"
          onClick={() => window.location.href = '/'}
        >
          Back to Home
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto py-10 px-4 md:px-0">
      <form onSubmit={handleSubmit}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-12"
        >
          {/* Select Your Location */}
          <section className="bg-white border border-[#DEE2E6] rounded-sm overflow-hidden">
            <SectionHeader title="Select Your Location" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8 pt-2">
              <SelectField 
                label="Select Your District" 
                name="districtId" 
                required 
                options={districts.map(d => ({ label: d.name, value: d.id }))}
                value={formData.districtId}
                onChange={handleDistrictChange}
              />
              <SelectField 
                label="Select Your Taluk" 
                name="talukId" 
                required 
                options={taluks.map(t => ({ label: t.name, value: t.id }))}
                value={formData.talukId}
                onChange={handleTalukChange}
              />
            </div>
          </section>

          {/* Personal Information */}
          <section className="bg-white border border-[#DEE2E6] rounded-sm overflow-hidden">
            <SectionHeader title="Personal Information" />
            <div className="p-8 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                {/* Left Column Fields */}
                <div className="md:col-span-8 space-y-8">
                  <InputField 
                    label="Enter your Name" 
                    name="fullName" 
                    placeholder="Member Name" 
                    required 
                    value={formData.fullName}
                    onChange={handleInputChange}
                  />
                  <InputField 
                    label="Father's Name" 
                    name="fatherName" 
                    placeholder="Father's Name" 
                    required 
                    value={formData.fatherName}
                    onChange={handleInputChange}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-1 gap-8">
                    <InputField 
                      label="Date of Birth" 
                      name="dob" 
                      type="date"
                      required 
                      value={formData.dob}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                {/* Right Column Photo Upload */}
                <div className="md:col-span-4">
                  <FileUploadField 
                    label="Photo"
                    description="Please upload you id proof images in JPG, PNG or GIF format. Minimum size 20 KB and Maximum size 1 MB."
                  />
                </div>

                {/* Full Width Fields Below */}
                <div className="md:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-8">
                  <SelectField 
                    label="Blood Group" 
                    name="bloodGroup" 
                    required 
                    options={[
                      { label: "O+ve", value: "O+ve" },
                      { label: "O-ve", value: "O-ve" },
                      { label: "A+ve", value: "A+ve" },
                      { label: "A-ve", value: "A-ve" },
                      { label: "B+ve", value: "B+ve" },
                      { label: "B-ve", value: "B-ve" },
                      { label: "AB+ve", value: "AB+ve" },
                      { label: "AB-ve", value: "AB-ve" }
                    ]}
                    value={formData.bloodGroup}
                    onChange={handleInputChange}
                  />
                  <SelectField 
                    label="Gender" 
                    name="gender" 
                    required 
                    options={[
                      { label: "Male", value: "MALE" },
                      { label: "Female", value: "FEMALE" },
                      { label: "Other", value: "OTHER" }
                    ]}
                    value={formData.gender}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="md:col-span-12 space-y-8">
                  <InputField 
                    label="Address Line 1" 
                    name="addressLine1" 
                    placeholder="Enter Address Line 1" 
                    required 
                    value={formData.addressLine1}
                    onChange={handleInputChange}
                  />
                  <InputField 
                    label="Address Line 2" 
                    name="addressLine2" 
                    placeholder="Enter Address Line 2" 
                    value={formData.addressLine2}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="md:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-8">
                  <InputField 
                    label="Pincode" 
                    name="addressPincode" 
                    placeholder="6 Digit Pincode" 
                    required 
                    maxLength={6}
                    value={formData.addressPincode}
                    onChange={handleInputChange}
                  />
                  <InputField 
                    label="City" 
                    name="city" 
                    placeholder="Search City" 
                    required 
                    value={formData.city}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="md:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-8">
                  <InputField 
                    label="Mobile Number" 
                    name="mobileNumber" 
                    placeholder="Enter Your Mobile" 
                    required 
                    icon={Smartphone}
                    maxLength={10}
                    value={formData.mobileNumber}
                    onChange={handleInputChange}
                  />
                  <InputField 
                    label="Alternate Mobile" 
                    name="alternateMobileNumber" 
                    placeholder="Enter Alternate Mobile" 
                    maxLength={10}
                    value={formData.alternateMobileNumber}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="md:col-span-12">
                  <InputField 
                    label="Email ID" 
                    name="email" 
                    type="email"
                    placeholder="Enter Your Email ID" 
                    required 
                    icon={Mail}
                    value={formData.email}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="md:col-span-12">
                  <InputField 
                    label="Aadhar Number" 
                    name="aadhaarNumber" 
                    placeholder="Enter Your Aadhar Number" 
                    required 
                    maxLength={12}
                    value={formData.aadhaarNumber}
                    onChange={handleInputChange}
                  />
                </div>

                {/* Aadhar Uploads */}
                <div className="md:col-span-6">
                  <FileUploadField 
                    label="Aadhar - Front"
                    required
                    icon={FileText}
                    description="Please upload you id proof images in JPG, PNG or GIF format. Minimum size 20 KB and Maximum size 1 MB."
                  />
                </div>
                <div className="md:col-span-6">
                  <FileUploadField 
                    label="Aadhar - Back"
                    required
                    icon={FileText}
                    description="Please upload you id proof images in JPG, PNG or GIF format. Minimum size 20 KB and Maximum size 1 MB."
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-sm text-sm font-medium"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer Actions */}
          <div className="space-y-8">
            <div className="flex items-center gap-3">
              <div className="relative flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  id="agreedToTerms" 
                  name="agreedToTerms"
                  checked={formData.agreedToTerms}
                  onChange={handleInputChange}
                  className="peer h-4 w-4 cursor-pointer appearance-none rounded border border-[#DEE2E6] bg-white transition-all checked:bg-[#FF7400] checked:border-[#FF7400]"
                />
                <span className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100">
                  <Check size={12} strokeWidth={4} />
                </span>
              </div>
              <label htmlFor="agreedToTerms" className="text-[11px] text-gray-500">
                I agree to the <span className="text-[#FF7400] font-bold">Terms and Privacy policy</span>
              </label>
            </div>
            
            <Button 
              type="submit"
              variant="primary"
              size="lg"
              className="w-40 rounded-full text-xs font-bold py-4"
              disabled={loading}
            >
              {loading ? "Submitting..." : "Submit"}
            </Button>
          </div>
        </motion.div>
      </form>
    </div>
  );
};

export default MemberRegistrationForm;
