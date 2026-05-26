const fs = require('fs');
const path = require('path');
const file = path.join('c:/Users/Admin/Desktop/tnja-frontend/src/app/(dashboard)/dashboard/player/tournaments/page.tsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Add state for modal
const stateRegex = /const \[toast, setToast\] = useState<\{ msg: string; type: "success" \| "error" \} \| null>\(null\);/;
content = content.replace(stateRegex, `const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [registerModal, setRegisterModal] = useState<any | null>(null);
  const [physicalDetails, setPhysicalDetails] = useState({ height: '', weight: '' });`);

// 2. Update handleRegister function signature and where it calls the backend
content = content.replace(/const handleRegister = async \(tournament: any\) => \{/, `const handleRegister = async (tournament: any) => {
    if (!physicalDetails.height || !physicalDetails.weight) {
      showToast("Height and weight are required.", "error");
      return;
    }`);

content = content.replace(/body: JSON.stringify\(\{ tournamentId: tournament.id \}\),/, `body: JSON.stringify({ tournamentId: tournament.id, height: physicalDetails.height, weight: physicalDetails.weight }),`);

content = content.replace(/body: JSON.stringify\(\{\n                tournamentId: tournament.id,/, `body: JSON.stringify({
                tournamentId: tournament.id,
                height: physicalDetails.height,
                weight: physicalDetails.weight,`);

content = content.replace(/finally \{\n      setPaying\(null\);\n    \}/, `finally {
      setPaying(null);
      setRegisterModal(null);
      setPhysicalDetails({ height: '', weight: '' });
    }`);

// 3. Update the Register buttons to open the modal instead of calling handleRegister directly
const buttonBlock = /<button\n                        onClick=\{\(\) => handleRegister\(tournament\)\}/;
content = content.replace(buttonBlock, `<button
                        onClick={() => setRegisterModal(tournament)}`);

// 4. Inject the Modal UI at the bottom before </div>
const modalUI = `
      {/* Registration Details Modal */}
      <AnimatePresence>
        {registerModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl"
            >
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Physical Details</h2>
              <p className="text-slate-500 text-sm mb-6">Please provide your current height and weight for tournament registration.</p>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Height (cm)</label>
                  <input
                    type="number"
                    required
                    value={physicalDetails.height}
                    onChange={(e) => setPhysicalDetails({ ...physicalDetails, height: e.target.value })}
                    placeholder="e.g. 175"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Weight (kg)</label>
                  <input
                    type="number"
                    required
                    value={physicalDetails.weight}
                    onChange={(e) => setPhysicalDetails({ ...physicalDetails, weight: e.target.value })}
                    placeholder="e.g. 68"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 transition-all"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setRegisterModal(null);
                    setPhysicalDetails({ height: '', weight: '' });
                  }}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleRegister(registerModal)}
                  disabled={paying === registerModal.id || !physicalDetails.height || !physicalDetails.weight}
                  className="flex-1 py-3 bg-[#FF7400] hover:bg-[#e66a00] text-white font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {paying === registerModal.id ? <Loader2 size={16} className="animate-spin" /> : "Proceed"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
`;

content = content.replace(/<\/div>\n  \);\n\}\n?$/, modalUI + '    </div>\n  );\n}\n');

fs.writeFileSync(file, content);
console.log('done');
