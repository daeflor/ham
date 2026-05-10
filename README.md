# ham

Local Apple Music playlist browser.

## Local config

This app intentionally does not keep the MusicKit developer token in tracked source.

1. Create a local `.env` file from `.env.example`.
2. Fill in your Apple Music key id, team id, and private key.
3. Run `npm install`.
4. Run `npm run generate-config`.

That writes `config/config.local.json`, which is ignored by git and loaded by the app at runtime.
