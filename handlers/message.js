const { Permissions } = require('discord.js');
const Collection = require('@discordjs/collection');
const GuildConfig = require('../models/guildConfig.js');
const UserProfile = require('../models/userProfile.js');
const sleep = require('../utils/sleep.js');

module.exports = async (bot, config, cooldowns) => {
  const guildConfig = bot.db.get(process.env.NODE_ENV === 'development' ? 'guilds-dev' : 'guilds');
  const gameHistory = bot.db.get(process.env.NODE_ENV === 'development' ? 'games-dev' : 'games');
  const userProfile = bot.db.get(process.env.NODE_ENV === 'development' ? 'users-dev' : 'users');

  const dbs = module.exports.dbs = {
    guildConfig,
    gameHistory,
    userProfile
  };

  await sleep(1500);

  bot.on('message', async message => {
    if (message.author === bot.user || message.author.bot) return;
    if (message.channel.type === 'dm') return;

    const user = await userProfile.findOne({ id: message.author.id });
    if (!user) await userProfile.insert(new UserProfile(message.author));

    let settings = await guildConfig.findOne({ id: message.guild.id });
    if (!settings) {
      settings = new GuildConfig(message.guild, config);
      await guildConfig.insert(settings);
    }
    config = Object.assign(config, settings);

    if (message.content === `<@!${bot.user.id}>`) return message.channel.send(`Hello ${message.author.toString()}! My prefix for this guild is \`${config.prefix}\``);

    const prefix = config.prefix;
    const args = message.content.slice(prefix.length).split(' ');
    let cmd = args.shift().toLowerCase();

    if (!message.content.startsWith(prefix) && getIdFromMention(cmd) !== bot.user.id) return;
    if (getIdFromMention(cmd) === bot.user.id && message.content !== `<@!${bot.user.id}>`) cmd = args.shift().toLowerCase();

    const c = bot.commands.get(cmd) || bot.commands.find((cd) => cd.aliases && cd.aliases.includes(cmd));
    if (!c) return;
    if (c.ownerOnly && !config.ownerIDs.includes(message.author.id)) return;
    if (c.permissions && message.channel.type !== 'dm') {
      const perms = new Permissions(c.permissions);
      if (!message.member.hasPermission(perms)) {
        return message.reply(
          `You don't have enough permissions to run that command! You need permissions \`${perms.toArray().join(', ')}\` to run that command.`
        );
      }
    }

    if (message.channel.type !== 'text') { return message.reply("I can't execute that command inside a dm!"); }
    if (c.args && !args.length) {
      let reply = `You didn't provide any arguments, ${message.author}!`;

      if (c.usage) {
        reply += `\nThe proper usage would be: \`${prefix}${c.name} ${c.usage}\``;
      }

      return message.channel.send(reply);
    }
    if (!cooldowns.has(c.name)) cooldowns.set(c.name, new Collection());

    const now = Date.now();
    const timestamps = cooldowns.get(c.name);
    const cooldownAmount = c.cooldown * 1000;

    if (timestamps && timestamps.has(message.author.id)) {
      const expirationTime = timestamps.get(message.author.id) + cooldownAmount;

      if (now < expirationTime) {
        const timeLeft = (expirationTime - now) / 1000;
        message.delete({ timeout: 5000 });
        return message.reply(`Please wait ${timeLeft.toFixed(1)} more second(s) before reusing the command.`)
          .then((m) => m.delete({ timeout: 5000 }));
      }
    }

    if (c) {
      c.run(bot, message, args, config, dbs);
    }

    if (config.ownerIDs.includes(message.author.id)) return;
    timestamps.set(message.author.id, now);
    setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);
  });
};

function getIdFromMention (s) {
  if (!s.startsWith('<@') && s[s.length - 1] !== '>') return null;
  const a = s.slice(2, s.length - 1);
  if (a.startsWith('!')) return a.slice(1);
  return a;
}
