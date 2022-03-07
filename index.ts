import axios from 'axios'

const SEARCH_TERM = process.env.SEARCH_TERM ?? ''
const API_URL = process.env.OMNIVORE_API_URL ?? 'https://api-prod.omnivore.app/api/graphql'

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

// Omnivore's `articles` API returns pages of articles. Here we specify to return
// a page of `limit` items starting at `cursor`. The `cursor` is the last item
// in the previous page of data fetched (or undefined if this is the first page).
//
// Here we request an articles `id`, `title`, `originalArticleUrl`, and its
// highlights. For highlights we just request the `id`, `quote`, and `annotation`.
// The `quote` is the section of text highlighted, and `annotation` is an optional
// comment that the user can add to the highlight.
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

// This iterator handles pagination of the Omnivore API. It will fetch all items
// matching the search query.
async function* fetchAllLinks(start: string | undefined, searchQuery: string) {
  let cursor = start
  let hasNextPage = true
  while (hasNextPage) {
    const nextPage = await fetchPage(cursor, 10, searchQuery)
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
