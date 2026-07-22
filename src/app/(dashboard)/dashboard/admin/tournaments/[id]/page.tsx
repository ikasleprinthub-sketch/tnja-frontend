"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy, Users, Shuffle, Swords, Monitor, ArrowLeft,
  Grid, List, X, Check, Loader2, Calendar, MapPin,
  Target, Zap, Award, Medal, Edit2,
  AlertCircle, Clock, Download, BarChart3, MessageSquare, Send,
  PlayCircle, Lock, Search, CheckCircle2, XCircle, RefreshCw, Printer,
  ChevronLeft, ChevronRight, Eye, FilterX,
  LayoutList, Flag, Scale, Lightbulb, Info, Upload, AlertTriangle
} from "lucide-react";
import { FaMale, FaFemale } from "react-icons/fa";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9000/api";

// ─── Types ───────────────────────────────────────────────────────────────────
type Tab = "overview" | "players" | "mats" | "draws" | "matches" | "results" | "weigh-in" | "disqualify";
type ViewMode = "list" | "bracket";

interface Tournament {
  id: string; title: string; date: string; dateTo?: string;
  location: string; level: string; entryFee: number; totalSlots: number;
  ageFrom: number; ageTo: number; category?: string; gender: string; beltEligibility?: string;
  allowBPL: boolean; status: string; rejectionRemark?: string;
  numberOfMats?: number;
  districtApproval: string; stateApproval: string;
  superAdminApproval: string; ceoApproval: string;
  registrationCount?: number; registrationClosed?: boolean;
  club?: { name: string; district?: { name: string } };
}

interface RegisteredPlayer {
  id: string; name: string; club: string; district: string;
  weight: number; weightLabel?: string; ageGroup: string; exactAge?: number; gender: string; belt: string;
  seedNumber?: number; coachName?: string; placement?: string; status?: string;
  regId?: string;
  permanentId?: string; tempId?: string; tnjaId?: string;
  clubId?: string | null; coachId?: string | null; isPaid?: boolean; registeredAt?: string;
  rawWeight?: string | null; rawHeight?: string | null;
}

interface BracketSlot {
  playerId: string | null; playerName: string;
  club: string; isBye: boolean; seedNumber?: number;
  coachName?: string;
}

interface BracketMatch {
  matchId: string; round: number; matchNumber: number; matNumber: number;
  slotA: BracketSlot; slotB: BracketSlot;
  winnerId: string | null; status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  scoreA?: any; scoreB?: any; winMethod?: string; elapsedSeconds?: number;
}

interface DrawCategory {
  ageGroup: string; exactAge?: number; gender: string; weightCategory: string; matNumber?: number;
  rounds: BracketMatch[][]; generated: boolean; saved: boolean;
  isConcluded?: boolean;
}

interface Seeds {
  1: RegisteredPlayer | null; 2: RegisteredPlayer | null;
  3: RegisteredPlayer | null; 4: RegisteredPlayer | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function nextPow2(n: number): number { let p = 1; while (p < n) p <<= 1; return p; }

// Auto-advance non-BYE players through any BYE match (cascades through all rounds)
function processByeMatches(rounds: BracketMatch[][]): BracketMatch[][] {
  const r = rounds.map(row => row.map(m => ({ ...m })));
  for (let ri = 0; ri < r.length; ri++) {
    for (let mi = 0; mi < r[ri].length; mi++) {
      const m = r[ri][mi];
      if (m.status === "COMPLETED") continue;
      const aIsBye = m.slotA.isBye || (!m.slotA.playerId && m.slotA.playerName !== "TBD");
      const bIsBye = m.slotB.isBye || (!m.slotB.playerId && m.slotB.playerName !== "TBD");
      let winner: BracketSlot | null = null;
      if (aIsBye && m.slotB.playerId) winner = m.slotB;
      else if (bIsBye && m.slotA.playerId) winner = m.slotA;
      if (!winner) continue;
      r[ri][mi] = { ...m, winnerId: winner.playerId, status: "COMPLETED" };
      if (ri + 1 < r.length) {
        const nextIdx = Math.floor(mi / 2);
        const next = { ...r[ri + 1][nextIdx] };
        if (mi % 2 === 0) next.slotA = { ...winner };
        else next.slotB = { ...winner };
        r[ri + 1][nextIdx] = next;
      }
    }
  }
  return r;
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function clubSeparatedShuffle(players: RegisteredPlayer[]): RegisteredPlayer[] {
  const shuffled = shuffleArray(players);
  const clubGroups: Record<string, RegisteredPlayer[]> = {};
  for (const p of shuffled) {
    if (!clubGroups[p.club]) clubGroups[p.club] = [];
    clubGroups[p.club].push(p);
  }
  
  const sortedClubs = Object.values(clubGroups).sort((a, b) => b.length - a.length);
  const result: RegisteredPlayer[] = [];
  
  let hasMore = true;
  while (hasMore) {
    hasMore = false;
    for (const group of sortedClubs) {
      if (group.length > 0) {
        result.push(group.shift()!);
        hasMore = true;
      }
    }
  }
  return result;
}

function isDrawRoundRobin(draw: DrawCategory | undefined) {
  if (!draw || !draw.rounds || draw.rounds.length === 0) return false;
  const firstRound = draw.rounds[0];
  if (!firstRound || firstRound.length === 0) return false;
  const firstMatch = firstRound[0];
  return firstMatch.matchId.startsWith("rr_");
}

// ─── Round Robin Bracket Generator (For <= 5 Players) ───────────────────────────
function generateRoundRobin(players: RegisteredPlayer[]): BracketMatch[][] {
  const n = players.length;
  if (n < 2) return [];

  // Special Case for exactly 3 players to enforce standard IJF schedule order:
  // Round 1: 1 vs 2, Round 2: 2 vs 3, Round 3: 3 vs 1
  if (n === 3) {
    const p1 = players[0];
    const p2 = players[1];
    const p3 = players[2];
    return [
      [
        {
          matchId: `rr_r1_m1_${Date.now()}`,
          round: 1,
          matchNumber: 1,
          matNumber: 1,
          status: "PENDING",
          winnerId: null,
          slotA: { playerId: p1.id, playerName: p1.name, club: p1.club, isBye: false },
          slotB: { playerId: p2.id, playerName: p2.name, club: p2.club, isBye: false },
        }
      ],
      [
        {
          matchId: `rr_r2_m1_${Date.now()}`,
          round: 2,
          matchNumber: 1,
          matNumber: 1,
          status: "PENDING",
          winnerId: null,
          slotA: { playerId: p2.id, playerName: p2.name, club: p2.club, isBye: false },
          slotB: { playerId: p3.id, playerName: p3.name, club: p3.club, isBye: false },
        }
      ],
      [
        {
          matchId: `rr_r3_m1_${Date.now()}`,
          round: 3,
          matchNumber: 1,
          matNumber: 1,
          status: "PENDING",
          winnerId: null,
          slotA: { playerId: p3.id, playerName: p3.name, club: p3.club, isBye: false },
          slotB: { playerId: p1.id, playerName: p1.name, club: p1.club, isBye: false },
        }
      ]
    ];
  }
  
  // If odd number of players, add a dummy BYE player
  const pList = [...players];
  if (n % 2 !== 0) {
    pList.push({ id: "BYE", name: "BYE" } as any);
  }
  
  const totalRounds = pList.length - 1;
  const matchesPerRound = pList.length / 2;
  const rounds: BracketMatch[][] = [];
  
  for (let r = 0; r < totalRounds; r++) {
    const roundMatches: BracketMatch[] = [];
    for (let m = 0; m < matchesPerRound; m++) {
      const p1 = pList[m];
      const p2 = pList[pList.length - 1 - m];
      
      // Skip if it's a BYE match
      if (p1.id !== "BYE" && p2.id !== "BYE") {
        roundMatches.push({
          matchId: `rr_r${r + 1}_m${m + 1}_${Date.now()}`,
          round: r + 1,
          matchNumber: m + 1,
          matNumber: 1,
          status: "PENDING",
          winnerId: null,
          slotA: { playerId: p1.id, playerName: p1.name, club: p1.club, isBye: false },
          slotB: { playerId: p2.id, playerName: p2.name, club: p2.club, isBye: false },
        });
      }
    }
    // Only push if the round has matches
    if (roundMatches.length > 0) {
      rounds.push(roundMatches);
    }
    
    // Rotate players for next round (keep first player fixed)
    const last = pList.pop()!;
    pList.splice(1, 0, last);
  }
  
  return rounds;
}

// ─── IJF Bracket Generator ────────────────────────────────────────────────────
function generateIJFBracket(players: RegisteredPlayer[], seeds: Seeds, shuffleMethod: "random" | "club-separated" = "club-separated"): BracketMatch[][] {
  const N = nextPow2(Math.max(players.length, 2));
  const M = N / 2; // Number of matches in Round 1
  const B = N - players.length; // Number of BYEs
  const slots: (RegisteredPlayer | null | "BYE")[] = new Array(N).fill(null);

  // IJF seed positions: S1=top, S2=bottom, S3=2nd quarter, S4=3rd quarter
  if (seeds[1]) slots[0] = { ...seeds[1], seedNumber: 1 };
  if (seeds[2]) slots[N - 1] = { ...seeds[2], seedNumber: 2 };
  if (seeds[3]) slots[Math.floor(N / 4)] = { ...seeds[3], seedNumber: 3 };
  if (seeds[4]) slots[Math.floor((3 * N) / 4)] = { ...seeds[4], seedNumber: 4 };

  const seededIds = new Set(
    [seeds[1], seeds[2], seeds[3], seeds[4]].filter(Boolean).map((p) => p!.id)
  );
  const nonSeeded = shuffleMethod === "club-separated"
    ? clubSeparatedShuffle(players.filter((p) => !seededIds.has(p.id)))
    : shuffleArray(players.filter((p) => !seededIds.has(p.id)));

  // Determine which matches get a BYE to distribute them evenly and avoid BYE vs BYE
  const byeMatches = new Set<number>();
  if (B > 0) {
    if (B >= 1) byeMatches.add(0);
    if (B >= 2) byeMatches.add(M - 1);
    if (B >= 3) byeMatches.add(Math.floor(M / 4));
    if (B >= 4) byeMatches.add(Math.floor((3 * M) / 4));
    
    let remaining = B - byeMatches.size;
    if (remaining > 0) {
      const available: number[] = [];
      for (let i = 0; i < M; i++) {
        if (!byeMatches.has(i)) available.push(i);
      }
      for (let i = 0; i < remaining; i++) {
        const idx = Math.floor((i * available.length) / remaining);
        byeMatches.add(available[idx]);
      }
    }
  }

  // Assign BYEs to the slots of those matches
  for (const matchIdx of byeMatches) {
    const slotA = matchIdx * 2;
    const slotB = matchIdx * 2 + 1;
    if (slots[slotA] !== null) slots[slotB] = "BYE";
    else if (slots[slotB] !== null) slots[slotA] = "BYE";
    else slots[slotB] = "BYE"; // Default to bottom slot
  }

  // Fill remaining slots with unseeded players
  let ni = 0;
  for (let i = 0; i < N; i++) {
    if (slots[i] === null) {
      slots[i] = nonSeeded[ni++] || null;
    }
  }

  const toSlot = (p: RegisteredPlayer | null | "BYE"): BracketSlot => {
    if (p === "BYE" || p === null) return { playerId: null, playerName: "BYE", club: "", isBye: true, coachName: "" };
    return { playerId: p.id, playerName: p.name, club: p.club, isBye: false, seedNumber: p.seedNumber, coachName: p.coachName };
  };

  const rounds: BracketMatch[][] = [];
  const r1: BracketMatch[] = [];
  for (let i = 0; i < N; i += 2) {
    r1.push({
      matchId: `M_1_${i / 2 + 1}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      round: 1, matchNumber: i / 2 + 1, matNumber: (i / 2 % 3) + 1,
      slotA: toSlot(slots[i]), slotB: toSlot(slots[i + 1]),
      winnerId: null, status: "PENDING",
    });
  }
  rounds.push(r1);

  let count = N / 2;
  let rNum = 2;
  while (count > 1) {
    count = Math.floor(count / 2);
    const round: BracketMatch[] = [];
    for (let i = 0; i < count; i++) {
      round.push({
        matchId: `M_${rNum}_${i + 1}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        round: rNum, matchNumber: i + 1, matNumber: (i % 3) + 1,
        slotA: { playerId: null, playerName: "TBD", club: "", isBye: false, coachName: "" },
        slotB: { playerId: null, playerName: "TBD", club: "", isBye: false, coachName: "" },
        winnerId: null, status: "PENDING",
      });
    }

    if (count === 1 && N >= 4) {
      round.push({
        matchId: `M_BRONZE_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        round: rNum, matchNumber: 2, matNumber: 1, // Bronze match gets matchNumber 2 in the final round
        slotA: { playerId: null, playerName: "TBD", club: "", isBye: false, coachName: "" },
        slotB: { playerId: null, playerName: "TBD", club: "", isBye: false, coachName: "" },
        winnerId: null, status: "PENDING",
      });
    }

    rounds.push(round);
    rNum++;
  }
  return rounds;
}

function printRegistrationSlip(player: RegisteredPlayer, tournament: Tournament | null) {
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

function roundName(ri: number, total: number, isRoundRobin = false): string {
  if (isRoundRobin) return `Round ${ri + 1}`;
  const fromEnd = total - ri;
  if (fromEnd === 1) return "🏆 Final";
  if (fromEnd === 2) return "Semi-Final";
  if (fromEnd === 3) return "Quarter-Final";
  return `Round ${ri + 1}`;
}

function findNextMatch(rounds: BracketMatch[][], currentRoundIndex: number, matchIndex: number, winner: BracketSlot) {
  if (currentRoundIndex >= rounds.length - 1) return null;

  const nextRound = rounds[currentRoundIndex + 1];
  const nextMatchIndex = Math.floor(matchIndex / 2);
  const nextMatch = nextRound[nextMatchIndex];

  if (!nextMatch) return null;

  const isSlotA = matchIndex % 2 === 0;
  const opponent = isSlotA ? nextMatch.slotB.playerName : nextMatch.slotA.playerName;

  return {
    roundIndex: currentRoundIndex + 1,
    matchNumber: nextMatch.matchNumber,
    matNumber: nextMatch.matNumber,
    opponent: opponent === "TBD" ? null : opponent,
  };
}

function exportMatchToPDF(
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

function exportAllMatchesToPDF(tournament: Tournament | null, allDraws: Record<string, DrawCategory>) {
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

function exportRoundRobinPoolSheet(
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

// ─── Main Component ───────────────────────────────────────────────────────────
export default function TournamentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tournamentId = params?.id as string;

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [players, setPlayers] = useState<RegisteredPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("players");
  const [viewMode, setViewMode] = useState<ViewMode>("bracket"); // default bracket

  const [ageFilter, setAgeFilter] = useState("ALL");
  const [exactAgeFilter, setExactAgeFilter] = useState("ALL");
  const [genderFilter, setGenderFilter] = useState("MALE");
  const [weightFilter, setWeightFilter] = useState("ALL");

  const [draws, setDraws] = useState<Record<string, DrawCategory>>({});
  const drawsRef = useRef<Record<string, DrawCategory>>({});
  const [seeds, setSeeds] = useState<Seeds>({ 1: null, 2: null, 3: null, 4: null });
  const [showSeedModal, setShowSeedModal] = useState(false);
  const [assigningSeed, setAssigningSeed] = useState<1 | 2 | 3 | 4 | null>(null);
  const [seedingOpen, setSeedingOpen] = useState(false);
  const [randomizeOrder, setRandomizeOrder] = useState(false);
  const [champion, setChampion] = useState<{
    name: string;
    club: string;
    categoryKey: string;
    secondPlaceName?: string;
    secondPlaceClub?: string;
    thirdPlaceName?: string;
    thirdPlaceClub?: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  const [isImportWizardOpen, setIsImportWizardOpen] = useState(false);
  const [isAddPlayerOpen, setIsAddPlayerOpen] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [drawPhase, setDrawPhase] = useState<"idle" | "shuffling" | "dealing" | "done">("idle");
  const [shuffleKey, setShuffleKey] = useState(0);
  type DrawMethodType = "round-robin" | "straight-elimination" | "single-repechage" | "double-repechage";
  const [categoryDrawMethod, setCategoryDrawMethod] = useState<Record<string, DrawMethodType>>({});
  const [detailDrawMethod, setDetailDrawMethod] = useState<DrawMethodType>("round-robin");
  const [pendingMatByKey, setPendingMatByKey] = useState<Record<string, number>>({});
  const [autoGenerating, setAutoGenerating] = useState(false);
  const [autoGenProgress, setAutoGenProgress] = useState("");

  // ── Result Submission State ─────────────────────────────────────────────────
  const [placements, setPlacements] = useState<Record<string, "FIRST" | "SECOND" | "THIRD" | "PARTICIPATION">>({});
  const [submittingResults, setSubmittingResults] = useState(false);
  const [placementsAutoDetected, setPlacementsAutoDetected] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  // ── Modals State ────────────────────────────────────────────────────────────
  const [editingMetrics, setEditingMetrics] = useState<{ regId: string, weight: string, height: string, belt: string, clubId: string, coachId: string, ageGroup: string } | null>(null);
  const [savingMetrics, setSavingMetrics] = useState(false);
  const [clubOptions, setClubOptions] = useState<{ id: string; name: string }[]>([]);
  const [coachOptions, setCoachOptions] = useState<{ id: string; fullName: string }[]>([]);
  const [isConcludeModalOpen, setIsConcludeModalOpen] = useState(false);
  const [concludingCategoryKey, setConcludingCategoryKey] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; action?: () => void }>({ isOpen: false, title: "", message: "" });

  // ── Messaging / Reply State ─────────────────────────────────────────────────
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [replyLoading, setReplyLoading] = useState<Record<string, boolean>>({});
  const [messages, setMessages] = useState<Record<string, any[]>>({});
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null);

  // ── Weigh-in State ────────────────────────────────────────────────────────
  const [weighInSearch, setWeighInSearch] = useState("");
  const [selectedWeighInPlayer, setSelectedWeighInPlayer] = useState<RegisteredPlayer | null>(null);
  const [actualWeight, setActualWeight] = useState("");
  const [isDisqualifying, setIsDisqualifying] = useState(false);

  // ── Mats & Referees State ──────────────────────────────────────────────────
  const [tournamentMats, setTournamentMats] = useState<{matNumber: number, refereeId: string, refereeName?: string}[]>([]);
  const [savingMats, setSavingMats] = useState(false);
  const [loadingMats, setLoadingMats] = useState(false);
  const [matsCountInput, setMatsCountInput] = useState<string>("");
  const [matsConfirmed, setMatsConfirmed] = useState(false);
  const [wizardStep, setWizardStep] = useState<0|1|2|3>(0);
  const [selectedMatForAssignment, setSelectedMatForAssignment] = useState<number | null>(null);
  const [refSearchQuery, setRefSearchQuery] = useState("");
  const [refSearchResults, setRefSearchResults] = useState<{ id: string; refId?: string; name: string; district: string; club: string }[]>([]);
  const [refSearching, setRefSearching] = useState(false);
  const refSearchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Registrations Tab State ────────────────────────────────────────────────
  const [regSearchQuery, setRegSearchQuery] = useState("");
  const [regDistrictFilter, setRegDistrictFilter] = useState("All Districts");
  const [regClubFilter, setRegClubFilter] = useState("All Clubs");
  const [regGenderFilter, setRegGenderFilter] = useState("All Genders");
  const [regCategoryFilter, setRegCategoryFilter] = useState("All Categories");
  const [regBeltFilter, setRegBeltFilter] = useState("All Belts");
  const [regPaymentFilter, setRegPaymentFilter] = useState("All Payment Status");
  const [regStatusFilter, setRegStatusFilter] = useState("All Approval Status");
  const [regCurrentPage, setRegCurrentPage] = useState(1);
  const [regItemsPerPage, setRegItemsPerPage] = useState(10);

  const fetchMats = useCallback(async () => {
    if (!tournamentId) return;
    setLoadingMats(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/tournaments/${tournamentId}/mats`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setTournamentMats(data.mats.map((m: any) => ({
          matNumber: m.matNumber,
          refereeId: m.refereeId || "",
          refereeName: m.referee?.fullName || ""
        })));
        if (data.mats.length > 0) {
          setMatsCountInput(data.mats.length.toString());
          setMatsConfirmed(true);
        }
      }
    } catch (error) {
      console.error("Error fetching mats:", error);
    } finally {
      setLoadingMats(false);
    }
  }, [tournamentId]);

  // Debounced referee autocomplete for mat assignment. An empty query still
  // fetches — it returns the full approved roster — so admins always see a
  // browsable list of registered coaches (name + ID) instead of an empty box
  // until they start typing.
  useEffect(() => {
    if (!selectedMatForAssignment) return;
    if (refSearchDebounceRef.current) clearTimeout(refSearchDebounceRef.current);
    const query = refSearchQuery.trim();
    refSearchDebounceRef.current = setTimeout(async () => {
      setRefSearching(true);
      try {
        const res = await fetch(`${API_BASE}/referees/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setRefSearchResults(res.ok ? (data.referees || []) : []);
      } catch (e) {
        setRefSearchResults([]);
      } finally {
        setRefSearching(false);
      }
    }, query ? 300 : 0);
    return () => {
      if (refSearchDebounceRef.current) clearTimeout(refSearchDebounceRef.current);
    };
  }, [refSearchQuery, selectedMatForAssignment]);

  const assignRefereeToMat = (matNum: number, ref: { id: string; name: string }) => {
    setTournamentMats(prev => {
      const filtered = prev.filter(m => m.matNumber !== matNum);
      return [...filtered, { matNumber: matNum, refereeId: ref.id, refereeName: ref.name }];
    });
    setRefSearchQuery("");
    setRefSearchResults([]);
  };

  // ── Auto-detect placements from draw results ─────────────────────────────────
  // Runs whenever the draws or players change (e.g. when Results tab is opened)
  const autoDetectPlacements = useCallback(() => {
    if (Object.keys(draws).length === 0 || players.length === 0) return;

    const detected: Record<string, "FIRST" | "SECOND" | "THIRD" | "PARTICIPATION"> = {};

    // Start everyone as PARTICIPATION
    players.forEach((p) => { detected[p.id] = "PARTICIPATION"; });

    // Iterate over every draw category to find final + semi-final losers/winners
    for (const draw of Object.values(draws)) {
      const rounds = draw.rounds;
      if (!rounds || rounds.length === 0) continue;

      const catPlayers = players.filter(p => 
        p.status === "APPROVED" &&
        p.ageGroup === draw.ageGroup &&
        (draw.exactAge === 0 || p.exactAge === draw.exactAge) &&
        p.gender === draw.gender &&
        String(p.weight) === draw.weightCategory
      );

      const isRR = isDrawRoundRobin(draw);

      if (isRR) {
        // Calculate Round Robin standings to detect Gold, Silver, Bronze
        const standingsMap: Record<string, {
          playerId: string;
          name: string;
          wins: number;
          points: number;
          totalWinningTime: number;
        }> = {};

        catPlayers.forEach(p => {
          standingsMap[p.id] = { playerId: p.id, name: p.name, wins: 0, points: 0, totalWinningTime: 0 };
        });

        const allMatches: BracketMatch[] = [];
        rounds.forEach(r => {
          r.forEach(m => {
            allMatches.push(m);
            if (m.status === "COMPLETED") {
              const elapsed = m.elapsedSeconds || 0;
              const ptsA = m.scoreA ? ( (m.scoreA.ippon || 0) * 100 + (m.scoreA.wazaAri || 0) * 10 + (m.scoreA.yuko || 0) * 1 ) : 0;
              const ptsB = m.scoreB ? ( (m.scoreB.ippon || 0) * 100 + (m.scoreB.wazaAri || 0) * 10 + (m.scoreB.yuko || 0) * 1 ) : 0;

              if (m.slotA.playerId && standingsMap[m.slotA.playerId]) standingsMap[m.slotA.playerId].points += Math.min(ptsA, 100);
              if (m.slotB.playerId && standingsMap[m.slotB.playerId]) standingsMap[m.slotB.playerId].points += Math.min(ptsB, 100);

              if (m.winnerId && standingsMap[m.winnerId]) {
                standingsMap[m.winnerId].wins += 1;
                standingsMap[m.winnerId].totalWinningTime += elapsed;
              }
            }
          });
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

          const headToHead = allMatches.find(m => 
            m.status === "COMPLETED" && 
            ((m.slotA.playerId === a.playerId && m.slotB.playerId === b.playerId) ||
             (m.slotA.playerId === b.playerId && m.slotB.playerId === a.playerId))
          );
          if (headToHead && headToHead.winnerId) {
            return headToHead.winnerId === a.playerId ? -1 : 1;
          }

          return 0;
        });

        if (sortedPlayers.length > 0 && sortedPlayers[0].playerId) detected[sortedPlayers[0].playerId] = "FIRST";
        if (sortedPlayers.length > 1 && sortedPlayers[1].playerId) detected[sortedPlayers[1].playerId] = "SECOND";
        if (sortedPlayers.length > 2 && sortedPlayers[2].playerId) detected[sortedPlayers[2].playerId] = "THIRD";
      } else {
        const hasDoubleRepechage = rounds.some(r => r.some(m => m.matchId.startsWith("rr_rep1_m2")));
        const hasSingleRepechage = !hasDoubleRepechage && rounds.some(r => r.some(m => m.matchId.startsWith("rr_rep")));
        const totalMainRounds = (hasDoubleRepechage || hasSingleRepechage) ? rounds.length - 2 : rounds.length;

        // Gold & Silver from the final match
        if (totalMainRounds >= 1) {
          const finalRound = rounds[totalMainRounds - 1];
          if (finalRound && finalRound.length > 0) {
            const finalMatch = finalRound[0];
            if (finalMatch.status === "COMPLETED" && finalMatch.winnerId) {
              detected[finalMatch.winnerId] = "FIRST";
              const silverId = finalMatch.winnerId === finalMatch.slotA.playerId ? finalMatch.slotB.playerId : finalMatch.slotA.playerId;
              if (silverId) detected[silverId] = "SECOND";
            }
          }
        }

        if (hasDoubleRepechage) {
          // Both winners of the two Bronze Matches in the last round get 3rd place (Bronze)
          const bronzeRound = rounds[rounds.length - 1];
          if (bronzeRound && bronzeRound.length >= 2) {
            bronzeRound.forEach(m => {
              if (m.status === "COMPLETED" && m.winnerId) {
                detected[m.winnerId] = "THIRD";
              }
            });
          }
        } else if (hasSingleRepechage) {
          // Winner of the single Bronze Match in the last round gets 3rd place (Bronze)
          const bronzeRound = rounds[rounds.length - 1];
          if (bronzeRound && bronzeRound.length >= 1) {
            const bronzeMatch = bronzeRound[0];
            if (bronzeMatch.status === "COMPLETED" && bronzeMatch.winnerId) {
              detected[bronzeMatch.winnerId] = "THIRD";
            }
          }
        } else {
          // Standard Single Elimination (final + semi logic)
          const totalRounds = rounds.length;
          const finalRound = rounds[totalRounds - 1];
          let hasBronzeMatch = false;

          if (finalRound && finalRound.length > 0) {
            const finalMatch = finalRound[0];
            if (finalMatch.status === "COMPLETED" && finalMatch.winnerId) {
              detected[finalMatch.winnerId] = "FIRST";
              const silverPlayerId =
                finalMatch.winnerId === finalMatch.slotA.playerId
                  ? finalMatch.slotB.playerId
                  : finalMatch.slotA.playerId;
              if (silverPlayerId) detected[silverPlayerId] = "SECOND";
            }

            if (finalRound.length > 1) {
              hasBronzeMatch = true;
              const bronzeMatch = finalRound[1];
              if (bronzeMatch.status === "COMPLETED" && bronzeMatch.winnerId) {
                detected[bronzeMatch.winnerId] = "THIRD";
              }
            }
          }

          if (totalRounds >= 2 && !hasBronzeMatch) {
            const semiRound = rounds[totalRounds - 2];
            for (const match of semiRound) {
              if (match.status === "COMPLETED" && match.winnerId) {
                const bronzePlayerId =
                  match.winnerId === match.slotA.playerId
                    ? match.slotB.playerId
                    : match.slotA.playerId;
                if (bronzePlayerId && detected[bronzePlayerId] === "PARTICIPATION") {
                  detected[bronzePlayerId] = "THIRD";
                }
              }
            }
          }
        }
      }
    }

    setPlacements(detected);
    setPlacementsAutoDetected(true);
  }, [draws, players]);

  const handleConcludeTournament = async () => {
    setIsConcludeModalOpen(false);

    const results = players.map((p) => ({
      playerId: p.id,
      placement: placements[p.id] || "PARTICIPATION",
    }));

    setSubmittingResults(true);
    try {
      const res = await fetch(`${API_BASE}/tournaments/${tournamentId}/results`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ results }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Tournament concluded! Certificates are now available for download. 🏆");
        fetchTournament();
      } else {
        showToast(data.error || "Failed to submit results", false);
      }
    } catch {
      showToast("Error submitting results", false);
    } finally {
      setSubmittingResults(false);
    }
  };

  const handleConcludeCategory = async (key: string, catPlayers: any[]) => {
    setConcludingCategoryKey(null);

    const draw = draws[key];
    if (!draw) return;

    const results = catPlayers.map((p) => ({
      regId: p.id,
      playerId: p.playerId,
      placement: placements[p.id] || "PARTICIPATION",
    }));

    setSubmittingResults(true);
    try {
      const res = await fetch(`${API_BASE}/tournaments/${tournamentId}/results`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          results,
          ageGroup: draw.ageGroup,
          exactAge: draw.exactAge || 0,
          gender: draw.gender,
          weightCategory: draw.weightCategory,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Category concluded successfully! Certificates are now available for download. 🏆");
        setDraws(prev => ({
          ...prev,
          [key]: {
            ...prev[key]!,
            isConcluded: true
          }
        }));
        fetchTournament();
        fetchDraws();
      } else {
        showToast(data.error || "Failed to submit category results", false);
      }
    } catch (err) {
      console.error(err);
      showToast("Error submitting category results", false);
    } finally {
      setSubmittingResults(false);
    }
  };

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  };


  const categoryKey = (age: string, exactAge: string, gender: string, weight: string) =>
    `${age}_${exactAge}_${gender}_${weight}`;
  const currentKey = categoryKey(ageFilter, exactAgeFilter, genderFilter, weightFilter);

  // ── Fetch tournament ────────────────────────────────────────────────────────
  const fetchTournament = useCallback(async () => {
    if (!tournamentId) return;
    try {
      const res = await fetch(`${API_BASE}/tournaments/${tournamentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setTournament(await res.json());
    } catch (e) { console.error(e); }
  }, [tournamentId, token]);

  const openEditMetricsModal = (p: RegisteredPlayer) => {
    setEditingMetrics({
      regId: p.regId || "",
      weight: p.rawWeight || "",
      height: p.rawHeight || "",
      belt: p.belt || "",
      clubId: p.clubId || "",
      coachId: p.coachId || "",
      ageGroup: p.ageGroup || "",
    });
    if (clubOptions.length === 0) {
      fetch(`${API_BASE}/clubs`, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((data) => setClubOptions(Array.isArray(data) ? data : []))
        .catch(() => {});
    }
    if (coachOptions.length === 0) {
      fetch(`${API_BASE}/coaches`, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((data) => setCoachOptions(Array.isArray(data) ? data : []))
        .catch(() => {});
    }
  };

  const handleUpdateMetrics = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMetrics?.regId) return;
    setSavingMetrics(true);
    try {
      const res = await fetch(`${API_BASE}/tournaments/${tournamentId}/registrations/${editingMetrics.regId}/metrics`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          weight: editingMetrics.weight,
          height: editingMetrics.height,
          belt: editingMetrics.belt,
          clubId: editingMetrics.clubId,
          coachId: editingMetrics.coachId,
          ageGroup: editingMetrics.ageGroup,
        }),
      });
      if (res.ok) {
        setToast({ msg: "Metrics updated successfully", ok: true });
        setEditingMetrics(null);
        fetchPlayers(); // Refresh the players list
      } else {
        const data = await res.json();
        setToast({ msg: data.error || "Failed to update metrics", ok: false });
      }
    } catch {
      setToast({ msg: "Error updating metrics", ok: false });
    } finally {
      setSavingMetrics(false);
    }
  };

  // ── Fetch registered players ────────────────────────────────────────────────
  const fetchPlayers = useCallback(async () => {
    if (!tournamentId) return;
    try {
      const res = await fetch(`${API_BASE}/tournaments/${tournamentId}/registrations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const raw = await res.json();
        // normalise: backend may return nested player objects
        const normalised: RegisteredPlayer[] = (Array.isArray(raw) ? raw : raw.registrations || []).map(
          (r: any) => {
            const exactWeightStr = r.weightCategory || r.weight || "";
            const exactWeight = Number(exactWeightStr);
            let bucketWeight: number | string = exactWeightStr;
            let weightLabel = exactWeightStr;

            if (!isNaN(exactWeight) && exactWeight > 0) {
              if (exactWeight <= 50) {
                bucketWeight = "Under 50";
                weightLabel = "Under 50";
              } else {
                bucketWeight = `${Math.ceil(exactWeight / 5) * 5}`;
                weightLabel = `${Math.ceil(exactWeight / 5) * 5 - 4}-${Math.ceil(exactWeight / 5) * 5}`;
              }
            }
            
            return {
              id: r.playerId || r.player?.id || r.id,
              name: r.player?.fullName || r.playerName || r.name || "Unknown",
              club: r.player?.club?.name || r.club || "",
              district: r.player?.district?.name || r.district || "",
              weight: bucketWeight,
              weightLabel: weightLabel,
              ageGroup: r.ageGroup || "SENIOR",
              exactAge: Number(r.player?.age || 0),
              gender: r.gender || r.player?.gender || "MALE",
              belt: r.belt || r.player?.belt || "",
              placement: r.placement || "PARTICIPATION",
              status: r.status || "APPROVED",
              regId: r.id,
              permanentId: r.player?.permanentId,
              tempId: r.player?.tempId,
              tnjaId: r.player?.permanentId || r.player?.tempId || "N/A",
              clubId: r.player?.club?.id || null,
              coachId: r.coachId || null,
              coachName: r.coach?.fullName || "",
              isPaid: !!r.isPaid,
              registeredAt: r.createdAt,
              rawWeight: r.weight || r.player?.weight || null,
              rawHeight: r.height || r.player?.height || null,
            };
          }
        );
        setPlayers(normalised);
      }
    } catch (e) { console.error(e); }
  }, [tournamentId, token]);

  // ── Handle Registration Status Update ─────────────────────────────────────────
  const handleUpdatePlayerStatus = async (regId: string, status: "APPROVED" | "REJECTED") => {
    if (!window.confirm(`Are you sure you want to ${status.toLowerCase()} this registration?`)) return;
    
    try {
      const res = await fetch(`${API_BASE}/tournaments/${tournamentId}/registrations/${regId}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        showToast(`Registration ${status.toLowerCase()} successfully`);
        fetchPlayers(); // Refresh the players list
      } else {
        showToast("Failed to update registration status", false);
      }
    } catch (e) {
      console.error(e);
      showToast("Error updating registration", false);
    }
  };

  const handleDisqualifyPlayer = async (regId: string, currentWeight: string) => {
    if (!window.confirm(`Are you sure you want to disqualify this player due to weight mismatch?`)) return;
    
    setIsDisqualifying(true);
    try {
      const res = await fetch(`${API_BASE}/tournaments/${tournamentId}/registrations/${regId}/disqualify`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ currentWeight })
      });
      if (res.ok) {
        showToast(`Player disqualified successfully`);
        setSelectedWeighInPlayer(null);
        setActualWeight("");
        setWeighInSearch("");
        fetchPlayers(); // Refresh the players list
      } else {
        showToast("Failed to disqualify player", false);
      }
    } catch (e) {
      console.error(e);
      showToast("Error disqualifying player", false);
    } finally {
      setIsDisqualifying(false);
    }
  };

  // ── Messages / Replies ───────────────────────────────────────────────────────
  const fetchMessages = async (regId: string) => {
    try {
      const res = await fetch(`${API_BASE}/tournaments/${tournamentId}/registrations/${regId}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => ({ ...prev, [regId]: data }));
      }
    } catch (err) {
      console.error("Failed to fetch messages", err);
    }
  };

  const handleSendReply = async (regId: string) => {
    const message = replyTexts[regId]?.trim();
    if (!message) return;
    setReplyLoading((prev) => ({ ...prev, [regId]: true }));
    try {
      const res = await fetch(`${API_BASE}/tournaments/${tournamentId}/registrations/${regId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message }),
      });
      if (!res.ok) throw new Error("Failed to send reply");
      setReplyTexts((prev) => { const n = { ...prev }; delete n[regId]; return n; });
      await fetchMessages(regId);
      showToast("Reply sent to player.");
    } catch (err: any) {
      showToast(err.message || "Something went wrong", false);
    } finally {
      setReplyLoading((prev) => ({ ...prev, [regId]: false }));
    }
  };

  // ── Fetch existing draws ────────────────────────────────────────────────────
  const fetchDraws = useCallback(async () => {
    if (!tournamentId) return;
    try {
      const res = await fetch(`${API_BASE}/tournaments/${tournamentId}/draws`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const drawMap: Record<string, DrawCategory> = {};
        (Array.isArray(data) ? data : []).forEach((d: DrawCategory) => {
          let roundsArr = d.rounds;
          if (typeof roundsArr === "string") {
            try { roundsArr = JSON.parse(roundsArr); } catch (err) {}
          }
          if (!Array.isArray(roundsArr)) roundsArr = [];
          
          const ageStr = d.exactAge === 0 ? "ALL" : String(d.exactAge);
          drawMap[categoryKey(d.ageGroup, ageStr, d.gender, d.weightCategory)] = {
            ...d,
            rounds: processByeMatches(roundsArr),
            generated: roundsArr.length > 0, 
            saved: true,
          };
        });
        setDraws(drawMap);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [tournamentId, token]);

  useEffect(() => {
    fetchTournament();
    fetchPlayers();
    fetchDraws();
    fetchMats();
  }, [fetchTournament, fetchPlayers, fetchDraws, fetchMats]);

  // Auto-detect placements whenever the Results tab becomes active or draws/players update
  useEffect(() => {
    if (activeTab === "results") {
      autoDetectPlacements();
    }
  }, [activeTab, autoDetectPlacements]);

  useEffect(() => {
    if (activeTab === "mats") {
      fetchMats();
    }
  }, [activeTab, fetchMats]);

  // Polling for live bracket updates from the scoreboards
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (activeTab === "draws" && drawPhase === "idle" && !autoGenerating) {
      interval = setInterval(() => {
        fetchDraws();
      }, 10000); // 10 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeTab, drawPhase, autoGenerating, fetchDraws]);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const hasPendingPlayers = players.some((p) => p.status === "PENDING");
  const isMultiCategory = genderFilter === "BOTH" || weightFilter === "ALL" || ageFilter === "ALL";

  const filteredPlayers = players.filter((p) => {
    if (ageFilter !== "ALL" && p.ageGroup !== ageFilter) return false;
    if (exactAgeFilter !== "ALL" && String(p.exactAge) !== exactAgeFilter) return false;
    if (genderFilter !== "BOTH" && p.gender !== genderFilter) return false;
    if (weightFilter !== "ALL" && String(p.weight) !== weightFilter) return false;
    return true;
  });

  const eligiblePlayers = filteredPlayers.filter((p) => p.status === "APPROVED");
  // Only approved players should be shown in the draw generation tab's cards
  const drawPlayers = eligiblePlayers;

  const weightOptions = [...new Set(players.map((p) => String(p.weight)))].sort(
    (a, b) => +a - +b
  );
  const currentDraw = draws[currentKey];

  // Group players by category for Overview
  const categoriesMap = players.reduce((acc, p) => {
    if (p.status !== "APPROVED") return acc;
    const key = `${p.ageGroup} | ${p.gender} | ${p.weightLabel}`;
    if (!acc[key]) acc[key] = { label: key, count: 0, ageGroup: p.ageGroup, gender: p.gender };
    acc[key].count++;
    return acc;
  }, {} as Record<string, { label: string; count: number; ageGroup: string; gender: string }>);
  const groupedCategories = Object.values(categoriesMap).sort((a, b) => a.label.localeCompare(b.label));

  // ── Actions ─────────────────────────────────────────────────────────────────
  const handleAssignSeed = (seedNum: 1 | 2 | 3 | 4, player: RegisteredPlayer) => {
    setSeeds((prev) => {
      const n = { ...prev };
      (Object.keys(n) as unknown as (1 | 2 | 3 | 4)[]).forEach((k) => {
        if (n[k]?.id === player.id) n[k] = null;
      });
      n[seedNum] = { ...player, seedNumber: seedNum };
      return n;
    });
    setAssigningSeed(null);
  };

  const handleGenerateAndSaveDraw = async (
    isShuffle = false,
    isConfirmed = false,
    explicitCat?: { ageGroup: string; exactAge: string; gender: string; weightCategory: string; players: RegisteredPlayer[]; key: string; draw: DrawCategory | undefined },
    drawMethod?: DrawMethodType
  ) => {
    const activeKey = explicitCat ? explicitCat.key : currentKey;
    const activeDraw = explicitCat ? explicitCat.draw : currentDraw;
    const activePlayers = explicitCat ? explicitCat.players : eligiblePlayers;
    const activeAgeGrp = explicitCat ? explicitCat.ageGroup : ageFilter;
    const activeExactAge = explicitCat ? explicitCat.exactAge : exactAgeFilter;
    const activeGender = explicitCat ? explicitCat.gender : genderFilter;
    const activeWeight = explicitCat ? explicitCat.weightCategory : weightFilter;

    if (activePlayers.length < 2) {
      showToast("Need at least 2 approved players to generate a draw", false);
      return;
    }

    if (!explicitCat && isMultiCategory) {
      showToast("Please select a specific category (Age, Gender, Weight) to Generate or Shuffle the draw.", false);
      return;
    }

    const hasActive = activeDraw?.rounds?.some(r => r.some(m => m.status === "COMPLETED" || m.status === "IN_PROGRESS"));
    if (hasActive) {
      showToast("Cannot shuffle or re-generate because matches have already started or completed in this category!", false);
      return;
    }

    const defaultMethod = activePlayers.length <= 5 ? "round-robin" : "straight-elimination";
    const selectedMethod = drawMethod || (explicitCat ? (categoryDrawMethod[activeKey] || defaultMethod) : (detailDrawMethod || defaultMethod));

    if (isShuffle && activeDraw?.generated) {
      if (!isConfirmed) {
        setConfirmModal({
          isOpen: true,
          title: "Re-shuffle Bracket",
          message: "Are you sure you want to completely re-shuffle this bracket? All unsaved matches will be lost.",
          action: () => handleGenerateAndSaveDraw(isShuffle, true, explicitCat, selectedMethod)
        });
        return;
      }
    }

    setDrawPhase(isShuffle ? "shuffling" : "dealing");
    if (isShuffle) setShuffleKey(k => k + 1);
    
    let rounds;
    if (selectedMethod === "round-robin") {
      const shuffledPlayers = isShuffle ? shuffleArray(activePlayers) : activePlayers;
      rounds = generateRoundRobin(shuffledPlayers);
    } else {
      const shuffledPlayers = isShuffle ? clubSeparatedShuffle(activePlayers) : activePlayers;
      const rawRounds = generateIJFBracket(shuffledPlayers, seeds, "club-separated");
      rounds = processByeMatches(rawRounds);

      if ((selectedMethod === "single-repechage" || selectedMethod === "double-repechage") && rounds.length >= 2) {
        const totalRounds = rounds.length;

        if (selectedMethod === "double-repechage") {
          // Append Repechage Round 1 (2 matches)
          const repRound: BracketMatch[] = [
            {
              matchId: `rr_rep1_m1_${Date.now()}`,
              round: totalRounds + 1,
              matchNumber: 1,
              matNumber: 1,
              status: "PENDING",
              winnerId: null,
              slotA: { playerId: null, playerName: "Loser of QF 1", club: "", isBye: false },
              slotB: { playerId: null, playerName: "Loser of QF 2", club: "", isBye: false }
            },
            {
              matchId: `rr_rep1_m2_${Date.now()}`,
              round: totalRounds + 1,
              matchNumber: 2,
              matNumber: 1,
              status: "PENDING",
              winnerId: null,
              slotA: { playerId: null, playerName: "Loser of QF 3", club: "", isBye: false },
              slotB: { playerId: null, playerName: "Loser of QF 4", club: "", isBye: false }
            }
          ];

          // Append Bronze Matches (2 matches)
          const bronzeRound: BracketMatch[] = [
            {
              matchId: `rr_bronze1_${Date.now()}`,
              round: totalRounds + 2,
              matchNumber: 1,
              matNumber: 1,
              status: "PENDING",
              winnerId: null,
              slotA: { playerId: null, playerName: "Winner of Rep 1", club: "", isBye: false },
              slotB: { playerId: null, playerName: "Loser of Semifinal 2", club: "", isBye: false }
            },
            {
              matchId: `rr_bronze2_${Date.now()}`,
              round: totalRounds + 2,
              matchNumber: 2,
              matNumber: 1,
              status: "PENDING",
              winnerId: null,
              slotA: { playerId: null, playerName: "Winner of Rep 2", club: "", isBye: false },
              slotB: { playerId: null, playerName: "Loser of Semifinal 1", club: "", isBye: false }
            }
          ];

          rounds.push(repRound);
          rounds.push(bronzeRound);
        } else if (selectedMethod === "single-repechage") {
          // Append Repechage Round 1 (1 match)
          const repRound: BracketMatch[] = [
            {
              matchId: `rr_rep1_m1_${Date.now()}`,
              round: totalRounds + 1,
              matchNumber: 1,
              matNumber: 1,
              status: "PENDING",
              winnerId: null,
              slotA: { playerId: null, playerName: "Finalist's QF Loser", club: "", isBye: false },
              slotB: { playerId: null, playerName: "Finalist's SF Loser", club: "", isBye: false }
            }
          ];

          // Append Bronze Match (1 match)
          const bronzeRound: BracketMatch[] = [
            {
              matchId: `rr_bronze1_${Date.now()}`,
              round: totalRounds + 2,
              matchNumber: 1,
              matNumber: 1,
              status: "PENDING",
              winnerId: null,
              slotA: { playerId: null, playerName: "Winner of Rep 1", club: "", isBye: false },
              slotB: { playerId: null, playerName: "Loser of Finals (Runner-up)", club: "", isBye: false }
            }
          ];

          rounds.push(repRound);
          rounds.push(bronzeRound);
        }
      }
    }
    
    setTimeout(async () => {
      const newDraw = {
        ageGroup: activeAgeGrp,
        exactAge: activeDraw?.exactAge !== undefined ? activeDraw.exactAge : (activeExactAge === "ALL" ? 0 : Number(activeExactAge)),
        gender: activeGender,
        weightCategory: activeWeight,
        matNumber: activeDraw?.matNumber !== undefined ? activeDraw.matNumber : (pendingMatByKey[activeKey] ?? 1),
        rounds,
        generated: true,
        saved: false,
      };

      setDraws((prev) => ({ ...prev, [activeKey]: newDraw }));
      setDrawPhase("done");
      
      setSaving(true);
      try {
        const res = await fetch(`${API_BASE}/tournaments/${tournamentId}/draws`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            ageGroup: newDraw.ageGroup, 
            exactAge: newDraw.exactAge,
            gender: newDraw.gender,
            weightCategory: newDraw.weightCategory, 
            matNumber: newDraw.matNumber,
            rounds: newDraw.rounds,
          }),
        });
        if (res.ok) {
          const updatedDraw = await res.json();
          let backendRounds = updatedDraw.draw?.rounds || newDraw.rounds;
          if (typeof backendRounds === "string") {
            try { backendRounds = JSON.parse(backendRounds); } catch (err) {}
          }
          if (!Array.isArray(backendRounds)) backendRounds = newDraw.rounds;

          setDraws((prev) => ({
            ...prev,
            [activeKey]: {
              ...newDraw,
              rounds: backendRounds,
              saved: true
            }
          }));
          showToast(isShuffle ? "Bracket re-shuffled and auto-saved! 🏆" : "Draw generated and auto-saved! 🏆");
        } else {
          showToast("Failed to auto-save draw", false);
        }
      } catch { showToast("Error auto-saving draw", false); }
      finally { setSaving(false); }
    }, isShuffle ? 900 : 700);
  };

  const handleShuffle = () => handleGenerateAndSaveDraw(true);
  const handleGenerateDraw = () => handleGenerateAndSaveDraw(false);



  const openScoreboard = (match: BracketMatch) => {
    const p = new URLSearchParams({
      matchId: match.matchId,
      fighterAId:   match.slotA.playerId || "",
      fighterBId:   match.slotB.playerId || "",
      fighterAName: match.slotA.playerName,
      fighterBName: match.slotB.playerName,
      fighterAClub: match.slotA.club,
      fighterBClub: match.slotB.club,
      fighterACoach: match.slotA.coachName || "",
      fighterBCoach: match.slotB.coachName || "",
      weightCategory: weightFilter === "ALL" ? "" : `${weightFilter} kg`,
      ageGroup: ageFilter === "ALL" ? "" : ageFilter,
      gender: genderFilter === "ALL" ? "" : genderFilter,
      matchNumber: String(match.matchNumber),
      matNumber: String(match.matNumber),
      tournamentTitle: tournament?.title || "TNJA Championship",
      round: String(match.round),
    });
    window.open(
      `/dashboard/admin/tournaments/${tournamentId}/scoreboard?${p.toString()}`,
      "_blank"
    );
  };

  // ── Handle match result from scoreboard tab ──────────────────────────────────
  const handleMatchResult = useCallback((
    matchId: string, 
    winnerId: string, 
    winnerName: string, 
    winnerClub: string,
    scoreA?: any,
    scoreB?: any,
    winMethod?: string,
    elapsedSeconds?: number
  ) => {
    const prev = drawsRef.current;
    const newDraws = { ...prev };
    let affectedCatKey = "";

    for (const catKey of Object.keys(newDraws)) {
      const cat = newDraws[catKey];
      const newRounds: BracketMatch[][] = cat.rounds.map(r => r.map(m => ({ ...m })));

      let foundRi = -1, foundMi = -1;
      for (let ri = 0; ri < newRounds.length; ri++) {
        for (let mi = 0; mi < newRounds[ri].length; mi++) {
          if (newRounds[ri][mi].matchId === matchId) { foundRi = ri; foundMi = mi; break; }
        }
        if (foundRi !== -1) break;
      }
      if (foundRi === -1) continue;

      if (newRounds[foundRi][foundMi].status === "COMPLETED") {
        alert("This match is already completed and locked. You cannot change the winner.");
        return;
      }

      newRounds[foundRi][foundMi] = { 
        ...newRounds[foundRi][foundMi], 
        winnerId, 
        status: "COMPLETED",
        scoreA: scoreA || newRounds[foundRi][foundMi].scoreA,
        scoreB: scoreB || newRounds[foundRi][foundMi].scoreB,
        winMethod: winMethod || newRounds[foundRi][foundMi].winMethod,
        elapsedSeconds: elapsedSeconds !== undefined ? elapsedSeconds : newRounds[foundRi][foundMi].elapsedSeconds
      };

      // Determine if this is a Round Robin category or single-elimination category
      const isRR = isDrawRoundRobin(cat);
      const allRoundsCompleted = newRounds.every(r => r.every(m => m.status === "COMPLETED"));

      const hasDoubleRepechage = newRounds.some(r => r.some(m => m.matchId.startsWith("rr_rep1_m2")));
      const hasSingleRepechage = !hasDoubleRepechage && newRounds.some(r => r.some(m => m.matchId.startsWith("rr_rep")));
      const totalMainRounds = (hasDoubleRepechage || hasSingleRepechage) ? newRounds.length - 2 : newRounds.length;

      if (!isRR) {
        // Main single-elimination bracket progression:
        if (foundRi + 1 < totalMainRounds) {
          const nextMatchIdx = Math.floor(foundMi / 2);
          const winnerSlot: BracketSlot = { playerId: winnerId, playerName: winnerName, club: winnerClub, isBye: false, coachName: "" };
          const nextMatch = { ...newRounds[foundRi + 1][nextMatchIdx] };
          if (foundMi % 2 === 0) nextMatch.slotA = winnerSlot;
          else                   nextMatch.slotB = winnerSlot;
          newRounds[foundRi + 1][nextMatchIdx] = nextMatch;
        }

        // --- Double Repechage Progressions ---
        if (hasDoubleRepechage) {
          // Quarterfinals Loser -> Repechage Match
          if (foundRi === totalMainRounds - 3) {
            const repRoundIdx = totalMainRounds;
            const repMatchIdx = Math.floor(foundMi / 2);
            const currentMatch = newRounds[foundRi][foundMi];
            const loserId = winnerId === currentMatch.slotA.playerId ? currentMatch.slotB.playerId : currentMatch.slotA.playerId;
            const loserName = winnerId === currentMatch.slotA.playerId ? currentMatch.slotB.playerName : currentMatch.slotA.playerName;
            const loserClub = winnerId === currentMatch.slotA.playerId ? currentMatch.slotB.club : currentMatch.slotA.club;

            if (loserId) {
              const loserSlot = { playerId: loserId, playerName: loserName, club: loserClub, isBye: false };
              const targetMatch = { ...newRounds[repRoundIdx][repMatchIdx] };
              if (foundMi % 2 === 0) targetMatch.slotA = loserSlot;
              else                   targetMatch.slotB = loserSlot;
              newRounds[repRoundIdx][repMatchIdx] = targetMatch;
            }
          }

          // Semifinals Loser -> Crossover Bronze Match
          if (foundRi === totalMainRounds - 2) {
            const bronzeRoundIdx = totalMainRounds + 1;
            const targetBronzeMatchIdx = foundMi === 0 ? 1 : 0;
            const currentMatch = newRounds[foundRi][foundMi];
            const loserId = winnerId === currentMatch.slotA.playerId ? currentMatch.slotB.playerId : currentMatch.slotA.playerId;
            const loserName = winnerId === currentMatch.slotA.playerId ? currentMatch.slotB.playerName : currentMatch.slotA.playerName;
            const loserClub = winnerId === currentMatch.slotA.playerId ? currentMatch.slotB.club : currentMatch.slotA.club;

            if (loserId) {
              const loserSlot = { playerId: loserId, playerName: loserName, club: loserClub, isBye: false };
              const targetMatch = { ...newRounds[bronzeRoundIdx][targetBronzeMatchIdx] };
              targetMatch.slotB = loserSlot;
              newRounds[bronzeRoundIdx][targetBronzeMatchIdx] = targetMatch;
            }
          }

          // Repechage Round 1 Winner -> Bronze Match slotA
          if (foundRi === totalMainRounds) {
            const bronzeRoundIdx = totalMainRounds + 1;
            const targetBronzeMatchIdx = foundMi;
            const winnerSlot = { playerId: winnerId, playerName: winnerName, club: winnerClub, isBye: false };
            const targetMatch = { ...newRounds[bronzeRoundIdx][targetBronzeMatchIdx] };
            targetMatch.slotA = winnerSlot;
            newRounds[bronzeRoundIdx][targetBronzeMatchIdx] = targetMatch;
          }
        }

        // --- Single Repechage Progressions ---
        if (hasSingleRepechage) {
          // Finals Completed -> Traces Champion's path for Repechage and runner-up for Bronze slotB
          if (foundRi === totalMainRounds - 1) {
            const currentMatch = newRounds[foundRi][foundMi];
            const runnerUpId = winnerId === currentMatch.slotA.playerId ? currentMatch.slotB.playerId : currentMatch.slotA.playerId;
            const runnerUpName = winnerId === currentMatch.slotA.playerId ? currentMatch.slotB.playerName : currentMatch.slotA.playerName;
            const runnerUpClub = winnerId === currentMatch.slotA.playerId ? currentMatch.slotB.club : currentMatch.slotA.club;

            const bronzeRoundIdx = totalMainRounds + 1;
            const bronzeMatch = { ...newRounds[bronzeRoundIdx][0] };
            bronzeMatch.slotB = { playerId: runnerUpId, playerName: runnerUpName, club: runnerUpClub, isBye: false };
            newRounds[bronzeRoundIdx][0] = bronzeMatch;

            // Trace SF Loser
            const sfRoundIdx = totalMainRounds - 2;
            const sfMatch = newRounds[sfRoundIdx].find(m => m.slotA.playerId === winnerId || m.slotB.playerId === winnerId);
            if (sfMatch) {
              const sfLoserId = winnerId === sfMatch.slotA.playerId ? sfMatch.slotB.playerId : sfMatch.slotA.playerId;
              const sfLoserName = winnerId === sfMatch.slotA.playerId ? sfMatch.slotB.playerName : sfMatch.slotA.playerName;
              const sfLoserClub = winnerId === sfMatch.slotA.playerId ? sfMatch.slotB.club : sfMatch.slotA.club;

              const repRoundIdx = totalMainRounds;
              const repMatch = { ...newRounds[repRoundIdx][0] };
              repMatch.slotB = { playerId: sfLoserId, playerName: sfLoserName, club: sfLoserClub, isBye: false };
              newRounds[repRoundIdx][0] = repMatch;
            }

            // Trace QF Loser
            const qfRoundIdx = totalMainRounds - 3;
            if (qfRoundIdx >= 0) {
              const qfMatch = newRounds[qfRoundIdx].find(m => m.slotA.playerId === winnerId || m.slotB.playerId === winnerId);
              if (qfMatch) {
                const qfLoserId = winnerId === qfMatch.slotA.playerId ? qfMatch.slotB.playerId : qfMatch.slotA.playerId;
                const qfLoserName = winnerId === qfMatch.slotA.playerId ? qfMatch.slotB.playerName : qfMatch.slotA.playerName;
                const qfLoserClub = winnerId === qfMatch.slotA.playerId ? qfMatch.slotB.club : qfMatch.slotA.club;

                const repRoundIdx = totalMainRounds;
                const repMatch = { ...newRounds[repRoundIdx][0] };
                repMatch.slotA = { playerId: qfLoserId, playerName: qfLoserName, club: qfLoserClub, isBye: false };
                newRounds[repRoundIdx][0] = repMatch;
              }
            }
          }

          // Repechage Round 1 Winner -> Bronze Match slotA
          if (foundRi === totalMainRounds) {
            const bronzeRoundIdx = totalMainRounds + 1;
            const targetMatch = { ...newRounds[bronzeRoundIdx][0] };
            targetMatch.slotA = { playerId: winnerId, playerName: winnerName, club: winnerClub, isBye: false };
            newRounds[bronzeRoundIdx][0] = targetMatch;
          }
        }
      }

      if (isRR) {
        if (allRoundsCompleted) {
          const catPlayers = players.filter(p =>
            p.status === "APPROVED" &&
            p.ageGroup === cat.ageGroup &&
            (cat.exactAge === 0 || p.exactAge === cat.exactAge) &&
            p.gender === cat.gender &&
            String(p.weight) === cat.weightCategory
          );

          // Calculate standings to find the actual Round Robin winner
          const standingsMap: Record<string, {
            playerId: string;
            name: string;
            club: string;
            wins: number;
            points: number;
            totalWinningTime: number;
          }> = {};

          catPlayers.forEach(p => {
            standingsMap[p.id] = { playerId: p.id, name: p.name, club: p.club || "", wins: 0, points: 0, totalWinningTime: 0 };
          });

          const allMatches: BracketMatch[] = [];
          newRounds.forEach(r => {
            r.forEach(m => {
              allMatches.push(m);
              if (m.status === "COMPLETED") {
                const elapsed = m.elapsedSeconds || 0;
                const ptsA = m.scoreA ? ( (m.scoreA.ippon || 0) * 100 + (m.scoreA.wazaAri || 0) * 10 + (m.scoreA.yuko || 0) * 1 ) : 0;
                const ptsB = m.scoreB ? ( (m.scoreB.ippon || 0) * 100 + (m.scoreB.wazaAri || 0) * 10 + (m.scoreB.yuko || 0) * 1 ) : 0;

                if (m.slotA.playerId && standingsMap[m.slotA.playerId]) standingsMap[m.slotA.playerId].points += Math.min(ptsA, 100);
                if (m.slotB.playerId && standingsMap[m.slotB.playerId]) standingsMap[m.slotB.playerId].points += Math.min(ptsB, 100);

                if (m.winnerId && standingsMap[m.winnerId]) {
                  standingsMap[m.winnerId].wins += 1;
                  standingsMap[m.winnerId].totalWinningTime += elapsed;
                }
              }
            });
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

            const headToHead = allMatches.find(m => 
              m.status === "COMPLETED" && 
              ((m.slotA.playerId === a.playerId && m.slotB.playerId === b.playerId) ||
               (m.slotA.playerId === b.playerId && m.slotB.playerId === a.playerId))
            );
            if (headToHead && headToHead.winnerId) {
              return headToHead.winnerId === a.playerId ? -1 : 1;
            }

            return 0;
          });

          const rrChampion = sortedPlayers[0];
          const rrSecond = sortedPlayers[1];
          const rrThird = sortedPlayers[2];
          if (rrChampion) {
            setTimeout(() => setChampion({ 
              name: rrChampion.name, 
              club: rrChampion.club, 
              categoryKey: catKey,
              secondPlaceName: rrSecond?.name,
              secondPlaceClub: rrSecond?.club,
              thirdPlaceName: rrThird?.name,
              thirdPlaceClub: rrThird?.club
            }), 0);
          }
        }
      } else {
        // Single Elimination final round winner is champion
        if (foundRi === newRounds.length - 1) {
          setTimeout(() => setChampion({ name: winnerName, club: winnerClub, categoryKey: catKey }), 0);
        }
      }

      newDraws[catKey] = { ...cat, rounds: newRounds, saved: true };
      affectedCatKey = catKey;
      break;
    }

    drawsRef.current = newDraws;
    setDraws(newDraws);

    // Auto-save the affected draw so next-round matches persist after refresh
    if (affectedCatKey) {
      const draw = newDraws[affectedCatKey];
      fetch(`${API_BASE}/tournaments/${tournamentId}/draws`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          ageGroup: draw.ageGroup,
          exactAge: draw.exactAge !== undefined ? draw.exactAge : 0,
          gender: draw.gender,
          weightCategory: draw.weightCategory,
          matNumber: draw.matNumber !== undefined ? draw.matNumber : 1,
          rounds: draw.rounds,
        }),
      }).catch(() => {
        // mark unsaved if server save fails
        setDraws(d => ({ ...d, [affectedCatKey]: { ...d[affectedCatKey], saved: false } }));
      });
    }
  }, [token, tournamentId]);

  // Keep drawsRef in sync with draws state
  useEffect(() => { drawsRef.current = draws; }, [draws]);

  // ── Listen for results from scoreboard tab via BroadcastChannel ──────────────
  useEffect(() => {
    const channel = new BroadcastChannel("tnja_match_results");
    channel.onmessage = (e) => {
      const { matchId, winnerId, winnerName, winnerClub, scoreA, scoreB, winMethod, elapsedSeconds } = e.data;
      if (matchId && winnerName) handleMatchResult(matchId, winnerId, winnerName, winnerClub, scoreA, scoreB, winMethod, elapsedSeconds);
    };
    return () => channel.close();
  }, [handleMatchResult]);

  // ── Global Auto-Selection Effect ─────────────────────────────────────────────
  const ageGroupOrder = [
    "7-8 years",
    "8-9 years",
    "10-11 years",
    "mini sub-junior age group 1",
    "mini sub-junior age group 2",
    "mini sub-junior age group 3",
    "mini sub junior",
    "sub-junior",
    "sub junior",
    "cadet",
    "junior",
    "senior"
  ];
  const getAgeGroupRank = (age: string) => {
    const idx = ageGroupOrder.indexOf(age.toLowerCase());
    return idx === -1 ? 999 : idx;
  };

  const availableAgeGroupsGlobal = [...new Set(players.filter(p => genderFilter === "BOTH" || p.gender === genderFilter).map((p) => p.ageGroup))].sort((a, b) => getAgeGroupRank(a) - getAgeGroupRank(b) || a.localeCompare(b));
  
  useEffect(() => {
    if (availableAgeGroupsGlobal.length > 0 && (!availableAgeGroupsGlobal.includes(ageFilter) || ageFilter === "ALL")) {
      setAgeFilter(availableAgeGroupsGlobal[0]);
    }
  }, [genderFilter, availableAgeGroupsGlobal.join(",")]);

  const groupPlayersGlobal = players.filter(p => (genderFilter === "BOTH" || p.gender === genderFilter) && p.ageGroup === ageFilter);
  const availableWeightsGlobal = [...new Set(groupPlayersGlobal.map(p => String(p.weight)))].sort((a, b) => +a - +b);

  useEffect(() => {
    if (availableWeightsGlobal.length > 0 && !availableWeightsGlobal.includes(weightFilter) && weightFilter !== "ALL") {
      setWeightFilter("ALL");
    }
  }, [ageFilter, genderFilter, availableWeightsGlobal.join(",")]);

  // ── Category filters UI ─────────────────────────────────────────────────────
  const renderCategoryFilters = () => {
    // 1. Gender Selection
    const genders = ["BOTH", "MALE", "FEMALE"];
    // Auto-set gender if not in the list
    if (!genders.includes(genderFilter)) {
      setGenderFilter("BOTH");
    }

    // 2. Age Groups for selected gender
    const availableAgeGroups = availableAgeGroupsGlobal;

    // 3. Weights and Exact Ages for selected gender + ageGroup
    const groupPlayers = groupPlayersGlobal;
    const availableWeights = availableWeightsGlobal;
    const availableExactAges = [...new Set(groupPlayers.map(p => String(p.exactAge || 0)))].sort((a, b) => +a - +b);
    
    // Remove "0" from exact ages if it's there
    const filteredExactAges = availableExactAges.filter(a => a !== "0");

    return (
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-6">
        {/* Gender Toggle */}
        <div className="flex justify-start">
          <div className="bg-slate-100 p-1.5 rounded-xl flex gap-1">
            <button
              onClick={() => setGenderFilter("BOTH")}
              className={`px-4 py-2 rounded-lg font-black text-xs transition-all ${
                genderFilter === "BOTH"
                  ? "bg-slate-800 text-white shadow-sm shadow-slate-800/20"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Users size={14} /> BOTH
              </div>
            </button>
            <button
              onClick={() => setGenderFilter("MALE")}
              className={`px-4 py-2 rounded-lg font-black text-xs transition-all ${
                genderFilter === "MALE"
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-600/20"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <FaMale size={14} /> BOYS (MALE)
              </div>
            </button>
            <button
              onClick={() => setGenderFilter("FEMALE")}
              className={`px-4 py-2 rounded-lg font-black text-xs transition-all ${
                genderFilter === "FEMALE"
                  ? "bg-pink-600 text-white shadow-sm shadow-pink-600/20"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <FaFemale size={14} /> GIRLS (FEMALE)
              </div>
            </button>
          </div>
        </div>

        {/* Age Group Tabs */}
        {availableAgeGroups.length > 0 ? (
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3 text-left">Select Category</p>
            <div className="flex flex-wrap gap-2 justify-start">
              <button
                onClick={() => {
                  setAgeFilter("ALL");
                  setWeightFilter("ALL");
                  setExactAgeFilter("ALL");
                }}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all border ${
                  ageFilter === "ALL"
                    ? "bg-slate-800 text-white border-slate-800 shadow-lg"
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-400 hover:bg-slate-50"
                }`}
              >
                All Categories
              </button>
              {availableAgeGroups.map((age) => (
                <button
                  key={age}
                  onClick={() => {
                    setAgeFilter(age);
                    setWeightFilter("ALL");
                    setExactAgeFilter("ALL");
                  }}
                  className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all border ${
                    ageFilter === age
                      ? "bg-slate-800 text-white border-slate-800 shadow-lg"
                      : "bg-white text-slate-600 border-slate-200 hover:border-slate-400 hover:bg-slate-50"
                  }`}
                >
                  {age}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-center text-slate-500 font-bold py-4">No categories found for {genderFilter}</p>
        )}

        {/* Weight / Exact Age Flow */}
        {ageFilter !== "ALL" && (
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Weight / Age Sub-categories</p>
              <span className="text-xs font-bold text-orange-600 bg-orange-100 px-3 py-1 rounded-full">
                {eligiblePlayers.length} eligible / {groupPlayers.length} total in this category
              </span>
            </div>
            
            {/* 
            {filteredExactAges.length > 0 && (
              <div className="mb-5">
                <p className="text-xs font-bold text-slate-500 mb-2">Exact Ages</p>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => {
                      setExactAgeFilter("ALL");
                    }}
                    className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                      exactAgeFilter === "ALL"
                        ? "bg-orange-500 text-white border-orange-500 shadow-md"
                        : "bg-white text-slate-600 border-slate-200 hover:border-orange-300"
                    }`}
                  >
                    All Ages
                  </button>
                  {filteredExactAges.map(age => {
                    const count = groupPlayers.filter(p => String(p.exactAge) === age).length;
                    return (
                      <button
                        key={age}
                        onClick={() => {
                          setExactAgeFilter(age);
                        }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                          exactAgeFilter === age
                            ? "bg-orange-500 text-white border-orange-500 shadow-md"
                            : "bg-white text-slate-600 border-slate-200 hover:border-orange-300"
                        }`}
                      >
                        {age} Years <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px]">{count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            */}

            {availableWeights.length > 0 && availableWeights[0] !== "0" && (
              <div>
                <p className="text-xs font-bold text-slate-500 mb-2">Weights</p>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => {
                      setWeightFilter("ALL");
                    }}
                    className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                      weightFilter === "ALL"
                        ? "bg-[#FF7400] text-white border-[#FF7400] shadow-md shadow-orange-500/20"
                        : "bg-white text-slate-600 border-slate-200 hover:border-orange-300"
                    }`}
                  >
                    All Weights
                  </button>
                  {availableWeights.map((w) => {
                    const label = groupPlayers.find((p) => String(p.weight) === w)?.weightLabel || `${w} kg`;
                    const count = groupPlayers.filter(p => String(p.weight) === w).length;
                    const approvedCount = groupPlayers.filter(p => String(p.weight) === w && p.status === "APPROVED").length;
                    
                    return (
                      <button
                        key={w}
                        onClick={() => {
                          setWeightFilter(w);
                        }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                          weightFilter === w
                            ? "bg-[#FF7400] text-white border-[#FF7400] shadow-md shadow-orange-500/20"
                            : "bg-white text-slate-600 border-slate-200 hover:border-orange-300 hover:-translate-y-0.5"
                        }`}
                      >
                        {label} 
                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${weightFilter === w ? "bg-white/20" : "bg-slate-100 text-slate-500"}`}>
                          {approvedCount}/{count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const handlePrintBracket = () => {
    const bracketEl = document.getElementById('bracket-print-area');
    if (!bracketEl) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map(style => style.outerHTML)
      .join('\n');
      
    printWindow.document.write(`
      <html>
        <head>
          <title>Tournament Bracket</title>
          ${styles}
          <style>
            body { background: white !important; padding: 20px !important; overflow: visible !important; min-height: auto !important; height: auto !important; }
            .print-hidden, .print\\:hidden { display: none !important; }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            #bracket-print-area { overflow: visible !important; display: block !important; }
          </style>
        </head>
        <body>
          <h2 style="font-family: sans-serif; margin-bottom: 20px; text-align: center;">Bracket Report</h2>
          <div style="transform-origin: top left; transform: scale(0.85); margin: 0 auto; width: max-content;">
            ${bracketEl.outerHTML}
          </div>
          <script>
            setTimeout(() => {
              window.print();
              window.close();
            }, 1000);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // ── Expired check ────────────────────────────────────────────────────────────
  const expired = (() => {
    if (!tournament) return false;
    const end = tournament.dateTo || tournament.date;
    if (!end) return false;
    const d = new Date(end);
    d.setHours(23, 59, 59, 999);
    return d < new Date();
  })();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin text-[#FF7400]" size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 right-6 z-[200] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl text-white font-bold text-sm ${toast.ok ? "bg-emerald-600" : "bg-red-600"}`}>
            {toast.ok ? <Check size={18} /> : <X size={18} />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>      {/* Full-width dark header */}
      <div className="-mt-6 -mx-6 md:-mt-8 md:-mx-8 mb-6 bg-[#1A202C] text-white shadow-md">
        <div className="px-6 pt-6 pb-4 md:px-8 md:pt-8 md:pb-5">
          <div className="flex items-start gap-3 mb-6">
            <button onClick={() => router.back()}
              className="mt-1 text-slate-400 hover:text-white transition-colors">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-[28px] font-black text-white leading-none tracking-tight">{tournament?.title || "Tournament"}</h1>
              <p className="text-[12px] text-slate-400 font-bold mt-1.5 tracking-wide">Tournament Management Hub</p>
            </div>
          </div>

          {tournament && (
            <div>
              <div className="flex flex-wrap md:flex-nowrap items-center justify-between gap-6 px-2">
                {[
                  { icon: Calendar, label: "DATE", value: new Date(tournament.date).toLocaleDateString("en-GB") },
                  { icon: MapPin, label: "LOCATION", value: tournament.location },
                  { icon: Users, label: "PLAYERS", value: `${players.length}` },
                  { icon: Trophy, label: "LEVEL", value: tournament.level },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center shrink-0">
                      <Icon size={16} className="text-[#FF7400]" />
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-400 font-black tracking-widest uppercase mb-0.5">{label}</p>
                      <p className="text-[13px] font-bold text-white">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* CLOSED badge */}
              {tournament.status === "CLOSED" && (
                <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-3 px-2">
                  <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 border border-emerald-400/30 rounded-xl">
                    <Check size={15} className="text-emerald-400" />
                    <span className="text-emerald-300 font-black text-sm">Tournament Concluded — Certificates Available</span>
                  </div>
                </div>
              )}
              
              {/* Start Tournament Action */}
              {tournament.status !== "CLOSED" && (
                <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between gap-3 px-2">
                  <div className="text-[11px] font-bold text-slate-400">
                    {tournament.registrationClosed ? "Registrations are currently closed." : "Registrations are open."}
                  </div>
                  {!tournament.registrationClosed ? (
                    <button
                      onClick={() => setActiveTab("mats")}
                      className="flex items-center gap-2 px-4 py-2 bg-[#10B981] hover:bg-[#059669] text-white font-bold rounded-lg transition-all text-xs"
                    >
                      <PlayCircle size={14} /> Start Tournament (Close Registrations)
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-slate-300 font-bold rounded-lg text-xs">
                      <Lock size={14} /> Registrations Closed
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Expired banner */}
      {expired && (
        <div className="flex items-center gap-4 px-6 py-4 bg-slate-800 border border-slate-600 rounded-2xl">
          <div className="w-10 h-10 bg-slate-600 rounded-xl flex items-center justify-center shrink-0">
            <Clock size={24} className="text-slate-300" />
          </div>
          <div>
            <p className="text-white font-black text-sm">Tournament Expired</p>
            <p className="text-slate-400 text-xs font-semibold mt-0.5">
              This tournament date has passed. You can view details and results but cannot generate draws or open scoreboards.
            </p>
          </div>
        </div>
      )}


      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl w-fit flex-wrap">
        {(["overview", "players", "mats", "weigh-in", "draws", "matches", "results", "disqualify"] as Tab[]).map((tab) => {
          // Results tab is ALWAYS accessible — even for expired/CLOSED tournaments
          // Draws and matches are locked once the tournament date has passed
          const lockedByExpiry = expired && (tab === "draws" || tab === "matches");
          return (
            <button
              key={tab}
              onClick={() => !lockedByExpiry && setActiveTab(tab)}
              title={lockedByExpiry ? "Not available — tournament has expired" : undefined}
              className={`px-5 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-1.5 ${
                lockedByExpiry
                  ? "text-slate-300 cursor-not-allowed"
                  : activeTab === tab
                  ? "bg-white text-[#FF7400] shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {lockedByExpiry && <span className="text-[10px]">🔒</span>}
              {tab === "players" ? `Registrations (${players.length})` : tab === "draws" ? "Draw Generation" : tab === "results" ? "Results & Reports" : tab === "weigh-in" ? "Weigh-In" : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          );
        })}
      </div>

      {/* ══ OVERVIEW ══════════════════════════════════════════════════════════ */}
      {activeTab === "overview" && tournament && (() => {
        const isRegClosed = tournament.registrationClosed;
        const isMatsConfigured = tournamentMats.length > 0;
        const isOfficialsAssigned = tournamentMats.length > 0 && tournamentMats.every(m => m.refereeName);
        const isDrawGenerated = tournament.status === "STARTED" || tournament.status === "CLOSED";
        const isTournamentStarted = tournament.status === "STARTED" || tournament.status === "CLOSED";

        const progressSteps = [
          { title: "Registration", status: isRegClosed ? "Closed" : "Open", completed: isRegClosed },
          { title: "Mats", status: isMatsConfigured ? "Configured" : "Not Configured", completed: isMatsConfigured },
          { title: "Officials", status: isOfficialsAssigned ? "Assigned" : "Not Assigned", completed: isOfficialsAssigned },
          { title: "Draw", status: isDrawGenerated ? "Generated" : "Not Generated", completed: isDrawGenerated },
          { title: "Tournament", status: tournament.status === "CLOSED" ? "Completed" : tournament.status === "STARTED" ? "Started" : "Not Started", completed: isTournamentStarted }
        ];

        return (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-6">
            {/* Left Column: Tournament Info */}
            <div className="bg-white rounded-3xl p-6 lg:p-8 border border-slate-100 shadow-sm space-y-6">
              <h3 className="font-black text-slate-800 text-lg flex items-center gap-3">
                <LayoutList size={20} className="text-slate-400" /> Tournament Info
              </h3>
              <div className="space-y-1">
                {[
                  { l: "TITLE", v: tournament.title },
                  { l: "LEVEL", v: tournament.level },
                  { l: "GENDER", v: tournament.gender },
                  { l: "CATEGORY", v: tournament.category || "N/A" },
                  { l: "ENTRY FEE", v: `₹${tournament.entryFee}` },
                  { l: "STATUS", v: tournament.status },
                  { l: "BELT", v: tournament.beltEligibility || "NA" },
                  { l: "BPL ALLOWED", v: tournament.allowBPL ? "Yes" : "No" },
                ].map(({ l, v }) => (
                  <div key={l} className="flex justify-between py-4 border-b border-slate-50 last:border-0 items-center">
                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{l}</span>
                    {l === "STATUS" ? (
                      <span className={`text-[10px] font-black px-3 py-1 rounded-full ${
                        v === "APPROVED" ? "bg-emerald-100 text-emerald-700" :
                        v === "REJECTED" ? "bg-red-100 text-red-700" :
                        v === "CLOSED" ? "bg-blue-100 text-blue-700" :
                        "bg-amber-100 text-amber-700"
                      }`}>
                        {v}
                      </span>
                    ) : (
                      <span className="text-sm font-black text-slate-800 text-right max-w-[60%]">{v}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Tournament Progress & Actions */}
            <div className="bg-white rounded-3xl p-6 lg:p-8 border border-slate-100 shadow-sm space-y-8 flex flex-col">
              <h3 className="font-black text-slate-800 text-lg flex items-center gap-3">
                <Flag size={20} className="text-slate-400" /> Tournament Progress
              </h3>

              {/* Stepper */}
              <div className="relative pt-4 pb-6">
                <div className="absolute top-8 left-[8%] right-[8%] h-0.5 bg-slate-100 -z-10"></div>
                <div className="flex justify-between relative z-0">
                  {progressSteps.map((step, idx) => (
                    <div key={step.title} className="flex flex-col items-center w-24 gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 bg-white ${
                        step.completed ? "border-emerald-400 text-emerald-500" : "border-slate-200 border-dashed text-slate-300"
                      }`}>
                        {step.completed ? <Check size={18} className="stroke-[3]" /> : <div className="w-2 h-2 rounded-full bg-slate-200"></div>}
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-black text-slate-800">{step.title}</p>
                        <p className="text-[10px] font-semibold text-slate-500 mt-0.5">{step.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Info Box */}
              {!isTournamentStarted && (
                <div className="bg-blue-50/50 text-blue-600 px-5 py-4 rounded-xl flex gap-3 text-xs font-bold items-center border border-blue-100/50">
                  <Info size={18} className="shrink-0" />
                  Complete the pending steps to generate the draw and start the tournament.
                </div>
              )}

              {/* Quick Actions */}
              <div className="bg-[#FFF9F2] rounded-3xl p-6 lg:p-8 border border-[#FFE8CC]/50 flex-grow mt-2">
                <h4 className="font-black text-slate-800 text-base flex items-center gap-2 mb-6">
                  <Zap size={18} className="text-[#FF7400]" /> Quick Actions
                </h4>
                
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Configure Mats */}
                  <button 
                    onClick={() => setActiveTab("mats")}
                    className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col items-center text-center gap-2"
                  >
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center mb-1">
                      <LayoutList size={20} />
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-slate-800">Configure Mats</p>
                      <p className="text-[9px] font-bold text-slate-500 mt-0.5">Add & manage mats</p>
                    </div>
                  </button>

                  {/* Assign Officials */}
                  <button 
                    onClick={() => setActiveTab("mats")}
                    className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col items-center text-center gap-2"
                  >
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center mb-1">
                      <Users size={20} />
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-slate-800">Assign Officials</p>
                      <p className="text-[9px] font-bold text-slate-500 mt-0.5">Assign referees</p>
                    </div>
                  </button>

                  {/* Start Weigh-In */}
                  <button 
                    onClick={() => setActiveTab("weigh-in")}
                    className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col items-center text-center gap-2"
                  >
                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-500 flex items-center justify-center mb-1">
                      <Scale size={20} />
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-slate-800">Start Weigh-In</p>
                      <p className="text-[9px] font-bold text-slate-500 mt-0.5">Record weigh-in</p>
                    </div>
                  </button>

                  {/* Print Forms */}
                  <button 
                    onClick={() => {}}
                    className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col items-center text-center gap-2"
                  >
                    <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-500 flex items-center justify-center mb-1">
                      <Printer size={20} />
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-slate-800">Print Forms</p>
                      <p className="text-[9px] font-bold text-slate-500 mt-0.5">Download forms</p>
                    </div>
                  </button>
                </div>

                <div className="flex items-center gap-2 mt-6 text-[11px] font-bold text-slate-500">
                  <Lightbulb size={14} className="text-slate-400" /> These actions will help you move to the next stage.
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {/* ══ MATS & REFEREES ═══════════════════════════════════════════════════ */}
      {activeTab === "mats" && tournament && (() => {
        const totalMats = parseInt(matsCountInput) || 0;
        const matsConfigured = totalMats > 0 && matsConfirmed;
        const officialsAssigned = matsConfigured && tournamentMats.length === totalMats && tournamentMats.every(m => m.refereeName);
        const readyCount = (matsConfigured ? 1 : 0) + (officialsAssigned ? 1 : 0);
        // Only a genuinely closed/concluded tournament should skip the setup wizard —
        // "APPROVED" just means registration is open and mats haven't been configured yet.
        const isStarted = tournament.registrationClosed || tournament.status === "CLOSED";

        const saveMatAssignments = async (onDone?: () => void) => {
          setSavingMats(true);
          try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_BASE}/tournaments/${tournamentId}/mats`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
              body: JSON.stringify({ assignments: tournamentMats })
            });
            if (res.ok) {
              onDone?.();
            } else {
              showToast("Failed to save assignments", false);
            }
          } catch (e) {
            showToast("Error saving assignments", false);
          } finally {
            setSavingMats(false);
          }
        };

        const MatsManagementGrid = (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-6 border-t border-slate-100">
            {/* LEFT SIDE: MATS LIST */}
            <div className="col-span-1 md:border-r border-slate-100 md:pr-6 space-y-2">
              <h4 className="font-black text-slate-400 uppercase tracking-widest text-xs mb-4">Mats</h4>
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {Array.from({ length: totalMats }).map((_, i) => {
                  const matNum = i + 1;
                  const isSelected = selectedMatForAssignment === matNum;
                  const assigned = tournamentMats.find(m => m.matNumber === matNum && m.refereeName);
                  return (
                    <button
                      key={matNum}
                      onClick={() => {
                        setSelectedMatForAssignment(matNum);
                        setRefSearchQuery("");
                      }}
                      className={`w-full text-left px-5 py-4 rounded-2xl font-black transition-all flex justify-between items-center ${
                        isSelected
                          ? "bg-[#FF7400] text-white shadow-md scale-[1.02]"
                          : assigned
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100"
                            : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <span className="text-lg">Mat {matNum}</span>
                      {assigned ? (
                        <span className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded-md ${isSelected ? 'bg-orange-500 text-white' : 'bg-emerald-200 text-emerald-800'}`}>Assigned</span>
                      ) : (
                        <span className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded-md ${isSelected ? 'bg-orange-500 text-white' : 'bg-amber-100 text-amber-700'}`}>Open</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* RIGHT SIDE: REFEREE ASSIGNMENT */}
            <div className="col-span-1 md:col-span-2 md:pl-2">
              {selectedMatForAssignment ? (
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 space-y-6">
                  <div className="flex items-center gap-4 border-b border-slate-200 pb-5">
                    <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center text-[#FF7400] font-black text-xl">
                      {selectedMatForAssignment}
                    </div>
                    <h4 className="font-black text-slate-800 text-xl">Assign Referee</h4>
                  </div>

                  {(() => {
                    const assigned = tournamentMats.find(m => m.matNumber === selectedMatForAssignment && m.refereeName);
                    return assigned ? (
                      <div className="bg-white p-6 rounded-2xl border border-emerald-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                          <p className="text-[11px] font-black text-emerald-600 uppercase tracking-widest mb-1.5">Current Referee</p>
                          <p className="font-black text-slate-800 text-2xl">{assigned.refereeName}</p>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                          <button
                            onClick={() => {
                              setTournamentMats(prev => prev.filter(m => m.matNumber !== selectedMatForAssignment));
                              setRefSearchQuery("");
                            }}
                            className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-4 py-3 bg-slate-100 text-slate-600 hover:text-[#FF7400] hover:bg-orange-50 rounded-xl transition-colors font-bold text-sm"
                          >
                            <Edit2 size={16} /> Change
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm("Remove this referee assignment?")) {
                                setTournamentMats(prev => prev.filter(m => m.matNumber !== selectedMatForAssignment));
                              }
                            }}
                            className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-4 py-3 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl transition-colors font-bold text-sm"
                          >
                            <X size={16} /> Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Registered Coaches / Referees</label>
                        <div className="relative">
                          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            value={refSearchQuery}
                            onChange={(e) => setRefSearchQuery(e.target.value)}
                            placeholder="Filter by name or ID... e.g. Priya or REF-20"
                            autoComplete="off"
                            className="w-full pl-11 pr-5 py-4 bg-white border border-slate-300 rounded-2xl font-bold focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 shadow-sm text-slate-800 text-lg"
                          />
                          {refSearching && <Loader2 size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />}
                        </div>

                        {/* Always-visible roster list — shows registered coach name + ID pairs
                            for easy mat mapping, narrowed down as the admin types above. */}
                        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden max-h-72 overflow-y-auto">
                          {refSearchResults.length === 0 ? (
                            <div className="px-5 py-4 text-sm font-bold text-slate-400">
                              {refSearching ? "Loading…" : refSearchQuery.trim() ? `No referee matches "${refSearchQuery}"` : "No approved referees found."}
                            </div>
                          ) : (
                            refSearchResults.map(r => (
                              <button
                                key={r.id}
                                onClick={() => assignRefereeToMat(selectedMatForAssignment!, r)}
                                className="w-full flex items-center gap-3 px-5 py-3 hover:bg-orange-50 transition-colors text-left border-b border-slate-50 last:border-0"
                              >
                                <div className="w-9 h-9 rounded-full bg-orange-100 text-[#FF7400] flex items-center justify-center font-black text-xs shrink-0">
                                  {r.name.split(" ").map(p => p[0]).slice(-2).join("").toUpperCase()}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="font-black text-slate-800 text-sm truncate">{r.name}</p>
                                  <p className="text-[11px] font-bold text-slate-400 truncate">{r.club}, {r.district}</p>
                                </div>
                                <span className="text-[11px] font-black text-[#FF7400] bg-orange-50 px-2.5 py-1 rounded-md shrink-0">{r.refId}</span>
                              </button>
                            ))
                          )}
                        </div>
                        <p className="text-xs font-bold text-slate-400 pt-1">Only referees approved for tournament duty appear here.</p>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-slate-400 font-bold p-8 bg-slate-50/50 rounded-3xl border-2 border-slate-200 border-dashed text-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <AlertCircle size={32} className="text-slate-300" />
                  </div>
                  <p className="text-lg text-slate-500">Select a mat from the left</p>
                  <p className="text-sm font-normal mt-1">to search and assign a referee</p>
                </div>
              )}
            </div>
          </div>
        );

        if (isStarted) {
          return (
            <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-2">
                <h3 className="font-black text-slate-800 text-xl">Mats & Officials Management</h3>
                <button
                  onClick={() => saveMatAssignments(() => showToast("Assignments saved!", true))}
                  disabled={savingMats}
                  className="bg-[#10B981] hover:bg-[#059669] text-white px-6 py-3 rounded-xl font-black transition-all flex items-center gap-2"
                >
                  {savingMats && <Loader2 className="animate-spin" size={16} />}
                  Save Changes
                </button>
              </div>
              {MatsManagementGrid}
            </div>
          );
        }

        return (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Stepper — visible once the wizard has started */}
            {wizardStep > 0 && (
              <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-100 shadow-sm px-6 py-4">
                {([[1, "Mats"], [2, "Officials"], [3, "Review & Start"]] as const).map(([n, label], idx) => {
                  const isDone = wizardStep > n;
                  const isActive = wizardStep === n;
                  return (
                    <React.Fragment key={n}>
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shrink-0 transition-colors ${
                          isDone ? "bg-emerald-500 text-white" : isActive ? "bg-[#FF7400] text-white" : "bg-slate-100 text-slate-400"
                        }`}>
                          {isDone ? <CheckCircle2 size={16} /> : n}
                        </div>
                        <span className={`text-xs font-black uppercase tracking-wide hidden sm:inline ${isDone || isActive ? "text-slate-700" : "text-slate-400"}`}>
                          {label}
                        </span>
                      </div>
                      {idx < 2 && <div className={`flex-1 h-0.5 mx-3 rounded-full ${wizardStep > n ? "bg-emerald-400" : "bg-slate-100"}`} />}
                    </React.Fragment>
                  );
                })}
              </div>
            )}

            {/* Step 0: Readiness overview */}
            {wizardStep === 0 && (
              <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-black text-slate-800 text-xl mb-1">Let&apos;s get {tournament?.title || "this tournament"} ready</h3>
                    <p className="text-slate-500 font-bold text-sm">
                      {tournament.registrationClosed
                        ? "Registration is closed. A couple of quick steps before matches can begin."
                        : "Registration is still open. Set up mats and officials, then close registration to start."}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="w-28 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#FF7400] rounded-full transition-all" style={{ width: `${(readyCount / 2) * 100}%` }} />
                    </div>
                    <span className="text-xs font-black text-slate-500 whitespace-nowrap">{readyCount} of 2 ready</span>
                  </div>
                </div>

                <div className="space-y-4 pt-6 border-t border-slate-100">
                  <div className="flex items-center gap-3">
                    {tournament.registrationClosed ? (
                      <CheckCircle2 size={22} className="text-emerald-500 shrink-0" />
                    ) : (
                      <div className="w-[22px] h-[22px] rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-[11px] font-black shrink-0">•</div>
                    )}
                    <span className={`font-black text-base ${tournament.registrationClosed ? "text-slate-700" : "text-slate-400"}`}>
                      {tournament.registrationClosed ? "Registration closed" : "Registration open — closes when you start below"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {matsConfigured ? (
                      <CheckCircle2 size={22} className="text-emerald-500 shrink-0" />
                    ) : (
                      <div className="w-[22px] h-[22px] rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-[11px] font-black shrink-0">1</div>
                    )}
                    <span className="font-black text-base text-slate-700">
                      {matsConfigured ? `Mats — ${totalMats} configured` : "Mats — not set up yet"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {officialsAssigned ? (
                      <CheckCircle2 size={22} className="text-emerald-500 shrink-0" />
                    ) : (
                      <div className="w-[22px] h-[22px] rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-[11px] font-black shrink-0">2</div>
                    )}
                    <span className="font-black text-base text-slate-700">
                      {officialsAssigned ? "Match officials — all assigned" : "Match officials — not assigned yet"}
                    </span>
                  </div>
                </div>

                <div className="pt-4">
                  <button onClick={() => setWizardStep(1)} className="py-4 px-10 bg-[#FF7400] text-white font-black rounded-xl shadow-lg hover:scale-[1.02] transition-all">
                    {matsConfigured ? "Update setup →" : "Continue setup →"}
                  </button>
                </div>
              </div>
            )}

            {/* Step 1: Configure Mats */}
            {wizardStep === 1 && (
              <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-6">
                <div>
                  <h3 className="font-black text-slate-800 text-xl mb-2">How many mats will run today?</h3>
                  <p className="text-slate-500 font-bold text-sm">Each mat runs matches in parallel — this decides how many officials you&apos;ll need next.</p>
                </div>
                <div className="pt-6 border-t border-slate-100">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Total Mats</label>
                  <input
                    type="number"
                    min="1"
                    value={matsCountInput}
                    onChange={(e) => setMatsCountInput(e.target.value)}
                    placeholder="e.g. 4"
                    className="w-full max-w-[200px] px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50"
                  />
                  <div className="flex gap-2 mt-4">
                    {[2, 4, 6, 8].map(n => (
                      <button
                        key={n}
                        onClick={() => setMatsCountInput(n.toString())}
                        className={`px-4 py-2 rounded-xl font-black text-sm border transition-colors ${
                          matsCountInput === n.toString()
                            ? "bg-orange-50 border-[#FF7400] text-[#FF7400]"
                            : "bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300"
                        }`}
                      >
                        {n} mats
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-4 pt-8">
                  <button onClick={() => setWizardStep(0)} className="px-8 py-4 bg-slate-100 text-slate-600 font-black rounded-xl hover:bg-slate-200 transition-colors">Back</button>
                  <button
                    onClick={() => {
                      if (parseInt(matsCountInput) > 0) {
                        setMatsConfirmed(true);
                        if (!selectedMatForAssignment) setSelectedMatForAssignment(1);
                        setWizardStep(2);
                      } else {
                        showToast("Please enter a valid number of mats.", false);
                      }
                    }}
                    disabled={!matsCountInput}
                    className="px-10 py-4 bg-[#FF7400] text-white font-black rounded-xl shadow-lg disabled:opacity-50 transition-all hover:scale-[1.02]"
                  >
                    Continue →
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Assign Officials */}
            {wizardStep === 2 && (
              <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-2">
                  <div>
                    <h3 className="font-black text-slate-800 text-xl">Assign a referee to each mat</h3>
                    <p className="text-slate-500 font-bold text-sm mt-1">Search by name or referee ID — you can change any assignment later from this screen.</p>
                  </div>
                  <button onClick={() => setWizardStep(1)} className="text-sm text-[#FF7400] font-black hover:underline w-fit shrink-0">Edit Total Mats</button>
                </div>

                {MatsManagementGrid}

                {!officialsAssigned && (
                  <p className="text-xs font-bold text-slate-400 pt-2">
                    Not all referees confirmed yet? That&apos;s fine — you can leave mats open and assign them later, before matches start on that mat.
                  </p>
                )}

                <div className="pt-8 flex gap-4 border-t border-slate-100 mt-8">
                  <button onClick={() => setWizardStep(1)} className="px-8 py-4 bg-slate-100 text-slate-600 font-black rounded-xl hover:bg-slate-200 transition-colors">Back</button>
                  <button
                    onClick={() => saveMatAssignments(() => setWizardStep(3))}
                    disabled={savingMats}
                    className="flex-1 py-4 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl shadow-xl flex items-center justify-center gap-2 transition-transform hover:scale-[1.01]"
                  >
                    {savingMats && <Loader2 className="animate-spin" size={20} />}
                    Continue to Review →
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Review & Start */}
            {wizardStep === 3 && (
              <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-6">
                <div>
                  <h3 className="font-black text-slate-800 text-xl mb-1">Review before you start</h3>
                  <p className="text-slate-500 font-bold text-sm">Double-check mat count and referees — you can still edit anything below.</p>
                </div>

                <div className="pt-6 border-t border-slate-100 overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr>
                        <th className="text-[11px] font-black text-slate-400 uppercase tracking-widest pb-3">Mat</th>
                        <th className="text-[11px] font-black text-slate-400 uppercase tracking-widest pb-3">Referee</th>
                        <th className="pb-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: totalMats }, (_, i) => i + 1).map(matNum => {
                        const assigned = tournamentMats.find(m => m.matNumber === matNum && m.refereeName);
                        return (
                          <tr key={matNum} className="border-t border-slate-100">
                            <td className="py-3 font-black text-slate-800">Mat {matNum}</td>
                            <td className="py-3 font-bold text-slate-700">
                              {assigned ? assigned.refereeName : (
                                <span className="text-[11px] font-black uppercase tracking-widest px-2 py-1 rounded-md bg-amber-100 text-amber-700">Unassigned</span>
                              )}
                            </td>
                            <td className="py-3 text-right">
                              <button
                                onClick={() => { setSelectedMatForAssignment(matNum); setWizardStep(2); }}
                                className="text-xs font-black text-[#FF7400] hover:underline"
                              >
                                Edit
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex gap-3 p-5 bg-amber-50 border border-amber-200 rounded-2xl">
                  <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-sm font-bold text-amber-800 leading-relaxed">
                    Starting closes registration and locks today&apos;s bracket draw. Players can no longer register, and the draw can&apos;t be regenerated once matches begin.
                  </p>
                </div>

                <div className="pt-4 flex gap-4">
                  <button onClick={() => setWizardStep(2)} className="px-8 py-4 bg-slate-100 text-slate-600 font-black rounded-xl hover:bg-slate-200 transition-colors">Back</button>
                  <button
                    onClick={() => {
                      setConfirmModal({
                        isOpen: true,
                        title: "Close Registration & Start Tournament",
                        message: "This closes registration and locks today's bracket draw.\nPlayers will no longer be able to register, and the draw can't be regenerated once matches begin.\n\nAre you sure you want to proceed?",
                        action: async () => {
                          try {
                            const token = localStorage.getItem("token");
                            const res = await fetch(`${API_BASE}/tournaments/${tournamentId}/start`, {
                              method: "PUT",
                              headers: { Authorization: `Bearer ${token}` }
                            });
                            if (res.ok) {
                              showToast("Tournament started! Registrations closed.", true);
                              fetchTournament();
                              fetchPlayers();
                              setActiveTab("overview");
                              setWizardStep(0); // Reset wizard state
                            } else {
                              const err = await res.json();
                              showToast(err.error || "Failed to start", false);
                            }
                          } catch (e) {
                            showToast("Failed to start", false);
                          }
                        }
                      });
                    }}
                    className="flex-1 py-4 bg-[#10B981] hover:bg-[#059669] text-white font-black text-lg rounded-xl shadow-xl shadow-emerald-500/20 hover:scale-[1.01] transition-all flex items-center justify-center gap-2"
                  >
                    Start Tournament
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })()}
      {/* ══ WEIGH-IN & DISQUALIFICATION ═════════════════════════════════════════════════ */}
      {activeTab === "weigh-in" && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-6">
            <h3 className="font-black text-slate-800 text-base mb-2">Player Weigh-In</h3>
            
            <div className="relative">
              <input
                type="text"
                value={weighInSearch}
                onChange={(e) => setWeighInSearch(e.target.value)}
                placeholder="Search approved player by Name or ID..."
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 font-semibold"
              />
              {weighInSearch.trim().length >= 2 && !selectedWeighInPlayer && (
                <div className="absolute top-full left-0 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-lg max-h-64 overflow-y-auto z-10">
                  {players.filter(p => p.status === "APPROVED" && (p.name.toLowerCase().includes(weighInSearch.toLowerCase()) || (p.tnjaId && p.tnjaId.toLowerCase().includes(weighInSearch.toLowerCase())))).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => { setSelectedWeighInPlayer(p); setWeighInSearch(""); setActualWeight(""); }}
                      className="w-full text-left px-4 py-3 border-b border-slate-100 hover:bg-slate-50 flex justify-between items-center"
                    >
                      <div>
                        <p className="font-bold text-slate-800">{p.name}</p>
                        <p className="text-xs text-slate-500 font-semibold">{p.tnjaId} • {p.club}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-slate-700">{p.ageGroup}</p>
                        <p className="text-xs font-black text-[#FF7400]">{p.gender} • {p.weightLabel}</p>
                      </div>
                    </button>
                  ))}
                  {players.filter(p => p.status === "APPROVED" && (p.name.toLowerCase().includes(weighInSearch.toLowerCase()) || (p.tnjaId && p.tnjaId.toLowerCase().includes(weighInSearch.toLowerCase())))).length === 0 && (
                    <div className="px-4 py-3 text-sm text-slate-500 font-semibold">No approved player found matching "{weighInSearch}"</div>
                  )}
                </div>
              )}
            </div>

            {!selectedWeighInPlayer && weighInSearch.trim().length < 2 && (
              <div className="bg-slate-50 rounded-3xl p-10 border border-slate-200 border-dashed text-center space-y-4">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm text-slate-300">
                  <Search size={32} />
                </div>
                <h4 className="text-xl font-black text-slate-700">Search to Start Weigh-In</h4>
                <p className="text-sm font-semibold text-slate-500 max-w-sm mx-auto">
                  Type a player's name or TNJA ID in the search box above to verify their scale weight and ensure they match their registered category.
                </p>
              </div>
            )}

            {selectedWeighInPlayer && (
              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h4 className="text-xl font-black text-slate-800">{selectedWeighInPlayer.name}</h4>
                    <p className="text-sm font-bold text-slate-500">{selectedWeighInPlayer.tnjaId} • {selectedWeighInPlayer.club}</p>
                  </div>
                  <button onClick={() => setSelectedWeighInPlayer(null)} className="p-1 hover:bg-slate-200 rounded-lg text-slate-500">
                    <X size={20} />
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                    <p className="text-[10px] uppercase font-black text-slate-400">Gender</p>
                    <p className="font-bold text-slate-700">{selectedWeighInPlayer.gender}</p>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                    <p className="text-[10px] uppercase font-black text-slate-400">Age Group</p>
                    <p className="font-bold text-slate-700">{selectedWeighInPlayer.ageGroup}</p>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                    <p className="text-[10px] uppercase font-black text-slate-400">Registered Weight</p>
                    <p className="font-black text-blue-600">{selectedWeighInPlayer.weightLabel}</p>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                    <p className="text-[10px] uppercase font-black text-slate-400">Status</p>
                    <p className="font-bold text-emerald-600">Approved</p>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <label className="block text-sm font-black text-slate-800 mb-2">Enter Actual Scale Weight (kg)</label>
                  <div className="flex gap-4 items-start">
                    <div className="flex-1">
                      <input
                        type="number"
                        step="0.1"
                        value={actualWeight}
                        onChange={(e) => setActualWeight(e.target.value)}
                        placeholder="e.g. 66.5"
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:border-[#FF7400] font-bold text-lg"
                      />
                    </div>
                    <div className="flex-1 pt-1">
                      {actualWeight ? (
                        (() => {
                          const w = Number(actualWeight);
                          const targetWeight = selectedWeighInPlayer.weightLabel === "Under 50" ? 50 : Number(selectedWeighInPlayer.weightLabel?.split("-")[1] || selectedWeighInPlayer.weightLabel?.replace("kg", "") || 0);
                          const minWeight = selectedWeighInPlayer.weightLabel === "Under 50" ? 0 : Number(selectedWeighInPlayer.weightLabel?.split("-")[0] || 0) - 0.99;
                          
                          const isMatch = w <= targetWeight && w > minWeight;
                          return isMatch ? (
                            <div className="flex items-center gap-2 text-emerald-600 font-bold bg-emerald-50 px-4 py-2.5 rounded-xl">
                              <Check size={18} /> Weight is acceptable
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-red-600 font-bold bg-red-50 px-4 py-2.5 rounded-xl">
                              <AlertCircle size={18} /> Exceeds category limit!
                            </div>
                          );
                        })()
                      ) : (
                        <p className="text-sm text-slate-400 font-semibold mt-2 italic">Waiting for input...</p>
                      )}
                    </div>
                  </div>

                  {actualWeight && (
                    (() => {
                      const w = Number(actualWeight);
                      const targetWeight = selectedWeighInPlayer.weightLabel === "Under 50" ? 50 : Number(selectedWeighInPlayer.weightLabel?.split("-")[1] || selectedWeighInPlayer.weightLabel?.replace("kg", "") || 0);
                      const minWeight = selectedWeighInPlayer.weightLabel === "Under 50" ? 0 : Number(selectedWeighInPlayer.weightLabel?.split("-")[0] || 0) - 0.99;
                      
                      const isMatch = w <= targetWeight && w > minWeight;
                      if (!isMatch) {
                        return (
                          <div className="mt-6 pt-6 border-t border-red-100">
                            <p className="text-sm text-red-600 font-bold mb-3">
                              Player weight ({w}kg) does not match the registered category ({selectedWeighInPlayer.weightLabel}). 
                              You may disqualify this player from the tournament.
                            </p>
                            <button 
                              onClick={() => selectedWeighInPlayer.regId && handleDisqualifyPlayer(selectedWeighInPlayer.regId, actualWeight)}
                              disabled={isDisqualifying}
                              className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl shadow-md transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                              {isDisqualifying ? <Loader2 className="animate-spin" size={16} /> : <X size={16} />}
                              Disqualify Player
                            </button>
                          </div>
                        );
                      }
                      return null;
                    })()
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ REGISTRATIONS (PLAYERS) ═══════════════════════════════════════════════════════════ */}
      {activeTab === "players" && (
        <div className="space-y-6">
          {/* Top Layout: Stats + Filters */}
          <div className="flex flex-col lg:flex-row gap-6">
            
            {/* Total Players Card */}
            <div className="w-full lg:w-64 shrink-0 bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center">
                  <Users size={20} />
                </div>
                <p className="text-sm font-bold text-blue-500">Total Players</p>
              </div>
              <p className="text-4xl font-black text-slate-800">{players.length}</p>
            </div>

            {/* Filters Section */}
            <div className="flex-grow min-w-0 bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between space-y-4 lg:space-y-0">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative flex-grow w-full">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by Name, TNJA ID, Club..."
                    value={regSearchQuery}
                    onChange={e => { setRegSearchQuery(e.target.value); setRegCurrentPage(1); }}
                    className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF7400]/50 transition-all font-semibold text-sm"
                  />
                </div>
                
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsAddPlayerOpen(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-all hover:bg-slate-50 active:scale-[0.98]"
                  >
                    <Users size={16} />
                    Add Player
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsImportWizardOpen(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-[#FF7400] text-white font-bold rounded-xl text-sm transition-all shadow-sm shadow-[#FF7400]/20 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Upload size={16} />
                    Import Players
                  </button>
                </div>

                <div className="flex items-center gap-2 text-slate-500 font-bold text-sm shrink-0 ml-2">
                  <FilterX size={18} /> Filters
                  <button 
                    onClick={() => {
                      setRegSearchQuery("");
                      setRegDistrictFilter("All Districts");
                      setRegClubFilter("All Clubs");
                      setRegGenderFilter("All Genders");
                      setRegCategoryFilter("All Categories");
                      setRegBeltFilter("All Belts");
                      setRegPaymentFilter("All Payment Status");
                      setRegCurrentPage(1);
                    }}
                    className="text-red-500 hover:text-red-600 ml-4 text-xs"
                  >
                    Clear All
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                {[
                  { label: "District", value: regDistrictFilter, setter: setRegDistrictFilter, options: ["All Districts", ...new Set(players.map(p => p.district).filter(Boolean))] },
                  { label: "Club", value: regClubFilter, setter: setRegClubFilter, options: ["All Clubs", ...new Set(players.map(p => p.club).filter(Boolean))] },
                  { label: "Gender", value: regGenderFilter, setter: setRegGenderFilter, options: ["All Genders", "MALE", "FEMALE"] },
                  { label: "Category", value: regCategoryFilter, setter: setRegCategoryFilter, options: ["All Categories", ...new Set(players.map(p => p.ageGroup).filter(Boolean))] },
                  { label: "Belt", value: regBeltFilter, setter: setRegBeltFilter, options: ["All Belts", ...new Set(players.map(p => p.belt).filter(Boolean))] },
                  { label: "Payment Status", value: regPaymentFilter, setter: setRegPaymentFilter, options: ["All Payment Status", "Paid", "Pending"] },
                ].map(filter => (
                  <div key={filter.label} className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">{filter.label}</label>
                    <select
                      value={filter.value}
                      onChange={(e) => { filter.setter(e.target.value); setRegCurrentPage(1); }}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-[#FF7400] transition-colors"
                    >
                      {filter.options.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    {["TNJA ID", "Name", "District", "Club", "Category", "Belt", "Payment Status", "Registration Date", "Actions"].map((h) => (
                      <th key={h} className="px-5 py-4 text-left text-[11px] font-black text-slate-600">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {(() => {
                    let filtered = players.filter(p => {
                      if (regSearchQuery && !p.name.toLowerCase().includes(regSearchQuery.toLowerCase()) && !p.tnjaId?.toLowerCase().includes(regSearchQuery.toLowerCase()) && !p.club.toLowerCase().includes(regSearchQuery.toLowerCase())) return false;
                      if (regDistrictFilter !== "All Districts" && p.district !== regDistrictFilter) return false;
                      if (regClubFilter !== "All Clubs" && p.club !== regClubFilter) return false;
                      if (regGenderFilter !== "All Genders" && p.gender !== regGenderFilter) return false;
                      if (regCategoryFilter !== "All Categories" && p.ageGroup !== regCategoryFilter) return false;
                      if (regBeltFilter !== "All Belts" && p.belt !== regBeltFilter) return false;
                      return true;
                    });
                    
                    const totalItems = filtered.length;
                    const paginated = filtered.slice((regCurrentPage - 1) * regItemsPerPage, regCurrentPage * regItemsPerPage);

                    if (paginated.length === 0) {
                      return (
                        <tr>
                          <td colSpan={9} className="px-5 py-10 text-center text-slate-400 font-bold">No players found matching your filters.</td>
                        </tr>
                      );
                    }

                    return paginated.map(p => {
                      let dotColor = "bg-slate-300";
                      const b = p.belt?.toLowerCase() || "";
                      if (b.includes("blue")) dotColor = "bg-blue-500";
                      else if (b.includes("brown")) dotColor = "bg-amber-800";
                      else if (b.includes("green")) dotColor = "bg-green-600";
                      else if (b.includes("yellow")) dotColor = "bg-yellow-400";
                      else if (b.includes("black")) dotColor = "bg-black";
                      else if (b.includes("orange")) dotColor = "bg-orange-500";

                      return (
                      <React.Fragment key={p.id}>
                        <tr className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-5 py-4 text-sm font-semibold text-slate-500">{p.tnjaId || "—"}</td>
                          <td className="px-5 py-4 text-sm font-semibold text-slate-800">{p.name}</td>
                          <td className="px-5 py-4 text-sm font-semibold text-slate-500">{p.district || "—"}</td>
                          <td className="px-5 py-4 text-sm font-semibold text-slate-500">{p.club || "—"}</td>
                          <td className="px-5 py-4 text-sm font-semibold text-slate-500">{p.ageGroup}</td>
                          <td className="px-5 py-4 text-sm font-semibold text-slate-500">
                            {p.belt ? (
                              <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${dotColor}`}></span>
                                {p.belt}
                              </div>
                            ) : "—"}
                          </td>
                          <td className="px-5 py-4">
                            {p.isPaid ? (
                              <span className="bg-emerald-50 text-emerald-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">Paid</span>
                            ) : (
                              <span className="bg-amber-50 text-amber-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">Unpaid</span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-sm font-semibold text-slate-500">
                            {p.registeredAt ? new Date(p.registeredAt).toLocaleString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                          </td>
                          <td className="px-5 py-4 flex gap-2">
                            <button
                              onClick={() => {
                                const newExpanded = expandedPlayerId === p.id ? null : p.id;
                                setExpandedPlayerId(newExpanded);
                                if (newExpanded === p.id && p.regId) fetchMessages(p.regId);
                              }}
                              className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-colors" title="View / Message"
                            >
                              <Eye size={16} />
                            </button>
                            <button onClick={() => openEditMetricsModal(p)} className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition-colors" title="Edit"><Edit2 size={16} /></button>
                            <button onClick={() => printRegistrationSlip(p, tournament)} className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition-colors" title="Print"><Printer size={16} /></button>
                          </td>
                        </tr>
                        {expandedPlayerId === p.id && p.regId && (
                          <tr>
                            <td colSpan={9} className="p-0 border-b border-slate-200 bg-slate-50/80">
                              <div className="p-4 flex flex-col items-center">
                                <div className="w-full max-w-3xl space-y-4">
                                  {/* Chat thread */}
                                  {messages[p.regId]?.length > 0 && (
                                    <div className="px-4 py-3 bg-white rounded-xl border border-slate-200 space-y-3 max-h-48 overflow-y-auto">
                                      {messages[p.regId].map((msg) => (
                                        <div key={msg.id} className="flex items-start gap-2">
                                          <div className="w-6 h-6 rounded-full bg-[#FF7400]/10 flex items-center justify-center shrink-0 mt-0.5">
                                            <span className="text-[10px] font-black text-[#FF7400]">A</span>
                                          </div>
                                          <div className="flex-grow">
                                            <p className="text-xs font-bold text-slate-700 leading-snug">{msg.message}</p>
                                            <p className="text-[10px] text-slate-400 mt-0.5">
                                              {new Date(msg.createdAt).toLocaleDateString("en-GB")} {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                            </p>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  
                                  {/* Reply Input */}
                                  <div className="w-full rounded-2xl p-[1.5px]" style={{ background: "linear-gradient(to right, #552700 0%, #FF0E00 25%, #FFDA00 75%, #FF7400 100%)" }}>
                                    <div className="flex items-center gap-2 bg-white rounded-[14px] px-3 py-2">
                                      <input
                                        type="text"
                                        placeholder={`Send message to ${p.name}...`}
                                        value={replyTexts[p.regId!] || ""}
                                        onChange={(e) => setReplyTexts((prev) => ({ ...prev, [p.regId!]: e.target.value }))}
                                        onKeyDown={(e) => e.key === "Enter" && handleSendReply(p.regId!)}
                                        className="flex-grow bg-transparent text-sm text-slate-600 placeholder-slate-400 outline-none px-2"
                                      />
                                      <button
                                        onClick={() => handleSendReply(p.regId!)}
                                        disabled={!replyTexts[p.regId!]?.trim() || replyLoading[p.regId!]}
                                        className="text-slate-400 hover:text-[#FF7400] disabled:opacity-30 transition-colors shrink-0 p-2"
                                      >
                                        {replyLoading[p.regId!] ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>

            {/* Pagination UI */}
            {(() => {
              let filtered = players.filter(p => {
                if (regSearchQuery && !p.name.toLowerCase().includes(regSearchQuery.toLowerCase()) && !p.tnjaId?.toLowerCase().includes(regSearchQuery.toLowerCase()) && !p.club.toLowerCase().includes(regSearchQuery.toLowerCase())) return false;
                if (regDistrictFilter !== "All Districts" && p.district !== regDistrictFilter) return false;
                if (regClubFilter !== "All Clubs" && p.club !== regClubFilter) return false;
                if (regGenderFilter !== "All Genders" && p.gender !== regGenderFilter) return false;
                if (regCategoryFilter !== "All Categories" && p.ageGroup !== regCategoryFilter) return false;
                if (regBeltFilter !== "All Belts" && p.belt !== regBeltFilter) return false;
                return true;
              });
              const totalItems = filtered.length;
              const totalPages = Math.ceil(totalItems / regItemsPerPage) || 1;
              if (totalItems === 0) return null;

              return (
                <div className="bg-white border-t border-slate-100 px-5 py-4 flex items-center justify-between">
                  <p className="text-sm text-slate-500 font-semibold">
                    Showing {(regCurrentPage - 1) * regItemsPerPage + 1} to {Math.min(regCurrentPage * regItemsPerPage, totalItems)} of {totalItems} entries
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 mr-4">
                      <select 
                        value={regItemsPerPage} 
                        onChange={(e) => { setRegItemsPerPage(Number(e.target.value)); setRegCurrentPage(1); }}
                        className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-2 py-1.5 focus:outline-none"
                      >
                        <option value={10}>10 / page</option>
                        <option value={24}>24 / page</option>
                        <option value={50}>50 / page</option>
                      </select>
                    </div>
                    <button 
                      onClick={() => setRegCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={regCurrentPage === 1}
                      className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    
                    <div className="flex gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                        if (page === 1 || page === totalPages || (page >= regCurrentPage - 1 && page <= regCurrentPage + 1)) {
                          return (
                            <button
                              key={page}
                              onClick={() => setRegCurrentPage(page)}
                              className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-bold transition-colors ${regCurrentPage === page ? "bg-[#FF7400] text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                            >
                              {page}
                            </button>
                          );
                        } else if (page === regCurrentPage - 2 || page === regCurrentPage + 2) {
                          return <span key={page} className="px-1 text-slate-400">...</span>;
                        }
                        return null;
                      })}
                    </div>

                    <button 
                      onClick={() => setRegCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={regCurrentPage === totalPages}
                      className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ══ CHAMPION BANNER ═══════════════════════════════════════════════════ */}
      <AnimatePresence>
        {champion && activeTab === "draws" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85 }}
            className="bg-gradient-to-r from-yellow-400 via-[#FF7400] to-yellow-500 rounded-3xl p-6 shadow-2xl shadow-orange-500/30 flex items-center gap-5"
          >
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
              <Trophy size={32} className="text-white animate-bounce" />
            </div>
            <div className="flex flex-col md:flex-row md:items-center gap-6 w-full">
              <div>
                <p className="text-white/70 text-xs font-black uppercase tracking-widest mb-0.5">🥇 1st Place (Champion)</p>
                <h2 className="text-2xl font-black text-white leading-tight">{champion.name}</h2>
                <p className="text-white/80 text-sm font-bold">{champion.club}</p>
              </div>

              {(champion.secondPlaceName || champion.thirdPlaceName) && (
                <div className="flex flex-wrap gap-6 border-t md:border-t-0 md:border-l border-white/20 pt-4 md:pt-0 md:pl-6">
                  {champion.secondPlaceName && (
                    <div>
                      <p className="text-white/70 text-[10px] font-black uppercase tracking-widest mb-0.5">🥈 2nd Place</p>
                      <p className="text-base font-black text-white leading-tight">{champion.secondPlaceName}</p>
                      <p className="text-white/80 text-xs font-bold">{champion.secondPlaceClub}</p>
                    </div>
                  )}
                  {champion.thirdPlaceName && (
                    <div>
                      <p className="text-white/70 text-[10px] font-black uppercase tracking-widest mb-0.5">🥉 3rd Place</p>
                      <p className="text-base font-black text-white leading-tight">{champion.thirdPlaceName}</p>
                      <p className="text-white/80 text-xs font-bold">{champion.thirdPlaceClub}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            <button onClick={() => setChampion(null)} className="ml-auto text-white/50 hover:text-white transition-colors self-start md:self-center">
              <X size={20} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ DRAWS ═════════════════════════════════════════════════════════════ */}
      {activeTab === "draws" && expired && (
        <ExpiredBlock label="Draw Generation" />
      )}
      {activeTab === "draws" && !expired && (
        <div className="space-y-4">
          {renderCategoryFilters()}

          {tournament?.status !== "APPROVED" ? (
            <div className="flex items-center gap-2 px-5 py-3 bg-red-50 text-red-600 rounded-2xl text-sm font-bold border border-red-200">
              <AlertCircle size={18} /> Tournament must be approved before you can manage draws.
            </div>
          ) : hasPendingPlayers ? (
            <div className="flex items-center gap-2 px-5 py-3 bg-amber-50 text-amber-600 rounded-2xl text-sm font-bold border border-amber-200">
              <AlertCircle size={18} /> You must approve or reject all pending player registrations before managing draws.
            </div>
          ) : null}

          {/* ── Dealing animation overlay ── */}
          <AnimatePresence>
            {drawPhase === "dealing" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm pointer-events-none"
              >
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-center"
                >
                  <div className="flex gap-3 justify-center mb-4">
                    {drawPlayers.slice(0, Math.min(8, drawPlayers.length)).map((p, i) => (
                      <motion.div
                        key={p.id}
                        initial={{ y: 0, x: 0, rotate: 0, opacity: 1 }}
                        animate={{
                          y: [0, -60, -20, 20],
                          x: [0, (i - 4) * 30, (i - 4) * 80, (i - 4) * 120],
                          rotate: [0, (i % 2 === 0 ? -15 : 15), (i % 2 === 0 ? 5 : -5), 0],
                          opacity: [1, 1, 0.5, 0],
                        }}
                        transition={{ duration: 0.6, delay: i * 0.05, ease: "easeInOut" }}
                        className="w-12 h-16 bg-white rounded-xl shadow-xl border border-slate-200 flex flex-col items-center justify-center overflow-hidden"
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-sm ${p.gender === "FEMALE" ? "bg-pink-400" : "bg-blue-500"}`}>
                          {p.name.charAt(0)}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  <p className="text-white font-black text-lg">Dealing cards to bracket...</p>
                  <p className="text-white/50 text-sm mt-1">{drawPlayers.length} players</p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Main content: players list OR bracket ── */}
          <AnimatePresence mode="wait">
            {isMultiCategory ? (
              <motion.div
                key="multi-category-view"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {(() => {
                  const map: Record<string, { ageGroup: string; exactAge: string; gender: string; weight: string; weightLabel: string; catDrawPlayers: RegisteredPlayer[] }> = {};
                  eligiblePlayers.forEach(p => {
                    const exactAgeStr = p.exactAge ? String(p.exactAge) : "ALL";
                    const key = categoryKey(p.ageGroup, exactAgeStr, p.gender, String(p.weight));
                    if (!map[key]) {
                      map[key] = {
                        ageGroup: p.ageGroup,
                        exactAge: exactAgeStr,
                        gender: p.gender,
                        weight: String(p.weight),
                        weightLabel: p.weightLabel || String(p.weight),
                        catDrawPlayers: [],
                      };
                    }
                    map[key].catDrawPlayers.push(p);
                  });
                  const categories = Object.entries(map).map(([key, data]) => ({ key, ...data })).sort((a, b) => a.key.localeCompare(b.key));
                  
                  if (categories.length === 0) {
                    return (
                      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-16 text-center space-y-4">
                        <Grid size={48} className="mx-auto text-slate-200" />
                        <div>
                          <p className="text-slate-500 font-bold text-lg">No Categories Found</p>
                          <p className="text-slate-400 text-sm mt-1 max-w-md mx-auto">
                            There are no approved players matching the current filters.
                          </p>
                        </div>
                      </div>
                    );
                  }

                  return categories.map(({ key, ageGroup, exactAge, gender, weight, weightLabel, catDrawPlayers }) => {
                    const draw = draws[key];
                    return (
                      <div key={key} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden mb-6">
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                          <h3 className="font-black text-slate-800 flex items-center gap-2">
                            <Trophy size={16} className="text-[#FF7400]" />
                            {ageGroup} · {gender === "FEMALE" ? "Girls" : "Boys"} · {weightLabel} {weightLabel !== "Under 50" && !weightLabel.includes("kg") ? "kg" : ""}
                          </h3>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <select
                                value={categoryDrawMethod[key] || (catDrawPlayers.length <= 5 ? "round-robin" : "straight-elimination")}
                                onChange={(e) => setCategoryDrawMethod(prev => ({ ...prev, [key]: e.target.value as any }))}
                                className="px-2.5 py-1.5 text-[11px] font-bold bg-white border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#FF7400]/20 transition-all cursor-pointer"
                              >
                                <option value="round-robin">1.Round Robin</option>
                                <option value="straight-elimination">2.Straight elimination</option>
                                <option value="single-repechage">3.Single Repechage</option>
                                <option value="double-repechage">4.Double Repechage</option>
                              </select>
                              <button
                                onClick={() => {
                                  const defaultMethod = catDrawPlayers.length <= 5 ? "round-robin" : "straight-elimination";
                                  const selectedMethod = categoryDrawMethod[key] || defaultMethod;
                                  handleGenerateAndSaveDraw(
                                    draw?.generated ? true : false,
                                    false,
                                    {
                                      ageGroup: ageGroup,
                                      exactAge: exactAge,
                                      gender: gender,
                                      weightCategory: weight,
                                      players: catDrawPlayers,
                                      key: key,
                                      draw: draw
                                    },
                                    selectedMethod
                                  );
                                }}
                                disabled={catDrawPlayers.length < 2 || drawPhase === "shuffling" || drawPhase === "dealing" || autoGenerating}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 text-white rounded-lg font-bold text-xs shadow-md shadow-slate-700/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {drawPhase === "shuffling" || drawPhase === "dealing"
                                  ? <><Loader2 size={13} className="animate-spin" /> Processing...</>
                                  : <><Shuffle size={13} /> {draw?.generated ? "Shuffle Bracket" : "Generate Draw"}</>}
                              </button>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Assign:</span>
                              <select
                                value={draw?.matNumber || pendingMatByKey[key] || 1}
                                onChange={async (e) => {
                                  const newMat = Number(e.target.value);
                                  if (!draw) {
                                    setPendingMatByKey(prev => ({ ...prev, [key]: newMat }));
                                    return;
                                  }
                                  const updatedDraw = { ...draw, matNumber: newMat };
                                  setDraws(prev => ({ ...prev, [key]: updatedDraw }));

                                  try {
                                    await fetch(`${API_BASE}/tournaments/${tournamentId}/draws`, {
                                      method: "POST",
                                      headers: { Authorization: `Bearer ${localStorage.getItem("token")}`, "Content-Type": "application/json" },
                                      body: JSON.stringify({
                                        ageGroup: updatedDraw.ageGroup,
                                        exactAge: updatedDraw.exactAge,
                                        gender: updatedDraw.gender,
                                        weightCategory: updatedDraw.weightCategory,
                                        matNumber: updatedDraw.matNumber,
                                        rounds: updatedDraw.rounds,
                                      })
                                    });
                                  } catch (err) {
                                    console.error(err);
                                  }
                                }}
                                className="bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-black rounded-lg px-2 py-1 outline-none hover:bg-indigo-100 transition-colors cursor-pointer"
                              >
                                {(tournamentMats.length > 0 ? tournamentMats.map(m => m.matNumber).sort((a, b) => a - b) : [1]).map(m => (
                                  <option key={m} value={m}>MAT {m}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                        
                        <div className="p-5 border-b border-slate-50">
                          <div className="flex items-center justify-between mb-4">
                            <p className="font-black text-slate-800">
                              {catDrawPlayers.length} Players Ready
                            </p>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                            {catDrawPlayers.map((p, i) => (
                              <div key={p.id} className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm hover:shadow-md transition-shadow cursor-default">
                                <div className="flex items-center gap-2 mb-2">
                                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-sm text-white shrink-0 ${p.gender === "FEMALE" ? "bg-pink-400" : "bg-blue-500"}`}>
                                    {p.name.charAt(0)}
                                  </div>
                                  <div className="overflow-hidden">
                                    <p className="text-xs font-black text-slate-800 truncate leading-tight">{p.name}</p>
                                    <p className="text-[9px] text-slate-400 truncate">{p.gender === "FEMALE" ? "Female" : "Male"} · {p.club || p.district}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {draw?.generated && (
                          <div className="border-t border-slate-50">
                            {/* Bracket View */}
                            <div className="p-5 bg-slate-50/30 overflow-auto border-b border-slate-50">
                              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3">Bracket</h4>
                              <BracketView
                                rounds={draw.rounds}
                                onOpenScoreboard={openScoreboard}
                                players={catDrawPlayers}
                                tournament={tournament}
                                currentKey={key}
                                currentDraw={draw}
                              />
                            </div>
                            
                            {/* Match List View */}
                            <div className="p-5 bg-white">
                              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3">Match List</h4>
                              <div className="divide-y divide-slate-50">
                                {draw.rounds.map((round, ri) => (
                                  <div key={ri} className="py-3">
                                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
                                      {roundName(ri, draw.rounds.length, catDrawPlayers.length <= 5)}
                                    </h5>
                                    <div className="space-y-2">
                                      {round.map((match, mi) => {
                                        const isBronze = ri === draw.rounds.length - 1 && mi === 1;
                                        return (
                                          <motion.div
                                            key={match.matchId}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: ri * 0.15 + mi * 0.04, type: "spring", stiffness: 300, damping: 25 }}
                                            className={`flex items-center justify-between p-3 rounded-2xl transition-colors ${
                                              isBronze ? "bg-amber-50/50 border border-amber-200" : "bg-slate-50 hover:bg-orange-50/30"
                                            }`}
                                          >
                                            <div className="flex items-center gap-4">
                                              <span className="text-[10px] font-black text-slate-400 min-w-[80px] flex flex-col gap-0.5">
                                                <span>Mat {draw.matNumber || 1} · #{match.matchNumber}</span>
                                                {isBronze && <span className="text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded inline-block w-max mt-1">🥉 BRONZE</span>}
                                              </span>
                                              <div className="flex items-center gap-2">
                                                <span className={`text-sm font-bold flex items-center gap-1 ${match.slotA.isBye ? "text-slate-300" : match.winnerId === match.slotA.playerId ? "text-emerald-600" : match.status === "COMPLETED" ? "text-slate-400 line-through" : "text-slate-800"}`}>
                                                  {match.slotA.playerName}
                                                  {match.winnerId && match.winnerId === match.slotA.playerId && <Trophy size={12} />}
                                                </span>
                                                <span className="text-[10px] font-black text-slate-300">vs</span>
                                                <span className={`text-sm font-bold flex items-center gap-1 ${match.slotB.isBye ? "text-slate-300" : match.winnerId === match.slotB.playerId ? "text-emerald-600" : match.status === "COMPLETED" ? "text-slate-400 line-through" : "text-slate-800"}`}>
                                                  {match.winnerId && match.winnerId === match.slotB.playerId && <Trophy size={12} />}
                                                  {match.slotB.playerName}
                                                </span>
                                              </div>
                                            </div>
                                            {match.slotA.playerName !== "TBD" && match.slotB.playerName !== "TBD" && !match.slotA.isBye && !match.slotB.isBye && match.status !== "COMPLETED" && (
                                              <button onClick={() => openScoreboard(match)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FF7400] text-white rounded-xl text-[10px] font-black hover:scale-105 transition-all">
                                                <Monitor size={11} /> Scoreboard
                                              </button>
                                            )}
                                          </motion.div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </motion.div>
            ) : (
              <motion.div
                key="single-category-view"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, x: 100, transition: { duration: 0.3 } }}
                className="space-y-6"
              >
                {/* Player cards list */}
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                {drawPlayers.length === 0 ? (
                  <div className="py-16 text-center space-y-4">
                    <Target size={48} className="mx-auto text-slate-200" />
                    <div>
                      <p className="text-slate-500 font-bold text-lg">No Players in This Category</p>
                      <p className="text-slate-400 text-sm mt-1">Select a different category filter above.</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                      <p className="font-black text-slate-800">
                        {drawPlayers.length} Players Ready
                        <span className="ml-2 text-xs font-semibold text-slate-400">
                          {currentDraw?.generated ? "— assign seeds then click Re-Shuffle Bracket" : "— assign seeds then click Generate Draw"}
                        </span>
                      </p>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <select
                            value={detailDrawMethod || (drawPlayers.length <= 5 ? "round-robin" : "straight-elimination")}
                            onChange={(e) => setDetailDrawMethod(e.target.value as DrawMethodType)}
                            className="px-2.5 py-1.5 text-[11px] font-bold bg-white border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#FF7400]/20 transition-all cursor-pointer"
                          >
                            <option value="round-robin">1.Round Robin</option>
                            <option value="straight-elimination">2.Straight elimination</option>
                            <option value="single-repechage">3.Single Repechage</option>
                            <option value="double-repechage">4.Double Repechage</option>
                          </select>
                          <button
                            onClick={() => currentDraw?.generated ? handleShuffle() : handleGenerateDraw()}
                            disabled={drawPlayers.length < 2 || drawPhase === "shuffling" || drawPhase === "dealing" || autoGenerating}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 text-white rounded-lg font-bold text-xs shadow-md shadow-slate-700/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {drawPhase === "shuffling" || drawPhase === "dealing"
                              ? <><Loader2 size={13} className="animate-spin" /> Processing...</>
                              : <><Shuffle size={13} /> {currentDraw?.generated ? "Shuffle Bracket" : "Generate Draw"}</>}
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Assign:</span>
                          <select
                            value={currentDraw?.matNumber || pendingMatByKey[currentKey] || 1}
                            onChange={async (e) => {
                              const newMat = Number(e.target.value);
                              if (!currentDraw) {
                                setPendingMatByKey(prev => ({ ...prev, [currentKey]: newMat }));
                                return;
                              }
                              const updatedDraw = { ...currentDraw, matNumber: newMat };
                              setDraws(prev => ({ ...prev, [currentKey]: updatedDraw }));

                              try {
                                await fetch(`${API_BASE}/tournaments/${tournamentId}/draws`, {
                                  method: "POST",
                                  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    ageGroup: updatedDraw.ageGroup,
                                    exactAge: updatedDraw.exactAge,
                                    gender: updatedDraw.gender,
                                    weightCategory: updatedDraw.weightCategory,
                                    matNumber: updatedDraw.matNumber,
                                    rounds: updatedDraw.rounds,
                                  })
                                });
                              } catch (err) {
                                console.error(err);
                              }
                            }}
                            className="bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-black rounded-lg px-2 py-1 outline-none hover:bg-indigo-100 transition-colors cursor-pointer"
                          >
                            {(tournamentMats.length > 0 ? tournamentMats.map(m => m.matNumber).sort((a, b) => a - b) : [1]).map(m => (
                              <option key={m} value={m}>MAT {m}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {drawPlayers.map((p, i) => (
                        <motion.div
                          key={`${p.id}-${shuffleKey}`}
                          layoutId={`player-card-${p.id}`}
                          initial={{ opacity: 0, y: 30, scale: 0.85 }}
                          animate={{
                            opacity: 1,
                            y: drawPhase === "shuffling" ? [0, -12, 8, -5, 0] : 0,
                            x: drawPhase === "shuffling" ? [0, (i % 2 === 0 ? -8 : 8), (i % 3 === 0 ? 5 : -5), 0] : 0,
                            scale: drawPhase === "shuffling" ? [1, 0.92, 1.04, 0.97, 1] : 1,
                            rotate: drawPhase === "shuffling" ? [0, (i % 2 === 0 ? -6 : 6), (i % 3 === 0 ? 3 : -3), 0] : 0,
                          }}
                          transition={{
                            opacity: { delay: i * 0.04, duration: 0.3 },
                            y: drawPhase === "shuffling"
                              ? { duration: 0.7, delay: i * 0.05, ease: "easeInOut" }
                              : { delay: i * 0.04, duration: 0.4, type: "spring" },
                            x: drawPhase === "shuffling"
                              ? { duration: 0.7, delay: i * 0.05 }
                              : { delay: i * 0.04 },
                            scale: drawPhase === "shuffling"
                              ? { duration: 0.7, delay: i * 0.05 }
                              : { delay: i * 0.04, duration: 0.4, type: "spring" },
                            rotate: drawPhase === "shuffling"
                              ? { duration: 0.7, delay: i * 0.05 }
                              : { delay: i * 0.04 },
                          }}
                          className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm hover:shadow-md hover:border-orange-300 transition-shadow cursor-default"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-sm text-white shrink-0 ${p.gender === "FEMALE" ? "bg-pink-400" : "bg-blue-500"}`}>
                              {p.name.charAt(0)}
                            </div>
                            <div className="overflow-hidden">
                              <p className="text-xs font-black text-slate-800 truncate leading-tight">{p.name}</p>
                              <p className="text-[9px] text-slate-400 truncate">{p.gender === "FEMALE" ? "Female" : "Male"} · {p.club || p.district}</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                                {p.weight} kg
                              </span>
                              <button
                                onClick={() => openEditMetricsModal(p)}
                                className="text-slate-300 hover:text-orange-500 transition-colors"
                              >
                                <Edit2 size={12} />
                              </button>
                            </div>
                            <div className="flex items-center gap-1">
                              {seeds[1]?.id === p.id && <span className="text-[8px] font-black text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">S1</span>}
                              {seeds[2]?.id === p.id && <span className="text-[8px] font-black text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">S2</span>}
                              {seeds[3]?.id === p.id && <span className="text-[8px] font-black text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">S3</span>}
                              {seeds[4]?.id === p.id && <span className="text-[8px] font-black text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">S4</span>}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
                </div>

                {/* Bracket — post-generate */}
                {currentDraw?.generated && (
                  <motion.div
                    key={`bracket-${currentKey}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden"
                  >
                <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-black text-slate-800">
                    Draw — {filteredPlayers.length} Players
                    <span className="ml-2 text-xs font-semibold text-slate-400">
                      {ageFilter !== "ALL" ? ageFilter : ""} {genderFilter !== "ALL" ? genderFilter : ""} {weightFilter !== "ALL" ? `${weightFilter}kg` : ""}
                    </span>
                    {currentDraw.matNumber && (
                      <span className="ml-3 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800">
                        MAT {currentDraw.matNumber}
                      </span>
                    )}
                  </h3>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => { 
                        const hasActive = currentDraw.rounds.some(r => r.some(m => m.status === "COMPLETED" || m.status === "IN_PROGRESS"));
                        if (hasActive) {
                          showToast("Cannot re-draw the bracket because matches have already started or completed!", false);
                          return;
                        }
                        if (window.confirm("Are you sure you want to re-draw this bracket? This will wipe the current bracket.")) {
                          setDraws(p => ({ ...p, [currentKey]: { ...currentDraw!, generated: false, saved: false } })); 
                          setDrawPhase("idle"); 
                        }
                      }}
                      className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                        currentDraw.rounds.some(r => r.some(m => m.status === "COMPLETED" || m.status === "IN_PROGRESS"))
                          ? "text-slate-300 cursor-not-allowed"
                          : "text-slate-500 hover:text-red-500 hover:bg-red-50"
                      }`}>
                      ↺ Re-draw
                    </button>
                    <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                      {(filteredPlayers.length <= 5 ? ["list"] as ViewMode[] : ["bracket", "list"] as ViewMode[]).map((v) => (
                        <button key={v} onClick={() => setViewMode(v)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${(filteredPlayers.length <= 5 ? "list" : viewMode) === v ? "bg-white text-[#FF7400] shadow-sm" : "text-slate-400"}`}>
                          {v === "bracket" ? <><Grid size={12} className="inline mr-1" />Bracket</> : <><List size={12} className="inline mr-1" />List</>}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {(filteredPlayers.length <= 5 ? "list" : viewMode) === "list" ? (
                  <div className="divide-y divide-slate-50">
                    {currentDraw.rounds.map((round, ri) => (
                      <div key={ri} className="p-5">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">
                          {roundName(ri, currentDraw.rounds.length, filteredPlayers.length <= 5)}
                        </h4>
                        <div className="space-y-2">
                          {round.map((match, mi) => {
                            const isBronze = ! (filteredPlayers.length <= 5) && ri === currentDraw.rounds.length - 1 && mi === 1;
                            return (
                            <motion.div
                              key={match.matchId}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: ri * 0.15 + mi * 0.04, type: "spring", stiffness: 300, damping: 25 }}
                              className={`flex items-center justify-between p-3 rounded-2xl transition-colors ${
                                isBronze ? "bg-amber-50/50 border border-amber-200" : "bg-slate-50 hover:bg-orange-50/30"
                              }`}
                            >
                              <div className="flex items-center gap-4">
                                <span className="text-[10px] font-black text-slate-400 min-w-[80px] flex flex-col gap-0.5">
                                  <span>Mat {currentDraw.matNumber || 1} · #{match.matchNumber}</span>
                                  {isBronze && <span className="text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded inline-block w-max mt-1">🥉 BRONZE</span>}
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className={`text-sm font-bold flex items-center gap-1 ${match.slotA.isBye ? "text-slate-300" : match.winnerId === match.slotA.playerId ? "text-emerald-600" : match.status === "COMPLETED" ? "text-slate-400 line-through" : "text-slate-800"}`}>
                                    {match.slotA.playerName}
                                    {match.winnerId && match.winnerId === match.slotA.playerId && <Trophy size={12} />}
                                  </span>
                                  <span className="text-[10px] font-black text-slate-300">vs</span>
                                  <span className={`text-sm font-bold flex items-center gap-1 ${match.slotB.isBye ? "text-slate-300" : match.winnerId === match.slotB.playerId ? "text-emerald-600" : match.status === "COMPLETED" ? "text-slate-400 line-through" : "text-slate-800"}`}>
                                    {match.winnerId && match.winnerId === match.slotB.playerId && <Trophy size={12} />}
                                    {match.slotB.playerName}
                                  </span>
                                </div>
                              </div>
                              {match.status === "COMPLETED" && (
                                <div className="text-right flex items-center gap-2">
                                  <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-lg">
                                    {match.winMethod || "Win"} ({match.scoreA ? `${(match.scoreA.ippon || 0) * 100 + (match.scoreA.wazaAri || 0) * 10 + (match.scoreA.yuko || 0)} - ${(match.scoreB.ippon || 0) * 100 + (match.scoreB.wazaAri || 0) * 10 + (match.scoreB.yuko || 0)}` : "0 - 0"})
                                  </span>
                                  {match.elapsedSeconds !== undefined && (
                                    <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-lg">
                                      ⏱️ {Math.floor(match.elapsedSeconds / 60)}m {match.elapsedSeconds % 60}s
                                    </span>
                                  )}
                                </div>
                              )}
                              {match.slotA.playerName !== "TBD" && match.slotB.playerName !== "TBD" && !match.slotA.isBye && !match.slotB.isBye && match.status !== "COMPLETED" && (
                                <button onClick={() => openScoreboard(match)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FF7400] text-white rounded-xl text-[10px] font-black hover:scale-105 transition-all">
                                  <Monitor size={11} /> Scoreboard
                                </button>
                                )}
                            </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-5 bg-slate-50/50 overflow-auto">
                    <BracketView
                      key={currentKey}
                      rounds={currentDraw.rounds}
                      onOpenScoreboard={openScoreboard}
                      players={filteredPlayers}
                      tournament={tournament}
                      currentKey={currentKey}
                      currentDraw={currentDraw}
                    />
                  </div>
                )}
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ══ MATCHES ═══════════════════════════════════════════════════════════ */}
      {activeTab === "matches" && expired && (
        <ExpiredBlock label="Match Scoreboard" />
      )}
      {activeTab === "matches" && !expired && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div className="flex-1 overflow-x-auto">
              {renderCategoryFilters()}
            </div>
            <button
              onClick={() => exportAllMatchesToPDF(tournament, draws)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white text-sm font-bold rounded-xl shadow-lg hover:bg-slate-700 transition-colors shrink-0"
            >
              <Printer size={16} /> Print Master Match List
            </button>
          </div>

          {currentDraw?.generated ? (
            <div className="space-y-4">
              {currentDraw.rounds.map((round, ri) => (
                <div key={ri} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
                    <h3 className="font-black">{roundName(ri, currentDraw.rounds.length, filteredPlayers.length <= 5)}</h3>
                    <span className="text-xs font-bold text-slate-400">{round.length} match{round.length !== 1 ? "es" : ""}</span>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {round.map((match) => (
                      <div key={match.matchId}
                        className="p-5 flex items-center justify-between hover:bg-orange-50/20 transition-colors">
                        <div className="flex items-center gap-5">
                          <div className="text-center w-10">
                            <p className="text-[9px] font-black text-slate-400 uppercase">Mat</p>
                            <p className="text-2xl font-black text-slate-700">{match.matNumber}</p>
                          </div>
                          <div className="w-px h-10 bg-slate-100" />
                          <div className="text-center w-10">
                            <p className="text-[9px] font-black text-slate-400 uppercase">Match</p>
                            <p className="text-2xl font-black text-slate-700">#{match.matchNumber}</p>
                          </div>
                          <div className="w-px h-10 bg-slate-100" />
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <motion.p
                                key={`${match.matchId}-slotA-${match.slotA.playerName}`}
                                initial={match.slotA.playerName !== "TBD" ? { opacity: 0, scale: 0.8, y: -10 } : { opacity: 1, scale: 1, y: 0 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                className={`text-sm font-black flex items-center justify-end gap-1 ${match.slotA.isBye ? "text-slate-300" : match.slotA.playerName === "TBD" ? "text-slate-400" : match.winnerId === match.slotA.playerId ? "text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg" : match.status === "COMPLETED" ? "text-slate-400 line-through" : "text-slate-800"}`}>
                                {match.slotA.playerName}
                                {match.winnerId === match.slotA.playerId && <Trophy size={14} className="text-emerald-500" />}
                                {match.slotA.seedNumber && (
                                  <span className="ml-1.5 text-[9px] font-black text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full">S{match.slotA.seedNumber}</span>
                                )}
                              </motion.p>
                              <p className="text-xs text-slate-400 font-semibold">{match.slotA.club}</p>
                            </div>
                            <span className="text-xs font-black text-slate-300 bg-slate-100 px-2.5 py-1 rounded-lg">VS</span>
                            <div>
                              <motion.p
                                key={`${match.matchId}-slotB-${match.slotB.playerName}`}
                                initial={match.slotB.playerName !== "TBD" ? { opacity: 0, scale: 0.8, y: -10 } : { opacity: 1, scale: 1, y: 0 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                className={`text-sm font-black flex items-center gap-1 ${match.slotB.isBye ? "text-slate-300" : match.slotB.playerName === "TBD" ? "text-slate-400" : match.winnerId === match.slotB.playerId ? "text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg" : match.status === "COMPLETED" ? "text-slate-400 line-through" : "text-slate-800"}`}>
                                {match.winnerId === match.slotB.playerId && <Trophy size={14} className="text-emerald-500" />}
                                {match.slotB.playerName}
                                {match.slotB.seedNumber && (
                                  <span className="ml-1.5 text-[9px] font-black text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full">S{match.slotB.seedNumber}</span>
                                )}
                              </motion.p>
                              <p className="text-xs text-slate-400 font-semibold">{match.slotB.club}</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className={`text-[10px] font-black px-3 py-1 rounded-full ${
                            match.status === "COMPLETED" ? "bg-emerald-100 text-emerald-700" :
                            match.status === "IN_PROGRESS" ? "bg-orange-100 text-orange-700" :
                            "bg-slate-100 text-slate-400"
                          }`}>
                            {match.status}
                          </span>
                          {match.status === "COMPLETED" && (
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-bold text-slate-600 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
                                {match.winMethod || "Win"} ({match.scoreA ? `${(match.scoreA.ippon || 0) * 100 + (match.scoreA.wazaAri || 0) * 10 + (match.scoreA.yuko || 0)} - ${(match.scoreB.ippon || 0) * 100 + (match.scoreB.wazaAri || 0) * 10 + (match.scoreB.yuko || 0)}` : "0 - 0"})
                              </span>
                              {match.elapsedSeconds !== undefined && (
                                <span className="text-[11px] font-bold text-slate-600 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
                                  ⏱️ {Math.floor(match.elapsedSeconds / 60)}m {match.elapsedSeconds % 60}s
                                </span>
                              )}
                            </div>
                          )}
                          {match.slotA.playerName !== "TBD" && match.slotB.playerName !== "TBD" && match.status !== "COMPLETED" && (
                            <button onClick={() => openScoreboard(match)}
                              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#FF7400] to-orange-500 text-white rounded-xl text-xs font-black shadow-lg shadow-orange-500/20 hover:scale-105 active:scale-95 transition-all">
                              <Monitor size={13} /> Open Scoreboard ↗
                            </button>
                          )}
                          {match.slotA.playerId && !match.slotB.playerId && match.status !== "COMPLETED" && (
                            <span className="text-xs text-amber-600 font-bold px-3 py-1 bg-amber-50 rounded-xl border border-amber-100">Waiting for opponent...</span>
                          )}
                          {(match.slotA.isBye || match.slotB.isBye) && (
                            <span className="text-xs text-slate-400 font-bold px-3 py-1 bg-slate-50 rounded-xl">BYE — auto advance</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm py-20 text-center">
              <Swords size={48} className="mx-auto text-slate-200 mb-4" />
              <p className="text-slate-500 font-bold text-lg">No Draw for This Category</p>
              <p className="text-slate-400 font-semibold text-sm mt-1">Generate a draw first</p>
              <button onClick={() => setActiveTab("draws")}
                className="mt-5 px-6 py-2.5 bg-[#FF7400] text-white rounded-2xl font-bold text-sm shadow-lg shadow-orange-500/20 hover:scale-105 transition-all">
                Go to Draw Generation →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ══ RESULTS & REPORTS ══════════════════════════════════════════════════ */}
      {activeTab === "results" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                <BarChart3 size={24} /> Match Results & Reports
              </h2>
              <p className="text-slate-500 text-sm mt-1">View completed matches, winners, and generate PDF reports</p>
            </div>
            <button onClick={() => exportOverallTournamentReport(tournament, players, draws, placements)}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all">
              <Printer size={16} /> Official Completion Report
            </button>
          </div>
          
          {renderCategoryFilters()}

          {/* ── Conclude Tournament Panel ── */}
          {tournament?.status !== "CLOSED" ? (
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 border border-slate-700 shadow-xl">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 bg-[#FF7400]/20 rounded-2xl flex items-center justify-center shrink-0">
                  <Award size={24} className="text-[#FF7400]" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Conclude Tournament & Issue Certificates</h3>
                  <p className="text-slate-400 text-sm mt-1">Assign final placements to players, then click Conclude. All participants can then download their certificates.</p>
                </div>
              </div>

              {filteredPlayers.length === 0 ? (
                <div className="text-center py-8 text-slate-400 font-semibold">No players found for this category.</div>
              ) : (
                <div className="space-y-3">
                  {/* Auto-detect status banner */}
                  {placementsAutoDetected && (
                    <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-emerald-900/40 border border-emerald-500/30 rounded-xl mb-2">
                      <div className="flex items-center gap-2">
                        <Check size={14} className="text-emerald-400 shrink-0" />
                        <p className="text-emerald-300 text-xs font-bold">
                          Auto-detected: {filteredPlayers.filter(p => placements[p.id] === "FIRST").length} Gold · {filteredPlayers.filter(p => placements[p.id] === "SECOND").length} Silver · {filteredPlayers.filter(p => placements[p.id] === "THIRD").length} Bronze · {filteredPlayers.filter(p => !placements[p.id] || placements[p.id] === "PARTICIPATION").length} Participants
                        </p>
                      </div>
                      <button
                        onClick={autoDetectPlacements}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-xs font-bold transition-all shrink-0"
                      >
                        <Zap size={11} className="text-[#FF7400]" /> Re-detect
                      </button>
                    </div>
                  )}
                  {/* Placement Legend */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {[
                      { label: "1st Place", icon: <Trophy size={14} />, value: "FIRST", color: "bg-yellow-500" },
                      { label: "2nd Place", icon: <Medal size={14} />, value: "SECOND", color: "bg-slate-400" },
                      { label: "3rd Place", icon: <Medal size={14} />, value: "THIRD", color: "bg-orange-600" },
                      { label: "Participation", icon: <Award size={14} />, value: "PARTICIPATION", color: "bg-blue-500" },
                    ].map((p) => (
                      <span key={p.value} className={`flex items-center gap-1.5 px-3 py-1 ${p.color} text-white text-xs font-black rounded-full`}>
                        {p.icon} {p.label}
                      </span>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
                    {filteredPlayers.map((player) => {
                      const placement = placements[player.id] || "PARTICIPATION";
                      const placementColors: Record<string, string> = {
                        FIRST: "border-yellow-400 bg-yellow-500/10",
                        SECOND: "border-slate-400 bg-slate-400/10",
                        THIRD: "border-orange-500 bg-orange-500/10",
                        PARTICIPATION: "border-slate-600 bg-slate-700/30",
                      };
                      const placementLabels: Record<string, string> = {
                        FIRST: "🥇 1st Place",
                        SECOND: "🥈 2nd Place",
                        THIRD: "🥉 3rd Place",
                        PARTICIPATION: "🎖️ Participant",
                      };
                      return (
                        <div key={player.id} className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${placementColors[placement]}`}>
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-sm text-white shrink-0 ${player.gender === "FEMALE" ? "bg-pink-500" : "bg-blue-600"}`}>
                            {player.name.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-black text-white truncate">{player.name}</p>
                            <p className="text-[11px] text-slate-400 truncate">{player.club || player.district}</p>
                          </div>
                          <div className="relative shrink-0">
                            <button
                              onClick={() => setOpenDropdownId(openDropdownId === player.id ? null : player.id)}
                              className="flex items-center justify-between w-[120px] gap-2 text-xs font-bold bg-slate-700 border border-slate-600 text-white rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#FF7400]"
                            >
                              <span className="flex items-center gap-1.5">
                                {placement === "FIRST" && <><Trophy size={14} className="text-yellow-500"/> 1st Place</>}
                                {placement === "SECOND" && <><Medal size={14} className="text-slate-400"/> 2nd Place</>}
                                {placement === "THIRD" && <><Medal size={14} className="text-orange-600"/> 3rd Place</>}
                                {placement === "PARTICIPATION" && <><Award size={14} className="text-blue-500"/> Participant</>}
                              </span>
                            </button>
                            <AnimatePresence>
                              {openDropdownId === player.id && (
                                <>
                                  <div className="fixed inset-0 z-40" onClick={() => setOpenDropdownId(null)} />
                                  <motion.div
                                    initial={{ opacity: 0, y: -5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -5 }}
                                    transition={{ duration: 0.15 }}
                                    className="absolute right-0 mt-2 w-36 bg-slate-800 border border-slate-600 rounded-xl shadow-xl z-50 overflow-hidden"
                                  >
                                    {[
                                      { val: "FIRST", label: "1st Place", icon: <Trophy size={14} className="text-yellow-500"/> },
                                      { val: "SECOND", label: "2nd Place", icon: <Medal size={14} className="text-slate-400"/> },
                                      { val: "THIRD", label: "3rd Place", icon: <Medal size={14} className="text-orange-600"/> },
                                      { val: "PARTICIPATION", label: "Participant", icon: <Award size={14} className="text-blue-500"/> }
                                    ].map(opt => (
                                      <button
                                        key={opt.val}
                                        onClick={() => {
                                          setPlacements(prev => ({ ...prev, [player.id]: opt.val as any }));
                                          setOpenDropdownId(null);
                                        }}
                                        className="w-full text-left px-3 py-2 text-xs font-bold text-white hover:bg-slate-700 flex items-center gap-2 transition-colors"
                                      >
                                        {opt.icon} {opt.label}
                                      </button>
                                    ))}
                                  </motion.div>
                                </>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-4 flex items-center justify-between border-t border-slate-700 mt-4">
                    <p className="text-slate-400 text-xs font-semibold">
                      {Object.values(placements).filter(v => v === "FIRST").length} Gold · {Object.values(placements).filter(v => v === "SECOND").length} Silver · {Object.values(placements).filter(v => v === "THIRD").length} Bronze · {players.filter(p => !placements[p.id] || placements[p.id] === "PARTICIPATION").length} Participants
                    </p>
                    <button
                      onClick={() => setIsConcludeModalOpen(true)}
                      disabled={submittingResults || players.length === 0}
                      className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#FF7400] to-orange-500 text-white rounded-2xl font-black text-sm shadow-lg shadow-orange-500/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submittingResults ? <><Loader2 size={16} className="animate-spin" /> Concluding...</> : <><Trophy size={16} /> Conclude & Issue Certificates</>}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-5 px-8 py-5 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/60 rounded-3xl shadow-sm"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-emerald-200">
                  <Check size={24} className="text-white" />
                </div>
                <div>
                  <p className="text-emerald-800 font-black text-lg">Tournament Concluded</p>
                  <p className="text-emerald-600/80 text-sm font-semibold mt-0.5">All participants can now download their certificates from their dashboard.</p>
                </div>
              </motion.div>

              <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-yellow-100 via-orange-50 to-transparent opacity-50 pointer-events-none rounded-full -mr-20 -mt-20 blur-3xl" />
                
                <div className="flex items-center gap-4 mb-8 relative z-10">
                  <div className="w-14 h-14 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-orange-200">
                    <Trophy size={28} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-800 tracking-tight">Category Winners</h3>
                    <p className="text-slate-500 font-medium mt-1">Podium placements for the selected category filters.</p>
                  </div>
                </div>

                {filteredPlayers.filter(p => p.placement && p.placement !== "PARTICIPATION").length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-3 shadow-sm border border-slate-100">
                      <Trophy size={24} className="text-slate-300" />
                    </div>
                    <p className="text-slate-500 font-bold text-lg">No Winners Yet</p>
                    <p className="text-slate-400 text-sm mt-1">Submit results to see the podium placements here.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2 relative z-10">
                    {filteredPlayers
                      .filter(p => p.placement && p.placement !== "PARTICIPATION")
                      .sort((a, b) => {
                        const order: Record<string, number> = { FIRST: 1, SECOND: 2, THIRD: 3 };
                        return (order[a.placement || ""] || 99) - (order[b.placement || ""] || 99);
                      })
                      .map((player) => {
                        const placement = player.placement as string;
                        const placementColors: Record<string, string> = {
                          FIRST: "border-yellow-200 bg-yellow-50 text-yellow-700",
                          SECOND: "border-slate-200 bg-slate-50 text-slate-700",
                          THIRD: "border-orange-200 bg-orange-50 text-orange-700",
                        };
                        const placementIconColors: Record<string, string> = {
                          FIRST: "text-yellow-500",
                          SECOND: "text-slate-400",
                          THIRD: "text-orange-500",
                        };
                        const placementLabels: Record<string, string> = {
                          FIRST: "1st Place",
                          SECOND: "2nd Place",
                          THIRD: "3rd Place",
                        };
                        return (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            key={player.id} 
                            className={`flex items-center gap-4 p-5 rounded-2xl border ${placementColors[placement].split(' ').slice(0,2).join(' ')} shadow-sm hover:shadow-md transition-shadow`}
                          >
                            <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shrink-0 border border-black/5 shadow-sm">
                              <Trophy size={24} className={placementIconColors[placement]} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-lg font-black text-slate-800 truncate">{player.name}</p>
                              <p className="text-sm font-semibold text-slate-500 truncate mt-0.5">{player.club || player.district}</p>
                            </div>
                            <div className="relative shrink-0 flex flex-col items-end pl-4 border-l border-black/5">
                              <span className={`text-sm font-black ${placementColors[placement].split(' ')[2]} uppercase tracking-widest`}>
                                {placementLabels[placement]}
                              </span>
                            </div>
                          </motion.div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
          )}


          {currentDraw?.generated ? (
            <div className="space-y-6">
              {/* Completed Matches */}
              {currentDraw.rounds.map((round, ri) => {
                const completedMatches = round.filter(m => m.status === "COMPLETED");
                if (completedMatches.length === 0) return null;

                return (
                  <motion.div
                    key={ri}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden"
                  >
                    <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white flex items-center justify-between">
                      <h3 className="font-black">{roundName(ri, currentDraw.rounds.length, filteredPlayers.length <= 5)} Results</h3>
                      <span className="text-xs font-bold text-emerald-100">{completedMatches.length} completed</span>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {completedMatches.map((match) => {
                        const winner = match.winnerId === match.slotA.playerId ? match.slotA : match.slotB;
                        const loser = match.winnerId === match.slotA.playerId ? match.slotB : match.slotA;
                        const nextMatchInfo = findNextMatch(currentDraw.rounds, ri, round.indexOf(match), winner);

                        return (
                          <div key={match.matchId} className="p-6 hover:bg-emerald-50/30 transition-colors">
                            <div className="flex items-start justify-between gap-6">
                              <div className="flex-1 space-y-4">
                                {/* Match Header */}
                                <div className="flex items-center gap-4">
                                  <div className="text-center w-14">
                                    <p className="text-[10px] font-black text-slate-400 uppercase">Mat</p>
                                    <p className="text-2xl font-black text-slate-800">{match.matNumber}</p>
                                  </div>
                                  <div className="h-10 w-px bg-slate-200" />
                                  <div className="text-center w-14">
                                    <p className="text-[10px] font-black text-slate-400 uppercase">Match</p>
                                    <p className="text-2xl font-black text-slate-800">#{match.matchNumber}</p>
                                  </div>
                                </div>

                                {/* Winner & Loser */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {/* Winner */}
                                  <motion.div
                                    initial={{ scale: 0.95, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ delay: 0.1 }}
                                    className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-4 border-2 border-emerald-300"
                                  >
                                    <div className="flex items-center gap-2 mb-2">
                                      <Trophy size={16} className="text-emerald-600" />
                                      <p className="text-xs font-black text-emerald-600 uppercase">Winner</p>
                                    </div>
                                    <p className="text-lg font-black text-emerald-700">{winner.playerName}</p>
                                    <p className="text-xs text-emerald-600 font-semibold mt-1">{winner.club}</p>
                                    {winner.seedNumber && (
                                      <span className="mt-2 inline-block text-[9px] font-black text-amber-600 bg-amber-100 px-2 py-1 rounded-full">
                                        Seed #{winner.seedNumber}
                                      </span>
                                    )}
                                  </motion.div>

                                  {/* Loser */}
                                  <motion.div
                                    initial={{ scale: 0.95, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ delay: 0.15 }}
                                    className="bg-slate-50 rounded-2xl p-4 border border-slate-200"
                                  >
                                    <p className="text-xs font-black text-slate-400 uppercase mb-2">Loser</p>
                                    <p className="text-lg font-bold text-slate-700">{loser.playerName}</p>
                                    <p className="text-xs text-slate-500 font-semibold mt-1">{loser.club}</p>
                                    {loser.seedNumber && (
                                      <span className="mt-2 inline-block text-[9px] font-black text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                                        Seed #{loser.seedNumber}
                                      </span>
                                    )}
                                  </motion.div>
                                </div>

                                {/* Next Match Info */}
                                {nextMatchInfo && (
                                  <motion.div
                                    initial={{ scale: 0.95, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ delay: 0.2 }}
                                    className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-4 border border-blue-200 mt-4"
                                  >
                                    <p className="text-xs font-black text-blue-600 uppercase mb-2">📍 Next Match</p>
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                      <div>
                                        <p className="text-[10px] text-blue-600 font-bold uppercase">Round</p>
                                        <p className="font-black text-blue-700">{roundName(nextMatchInfo.roundIndex, currentDraw.rounds.length)}</p>
                                      </div>
                                      <div>
                                        <p className="text-[10px] text-blue-600 font-bold uppercase">Match #{nextMatchInfo.matchNumber}</p>
                                        <p className="font-black text-blue-700">Mat {nextMatchInfo.matNumber}</p>
                                      </div>
                                      <div className="col-span-2">
                                        <p className="text-[10px] text-blue-600 font-bold uppercase">Opponent Status</p>
                                        <p className="font-semibold text-blue-700">
                                          {nextMatchInfo.opponent
                                            ? `vs ${nextMatchInfo.opponent}`
                                            : "⏳ Waiting for opponent to advance"}
                                        </p>
                                      </div>
                                    </div>
                                  </motion.div>
                                )}
                              </div>

                              {/* Export PDF Button */}
                              <button
                                onClick={() => exportMatchToPDF(match, winner, loser, tournament, ri, nextMatchInfo)}
                                className="flex-shrink-0 px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-2xl font-black text-sm flex items-center gap-2 hover:scale-105 transition-all shadow-lg shadow-blue-500/30 whitespace-nowrap"
                              >
                                <Download size={16} />
                                Export PDF
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                );
              })}

              {/* No Completed Matches */}
              {currentDraw.rounds.every(r => !r.some(m => m.status === "COMPLETED")) && (
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm py-20 text-center">
                  <Clock size={48} className="mx-auto text-slate-200 mb-4" />
                  <p className="text-slate-500 font-bold text-lg">No Completed Matches Yet</p>
                  <p className="text-slate-400 font-semibold text-sm mt-1">Complete some matches to see results here</p>
                  <button onClick={() => setActiveTab("matches")}
                    className="mt-5 px-6 py-2.5 bg-[#FF7400] text-white rounded-2xl font-bold text-sm shadow-lg shadow-orange-500/20 hover:scale-105 transition-all">
                    Go to Matches →
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm py-20 text-center">
              <BarChart3 size={48} className="mx-auto text-slate-200 mb-4" />
              <p className="text-slate-500 font-bold text-lg">No Draw for This Category</p>
              <p className="text-slate-400 font-semibold text-sm mt-1">Generate a draw first to start matches</p>
              <button onClick={() => setActiveTab("draws")}
                className="mt-5 px-6 py-2.5 bg-[#FF7400] text-white rounded-2xl font-bold text-sm shadow-lg shadow-orange-500/20 hover:scale-105 transition-all">
                Go to Draw Generation →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ══ SEED MODAL ════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showSeedModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">

              <div className="p-6 bg-gradient-to-r from-amber-500 to-orange-500 text-white flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-lg font-black flex items-center gap-2">
                    <Award size={20} /> IJF Seeding Management
                  </h3>
                  <p className="text-amber-100 text-xs font-semibold mt-0.5">
                    S1 → top bracket · S2 → bottom · S3 & S4 → opposite halves (can only meet in Final)
                  </p>
                </div>
                <button onClick={() => { setShowSeedModal(false); setAssigningSeed(null); }}
                  className="p-2 hover:bg-white/20 rounded-xl transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-3 overflow-y-auto flex-grow">
                {([1, 2, 3, 4] as const).map((seedNum) => (
                  <div key={seedNum}
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center shrink-0">
                        <span className="text-white font-black">S{seedNum}</span>
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-700">
                          {seeds[seedNum]?.name || `Seed ${seedNum} — Unassigned`}
                        </p>
                        {seeds[seedNum] && (
                          <p className="text-xs text-slate-400 font-semibold">
                            {seeds[seedNum]?.club} · {seeds[seedNum]?.weight}kg
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setAssigningSeed(assigningSeed === seedNum ? null : seedNum)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${assigningSeed === seedNum ? "bg-orange-500 text-white" : "bg-white border border-slate-200 text-slate-700 hover:border-orange-300 hover:text-orange-600"}`}>
                        {seeds[seedNum] ? "Change" : "Assign"}
                      </button>
                      {seeds[seedNum] && (
                        <button onClick={() => setSeeds((s) => ({ ...s, [seedNum]: null }))}
                          className="px-3 py-1.5 bg-red-50 text-red-500 rounded-xl text-xs font-bold hover:bg-red-100 transition-all">
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {/* Player picker */}
                <AnimatePresence>
                  {assigningSeed && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border border-orange-200 rounded-2xl overflow-hidden bg-orange-50/50">
                      <p className="px-4 py-3 text-xs font-black text-orange-700 border-b border-orange-100 uppercase tracking-wider">
                        Select player for Seed {assigningSeed}
                      </p>
                      <div className="max-h-48 overflow-y-auto">
                        {filteredPlayers.length === 0 ? (
                          <p className="p-4 text-sm text-slate-400 text-center">No players in selected category</p>
                        ) : (
                          filteredPlayers.map((p) => (
                            <button key={p.id} onClick={() => handleAssignSeed(assigningSeed, p)}
                              className="w-full flex items-center justify-between px-4 py-3 hover:bg-orange-100 transition-colors text-left border-b border-orange-50 last:border-0">
                              <span className="text-sm font-bold text-slate-800">{p.name}</span>
                              <span className="text-xs text-slate-400 font-semibold">{p.club} · {p.weight}kg</span>
                            </button>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex justify-between pt-2">
                  <button onClick={() => setSeeds({ 1: null, 2: null, 3: null, 4: null })}
                    className="px-4 py-2 text-slate-400 hover:text-red-500 text-sm font-bold transition-colors">
                    Clear All Seeds
                  </button>
                  <button onClick={() => { setShowSeedModal(false); setAssigningSeed(null); }}
                    className="px-6 py-2.5 bg-[#FF7400] text-white rounded-2xl font-bold text-sm shadow-lg shadow-orange-500/20 hover:scale-105 transition-all">
                    Done ✓
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Edit Metrics Modal ── */}
      <AnimatePresence>
        {editingMetrics && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-slate-100 max-h-[85vh]"
            >
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="font-black text-slate-800">Edit Registration</h3>
                <button onClick={() => setEditingMetrics(null)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
              </div>
              <form onSubmit={handleUpdateMetrics} className="p-6 space-y-4 overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Weight (kg) *</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={editingMetrics.weight}
                      onChange={(e) => setEditingMetrics({ ...editingMetrics, weight: e.target.value })}
                      className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-orange-500 transition-colors font-bold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Height</label>
                    <input
                      type="text"
                      value={editingMetrics.height}
                      onChange={(e) => setEditingMetrics({ ...editingMetrics, height: e.target.value })}
                      className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-orange-500 transition-colors font-bold text-slate-800"
                      placeholder="e.g. 165 cm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={editingMetrics.ageGroup}
                    onChange={(e) => setEditingMetrics({ ...editingMetrics, ageGroup: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-orange-500 transition-colors font-bold text-slate-800"
                  >
                    {["Mini Sub-Junior Age Group 1", "Mini Sub-Junior Age Group 2", "Mini Sub-Junior Age Group 3", "Sub-Junior", "Cadet", "Junior", "Senior", "Veteran"].map((ag) => (
                      <option key={ag} value={ag}>{ag}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Belt</label>
                  <input
                    type="text"
                    value={editingMetrics.belt}
                    onChange={(e) => setEditingMetrics({ ...editingMetrics, belt: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-orange-500 transition-colors font-bold text-slate-800"
                    placeholder="e.g. Green Belt"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Club</label>
                  <select
                    value={editingMetrics.clubId}
                    onChange={(e) => setEditingMetrics({ ...editingMetrics, clubId: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-orange-500 transition-colors font-bold text-slate-800"
                  >
                    <option value="">— No Club —</option>
                    {clubOptions.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Coach</label>
                  <select
                    value={editingMetrics.coachId}
                    onChange={(e) => setEditingMetrics({ ...editingMetrics, coachId: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-orange-500 transition-colors font-bold text-slate-800"
                  >
                    <option value="">— No Coach —</option>
                    {coachOptions.map((c) => (
                      <option key={c.id} value={c.id}>{c.fullName}</option>
                    ))}
                  </select>
                </div>

                <div className="pt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingMetrics(null)}
                    className="px-6 py-2 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingMetrics}
                    className="px-6 py-2 rounded-xl font-bold text-white bg-gradient-to-r from-orange-500 to-[#FFDA00] hover:shadow-lg transition-all disabled:opacity-50"
                  >
                    {savingMetrics ? "Saving..." : "Save Metrics"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Conclude Tournament Confirmation Modal ── */}
      <AnimatePresence>
        {isConcludeModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-slate-100"
            >
              <div className="p-6 bg-red-50 border-b border-red-100 flex items-center gap-4 text-red-600">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm shrink-0 text-red-500">
                  <AlertCircle size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black">Conclude Tournament</h3>
                  <p className="text-sm font-semibold opacity-80">This action cannot be undone.</p>
                </div>
              </div>
              
              <div className="p-6">
                <p className="text-slate-600 font-medium leading-relaxed">
                  Are you sure you want to conclude this tournament and submit the final results? 
                  This will <strong className="text-slate-900">CLOSE</strong> the tournament and allow participants to download their certificates.
                </p>
                
                <div className="pt-8 flex items-center justify-end gap-3">
                  <button
                    onClick={() => setIsConcludeModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConcludeTournament}
                    className="flex items-center gap-2 px-6 py-2.5 bg-red-500 text-white rounded-xl font-black shadow-lg shadow-red-500/20 hover:bg-red-600 hover:shadow-red-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all"
                  >
                    Yes, Conclude Tournament
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Custom Confirm Modal ── */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-slate-100"
            >
              <div className="p-6 bg-[#FF7400]/5 border-b border-[#FF7400]/10 flex items-center gap-4 text-[#FF7400]">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm shrink-0 text-[#FF7400]">
                  <AlertCircle size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black">{confirmModal.title}</h3>
                  <p className="text-sm font-semibold opacity-80">Please confirm your action</p>
                </div>
              </div>
              
              <div className="p-6">
                <p className="text-slate-600 font-medium leading-relaxed whitespace-pre-line">
                  {confirmModal.message}
                </p>
                
                <div className="pt-8 flex items-center justify-end gap-3">
                  <button
                    onClick={() => setConfirmModal({ isOpen: false, title: "", message: "" })}
                    className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (confirmModal.action) confirmModal.action();
                      setConfirmModal({ isOpen: false, title: "", message: "" });
                    }}
                    className="flex items-center gap-2 px-6 py-2.5 bg-[#FF7400] text-white rounded-xl font-black shadow-lg shadow-[#FF7400]/20 hover:bg-orange-600 hover:-translate-y-0.5 active:translate-y-0 transition-all"
                  >
                    Proceed
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ══ DISQUALIFY ═════════════════════════════════════════════════════════ */}
      {activeTab === "disqualify" && !expired && (
        <DisqualifyTab
          players={players}
          tournamentId={tournamentId}
          onSuccess={() => fetchPlayers()}
        />
      )}
      {activeTab === "disqualify" && expired && (
        <ExpiredBlock label="Disqualify Players" />
      )}

      {/* ══ IMPORT WIZARD MODAL ════════════════════════════════════════════════ */}
      {isImportWizardOpen && (
        <ImportPlayersWizard
          tournamentId={tournamentId}
          onClose={() => setIsImportWizardOpen(false)}
          onSuccess={() => { fetchPlayers(); }}
        />
      )}

      {/* ══ ADD PLAYER MODAL ═══════════════════════════════════════════════════ */}
      {isAddPlayerOpen && (
        <AddPlayerModal
          tournamentId={tournamentId}
          onClose={() => setIsAddPlayerOpen(false)}
          onSuccess={() => { fetchPlayers(); showToast("Player added to tournament.", true); }}
        />
      )}

    </div>
  );
}

// ─── Expired block ────────────────────────────────────────────────────────────
function ExpiredBlock({ label }: { label: string }) {
  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm py-20 text-center space-y-3">
      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
        <Clock size={32} className="text-slate-400" />
      </div>
      <p className="text-slate-700 font-black text-lg">{label} Unavailable</p>
      <p className="text-slate-400 font-semibold text-sm max-w-sm mx-auto">
        This tournament has expired. {label} is only available for active and upcoming tournaments.
      </p>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function clubCode(name: string): string {
  if (!name || name === "BYE" || name === "TBD") return name || "---";
  // Take first 3 uppercase letters (consonants preferred)
  const upper = name.toUpperCase().replace(/[^A-Z]/g, "");
  return upper.slice(0, 3) || "---";
}

// ─── Bracket View Component (reference-style with SVG connectors) ─────────────
const MATCH_H = 68;
const MATCH_W = 210;
const CONN_W  = 44;
const G0      = 6;

function BracketView({
  rounds,
  onOpenScoreboard,
  players,
  tournament,
  currentKey,
  currentDraw,
}: {
  rounds: BracketMatch[][];
  onOpenScoreboard: (match: BracketMatch) => void;
  players: RegisteredPlayer[];
  tournament?: Tournament | null;
  currentKey?: string;
  currentDraw?: DrawCategory;
}) {
  if (!rounds || rounds.length === 0) return null;

  const isRoundRobin = rounds[0].length > 0 && rounds[0][0].matchId.startsWith("rr_");
  const numR1   = rounds[0].length;
  
  const totalH  = isRoundRobin 
    ? Math.max(numR1 * (MATCH_H + G0) - G0, MATCH_H) + 20 
    : Math.max(numR1 * (MATCH_H + G0) - G0, MATCH_H);
  
  const totalW  = rounds.length * MATCH_W + rounds.length * CONN_W + (isRoundRobin ? 200 : (MATCH_W - 20));

  const slotH   = (ri: number) => totalH / (numR1 / Math.pow(2, ri));
  const mTop    = (ri: number, mi: number) => { 
    if (isRoundRobin) return mi * (MATCH_H + G0);
    const s = slotH(ri); return mi * s + (s - MATCH_H) / 2; 
  };
  const mCenterY = (ri: number, mi: number) => mTop(ri, mi) + MATCH_H / 2;

  const weightGroups = Array.from(new Set(players.map(p => p.weight))).sort((a, b) => a - b);

  return (
    <div className="flex gap-6">
      {/* ── Left: Player List ────────────────────────────────────────────── */}
      <div className="w-56 shrink-0">
        {weightGroups.map((w) => {
          const wPlayers = players.filter(p => p.weight === w);
          return (
            <div key={w} className="mb-4">
              <p className="text-xs font-black text-blue-600 mb-2 pb-1 border-b border-slate-100">
                {w} kg <span className="text-slate-400 font-semibold">({wPlayers.length} players)</span>
              </p>
              <div className="space-y-1">
                {wPlayers.map((p) => (
                  <div key={p.id} className="flex items-center gap-2 py-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[10px] font-black text-white ${p.gender === "FEMALE" ? "bg-pink-400" : "bg-blue-500"}`}>
                      {p.name.charAt(0)}
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-[11px] font-bold text-slate-800 truncate leading-tight">{p.name}</p>
                      <p className="text-[9px] text-slate-400 truncate">{p.gender === "FEMALE" ? "Female" : "Male"} · {p.district || p.club}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Right: Bracket ───────────────────────────────────────────────── */}
      <div id="bracket-print-area" className="flex-grow overflow-x-auto">
        <div style={{ minWidth: totalW + 24, userSelect: "none" }}>

          {/* Round headers */}
          <div className="flex mb-3">
            {rounds.map((_, ri) => (
              <div key={ri} className="flex shrink-0" style={{ width: MATCH_W + CONN_W }}>
                <div style={{ width: MATCH_W }}
                  className="text-center text-[10px] font-black text-slate-500 uppercase tracking-wider py-1 bg-slate-100 rounded-lg mr-0">
                  {roundName(ri, rounds.length, isRoundRobin)}
                </div>
              </div>
            ))}
            {/* Champion Header */}
            {rounds.length > 0 && !isRoundRobin && (
              <div className="flex shrink-0" style={{ width: MATCH_W - 20 }}>
                <div style={{ width: "100%" }}
                  className="text-center text-[10px] font-black text-orange-600 uppercase tracking-wider py-1 bg-orange-100 border border-orange-200 rounded-lg shadow-sm">
                  🏆 Winner
                </div>
              </div>
            )}
            {rounds.length > 0 && isRoundRobin && (
              <div className="flex shrink-0" style={{ width: 200 }}>
                <div style={{ width: "100%" }}
                  className="text-center text-[10px] font-black text-emerald-600 uppercase tracking-wider py-1 bg-emerald-100 border border-emerald-200 rounded-lg shadow-sm">
                  📊 Leaderboard
                </div>
              </div>
            )}
          </div>

          {/* Bracket area */}
          <div className="relative" style={{ height: totalH, width: totalW }}>

            {/* SVG connector lines */}
            <svg
              className="absolute inset-0 pointer-events-none"
              width={totalW} height={totalH}
              style={{ zIndex: 0 }}
            >
              {!isRoundRobin && rounds.map((round, ri) => {
                if (ri >= rounds.length - 1) return null;
                const xBase = ri * (MATCH_W + CONN_W) + MATCH_W;
                const xMid  = xBase + CONN_W / 2;
                const xNext = xBase + CONN_W;

                return round.map((_, mi) => {
                  if (mi % 2 !== 0) return null;
                  const y1   = mCenterY(ri, mi);
                  const y2   = mi + 1 < round.length ? mCenterY(ri, mi + 1) : y1;
                  const midY = (y1 + y2) / 2;

                  return (
                    <motion.g
                      key={`${ri}-${mi}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: ri * 0.18 + mi * 0.07 + 0.3 }}
                      stroke="#CBD5E1" strokeWidth={1.5} fill="none"
                    >
                      <line x1={xBase} y1={y1}   x2={xMid}  y2={y1} />
                      {mi + 1 < round.length && (
                        <>
                          <line x1={xBase} y1={y2}   x2={xMid}  y2={y2} />
                          <line x1={xMid}  y1={y1}   x2={xMid}  y2={y2} />
                        </>
                      )}
                      <line x1={xMid} y1={midY} x2={xNext} y2={midY} />
                    </motion.g>
                  );
                });
              })}

              {/* Final Winner Connector */}
              {!isRoundRobin && (() => {
                if (rounds.length === 0) return null;
                const finalMatch = rounds[rounds.length - 1][0];
                if (finalMatch && finalMatch.status === "COMPLETED" && finalMatch.winnerId) {
                  const xBase = (rounds.length - 1) * (MATCH_W + CONN_W) + MATCH_W;
                  const y1 = mCenterY(rounds.length - 1, 0);
                  return (
                    <motion.g key="winner-line" initial={{ opacity: 0, pathLength: 0 }} animate={{ opacity: 1, pathLength: 1 }} transition={{ delay: 0.5, duration: 0.8 }} stroke="#FF7400" strokeWidth={2.5} fill="none">
                      <line x1={xBase} y1={y1} x2={xBase + CONN_W} y2={y1} />
                    </motion.g>
                  );
                }
                return null;
              })()}
            </svg>

            {/* Match cards */}
            {rounds.map((round, ri) => {
              const xOffset = ri * (MATCH_W + CONN_W);
              return round.map((match, mi) => {
                let top = mTop(ri, mi);
                const isBronzeMatch = ri === rounds.length - 1 && mi === 1;
                
                if (isBronzeMatch) {
                  // Position the bronze match visually below the gold match
                  top = mTop(ri, 0) + MATCH_H + 40; // 40px gap
                }

                const isWinnerA = match.winnerId && match.winnerId === match.slotA.playerId;
                const isWinnerB = match.winnerId && match.winnerId === match.slotB.playerId;
                const staggerDelay = ri * 0.18 + mi * 0.07;

                return (
                  <motion.div
                    key={match.matchId}
                    style={{ position: "absolute", top, left: xOffset, width: MATCH_W, zIndex: 1 }}
                    initial={{ opacity: 0, x: -60, scale: 0.8, rotateY: -25 }}
                    animate={{ opacity: 1, x: 0, scale: 1, rotateY: 0 }}
                    transition={{ delay: staggerDelay, type: "spring", stiffness: 280, damping: 22 }}
                    className={`group bg-white border rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:border-blue-300 transition-shadow ${
                      isBronzeMatch ? "border-amber-400 border-2" : "border-slate-200"
                    }`}
                  >
                    {isBronzeMatch && (
                      <div className="bg-gradient-to-r from-amber-500 to-amber-400 text-white text-[9px] font-black uppercase text-center py-0.5 tracking-wider">
                        🥉 Bronze Match
                      </div>
                    )}
                    {/* Player A row */}
                    <div className={`flex items-center gap-1.5 px-3 py-2 border-b border-slate-100 min-h-[34px] ${match.slotA.isBye ? "opacity-25" : ""} ${isWinnerA ? "bg-emerald-50" : "hover:bg-blue-50/50"} transition-colors`}>
                      {match.slotA.seedNumber && (
                        <span className="shrink-0 text-[8px] font-black text-amber-600 bg-amber-100 w-4 h-4 rounded flex items-center justify-center">
                          {match.slotA.seedNumber}
                        </span>
                      )}
                      {!match.slotA.isBye && match.slotA.club && (
                        <span className="shrink-0 text-[9px] font-black text-blue-600">[{clubCode(match.slotA.club)}]</span>
                      )}
                      <span className={`text-[11px] font-bold truncate leading-tight ${match.slotA.isBye ? "text-slate-300 italic" : isWinnerA ? "text-emerald-700" : "text-slate-800"}`}>
                        {match.slotA.playerName}
                      </span>
                      {isWinnerA && <span className="ml-auto text-emerald-500 text-[9px] shrink-0">✓</span>}
                    </div>

                    {/* Player B row */}
                    <div className={`flex items-center gap-1.5 px-3 py-2 min-h-[34px] ${match.slotB.isBye ? "opacity-25" : ""} ${isWinnerB ? "bg-emerald-50" : "hover:bg-blue-50/50"} transition-colors`}>
                      {match.slotB.seedNumber && (
                        <span className="shrink-0 text-[8px] font-black text-amber-600 bg-amber-100 w-4 h-4 rounded flex items-center justify-center">
                          {match.slotB.seedNumber}
                        </span>
                      )}
                      {!match.slotB.isBye && match.slotB.club && (
                        <span className="shrink-0 text-[9px] font-black text-blue-600">[{clubCode(match.slotB.club)}]</span>
                      )}
                      <span className={`text-[11px] font-bold truncate leading-tight ${match.slotB.isBye ? "text-slate-300 italic" : isWinnerB ? "text-emerald-700" : "text-slate-800"}`}>
                        {match.slotB.playerName}
                      </span>
                      {isWinnerB && <span className="ml-auto text-emerald-500 text-[9px] shrink-0">✓</span>}
                    </div>

                    {/* Match info + Scoreboard button */}
                    <div className="flex items-center justify-between px-2 py-0.5 bg-slate-50 border-t border-slate-100">
                      <span className="text-[8px] text-slate-400 font-semibold">
                        {match.status === "COMPLETED" ? "✓ Done" : `Mat ${match.matNumber} · #${match.matchNumber}`}
                      </span>
                      {!match.slotA.isBye && !match.slotB.isBye &&
                       match.slotA.playerName !== "TBD" && match.slotB.playerName !== "TBD" &&
                       match.status !== "COMPLETED" && (
                        <button
                          onClick={() => onOpenScoreboard(match)}
                          disabled={!(ri === 0 || rounds[ri - 1].every(m => m.status === "COMPLETED"))}
                          title={!(ri === 0 || rounds[ri - 1].every(m => m.status === "COMPLETED")) ? "Previous round must be completed first" : ""}
                          className={`text-[8px] font-black transition-colors flex items-center gap-0.5 opacity-0 group-hover:opacity-100 ${
                            (ri === 0 || rounds[ri - 1].every(m => m.status === "COMPLETED"))
                              ? "text-orange-500 hover:text-orange-700"
                              : "text-slate-400 cursor-not-allowed"
                          }`}>
                          <Monitor size={8} /> Scoreboard ↗
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              });
            })}

            {/* Champion Node */}
            {!isRoundRobin && (() => {
              if (rounds.length === 0) return null;
              const finalMatch = rounds[rounds.length - 1][0];
              if (!finalMatch || finalMatch.status !== "COMPLETED" || !finalMatch.winnerId) return null;
              
              const isSlotAWinner = finalMatch.winnerId === finalMatch.slotA.playerId;
              const championName = isSlotAWinner ? finalMatch.slotA.playerName : finalMatch.slotB.playerName;
              const championClub = isSlotAWinner ? finalMatch.slotA.club : finalMatch.slotB.club;
              const top = mCenterY(rounds.length - 1, 0) - MATCH_H / 2;
              const xOffset = rounds.length * (MATCH_W + CONN_W);

              return (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5, x: -20 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  transition={{ delay: 0.7, type: "spring", stiffness: 200, damping: 15 }}
                  style={{ position: "absolute", top, left: xOffset, width: MATCH_W - 20, height: MATCH_H, zIndex: 2 }}
                  className="bg-gradient-to-r from-orange-500 to-[#FF7400] rounded-xl shadow-xl shadow-orange-500/30 overflow-hidden flex items-center justify-center border border-white"
                >
                  <div className="absolute top-0 right-0 w-16 h-16 bg-white opacity-10 rounded-bl-full" />
                  <div className="absolute bottom-0 left-0 w-10 h-10 bg-white opacity-10 rounded-tr-full" />
                  
                  <div className="flex items-center gap-3 w-full px-4 relative z-10">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shrink-0 shadow-inner">
                      <Trophy size={20} className="text-[#FF7400]" />
                    </div>
                    <div className="flex flex-col min-w-0 flex-grow">
                      <span className="text-[9px] font-black text-orange-100 uppercase tracking-widest leading-none mb-0.5">Gold Medalist</span>
                      <span className="text-sm font-black text-white truncate leading-tight">{championName}</span>
                      <span className="text-[10px] font-bold text-orange-200 truncate leading-tight">{championClub || "---"}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })()}

            {/* Round Robin Leaderboard */}
            {isRoundRobin && (() => {
              // Calculate standings
              interface PlayerStanding {
                playerId: string;
                name: string;
                club: string;
                wins: number;
                points: number;
                totalWinningTime: number; // in seconds
                matchesPlayed: number;
              }

              const standingsMap: Record<string, PlayerStanding> = {};
              players.forEach(p => {
                standingsMap[p.id] = { playerId: p.id, name: p.name, club: p.club, wins: 0, points: 0, totalWinningTime: 0, matchesPlayed: 0 };
              });

              const allMatches: BracketMatch[] = [];
              rounds.forEach(r => {
                r.forEach(m => {
                  allMatches.push(m);
                  if (m.status === "COMPLETED") {
                    const elapsed = m.elapsedSeconds || 0;
                    
                    // Increment matches played
                    if (m.slotA.playerId && standingsMap[m.slotA.playerId]) standingsMap[m.slotA.playerId].matchesPlayed += 1;
                    if (m.slotB.playerId && standingsMap[m.slotB.playerId]) standingsMap[m.slotB.playerId].matchesPlayed += 1;
                    
                    // Calculate and add points achieved in this match
                    const ptsA = m.scoreA ? ( (m.scoreA.ippon || 0) * 100 + (m.scoreA.wazaAri || 0) * 10 + (m.scoreA.yuko || 0) * 1 ) : 0;
                    const ptsB = m.scoreB ? ( (m.scoreB.ippon || 0) * 100 + (m.scoreB.wazaAri || 0) * 10 + (m.scoreB.yuko || 0) * 1 ) : 0;
                    
                    if (m.slotA.playerId && standingsMap[m.slotA.playerId]) {
                      // Points are capped at 100 per match
                      standingsMap[m.slotA.playerId].points += Math.min(ptsA, 100);
                    }
                    if (m.slotB.playerId && standingsMap[m.slotB.playerId]) {
                      standingsMap[m.slotB.playerId].points += Math.min(ptsB, 100);
                    }

                    // Increment wins and winning time
                    if (m.winnerId && standingsMap[m.winnerId]) {
                      standingsMap[m.winnerId].wins += 1;
                      standingsMap[m.winnerId].totalWinningTime += elapsed;
                    }
                  }
                });
              });

              const sortedPlayers = Object.values(standingsMap).sort((a, b) => {
                // Rule 1: Contests Won
                if (b.wins !== a.wins) return b.wins - a.wins;

                // Rule 2: Sum of all points
                if (b.points !== a.points) return b.points - a.points;

                // Rule 3: Direct comparison (head-to-head) - only if exactly 2 players are tied on wins and points
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

                // Rule 4: Shortest accumulated winning time (smaller is better)
                if (a.totalWinningTime !== b.totalWinningTime) {
                  return a.totalWinningTime - b.totalWinningTime;
                }

                // Fallback Head-to-Head: If still tied, check the direct match between these two players
                const headToHead = allMatches.find(m => 
                  m.status === "COMPLETED" && 
                  ((m.slotA.playerId === a.playerId && m.slotB.playerId === b.playerId) ||
                   (m.slotA.playerId === b.playerId && m.slotB.playerId === a.playerId))
                );
                if (headToHead && headToHead.winnerId) {
                  return headToHead.winnerId === a.playerId ? -1 : 1;
                }

                // Rule 5: Decision contests (exact tie)
                return 0;
              });

              const xOffset = rounds.length * (MATCH_W + CONN_W);

              return (
                <div style={{ position: "absolute", top: 0, left: xOffset, width: 280, zIndex: 2 }} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-md">
                  <div className="bg-gradient-to-r from-emerald-600 to-teal-600 border-b border-emerald-700 px-3 py-2 flex items-center justify-between text-white">
                    <h4 className="text-xs font-black uppercase tracking-wider">Round Robin Standings</h4>
                    <div className="flex items-center gap-1.5">
                      <button 
                        onClick={() => exportRoundRobinPoolSheet(tournament || null, currentKey || "", currentDraw as DrawCategory, players)}
                        className="text-[10px] bg-white/20 hover:bg-white/35 px-2 py-0.5 rounded font-bold transition-all flex items-center gap-1 text-white border border-white/10"
                        title="Print Official IJF Round Robin Pool Sheet"
                      >
                        <Printer size={10} /> Print Sheet
                      </button>
                      <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full font-bold cursor-help" title="Rules: 1. Wins | 2. Points (Ippon=100, Waza-ari=10, Yuko=1) | 3. Head-to-Head | 4. Shortest winning time">Rules ℹ️</span>
                    </div>
                  </div>
                  
                  <div className="p-1">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead>
                        <tr className="text-slate-500 border-b border-slate-100 font-bold">
                          <th className="py-1.5 px-2 text-center w-8">Rk</th>
                          <th className="py-1.5 px-1">Athlete</th>
                          <th className="py-1.5 px-1 text-center w-8" title="Wins">W</th>
                          <th className="py-1.5 px-1 text-center w-8" title="Points (Ippon=100, Waza-ari=10, Yuko=1)">Pts</th>
                          <th className="py-1.5 px-1 text-center w-12" title="Total Winning Time">Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {sortedPlayers.map((p, idx) => {
                          const rankColor = idx === 0 ? "bg-amber-100 text-amber-800 font-black border border-amber-300" :
                                            idx === 1 ? "bg-slate-100 text-slate-800 font-black border border-slate-300" :
                                            idx === 2 ? "bg-orange-100 text-orange-800 font-black border border-orange-300" :
                                            "bg-slate-50 text-slate-600 border border-slate-200";
                          
                          const formatTime = (sec: number) => {
                            if (!sec) return "0s";
                            const m = Math.floor(sec / 60);
                            const s = sec % 60;
                            return m > 0 ? `${m}m ${s}s` : `${s}s`;
                          };

                          return (
                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                              <td className="py-2 px-1 text-center">
                                <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[9px] ${rankColor}`}>
                                  {idx + 1}
                                </span>
                              </td>
                              <td className="py-2 px-1 min-w-0">
                                <p className="font-bold text-slate-800 truncate max-w-[120px]" title={p.name}>{p.name}</p>
                                <p className="text-[9px] text-slate-400 truncate max-w-[120px]" title={p.club}>{p.club || "---"}</p>
                              </td>
                              <td className="py-2 px-1 text-center font-black text-emerald-600">{p.wins}</td>
                              <td className="py-2 px-1 text-center font-black text-blue-600">{p.points}</td>
                              <td className="py-2 px-1 text-center font-semibold text-slate-500">{formatTime(p.totalWinningTime)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}



// ─── Import Players Wizard (Inline Component) ─────────────────────────────
function ImportPlayersWizard({
  tournamentId,
  onClose,
  onSuccess,
}: {
  tournamentId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [step, setStep] = React.useState<"upload" | "validating" | "summary" | "importing" | "complete">("upload");
  const [file, setFile] = React.useState<File | null>(null);
  const [progress, setProgress] = React.useState(0);
  const [errorMsg, setErrorMsg] = React.useState("");
  const [validateBefore, setValidateBefore] = React.useState(true);
  const [updateExisting, setUpdateExisting] = React.useState(true);
  const [result, setResult] = React.useState<{ successCount: number; failedCount: number; errors: { row: number; error: string }[]; totalRows: number } | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = React.useState(0);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const reset = () => { setStep("upload"); setFile(null); setProgress(0); setResult(null); setErrorMsg(""); setElapsedSeconds(0); };
  const handleClose = () => { if (step === "validating" || step === "importing") return; reset(); onClose(); };

  const simulateProgress = (next: "summary") => {
    let v = 0;
    const iv = setInterval(() => {
      v += Math.floor(Math.random() * 15) + 8;
      if (v >= 100) { v = 100; clearInterval(iv); setTimeout(() => setStep(next), 300); }
      setProgress(v);
    }, 120);
  };

  const doImport = async () => {
    if (!file) return;
    setStep("importing"); setProgress(0); setElapsedSeconds(0);
    const progIv = setInterval(() => setProgress(p => Math.min(p + 4, 85)), 200);
    const elapsedIv = setInterval(() => setElapsedSeconds(s => s + 1), 1000);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/tournaments/${tournamentId}/registrations/bulk`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      clearInterval(elapsedIv);
      const data = await res.json();
      clearInterval(progIv);
      setProgress(100);
      setTimeout(() => {
        if (res.ok) {
          setResult({ successCount: data.successCount || 0, failedCount: data.failedCount || 0, errors: data.errors || [], totalRows: (data.successCount || 0) + (data.failedCount || 0) });
          setStep("complete");
          onSuccess();
        } else {
          setErrorMsg(data.error || "Server error during import.");
          setStep("upload");
        }
      }, 400);
    } catch {
      clearInterval(progIv);
      clearInterval(elapsedIv);
      setErrorMsg("Network error. Please try again.");
      setStep("upload");
    }
  };

  const onFileChange = (f: File | null) => { if (!f) return; setFile(f); setErrorMsg(""); };

  return createPortal(
    <div style={{ position: "fixed", inset: 0, top: 0, left: 0, right: 0, bottom: 0, width: "100vw", height: "100vh", backgroundColor: "rgba(15,23,42,0.7)", zIndex: 999999, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
      <div style={{ background: "#fff", borderRadius: "24px", boxShadow: "0 25px 50px rgba(0,0,0,0.25)", width: "100%", maxWidth: "700px", display: "flex", flexDirection: "column", maxHeight: "90vh", overflow: "hidden" }}>
        
        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "36px", height: "36px", background: "#eff6ff", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Upload size={18} style={{ color: "#2563eb" }} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 900, color: "#0f172a" }}>Player Bulk Import</h2>
              <p style={{ margin: 0, fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Upload Excel to add players to this tournament</p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 700 }}>
            <span style={{ color: step === "upload" ? "#2563eb" : "#10b981", padding: "4px 10px", background: step === "upload" ? "#eff6ff" : "#f0fdf4", borderRadius: "20px" }}>1. Upload</span>
            <ChevronRight size={14} style={{ color: "#94a3b8" }} />
            <span style={{ color: (step === "validating" || step === "summary") ? "#2563eb" : (step === "importing" || step === "complete") ? "#10b981" : "#94a3b8", padding: "4px 10px", background: (step === "validating" || step === "summary") ? "#eff6ff" : (step === "importing" || step === "complete") ? "#f0fdf4" : "transparent", borderRadius: "20px" }}>2. Validate</span>
            <ChevronRight size={14} style={{ color: "#94a3b8" }} />
            <span style={{ color: step === "importing" ? "#2563eb" : step === "complete" ? "#10b981" : "#94a3b8", padding: "4px 10px", background: step === "importing" ? "#eff6ff" : step === "complete" ? "#f0fdf4" : "transparent", borderRadius: "20px" }}>3. Import</span>
          </div>
          {step !== "validating" && step !== "importing" && (
            <button type="button" onClick={handleClose} style={{ background: "none", border: "none", cursor: "pointer", padding: "6px", borderRadius: "8px", display: "flex", alignItems: "center", color: "#64748b" }}>
              <X size={20} />
            </button>
          )}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
          
          {/* STEP 1: Upload */}
          {step === "upload" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <a
                href="/templates/players_import_template.xlsx"
                download
                style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: 700, color: "#2563eb", background: "#eff6ff", padding: "8px 14px", borderRadius: "10px", textDecoration: "none" }}
              >
                <Download size={14} /> Download Excel Template
              </a>
              {errorMsg && (
                <div style={{ padding: "12px 16px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "12px", color: "#dc2626", fontSize: "13px", fontWeight: 700, display: "flex", alignItems: "center", gap: "8px" }}>
                  <AlertCircle size={16} /> {errorMsg}
                </div>
              )}
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) onFileChange(f); }}
                style={{ border: `2px dashed ${file ? "#10b981" : "#cbd5e1"}`, borderRadius: "20px", padding: "48px 24px", textAlign: "center", background: file ? "#f0fdf4" : "#f8fafc", cursor: "pointer", transition: "all 0.2s" }}
                onClick={() => fileRef.current?.click()}
              >
                {file ? (
                  <>
                    <CheckCircle2 size={48} style={{ color: "#10b981", margin: "0 auto 12px" }} />
                    <p style={{ fontSize: "16px", fontWeight: 900, color: "#065f46", margin: "0 0 4px" }}>{file.name}</p>
                    <p style={{ fontSize: "12px", color: "#059669", fontWeight: 600, margin: "0 0 12px" }}>{(file.size / 1024 / 1024).toFixed(2)} MB — Ready to import</p>
                    <button type="button" onClick={e => { e.stopPropagation(); setFile(null); }} style={{ fontSize: "12px", color: "#ef4444", fontWeight: 700, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>Remove File</button>
                  </>
                ) : (
                  <>
                    <Upload size={48} style={{ color: "#94a3b8", margin: "0 auto 12px" }} />
                    <p style={{ fontSize: "16px", fontWeight: 900, color: "#334155", margin: "0 0 8px" }}>Click or Drag & Drop your Excel file here</p>
                    <p style={{ fontSize: "13px", color: "#64748b", margin: 0 }}>Supported: .xlsx, .xls, .csv — Max 5 MB</p>
                  </>
                )}
              </div>
              <input type="file" accept=".xlsx,.xls,.csv" ref={fileRef} style={{ display: "none" }} onChange={e => onFileChange(e.target.files?.[0] || null)} />

              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
                <p style={{ margin: 0, fontSize: "11px", fontWeight: 900, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px" }}>Import Options</p>
                <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                  <input type="checkbox" checked={validateBefore} onChange={e => setValidateBefore(e.target.checked)} style={{ width: "16px", height: "16px" }} />
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "#334155" }}>Validate file before importing (Recommended)</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                  <input type="checkbox" checked={updateExisting} onChange={e => setUpdateExisting(e.target.checked)} style={{ width: "16px", height: "16px" }} />
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "#334155" }}>Create new player profile if Aadhaar not found</span>
                </label>
              </div>
            </div>
          )}

          {/* STEP 2/4: Progress */}
          {(step === "validating" || step === "importing") && (
            <div style={{ textAlign: "center", padding: "48px 0" }}>
              <Loader2 size={56} style={{ color: "#2563eb", margin: "0 auto 20px", animation: "spin 1s linear infinite" }} />
              <h3 style={{ fontSize: "20px", fontWeight: 900, color: "#0f172a", margin: "0 0 8px" }}>
                {step === "validating" ? "Validating Your File..." : "Importing Players..."}
              </h3>
              <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 24px" }}>{file?.name}</p>
              <div style={{ background: "#e2e8f0", borderRadius: "999px", height: "10px", maxWidth: "400px", margin: "0 auto 12px", overflow: "hidden" }}>
                <div style={{ background: "#2563eb", height: "100%", borderRadius: "999px", width: `${progress}%`, transition: "width 0.3s ease" }} />
              </div>
              <p style={{ fontSize: "14px", fontWeight: 700, color: "#2563eb", margin: "0 0 8px" }}>{progress}%</p>
              {step === "importing" && (
                <>
                  <p style={{ fontSize: "13px", color: "#334155", fontWeight: 700, margin: "0 0 4px" }}>
                    Still working — {elapsedSeconds}s elapsed{elapsedSeconds > 20 ? " (large files can take a few minutes)" : ""}
                  </p>
                  <p style={{ fontSize: "12px", color: "#f59e0b", fontWeight: 700 }}>Please do not close this window...</p>
                </>
              )}
            </div>
          )}

          {/* STEP 3: Summary */}
          {step === "summary" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "16px", padding: "16px", display: "flex", gap: "12px", alignItems: "flex-start" }}>
                <CheckCircle2 size={24} style={{ color: "#2563eb", flexShrink: 0 }} />
                <div>
                  <h4 style={{ margin: "0 0 4px", fontWeight: 900, color: "#1e3a8a" }}>File Scanned Successfully</h4>
                  <p style={{ margin: 0, fontSize: "13px", color: "#1d4ed8" }}>File looks valid. Click "Confirm & Import" to begin importing players into the tournament database.</p>
                </div>
              </div>
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div><p style={{ margin: "0 0 4px", fontSize: "11px", fontWeight: 900, color: "#94a3b8", textTransform: "uppercase" }}>File</p><p style={{ margin: 0, fontWeight: 700, color: "#334155" }}>{file?.name}</p></div>
                <div><p style={{ margin: "0 0 4px", fontSize: "11px", fontWeight: 900, color: "#94a3b8", textTransform: "uppercase" }}>Size</p><p style={{ margin: 0, fontWeight: 700, color: "#334155" }}>{((file?.size || 0) / 1024 / 1024).toFixed(2)} MB</p></div>
              </div>
            </div>
          )}

          {/* STEP 5: Complete */}
          {step === "complete" && result && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ background: result.failedCount === 0 ? "#f0fdf4" : "#fffbeb", border: `1px solid ${result.failedCount === 0 ? "#bbf7d0" : "#fde68a"}`, borderRadius: "20px", padding: "24px", display: "flex", gap: "16px", alignItems: "center" }}>
                <CheckCircle2 size={48} style={{ color: result.failedCount === 0 ? "#10b981" : "#f59e0b", flexShrink: 0 }} />
                <div>
                  <h3 style={{ margin: "0 0 4px", fontSize: "22px", fontWeight: 900, color: result.failedCount === 0 ? "#065f46" : "#92400e" }}>Import Complete!</h3>
                  <p style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: result.failedCount === 0 ? "#059669" : "#b45309" }}>Processed {result.totalRows} rows from {file?.name}</p>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "16px", padding: "20px", textAlign: "center" }}>
                  <p style={{ margin: "0 0 4px", fontSize: "12px", fontWeight: 700, color: "#059669" }}>Successfully Imported</p>
                  <p style={{ margin: 0, fontSize: "36px", fontWeight: 900, color: "#047857" }}>{result.successCount}</p>
                </div>
                <div style={{ background: result.failedCount > 0 ? "#fef2f2" : "#f8fafc", border: `1px solid ${result.failedCount > 0 ? "#fecaca" : "#e2e8f0"}`, borderRadius: "16px", padding: "20px", textAlign: "center" }}>
                  <p style={{ margin: "0 0 4px", fontSize: "12px", fontWeight: 700, color: result.failedCount > 0 ? "#dc2626" : "#64748b" }}>Failed Rows</p>
                  <p style={{ margin: 0, fontSize: "36px", fontWeight: 900, color: result.failedCount > 0 ? "#b91c1c" : "#334155" }}>{result.failedCount}</p>
                </div>
              </div>
              {result.errors.length > 0 && (
                <div>
                  <h4 style={{ margin: "0 0 10px", fontWeight: 900, color: "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}><AlertCircle size={16} style={{ color: "#ef4444" }} /> Row Errors</h4>
                  <div style={{ border: "1px solid #fecaca", borderRadius: "12px", overflow: "hidden", maxHeight: "200px", overflowY: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                      <thead><tr style={{ background: "#fee2e2" }}><th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 900, color: "#b91c1c", width: "60px" }}>Row</th><th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 900, color: "#b91c1c" }}>Error</th></tr></thead>
                      <tbody>{result.errors.map((e, i) => <tr key={i} style={{ borderTop: "1px solid #fecaca" }}><td style={{ padding: "8px 12px", fontWeight: 900, color: "#dc2626" }}>{e.row}</td><td style={{ padding: "8px 12px", color: "#dc2626" }}>{e.error}</td></tr>)}</tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 24px", borderTop: "1px solid #e2e8f0", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            {step === "complete" && <button type="button" onClick={reset} style={{ fontSize: "13px", fontWeight: 700, color: "#2563eb", background: "none", border: "none", cursor: "pointer" }}>+ Import Another File</button>}
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            {(step === "upload" || step === "summary") && (
              <button type="button" onClick={handleClose} style={{ padding: "10px 20px", borderRadius: "12px", fontWeight: 700, fontSize: "13px", background: "none", border: "1px solid #e2e8f0", cursor: "pointer", color: "#64748b" }}>Cancel</button>
            )}
            {step === "upload" && (
              <button type="button" onClick={() => { if (!file) return; if (validateBefore) { setStep("validating"); simulateProgress("summary"); } else doImport(); }} disabled={!file}
                style={{ padding: "10px 24px", borderRadius: "12px", fontWeight: 900, fontSize: "13px", background: file ? "#2563eb" : "#94a3b8", color: "#fff", border: "none", cursor: file ? "pointer" : "not-allowed", display: "flex", alignItems: "center", gap: "6px" }}>
                Continue <ChevronRight size={16} />
              </button>
            )}
            {step === "summary" && (
              <button type="button" onClick={doImport} style={{ padding: "10px 24px", borderRadius: "12px", fontWeight: 900, fontSize: "13px", background: "#059669", color: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
                <CheckCircle2 size={16} /> Confirm & Import
              </button>
            )}
            {step === "complete" && (
              <button type="button" onClick={handleClose} style={{ padding: "10px 24px", borderRadius: "12px", fontWeight: 900, fontSize: "13px", background: "#0f172a", color: "#fff", border: "none", cursor: "pointer" }}>
                Close &amp; View Players
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

interface StudentSearchResult {
  id: string;
  refId?: string;
  name: string;
  gender: string;
  age: number;
  weight?: string | null;
  height?: string | null;
  belt?: string | null;
  district: string;
  club: string;
}

function AddPlayerModal({
  tournamentId,
  onClose,
  onSuccess,
}: {
  tournamentId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StudentSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selected, setSelected] = useState<StudentSearchResult | null>(null);
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [belt, setBelt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (!q) { setResults([]); setDropdownOpen(false); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_BASE}/students/search?q=${encodeURIComponent(q)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setResults(res.ok ? (data.students || []) : []);
        setDropdownOpen(true);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const pickStudent = (s: StudentSearchResult) => {
    setSelected(s);
    setWeight(s.weight || "");
    setHeight(s.height || "");
    setBelt(s.belt || "");
    setQuery("");
    setResults([]);
    setDropdownOpen(false);
    setErrorMsg("");
  };

  const handleAdd = async () => {
    if (!selected) return;
    setSubmitting(true);
    setErrorMsg("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/tournaments/${tournamentId}/registrations/manual`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ studentId: selected.id, weight, height, belt }),
      });
      const data = await res.json();
      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        setErrorMsg(data.error || "Failed to add player.");
      }
    } catch {
      setErrorMsg("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div style={{ position: "fixed", inset: 0, top: 0, left: 0, right: 0, bottom: 0, width: "100vw", height: "100vh", backgroundColor: "rgba(15,23,42,0.7)", zIndex: 999999, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
      <div style={{ background: "#fff", borderRadius: "24px", boxShadow: "0 25px 50px rgba(0,0,0,0.25)", width: "100%", maxWidth: "480px", display: "flex", flexDirection: "column", maxHeight: "90vh", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "36px", height: "36px", background: "#fff1e4", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Users size={18} style={{ color: "#FF7400" }} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 900, color: "#0f172a" }}>Add Player</h2>
              <p style={{ margin: 0, fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Register an existing approved player for this tournament</p>
            </div>
          </div>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: "6px", borderRadius: "8px", display: "flex", alignItems: "center", color: "#64748b" }}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: "18px" }}>
          {errorMsg && (
            <div style={{ padding: "12px 16px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "12px", color: "#dc2626", fontSize: "13px", fontWeight: 700, display: "flex", alignItems: "center", gap: "8px" }}>
              <AlertCircle size={16} /> {errorMsg}
            </div>
          )}

          {!selected ? (
            <div style={{ position: "relative" }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 900, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>Search Player — name or ID</label>
              <div style={{ position: "relative" }}>
                <Search size={18} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => { if (results.length) setDropdownOpen(true); }}
                  placeholder="Start typing... e.g. Arjun or TMP4F2A"
                  autoComplete="off"
                  style={{ width: "100%", padding: "14px 16px 14px 42px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "14px", fontWeight: 700, fontSize: "15px", color: "#0f172a" }}
                />
                {searching && <Loader2 size={18} className="animate-spin" style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />}
              </div>
              {dropdownOpen && (
                <div style={{ position: "absolute", zIndex: 10, top: "calc(100% + 6px)", left: 0, right: 0, background: "#fff", border: "1px solid #e2e8f0", borderRadius: "14px", boxShadow: "0 20px 40px rgba(0,0,0,0.15)", overflow: "hidden", maxHeight: "260px", overflowY: "auto" }}>
                  {results.length === 0 ? (
                    <div style={{ padding: "16px", fontSize: "13px", fontWeight: 700, color: "#94a3b8" }}>
                      {searching ? "Searching…" : `No player matches "${query}"`}
                    </div>
                  ) : (
                    results.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => pickStudent(s)}
                        style={{ width: "100%", display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", background: "none", border: "none", borderBottom: "1px solid #f1f5f9", cursor: "pointer", textAlign: "left" }}
                      >
                        <div style={{ width: "34px", height: "34px", borderRadius: "999px", background: "#fff1e4", color: "#FF7400", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: "12px", flexShrink: 0 }}>
                          {s.name.split(" ").map(p => p[0]).slice(-2).join("").toUpperCase()}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ margin: 0, fontWeight: 900, color: "#0f172a", fontSize: "13.5px" }}>{s.name}</p>
                          <p style={{ margin: 0, fontSize: "11.5px", color: "#94a3b8", fontWeight: 700 }}>{s.refId} · {s.club}, {s.district}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
              <p style={{ fontSize: "12px", color: "#94a3b8", fontWeight: 600, marginTop: "8px" }}>Only approved players appear here. New players should use Import Players instead.</p>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", padding: "14px 16px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "14px" }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 900, color: "#065f46", fontSize: "15px" }}>{selected.name}</p>
                  <p style={{ margin: 0, fontSize: "11.5px", color: "#059669", fontWeight: 700 }}>{selected.refId} · {selected.club}, {selected.district}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  style={{ fontSize: "12px", fontWeight: 800, color: "#FF7400", background: "none", border: "none", cursor: "pointer" }}
                >
                  Change
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "10.5px", fontWeight: 900, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>Weight (kg)</label>
                  <input value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="e.g. 48" style={{ width: "100%", padding: "10px 12px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "10px", fontWeight: 700, fontSize: "13.5px" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "10.5px", fontWeight: 900, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>Height (cm)</label>
                  <input value={height} onChange={(e) => setHeight(e.target.value)} placeholder="e.g. 160" style={{ width: "100%", padding: "10px 12px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "10px", fontWeight: 700, fontSize: "13.5px" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "10.5px", fontWeight: 900, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>Belt</label>
                  <input value={belt} onChange={(e) => setBelt(e.target.value)} placeholder="e.g. Blue" style={{ width: "100%", padding: "10px 12px", background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "10px", fontWeight: 700, fontSize: "13.5px" }} />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 24px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <button type="button" onClick={onClose} style={{ padding: "10px 20px", borderRadius: "12px", fontWeight: 800, fontSize: "13px", background: "#f1f5f9", color: "#475569", border: "none", cursor: "pointer" }}>
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!selected || submitting}
            style={{ padding: "10px 24px", borderRadius: "12px", fontWeight: 900, fontSize: "13px", background: "#FF7400", color: "#fff", border: "none", cursor: selected ? "pointer" : "not-allowed", opacity: !selected || submitting ? 0.5 : 1, display: "flex", alignItems: "center", gap: "6px" }}
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            Add to Tournament
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function DisqualifyTab({
  players,
  tournamentId,
  onSuccess,
}: {
  players: RegisteredPlayer[];
  tournamentId: string;
  onSuccess: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentWeight, setCurrentWeight] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" | "warning" } | null>(null);

  const matchedPlayer = players.find(
    (p) =>
      p.tnjaId?.toLowerCase() === searchQuery.toLowerCase() ||
      p.tempId?.toLowerCase() === searchQuery.toLowerCase()
  );

  const handleCheck = () => {
    setMessage(null);
    if (!matchedPlayer) {
      setMessage({ text: "No player found with that TNJA ID.", type: "error" });
      return;
    }

    const weightVal = parseFloat(currentWeight);
    if (isNaN(weightVal)) {
      setMessage({ text: "Please enter a valid weight.", type: "error" });
      return;
    }

    // Logic: check against registered category limits.
    // e.g., if registered for "-66", weightVal must be <= 66.
    // if registered for "+78", weightVal must be > 78.
    const registeredWeightLabel = matchedPlayer.weightLabel || String(matchedPlayer.weight);
    
    // Parse weight label
    const isPlus = registeredWeightLabel.startsWith("+");
    const numMatch = registeredWeightLabel.match(/(\d+)/);
    const limit = numMatch ? parseFloat(numMatch[1]) : matchedPlayer.weight;

    let isDisqualified = false;
    
    if (isPlus) {
      if (weightVal <= limit) isDisqualified = true;
    } else {
      if (weightVal > limit) isDisqualified = true;
    }

    if (isDisqualified) {
      setMessage({ text: `Weight Exceeded! Player registered for ${registeredWeightLabel}kg.`, type: "error" });
    } else {
      setMessage({ text: `Weight OK for ${registeredWeightLabel}kg category!`, type: "success" });
    }
  };

  const handleDisqualify = async () => {
    if (!matchedPlayer) return;
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/tournaments/${tournamentId}/registrations/${matchedPlayer.regId}/disqualify`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ currentWeight })
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to disqualify");
      }
      setMessage({ text: "Player successfully disqualified.", type: "warning" });
      onSuccess();
    } catch (err: any) {
      setMessage({ text: err.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-black text-slate-800">Disqualify Player</h2>
        <p className="text-slate-500 font-medium">Search by TNJA ID to verify weigh-in limits.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">Search Player (TNJA ID)</label>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="e.g. TNJA-12345"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 transition-all font-semibold"
            />
          </div>
        </div>

        {matchedPlayer && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 rounded-2xl bg-slate-50 border border-slate-200"
          >
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase">Name</p>
                <p className="font-black text-slate-800">{matchedPlayer.name}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase">Registered Category</p>
                <p className="font-black text-orange-600">{matchedPlayer.weightLabel || `${matchedPlayer.weight} kg`} ({matchedPlayer.ageGroup})</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase">Status</p>
                <p className={`font-bold ${matchedPlayer.status === "DISQUALIFIED" ? "text-red-600" : "text-emerald-600"}`}>
                  {matchedPlayer.status}
                </p>
              </div>
            </div>

            {matchedPlayer.status !== "DISQUALIFIED" && (
              <div className="space-y-3 pt-4 border-t border-slate-200">
                <label className="block text-sm font-bold text-slate-700">Actual Weigh-in Weight (kg)</label>
                <div className="flex gap-3">
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 66.5"
                    value={currentWeight}
                    onChange={(e) => setCurrentWeight(e.target.value)}
                    className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-300 font-semibold"
                  />
                  <button
                    onClick={handleCheck}
                    disabled={!currentWeight}
                    className="px-6 py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-700 transition-colors disabled:opacity-50"
                  >
                    Check
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}

        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className={`p-4 rounded-xl text-sm font-bold flex items-start gap-3 ${
                message.type === "success"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : message.type === "error"
                  ? "bg-red-50 text-red-700 border border-red-200"
                  : "bg-orange-50 text-orange-700 border border-orange-200"
              }`}
            >
              {message.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} className="shrink-0 mt-0.5" />}
              <div className="flex-1">
                <p>{message.text}</p>
                {message.type === "error" && matchedPlayer && matchedPlayer.status !== "DISQUALIFIED" && (
                  <button
                    onClick={handleDisqualify}
                    disabled={loading}
                    className="mt-3 flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
                    Confirm Disqualification
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
