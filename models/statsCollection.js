module.exports = class Stats {
  constructor (runs = 0, codes = []) {
    this.date = new Date().toISOString().split('T')[0];
    this.gameRuns = runs;
    this.gameCodes = codes;
  }
};
