/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_DEV_PROXY_TARGET?: string;
  readonly VITE_CONTRACT_CHECK?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
