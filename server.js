const express = require('express');
const { ApolloServer } = require('apollo-server-express');
const { createServer } = require('http');
const typeDefs = require('./schema');
const resolvers = require('./resolvers');
const { initializeData, getUser } = require('./data');
const { startBatchFlusher } = require('./notify');
const { postToSlack } = require('./slack');

async function startServer() {
  const app = express();

  // Initialize mock data
  initializeData();

  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: ({ req, connection }) => {
      // WebSocket connection (for subscriptions)
      if (connection) {
        return {
          user: connection.context.user || null
        };
      }

      // HTTP request
      const userId =
        req.headers['x-user-id'] || req.headers['authorization']?.replace('Bearer ', '');
      const user = userId ? getUser(userId) : null;

      return { user, req };
    },
    subscriptions: {
      onConnect: (connectionParams) => {
        const userId =
          connectionParams['x-user-id'] || connectionParams['authorization']?.replace('Bearer ', '');
        const user = userId ? getUser(userId) : null;

        return { user };
      }
    },
    introspection: true
  });

  await server.start();
  server.applyMiddleware({ app, path: '/graphql' });

  const httpServer = createServer(app);

  // Install subscriptions
  server.installSubscriptionHandlers && server.installSubscriptionHandlers(httpServer);

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
  });

  // Root info
  app.get('/', (req, res) => {
    res.json({
      message: 'Employee Recognition API',
      graphql: '/graphql',
      playground: '/graphql',
      health: '/health',
      documentation: 'See README.md for usage examples'
    });
  });

  // Enable batch flushing if env enabled
  if (process.env.BATCH_NOTIFICATIONS === 'true') {
    console.log('📦 Batch notifications enabled (interval: 10min)');
    startBatchFlusher(postToSlack, 10 * 60 * 1000);
  }

  const PORT = process.env.PORT || 4000;
  httpServer.listen(PORT, () => {
    console.log(`🚀 Server ready at http://localhost:${PORT}${server.graphqlPath}`);
    console.log(`🔔 Subscriptions ready at ws://localhost:${PORT}${server.subscriptionsPath || '/graphql'}`);
    console.log('\n📖 Sample header: x-user-id: user1');
    console.log('🧪 Try query: { me { name role } }');
  });
}

startServer().catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});
