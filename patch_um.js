const fs = require('fs');
let um = fs.readFileSync('../tnja-backend/src/controllers/userManagementController.ts', 'utf8');

um = um.replaceAll(
  'include: { district: true, taluk: true }',
  'include: { district: true, taluk: true, assignedDistrict: true }'
);

fs.writeFileSync('../tnja-backend/src/controllers/userManagementController.ts', um);
console.log('userManagementController patched for includes');
