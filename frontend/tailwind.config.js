/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'fb-orange': '#ff6b00',
                'fb-blue': '#001a4b',
            }
        },
    },
    plugins: [],
}