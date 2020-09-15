/**
 * Sleep/Delay function
 * @param {?Number} ms
 */
module.exports = (ms = 0) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
