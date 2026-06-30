const fs = require('fs');
let um = fs.readFileSync('../tnja-backend/src/controllers/userManagementController.ts', 'utf8');

// Update fetchMembers
um = um.replace(
  `fetchMembers ? prisma.member.findMany({
        where: { ...baseWhere, ...commonSearch, ...(memberRoleFilter ? { role: Array.isArray(memberRoleFilter) ? { in: memberRoleFilter as any[] } : (memberRoleFilter as any) } : {}), ...genderFilter },
        select: { 
          id: true, fullName: true, email: true, tempId: true, permanentId: true, status: true, mobileNumber: true, role: true, createdAt: true, districtId: true, 
          validUntil: true, district: { select: { name: true } }, taluk: { select: { name: true } }, profilePhoto: true
        },
      })`,
  `fetchMembers ? prisma.member.findMany({
        where: {
          AND: [
            {
              OR: [
                { districtId: baseWhere.districtId },
                { assignedDistrictId: baseWhere.districtId }
              ].filter(c => c.districtId !== undefined || c.assignedDistrictId !== undefined)
            },
            { ...commonSearch },
            memberRoleFilter ? { role: Array.isArray(memberRoleFilter) ? { in: memberRoleFilter as any[] } : (memberRoleFilter as any) } : {},
            { ...genderFilter },
            baseWhere.status ? { status: baseWhere.status } : {},
            baseWhere.talukId ? { talukId: baseWhere.talukId } : {}
          ].filter(x => Object.keys(x).length > 0)
        },
        select: { 
          id: true, fullName: true, email: true, tempId: true, permanentId: true, status: true, mobileNumber: true, role: true, createdAt: true, districtId: true, assignedDistrictId: true, 
          validUntil: true, district: { select: { name: true } }, assignedDistrict: { select: { name: true } }, taluk: { select: { name: true } }, profilePhoto: true
        },
      })`
);

// Update mapping
um = um.replace(
  `...members.map(u => ({ ...u, role: u.role, districtName: u.district?.name, talukName: u.taluk?.name })),`,
  `...members.map(u => ({ ...u, role: u.role, districtName: (['DISTRICT_PRESIDENT', 'DISTRICT_SECRETARY'].includes(u.role) && u.assignedDistrict) ? u.assignedDistrict.name : u.district?.name, talukName: u.taluk?.name })),`
);

fs.writeFileSync('../tnja-backend/src/controllers/userManagementController.ts', um);
console.log('userManagementController updated.');
