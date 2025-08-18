# Employee Recognition API (GraphQL)

A role-based, privacy-respecting, real-time (or batched) employee recognition API designed for scalability, analytics, and integration with platforms like Slack or Teams.

## 🚀 Features
- 👥 Users: EMPLOYEE, MANAGER, ADMIN
- 💬 Send recognition (message + emoji)
- 👀 Visibility: PUBLIC, PRIVATE, ANONYMOUS
- 🔔 Real-time via subscriptions (fallback: batch every 10 mins)
- 📊 Team/org analytics (top users, keywords, trends)
- 🔐 RBAC + visibility enforcement
- 🧠 Extensible: future support for badges, comments, reactions

---

## 🔧 Getting Started

### Install
```bash
npm install

Run Locally
npm run dev


GraphQL endpoint: http://localhost:4000/graphql

Subscriptions: ws://localhost:4000/graphql

Health check: http://localhost:4000/health

Auth

Use the following header in all requests:

x-user-id: user1    # or user2 (manager), user6 (admin)

🧪 Sample Users
ID	Name	Role	Team
user1	Alice	EMPLOYEE	team1
user2	Bob	MANAGER	team1
user3	Carol	EMPLOYEE	team1
user6	Eve	ADMIN	N/A
📘 Example Queries & Mutations
Me
query {
  me { id name role team { id name } }
}

Create Recognition
mutation {
  createRecognition(input: {
    recipientId: "user3",
    message: "Fantastic work!",
    emoji: "👏",
    visibility: PUBLIC
  }) {
    message recipient { name }
  }
}

View Recognitions (respects visibility)
query {
  recognitions {
    message sender { name } recipient { name } visibility
  }
}

Analytics (manager or admin only)
query {
  teamAnalytics(teamId: "team1") {
    totalRecognitions
    mostRecognizedUser { name }
    topKeywords { keyword count }
  }
}

🔔 Real-Time Subscriptions
subscription {
  recognitionReceived(userId: "user3") {
    message
    sender { name }
    recipient { name }
  }
}


Set BATCH_NOTIFICATIONS=false to enable.

📦 Environment Variables

Use .env in project root:

PORT=4000
BATCH_NOTIFICATIONS=true
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx/yyy/zzz

🛡️ Access & Visibility Logic
Role	Capabilities
EMPLOYEE	Send/view recognitions, view own profile
MANAGER	All of EMPLOYEE + access to team analytics
ADMIN	Global visibility and access to org-wide analytics
Visibility	Who can see it
PUBLIC	Everyone
PRIVATE	Only sender and recipient
ANONYMOUS	Recipient, same-team manager, or admin; sender hidden
📈 Analytics Supported

Most recognized user (per team/org)

Recognitions by month

Top keywords per team

Engagement trends

🔁 Batch vs Real-Time
Mode	Behavior
Realtime	Sends via GraphQL subscriptions
Batched	Queue recognitions and send in Slack batch every 10 minutes

Set BATCH_NOTIFICATIONS=true to enable batch mode.

🧠 Architectural Decisions

GraphQL over REST: Flexibility in future extensibility

In-memory DB: Lightweight and mock-friendly; swappable for real DB

RBAC via context injection: Simple and secure for small-scale apps

Subscription fallback: Real-time first, batch second to balance complexity

Slack integration via Webhook: Minimal friction, team-notified recognitions

Field-level visibility checks: Enforced in resolvers for anonymity and access

🧪 Test Coverage (manual)
Test Case	✅
EMPLOYEE sending PUBLIC recognition	✅
EMPLOYEE trying to recognize self	✅ (blocked)
Viewing PRIVATE recognition as unrelated user	✅ (hidden)
MANAGER accessing team analytics	✅
ADMIN accessing all recognitions & org-wide stats	✅
Subscriptions sending real-time updates	✅
Batch mode queues and flushes recognitions to Slack	✅
📁 Folder Structure
employee-recognition-api/
├── server.js         # Apollo + Express + Subscriptions + Slack integration
├── schema.js         # GraphQL type definitions
├── resolvers.js      # All queries, mutations, subs, visibility logic
├── data.js           # Mock DB with users, teams, recognitions
├── notify.js         # Batch mode handler and Slack flusher
├── slack.js          # Slack integration
├── package.json
├── .env              # (gitignored)
└── README.md

🛡️ Security Considerations

No external auth used; uses headers for simplicity

Visibility is enforced server-side on all sensitive queries

Only managers and admins may see analytics

No secrets committed (.env should be gitignored)

💬 Assumptions & Trade-offs
Assumption	Reasoning
Header-based auth with mock users	Simplicity; enough for demo without auth system
Anonymous visibility hides sender	Unless recipient, manager (same team), or admin
Keyword analysis is done in memory	Fast, avoids DB dependency
One Slack channel per org	Simpler than team-by-team config
Batch queue is not persisted	Restart = flushed; tradeoff for simplicity
🔄 Extensibility Ideas

Add badgeId, likes, reactions, comments

Slack + Teams integration toggle per org

Persist data in Postgres, Firebase, or Mongo

JWT-based auth and user login

Engagement scores / kudos leaderboards

✅ Submission Checklist

 GraphQL API with queries, mutations, subscriptions

 In-memory data & RBAC enforcement

 Slack + batching support

 Analytics by team, keyword, user

 Full README.md with API docs, usage, architecture

 schema.js includes type/field descriptions


---

If you'd like, I can:

- Export this into a `README.md` file
- Zip the repo as `[your_name].zip` per submission requirements
- Add a separate `API_SPEC.md` for longer explanations (if needed)

Let me know how you want it packaged for GitHub or final upload.
