# Abastece

Fuel control for Abençoada Agrícola. Android app for field workers and a web dashboard for administration.

Records refueling, transfers, checklists and occurrences with photos. The app saves entries offline and sends them when a connection is available. The first login requires internet.

- [Web dashboard](https://abencoada-agricola.github.io/diesel/admin.html)
- [Download Android app](https://github.com/abencoada-agricola/diesel/releases/latest/download/abencoada-diesel.apk)

## Development

Node.js 22 or later.

```sh
npm ci
npm run dev
```

```sh
npm test
npm run build
```

Built with JavaScript, Capacitor and Supabase. The website runs on GitHub Pages. The interface is in Portuguese.

See [setup](docs/setup.md) for database configuration, deployment and Android builds, or [development notes](docs/development.md) for the project map.
