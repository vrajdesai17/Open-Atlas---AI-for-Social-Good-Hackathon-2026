import { getProfile, upsertProfile } from "../lib/profile.ts";
import { db } from "../lib/db.ts";

const email = "test@caliber.dev";
await upsertProfile(email, {
  github: "github.com/test",
  publications: "Test Author",
  press: ["https://example.com/a"],
  field: "Machine learning",
  salary: "$180,000",
  resumeText: "sample resume text",
  domain: "stem",
  media: "",
  businessMetrics: "",
  athleticsRecord: "",
  educationMetrics: "",
});
const p = await getProfile(email);
console.log("round-trip:", JSON.stringify(p));

// cleanup
await db()`delete from profiles where user_email = ${email}`;
console.log("db OK");
process.exit(0);
