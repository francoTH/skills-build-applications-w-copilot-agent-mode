# OctoFit Tracker architecture

OctoFit Tracker is a three-tier application for a school fitness program. The starter code includes API contracts and intentionally incomplete implementation points so you can use GitHub Copilot agent mode in a test-driven loop.

![Three-tier OctoFit architecture](../.github/images/octofit-architecture.svg)

## Tier boundaries

- **Presentation tier**: React 19, Vite, React Router, Bootstrap, and a shared API client in `octofit-tracker/frontend/src`.
- **Logic tier**: Express and TypeScript routes/services in `octofit-tracker/backend/src` expose `/api/*` behavior on port `8000`.
- **Data tier**: Mongoose models and seed data in `octofit-tracker/backend/src/models` and `src/scripts/seed.ts` persist to MongoDB on port `27017`.

## Ports and environment rules

- MongoDB: `27017`
- Express API: `8000`
- Vite frontend: `5173`
- The browser calls relative `/api` paths. Vite proxies them to `http://localhost:8000`, so the unauthenticated API port stays private in Codespaces. `VITE_API_BASE_URL` can override the base URL.

## API contract

| Capability | Method and path | Expected behavior |
| --- | --- | --- |
| Activity tracking | `GET /api/activities`, `POST /api/activities` | List and create valid activity records. POST accepts `userId`, `teamId`, `type`, and `minutes`; `userId` and `teamId` must be well-formed IDs for an existing user and team; otherwise respond with a deliberate 4xx (never a 500 from a cast error). A created activity stores the submitted `user`, `team`, `type`, and `minutes` plus computed `points` and `occurredAt`. |
| Teams | `GET /api/teams`, `POST /api/teams` | List and create teams with members. Created and listed teams keep the submitted `name` and `mascot`. Reject a team without a name with `400`. |
| Leaderboard | `GET /api/leaderboard` | Return teams ordered by the sum of their activity points, highest first. Each entry has `teamName`, `totalPoints`, and a 1-based `rank`. |
| Workout suggestions | `GET /api/workouts/suggestions/:userEmail` | Recommend workouts from recent activity patterns for the matching seeded user's email address. The first suggestion's `focus` matches that user's goal or recent activity, with a `reason` explaining why. An email with no matching user returns a deliberate 4xx (for example, `404`). |

## Implementation decisions

- Presentation tier decision: Keep route rendering and interaction in the React frontend. Use the shared API client with relative `/api` paths, and give every data view accessible loading, error, and empty states. Do not put persistence or business rules in components.
- Logic tier decision: Keep HTTP handling and request validation in Express routes, and put reusable business rules and database queries in backend services. Return deliberate 4xx responses for invalid input or missing users instead of leaking Mongoose cast errors as 500 responses.
- Data tier decision: Define required fields, references, and value constraints in the Mongoose models. Keep seed data representative and idempotent; MongoDB remains the persistence boundary.
- Activity tracking approach: Validate the submitted user and team IDs and confirm both records exist before creating an activity. Persist their references, type, and minutes, plus deterministically computed points and an occurrence date; list activities through the API.
- Team management approach: Require a name, mascot, and members array in the data model. Validate team creation at the API boundary, persist member references, and return created and listed teams with their submitted names and mascots.
- Leaderboard approach: Derive each team's total from its activity points, sort totals descending, and assign ranks starting at 1 in the service/API response. Do not store a separately maintained leaderboard total.
- Workout suggestions approach: Resolve the requested email to a user, then use that user's goal and recent activities to choose and explain relevant suggestions. Return a deliberate 4xx response when no user matches; keep recommendation logic in the backend.

## Test plan

Run the checks in dependency order: data contracts, API contracts, frontend contracts, then builds. A failure at an earlier tier should be fixed before interpreting failures in dependent tiers.

- Data-tier command: `npm run test:data --prefix octofit-tracker/backend`: failures indicate missing or incorrect model constraints, references, or seed behavior.
- API command: `npm run test:api --prefix octofit-tracker/backend`: failures indicate incorrect HTTP validation/status codes, persistence, response shapes, leaderboard calculations, or recommendation behavior.
- Frontend command: `npm test --prefix octofit-tracker/frontend`: failures indicate incorrect API usage or rendering, or missing accessible loading, empty, and error states.
- Backend build command: `npm run build --prefix octofit-tracker/backend`: failures indicate backend TypeScript or build configuration errors not necessarily covered by runtime contracts.
- Frontend build command: `npm run build --prefix octofit-tracker/frontend`: failures indicate frontend TypeScript, bundling, or build configuration errors not necessarily covered by component tests.
