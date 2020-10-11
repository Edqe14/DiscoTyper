const axios = require('axios');
const DBL = require('dblapi.js');

module.exports = (bot, config) => {
  bot.on('ready', () => {
    console.log(`Bot ready! Playing with ${bot.users.cache.size} users on ${bot.guilds.cache.size} servers`);
    //const dapi = new DBL(process.env.TOPGG_TOKEN, bot);

    update();
    async function update (lu, lg) {
      const users = bot.users.cache.size;
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
