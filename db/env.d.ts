declare namespace NodeJS {
  interface ProcessEnv {
    TURSO_DATABASE_URL?: string;
    TURSO_AUTH_TOKEN?: string;
    RESEND_API_KEY?: string;
    EMAIL_FROM?: string;
    INITIAL_ADMIN_EMAIL?: string;
    INITIAL_ADMIN_PASSWORD?: string;
    NEXT_PUBLIC_SITE_URL?: string;
  }
}
