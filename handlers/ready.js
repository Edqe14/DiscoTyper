const axios = require('axios');

module.exports = (bot, config) => {
  bot.on('ready', () => {
    console.log(`Bot ready! Playing with ${bot.guilds.cache.reduce((a, g) => a + g.memberCount, 0)} users on ${bot.guilds.cache.size} servers`);
    
    update();
    async function update (lu, lg) {
      const users = bot.guilds.cache.reduce((a, g) => a + g.memberCount, 0);
      const guilds = bot.guilds.cache.size;
      if (users === lu && guilds === lg) return;
      const name = `with ${users} users on ${guilds} servers`;
      bot.user.setPresence({
        activity: {
          type: 'PLAYING',
          name
        }
      });
      
      if (process.env.NODE_ENV !== 'production') return;
      axios({
        method: 'POST',
        url: config.uris.discordbotlist,
        headers: {
          Authorization: process.env.DBL_TOKEN
        },
        data: {
          guilds,
          users
        }
      }).catch(console.error);

      bot.setTimeout(() => update(users, guilds), 60000);
    }
  });
};
