# CourtSight logo

The default CourtSight mark lives at `public/logo.svg`. The `<Logo />` React component renders this file in the sidebar and topbar.

## Replace the logo

1. Drop your own square asset at:
   - `public/logo.svg` (recommended — scales perfectly, supports gradients)
   - or `public/logo.png` and pass `src="/logo.png"` to the `<Logo />` component
2. Refresh the browser. No build step needed.

The component renders a fallback gradient "C" mark if the file is missing or fails to load, so the brand never breaks.

## Use a remote logo

Pass any URL to `<Logo />`:

```tsx
<Logo src="https://yourcdn.example/courtsight.png" />
```

`next.config.mjs` already permits all hosts, so remote URLs work without further config.

## Sizes

The component supports `size="sm" | "md" | "lg" | "xl"` (24 / 32 / 48 / 64 px).
