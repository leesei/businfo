// Convert sensible strings to Boolean, useful for parsing URL queries
function string2Boolean (string, defaultTrue) {
  // console.log('2bool:', String(string).toLowerCase());
  switch (String(string).toLowerCase()) {
    case '':
      return (defaultTrue === undefined) ? false : defaultTrue;
    case 'true':
    case '1':
    case 'yes':
    case 'y':
      return true;
    case 'false':
    case '0':
    case 'no':
    case 'n':
      return false;
    default:
      // you could throw an error, but 'undefined' seems a more logical reply
      return undefined;
  }
}

module.exports = {
  string2Boolean
};
