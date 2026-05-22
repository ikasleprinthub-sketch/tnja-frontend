"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '@/components/common/Button';
import { Search, Check, Asterisk, User, Mail, Smartphone, MapPin, GraduationCap, Calendar } from 'lucide-react';
import { PlayerRegistrationData } from '@/types/registration';
import FileUpload from '@/components/common/FileUpload';

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

const DatePickerField = ({ label, name, required = false, value, onChange, placeholder = "DD/MM/YYYY" }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    const clean = val.replace(/\D/g, '');
    let formatted = clean;
    if (clean.length > 2 && clean.length <= 4) {
      formatted = `${clean.slice(0, 2)}/${clean.slice(2)}`;
    } else if (clean.length > 4) {
      formatted = `${clean.slice(0, 2)}/${clean.slice(2, 4)}/${clean.slice(4, 8)}`;
    }
    onChange({ target: { name, value: formatted } });
  };

  const selectDate = (day: number) => {
    const formattedDay = day.toString().padStart(2, '0');
    const formattedMonth = (currentMonth + 1).toString().padStart(2, '0');
    const formattedDate = `${formattedDay}/${formattedMonth}/${currentYear}`;
    onChange({ target: { name, value: formattedDate } });
    setIsOpen(false);
  };

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const startYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => startYear - i);

  return (
    <div className="flex flex-col gap-2 w-full relative" ref={containerRef}>
      <label className="text-xs font-bold text-gray-800 flex items-center gap-1">
        {label} {required && <RequiredSymbol />}
      </label>
      <div className="relative">
        <input
          type="text"
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={handleTextChange}
          maxLength={10}
          onClick={() => setIsOpen(true)}
          className="w-full pl-10 pr-4 py-3 bg-white border border-[#DEE2E6] rounded text-sm focus:outline-none focus:border-[#FF7400] focus:ring-1 focus:ring-[#FF7400]/20 transition-all placeholder:text-gray-400"
        />
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
          <Calendar size={18} />
        </div>
      </div>

      {isOpen && (
        <div className="absolute top-[100%] left-0 z-50 mt-2 p-4 bg-white border border-[#DEE2E6] rounded shadow-xl w-[280px] animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex justify-between items-center gap-1 mb-3">
            <select
              value={currentMonth}
              onChange={(e) => setCurrentMonth(parseInt(e.target.value))}
              className="px-1.5 py-1 bg-white border border-[#DEE2E6] rounded text-xs focus:outline-none focus:border-[#FF7400] flex-grow text-gray-700"
            >
              {months.map((m, idx) => (
                <option key={m} value={idx}>{m}</option>
              ))}
            </select>
            
            <select
              value={currentYear}
              onChange={(e) => setCurrentYear(parseInt(e.target.value))}
              className="px-1.5 py-1 bg-white border border-[#DEE2E6] rounded text-xs focus:outline-none focus:border-[#FF7400] text-gray-700"
            >
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-gray-400 mb-1">
            <div>Su</div><div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {Array.from({ length: firstDayIndex }).map((_, idx) => (
              <div key={`empty-${idx}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const day = idx + 1;
              const formattedDay = day.toString().padStart(2, '0');
              const formattedMonth = (currentMonth + 1).toString().padStart(2, '0');
              const isSelected = value === `${formattedDay}/${formattedMonth}/${currentYear}`;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => selectDate(day)}
                  className={`py-1 rounded transition-colors font-medium hover:bg-orange-50 hover:text-[#FF7400] ${
                    isSelected ? 'bg-[#FF7400] text-white hover:bg-[#FF7400] hover:text-white font-bold' : 'text-gray-700'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const PlayerRegistrationForm = () => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [districts, setDistricts] = useState<{id: string, name: string}[]>([]);
  const [taluks, setTaluks] = useState<{id: string, name: string}[]>([]);
  const [clubs, setClubs] = useState<{id: string, name: string}[]>([]);

  const [formData, setFormData] = useState<PlayerRegistrationData>({
    districtId: '',
    talukId: '',
    taluk: '',
    pincode: '',
    fullName: '',
    gender: '',
    dob: '',
    age: 0,
    bloodGroup: '',
    mobileNumber: '',
    alternateMobileNumber: '',
    email: '',
    aadhaarNumber: '',
    address: '',
    city: '',
    state: 'Tamil Nadu',
    addressPincode: '',
    nationality: 'Indian',
    annualIncome: 0,
    isBPL: false,
    clubId: '',
    schoolName: '',
    grade: '',
    areaOfInterest: '',
    areaOfStudy: '',
    preferLocation: '',
    profilePhoto: '',
    aadhaarProof: '',
    incomeProof: '',
    bplProof: '',
    agreedToTerms: false
  });

  useEffect(() => {
    const fetchData = async () => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      try {
        const [distRes, clubRes] = await Promise.all([
          fetch(`${apiUrl}/districts`),
          fetch(`${apiUrl}/clubs`)
        ]);
        if (distRes.ok) setDistricts(await distRes.json());
        if (clubRes.ok) setClubs(await clubRes.json());
      } catch (err) {
        console.error("Failed to fetch initial data:", err);
      }
    };
    fetchData();
  }, []);

  // Auto-fill City and State based on Pincode
  useEffect(() => {
    const fetchLocation = async () => {
      if (formData.addressPincode && formData.addressPincode.length === 6) {
        try {
          const res = await fetch(`/api/pincode/${formData.addressPincode}`);
          if (!res.ok) return;
          const data = await res.json();
          if (data && data[0] && data[0].Status === "Success") {
            const po = data[0].PostOffice[0];
            setFormData(prev => ({ 
              ...prev, 
              city: po.District || po.Block || po.Name,
              state: po.State || prev.state
            }));
          }
        } catch (err) {
          console.error("Failed to fetch location details:", err);
        }
      }
    };
    fetchLocation();
  }, [formData.addressPincode]);

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
    } else if (name === 'annualIncome' || name === 'age') {
      setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    } else if (name === 'isBPL') {
      setFormData(prev => ({ ...prev, [name]: value === 'true' }));
    } else if (name === 'dob') {
      const clean = value.replace(/\D/g, '');
      let formatted = clean;
      if (clean.length > 2 && clean.length <= 4) {
        formatted = `${clean.slice(0, 2)}/${clean.slice(2)}`;
      } else if (clean.length > 4) {
        formatted = `${clean.slice(0, 2)}/${clean.slice(2, 4)}/${clean.slice(4, 8)}`;
      }

      // Automatically calculate age when DOB is fully entered (10 characters: DD/MM/YYYY)
      let calculatedAge = formData.age;
      if (formatted.length === 10) {
        const parts = formatted.split('/');
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // 0-indexed month
        const year = parseInt(parts[2], 10);
        if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
          const birthDate = new Date(year, month, day);
          const today = new Date();
          let age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }
          if (age >= 0 && age < 120) {
            calculatedAge = age;
          }
        }
      }

      setFormData(prev => ({ 
        ...prev, 
        dob: formatted,
        age: calculatedAge
      }));
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

    // Format dob from DD/MM/YYYY to YYYY-MM-DD for backend compatibility
    const apiDob = formData.dob && formData.dob.includes('/') 
      ? formData.dob.split('/').reverse().join('-') 
      : formData.dob;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/register/student`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          dob: apiDob
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess(result);
      } else {
        if (result.errors && Array.isArray(result.errors)) {
          const errorMsgs = result.errors.map((err: any) => `${err.path.join('.')}: ${err.message}`).join(', ');
          setError(errorMsgs);
        } else {
          setError(result.error || "Something went wrong");
        }
      }
    } catch (err) {
      setError("Failed to connect to server");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-[800px] mx-auto p-12 text-center bg-white border border-[#DEE2E6] rounded-sm shadow-xl">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Check className="text-green-600" size={40} />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Registration Successful!</h2>
        <p className="text-gray-600 mb-8">Your application has been submitted and is waiting for approval.</p>
        
        <div className="bg-[#F8F9FA] p-6 rounded-lg mb-8 border border-[#E9ECEF]">
          <p className="text-sm text-gray-500 uppercase font-bold tracking-wider mb-2">Your Temporary Player ID</p>
          <p className="text-4xl font-mono font-bold text-[#FF7400]">{success.tempId}</p>
        </div>

        <p className="text-sm text-gray-600">
          Your credentials and Temporary Player ID have been sent to <strong>{formData.email}</strong>. 
          Use the Temporary Player ID to log in and track your status.
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
    <div className="max-w-[1200px] mx-auto py-6 px-6">
      <form onSubmit={handleSubmit}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-12"
        >
          {/* Select Your Location */}
          <section className="bg-white border border-[#DEE2E6] rounded-sm overflow-hidden shadow-sm">
            <SectionHeader title="Select Your Location" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 p-8 pt-2">
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
              <InputField 
                label="Pincode" 
                name="pincode" 
                placeholder="6 Digit Pincode" 
                required 
                value={formData.pincode}
                onChange={handleInputChange}
                maxLength={6}
              />
            </div>
          </section>

          {/* Personal Information */}
          <section className="bg-white border border-[#DEE2E6] rounded-sm overflow-hidden shadow-sm">
            <SectionHeader title="Personal Information" />
            <div className="p-8 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                {/* Left Column Input Fields */}
                <div className="md:col-span-8 space-y-8">
                  <InputField 
                    label="Full Name" 
                    name="fullName" 
                    placeholder="Enter Full Name" 
                    required 
                    icon={User}
                    value={formData.fullName}
                    onChange={handleInputChange}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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
                    <DatePickerField 
                      label="Date of Birth" 
                      name="dob" 
                      required 
                      value={formData.dob}
                      onChange={handleInputChange}
                    />
                    <InputField 
                      label="Age" 
                      name="age" 
                      type="number"
                      required 
                      value={formData.age}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                {/* Right Column Profile Photo Uploader */}
                <div className="md:col-span-4 h-full animate-in fade-in zoom-in-95 duration-200">
                  <FileUpload 
                    label="Photo"
                    value={formData.profilePhoto}
                    onChange={(url) => setFormData(prev => ({ ...prev, profilePhoto: url }))}
                    accept="image/*"
                    helperText="JPG, PNG, WEBP (Max 5MB)"
                  />
                </div>

                {/* Rest of Personal Information below */}
                <div className="md:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-8">
                  <InputField 
                    label="Blood Group" 
                    name="bloodGroup" 
                    placeholder="e.g. O+ve" 
                    required 
                    value={formData.bloodGroup}
                    onChange={handleInputChange}
                  />
                  <InputField 
                    label="Aadhaar Number" 
                    name="aadhaarNumber" 
                    placeholder="12 Digit Aadhaar" 
                    required 
                    maxLength={12}
                    value={formData.aadhaarNumber}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="md:col-span-12">
                  <FileUpload 
                    label="Aadhaar Proof"
                    value={formData.aadhaarProof}
                    onChange={(url) => setFormData(prev => ({ ...prev, aadhaarProof: url }))}
                    accept="image/*,application/pdf"
                    helperText="JPG, PNG, WEBP or PDF (Max 5MB)"
                  />
                </div>

                <div className="md:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-8">
                  <InputField 
                    label="Mobile Number" 
                    name="mobileNumber" 
                    placeholder="10 Digit Mobile" 
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
                    label="Email Address" 
                    name="email" 
                    type="email"
                    placeholder="Enter Email Address" 
                    required 
                    icon={Mail}
                    value={formData.email}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Address Information */}
          <section className="bg-white border border-[#DEE2E6] rounded-sm overflow-hidden shadow-sm">
            <SectionHeader title="Permanent Address Information" />
            <div className="p-8 pt-2 space-y-8">
              <InputField 
                label="Address" 
                name="address" 
                placeholder="Door No, Street Name" 
                required 
                icon={MapPin}
                value={formData.address}
                onChange={handleInputChange}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <InputField 
                  label="City" 
                  name="city" 
                  placeholder="Enter City" 
                  required 
                  value={formData.city}
                  onChange={handleInputChange}
                />
                <InputField 
                  label="State" 
                  name="state" 
                  placeholder="Enter State" 
                  required 
                  value={formData.state}
                  onChange={handleInputChange}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <InputField 
                  label="Pincode" 
                  name="addressPincode" 
                  placeholder="6 Digit Pincode" 
                  required 
                  value={formData.addressPincode}
                  onChange={handleInputChange}
                  maxLength={6}
                />
                <InputField 
                  label="Nationality" 
                  name="nationality" 
                  placeholder="Enter Nationality" 
                  required 
                  value={formData.nationality}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          </section>

          {/* Financial Info */}
          <section className="bg-white border border-[#DEE2E6] rounded-sm overflow-hidden shadow-sm">
            <SectionHeader title="Financial Information" />
            <div className="p-8 pt-2 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                <div className="space-y-8">
                  <InputField 
                    label="Family Annual Income" 
                    name="annualIncome" 
                    type="number"
                    placeholder="Enter Annual Income" 
                    required 
                    value={formData.annualIncome}
                    onChange={handleInputChange}
                  />
                  <FileUpload 
                    label="Income Proof"
                    value={formData.incomeProof}
                    onChange={(url) => setFormData(prev => ({ ...prev, incomeProof: url }))}
                    accept="image/*,application/pdf"
                    helperText="JPG, PNG, WEBP or PDF (Max 5MB)"
                  />
                </div>
                
                <div className="space-y-8">
                  <SelectField 
                    label="Are you classified as a BPL beneficiary?" 
                    name="isBPL" 
                    required 
                    options={[
                      { label: "Yes", value: "true" },
                      { label: "No", value: "false" }
                    ]}
                    value={formData.isBPL.toString()}
                    onChange={handleInputChange}
                  />
                  
                  {formData.isBPL && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                      <FileUpload 
                        label="Proof for BPL Beneficiary"
                        value={formData.bplProof}
                        onChange={(url) => setFormData(prev => ({ ...prev, bplProof: url }))}
                        accept="image/*,application/pdf"
                        helperText="JPG, PNG, WEBP or PDF (Max 5MB)"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Academy Information */}
          <section className="bg-white border border-[#DEE2E6] rounded-sm overflow-hidden shadow-sm">
            <SectionHeader title="Academy Information" />
            <div className="p-8 pt-2 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <SelectField 
                  label="Select Your Club / Coach" 
                  name="clubId" 
                  required 
                  options={clubs.map(c => ({ label: c.name, value: c.id }))}
                  value={formData.clubId}
                  onChange={handleInputChange}
                />
                <InputField 
                  label="Enter Current Your School Name" 
                  name="schoolName" 
                  placeholder="School Name" 
                  required 
                  icon={GraduationCap}
                  value={formData.schoolName}
                  onChange={handleInputChange}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <InputField 
                  label="Grade" 
                  name="grade" 
                  placeholder="Enter Grade" 
                  required 
                  value={formData.grade}
                  onChange={handleInputChange}
                />
                <InputField 
                  label="Area of Interest" 
                  name="areaOfInterest" 
                  placeholder="e.g. Kata, Kumite" 
                  required 
                  value={formData.areaOfInterest}
                  onChange={handleInputChange}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <InputField 
                  label="Area of Study" 
                  name="areaOfStudy" 
                  placeholder="e.g. Science" 
                  required 
                  value={formData.areaOfStudy}
                  onChange={handleInputChange}
                />
                <InputField 
                  label="Prefer Location" 
                  name="preferLocation" 
                  placeholder="Enter Prefer Location" 
                  required 
                  value={formData.preferLocation}
                  onChange={handleInputChange}
                />
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
          <div className="p-4 space-y-8">
            <div className="flex items-center gap-3">
              <div className="relative flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  id="agreedToTerms" 
                  name="agreedToTerms"
                  checked={formData.agreedToTerms}
                  onChange={handleInputChange}
                  className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-[#DEE2E6] bg-white transition-all checked:bg-[#FF7400] checked:border-[#FF7400]"
                />
                <span className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100">
                  <Check size={14} strokeWidth={4} />
                </span>
              </div>
              <label htmlFor="agreedToTerms" className="text-[13px] text-gray-700 font-medium">
                I agree to the <span className="text-[#FF7400] hover:underline cursor-pointer">Terms and Privacy policy</span>
              </label>
            </div>
            
            <Button 
              type="submit"
              variant="primary"
              size="lg"
              className="w-44 shadow-lg"
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

export default PlayerRegistrationForm;
