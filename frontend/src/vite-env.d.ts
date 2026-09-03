/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the resource server API. */
  readonly VITE_API_URL?: string;
  /** Base URL of the Keycloak server, e.g. http://localhost:8081 */
  readonly VITE_KEYCLOAK_URL?: string;
  /** Frontend base URL (optional) */
  readonly VITE_FRONTEND_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
