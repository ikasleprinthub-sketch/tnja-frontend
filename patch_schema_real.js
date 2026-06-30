const fs = require('fs');
let content = fs.readFileSync('../tnja-backend/prisma/schema.prisma', 'utf8');

if (!content.includes('assignedDistrictId')) {
  content = content.replace(/members\s+Member\[\]/, 'members   Member[] @relation("PermanentDistrict")\n  assignedMembers Member[] @relation("AssignedDistrict")');
  content = content.replace(/district\s+District\s+@relation\(fields:\s+\[districtId\],\s+references:\s+\[id\]\)/, 'district              District @relation("PermanentDistrict", fields: [districtId], references: [id])\n  assignedDistrictId    String?\n  assignedDistrict      District? @relation("AssignedDistrict", fields: [assignedDistrictId], references: [id])');
  fs.writeFileSync('../tnja-backend/prisma/schema.prisma', content);
  console.log('Schema updated successfully.');
} else {
  console.log('Schema already has assignedDistrictId');
}
