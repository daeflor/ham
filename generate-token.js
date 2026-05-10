import 'dotenv/config';
import { mkdir, writeFile } from 'node:fs/promises';
import { SignJWT, importPKCS8 } from 'jose';

const alg = 'ES256';

function readRequiredEnv(name) {
    const value = process.env[name]?.trim();
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}

const kid = readRequiredEnv('APPLE_MUSIC_KEY_ID');
const issuer = readRequiredEnv('APPLE_MUSIC_TEAM_ID');
const pkcs8 = readRequiredEnv('APPLE_MUSIC_PRIVATE_KEY').replace(/\\n/g, '\n');
const expirationTime = process.env.APPLE_MUSIC_TOKEN_TTL?.trim() || '180d';
const appName = process.env.APPLE_MUSIC_APP_NAME?.trim() || 'HAM';
const appBuild = process.env.APPLE_MUSIC_APP_BUILD?.trim() || '0.0.1';

const privateKey = await importPKCS8(pkcs8, alg);

const developerToken = await new SignJWT({ 'urn:example:claim': true })
    .setProtectedHeader({ alg, kid })
    .setIssuedAt()
    .setIssuer(issuer)
    .setExpirationTime(expirationTime)
    .sign(privateKey);

const config = {
    developerToken,
    app: {
        name: appName,
        build: appBuild,
    },
};

const configDirUrl = new URL('./config/', import.meta.url);
await mkdir(configDirUrl, { recursive: true });
await writeFile(new URL('./config/config.local.json', import.meta.url), `${JSON.stringify(config, null, 2)}\n`, 'utf8');
console.log('Wrote config/config.local.json');