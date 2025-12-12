/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: "#0f172a", // Slate 900
                secondary: "#1e293b", // Slate 800
                accent: "#3b82f6", // Blue 500
                "text-primary": "#f8fafc", // Slate 50
                "text-secondary": "#94a3b8", // Slate 400
                border: "#334155", // Slate 700
                "card-bg": "#1e293b", // Slate 800
                "input-bg": "#0f172a", // Slate 900
                "hover-bg": "#334155", // Slate 700
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
