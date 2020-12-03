const axios = require('axios');
const DBL = require('dblapi.js');

module.exports = (bot, config) => {
  bot.on('ready', () => {
    if (process.env.NODE_ENV !== 'prod') return console.log('Bot DEV Ready');
    console.log(`Bot ready! Playing with ${bot.guilds.cache.reduce((a, g) => a + g.members.cache.filter(m => !m.user.bot).size, 0)} users on ${bot.guilds.cache.size} servers`);
    const dapi = new DBL(process.env.TOPGG_TOKEN, bot);
    dapi.on('error', e => {
      console.error(e);
    });

    update();
    async function update (lu, lg) {
      const users = bot.guilds.cache.reduce((a, g) => a + g.members.cache.filter(m => !m.user.bot).size, 0);
      const guilds = bot.guilds.cache.size;
      if (users === lu && guilds === lg) return;
      const name = `with ${users} users on ${guilds} servers`;
      bot.user.setPresence({
        activity: {
          type: 'PLAYING',
          name
        }
      });

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
