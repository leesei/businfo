// assuming `fetch()` is available

function checkStatus(response) {
  if (response.status >= 200 && response.status < 300) {
    return response;
  } else {
    var error = new Error(response.statusText);
    error.response = response;
    throw error;
  }
}

function parseJSON(response) {
  return response.json();
}

module.exports = function(url) {
  return fetch(url)
    .then(checkStatus)
    .then(parseJSON);
}
