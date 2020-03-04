# INF251 Project

## Compiling

```sh
# First setup
npm install

# Running
npx webpack --watch
```

## Hosting with live reload for development purposes

```sh
# First setup
npm install -g browser-sync

# Running
browser-sync start -s dist -f dist --no-notify --host 127.0.0.1 --port 8000
```
