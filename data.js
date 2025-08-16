// In-memory data storage
const users = new Map();
const recognitions = new Map();
const teams = new Map();

// Mock teams
const mockTeams = [
  { id: 'team1', name: 'Engineering' },
  { id: 'team2', name: 'Product' },
  { id: 'team3', name: 'Marketing' }
];

// Mock users
const mockUsers = [
  { id: 'user1', email: 'john@company.com', name: 'John Doe', role: 'EMPLOYEE', teamId: 'team1' },
  { id: 'user2', email: 'jane@company.com', name: 'Jane Smith', role: 'MANAGER', teamId: 'team1' },
  { id: 'user3', email: 'bob@company.com', name: 'Bob Wilson', role: 'EMPLOYEE', teamId: 'team1' },
  { id: 'user4', email: 'alice@company.com', name: 'Alice Johnson', role: 'EMPLOYEE', teamId: 'team2' },
  { id: 'user5', email: 'charlie@company.com', name: 'Charlie Brown', role: 'MANAGER', teamId: 'team2' },
  { id: 'user6', email: 'diana@company.com', name: 'Diana Prince', role: 'ADMIN', teamId: null },
  { id: 'user7', email: 'eve@company.com', name: 'Eve Adams', role: 'EMPLOYEE', teamId: 'team3' },
  { id: 'user8', email: 'frank@company.com', name: 'Frank Castle', role: 'EMPLOYEE', teamId: 'team3' },
  { id: 'user9', email: 'grace@company.com', name: 'Grace Hopper', role: 'MANAGER', teamId: 'team3' },
  { id: 'user10', email: 'henry@company.com', name: 'Henry Ford', role: 'EMPLOYEE', teamId: 'team1' }
];

// Mock recognitions
const mockRecognitions = [
  {
    id: 'rec1',
    message: 'Great job on the quarterly presentation! 🎯',
    emoji: '🎯',
    visibility: 'PUBLIC',
    senderId: 'user2',
    recipientId: 'user1',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'rec2',
    message: 'Thank you for staying late to help with the deployment',
    emoji: '🚀',
    visibility: 'PUBLIC',
    senderId: 'user1',
    recipientId: 'user3',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'rec3',
    message: 'Excellent problem-solving skills during the incident',
    emoji: '🔧',
    visibility: 'ANONYMOUS',
    senderId: 'user2',
    recipientId: 'user1',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'rec4',
    message: 'Thanks for the code review feedback',
    emoji: '👍',
    visibility: 'PRIVATE',
    senderId: 'user3',
    recipientId: 'user1',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'rec5',
    message: 'Amazing work on the new feature launch!',
    emoji: '🌟',
    visibility: 'PUBLIC',
    senderId: 'user5',
    recipientId: 'user4',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'rec6',
    message: 'Your presentation was inspiring',
    emoji: '💡',
    visibility: 'PUBLIC',
    senderId: 'user7',
    recipientId: 'user9',
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
  }
];

// Initialize data
function initializeData() {
  // Load teams
  mockTeams.forEach(team => teams.set(team.id, team));
  
  // Load users
  mockUsers.forEach(user => users.set(user.id, user));
  
  // Load recognitions
  mockRecognitions.forEach(rec => recognitions.set(rec.id, rec));
}

// Helper functions
function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

function getUser(id) {
  return users.get(id);
}

function getUsers() {
  return Array.from(users.values());
}

function getTeam(id) {
  return teams.get(id);
}

function getTeams() {
  return Array.from(teams.values());
}

function getRecognitions() {
  return Array.from(recognitions.values());
}

function addRecognition(recognition) {
  recognitions.set(recognition.id, recognition);
  return recognition;
}

// Analytics helpers
function extractKeywords(text) {
  return text.toLowerCase()
    .split(/\W+/)
    .filter(word => word.length > 3)
    .slice(0, 5); // Top 5 words
}

function getTeamAnalytics(teamId) {
  const teamRecognitions = getRecognitions().filter(rec => {
    const recipient = getUser(rec.recipientId);
    return recipient && recipient.teamId === teamId;
  });

  // Extract keywords
  const allKeywords = teamRecognitions.flatMap(rec => extractKeywords(rec.message));
  const keywordCounts = {};
  allKeywords.forEach(word => {
    keywordCounts[word] = (keywordCounts[word] || 0) + 1;
  });

  const topKeywords = Object.entries(keywordCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([keyword, count]) => ({ keyword, count }));

  // Monthly counts (simplified - just current month)
  const recognitionsByMonth = [{
    month: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' }),
    count: teamRecognitions.length
  }];

  // Most recognized user in team
  const recognitionCounts = {};
  teamRecognitions.forEach(rec => {
    recognitionCounts[rec.recipientId] = (recognitionCounts[rec.recipientId] || 0) + 1;
  });

  const mostRecognizedUserId = Object.entries(recognitionCounts)
    .sort(([,a], [,b]) => b - a)[0]?.[0];

  return {
    teamId,
    teamName: getTeam(teamId)?.name || 'Unknown Team',
    totalRecognitions: teamRecognitions.length,
    topKeywords,
    recognitionsByMonth,
    mostRecognizedUser: mostRecognizedUserId ? getUser(mostRecognizedUserId) : null
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
  getTeamAnalytics,
  users,
  recognitions,
  teams
};