module.exports = (bot, config) => {
  bot.on('ready', () => {
    console.log(`Bot ready! Playing with ${bot.users.cache.size} users on ${bot.guilds.cache.size} servers`);

    activity();
    function activity (last = '') {
      const name = `with ${bot.users.cache.size} users on ${bot.guilds.cache.size} servers`;
      if (last !== name) {
        bot.user.setPresence({
          activity: {
            type: 'PLAYING',
            name
          }
        });
      }
      bot.setTimeout(() => activity(name), 60000);
    }
  });
};
