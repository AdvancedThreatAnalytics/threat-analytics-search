[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://github.com/AdvancedThreatAnalytics/threat-analytics-search/blob/main/LICENSE)

# Threat Analytics Search Chrome extension

The **Threat Analytics Search** extension allows Google Chrome and Microsoft Edge users to highlight specific text and conduct searches using various services. For instance, if you have a domain name you want to research, you could highlight that domain name and automatically search across as many registrars or threat exchanges you want.

## Features

### Configuration files

Once the extension is installed, it will attempt to download a configuration file with the latest recommended settings. If the file is not available or can't be downloaded, it will use default settings.

By default, the extension uses a configuration file hosted in this repository, but it can be configured to fetch it from any URL.

Configuration files can be encrypted using AES-CBC. You would then provide the decryption key in the extension settings.

Optionally, there is a setting to automatically re-fetch the configuration file once a week.

### Search Providers

For each Search Provider, the extension will generate an item in the context menu, so it can be used to search the selected texts.

> There are two types of search providers:
>
> - GET Providers, that will perform the search by opening the provider's site in a new tab (where the result will be shown).
> - POST Providers, that will perform the search by executing a POST request (on the provider's server) and show the result in a dialog.

The extension also adds "groups" to the context menu. Clicking on these items will conduct the search using several search providers at the same time.

If configured, the extension also defines three special sections on the contextual menu to conduct searches on [Carbon Black](https://www.carbonblack.com/), [NetWitness Investigator](http://www.emc.com/security/security-analytics/security-analytics.htm) and [RSA Security Analytics](https://community.rsa.com/t5/rsa-netwitness-investigator/tkb-p/netwitness-investigator).

## Development

The extension is implemented with JavaScript. The full list of dependencies can be found on the [package.json](./package.json) file, but the most relevant ones are:

| Library                                    | Used for   |
| ------------------------------------------ | ---------- |
| [aes-js](https://github.com/ricmoo/aes-js) | Encryption |
| [Bootstrap](https://getbootstrap.com/)     | UI         |
| [Font Awesome](https://fontawesome.com/)   | Icons      |
| [Svelte](https://svelte.dev/)              | Components |

### Code structure

The application is divided into three sections:

- The background page
  - Initializing the extension
  - Downloading and parsing the configuration file
  - Updating the context menu
- The post-handler page
  - Executing searches that require doing a POST request
- The options page
  - Allows users to modify extension settings
  - Adding or removing search providers.

Additionally, there is a migration page that is used to relocate the user's settings from the local storage, i.e. `localStorage`, to Chrome's storage, i.e. `chrome.storage.local`. This change was required after upgrading the manifest file to version 3 since service workers (unlike background pages) do not have access to the local storage.

### Building

Building is done using [Webpack](https://webpack.js.org/).  
To build the "distribution" code, you first have to execute `yarn`, to install all dependencies, and then execute: `yarn run build:dev` (for development mode on Google chrome), `yarn run build` (for production on Google Chrome), or `yarn run build:edge` (for production on Microsoft Edge) to build once; or `yarn run live` to watch file changes (in development mode) and rebuild on file change.  
These commands will create `dist` directory and copies all files into it and minifies them.

> Optionally, you can do `yarn run zip` for compress the content of the `dist` directory into a zip file (you can also do `yarn run build:zip` or `yarn run build:edge:zip` to execute both the build and zipping actions with a single command).

### Testing

Tesing is done using [Jest](https://jestjs.io/) and all test files are located inside `tests/` folder.

- Unit tests are located on the `tests/unit` folder, and can be run using the `yarn run test:unit` command.
- Unit tests are located on the `tests/e2e` folder, and can be run using the `yarn run test:e2e` command (don't forget to build the extension before doing it).

### Packaging

To package and distribute the extension see the [Chrome documentation](https://developer.chrome.com/docs/extensions/mv3/hosting/).
