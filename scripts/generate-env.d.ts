export declare function generateJWTSecrets(): {
  accessSecret: string;
  refreshSecret: string;
};

export declare function createEnvContent(accessSecret: string, refreshSecret: string): string;

export declare function ensureEnvFile(): void;

export declare function updateJWTSecrets(): void;
