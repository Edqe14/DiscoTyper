const { Guild } = require('discord.js');

module.exports = class GuildConfig {
  /**
   * New guild configuration schema
   * @param {Guild} guild
   * @param {Object} config
   */
  constructor (guild, config) {
    this.prefix = config.prefix;
    this.id = guild.id;
    this.game = {
      maxGame: config.game.maxGame
    };
  }
};
