# INF251 Project

Make sure you have npm installed (You can find it at [link](https://www.npmjs.com/))
Then run npm install to install the necessary dependencies

Any models you want to load you need to add into the /dist/data folder. You need to add a .dat file with the data itself and a .ini with relevant spacing. (As in the example bellow) Both files must have the same name in order to work properly!

```ini
[DatFile]
oldDat Spacing X=2
oldDat Spacing Y=2
oldDat Spacing Z=3
```

## Building

```sh
# Building
npm run build
```

## Running

```sh
# Running
npm run start:dev
```
