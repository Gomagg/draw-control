import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0A0E14",
        surface: "#11161F",
        "surface-alt": "#161C28",
        border: "#232B36",
        text: "#EDEFF2",
        muted: "#7C8697",
        teal: "#2DD4BF",
        amber: "#F5A623",
        red: "#EF4444",
        violet: "#8B7CF6",
      },
      fontFamily: {
        display: ["Space Grotesk", "Avenir Next", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
        body: ["Inter", "-apple-system", "Segoe UI", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;