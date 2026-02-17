/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        background: {
          primary: "#F7F7F7",
          "primary-alt": "#F8F5EE",
        },
        surface: {
          card: "#FFFFFF",
          "card-alt": "#FBFBFB",
        },
        accent: {
          green: "#4F6D4F",
          "green-alt": "#596B5A",
          "green-dark": "#5C7B5C",
        },
        "text-primary": "#333333",
        "text-primary-alt": "#4A5A4A",
        "text-secondary": "#6B6B6B",
        "text-on-dark": "#FFFFFF",
        warm: {
          "orange-brown": "#B18A5D",
          "orange-brown-alt": "#CC8A48",
          rust: "#AD6D3F",
        },
        semantic: {
          "warning-bg": "#F4E8D7",
        },
        border: {
          card: "#E8E8E8",
          "card-accent": "#E0E6E0",
        },
        "icon-gold": "#CBB490",
      },
      fontFamily: {
        heading: ["Lora", "Georgia", "serif"],
        body: ["Inter", "Open Sans", "sans-serif"],
      },
      spacing: {
        "card-gap-y": "1.5rem",
        "card-gap-x": "1.25rem",
        "card-padding": "1.5rem",
        "icon-text": "0.75rem",
      },
      borderRadius: {
        card: "0.75rem",
        "card-lg": "1rem",
        icon: "9999px",
      },
      boxShadow: {
        card: "0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.04)",
      },
    },
  },
  plugins: [],
};
