# Alpaca Meadow

A cooperative browser game for one to four players inspired by the layered tile puzzle described in [the local guide](Crazy_Alpaca_WePlay_Game_Guide.md). Each friend has a board. Match three cards in a seven-card tray, finish orders to earn tools, pass cards directly or through the shared warehouse, and use jewel matches to charge a team rescue. One player clearing a round advances or wins for the whole team. The host can start alone or with up to three friends.

## Run locally

Requires Node.js 20 or newer. No packages to install.

```sh
npm start
```

Open `http://localhost:3000`, create a room, and play solo or share the invite link with up to three friends. For a local network game, run with `HOST=0.0.0.0` and share your computer's LAN address in place of `localhost`.

## Put it online

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/siddhardhaanagani69-ship-it/alpaca-meadow)

The button uses `render.yaml` (free plan). Free services sleep after 15 minutes without requests, which ends any game in progress.

Deploy this folder to a Node.js host that runs `npm start` and provides a public HTTPS URL. Set `PORT` only if your host does not set it automatically. Use one running server instance: rooms are kept in memory, so restarting the server ends active games. A public HTTPS URL is needed so friends outside your local network can join and the Copy invite link button works on mobile.

## Checks

```sh
npm test
```

This is a fan-made game with original presentation, not an official WePlay release. The game guide's undocumented details are treated as inspiration rather than exact specifications.
