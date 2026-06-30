const fs = require('fs');
let auth = fs.readFileSync('../tnja-backend/src/controllers/authController.ts', 'utf8');

auth = auth.replaceAll(
  'tokenPayload.districtId = user.districtId;',
  'tokenPayload.districtId = (user.assignedDistrictId && [\"DISTRICT_PRESIDENT\", \"DISTRICT_SECRETARY\"].includes(role)) ? user.assignedDistrictId : user.districtId;'
);

fs.writeFileSync('../tnja-backend/src/controllers/authController.ts', auth);
console.log('authController patched for jwt payload');
