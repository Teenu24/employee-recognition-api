const { PubSub, withFilter } = require('graphql-subscriptions');
const {
  generateId,
  getUser,
  getUsers,
  getTeam,
  getTeams,
  getRecognitions,
  addRecognition,
  getTeamAnalytics
} = require('./data');

const pubsub = new PubSub();

// Constants for subscriptions
const RECOGNITION_RECEIVED = 'RECOGNITION_RECEIVED';
const TEAM_RECOGNITION_FEED = 'TEAM_RECOGNITION_FEED';

// Access control helpers
function requireAuth(context) {
  if (!context.user) {
    throw new Error('Authentication required');
  }
  return context.user;
}

function requireRole(context, allowedRoles) {
  const user = requireAuth(context);
  if (!allowedRoles.includes(user.role)) {
    throw new Error(`Access denied. Required role: ${allowedRoles.join(' or ')}`);
  }
  return user;
}

function canViewRecognition(recognition, currentUser) {
  // Public recognitions are visible to everyone
  if (recognition.visibility === 'PUBLIC') return true;
  
  // Private recognitions only visible to sender and recipient
  if (recognition.visibility === 'PRIVATE') {
    return currentUser.id === recognition.senderId || currentUser.id === recognition.recipientId;
  }
  
  // Anonymous recognitions visible to recipient and based on other rules
  if (recognition.visibility === 'ANONYMOUS') {
    // Recipient can see it
    if (currentUser.id === recognition.recipientId) return true;
    
    // Managers can see anonymous recognitions in their team
    if (currentUser.role === 'MANAGER') {
      const recipient = getUser(recognition.recipientId);
      return recipient && recipient.teamId === currentUser.teamId;
    }
    
    // Admins can see all anonymous recognitions
    if (currentUser.role === 'ADMIN') return true;
  }
  
  return false;
}

function filterRecognitions(recognitions, currentUser, filter = {}) {
  let filtered = recognitions.filter(rec => canViewRecognition(rec, currentUser));
  
  // Apply additional filters
  if (filter.teamId) {
    filtered = filtered.filter(rec => {
      const recipient = getUser(rec.recipientId);
      return recipient && recipient.teamId === filter.teamId;
    });
  }
  
  if (filter.visibility) {
    filtered = filtered.filter(rec => rec.visibility === filter.visibility);
  }
  
  if (filter.recipientId) {
    filtered = filtered.filter(rec => rec.recipientId === filter.recipientId);
  }
  
  if (filter.senderId && currentUser.role !== 'EMPLOYEE') {
    filtered = filtered.filter(rec => rec.senderId === filter.senderId);
  }
  
  // Sort by creation date (newest first)
  return filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

const resolvers = {
  Query: {
    me: (_, __, context) => {
      return requireAuth(context);
    },
    
    users: (_, { teamId }, context) => {
      requireAuth(context);
      let users = getUsers();
      
      if (teamId) {
        users = users.filter(user => user.teamId === teamId);
      }
      
      return users;
    },
    
    recognitions: (_, { filter }, context) => {
      const currentUser = requireAuth(context);
      const allRecognitions = getRecognitions();
      return filterRecognitions(allRecognitions, currentUser, filter);
    },
    
    myRecognitions: (_, __, context) => {
      const currentUser = requireAuth(context);
      const allRecognitions = getRecognitions();
      
      // Return recognitions where user is sender or recipient
      const myRecognitions = allRecognitions.filter(rec => 
        rec.senderId === currentUser.id || rec.recipientId === currentUser.id
      );
      
      return filterRecognitions(myRecognitions, currentUser);
    },
    
    teamAnalytics: (_, { teamId }, context) => {
      const currentUser = requireAuth(context);
      
      // Only managers can see their own team analytics, admins can see any team
      if (currentUser.role === 'MANAGER' && currentUser.teamId !== teamId) {
        throw new Error('Access denied. Managers can only view their own team analytics');
      }
      
      if (currentUser.role === 'EMPLOYEE') {
        throw new Error('Access denied. Analytics require manager or admin role');
      }
      
      return getTeamAnalytics(teamId);
    },
    
    organizationAnalytics: (_, __, context) => {
      requireRole(context, ['ADMIN']);
      
      const teams = getTeams();
      return teams.map(team => getTeamAnalytics(team.id));
    },
    
    teams: (_, __, context) => {
      requireAuth(context);
      return getTeams();
    }
  },
  
  Mutation: {
    createRecognition: async (_, { input }, context) => {
      const currentUser = requireAuth(context);
      
      // Validate recipient exists
      const recipient = getUser(input.recipientId);
      if (!recipient) {
        throw new Error('Recipient not found');
      }
      
      // Prevent self-recognition
      if (currentUser.id === input.recipientId) {
        throw new Error('Cannot recognize yourself');
      }
      
      const recognition = {
        id: generateId(),
        message: input.message,
        emoji: input.emoji || null,
        visibility: input.visibility,
        senderId: input.visibility === 'ANONYMOUS' ? currentUser.id : currentUser.id,
        recipientId: input.recipientId,
        createdAt: new Date().toISOString()
      };
      
      addRecognition(recognition);
      
      // Publish real-time notifications
      pubsub.publish(RECOGNITION_RECEIVED, {
        recognitionReceived: recognition,
        userId: input.recipientId
      });
      
      // Publish team feed update if public
      if (input.visibility === 'PUBLIC' && recipient.teamId) {
        pubsub.publish(TEAM_RECOGNITION_FEED, {
          teamRecognitionFeed: recognition,
          teamId: recipient.teamId
        });
      }
      
      return recognition;
    },
    
    updateProfile: (_, { name, teamId }, context) => {
      const currentUser = requireAuth(context);
      
      // Update user data
      if (name) currentUser.name = name;
      if (teamId && getTeam(teamId)) currentUser.teamId = teamId;
      
      return currentUser;
    }
  },
  
  Subscription: {
    recognitionReceived: {
      subscribe: withFilter(
        () => pubsub.asyncIterator(RECOGNITION_RECEIVED),
        (payload, variables) => {
          return payload.userId === variables.userId;
        }
      )
    },
    
    teamRecognitionFeed: {
      subscribe: withFilter(
        () => pubsub.asyncIterator(TEAM_RECOGNITION_FEED),
        (payload, variables) => {
          return payload.teamId === variables.teamId;
        }
      )
    }
  },
  
  // Field resolvers
  User: {
    team: (parent) => parent.teamId ? getTeam(parent.teamId) : null
  },
  
  Team: {
    members: (parent) => getUsers().filter(user => user.teamId === parent.id)
  },
  
  Recognition: {
    sender: (parent, _, context) => {
      // Hide sender for anonymous recognitions unless user is admin/manager/recipient
      if (parent.visibility === 'ANONYMOUS') {
        const currentUser = context.user;
        if (!currentUser) return null;
        
        // Recipient can see sender
        if (currentUser.id === parent.recipientId) return getUser(parent.senderId);
        
        // Admins can see sender
        if (currentUser.role === 'ADMIN') return getUser(parent.senderId);
        
        // Managers can see sender if in same team as recipient
        if (currentUser.role === 'MANAGER') {
          const recipient = getUser(parent.recipientId);
          if (recipient && recipient.teamId === currentUser.teamId) {
            return getUser(parent.senderId);
          }
        }
        
        return null; // Hide sender for anonymous recognition
      }
      
      return getUser(parent.senderId);
    },
    
    recipient: (parent) => getUser(parent.recipientId),
    
    isAnonymous: (parent) => parent.visibility === 'ANONYMOUS'
  }
};

module.exports = resolvers;