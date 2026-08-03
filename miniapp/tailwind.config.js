/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        head: ["Oswald", "sans-serif"],
        body: ["Inter", "sans-serif"],
      },
      keyframes: {
        "profile-ring-pulse": {
          "0%, 100%": { opacity: "1", filter: "brightness(1)" },
          "50%": { opacity: "0.88", filter: "brightness(1.15)" },
        },
      },
      animation: {
        "profile-ring-pulse": "profile-ring-pulse 3.2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
