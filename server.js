const express = require('express');
const { ApolloServer } = require('apollo-server-express');
const { createServer } = require('http');
const typeDefs = require('./schema');
const resolvers = require('./resolvers');
const { initializeData, getUser } = require('./data');

async function startServer() {
  const app = express();
  
  // Initialize mock data
  initializeData();
  
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: ({ req, connection }) => {
      // Handle both HTTP requests and WebSocket connections
      if (connection) {
        // WebSocket connection (for subscriptions)
        return {
          user: connection.context.user || null
        };
      } else {
        // HTTP request
        const userId = req.headers['x-user-id'] || req.headers['authorization']?.replace('Bearer ', '');
        const user = userId ? getUser(userId) : null;
        
        return {
          user,
          req
        };
      }
    },
    subscriptions: {
      onConnect: (connectionParams, webSocket) => {
        const userId = connectionParams['x-user-id'] || connectionParams['authorization']?.replace('Bearer ', '');
        const user = userId ? getUser(userId) : null;
        
        return {
          user
        };
      }
    },
    introspection: true,
  });

  await server.start();
  server.applyMiddleware({ app, path: '/graphql' });

  const httpServer = createServer(app);
  
  // Updated for Apollo Server v3 compatibility
  server.installSubscriptionHandlers && server.installSubscriptionHandlers(httpServer);

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
  });

  // API info endpoint
  app.get('/', (req, res) => {
    res.json({
      message: 'Employee Recognition API',
      graphql: '/graphql',
      playground: '/graphql',
      health: '/health',
      documentation: 'See README.md for usage examples'
    });
  });

  const PORT = process.env.PORT || 4000;

  httpServer.listen(PORT, () => {
    console.log(`🚀 Server ready at http://localhost:${PORT}${server.graphqlPath}`);
    console.log(`🔔 Subscriptions ready at ws://localhost:${PORT}${server.subscriptionsPath || '/graphql'}`);
    console.log('\n📖 Try these sample queries:');
    console.log('   • Set header: x-user-id: user1');
    console.log('   • Query: { me { name role team { name } } }');
    console.log('   • Query: { recognitions { message sender { name } recipient { name } } }');
  });
}

startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});