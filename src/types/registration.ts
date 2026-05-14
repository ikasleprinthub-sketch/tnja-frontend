export interface PlayerRegistrationData {
  districtId: string;
  talukId: string;
  taluk: string;
  pincode: string;
  fullName: string;
  gender: string;
  dob: string;
  age: number;
  bloodGroup: string;
  mobileNumber: string;
  alternateMobileNumber: string;
  email: string;
  aadhaarNumber: string;
  address: string;
  city: string;
  state: string;
  addressPincode: string;
  nationality: string;
  annualIncome: number;
  isBPL: boolean;
  schoolName: string;
  grade: string;
  areaOfInterest: string;
  areaOfStudy: string;
  preferLocation: string;
  clubId?: string;
  agreedToTerms: boolean;
}

export interface ClubRegistrationData {
  districtId: string;
  talukId: string;
  taluk: string;
  clubName: string;
  mobileNumber: string;
  email: string;
  pincode: string;
  address1: string;
  address2: string;
  president: string;
  secretary: string;
  coach: string;
  noOfStudents: string;
  maleStudents: string;
  femaleStudents: string;
  age6to11Male: string;
  age6to11Female: string;
  age12to18Male: string;
  age12to18Female: string;
  age16AboveMale: string;
  age16AboveFemale: string;
  agreedToTerms: boolean;
}

export interface CoachRegistrationData {
  districtId: string;
  talukId: string;
  taluk: string;
  pincode: string;
  fullName: string;
  fatherName: string;
  gender: string;
  dob: string;
  age: number;
  bloodGroup: string;
  mobileNumber: string;
  alternateMobileNumber?: string;
  email: string;
  aadhaarNumber: string;
  historyInJudo: string;
  historyInOtherMartial: string;
  presentGradeInJudo: string;
  coachName?: string;
  refereeName?: string;
  deptName: string;
  contactPersonDept: string;
  addressDept: string;
  clubId?: string;
  agreedToTerms: boolean;
}

export interface MemberRegistrationData {
  districtId: string;
  talukId: string;
  taluk: string;
  pincode: string;
  fullName: string;
  fatherName: string;
  dob: string;
  bloodGroup: string;
  gender: string;
  addressLine1: string;
  addressLine2?: string;
  addressPincode: string;
  city: string;
  mobileNumber: string;
  alternateMobileNumber: string;
  email: string;
  aadhaarNumber: string;
  profilePhoto?: string;
  aadhaarFront?: string;
  aadhaarBack?: string;
  agreedToTerms: boolean;
}
