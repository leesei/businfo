# hkbus

KMB changed the UI of the webpage for querying ETA, which is *very* slow even on a decent computer.  
I reverse-engineered the API and created a thin wrapper for the HTTP API to get the routes, stops and ETAs.  
The first version targets KMB, API may change when other operators are added in the future.

See `test/` for notes on retrieving info from operators.

This is the repo for the wrapper library.  
[`hkbus-cli`][1] is a CLI frontend, [`hkbus-web`][2] is a web frontend.  
`hkbus-web`'s build is pushed to `gh-pages` branch of this repo and available [here][3].

[1]: https://github.com/leesei/hkbus-cli/
[2]: https://github.com/leesei/hkbus-web/
[3]: https://leesei.github.io/hkbus/

## Usage

https://runkit.com/leesei/hkbus-demo

## References

https://db.kmbeta.ml/  
https://github.com/mob41/KmbETA-API  
https://github.com/mob41/KmbETA-DB  
https://github.com/alvinhkh/buseta  
