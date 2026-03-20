# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript and enable type-aware lint rules. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Environment variables

For developer API keys used by the frontend (ex: OpenFDA), create a `.env.local` file in the `frontend` folder and add Vite variables prefixed with `VITE_`. Example:

```
VITE_OPENFDA_KEY=your_openfda_api_key_here
```

Restart the dev server after creating or changing `.env.local`. Do not commit `.env.local` to source control — add it to `.gitignore`.
