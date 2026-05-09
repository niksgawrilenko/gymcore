module.exports = [
    {
        ignores: ["node_modules/**"]
    },
    {
        languageOptions: {
            ecmaVersion: 2021,
            sourceType: "commonjs"
        },
        rules: {
            "no-unused-vars": "warn",
            "no-undef": "error",
            "semi": ["error", "always"],
            "quotes": ["error", "single"]
        }
    }
];