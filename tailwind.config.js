// Use CommonJS to avoid ESM ambiguity if Node tooling still CJS
module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        app: "#05060A",
        brand: {
          pink: "#ec4899",
          cyan: "#22d3ee",
        },
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
      },
      boxShadow: {
        soft: "0 8px 30px -10px rgba(255,255,255,0.35)",
        card: "0 30px 80px -40px rgba(0,0,0,0.6)",
      },
    },
  },
  plugins: [],
};
