export const deprecatePaginationArgs = (results, headers) => {
  if (Object.prototype.hasOwnProperty.call(results, 'resourceType')) {
    console.warn('WARNING: positional parameters for pagination methods are deprecated and will be removed in the next major version. Call with ({ bundle, options }) rather than (bundle, headers)'); // eslint-disable-line no-console
    const newArgs = { bundle: results };
    if (headers) {
      newArgs.options = { headers };
    }
    return newArgs;
  }
  return results;
};

export const deprecateHeaders = (options, headers) => {
  if (headers) {
    console.warn('WARNING: headers is deprecated and will be removed in the next major version. Use options.headers instead.'); // eslint-disable-line no-console
    return { headers, ...options };
  }
  return options;
};

export default {
  deprecateHeaders,
  deprecatePaginationArgs,
};
