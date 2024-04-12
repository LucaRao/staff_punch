"use strict";
var qs = require('./querystringify-wechat'), controlOrWhitespace = /^[\x00-\x20\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]+/, CRHTLF = /[\n\r\t]/g, slashes = /^[A-Za-z][A-Za-z0-9+-.]*:\/\//, port = /:\d+$/, protocolre = /^([a-z][a-z0-9.+-]*:)?(\/\/)?([\\/]+)?([\S\s]*)/i, windowsDriveLetter = /^[a-zA-Z]:/;
/**
 * Remove control characters and whitespace from the beginning of a string.
 *
 * @param {Object|String} str String to trim.
 * @returns {String} A new string representing `str` stripped of control
 *     characters and whitespace from its beginning.
 * @public
 */
function trimLeft(str) {
    return (str ? str : '').toString().replace(controlOrWhitespace, '');
}
/**
 * Check if we're required to add a port number.
 *
 * @see https://url.spec.whatwg.org/#default-port
 * @param {Number|String} port Port number we need to check
 * @param {String} protocol Protocol we need to check against.
 * @returns {Boolean} Is it a default port for the given protocol
 * @api private
 */
function required(port, protocol) {
    protocol = protocol.split(':')[0];
    port = +port;
    if (!port)
        return false;
    switch (protocol) {
        case 'http':
        case 'ws':
            return port !== 80;
        case 'https':
        case 'wss':
            return port !== 443;
        case 'ftp':
            return port !== 21;
        case 'gopher':
            return port !== 70;
        case 'file':
            return false;
    }
    return port !== 0;
}
/**
 * These are the parse rules for the URL parser, it informs the parser
 * about:
 *
 * 0. The char it Needs to parse, if it's a string it should be done using
 *    indexOf, RegExp using exec and NaN means set as current value.
 * 1. The property we should set when parsing this value.
 * 2. Indication if it's backwards or forward parsing, when set as number it's
 *    the value of extra chars that should be split off.
 * 3. Inherit from location if non existing in the parser.
 * 4. `toLowerCase` the resulting value.
 */
var rules = [
    ['#', 'hash'],
    ['?', 'query'],
    function sanitize(address, url) {
        // Sanitize what is left of the address
        return isSpecial(url.protocol) ? address.replace(/\\/g, '/') : address;
    },
    ['/', 'pathname'],
    ['@', 'auth', 1],
    [NaN, 'host', undefined, 1, 1],
    [/:(\d*)$/, 'port', undefined, 1],
    [NaN, 'hostname', undefined, 1, 1], // Set left over.
];
/**
 * These properties should not be copied or inherited from. This is only needed
 * for all non blob URL's as a blob URL does not include a hash, only the
 * origin.
 *
 * @type {Object}
 * @private
 */
var ignore = { hash: 1, query: 1 };
/**
 * The location object differs when your code is loaded through a normal page,
 * Worker or through a worker using a blob. And with the blobble begins the
 * trouble as the location object will contain the URL of the blob, not the
 * location of the page where our code is loaded in. The actual origin is
 * encoded in the `pathname` so we can thankfully generate a good "default"
 * location from it so we can generate proper relative URL's again.
 *
 * @param {Object|String} loc Optional default location object.
 * @returns {Object} lolcation object.
 * @public
 */
function lolcation(loc) {
    var globalVar;
    if (typeof window !== 'undefined')
        globalVar = window;
    else if (typeof global !== 'undefined')
        globalVar = global;
    else if (typeof self !== 'undefined')
        globalVar = self;
    else
        globalVar = {};
    var location = globalVar.location || {};
    loc = loc || location;
    var finaldestination = {}, type = typeof loc, key;
    if ('blob:' === loc.protocol) {
        finaldestination = new Url(unescape(loc.pathname), {});
    }
    else if ('string' === type) {
        finaldestination = new Url(loc, {});
        for (key in ignore)
            delete finaldestination[key];
    }
    else if ('object' === type) {
        for (key in loc) {
            if (key in ignore)
                continue;
            finaldestination[key] = loc[key];
        }
        if (finaldestination.slashes === undefined) {
            finaldestination.slashes = slashes.test(loc.href);
        }
    }
    return finaldestination;
}
/**
 * Check whether a protocol scheme is special.
 *
 * @param {String} The protocol scheme of the URL
 * @return {Boolean} `true` if the protocol scheme is special, else `false`
 * @private
 */
function isSpecial(scheme) {
    return (scheme === 'file:' ||
        scheme === 'ftp:' ||
        scheme === 'http:' ||
        scheme === 'https:' ||
        scheme === 'ws:' ||
        scheme === 'wss:');
}
/**
 * @typedef ProtocolExtract
 * @type Object
 * @property {String} protocol Protocol matched in the URL, in lowercase.
 * @property {Boolean} slashes `true` if protocol is followed by "//", else `false`.
 * @property {String} rest Rest of the URL that is not part of the protocol.
 */
/**
 * Extract protocol information from a URL with/without double slash ("//").
 *
 * @param {String} address URL we want to extract from.
 * @param {Object} location
 * @return {ProtocolExtract} Extracted information.
 * @private
 */
function extractProtocol(address, location) {
    address = trimLeft(address);
    address = address.replace(CRHTLF, '');
    location = location || {};
    var match = protocolre.exec(address);
    var protocol = match[1] ? match[1].toLowerCase() : '';
    var forwardSlashes = !!match[2];
    var otherSlashes = !!match[3];
    var slashesCount = 0;
    var rest;
    if (forwardSlashes) {
        if (otherSlashes) {
            rest = match[2] + match[3] + match[4];
            slashesCount = match[2].length + match[3].length;
        }
        else {
            rest = match[2] + match[4];
            slashesCount = match[2].length;
        }
    }
    else {
        if (otherSlashes) {
            rest = match[3] + match[4];
            slashesCount = match[3].length;
        }
        else {
            rest = match[4];
        }
    }
    if (protocol === 'file:') {
        if (slashesCount >= 2) {
            rest = rest.slice(2);
        }
    }
    else if (isSpecial(protocol)) {
        rest = match[4];
    }
    else if (protocol) {
        if (forwardSlashes) {
            rest = rest.slice(2);
        }
    }
    else if (slashesCount >= 2 && isSpecial(location.protocol)) {
        rest = match[4];
    }
    return {
        protocol: protocol,
        slashes: forwardSlashes || isSpecial(protocol),
        slashesCount: slashesCount,
        rest: rest,
    };
}
/**
 * Resolve a relative URL pathname against a base URL pathname.
 *
 * @param {String} relative Pathname of the relative URL.
 * @param {String} base Pathname of the base URL.
 * @return {String} Resolved pathname.
 * @private
 */
function resolve(relative, base) {
    if (relative === '')
        return base;
    var path = (base || '/').split('/').slice(0, -1).concat(relative.split('/')), i = path.length, last = path[i - 1], unshift = false, up = 0;
    while (i--) {
        if (path[i] === '.') {
            path.splice(i, 1);
        }
        else if (path[i] === '..') {
            path.splice(i, 1);
            up++;
        }
        else if (up) {
            if (i === 0)
                unshift = true;
            path.splice(i, 1);
            up--;
        }
    }
    if (unshift)
        path.unshift('');
    if (last === '.' || last === '..')
        path.push('');
    return path.join('/');
}
/**
 * The actual URL instance. Instead of returning an object we've opted-in to
 * create an actual constructor as it's much more memory efficient and
 * faster and it pleases my OCD.
 *
 * It is worth noting that we should not use `URL` as class name to prevent
 * clashes with the global URL instance that got introduced in browsers.
 *
 * @constructor
 * @param {String} address URL we want to parse.
 * @param {Object|String} [location] Location defaults for relative paths.
 * @param {Boolean|Function} [parser] Parser for the query string.
 * @private
 */
function Url(address, location, parser) {
    address = trimLeft(address);
    address = address.replace(CRHTLF, '');
    if (!(this instanceof Url)) {
        return new Url(address, location, parser);
    }
    var relative, extracted, parse, instruction, index, key, instructions = rules.slice(), type = typeof location, url = this, i = 0;
    if ('object' !== type && 'string' !== type) {
        parser = location;
        location = null;
    }
    if (parser && 'function' !== typeof parser)
        parser = qs.parse;
    location = lolcation(location);
    //
    // Extract protocol information before running the instructions.
    //
    extracted = extractProtocol(address || '', location);
    relative = !extracted.protocol && !extracted.slashes;
    url.slashes = extracted.slashes || (relative && location.slashes);
    url.protocol = extracted.protocol || location.protocol || '';
    address = extracted.rest;
    //
    // When the authority component is absent the URL starts with a path
    // component.
    //
    if ((extracted.protocol === 'file:' &&
        (extracted.slashesCount !== 2 || windowsDriveLetter.test(address))) ||
        (!extracted.slashes &&
            (extracted.protocol || extracted.slashesCount < 2 || !isSpecial(url.protocol)))) {
        instructions[3] = [/(.*)/, 'pathname'];
    }
    for (; i < instructions.length; i++) {
        instruction = instructions[i];
        if (typeof instruction === 'function') {
            address = instruction(address, url);
            continue;
        }
        parse = instruction[0];
        key = instruction[1];
        if (parse !== parse) {
            url[key] = address;
        }
        else if ('string' === typeof parse) {
            index = parse === '@' ? address.lastIndexOf(parse) : address.indexOf(parse);
            if (~index) {
                if ('number' === typeof instruction[2]) {
                    url[key] = address.slice(0, index);
                    address = address.slice(index + instruction[2]);
                }
                else {
                    url[key] = address.slice(index);
                    address = address.slice(0, index);
                }
            }
        }
        else if ((index = parse.exec(address))) {
            url[key] = index[1];
            address = address.slice(0, index.index);
        }
        url[key] = url[key] || (relative && instruction[3] ? location[key] || '' : '');
        //
        // Hostname, host and protocol should be lowercased so they can be used to
        // create a proper `origin`.
        //
        if (instruction[4])
            url[key] = url[key].toLowerCase();
    }
    //
    // Also parse the supplied query string in to an object. If we're supplied
    // with a custom parser as function use that instead of the default build-in
    // parser.
    //
    if (parser)
        url.query = parser(url.query);
    //
    // If the URL is relative, resolve the pathname against the base URL.
    //
    if (relative &&
        location.slashes &&
        url.pathname.charAt(0) !== '/' &&
        (url.pathname !== '' || location.pathname !== '')) {
        url.pathname = resolve(url.pathname, location.pathname);
    }
    //
    // Default to a / for pathname if none exists. This normalizes the URL
    // to always have a /
    //
    if (url.pathname.charAt(0) !== '/' && isSpecial(url.protocol)) {
        url.pathname = '/' + url.pathname;
    }
    //
    // We should not add port numbers if they are already the default port number
    // for a given protocol. As the host also contains the port number we're going
    // override it with the hostname which contains no port number.
    //
    if (!required(url.port, url.protocol)) {
        url.host = url.hostname;
        url.port = '';
    }
    //
    // Parse down the `auth` for the username and password.
    //
    url.username = url.password = '';
    if (url.auth) {
        index = url.auth.indexOf(':');
        if (~index) {
            url.username = url.auth.slice(0, index);
            url.username = encodeURIComponent(decodeURIComponent(url.username));
            url.password = url.auth.slice(index + 1);
            url.password = encodeURIComponent(decodeURIComponent(url.password));
        }
        else {
            url.username = encodeURIComponent(decodeURIComponent(url.auth));
        }
        url.auth = url.password ? url.username + ':' + url.password : url.username;
    }
    url.origin =
        url.protocol !== 'file:' && isSpecial(url.protocol) && url.host
            ? url.protocol + '//' + url.host
            : 'null';
    //
    // The href is just the compiled result.
    //
    url.href = url.toString();
}
/**
 * This is convenience method for changing properties in the URL instance to
 * insure that they all propagate correctly.
 *
 * @param {String} part          Property we need to adjust.
 * @param {Mixed} value          The newly assigned value.
 * @param {Boolean|Function} fn  When setting the query, it will be the function
 *                               used to parse the query.
 *                               When setting the protocol, double slash will be
 *                               removed from the final url if it is true.
 * @returns {URL} URL instance for chaining.
 * @public
 */
function set(part, value, fn) {
    var url = this;
    switch (part) {
        case 'query':
            if ('string' === typeof value && value.length) {
                value = (fn || qs.parse)(value);
            }
            url[part] = value;
            break;
        case 'port':
            url[part] = value;
            if (!required(value, url.protocol)) {
                url.host = url.hostname;
                url[part] = '';
            }
            else if (value) {
                url.host = url.hostname + ':' + value;
            }
            break;
        case 'hostname':
            url[part] = value;
            if (url.port)
                value += ':' + url.port;
            url.host = value;
            break;
        case 'host':
            url[part] = value;
            if (port.test(value)) {
                value = value.split(':');
                url.port = value.pop();
                url.hostname = value.join(':');
            }
            else {
                url.hostname = value;
                url.port = '';
            }
            break;
        case 'protocol':
            url.protocol = value.toLowerCase();
            url.slashes = !fn;
            break;
        case 'pathname':
        case 'hash':
            if (value) {
                var char = part === 'pathname' ? '/' : '#';
                url[part] = value.charAt(0) !== char ? char + value : value;
            }
            else {
                url[part] = value;
            }
            break;
        case 'username':
        case 'password':
            url[part] = encodeURIComponent(value);
            break;
        case 'auth':
            var index = value.indexOf(':');
            if (~index) {
                url.username = value.slice(0, index);
                url.username = encodeURIComponent(decodeURIComponent(url.username));
                url.password = value.slice(index + 1);
                url.password = encodeURIComponent(decodeURIComponent(url.password));
            }
            else {
                url.username = encodeURIComponent(decodeURIComponent(value));
            }
    }
    for (var i = 0; i < rules.length; i++) {
        var ins = rules[i];
        if (ins[4])
            url[ins[1]] = url[ins[1]].toLowerCase();
    }
    url.auth = url.password ? url.username + ':' + url.password : url.username;
    url.origin =
        url.protocol !== 'file:' && isSpecial(url.protocol) && url.host
            ? url.protocol + '//' + url.host
            : 'null';
    url.href = url.toString();
    return url;
}
/**
 * Transform the properties back in to a valid and full URL string.
 *
 * @param {Function} stringify Optional query stringify function.
 * @returns {String} Compiled version of the URL.
 * @public
 */
function toString(stringify) {
    if (!stringify || 'function' !== typeof stringify)
        stringify = qs.stringify;
    var query, url = this, host = url.host, protocol = url.protocol;
    if (protocol && protocol.charAt(protocol.length - 1) !== ':')
        protocol += ':';
    var result = protocol + ((url.protocol && url.slashes) || isSpecial(url.protocol) ? '//' : '');
    if (url.username) {
        result += url.username;
        if (url.password)
            result += ':' + url.password;
        result += '@';
    }
    else if (url.password) {
        result += ':' + url.password;
        result += '@';
    }
    else if (url.protocol !== 'file:' && isSpecial(url.protocol) && !host && url.pathname !== '/') {
        //
        // Add back the empty userinfo, otherwise the original invalid URL
        // might be transformed into a valid one with `url.pathname` as host.
        //
        result += '@';
    }
    //
    // Trailing colon is removed from `url.host` when it is parsed. If it still
    // ends with a colon, then add back the trailing colon that was removed. This
    // prevents an invalid URL from being transformed into a valid one.
    //
    if (host[host.length - 1] === ':' || (port.test(url.hostname) && !url.port)) {
        host += ':';
    }
    result += host + url.pathname;
    query = 'object' === typeof url.query ? stringify(url.query) : url.query;
    if (query)
        result += '?' !== query.charAt(0) ? '?' + query : query;
    if (url.hash)
        result += url.hash;
    return result;
}
Url.prototype = { set: set, toString: toString };
//
// Expose the URL parser and some additional properties that might be useful for
// others or testing.
//
Url.extractProtocol = extractProtocol;
Url.location = lolcation;
Url.trimLeft = trimLeft;
Url.qs = qs;
module.exports = Url;
//# sourceMappingURL=url-parse-wechat.js.map