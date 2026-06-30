const fs = require('fs');

// Patch adminController.ts
let admin = fs.readFileSync('../tnja-backend/src/controllers/adminController.ts', 'utf8');

admin = admin.replace(
  `const updated = await prisma.member.update({
        where: { id: memberId },
        data: { 
          role: role as any,
          ...(districtId && { districtId })
        }
      });`,
  `
      // Check if trying to promote to district president/secretary and if someone already has the role
      if (['DISTRICT_PRESIDENT', 'DISTRICT_SECRETARY'].includes(role) && districtId) {
        const existing = await prisma.member.findFirst({
          where: { role: role as any, assignedDistrictId: districtId }
        });
        if (existing && existing.id !== memberId) {
          return res.status(400).json({ error: 'Only one ' + role.replace('_', ' ') + ' allowed per district' });
        }
      }

      const updated = await prisma.member.update({
        where: { id: memberId },
        data: { 
          role: role as any,
          ...(districtId && { assignedDistrictId: districtId })
        }
      });
`
);

fs.writeFileSync('../tnja-backend/src/controllers/adminController.ts', admin);

// Patch authController.ts
let auth = fs.readFileSync('../tnja-backend/src/controllers/authController.ts', 'utf8');
auth = auth.replaceAll(
  'include: { district: true, taluk: true }',
  'include: { district: true, taluk: true, assignedDistrict: true }'
);

fs.writeFileSync('../tnja-backend/src/controllers/authController.ts', auth);

console.log('Controllers updated.');
