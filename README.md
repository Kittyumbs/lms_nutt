# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config({
  plugins: {
    // Add the react-x and react-dom plugins
    'react-x': reactX,
    'react-dom': reactDom,
  },
  rules: {
    // other rules...
    // Enable its recommended typescript rules
    ...reactX.configs['recommended-typescript'].rules,
    ...reactDom.configs.recommended.rules,
  },
})
```

## Security / Key Hardening

1. Restrict API Key (Google Cloud → APIs & Services → Credentials → <Your API key>):
   - Application restrictions: **HTTP referrers (web sites)**
     - Add:
       - https://lms-nuttency.vercel.app
       - http://localhost:5173
   - API restrictions: **Restrict key**
     - Enable only: **Google Calendar API**
   - Save changes.

2. OAuth Client (Web) (Google Cloud → Credentials → <OAuth 2.0 Client IDs>):
   - Authorized JavaScript origins:
     - https://lms-nuttency.vercel.app
     - http://localhost:5173
   - (Không dùng wildcard cho preview domain. Test trên prod domain hoặc thêm origin cụ thể.)

3. Rotate keys khi nghi ngờ lộ:
   - Create new API key → apply restrictions → update Vercel env → delete old key.

4. Leak check:
   - Tìm trong repo: `VITE_GOOGLE_CALENDAR_API_KEY` và `VITE_GOOGLE_CALENDAR_CLIENT_ID` không được log ra console, không commit file .env.
   - Nếu từng push key: rotate ngay.

5. Browser privacy:
   - Dùng **GIS** token flow (đã triển khai), không expose refresh token.
   - Không lưu access_token trong localStorage; rely on gapi in-memory token.
