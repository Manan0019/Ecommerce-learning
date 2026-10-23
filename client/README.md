# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Stylesheet architecture

Author styles in `src/styles/modules/` (foundation, layouts, commerce, admin, customer); these are named by responsibility, not phase. `src/styles/site.css` is generated to preserve the historical cascade. Do not edit the generated file directly.

- `npm run styles:build` — compile modules into `site.css`.
- `npm run styles:check` — verify `site.css` matches its modules.
- `npm run styles:watch` — rebuild automatically when editing modules (use a second terminal next to Vite).
- `npm run dev` / `npm run build` — rebuild `site.css` before starting.
