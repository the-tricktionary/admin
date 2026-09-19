# admin

The admin interface of [the Tricktionary](https://the-tricktionary.com). It is
a Vue 3 single page app, built with the same tooling as the public site, that
talks to the same GraphQL API. Everything it can do is decided by the grants on
the signed in user: trick editors maintain tricks, translators maintain the
localisations of the languages they were granted, level editors maintain and
verify the levels of a ruleset, and super admins additionally maintain users and
rulesets. Someone without any grant is told they have no access rather than
shown an empty interface.

Development needs Node 22.12 or newer. `npm run codegen` reads the schema from
the deployed API, set `GRAPHQL_SCHEMA=path/to/introspection.json` to generate
against a schema that isn't released yet, and `VITE_GRAPHQL_URL` (for example
`http://localhost:3000`) to run the app against a locally running API;
`.env.example` lists the variables. Pull requests are deployed to a Firebase
hosting preview channel, and `main` goes to <https://admin.the-tricktionary.com>.
