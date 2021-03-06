const { GraphQLDate, GraphQLTime, GraphQLDateTime } = require('graphql-iso-date')

const { requireAuth } = require('./services/accounts')
const { requestPresignedURL } = require('./resolvers/files')
const {
  allQuestions,
  createQuestion,
  questionsByPV,
  questionByPV,
  question,
  modifyQuestion,
  archiveQuestions,
  deleteQuestions,
} = require('./resolvers/questions')
const {
  questionInstancesByPV,
  addResponse,
  deleteResponse,
  responsesByPV,
  resultsByPV,
} = require('./resolvers/questionInstances')
const {
  addFeedback,
  deleteFeedback,
  addConfusionTS,
  allSessions,
  createSession,
  pauseSession,
  cancelSession,
  endSession,
  joinSession,
  runningSession,
  sessionByPV,
  sessionsByPV,
  startSession,
  updateSessionSettings,
  activateNextBlock,
  runtimeByPV,
  session,
  modifySession,
  deleteSessions,
} = require('./resolvers/sessions')
const { allTags, tags } = require('./resolvers/tags')
const {
  createUser,
  modifyUser,
  login,
  logout,
  user,
  authUser,
  changePassword,
  requestPassword,
  hmac,
  checkAvailability,
  requestAccountDeletion,
  resolveAccountDeletion,
  activateAccount,
} = require('./resolvers/users')
const { files } = require('./resolvers/files')
const { confusionAdded, feedbackAdded } = require('./resolvers/subscriptions')
const { allTypes } = require('./types')

// create graphql schema in schema language
// define only the root query and mutation here
// remaining types / input types go into types/
const typeDefs = [
  `
  scalar Date
  scalar Time
  scalar DateTime

  schema {
    query: Query
    mutation: Mutation
    subscription: Subscription
  }

  type Query {
    activeInstances: [QuestionInstance]!
    allQuestions: [Question]!
    allSessions: [Session]!
    allTags: [Tag]!
    checkAvailability(email: String, shortname: String): User_Availability!
    joinSession(shortname: String!): Session_Public
    question(id: ID!): Question
    runningSession: Session
    session(id: ID!): Session
    sessionPublic(id: ID!): Session_PublicEvaluation
    user: User
  }

  type Mutation {
    activateAccount(activationToken: String!): String!
    activateNextBlock: Session!
    addConfusionTS(fp: ID, sessionId: ID!, difficulty: Int!, speed: Int!): String!
    addFeedback(fp: ID, sessionId: ID!, content: String!): String!
    addResponse(fp: ID, instanceId: ID!, response: QuestionInstance_ResponseInput!): String!
    archiveQuestions(ids: [ID!]!): [Question!]!
    changePassword(newPassword: String!): User!
    createQuestion(question: QuestionInput!): Question!
    createSession(session: SessionInput!): Session!
    createUser(email: String!, password: String!, shortname: String!, institution: String!, useCase: String): User!
    deleteFeedback(sessionId: ID!, feedbackId: ID!): Session!
    deleteQuestions(ids: [ID!]!): String!
    deleteResponse(instanceId: ID!, response: String!): String!
    deleteSessions(ids: [ID!]!): String!
    endSession(id: ID!): Session!
    login(email: String!, password: String!): ID!
    logout: String!
    modifyQuestion(id: ID!, question: QuestionModifyInput!): Question!
    modifySession(id: ID!, session: SessionModifyInput!): Session!
    modifyUser(user: User_Modify!): User!
    pauseSession(id: ID!): Session!
    cancelSession(id: ID!): Session!
    requestAccountDeletion: String!
    resolveAccountDeletion(deletionToken: String!): String!
    requestPassword(email: String!): String!
    requestPresignedURL(fileType: String!): File_PresignedURL!
    startSession(id: ID!): Session!
    updateSessionSettings(sessionId: ID!, settings: Session_SettingsInput!): Session!
  }

  type Subscription {
    confusionAdded(sessionId: ID!): Session_ConfusionTimestep
    feedbackAdded(sessionId: ID!): Session_Feedback
  }
`,
  ...allTypes,
]

// define graphql resolvers for schema above
// everything imported from their respective modules in resolvers/
const resolvers = {
  Date: GraphQLDate,
  Time: GraphQLTime,
  DateTime: GraphQLDateTime,
  // map queries and mutations
  Query: {
    allQuestions: requireAuth(allQuestions),
    allSessions: requireAuth(allSessions),
    allTags: requireAuth(allTags),
    checkAvailability,
    joinSession,
    question: requireAuth(question),
    runningSession: requireAuth(runningSession),
    session: requireAuth(session),
    sessionPublic: session,
    user: requireAuth(authUser),
  },
  Mutation: {
    activateAccount,
    archiveQuestions: requireAuth(archiveQuestions),
    addFeedback,
    deleteFeedback: requireAuth(deleteFeedback),
    addConfusionTS,
    addResponse,
    changePassword: requireAuth(changePassword),
    createQuestion: requireAuth(createQuestion),
    createSession: requireAuth(createSession),
    createUser,
    deleteQuestions: requireAuth(deleteQuestions),
    deleteResponse: requireAuth(deleteResponse),
    deleteSessions: requireAuth(deleteSessions),
    endSession: requireAuth(endSession),
    login,
    logout,
    modifyQuestion: requireAuth(modifyQuestion),
    modifySession: requireAuth(modifySession),
    modifyUser: requireAuth(modifyUser),
    pauseSession: requireAuth(pauseSession),
    cancelSession: requireAuth(cancelSession),
    requestAccountDeletion: requireAuth(requestAccountDeletion),
    resolveAccountDeletion: requireAuth(resolveAccountDeletion),
    requestPassword,
    requestPresignedURL: requireAuth(requestPresignedURL),
    startSession: requireAuth(startSession),
    updateSessionSettings: requireAuth(updateSessionSettings),
    activateNextBlock: requireAuth(activateNextBlock),
  },
  Subscription: {
    // TODO: some form of authentication
    confusionAdded,
    feedbackAdded,
  },
  // map our own types
  Question: {
    instances: questionInstancesByPV,
    tags,
    user,
  },
  QuestionOptions: {
    __resolveType(obj) {
      if (obj.FREE_RANGE) {
        return 'FREEQuestionOptions'
      }

      if (obj.SC || obj.MC) {
        return 'SCQuestionOptions'
      }

      return null
    },
  },
  QuestionOptions_Public: {
    __resolveType(obj) {
      if (obj.FREE_RANGE) {
        return 'FREEQuestionOptions_Public'
      }

      if (obj.SC || obj.MC) {
        return 'SCQuestionOptions_Public'
      }

      return null
    },
  },
  QuestionInstance: {
    question: questionByPV,
    responses: responsesByPV,
    results: resultsByPV,
    session: pv => String(pv.session), // HACK: fix broken ID coercion of graphql 14.0.0
  },
  QuestionInstance_Public: {
    question: questionByPV,
    results: resultsByPV,
  },
  QuestionInstance_Results: {
    __resolveType(obj) {
      if (obj.FREE) {
        return 'FREEQuestionResults'
      }

      if (obj.CHOICES) {
        return 'SCQuestionResults'
      }

      return null
    },
  },
  Question_Version: {
    files,
  },
  Question_Version_Public: {
    files,
  },
  Session: {
    user,
    runtime: runtimeByPV,
  },
  Session_QuestionBlock: {
    instances: questionInstancesByPV,
  },
  Session_QuestionBlock_Public: {
    instances: questionInstancesByPV,
  },
  Tag: {
    questions: questionsByPV,
    user,
  },
  User: {
    questions: questionsByPV,
    runningSession: sessionByPV,
    sessions: sessionsByPV,
    tags,
    files,
    hmac,
  },
}

// use graphql-tools to generate a usable schema for export
module.exports = {
  resolvers,
  typeDefs,
}
