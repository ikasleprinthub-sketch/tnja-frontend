// ─── PDF / print export helpers ────────────────────────────────────────────
// DOM/window side effects (opens a print window), no React state.

import type { BracketMatch, BracketSlot, DrawCategory, RegisteredPlayer, Tournament } from "../types";
import { isDrawRoundRobin, roundName } from "./bracketEngine";

export function printRegistrationSlip(player: RegisteredPlayer, tournament: Tournament | null) {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Registration Slip - ${player.name}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 24px; border-bottom: 3px solid #FF7400; padding-bottom: 16px; }
        .header h1 { font-size: 22px; color: #333; margin-bottom: 4px; }
        .header p { color: #666; font-size: 13px; }
        .tnja-id { text-align: center; font-size: 13px; color: #FF7400; font-weight: bold; letter-spacing: 1px; margin-bottom: 24px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px 24px; margin-bottom: 24px; }
        .grid div { font-size: 13px; }
        .grid label { color: #FF7400; font-weight: bold; display: block; margin-bottom: 3px; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px; }
        .grid span { color: #333; font-weight: 600; font-size: 15px; }
        .status-badge { display: inline-block; padding: 4px 12px; border-radius: 999px; font-size: 11px; font-weight: 800; text-transform: uppercase; }
        .footer { text-align: center; margin-top: 30px; padding-top: 16px; border-top: 1px solid #eee; color: #999; font-size: 11px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${tournament?.title || "Tournament"} — Registration Slip</h1>
          <p>${tournament?.location || ""} ${tournament?.date ? "· " + new Date(tournament.date).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" }) : ""}</p>
        </div>
        <div class="tnja-id">TNJA ID: ${player.tnjaId || "N/A"}</div>
        <div class="grid">
          <div><label>Player Name</label><span>${player.name}</span></div>
          <div><label>Gender</label><span>${player.gender === "FEMALE" ? "Female" : "Male"}</span></div>
          <div><label>District</label><span>${player.district || "—"}</span></div>
          <div><label>Club</label><span>${player.club || "—"}</span></div>
          <div><label>Category</label><span>${player.ageGroup || "—"}</span></div>
          <div><label>Belt</label><span>${player.belt || "—"}</span></div>
          <div><label>Weight</label><span>${player.rawWeight ? `${player.rawWeight} kg` : "—"}</span></div>
          <div><label>Height</label><span>${player.rawHeight ? `${player.rawHeight}` : "—"}</span></div>
          <div><label>Coach</label><span>${player.coachName || "—"}</span></div>
          <div><label>Payment Status</label><span class="status-badge" style="background:${player.isPaid ? "#f0fdf4;color:#22c55e" : "#fffbeb;color:#d97706"}">${player.isPaid ? "Paid" : "Unpaid"}</span></div>
        </div>
        <div class="footer">
          <p>Registered on ${player.registeredAt ? new Date(player.registeredAt).toLocaleString("en-IN", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}</p>
          <p>TNJA Tournament Management System — Generated on ${new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 250);
  } else {
    alert("Please allow popups for this site to print the registration slip.");
  }
}


export function exportMatchToPDF(
  match: BracketMatch,
  winner: BracketSlot,
  loser: BracketSlot,
  tournament: Tournament | null,
  roundIndex: number,
  nextMatchInfo: any
) {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Match Report</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: #f5f5f5;
          padding: 20px;
        }
        .container {
          max-width: 800px;
          margin: 0 auto;
          background: white;
          padding: 40px;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 3px solid #FF7400;
          padding-bottom: 20px;
        }
        .header h1 {
          font-size: 28px;
          color: #333;
          margin-bottom: 5px;
        }
        .header p {
          color: #666;
          font-size: 14px;
        }
        .tournament-info {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 30px;
          padding: 15px;
          background: #f9f9f9;
          border-radius: 8px;
        }
        .tournament-info div {
          font-size: 13px;
        }
        .tournament-info label {
          color: #FF7400;
          font-weight: bold;
          display: block;
          margin-bottom: 3px;
        }
        .tournament-info span {
          color: #333;
          font-weight: 500;
        }
        .match-details {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 30px;
        }
        .player-card {
          padding: 20px;
          border-radius: 8px;
          border: 2px solid #ddd;
        }
        .player-card.winner {
          border-color: #22c55e;
          background: #f0fdf4;
        }
        .player-card.loser {
          border-color: #ef4444;
          background: #fef2f2;
        }
        .player-card h3 {
          font-size: 14px;
          color: #666;
          text-transform: uppercase;
          margin-bottom: 8px;
          font-weight: bold;
        }
        .player-card .name {
          font-size: 22px;
          font-weight: bold;
          color: #333;
          margin-bottom: 5px;
        }
        .player-card .club {
          font-size: 13px;
          color: #666;
          margin-bottom: 8px;
        }
        .player-card .seed {
          display: inline-block;
          background: #fef3c7;
          color: #b45309;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: bold;
          margin-top: 8px;
        }
        .next-match {
          background: #eff6ff;
          border: 2px solid #3b82f6;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 30px;
        }
        .next-match h3 {
          color: #1e40af;
          font-size: 14px;
          margin-bottom: 10px;
          font-weight: bold;
        }
        .next-match .details {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          font-size: 13px;
        }
        .next-match .details div {
          color: #333;
        }
        .next-match .details label {
          color: #1e40af;
          font-weight: bold;
          display: block;
          margin-bottom: 2px;
        }
        .footer {
          text-align: center;
          color: #999;
          font-size: 12px;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
        }
        .match-meta {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin-bottom: 20px;
          padding: 15px;
          background: #f9f9f9;
          border-radius: 8px;
          font-size: 13px;
        }
        .match-meta label {
          color: #666;
          font-weight: bold;
        }
        .match-meta span {
          color: #333;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⚔️ MATCH REPORT</h1>
          <p>Match Result & Progression Record</p>
        </div>

        <div class="tournament-info">
          <div>
            <label>Tournament</label>
            <span>${tournament?.title || "N/A"}</span>
          </div>
          <div>
            <label>Date</label>
            <span>${tournament?.date || "N/A"}</span>
          </div>
          <div>
            <label>Level</label>
            <span>${tournament?.level || "N/A"}</span>
          </div>
          <div>
            <label>Location</label>
            <span>${tournament?.location || "N/A"}</span>
          </div>
        </div>

        <div class="match-meta">
          <div>
            <label>Mat Number:</label>
            <span>${match.matNumber}</span>
          </div>
          <div>
            <label>Match Number:</label>
            <span>#${match.matchNumber}</span>
          </div>
        </div>

        <div class="match-details">
          <div class="player-card winner">
            <h3>🏆 Winner</h3>
            <div class="name">${winner.playerName}</div>
            <div class="club">${winner.club}</div>
            ${winner.seedNumber ? `<span class="seed">Seed #${winner.seedNumber}</span>` : ""}
          </div>
          <div class="player-card loser">
            <h3>Opponent</h3>
            <div class="name">${loser.playerName}</div>
            <div class="club">${loser.club}</div>
            ${loser.seedNumber ? `<span class="seed">Seed #${loser.seedNumber}</span>` : ""}
          </div>
        </div>

        ${nextMatchInfo ? `
          <div class="next-match">
            <h3>📍 NEXT MATCH</h3>
            <div class="details">
              <div>
                <label>Round:</label>
                <span>${roundName(nextMatchInfo.roundIndex, 5)}</span>
              </div>
              <div>
                <label>Match:</label>
                <span>#${nextMatchInfo.matchNumber}</span>
              </div>
              <div style="grid-column: 1 / -1;">
                <label>Opponent Status:</label>
                <span>${nextMatchInfo.opponent ? `vs ${nextMatchInfo.opponent}` : "⏳ Waiting for opponent to advance"}</span>
              </div>
            </div>
          </div>
        ` : ""}

        <div class="footer">
          <p>Generated on ${new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}</p>
          <p>TNJA Tournament Management System</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    
    // Give the new window a moment to parse the HTML before printing
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 250);
  } else {
    alert("Please allow popups for this site to export the Match Report.");
  }
}

export function exportAllMatchesToPDF(tournament: Tournament | null, allDraws: Record<string, DrawCategory>) {
  let allMatches: { category: string; mat: number; round: number; matchNum: number; p1: string; p2: string; status: string; winner: string | null }[] = [];

  for (const [catKey, draw] of Object.entries(allDraws)) {
    if (!draw.rounds) continue;
    draw.rounds.forEach((roundMatches, ri) => {
      roundMatches.forEach(m => {
        if (!m.slotA.isBye && !m.slotB.isBye && m.slotA.playerName !== "TBD" && m.slotB.playerName !== "TBD") {
          allMatches.push({
            category: catKey.replace(/_/g, " "),
            mat: m.matNumber,
            round: ri + 1,
            matchNum: m.matchNumber,
            p1: m.slotA.playerName,
            p2: m.slotB.playerName,
            status: m.status,
            winner: m.winnerId === m.slotA.playerId ? m.slotA.playerName : m.winnerId === m.slotB.playerId ? m.slotB.playerName : null
          });
        }
      });
    });
  }

  // Sort by Mat Number, then Category, then Round, then Match
  allMatches.sort((a, b) => {
    if (a.mat !== b.mat) return a.mat - b.mat;
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    if (a.round !== b.round) return a.round - b.round;
    return a.matchNum - b.matchNum;
  });

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Master Match List</title>
      <style>
        body { font-family: sans-serif; padding: 20px; }
        h1 { text-align: center; color: #333; margin-bottom: 5px; font-size: 24px; }
        h3 { text-align: center; color: #666; margin-bottom: 20px; font-size: 14px; font-weight: normal; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f5f5f5; font-weight: bold; }
        .mat-row { background-color: #e2e8f0; font-weight: bold; text-align: center; }
      </style>
    </head>
    <body>
      <h1>MASTER MATCH LIST</h1>
      <h3>${tournament?.title || "Tournament"} - All Categories</h3>
      <table>
        <thead>
          <tr>
            <th>Mat</th>
            <th>Category</th>
            <th>Match</th>
            <th>Player 1 (White)</th>
            <th>Player 2 (Blue)</th>
            <th>Status</th>
            <th>Winner</th>
          </tr>
        </thead>
        <tbody>
          ${allMatches.map(m => `
            <tr>
              <td style="text-align:center; font-weight:bold;">${m.mat}</td>
              <td>${m.category}</td>
              <td>R${m.round} - #${m.matchNum}</td>
              <td>${m.p1}</td>
              <td>${m.p2}</td>
              <td>${m.status}</td>
              <td>${m.winner || "-"}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div style="margin-top: 20px; text-align: center; font-size: 10px; color: #999;">
        Generated on ${new Date().toLocaleString()}
      </div>
    </body>
    </html>
  `;

  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 250);
  } else {
    alert("Please allow popups to print.");
  }
}


export function exportOverallTournamentReport(
  tournament: Tournament | null,
  players: RegisteredPlayer[],
  allDraws: Record<string, DrawCategory>,
  placements: Record<string, "FIRST" | "SECOND" | "THIRD" | "PARTICIPATION">
) {
  const activePlayers = players.filter(p => p.status === "APPROVED");
  const maleCount = activePlayers.filter(p => p.gender === "MALE").length;
  const femaleCount = activePlayers.filter(p => p.gender === "FEMALE").length;
  const otherCount = activePlayers.length - maleCount - femaleCount;
  const totalCategories = Object.keys(allDraws).length;

  let totalMatches = 0;
  let completedMatches = 0;
  let totalByes = 0;
  let totalIppons = 0;
  let totalWazaAris = 0;
  let totalYukos = 0;
  let totalMatchSeconds = 0;

  for (const draw of Object.values(allDraws)) {
    if (!draw.rounds) continue;
    draw.rounds.forEach(roundMatches => {
      roundMatches.forEach(m => {
        if (!m.slotA.isBye && !m.slotB.isBye && m.slotA.playerName !== "TBD" && m.slotB.playerName !== "TBD") {
          totalMatches++;
          if (m.status === "COMPLETED") {
            completedMatches++;
            totalMatchSeconds += (m.elapsedSeconds || 0);
            if (m.scoreA) {
              totalIppons += (m.scoreA.ippon || 0);
              totalWazaAris += (m.scoreA.wazaAri || 0);
              totalYukos += (m.scoreA.yuko || 0);
            }
            if (m.scoreB) {
              totalIppons += (m.scoreB.ippon || 0);
              totalWazaAris += (m.scoreB.wazaAri || 0);
              totalYukos += (m.scoreB.yuko || 0);
            }
          }
        } else if (m.slotA.isBye || m.slotB.isBye) {
          totalByes++;
        }
      });
    });
  }

  const avgMatchTimeSeconds = completedMatches > 0 ? Math.floor(totalMatchSeconds / completedMatches) : 0;
  const avgMins = Math.floor(avgMatchTimeSeconds / 60);
  const avgSecs = avgMatchTimeSeconds % 60;
  const totalMins = Math.floor(totalMatchSeconds / 60);
  const totalSecs = totalMatchSeconds % 60;

  const categoryRows = Object.entries(allDraws).map(([catKey, draw]) => {
    const ageGroup = draw.ageGroup;
    const gender = draw.gender;
    const weightDiv = draw.weightCategory === "ALL" ? "Open" : draw.weightCategory;

    const catPlayers = activePlayers.filter(p => 
      p.ageGroup === ageGroup && 
      (draw.exactAge === 0 || p.exactAge === draw.exactAge) &&
      p.gender === gender &&
      String(p.weight) === draw.weightCategory
    );
    const catMale = catPlayers.filter(p => p.gender === "MALE").length;
    const catFemale = catPlayers.filter(p => p.gender === "FEMALE").length;
    const catTotal = catPlayers.length;

    const goldPlayers = catPlayers.filter(p => placements[p.id] === "FIRST");
    const silverPlayers = catPlayers.filter(p => placements[p.id] === "SECOND");
    const bronzePlayers = catPlayers.filter(p => placements[p.id] === "THIRD");

    const formatWinners = (winners: typeof activePlayers) => {
      if (winners.length === 0) return "-";
      return winners.map(w => `<span class="winner-name">${w.name}</span><br/><span class="winner-club">(${w.club || w.district})</span>`).join('<br/><br/>');
    };

    return `
      <tr>
        <td style="font-weight: bold;">${ageGroup}</td>
        <td>${gender}</td>
        <td>${weightDiv}</td>
        <td>${catMale}</td>
        <td>${catFemale}</td>
        <td style="font-weight: bold;">${catTotal}</td>
        <td style="color: #b45309; font-weight: bold;">${formatWinners(goldPlayers)}</td>
        <td style="color: #334155; font-weight: bold;">${formatWinners(silverPlayers)}</td>
        <td style="color: #9a3412; font-weight: bold;">${formatWinners(bronzePlayers)}</td>
      </tr>
    `;
  }).join('');

  const drawShuffleRows = Object.entries(allDraws).map(([catKey, draw]) => {
    if (!draw.rounds || draw.rounds.length === 0) return '';
    const round1 = draw.rounds[0];
    const matchups = round1.map(m => {
      const p1 = m.slotA.playerName !== "TBD" ? m.slotA.playerName : (m.slotA.isBye ? "BYE" : "TBD");
      const p2 = m.slotB.playerName !== "TBD" ? m.slotB.playerName : (m.slotB.isBye ? "BYE" : "TBD");
      return `<div style="background:#f8fafc; padding: 5px 8px; border: 1px solid #e2e8f0; border-radius: 4px; margin-bottom: 5px;">
        <span style="color:#64748b; font-size:10px;">Match #${m.matchNumber}</span><br/>
        <strong>${p1}</strong> <span style="color:#94a3b8; font-size: 10px; margin: 0 5px;">vs</span> <strong>${p2}</strong>
      </div>`;
    }).join('');

    return `
      <div style="margin-bottom: 20px; page-break-inside: avoid;">
        <h4 style="margin: 0 0 10px 0; color: #1e293b; border-bottom: 1px solid #cbd5e1; padding-bottom: 5px; font-size:14px;">
          ${draw.ageGroup} ${draw.gender} ${draw.weightCategory === "ALL" ? "Open" : draw.weightCategory} - ${isDrawRoundRobin(draw) ? 'ROUND ROBIN' : 'ELIMINATION'}
        </h4>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; font-size: 11px;">
          ${matchups}
        </div>
      </div>
    `;
  }).join('');

  let allMatches: any[] = [];
  for (const [catKey, draw] of Object.entries(allDraws)) {
    if (!draw.rounds) continue;
    draw.rounds.forEach((roundMatches, ri) => {
      roundMatches.forEach(m => {
        if (!m.slotA.isBye && !m.slotB.isBye && m.slotA.playerName !== "TBD" && m.slotB.playerName !== "TBD") {
          allMatches.push({
            category: catKey.replace(/_/g, " "),
            mat: m.matNumber,
            round: ri + 1,
            matchNum: m.matchNumber,
            p1: m.slotA.playerName,
            p2: m.slotB.playerName,
            status: m.status,
            winner: m.winnerId === m.slotA.playerId ? m.slotA.playerName : m.winnerId === m.slotB.playerId ? m.slotB.playerName : "-"
          });
        }
      });
    });
  }

  allMatches.sort((a, b) => {
    if (a.mat !== b.mat) return a.mat - b.mat;
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    if (a.round !== b.round) return a.round - b.round;
    return a.matchNum - b.matchNum;
  });

  const matchesRows = allMatches.map(m => `
    <tr>
      <td style="text-align:center; font-weight:bold;">${m.mat}</td>
      <td>${m.category}</td>
      <td>R${m.round} - #${m.matchNum}</td>
      <td>${m.p1}</td>
      <td>${m.p2}</td>
      <td>${m.status}</td>
      <td style="font-weight: bold;">${m.winner}</td>
    </tr>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Official Tournament Completion Report</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; line-height: 1.4; padding: 30px; margin: 0; }
        .header { display: flex; align-items: center; justify-content: center; gap: 15px; margin-bottom: 5px; }
        .header-icon { font-size: 32px; }
        .header-title { font-size: 26px; font-weight: 900; color: #0f172a; margin: 0; letter-spacing: -0.5px; }
        .subtitle { text-align: center; font-size: 16px; font-weight: 700; color: #334155; margin: 0 0 20px 0; }
        .orange-line { height: 4px; background-color: #f97316; margin-bottom: 30px; }
        
        .info-box { border: 1px solid #cbd5e1; border-radius: 8px; padding: 20px; display: flex; justify-content: space-between; margin-bottom: 40px; }
        .info-col { display: flex; flex-direction: column; gap: 5px; }
        .info-label { font-size: 11px; font-weight: 800; color: #f97316; text-transform: uppercase; }
        .info-value { font-size: 14px; font-weight: 500; color: #1e293b; }
        
        .section-title { font-size: 18px; font-weight: 900; color: #0f172a; margin: 30px 0 15px 0; display: flex; align-items: center; gap: 10px; }
        .section-title span { color: #f97316; }
        
        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 12px; }
        th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; vertical-align: top; }
        th { background-color: #f8fafc; font-weight: 800; color: #475569; text-transform: uppercase; font-size: 11px; }
        
        .winner-name { font-weight: bold; color: #b45309; }
        .winner-club { font-size: 10px; color: #64748b; }
        .td-center { text-align: center; }
        
        .footer { text-align: center; font-size: 10px; color: #94a3b8; margin-top: 50px; }
      </style>
    </head>
    <body>
      <div class="header">
        <span class="header-icon">🏆</span>
        <h1 class="header-title">OFFICIAL TOURNAMENT COMPLETION REPORT</h1>
      </div>
      <p class="subtitle">${tournament?.title || "Tournament"}</p>
      <div class="orange-line"></div>
      
      <div class="info-box">
        <div class="info-col">
          <span class="info-label">Date</span>
          <span class="info-value">${tournament?.date ? new Date(tournament.date).toLocaleDateString('en-GB') : "N/A"}${tournament?.dateTo ? ' - ' + new Date(tournament.dateTo).toLocaleDateString('en-GB') : ""}</span>
        </div>
        <div class="info-col">
          <span class="info-label">Location</span>
          <span class="info-value">${tournament?.location || "N/A"}</span>
        </div>
        <div class="info-col">
          <span class="info-label">Level</span>
          <span class="info-value">${tournament?.level || "N/A"}</span>
        </div>
        <div class="info-col">
          <span class="info-label">Category</span>
          <span class="info-value">${tournament?.category || "N/A"}</span>
        </div>
      </div>
      
      <div class="section-title"><span>📊</span> PARTICIPATION METRICS SUMMARY</div>
      <table>
        <thead>
          <tr>
            <th>Total Players</th>
            <th>Male Players</th>
            <th>Female Players</th>
            <th>Other / Unspecified</th>
            <th>Total Categories</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="font-weight: bold;">${activePlayers.length}</td>
            <td>${maleCount}</td>
            <td>${femaleCount}</td>
            <td>${otherCount}</td>
            <td>${totalCategories}</td>
          </tr>
        </tbody>
      </table>

      <div class="section-title"><span>📈</span> MATCH STATISTICS</div>
      <table>
        <thead>
          <tr>
            <th>Total Scheduled</th>
            <th>Completed Matches</th>
            <th>Auto-Advancements (Byes)</th>
            <th>Total Ippons (100)</th>
            <th>Total Waza-aris (10)</th>
            <th>Total Yukos (1)</th>
            <th>Total Time</th>
            <th>Avg. Match Time</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="font-weight: bold;">${totalMatches}</td>
            <td style="color: #059669; font-weight: bold;">${completedMatches}</td>
            <td>${totalByes}</td>
            <td style="color: #b45309; font-weight: bold;">${totalIppons}</td>
            <td>${totalWazaAris}</td>
            <td>${totalYukos}</td>
            <td>${totalMins}m ${totalSecs}s</td>
            <td>${avgMins}m ${avgSecs}s</td>
          </tr>
        </tbody>
      </table>
      
      <div class="section-title" style="page-break-before: always;"><span>🥇</span> CATEGORY WINNERS & PARTICIPATION TABLE</div>
      <table>
        <thead>
          <tr>
            <th>Age Group</th>
            <th>Gender</th>
            <th>Weight Div</th>
            <th>Male</th>
            <th>Female</th>
            <th>Total</th>
            <th>🥇 Gold (1st)</th>
            <th>🥈 Silver (2nd)</th>
            <th>🥉 Bronze (3rd)</th>
          </tr>
        </thead>
        <tbody>
          ${categoryRows}
        </tbody>
      </table>

      <div class="section-title" style="page-break-before: always;"><span>🔀</span> CATEGORY INITIAL DRAWS (SHUFFLE)</div>
      <p style="font-size:12px; color: #64748b; margin-bottom: 20px;">The initial random seeding and first-round matchups generated for each category.</p>
      ${drawShuffleRows}
      
      <div class="section-title" style="page-break-before: always;"><span>⚔️</span> MASTER MATCHES & RESULTS LIST</div>
      <table>
        <thead>
          <tr>
            <th class="td-center">Mat</th>
            <th>Category</th>
            <th>Match</th>
            <th>Player 1 (White)</th>
            <th>Player 2 (Blue)</th>
            <th>Status</th>
            <th>Winner</th>
          </tr>
        </thead>
        <tbody>
          ${matchesRows}
        </tbody>
      </table>
      
      <div class="footer">
        Generated on ${new Date().toLocaleString()} &middot; Official Tournament Completion Record
      </div>
    </body>
    </html>
  `;

  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 250);
  } else {
    alert("Please allow popups to print the report.");
  }
}

export function exportRoundRobinPoolSheet(
  tournament: Tournament | null,
  categoryKey: string,
  draw: DrawCategory,
  players: RegisteredPlayer[]
) {
  if (!draw || !draw.rounds) return;

  // Clean the category key for printing (e.g. "Senior_MALE_-60kg" -> "Senior MALE -60kg")
  const catLabel = categoryKey.replace(/_/g, " ");
  const parts = catLabel.split(" ");
  const ageGroup = parts[0] || "";
  const gender = parts[1] || "";
  const weight = parts[2] || "";

  const allMatches: any[] = [];
  draw.rounds.forEach(roundMatches => {
    roundMatches.forEach(m => {
      if (!m.slotA.isBye && !m.slotB.isBye) {
        allMatches.push(m);
      }
    });
  });

  // Approved active competitors
  const activePlayers = players.filter(p => p.status === "APPROVED");
  const pCount = activePlayers.length;

  // Standings computation to show Place and Wins/Pts
  const standingsMap: Record<string, {
    playerId: string;
    name: string;
    club: string;
    weight: string;
    wins: number;
    points: number;
    totalWinningTime: number;
  }> = {};

  activePlayers.forEach(p => {
    standingsMap[p.id] = {
      playerId: p.id,
      name: p.name,
      club: p.club || "",
      weight: p.weight ? String(p.weight) : "",
      wins: 0,
      points: 0,
      totalWinningTime: 0,
    };
  });

  allMatches.forEach(m => {
    if (m.status === "COMPLETED") {
      const ptsA = m.scoreA ? ( (m.scoreA.ippon || 0) * 100 + (m.scoreA.wazaAri || 0) * 10 + (m.scoreA.yuko || 0) * 1 ) : 0;
      const ptsB = m.scoreB ? ( (m.scoreB.ippon || 0) * 100 + (m.scoreB.wazaAri || 0) * 10 + (m.scoreB.yuko || 0) * 1 ) : 0;

      if (standingsMap[m.slotA.playerId]) standingsMap[m.slotA.playerId].points += Math.min(ptsA, 100);
      if (standingsMap[m.slotB.playerId]) standingsMap[m.slotB.playerId].points += Math.min(ptsB, 100);

      if (m.winnerId && standingsMap[m.winnerId]) {
        standingsMap[m.winnerId].wins += 1;
        standingsMap[m.winnerId].totalWinningTime += m.elapsedSeconds || 0;
      }
    }
  });

  const sortedPlayers = Object.values(standingsMap).sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.points !== a.points) return b.points - a.points;

    const tiedGroup = Object.values(standingsMap).filter(p => p.wins === a.wins && p.points === a.points);
    if (tiedGroup.length === 2) {
      const headToHead = allMatches.find(m => 
        m.status === "COMPLETED" && 
        ((m.slotA.playerId === a.playerId && m.slotB.playerId === b.playerId) ||
         (m.slotA.playerId === b.playerId && m.slotB.playerId === a.playerId))
      );
      if (headToHead && headToHead.winnerId) {
        return headToHead.winnerId === a.playerId ? -1 : 1;
      }
    }
    if (a.totalWinningTime !== b.totalWinningTime) {
      return a.totalWinningTime - b.totalWinningTime;
    }
    return 0;
  });

  // Map to find Rank
  const rankMap: Record<string, number> = {};
  sortedPlayers.forEach((p, idx) => {
    rankMap[p.playerId] = idx + 1;
  });

  // Competitor codes (01, 02, etc.) based on original activePlayers order
  const codeMap: Record<string, string> = {};
  activePlayers.forEach((p, idx) => {
    codeMap[p.id] = (idx + 1).toString().padStart(2, "0");
  });

  // Construct head-to-head outcomes matrix
  const grid: Record<string, Record<string, string>> = {};
  activePlayers.forEach(pA => {
    grid[pA.id] = {};
    activePlayers.forEach(pB => {
      grid[pA.id][pB.id] = "-"; // default
    });
  });

  allMatches.forEach(m => {
    if (m.status === "COMPLETED" && m.winnerId) {
      const ptsA = m.scoreA ? ( (m.scoreA.ippon || 0) * 100 + (m.scoreA.wazaAri || 0) * 10 + (m.scoreA.yuko || 0) * 1 ) : 0;
      const ptsB = m.scoreB ? ( (m.scoreB.ippon || 0) * 100 + (m.scoreB.wazaAri || 0) * 10 + (m.scoreB.yuko || 0) * 1 ) : 0;
      
      grid[m.slotA.playerId][m.slotB.playerId] = m.winnerId === m.slotA.playerId ? Math.min(ptsA, 100).toString() : "0";
      grid[m.slotB.playerId][m.slotA.playerId] = m.winnerId === m.slotB.playerId ? Math.min(ptsB, 100).toString() : "0";
    }
  });

  const formattedDate = tournament?.date ? new Date(tournament.date).toLocaleDateString("en-IN") : new Date().toLocaleDateString("en-IN");

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Round Robin Pool Sheet</title>
      <style>
        body { font-family: sans-serif; padding: 20px; color: #000; }
        .official-header {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 5px;
        }
        .official-header td {
          border: 1px solid #000;
          padding: 8px;
          font-size: 11px;
          font-weight: bold;
          vertical-align: middle;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        
        .sub-header {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          font-weight: bold;
          margin: 10px 0;
          border-bottom: 2px solid #000;
          padding-bottom: 4px;
        }

        .pool-title {
          font-size: 20px;
          font-weight: 900;
          margin: 15px 0 5px 0;
        }

        .pool-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 25px;
          font-size: 12px;
        }
        .pool-table th, .pool-table td {
          border: 1px solid #000;
          padding: 8px;
          text-align: left;
        }
        .pool-table th {
          background-color: #f5f5f5;
          font-weight: bold;
        }
        .pool-table td.center, .pool-table th.center {
          text-align: center;
        }
        .shaded-cell {
          background-color: #e2e8f0;
        }

        .matches-title {
          font-size: 14px;
          font-weight: bold;
          margin-bottom: 8px;
        }

        .matches-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }
        .matches-table th, .matches-table td {
          border: 1px solid #000;
          padding: 8px;
          text-align: left;
        }
        .matches-table th {
          background-color: #f5f5f5;
          font-weight: bold;
        }
        .matches-table td.center {
          text-align: center;
        }
      </style>
    </head>
    <body>
      <table class="official-header">
        <tr>
          <td style="color: blue; font-size: 14px; width: 15%;" class="text-center">${gender.toUpperCase()} ${ageGroup.toUpperCase()}</td>
          <td style="color: blue; font-size: 14px; width: 12%;" class="text-center">${weight}</td>
          <td style="font-size: 11px; width: 35%;">${tournament?.title?.toUpperCase() || "TNJA CHAMPIONSHIP"}</td>
          <td style="font-size: 11px; width: 18%;">${tournament?.location || "CHENNAI"}</td>
          <td style="font-size: 11px; width: 10%;" class="text-center">${formattedDate}</td>
          <td style="font-size: 11px; width: 5%;" class="text-center">${pCount}</td>
          <td style="font-size: 11px; width: 5%;" class="text-center">Cmp</td>
        </tr>
      </table>

      <div class="sub-header">
        <span style="color: red;">Round Robin System for ${pCount} Competitors</span>
        <span>4 min</span>
        <span>Matte _</span>
      </div>

      <div class="pool-title">Poolk.</div>
      <table class="pool-table">
        <thead>
          <tr>
            <th style="width: 25%;">Nr. Name</th>
            <th style="width: 25%;">Club</th>
            ${activePlayers.map(p => `<th class="center" style="width: 8%;">${codeMap[p.id]}</th>`).join('')}
            <th class="center" style="width: 12%;">Wins / Pts</th>
            <th class="center" style="width: 10%;">Weight</th>
            <th class="center" style="width: 8%;">Place</th>
          </tr>
        </thead>
        <tbody>
          ${activePlayers.map(p => {
            const code = codeMap[p.id];
            const stats = standingsMap[p.id];
            const rank = rankMap[p.id];
            const placeEmoji = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `${rank}`;
            return `
              <tr>
                <td><span style="color: blue;">${code}</span> ${p.name}</td>
                <td>:${p.club || ""}</td>
                ${activePlayers.map(opp => {
                  if (opp.id === p.id) {
                    return `<td class="shaded-cell"></td>`;
                  }
                  return `<td class="center">${grid[p.id][opp.id]}</td>`;
                }).join('')}
                <td class="center">${stats.wins} &nbsp;&nbsp;&nbsp;&nbsp; ${stats.points}</td>
                <td class="center">${stats.weight} kg</td>
                <td class="center" style="font-weight: bold; font-size: 14px;">${placeEmoji}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>

      <div class="matches-title">Matches:</div>
      <table class="matches-table">
        <thead>
          <tr>
            <th style="width: 12%;" class="center">Round/Compe</th>
            <th style="width: 28%;">Name ("white")</th>
            <th style="width: 28%;">Name ("blue")</th>
            <th style="width: 14%;">Winner</th>
            <th style="width: 8%;" class="center">Pts.</th>
            <th style="width: 10%;" class="center">Scores</th>
          </tr>
        </thead>
        <tbody>
          ${allMatches.map((m, idx) => {
            const codeA = codeMap[m.slotA.playerId] || "??";
            const codeB = codeMap[m.slotB.playerId] || "??";
            const winnerName = m.winnerId === m.slotA.playerId ? m.slotA.playerName : m.winnerId === m.slotB.playerId ? m.slotB.playerName : "";
            
            const ptsVal = m.status === "COMPLETED" ? (
              m.winnerId === m.slotA.playerId ? (
                m.scoreA ? Math.min((m.scoreA.ippon * 100) + (m.scoreA.wazaAri * 10) + (m.scoreA.yuko), 100) : 0
              ) : (
                m.scoreB ? Math.min((m.scoreB.ippon * 100) + (m.scoreB.wazaAri * 10) + (m.scoreB.yuko), 100) : 0
              )
            ) : "";

            const scoreA_str = m.scoreA ? `${m.scoreA.ippon}.${m.scoreA.wazaAri}.${m.scoreA.yuko}` : "0.0.0";
            const scoreB_str = m.scoreB ? `${m.scoreB.ippon}.${m.scoreB.wazaAri}.${m.scoreB.yuko}` : "0.0.0";
            const scoreDisplay = m.status === "COMPLETED" ? `${scoreA_str} / ${scoreB_str}` : "";

            return `
              <tr>
                <td class="center" style="font-size: 14px; font-weight: bold; color: blue;">
                  ${idx + 1} &nbsp;&nbsp;&nbsp;&nbsp; <span style="font-size:11px; font-weight:normal;">${codeA}-${codeB}</span>
                </td>
                <td>${m.slotA.playerName}</td>
                <td>${m.slotB.playerName}</td>
                <td style="font-weight: bold; color: green;">${winnerName}</td>
                <td class="center" style="font-weight: bold;">${ptsVal}</td>
                <td class="center">${scoreDisplay}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `;

  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 250);
  } else {
    alert("Please allow popups to print.");
  }
}

