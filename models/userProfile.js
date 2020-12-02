module.exports = class UserProfile {
  /**
   * New user configuration schema
   * @param {User} user
   */
  constructor (user) {
    this.id = user.id;
    this.username = user.username;
    this.xp = {
      level: 0,
      current: 0,
      next: 300
    };
    this.stats = {
      playCount: 0,
      rawAccuracy: 0,
      totalWPM: 0,
      accuracy: 0,
      WLR: 0,
      wpm: 0,
      winCount: 0,
      winSpots: {
        first: 0,
        second: 0,
        third: 0
      }
    };
    this.history = {
      cheatDetection: 0,
      warn: 0,
      blacklist: 0
    };
    this.customs = [];
  }
};
