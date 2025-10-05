// Use CommonJS to avoid ESM ambiguity if Node tooling still CJS
module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: { extend: {} },
  plugins: []
};
