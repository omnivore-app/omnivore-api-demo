# omnivore-api-demo

A simple demo of Omnivore's API. This app connects to Omnivore's API, and paginates through
all of the supplied user's recently saved articles and saves their contents as markdown
into a `documents` directory.

Optionally you can set a search term.

## Requirements

- Node.js >= version 14
- An Omnivore account
- Auth token from Omnivore

### Environment Variables

* `OMNIVORE_AUTH_TOKEN=<string>` // mandatory
* `OMNIVORE_API_URL=<string>` // optional, defaults to production service
* `SEARCH_TERM=<string>` // optional, defaults to an empty string

## Getting Started

Currently Omnivore does not expose API Tokens, but you can use the `auth` Cookie
from a logged in session.

1. Go to https://omnivore.app, login, and copy the value of the auth cookie. How to do this
differs for every browser. If you're using Chrome:

- Open Developer Tools (Option + Cmd + I)
- Go the Application tab
- Find the `auth` cookie in the list. Copy the value. It should look something like this: `eyJhbGciOiJIUzI1NiI`

2. Run `npm install`

3. run `OMNIVORE_AUTH_TOKEN="<your token>" npm run-script start`

