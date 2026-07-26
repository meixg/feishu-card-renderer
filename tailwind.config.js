/** @type {import("tailwindcss").Config} */
export default {
  content: ["./src/**/*.{ts,tsx}", "./tests/visual/**/*.{html,ts,tsx}"],
  prefix: "fcr-",
  important: ".fcr-root",
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {},
  },
  plugins: [],
};
