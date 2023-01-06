import axios from "axios";
import fs from "fs";

const SEARCH_TERM = process.env.SEARCH_TERM ?? "";
const API_URL =
  process.env.OMNIVORE_API_URL ?? "https://api-prod.omnivore.app/api/graphql";

type LibraryItems = {
  edges: LibraryItem[];
  pageInfo: PageInfo;
  errorCodes?: string[];
};

export type LibraryItem = {
  cursor: string;
  node: LibraryItemNode;
};

export type LibraryItemNode = {
  slug: string;
  content: string;
  highlights: Highlight[];
};

export type PageInfo = {
  hasNextPage: boolean;
  endCursor: string;
  totalCount: number;
};

export type Highlight = {
  id: string;
  quote: string;
  annotation?: string;
};

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
  searchQuery: string
): Promise<LibraryItems> => {
  const data = JSON.stringify({
    variables: {
      after: cursor,
      first: limit,
      format: "markdown",
      includeContent: true,
      query: searchQuery,
    },
    query: `query Search(
      $after: String
      $first: Int
      $query: String
      $includeContent: Boolean
      $format: String
    ) {
      search(
        after: $after
        first: $first
        query: $query
        includeContent: $includeContent
        format: $format
      ) {
        ... on SearchSuccess {
          edges {
            node {
              slug
              content
            }
          }
          pageInfo {
            hasNextPage
            endCursor
            totalCount
          }
        }
        ... on SearchError {
          errorCodes
        }
      }
    }
  `,
  });

  const response = await axios.post(`${API_URL}/graphql`, data, {
    headers: {
      Cookie: `auth=${process.env.OMNIVORE_AUTH_TOKEN};`,
      "Content-Type": "application/json",
    },
  });
  return response.data.data.search as LibraryItems;
};

// This iterator handles pagination of the Omnivore API. It will fetch all items
// matching the search query.
async function* fetchAllLinks(start: string | undefined, searchQuery: string) {
  let cursor = start;
  let hasNextPage = true;
  while (hasNextPage) {
    const nextPage = await fetchPage(cursor, 10, searchQuery);
    for (const edge of nextPage.edges) {
      yield edge.node;
    }
    cursor = nextPage.pageInfo.endCursor;
    hasNextPage = nextPage.pageInfo.hasNextPage;
  }
}

(async function () {
  try {
    fs.mkdirSync("documents");
  } catch {}

  var downloaded = 0;
  for await (const item of fetchAllLinks(undefined, SEARCH_TERM)) {
    fs.writeFileSync(`documents/${item.slug}.md`, item.content);

    downloaded = downloaded + 1;
    if (downloaded > 20) {
      break;
    }
  }
})();
