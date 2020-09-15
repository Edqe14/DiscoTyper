module.exports = class GameHistory {
  /**
   * New game history schema
   * @param {Object<this>} thisArgs
   * @param {Number} defMaxWPM
   * @param {Number} defMinFinishTime
   * @param {Number} defEstimateAverage
   */
  constructor (thisArgs, defMaxWPM, defMinFinishTime, defEstimateAverage) {
    this.code = thisArgs.code;
    this.guild = thisArgs.guild;
    this.author = thisArgs.owner;
    this.text = thisArgs.text;
    this.values = {
      msMinDone: thisArgs.ms_min_done,
      msMaxDone: thisArgs.ms_max_done,
      maxWPM: defMaxWPM,
      minFinishTime: defMinFinishTime,
      estimateAverage: defEstimateAverage
    };
    this.players = thisArgs.finished.map(p => {
      return {
        id: p.id,
        username: p.username,
        stats: {
          errors: p.errors,
          wpm: p.wpm,
          accuracy: p.acc,
          duration: p.antiCheatData.typingDuration,
          finishTimestamp: p.timestamp
        },
        analysis: p.antiCheatData
      };
    });
  }
};
