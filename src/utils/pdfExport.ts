export function roundName(ri: number, total: number): string {
  const fromEnd = total - ri;
  if (fromEnd === 1) return "🏆 Final";
  if (fromEnd === 2) return "Semi-Final";
  if (fromEnd === 3) return "Quarter-Final";
  return `Round ${ri + 1}`;
}

export function exportMatchToPDF(
  match: any,
  winner: any,
  loser: any,
  tournament: any,
  roundIndex: number,
  nextMatchInfo: any,
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
            <div class="club">${winner.club || ""}</div>
            ${winner.seedNumber ? `<span class="seed">Seed #${winner.seedNumber}</span>` : ""}
          </div>
          <div class="player-card loser">
            <h3>Opponent</h3>
            <div class="name">${loser.playerName}</div>
            <div class="club">${loser.club || ""}</div>
            ${loser.seedNumber ? `<span class="seed">Seed #${loser.seedNumber}</span>` : ""}
          </div>
        </div>

        ${
          nextMatchInfo
            ? `
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
        `
            : ""
        }

        <div class="footer">
          <p>Generated on ${new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}</p>
          <p>TNJA Tournament Management System</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const iframe = document.createElement("iframe");
  iframe.style.display = "none";
  document.body.appendChild(iframe);

  iframe.contentWindow?.document.write(html);
  iframe.onload = () => {
    iframe.contentWindow?.print();
    setTimeout(() => document.body.removeChild(iframe), 100);
  };
}
