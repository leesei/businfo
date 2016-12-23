require('isomorphic-fetch');

// implementation of operators
const KMB = require('./kmb');

function HKBus(opts) {
  if (opts && typeof opts != "object") {
    throw new Error('invalid options');
  }
  const options = Object.assign(opts || {}, {
    operator: 'kmb',
    lang: 'cht',
    verbose: false
  });
  if (options.verbose) {
    console.log(options);
  }

  switch (options.operator) {
    case 'kmb':
      return new KMB(options);
      break;
    default:
      throw new Error(`unknown operator[${options.operator}]`);
  }
}

module.exports = HKBus;
