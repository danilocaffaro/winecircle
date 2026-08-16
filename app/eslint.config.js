import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // react-refresh reclama de arquivos que exportam um componente junto com
      // um hook ou constante. É uma regra de ergonomia do hot reload, não de
      // correção — e o padrão contexto + hook (AuthContext/useAuth) é
      // deliberado. Liberamos os nomes que de fato usamos.
      'react-refresh/only-export-components': [
        'error',
        { allowExportNames: ['useAuth', 'usePushNotifications', 'wineTypeColors'] },
      ],
    },
  },
])
