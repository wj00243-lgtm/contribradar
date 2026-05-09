const required = ["DATABASE_URL", "AUTH_SECRET", "AUTH_URL", "AUTH_GITHUB_ID", "AUTH_GITHUB_SECRET"];
const optional = ["OPENAI_API_KEY"];

const missing = required.filter((name) => !process.env[name]);
const missingOptional = optional.filter((name) => !process.env[name]);

if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

if (missingOptional.length > 0) {
  console.warn(`Optional feature variables not set: ${missingOptional.join(", ")}`);
}

console.log("Required environment variables are present.");
