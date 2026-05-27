"use client";

import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Button from '@/components/common/Button';
import { Search, Upload, Check, Asterisk } from 'lucide-react';
import { ClubRegistrationData } from '@/types/registration';

const RequiredSymbol = () => <Asterisk size={10} className="text-red-500 stroke-[4px]" />;

const SectionHeader = ({ title }: { title: string }) => (
  <div className="bg-[#F8F9FA] border border-[#E9ECEF] py-4 px-6 mb-8 rounded-sm">
    <h2 className="text-lg font-bold text-[#2B1300] tracking-tight">{title}</h2>
  </div>
);

const InputField = ({ label, name, placeholder, required = false, type = "text", icon: Icon, value, onChange, maxLength, listOptions }: any) => {
  const listId = listOptions ? `${name}-list` : undefined;
  return (
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
          list={listId}
          className={`w-full ${Icon ? 'pl-10' : 'px-4'} py-3 bg-white border border-[#DEE2E6] rounded text-sm text-gray-900 focus:outline-none focus:border-[#FF7400] focus:ring-1 focus:ring-[#FF7400]/20 transition-all placeholder:text-gray-400`}
        />
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <Icon size={18} />
          </div>
        )}
        {listOptions && (
          <datalist id={listId}>
            {listOptions.map((opt: any, idx: number) => (
              <option key={idx} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </datalist>
        )}
      </div>
    </div>
  );
};

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

const ClubRegistrationForm = () => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const [districts, setDistricts] = useState<{id: string, name: string}[]>([]);
  const [taluks, setTaluks] = useState<{id: string, name: string}[]>([]);
  const [coaches, setCoaches] = useState<{id: string, fullName: string}[]>([]);
  const [members, setMembers] = useState<{id: string, fullName: string}[]>([]);

  const [formData, setFormData] = useState<ClubRegistrationData>({
    districtId: '',
    talukId: '',
    taluk: '',
    clubName: '',
    mobileNumber: '',
    email: '',
    pincode: '',
    address1: '',
    address2: '',
    president: '',
    secretary: '',
    coach: '',
    noOfStudents: '',
    maleStudents: '',
    femaleStudents: '',
    age6to11Male: '',
    age6to11Female: '',
    age12to18Male: '',
    age12to18Female: '',
    age16AboveMale: '',
    age16AboveFemale: '',
    agreedToTerms: false
  });

  useEffect(() => {
    const fetchDistricts = async () => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      try {
        const response = await fetch(`${apiUrl}/districts`);
        if (response.ok) setDistricts(await response.json());
      } catch (err) {
        console.error("Failed to fetch districts:", err);
      }
    };
    fetchDistricts();
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

  const handleTalukChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const talukId = e.target.value;
    const selectedTaluk = taluks.find(t => t.id === talukId);
    
    if (selectedTaluk) {
      setFormData(prev => ({ 
        ...prev, 
        talukId,
        taluk: selectedTaluk.name, 
        pincode: (selectedTaluk as any).pincode || '',
        president: '',
        secretary: '',
        coach: ''
      }));

      // Fetch coaches and members for this taluk
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      try {
        const [coachesRes, membersRes] = await Promise.all([
          fetch(`${apiUrl}/coaches?talukId=${talukId}&districtId=${formData.districtId}`),
          fetch(`${apiUrl}/members?talukId=${talukId}&districtId=${formData.districtId}`)
        ]);
        if (coachesRes.ok) setCoaches(await coachesRes.json());
        if (membersRes.ok) setMembers(await membersRes.json());
      } catch (err) {
        console.error("Failed to fetch coaches/members:", err);
      }
    } else {
      setFormData(prev => ({ ...prev, talukId: '', taluk: '', pincode: '', president: '', secretary: '', coach: '' }));
      setCoaches([]);
      setMembers([]);
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
      const response = await fetch(`${apiUrl}/register/club`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
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
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Registration Submitted!</h2>
        <p className="text-gray-600 mb-8">Your club application has been submitted and is currently <strong>awaiting admin approval</strong>.</p>
        
        <div className="bg-[#F8F9FA] p-6 rounded-lg mb-8 border border-[#E9ECEF]">
          <p className="text-sm text-gray-500 uppercase font-bold tracking-wider mb-2">Your Temporary Club ID</p>
          <p className="text-4xl font-mono font-bold text-[#FF7400]">{success.tempId || 'PENDING'}</p>
        </div>

        <div className="text-left space-y-4 bg-orange-50/50 p-6 rounded-lg border border-orange-100 mb-8">
          <h4 className="font-bold text-[#FF7400]">Next Steps:</h4>
          <ul className="text-sm text-gray-700 space-y-2 list-disc pl-5">
            <li><strong>Admin Review:</strong> Our team will review your club application details.</li>
            <li><strong>Payment Email:</strong> Once approved, a **payment link/method** will be sent to your registered email address.</li>
            <li><strong>Club ID Email:</strong> After your payment is verified, your **Club ID** will be generated and sent to you via email to activate your account.</li>
          </ul>
        </div>

        <p className="text-sm text-gray-600">
          A confirmation email has been sent to <strong>{formData.email}</strong>. Use your Temporary Club ID to track your application status.
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

          {/* Club Information Details */}
          <section className="bg-white border border-[#DEE2E6] rounded-sm overflow-hidden shadow-sm">
            <SectionHeader title="Club Information Details" />
            <div className="flex flex-col lg:flex-row gap-10 p-8 pt-2">
              <div className="flex-grow space-y-8">
                <InputField 
                  label="Name Of Club" 
                  name="clubName" 
                  placeholder="Enter Name Of Club" 
                  required 
                  value={formData.clubName}
                  onChange={handleInputChange}
                />
                <InputField 
                  label="Club Mobile Number" 
                  name="mobileNumber" 
                  placeholder="Enter Club Mobile Number" 
                  required 
                  maxLength={10}
                  value={formData.mobileNumber}
                  onChange={handleInputChange}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <InputField 
                    label="Please Enter Club Email ID" 
                    name="email" 
                    type="email"
                    placeholder="Enter Club Email ID" 
                    required 
                    value={formData.email}
                    onChange={handleInputChange}
                  />
                  <InputField 
                    label="Pincode" 
                    name="pincode" 
                    placeholder="Enter Pincode" 
                    required 
                    maxLength={6}
                    value={formData.pincode}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <InputField 
                    label="Address Line 1" 
                    name="address1" 
                    placeholder="Enter Address Line 1" 
                    required 
                    value={formData.address1}
                    onChange={handleInputChange}
                  />
                  <InputField 
                    label="Address Line 2" 
                    name="address2" 
                    placeholder="Enter Address Line 2" 
                    value={formData.address2}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              {/* Logo Upload */}
              <div className="w-full lg:w-72 flex flex-col gap-3">
                <label className="text-xs font-bold text-gray-800">
                  Upload Club Logo <span className="text-red-500">*</span>
                </label>
                <div className="aspect-square border-2 border-dashed border-[#DEE2E6] rounded flex flex-col items-center justify-center p-8 text-center cursor-pointer hover:border-[#FF7400] hover:bg-orange-50/30 transition-all group bg-[#F8F9FA]">
                  <div className="w-12 h-12 rounded-full bg-white border border-[#DEE2E6] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-sm">
                    <Upload size={20} className="text-gray-400 group-hover:text-[#FF7400]" />
                  </div>
                  <p className="text-[13px] text-gray-600 font-semibold mb-1">Drag & Drop</p>
                  <p className="text-[11px] text-gray-400 uppercase tracking-tight">or Click</p>
                  <p className="text-[10px] text-gray-400 mt-3 font-medium">7 x 7 inch</p>
                </div>
              </div>
            </div>
          </section>

          {/* Club President Information Details */}
          <section className="bg-white border border-[#DEE2E6] rounded-sm overflow-hidden shadow-sm">
            <SectionHeader title="Club President Information Details" />
            <div className="p-8 pt-2 max-w-lg">
              <InputField 
                label="Select Your Club President" 
                name="president" 
                placeholder="Search President / Member or Type New"
                required 
                icon={Search}
                listOptions={[
                  ...members.map((m: any) => ({ label: `${m.fullName} (Member)`, value: m.fullName })),
                  ...coaches.map((c: any) => ({ label: `${c.fullName} (Coach)`, value: c.fullName }))
                ]}
                value={formData.president}
                onChange={handleInputChange}
              />
            </div>
          </section>

          {/* Club Secretary Information Details */}
          <section className="bg-white border border-[#DEE2E6] rounded-sm overflow-hidden shadow-sm">
            <SectionHeader title="Club Secretary Information Details" />
            <div className="p-8 pt-2 max-w-lg">
              <InputField 
                label="Select Your Club Secretary" 
                name="secretary" 
                placeholder="Search Secretary / Member or Type New"
                required 
                icon={Search}
                listOptions={[
                  ...members.map((m: any) => ({ label: `${m.fullName} (Member)`, value: m.fullName })),
                  ...coaches.map((c: any) => ({ label: `${c.fullName} (Coach)`, value: c.fullName }))
                ]}
                value={formData.secretary}
                onChange={handleInputChange}
              />
            </div>
          </section>

          {/* Club Coach / Referee Information Details */}
          <section className="bg-white border border-[#DEE2E6] rounded-sm overflow-hidden shadow-sm">
            <SectionHeader title="Club Coach / Referee Information Details" />
            <div className="p-8 pt-2 max-w-lg">
              <InputField 
                label="Select Your Coach" 
                name="coach" 
                placeholder="Search Coach / Member or Type New"
                required 
                icon={Search}
                listOptions={coaches.map((c: any) => ({ label: `${c.fullName} (Coach)`, value: c.fullName }))}
                value={formData.coach}
                onChange={handleInputChange}
              />
            </div>
          </section>

          {/* Player Information */}
          <section className="bg-white border border-[#DEE2E6] rounded-sm overflow-hidden shadow-sm">
            <SectionHeader title="Player Information" />
            <div className="p-8 pt-2 space-y-8">
              <InputField 
                label="No Of Players" 
                name="noOfStudents" 
                placeholder="Enter Number" 
                required 
                value={formData.noOfStudents}
                onChange={handleInputChange}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                <InputField 
                  label="No Of Male Players" 
                  name="maleStudents" 
                  placeholder="Enter Number" 
                  required 
                  value={formData.maleStudents}
                  onChange={handleInputChange}
                />
                <InputField 
                  label="No Of Female Players" 
                  name="femaleStudents" 
                  placeholder="Enter Number" 
                  required 
                  value={formData.femaleStudents}
                  onChange={handleInputChange}
                />
                
                <InputField 
                  label="Age Under 6 - 11 (Male)" 
                  name="age6to11Male" 
                  placeholder="Enter Number" 
                  required 
                  value={formData.age6to11Male}
                  onChange={handleInputChange}
                />
                <InputField 
                  label="Age Under 6 - 11 (Female)" 
                  name="age6to11Female" 
                  placeholder="Enter Number" 
                  required 
                  value={formData.age6to11Female}
                  onChange={handleInputChange}
                />

                <InputField 
                  label="Age Under 12 - 18 (Male)" 
                  name="age12to18Male" 
                  placeholder="Enter Number" 
                  required 
                  value={formData.age12to18Male}
                  onChange={handleInputChange}
                />
                <InputField 
                  label="Age Under 12 - 18 (Female)" 
                  name="age12to18Female" 
                  placeholder="Enter Number" 
                  required 
                  value={formData.age12to18Female}
                  onChange={handleInputChange}
                />

                <InputField 
                  label="Age 16 & above (Male)" 
                  name="age16AboveMale" 
                  placeholder="Enter Number" 
                  required 
                  value={formData.age16AboveMale}
                  onChange={handleInputChange}
                />
                <InputField 
                  label="Age 16 & above (Female)" 
                  name="age16AboveFemale" 
                  placeholder="Enter Number" 
                  required 
                  value={formData.age16AboveFemale}
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

export default ClubRegistrationForm;
