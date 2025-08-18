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

const { enqueueNotification } = require('./notify');
const { postToSlack } = require('./slack');

const pubsub = new PubSub();
const RECOGNITION_RECEIVED = 'RECOGNITION_RECEIVED';
const TEAM_RECOGNITION_FEED = 'TEAM_RECOGNITION_FEED';

// --- Access Control ---
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
  if (recognition.visibility === 'PUBLIC') return true;

  if (recognition.visibility === 'PRIVATE') {
    return currentUser.id === recognition.senderId || currentUser.id === recognition.recipientId;
  }

  if (recognition.visibility === 'ANONYMOUS') {
    if (currentUser.id === recognition.recipientId) return true;
    if (currentUser.role === 'ADMIN') return true;
    if (currentUser.role === 'MANAGER') {
      const recipient = getUser(recognition.recipientId);
      return recipient?.teamId === currentUser.teamId;
    }
  }

  return false;
}

function filterRecognitions(recognitions, currentUser, filter = {}) {
  let filtered = recognitions.filter(rec => canViewRecognition(rec, currentUser));

  if (filter.teamId) {
    filtered = filtered.filter(rec => {
      const recipient = getUser(rec.recipientId);
      return recipient?.teamId === filter.teamId;
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

  return filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

// --- Resolvers ---
const resolvers = {
  Query: {
    me: (_, __, context) => requireAuth(context),

    users: (_, { teamId }, context) => {
      requireAuth(context);
      const all = getUsers();
      return teamId ? all.filter(u => u.teamId === teamId) : all;
    },

    recognitions: (_, { filter }, context) => {
      const currentUser = requireAuth(context);
      return filterRecognitions(getRecognitions(), currentUser, filter);
    },

    myRecognitions: (_, __, context) => {
      const currentUser = requireAuth(context);
      const all = getRecognitions().filter(r =>
        r.senderId === currentUser.id || r.recipientId === currentUser.id
      );
      return filterRecognitions(all, currentUser);
    },

    teamAnalytics: (_, { teamId }, context) => {
      const currentUser = requireAuth(context);
      if (currentUser.role === 'EMPLOYEE') throw new Error('Analytics not allowed for employees');
      if (currentUser.role === 'MANAGER' && currentUser.teamId !== teamId) {
        throw new Error('Managers can only view their own team');
      }
      return getTeamAnalytics(teamId);
    },

    organizationAnalytics: (_, __, context) => {
      requireRole(context, ['ADMIN']);
      return getTeams().map(t => getTeamAnalytics(t.id));
    },

    teams: (_, __, context) => {
      requireAuth(context);
      return getTeams();
    }
  },

  Mutation: {
    createRecognition: async (_, { input }, context) => {
      const currentUser = requireAuth(context);
      const recipient = getUser(input.recipientId);
      if (!recipient) throw new Error('Recipient not found');
      if (currentUser.id === input.recipientId) throw new Error('Cannot recognize yourself');

      const recognition = {
        id: generateId(),
        message: input.message,
        emoji: input.emoji || null,
        visibility: input.visibility,
        senderId: currentUser.id,
        recipientId: input.recipientId,
        createdAt: new Date().toISOString()
      };

      addRecognition(recognition);

      const batching = process.env.BATCH_NOTIFICATIONS === 'true';

      if (batching) {
        enqueueNotification(recognition);
      } else {
        pubsub.publish(RECOGNITION_RECEIVED, {
          recognitionReceived: recognition,
          userId: input.recipientId
        });

        if (input.visibility === 'PUBLIC' && recipient.teamId) {
          pubsub.publish(TEAM_RECOGNITION_FEED, {
            teamRecognitionFeed: recognition,
            teamId: recipient.teamId
          });
        }

        if (process.env.SLACK_WEBHOOK_URL) {
          postToSlack(recognition).catch(console.error);
        }
      }

      return recognition;
    },

    updateProfile: (_, { name, teamId }, context) => {
      const currentUser = requireAuth(context);
      if (name) currentUser.name = name;
      if (teamId && getTeam(teamId)) currentUser.teamId = teamId;
      return currentUser;
    }
  },

  Subscription: {
    recognitionReceived: {
      subscribe: withFilter(
        () => pubsub.asyncIterator(RECOGNITION_RECEIVED),
        (payload, variables) => payload.userId === variables.userId
      )
    },
    teamRecognitionFeed: {
      subscribe: withFilter(
        () => pubsub.asyncIterator(TEAM_RECOGNITION_FEED),
        (payload, variables) => payload.teamId === variables.teamId
      )
    }
  },

  User: {
    team: (parent) => parent.teamId ? getTeam(parent.teamId) : null
  },

  Team: {
    members: (parent) => getUsers().filter(user => user.teamId === parent.id)
  },

  Recognition: {
    sender: (parent, _, context) => {
      if (parent.visibility === 'ANONYMOUS') {
        const currentUser = context.user;
        if (!currentUser) return null;

        if (currentUser.id === parent.recipientId) return getUser(parent.senderId);
        if (currentUser.role === 'ADMIN') return getUser(parent.senderId);

        if (currentUser.role === 'MANAGER') {
          const recipient = getUser(parent.recipientId);
          if (recipient?.teamId === currentUser.teamId) {
            return getUser(parent.senderId);
          }
        }

        return null;
      }

      return getUser(parent.senderId);
    },

    recipient: (parent) => getUser(parent.recipientId),

    isAnonymous: (parent) => parent.visibility === 'ANONYMOUS'
  }
};

module.exports = resolvers;
