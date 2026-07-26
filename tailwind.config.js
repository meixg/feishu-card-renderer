/** @type {import("tailwindcss").Config} */
export default {
  content: ["./src/**/*.{ts,tsx}", "./tests/visual/**/*.{html,ts,tsx}"],
  safelist: [
    "fcr-width-default",
    "fcr-width-compact",
    "fcr-width-fill",
    "fcr-theme-light",
    "fcr-theme-dark",
    "fcr-device-pc",
    "fcr-device-mobile",
    "fcr-direction-vertical",
    "fcr-direction-horizontal",
  ],
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
