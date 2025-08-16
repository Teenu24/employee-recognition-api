const { gql } = require('apollo-server-express');

const typeDefs = gql`
  enum VisibilityType {
    PUBLIC
    PRIVATE
    ANONYMOUS
  }

  enum UserRole {
    EMPLOYEE
    MANAGER
    ADMIN
  }

  type User {
    id: ID!
    email: String!
    name: String!
    role: UserRole!
    teamId: String
    team: Team
  }

  type Team {
    id: ID!
    name: String!
    members: [User!]!
  }

  type Recognition {
    id: ID!
    message: String!
    emoji: String
    visibility: VisibilityType!
    sender: User
    senderId: String
    recipient: User!
    recipientId: String!
    createdAt: String!
    isAnonymous: Boolean!
  }

  type TeamAnalytics {
    teamId: String!
    teamName: String!
    totalRecognitions: Int!
    topKeywords: [KeywordCount!]!
    recognitionsByMonth: [MonthlyCount!]!
    mostRecognizedUser: User
  }

  type KeywordCount {
    keyword: String!
    count: Int!
  }

  type MonthlyCount {
    month: String!
    count: Int!
  }

  input CreateRecognitionInput {
    recipientId: String!
    message: String!
    emoji: String
    visibility: VisibilityType!
  }

  input RecognitionFilter {
    teamId: String
    visibility: VisibilityType
    recipientId: String
    senderId: String
  }

  type Query {
    me: User
    users(teamId: String): [User!]!
    recognitions(filter: RecognitionFilter): [Recognition!]!
    myRecognitions: [Recognition!]!
    teamAnalytics(teamId: String!): TeamAnalytics
    organizationAnalytics: [TeamAnalytics!]!
    teams: [Team!]!
  }

  type Mutation {
    createRecognition(input: CreateRecognitionInput!): Recognition!
    updateProfile(name: String, teamId: String): User!
  }

  type Subscription {
    recognitionReceived(userId: String!): Recognition!
    teamRecognitionFeed(teamId: String!): Recognition!
  }
`;

module.exports = typeDefs;