const fs = require('fs');
const path = require('path');
const file = path.join('c:/Users/Admin/Desktop/tnja-frontend/src/app/(dashboard)/dashboard/player/tournaments/page.tsx');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/const orderRes = await fetch\(`\$\{API_BASE\}\/tournaments\/create-payment-order`, \{\n        method: "POST",\n        headers: \{ "Content-Type": "application\/json", Authorization: `Bearer \$\{token\}` \},\n        body: JSON.stringify\(\{ tournamentId: tournament.id \}\),\n      \}\);[\s\S]*?const paymentObject = new \(window as any\).Razorpay\(options\);\n      paymentObject.open\(\);/, `const orderRes = await fetch(\`\${API_BASE}/tournaments/player/pay\`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: \`Bearer \${token}\` },
        body: JSON.stringify({ tournamentId: tournament.id }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error || "Failed to create payment order");

      if (orderData.isFree) {
        showToast(orderData.message, "success");
        fetchTournaments();
        return;
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "TNJA Club Tournament",
        description: \`Entry Fee – \${tournament.title}\`,
        order_id: orderData.id,
        handler: async function (response: any) {
          try {
            const verifyRes = await fetch(\`\${API_BASE}/tournaments/player/verify\`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: \`Bearer \${token}\` },
              body: JSON.stringify({
                tournamentId: tournament.id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(verifyData.error || "Verification failed");
            showToast("Payment successful! You are registered. Awaiting club approval.", "success");
            fetchTournaments();
          } catch (err: any) {
            showToast("Payment verification failed: " + err.message, "error");
          }
        },
        prefill: {
          name: playerData?.fullName || "",
          email: playerData?.email || "",
          contact: playerData?.mobileNumber || "",
        },
        theme: { color: "#FF7400" },
      };

      const paymentObject = new (window as any).Razorpay(options);
      paymentObject.open();`);

const cardDetailsRegex = /<div className="space-y-2 mb-4 text-sm text-slate-500">[\s\S]*?<\/div>\n\n                  \{tournament.description/;

const newCardDetails = `<div className="space-y-2 mb-4 text-sm text-slate-500">
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-[#FF7400]" />
                      {new Date(tournament.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      {tournament.dateTo && \` - \${new Date(tournament.dateTo).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}\`}
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-[#FF7400]" />
                      {tournament.location}
                    </div>
                    <div className="flex items-center gap-2">
                      <IndianRupee size={14} className="text-[#FF7400]" />
                      Entry Fee: <span className="font-bold text-slate-700">{tournament.entryFee === 0 ? "Free" : \`₹\${tournament.entryFee}\`}</span>
                      {tournament.allowBPL && <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold ml-2">BPL FREE</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Users size={14} className="text-[#FF7400]" />
                      {tournament.registrationCount ?? 0} / {tournament.totalSlots} Slots Filled
                    </div>
                    <div className="flex gap-2 flex-wrap mt-1">
                      <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs font-semibold">Age: {tournament.ageFrom}-{tournament.ageTo}</span>
                      <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs font-semibold">{tournament.gender}</span>
                      {tournament.beltEligibility && (
                         <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold">Belt: {tournament.beltEligibility}</span>
                      )}
                    </div>
                  </div>

                  {tournament.description`;

content = content.replace(cardDetailsRegex, newCardDetails);

const buttonRegex = /<button[\s\S]*?Pay ₹\{tournament.entryFee\} & Register <ArrowRight size=\{16\} \/>[\s\S]*?<\/button>/;
const isFreeCheck = `const isFree = tournament.entryFee === 0 || (tournament.allowBPL && playerData?.isBPL);`;
content = content.replace(/const isPayingThis = paying === tournament.id;/, `const isPayingThis = paying === tournament.id;\n            ${isFreeCheck}`);

content = content.replace(buttonRegex, `<button
                        onClick={() => handleRegister(tournament)}
                        disabled={isPayingThis}
                        className="w-full py-3 bg-[#FF7400] text-white text-sm font-bold rounded-xl shadow-md shadow-[#FF7400]/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                      >
                        {isPayingThis ? (
                          <><Loader2 size={16} className="animate-spin" /> Processing...</>
                        ) : isFree ? (
                           <>Register (Free) <ArrowRight size={16} /></>
                        ) : (
                          <>Pay ₹{tournament.entryFee} & Register <ArrowRight size={16} /></>
                        )}
                      </button>`);

fs.writeFileSync(file, content);
console.log('done');
