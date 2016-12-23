# hkbus

KMB changed their UI for querying ETA, which is *very* slow even on a decent computer.
I reverse engineered the API and create a thin wrapper for the HTTP API to get the routes, stops and ETA.

## Usage

```js
const HKBus = require('hkbus');

const q = HKBus({
  operator: 'kmb',  // only KMB is supported at the moment
  lang: 'cht',
  verbose: false
});
// the above is the default config, which is equivalent to:
// const q = HKBus();

q.getStops('216M')
  .then(JSON.stringify).then(console.log)
  .catch(console.error);

q.getEta('216M', 1, 'KA04-N-1000-0', 1)
  .then(JSON.stringify).then(console.log)
  .catch(console.error);
```
