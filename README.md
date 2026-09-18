# admin

The admin interface of [the Tricktionary](https://the-tricktionary.com). It is
a Vue 3 single page app, built with the same tooling as the public site, that
talks to the same GraphQL API. Everything it can do is decided by the grants on
the signed in user: trick editors maintain tricks, translators maintain the
localisations of the languages they were granted, level editors maintain and
verify the levels of a ruleset, and super admins additionally maintain users and
rulesets. Someone without any grant is told they have no access rather than
shown an empty interface.

Development needs Node 22.12 or newer. Install the dependencies with `npm ci`,
then generate the typed GraphQL operations with `npm run codegen` — it reads the
schema from the deployed API, so point it elsewhere with
`GRAPHQL_SCHEMA=path/to/introspection.json npm run codegen` when you develop
against a schema that isn't released yet. `VITE_GRAPHQL_URL=http://localhost:3000
npm run dev` then serves the app on port 3003 against a locally running API, and
`npm run lint` and `npm run typecheck` check it the same way CI does. Pull
requests are deployed to a Firebase hosting preview channel, and `main` goes to
<https://admin.the-tricktionary.com>.
