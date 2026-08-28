# Self-hosted LibreTranslate

This stack is the translation provider for learner-selected English words and
short phrases. The Next.js application is the only client that should call it.

## Local development

1. Install Docker Desktop and make sure `docker compose version` works.
2. From the project root, start the private local service:

   ```powershell
   docker compose -f infrastructure/libretranslate/compose.yml up -d
   ```

3. Wait until it is healthy:

   ```powershell
   docker compose -f infrastructure/libretranslate/compose.yml ps
   ```

4. Generate one API key for KRIN-EdTech. Copy the key printed by the command;
   do not commit it or put it in a `NEXT_PUBLIC_*` variable:

   ```powershell
   docker compose -f infrastructure/libretranslate/compose.yml exec libretranslate ltmanage keys --api-keys-db-path /app/db/api_keys.db add 120 --char-limit 500
   ```

5. Set the values in the application's `.env`, then restart `npm run dev`:

   ```env
   LIBRETRANSLATE_API_URL="http://127.0.0.1:5000"
   LIBRETRANSLATE_API_KEY="paste-the-generated-key-here"
   LIBRETRANSLATE_ALLOW_INSECURE_HTTP="false"
   ```

The Compose file binds port 5000 to `127.0.0.1` only. It is not reachable from
other devices on the network.

The same stack starts a private Redis cache on `127.0.0.1:6379`. Configure the
Next.js server (not the browser) with:

```env
TRANSLATION_REDIS_URL="redis://127.0.0.1:6379"
TRANSLATION_CACHE_ENABLED="true"
```

Translation results are keyed by a SHA-256 digest of source language, target
language and normalized text, then expire at the next UTC midnight. Redis is a
fail-open optimization: if it is unavailable, the server still calls
LibreTranslate. Neither the Redis URL nor the LibreTranslate API key is exposed
through a `NEXT_PUBLIC_*` variable or returned by the API route.

## Production topology

- Run LibreTranslate on the same private network as the Next.js server.
- Do not publish port 5000 through the VPS firewall or a public reverse proxy.
- Point `LIBRETRANSLATE_API_URL` at the private service address, for example
  `http://libretranslate:5000` when both services share a Docker network.
- Set `LIBRETRANSLATE_ALLOW_INSECURE_HTTP="true"` only for that private
  network. Public endpoints must use HTTPS.
- Use a separate API key per consuming application and rotate it if it leaks.
- Preserve the two Docker volumes; the models and key database must survive a
  container recreation. Preserve `translation_cache_data` only when retaining
  warm cache entries is useful; cached translations expire daily.
- Monitor `/health` and `/metrics` only from the private network. Add a shared
  rate limiter and multiple replicas before treating the service as a
  10,000-user production cluster.

The instance intentionally loads only `en,ru`, disables its web UI and file
translation, limits requests to API keys, and caches translations inside the
provider. The application additionally rate-limits learner requests.
