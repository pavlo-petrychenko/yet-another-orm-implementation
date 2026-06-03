import type { User } from "./types";

// The API exposes GET /users/:id but no "list users" endpoint, so the demo
// hardcodes the two accounts created by the example's seed script.
export const DEMO_USERS: Pick<User, "id" | "name" | "email">[] = [
  { id: 1, name: "Alice", email: "alice@example.com" },
  { id: 2, name: "Bob", email: "bob@example.com" },
];
