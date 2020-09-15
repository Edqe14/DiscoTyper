const { MessageEmbed } = require('discord.js');
const verify = require('../utils/verify.js');

module.exports = exports = {
  name: 'prefix',
  description: 'Change bot prefix',
  cooldown: 10,
  permissions: ['MANAGE_GUILD'],
  aliases: [],
  args: true,
  usage: '<new prefix>',
  category: 'configuration',
  async run (bot, message, args, config, { guildConfig }) {
    const prefix = args[0];
    if (!prefix) return message.reply('Please provide a valid prefix');

    const col = config.var.colDefEmbed[Math.floor(Math.random() * config.var.colDefEmbed.length)];
    const embed = new MessageEmbed()
      .setTitle('Prefix')
      .setColor(col)
      .setDescription(`Do you want to change the prefix to \`${prefix}\`?`)
      .setTimestamp();

    const m = await message.channel.send(embed);
    const ver = await verify(message.author.id, m);
    if (!ver) {
      embed.setDescription('Canceled.').setColor(config.var.colError);
      return m.edit(embed);
    }

    await guildConfig.findOneAndUpdate({ id: message.guild.id }, { $set: { prefix: prefix } });
    embed.setDescription(`Successfully changed the prefix to \`${prefix}\``);
    m.reactions.removeAll();
    m.edit(embed);
  }
};
