const fs = require('fs');
let lines = fs.readFileSync('../tnja-backend/prisma/schema.prisma', 'utf8').split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('members   Member[]')) {
    lines[i] = '    members   Member[] @relation("PermanentDistrict")\n    assignedMembers Member[] @relation("AssignedDistrict")';
    break;
  }
}

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('districtId            String') && lines[i+1].includes('district              District @relation(fields: [districtId], references: [id])')) {
    lines[i+1] = '  district              District @relation("PermanentDistrict", fields: [districtId], references: [id])\n  assignedDistrictId    String?\n  assignedDistrict      District? @relation("AssignedDistrict", fields: [assignedDistrictId], references: [id])';
    break;
  }
}

fs.writeFileSync('../tnja-backend/prisma/schema.prisma', lines.join('\n'));
console.log('Schema updated successfully.');
