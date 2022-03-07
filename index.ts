import axios from 'axios'

const SEARCH_TERM = process.env.SEARCH_TERM ?? ''
const API_URL = process.env.OMNIVORE_API_URL ?? "https://api-prod.omnivore.app/api/graphql"

enum SortOrder {
  ASCENDING = 'ASCENDING',
  DESCENDING = 'DESCENDING',
}

type LibraryItems = {
  edges: LibraryItem[]
  pageInfo: PageInfo
  errorCodes?: string[]
}

export type LibraryItem = {
  cursor: string
  node: LibraryItemNode
}

export type LibraryItemNode = {
  id: string
  title: string
  originalArticleUrl: string
  sharedComment?: string
  highlights: Highlight[]
}

export type PageInfo = {
  hasNextPage: boolean
  endCursor: string
  totalCount: number
}

export type Highlight = {
  id: string
  quote: string
  annotation?: string
}

const fetchPage = async (
  cursor: string | undefined,
  limit: number,
  searchQuery: string,
  sortOrder = SortOrder.DESCENDING
): Promise<LibraryItems> => {
  const data = JSON.stringify({
    variables: {
        after: cursor,
        sharedOnly: false,
        first: limit,
        query: searchQuery,
        sort: {
          order: sortOrder,
          by: 'UPDATED_TIME',
        },
    },
    query: `query GetArticles(
      $sharedOnly: Boolean
      $sort: SortParams
      $after: String
      $first: Int
      $query: String
    ) {
      articles(
        sharedOnly: $sharedOnly
        sort: $sort
        first: $first
        after: $after
        query: $query
      ) {
        ... on ArticlesSuccess {
          edges {
            node {
              id
              title
              originalArticleUrl
              highlights {
                id
                quote
                annotation
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
            totalCount
          }
        }
        ... on ArticlesError {
          errorCodes
        }
      }
    }
  `
  })

  const response = await axios.post(`${API_URL}/graphql`, data,
  {
    headers: {
      Cookie: `auth=${process.env.OMNIVORE_AUTH_TOKEN};`,
      'Content-Type': 'application/json',
    },
  });
  return response.data.data.articles as LibraryItems
}

const fetchLinks = async (): Promise<void> => {
  const page = await fetchPage(undefined, 10, '')
  console.log('page', page.edges.map(e => e.node.originalArticleUrl))
 }

async function* fetchAllLinks(start: string | undefined, searchQuery: string) {
  let cursor = start
  let hasNextPage = true
  while (hasNextPage) {
    const nextPage = await fetchPage(cursor, 10, searchQuery)
    console.log('totalCount', nextPage.pageInfo.totalCount)
    for (const edge of nextPage.edges) {
      yield edge.node
    }
    cursor = nextPage.pageInfo.endCursor
    hasNextPage = nextPage.pageInfo.hasNextPage
  }
}

(async function() {
  for await (const item of fetchAllLinks(undefined, SEARCH_TERM)) {
    console.log(item);
  }
})();
