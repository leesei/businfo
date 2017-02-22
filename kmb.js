const assert = require('assert');
const querystring = require('querystring');

const fetchJson = require('./fetchJson');
const helper = require('./helper');

function extractRouteInfo (basicInfo, route, options) {
  return {
    route: route.route,
    bound: route.bound,
    origin: basicInfo[options.ORIGIN_FIELD],
    dest: basicInfo[options.DEST_FIELD]
  };
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
  return {
    generated: new Date(eta.generated),
    updated: new Date(eta.updated),
    eta: eta.response.map(res => {
      return {
        // `t` may contain "Scheduled", rip it off
        time: res.t.split(/\s+/)[0],
        expire: res.ex,
        scheduled: helper.string2Boolean(res.ei),
        wheelchair: helper.string2Boolean(res.w)
      };
    })
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
      this.options.LANG = 1;
      break;
  }
}

KMBInfo.prototype.getStops = function (route, bound) {
  assert(route.match(/^[0-9a-zA-Z]+$/));

  // boundsP is a promise of array of integers (representing bound)
  let boundsP;
  // bound is optional, return info for all bounds if not provided
  if (Number.isInteger(bound)) {
    boundsP = Promise.resolve([ bound ]);
  } else {
    const query = {};
    query.action = 'getroutebound';
    query.route = route;

    if (this.options.verbose) {
      console.log(`${KMB_API_BASE}?${querystring.stringify(query)}`);
    }
    boundsP = fetchJson(`${KMB_API_BASE}?${querystring.stringify(query)}`)
      .then(result => {
        assert(result.result);
        return result.data.map(routebound => routebound.BOUND);
      });
  }

  return boundsP
    .then(bounds => {
      // generate `boundUrls` now that we have the bounds
      return bounds.map(bound => {
        const query = {};
        query.action = 'getstops';
        query.route = route;
        query.bound = bound;
        return `${KMB_API_BASE}?${querystring.stringify(query)}`;
      });
    })
    .then(boundUrls => {
      // map `boundUrls` to promises
      return boundUrls.map((boundUrl, boundIdx) => {
        if (this.options.verbose) {
          console.log(`[${boundIdx}]: ${boundUrl}`);
        }
        return fetchJson(boundUrl);
      });
    })
    .then(promises => {
      return Promise.all(promises)
        .then(results => {
          // transform results to routes
          return results.map(result => {
            if (this.options.verbose >= 3) {
              console.log(JSON.stringify(result, null, 2));
            }
            assert(result.result);
            const ret = extractRouteInfo(result.data.basicInfo, result.data.route, this.options);
            ret.stops = result.data.routeStops.map(
              stop => transformStop(stop, this.options));
            return ret;
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
  query.bsicode = stopCode; // no need to trim '-'
  query.seq = stopSeq;
  query.lang = this.options.LANG;

  if (this.options.verbose) {
    console.log(`${KMB_API_BASE}?${querystring.stringify(query)}`);
  }
  return fetchJson(`${KMB_API_BASE}?${querystring.stringify(query)}`)
    .then(result => {
      if (this.options.verbose >= 3) {
        console.log(JSON.stringify(result, null, 2));
      }
      assert(result.result);
      return result.data;
    })
    .then(transformEta);
};

module.exports = KMBInfo;
