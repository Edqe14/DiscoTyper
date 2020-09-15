const { MessageEmbed } = require('discord.js');

module.exports = exports = {
  name: 'help',
  description: 'Show help',
  cooldown: 10,
  permissions: null,
  aliases: ['h'],
  args: false,
  usage: '[command]',
  category: 'miscellaneous',
  async run (bot, message, args, config) {
    const col = config.var.colDefEmbed[Math.floor(Math.random() * config.var.colDefEmbed.length)];

    const category = {};
    bot.commands.forEach(c => {
      if (!category[c.category.toUpperCase()]) category[c.category.toUpperCase()] = [];
      category[c.category.toUpperCase()].push({
        name: c.name,
        description: c.description
      });
    });

    const embed = new MessageEmbed()
      .setColor(col)
      .setTitle('Help')
      .setDescription(
        `My prefix here is \`${config.prefix}\`
        
        ${Object.keys(category).map(c => `**${c}**\n${category[c].map(m => `\`${m.name}\` **-** ${m.description}`).join('\n')}`).join('\n\n')}`)
      .setTimestamp();

    message.channel.send(embed);
  }
};
