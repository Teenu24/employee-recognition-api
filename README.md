Employee Recognition API (GraphQL)

Send kudos to teammates, get real-time (or batched) notifications, and view team/org analytics — all with role-based access and privacy controls.

Features

Roles: EMPLOYEE, MANAGER, ADMIN

Visibility: PUBLIC, PRIVATE, ANONYMOUS

Real-time via GraphQL subscriptions (fallback: batch every 10 min)

Optional Slack notifications (Incoming Webhook)

Team & org analytics with keyword and monthly breakdowns

Simple header-based auth for local testing (x-user-id)

Quick Start
npm install
npm run dev


HTTP GraphQL: http://localhost:4000/graphql

WS Subscriptions: ws://localhost:4000/graphql

Health: http://localhost:4000/health

Environment (recommended: .env)
PORT=4000
BATCH_NOTIFICATIONS=false     # true = batch queue (10 min); false = realtime
SLACK_WEBHOOK_URL=            # optional Slack Incoming Webhook URL


If you use .env, ensure require('dotenv').config() is at the top of server.js.

Auth header (required for every request)
x-user-id: user1   # try user2 (manager), user6 (admin)

Common Operations (Postman-ready)
1) Who am I?
{ "query": "query { me { id name role team { id name } } }" }

2) Send recognition
{
  "query": "mutation ($input: CreateRecognitionInput!) { createRecognition(input: $input) { id message visibility sender { name } recipient { name } createdAt } }",
  "variables": {
    "input": {
      "recipientId": "user3",
      "message": "Fantastic job on the release!",
      "emoji": "🚀",
      "visibility": "PUBLIC"
    }
  }
}

3) Browse recognitions (visibility rules enforced)
{ "query": "query { recognitions { id message visibility sender { name } recipient { name } createdAt } }" }

4) My recognitions
{ "query": "query { myRecognitions { id message visibility sender { name } recipient { name } createdAt } }" }

5) Team analytics (manager/admin)
{ "query": "query { teamAnalytics(teamId:\"team1\") { teamName totalRecognitions topKeywords { keyword count } recognitionsByMonth { month count } mostRecognizedUser { name } } }" }

6) Org analytics (admin)
{ "query": "query { organizationAnalytics { teamName totalRecognitions mostRecognizedUser { name } } }" }

Subscriptions (Realtime)

Open in Apollo Sandbox/Altair:

subscription {
  recognitionReceived(userId: "user3") {
    id message visibility sender { name } recipient { name } createdAt
  }
}

subscription {
  teamRecognitionFeed(teamId: "team1") {
    id message sender { name } recipient { name } createdAt
  }
}


Set BATCH_NOTIFICATIONS=false for realtime. With true, events are queued and delivered via Slack (if configured) on flush.

Visibility & RBAC

PUBLIC: everyone can see.

PRIVATE: only sender & recipient can see.

ANONYMOUS: message visible; sender hidden unless viewer is:

recipient, or

recipient’s MANAGER (same team), or

ADMIN.

Self-recognition is blocked.

Access

EMPLOYEE: send recognition, view permitted recognitions/myRecognitions.

MANAGER: everything above + teamAnalytics (own team).

ADMIN: full read access + organizationAnalytics.

Slack & Batch

Set SLACK_WEBHOOK_URL to post recognitions to Slack.

Set BATCH_NOTIFICATIONS=true to queue and flush every 10 minutes.

Realtime subscriptions are disabled in batch mode.

For quick testing, temporarily reduce the interval in notify.js.

Project Structure
/employee-recognition-api
  ├─ server.js        # Express + Apollo + subscriptions + batch init
  ├─ schema.js        # GraphQL type definitions
  ├─ resolvers.js     # Queries, mutations, subscriptions, RBAC, visibility
  ├─ data.js          # In-memory storage + keyword/monthly analytics
  ├─ notify.js        # Batch queue + flusher
  ├─ slack.js         # Slack webhook sender (optional)
  ├─ package.json
  └─ README.md

Error Reference

Authentication required → missing/invalid x-user-id

Access denied → role not permitted

Recipient not found → invalid recipientId

Cannot recognize yourself → sender == recipient

Test Checklist (fast)

me with x-user-id:user1 → returns user & team ✅

createRecognition (PUBLIC/PRIVATE/ANONYMOUS) from user1 → user3 ✅

recognitions as user1, user3, user2(manager), user6(admin) → visibility rules ✅

teamAnalytics(team1) as user2 → data ✅

organizationAnalytics as user6 → data ✅

Subscriptions on with BATCH_NOTIFICATIONS=false → events arrive ✅

Set BATCH_NOTIFICATIONS=true + Slack webhook → queued then flushed to Slack ✅

High-Level API Specification
Purpose

Provide a lightweight employee recognition service with privacy controls, role-based access, real-time updates (or batch), plus team/org analytics designed for future DB/BI expansion.

Authentication

Header-based for local dev:

x-user-id: <userId> (e.g., user1, user2, user6)

Roles

EMPLOYEE — create + view allowed recognitions.

MANAGER — EMPLOYEE + team analytics (own team).

ADMIN — full read access + org analytics.

Core Entities

User: { id, name, role, teamId? }

Team: { id, name }

Recognition: { id, senderId, recipientId, message, emoji?, visibility, createdAt }

Visibility Semantics

PUBLIC: visible to all.

PRIVATE: sender & recipient only.

ANONYMOUS: sender identity hidden unless viewer is recipient, same-team manager, or admin.

GraphQL Surface (summary)
Queries

me: User!

users(teamId): [User!]!

teams: [Team!]!

recognitions(filter): [Recognition!]!

myRecognitions: [Recognition!]!

teamAnalytics(teamId: String!): TeamAnalytics! (MANAGER own team, ADMIN any)

organizationAnalytics: [TeamAnalytics!]! (ADMIN)

Mutations

createRecognition(input: CreateRecognitionInput!): Recognition!

updateProfile(name, teamId): User!

Subscriptions

recognitionReceived(userId: String!): Recognition!

teamRecognitionFeed(teamId: String!): Recognition!

Key Types

User { id, name, role, team }

Team { id, name, members }

Recognition { id, message, emoji, visibility, sender, recipient, createdAt, isAnonymous }

TeamAnalytics { teamId, teamName, totalRecognitions, topKeywords[{keyword,count}], recognitionsByMonth[{month,count}], mostRecognizedUser }

Inputs

CreateRecognitionInput { recipientId, message, emoji, visibility }

RecognitionsFilter { teamId, recipientId, senderId, visibility }

Non-functional Notes

In-memory storage for speed and simplicity; one-file swap to DB later.

Keyword & monthly indexes kept in memory for O(1) updates per recognition.

Realtime via PubSub; batch fallback every 10 minutes with simple queue.

Slack via Incoming Webhook; Teams can be added similarly.

Constraints / Validations

Auth required for all operations.

createRecognition rejects self-recognition and unknown recipients.

Analytics endpoints enforce role constraints.

Operational Modes

Realtime (BATCH_NOTIFICATIONS=false): Subscriptions emit events instantly.

Batch (BATCH_NOTIFICATIONS=true): Events queued; flushed periodically; Slack used if configured.

Error Model

Standard GraphQL error envelope with message & path; no custom error types required for assessment scope.
