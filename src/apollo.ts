import { ApolloClient, createHttpLink, InMemoryCache } from '@apollo/client/core'
import { setContext } from '@apollo/client/link/context'
import { getAuth } from 'firebase/auth'

const httpLink = createHttpLink({
  uri: `${import.meta.env.VITE_GRAPHQL_URL}/graphql`
})

const authLink = setContext(async (_, { headers }) => {
  const token = await getAuth().currentUser?.getIdToken()
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : ''
    }
  }
})

// The admin interface always wants the current state of the data it edits, so
// unlike the public site the cache isn't persisted across reloads
const cache = new InMemoryCache({
  typePolicies: {
    User: {
      merge (existing, incoming, { mergeObjects }) {
        return mergeObjects(existing, incoming)
      }
    },
    // value ids are only unique within their tag
    TagValue: {
      keyFields: false
    }
  }
})

export const apolloClient = new ApolloClient({
  link: authLink.concat(httpLink),
  cache
})
