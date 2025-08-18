const { v4: uuidv4 } = require('uuid');

let users = [];
let teams = [];
let recognitions = [];

const keywordCountsByTeam = new Map();   // teamId => keyword => count
const monthlyCountsByTeam = new Map();   // teamId => YYYY-MM => count

function initializeData() {
  teams = [
    { id: 'team1', name: 'Engineering' },
    { id: 'team2', name: 'Marketing' }
  ];

  users = [
    { id: 'user1', name: 'Alice', role: 'EMPLOYEE', teamId: 'team1' },
    { id: 'user2', name: 'Bob', role: 'MANAGER', teamId: 'team1' },
    { id: 'user3', name: 'Charlie', role: 'EMPLOYEE', teamId: 'team1' },
    { id: 'user4', name: 'Dana', role: 'EMPLOYEE', teamId: 'team2' },
    { id: 'user5', name: 'Eve', role: 'MANAGER', teamId: 'team2' },
    { id: 'user6', name: 'Admin', role: 'ADMIN', teamId: null }
  ];

  recognitions = [];
  keywordCountsByTeam.clear();
  monthlyCountsByTeam.clear();
}

function generateId() {
  return uuidv4();
}

function getUser(id) {
  return users.find(u => u.id === id);
}

function getUsers() {
  return users;
}

function getTeam(id) {
  return teams.find(t => t.id === id);
}

function getTeams() {
  return teams;
}

function getRecognitions() {
  return recognitions;
}

function addRecognition(rec) {
  recognitions.push(rec);

  const recipient = getUser(rec.recipientId);
  const teamId = recipient?.teamId;
  const createdAt = rec.createdAt || new Date().toISOString();

  if (teamId) {
    // Monthly counts
    const ym = createdAt.slice(0, 7);
    if (!monthlyCountsByTeam.has(teamId)) monthlyCountsByTeam.set(teamId, new Map());
    const monthMap = monthlyCountsByTeam.get(teamId);
    monthMap.set(ym, (monthMap.get(ym) || 0) + 1);

    // Keyword index
    const keywords = (rec.message || '').toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
    if (!keywordCountsByTeam.has(teamId)) keywordCountsByTeam.set(teamId, new Map());
    const kwMap = keywordCountsByTeam.get(teamId);
    for (const word of keywords) {
      kwMap.set(word, (kwMap.get(word) || 0) + 1);
    }
  }
}

function getTeamAnalytics(teamId) {
  const team = getTeam(teamId);
  const members = users.filter(u => u.teamId === teamId).map(u => u.id);

  const totalRecognitions = recognitions.filter(r => members.includes(r.recipientId)).length;

  const kwMap = keywordCountsByTeam.get(teamId) || new Map();
  const topKeywords = [...kwMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([keyword, count]) => ({ keyword, count }));

  const monMap = monthlyCountsByTeam.get(teamId) || new Map();
  const recognitionsByMonth = [...monMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, count }));

  const tally = new Map();
  for (const r of recognitions) {
    if (members.includes(r.recipientId)) {
      tally.set(r.recipientId, (tally.get(r.recipientId) || 0) + 1);
    }
  }

  let mostRecognizedUser = null;
  let max = -1;
  for (const [uid, count] of tally.entries()) {
    if (count > max) {
      max = count;
      mostRecognizedUser = getUser(uid);
    }
  }

  return {
    teamId,
    teamName: team?.name || teamId,
    totalRecognitions,
    topKeywords,
    recognitionsByMonth,
    mostRecognizedUser
  };
}

module.exports = {
  initializeData,
  generateId,
  getUser,
  getUsers,
  getTeam,
  getTeams,
  getRecognitions,
  addRecognition,
  getTeamAnalytics
};
