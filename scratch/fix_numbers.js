const fs = require('fs');

const path = 'src/app/(dashboard)/dashboard/admin/users/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// The fields that should only allow numbers
const numberFields = ['pincode', 'addressPincode', 'mobileNumber', 'aadhaarNumber'];

numberFields.forEach(field => {
  // We want to find: setCreateForm({ ...createForm, [field]: e.target.value })
  // and change it to: setCreateForm({ ...createForm, [field]: e.target.value.replace(/\D/g, '') })
  
  // This Regex targets exactly this pattern.
  const regex = new RegExp(`setCreateForm\\(\\{ \\.\\.\\.createForm, ${field}: e\\.target\\.value \\}\\)`, 'g');
  content = content.replace(regex, `setCreateForm({ ...createForm, ${field}: e.target.value.replace(/\\D/g, '') })`);
});

fs.writeFileSync(path, content, 'utf8');
console.log('Successfully restricted number fields.');
