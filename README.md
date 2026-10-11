# Dhanee's Playground

A small family site of sparkly, kid-safe games and apps, made by a dad for his 7-year-old daughter.
Play: https://dhanee1231.github.io/sky-glider/

| App | Folder | What it is |
|---|---|---|
| Sky Glider | `/` | Paper airplane racing: 10 worlds, power-ups, stickers, mystery boxes |
| Crystal Cave Quest | `crystal-cave/` | Times-tables adventure with gems, Glimmer hints and the Crystal Queen |
| Coach Sunny | `yoga/` | Beginner yoga and stretching coach with an on-device camera form check |
| Gem Tiles | `tiles/` | Rhythm game with gem tiles: built-in songs or your own songs, analyzed on the phone |
| Our Fun Zone | `home/` | The launcher page for all of the above |

- Plain static files with relative paths and no build step, hosted on GitHub Pages.
- Every app works offline (each folder has its own service worker).
- No ads, no purchases, no tracking. Everything stays on the device.
- All art and sound are made in code or self-hosted. Third-party media and models are credited in `yoga/media/CREDITS.md` and `yoga/vendor/NOTICE.txt`.
- `dev/` holds the developer tooling and is not part of the site.

Developer notes are in [CLAUDE.md](CLAUDE.md).
