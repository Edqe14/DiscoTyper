const { MessageEmbed } = require('discord.js');
const sEval = require('safe-eval');
const { inspect } = require('util');

module.exports = exports = {
  name: 'eval',
  description: 'Eval code',
  cooldown: 0,
  permissions: null,
  aliases: [],
  args: false,
  usage: '',
  category: 'owner only',
  ownerOnly: true,
  async run (bot, message, args, config) {
    const embed = new MessageEmbed()
      .setTimestamp();
    try {
      const code = args.join(' ');
      if (code.includes('bot.token' || 'client.token')) throw new Error('Code includes token property. Exiting...');
      if (code.length <= 0) return message.reply('Invalid input!');
      let evaled = sEval(code, {
        bot,
        client: bot
      });

      if (typeof evaled !== 'string') evaled = inspect(evaled);
      evaled = evaled.replace(new RegExp(bot.token, 'gm'), '[HIDDEN]');
      if (evaled.length > 2000) evaled = evaled.slice(0, 1997) + '...';
      embed.setTitle('Success')
        .setColor('#06e802')
        .setDescription(`\`\`\`xl\n${clean(evaled)}\n\`\`\``);
      message.channel.send(embed);
    } catch (err) {
      embed.setTitle('Error')
        .setColor('#c90404')
        .setDescription(`\`\`\`xl\n${clean(err)}\n\`\`\``);
      message.channel.send(embed);
    }
  }
};

function clean (text) {
  if (typeof text === 'string') {
    return text
      .replace(/`/g, '`' + String.fromCharCode(8203))
      .replace(/@/g, '@' + String.fromCharCode(8203));
  } else return text;
}
