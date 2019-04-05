const deprecateHeaders = (options, headers) => {
  if (headers) {
    console.warn('WARNING: headers is deprecated and will be removed in the next major version. Use options.headers instead.');
    options.headers = headers;
  }
};

module.exports = {
  deprecateHeaders
};
