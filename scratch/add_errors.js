const fs = require('fs');

const path = 'src/app/(dashboard)/dashboard/admin/users/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// Handle inputs
const regex = /(<input[^>]*value=\{createForm\.([a-zA-Z0-9]+)\}[^>]*className=")([^"]+)("[^>]*\/>)/g;
content = content.replace(regex, (match, p1, field, p3, p4) => {
  if (p3.includes('formErrors.')) return match;
  let newClass = p3.replace('border-slate-200', `\${formErrors.${field} ? 'border-red-500 bg-red-50 text-red-900' : 'border-slate-200'}`);
  let input = `${p1}\` ${newClass} \`${p4}`;
  let errorMsg = `\n                        {formErrors.${field} && <p className="text-red-500 text-xs mt-1.5 font-bold ml-1 flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-red-500"></span>{formErrors.${field}}</p>}`;
  return input + errorMsg;
});

// Handle selects
const selectRegex = /(<select[\s\S]*?value=\{createForm\.([a-zA-Z0-9]+)\}[\s\S]*?className=")([^"]+)("[\s\S]*?>)/g;
content = content.replace(selectRegex, (match, p1, field, p3, p4) => {
  if (p3.includes('formErrors.')) return match;
  let newClass = p3.replace('border-slate-200', `\${formErrors.${field} ? 'border-red-500 bg-red-50 text-red-900' : 'border-slate-200'}`);
  return `${p1}\` ${newClass} \`${p4}`;
});

// Add error messages after closing select tags
// We can do this by looking for </select> following our modified select
const errorInsertRegex = /(<select[\s\S]*?value=\{createForm\.([a-zA-Z0-9]+)\}[\s\S]*?<\/select>)/g;
content = content.replace(errorInsertRegex, (match, p1, field) => {
  if (match.includes(`formErrors.${field} && <p`)) return match; // already added
  let errorMsg = `\n                        {formErrors.${field} && <p className="text-red-500 text-xs mt-1.5 font-bold ml-1 flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-red-500"></span>{formErrors.${field}}</p>}`;
  return p1 + errorMsg;
});

fs.writeFileSync(path, content, 'utf8');
console.log('Successfully added error messages to form fields.');
