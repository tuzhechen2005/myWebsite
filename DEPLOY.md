# Deploy to Cloudflare Pages

This site is a static website. Deploy only the `site/` directory.

## Recommended Cloudflare Pages settings

- Framework preset: `None`
- Build command: leave empty
- Build output directory: `site`
- Production branch: the branch you want to publish, for example `main`

## Option A: Git integration

1. Push this repo to GitHub.
2. In Cloudflare Dashboard, open **Workers & Pages**.
3. Create a Pages project and connect the GitHub repository.
4. Use the settings above.
5. Deploy.

## Option B: Direct Upload

Upload the `site/` folder directly in Cloudflare Pages, or use Wrangler:

```bash
npx wrangler pages deploy site --project-name zhechen-tu
```

Cloudflare's Direct Upload project cannot later be switched to Git integration. Use Git integration if you want automatic deploys from commits.

## Custom domain

1. Add your domain to Cloudflare DNS.
2. In the Pages project, open **Custom domains**.
3. Add the apex domain, for example `example.com`.
4. Add `www.example.com` too if you want the `www` version.
5. Cloudflare will create the needed DNS records when the domain is managed by Cloudflare.

## China access note

Cloudflare Pages is fast to deploy and does not require ICP filing, but mainland China access is not as predictable as a filed mainland China CDN. For best mainland reliability, use a filed domain with Tencent Cloud COS/CDN or Alibaba Cloud OSS/CDN.
