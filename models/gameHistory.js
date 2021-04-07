module.exports = class GameHistory {
  /**
   * New game history schema
   * @param {Object<this>} thisArgs
   * @param {Number} defMaxWPM
   * @param {Number} defMinFinishTime
   * @param {Number} defEstimateAverage
   */
  constructor (thisArgs, maxWPM, minFinishTime, maxFinishTime, minDuration, maxDuration, bestAccuracy) {
    this.code = thisArgs.code;
    this.guild = thisArgs.guild;
    this.author = thisArgs.owner;
    this.text = thisArgs.text;
    this.values = {
      failPoints: thisArgs.failPoints,
      msMinDone: thisArgs.ms_min_done,
      msMaxDone: thisArgs.ms_max_done,
      maxWPM,
      minFinishTime,
      maxFinishTime,
      minDuration,
      maxDuration,
      bestAccuracy
    };
    this.players = thisArgs.finished.map(p => {
      return {
        id: p.id,
        username: p.username,
        stats: {
          errors: p.errors,
          wpm: p.wpm,
          accuracy: p.acc,
          duration: p.duration,
          finishTimestamp: p.timestamp
        }
      };
    });
  }
};
