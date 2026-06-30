const fs = require('fs');
let content = fs.readFileSync('../tnja-backend/prisma/schema.prisma', 'utf8');

content = content.replace(
  'members   Member[]',
  'members   Member[] @relation("PermanentDistrict")\n  assignedMembers Member[] @relation("AssignedDistrict")'
);

content = content.replace(
  'district              District @relation(fields: [districtId], references: [id])',
  'district              District @relation("PermanentDistrict", fields: [districtId], references: [id])\n  assignedDistrictId    String?\n  assignedDistrict      District? @relation("AssignedDistrict", fields: [assignedDistrictId], references: [id])'
);

fs.writeFileSync('../tnja-backend/prisma/schema.prisma', content);
console.log('Schema updated.');
