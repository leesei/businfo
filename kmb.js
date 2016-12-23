const assert = require('assert');
const querystring = require('querystring');

const fetchJson = require('./fetchJson');

function extractRouteInfo (stop, options) {
  return {
    route: stop.Route,
    bound: stop.Bound,
    origin: stop[options.ORIGIN_FIELD],
    dest: stop[options.DEST_FIELD]
  }
}

function transformStop (stop, options) {
  return {
    seq: Number.parseInt(stop.Seq),
    name: stop[options.NAME_FIELD],
    location: stop[options.LOCATION_FIELD],
    code: stop.BSICode,
    fare: Number.parseFloat(stop.AirFare)
  };
}

function transformEta (eta) {
  // TODO: response to be dissected
  return {
    generated: Number.parseInt(eta.generated),
    updated: Number.parseInt(eta.updated),
    response: eta.response
  };
}

const KMB_API_BASE = 'http://search.kmb.hk/KMBWebSite/Function/FunctionRequest.ashx';
function KMBInfo (opts) {
  this.options = opts;

  // field name is for accessing result from `getstops`
  // lang (as integer) is for `geteta`
  switch (this.options.lang) {
    case 'eng':
      this.options.NAME_FIELD = 'EName';
      this.options.ORIGIN_FIELD = 'OriEName';
      this.options.DEST_FIELD = 'DestEName';
      this.options.LOCATION_FIELD = 'ELocation';
      this.options.LANG = 0;
      break;
    case 'chs':
      this.options.NAME_FIELD = 'SCName';
      this.options.ORIGIN_FIELD = 'OriSCName';
      this.options.DEST_FIELD = 'DestSCName';
      this.options.LOCATION_FIELD = 'SCLocation';
      this.options.LANG = 2;
      break;
    case 'cht':
      this.options.NAME_FIELD = 'CName';
      this.options.ORIGIN_FIELD = 'OriCName';
      this.options.DEST_FIELD = 'DestCName';
      this.options.LOCATION_FIELD = 'CLocation';
      this.options.LANG = 2;
      break;
  }
}

KMBInfo.prototype.getStops = function (route) {
  assert(route.match(/^[0-9a-zA-Z]+$/));

  const query = {};
  query.action = 'getroutebound';
  query.route = route;

  if (this.options.verbose) {
    console.log(`${KMB_API_BASE}?${querystring.stringify(query)}`)
  }
  return fetchJson(`${KMB_API_BASE}?${querystring.stringify(query)}`)
    .then(result => {
      assert(result.result);
      return result.data;
    })
    .then(bounds => {
      // generate `boundUrls` now that we have the bounds
      return bounds.map(bound => {
        const query = {};
        query.action = 'getstops';
        query.route = route;
        query.bound = bound.BOUND;
        return `${KMB_API_BASE}?${querystring.stringify(query)}`
      });
    })
    .then(boundUrls => {
      // map `boundUrls` to promises
      return boundUrls.map((boundUrl, boundIdx) => {
        if (this.options.verbose) {
          console.log(`[${boundIdx}]: ${boundUrl}`)
        }
        return fetchJson(boundUrl);
      });
    })
    .then(promises => {
      return Promise.all(promises)
        .then(results => {
          // transform results to routes
          return results.map(result => {
            // console.log(result.data);
            const route = extractRouteInfo(result.data.routeStops[0], this.options);
            route.stops = result.data.routeStops.map(stop => transformStop(stop, this.options));
            return route;
          });
        });
    });
};

KMBInfo.prototype.getEta = function (route, bound, stopCode, stopSeq) {
  assert(route.match(/^[0-9a-zA-Z]+$/));
  assert(bound === 1 || bound === 2);
  assert(stopCode.match(/^[0-9A-Z-]+$/));
  assert(Number.isInteger(stopSeq));

  const query = {};
  query.action = 'geteta';
  query.route = route;
  query.bound = bound;
  query.servicetype = 1;
  query.bsicode = stopCode;
  query.seq = stopSeq;
  query.lang = this.options.LANG;

  if (this.options.verbose) {
    console.log(`${KMB_API_BASE}?${querystring.stringify(query)}`)
  }
  return fetchJson(`${KMB_API_BASE}?${querystring.stringify(query)}`)
    .then(result => {
      assert(result.result);
      return result.data;
    })
    .then(transformEta);
}

module.exports = KMBInfo;
