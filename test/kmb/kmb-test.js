#!/usr/bin/env node
require('es6-promise').polyfill();
require('isomorphic-fetch');
const assert = require('assert');
const querystring = require('querystring');

const fetchJson = require('./fetchJson');
const camelCase = require('camelcase');

const context = {
  raw: {},
  saveRaw: true,
  // 0: ENG, 1: CHT, 2: CHS
  // applicable to `geteta`
  lang: 1
};

function KMBQuery (action, param) {
  const KMB_API_BASE = 'http://search.kmb.hk/KMBWebSite/Function/FunctionRequest.ashx';
  switch (action) {
    case 'getroutebound':
      assert(param['ROUTE']);
      break;
    case 'getAnnounce':
    case 'getstops':
    case 'getbbiforroute':
      assert(param['ROUTE']);
      assert(param['BOUND']);
      assert(param['SERVICE_TYPE']);
      break;
    case 'geteta':
      assert(param['ROUTE']);
      assert(param['BOUND']);
      assert(param['SERVICE_TYPE']);
      assert(param['LANG']);
      assert(param['BSI_CODE']);
      assert(param['SEQ']);
      break;
    case 'getRoutesInStop':
      assert(param['BSI_CODE']);
      break;
    default:
      assert(false, `unknown action[${action}]`);
      break;
  }

  const query = {};
  query.action = action;
  for (let k in param) {
    query[camelCase(k)] = param[k];
  }
  // console.log(JSON.stringify(query));
  // console.log(`${KMB_API_BASE}?${querystring.stringify(query)}`);
  return `${KMB_API_BASE}?${querystring.stringify(query)}`;
}

fetchJson(KMBQuery('getroutebound', { ROUTE: process.argv[2] }))
  .then((result) => {
    assert(result.result);
    context.raw['getroutebound'] = result.data;
  })
  .then(_ => {
    // generate `boundUrls` now that we have the bounds
    context.boundUrls = context.raw['getroutebound'].map((bound) => {
      return {
        getAnnounce: KMBQuery('getAnnounce', bound), // 特別通告
        getstops: KMBQuery('getstops', bound)  // 路線及收費
        // getbbiforroute: KMBQuery('getbbiforroute', bound),  // 轉乘優惠
      };
    });
    // console.log(context.boundUrls);

    return Promise.all(context.boundUrls.map((boundUrl, boundIdx) => {
      let promises = [];
      context.raw[boundIdx] = {};

      for (let k in boundUrl) {
        promises.push(fetchJson(boundUrl[k]));
      }
      return Promise.all(promises)
        .then((results) => {
          let idx = 0;
          for (let k in boundUrl) {
            let result = results[idx];
            assert(result.result);
            context.raw[boundIdx][k] = result.data;
            idx++;
          }
        });
    }));
  })
  .then(_ => {
    // generate `etaUrls` now that we have the stops
    context.etaUrls = context.raw['getroutebound'].map((bound, boundIdx) => {
      let param = Object.assign({}, bound);
      param.LANG = context.lang;
      return context.raw[boundIdx]['getstops'].routeStops.map((stop) => {
        // also works with hyphen!
        param.BSI_CODE = stop.BSICode;
        param.SEQ = stop.Seq;
        return KMBQuery('geteta', param);
      });
    });
    // console.log(context.etaUrls);

    return Promise.all(context.etaUrls.map((etaUrl, boundIdx) => {
      context.raw[boundIdx].eta = [];

      return Promise.all(etaUrl.map(url => fetchJson(url)))
        .then((results) => {
          results.forEach(result => {
            assert(result.result);
            context.raw[boundIdx].eta.push(result.data);
          });
        });
    }));
  })
  .then(_ => {
    // generate `boundInfo`
    const boundIdx = 0;
    const raw = context.raw[boundIdx];
    const boundInfo = {};
    assert.equal(
      raw['getstops'].routeStops.length,
      raw['eta'].length
    );
    // TODO: pick fields w.r.t. `context.lang`
    boundInfo.route = raw['getstops'].routeStops[0].Route;
    boundInfo.bound = raw['getstops'].routeStops[0].Bound;
    boundInfo.origin = raw['getstops'].routeStops[0].OriCName;
    boundInfo.destination = raw['getstops'].routeStops[0].DestCName;
    boundInfo.announcement = raw['getAnnounce'];
    boundInfo.stops = raw['getstops'].routeStops.map((stop, idx) => {
      const eta = raw['eta'][idx];
      return {
        name: stop.CName,
        location: stop.CLocation,
        seq: stop.Seq,
        bsiCode: stop.BSICode,
        fare: stop.AirFare,
        eta_updated: new Date(eta.updated),
        eta_generated: new Date(eta.generated),
        eta: eta.response.map(res => {
          return {
            time: res.t,
            expire: res.ex
          };
        })
      };
    });

    context.boundInfo = boundInfo;
  })
  .then(() => {
    // console.log(JSON.stringify(context.raw, null, 2));
    console.log(JSON.stringify(context.boundInfo, null, 2));
  })
  .catch((error) => {
    console.log('request failed', error);
  });
