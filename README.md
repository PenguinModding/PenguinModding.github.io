# PenguinMod Extension Data

A collection of extension lists gathered from different Scratch and PenguinMod galleries. The data is stored in JSON files so it is easy to browse and use in other projects.

## Available galleries

| Gallery | JSON data |
|---|---|
| PenguinMod | [View JSON](https://penguinmodding.github.io/penguinmod-extensions.json) |
| PenguinMod Live Tests | [View JSON](https://penguinmodding.github.io/livetests-extensions.json) |
| TurboWarp | [View JSON](https://penguinmodding.github.io/turbowarp-extensions.json) |
| SharkPool | [View JSON](https://penguinmodding.github.io/sharkpool-extensions.json) |
| KyleArt | [View JSON](https://penguinmodding.github.io/kylekart-extensions.json) |
| Pooid7 | [View JSON](https://penguinmodding.github.io/pooid7-extensions.json) |
| CST | [View JSON](https://penguinmodding.github.io/cst-extensions.json) |
| Ziplox | [View JSON](https://penguinmodding.github.io/ziplox-extensions.json) |
| DDE | [View JSON](https://penguinmodding.github.io/dde-extensions.json) |
| Godslayer | [View JSON](https://penguinmodding.github.io/godslayer-extensions.json) |
| Allay | [View JSON](https://penguinmodding.github.io/allay-extensions.json) |
| Lemon's Gallery | [View JSON](https://penguinmodding.github.io/lemons-extensions.json) |
| Pen Group | [View JSON](https://penguinmodding.github.io/pen-extensions.json) |
| Ruby Devs | [View JSON](https://penguinmodding.github.io/ruby-extensions.json) |
| jwklong | [View JSON](https://penguinmodding.github.io/jwklong-extensions.json) |
| Joshua's Gallery | [View JSON](https://penguinmodding.github.io/josh-extensions.json) |

## JSON format

The gallery files use the same basic structure:

- `names` contains the extension names.
- `links` contains links to the extensions.
- `thumbnails` contains the thumbnail image URLs.
- `newExtensions` contains the extensions marked as new.

The entries in these arrays match by position. For example, the first name goes with the first link and first thumbnail.

## Using the data

You can open any JSON link above to view the data, or use the URL in a project that can read JSON. The files are kept separate so each gallery can be updated without changing the others.

## Universal gallery extractor

The main browser extractor is hosted at [index.js](https://penguinmodding.github.io/index.js). It detects known gallery layouts and also tries generic card, image, action-button, and JSON-data extraction.

Create a bookmark with this URL (replace the bookmark's URL field with the entire line):

```javascript
javascript:(()=>{const s=document.createElement('script');s.src='https://penguinmodding.github.io/index.js?'+Date.now();document.body.appendChild(s)})()
```

Open a gallery page, wait for its cards to load, then click the bookmark. Review the detected entries before exporting. Some sites may still require a dedicated adapter if they hide their extension URLs behind inaccessible APIs or unusual application state.
