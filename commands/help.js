const { MessageEmbed, Permissions } = require('discord.js');

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
    const cmd = args[0];
    const col = config.var.colDefEmbed[Math.floor(Math.random() * config.var.colDefEmbed.length)];
    const embed = new MessageEmbed()
      .setColor(col)
      .setTitle('Help');

    if (bot.commands.has(cmd) || bot.commands.some(c => c.aliases && c.aliases.includes(cmd))) {
      const command = bot.commands.get(cmd) || bot.commands.find((cd) => cd.aliases && cd.aliases.includes(cmd));
      const perm = new Permissions(command.permissions || []).toArray();
      embed.setDescription(
        `**${command.name}**
${command.description}
        
**Category**: ${command.category[0].toUpperCase() + command.category.substring(1)}
**Aliases**: 
${command.aliases.length === 0 ? 'None' : `\`${command.aliases.join(', ')}\``}
        
**Usage**: 
\`${(`${config.prefix + command.name} ${command.usage}`).trim()}\`
        
**Permission Required**:
${perm.length === 0 ? 'None' : `\`\`\`${perm.map((a, i) => i % 2 === 1 ? `**${a}**` : a).join('\n')}\`\`\``}`
      ).setTimestamp();

      return message.channel.send(embed);
    }

    const category = {};
    bot.commands.forEach(c => {
      if (c.category.toUpperCase() === 'OWNER ONLY' && !config.ownerIDs.includes(message.author.id)) return;
      if (!category[c.category.toUpperCase()]) category[c.category.toUpperCase()] = [];
      category[c.category.toUpperCase()].push({
        name: c.name,
        description: c.description
      });
    });

    embed.setDescription(
        `My prefix here is \`${config.prefix}\`\n\n${Object.keys(category).map(c => `**${c}**\n${category[c].map(m => `\`${m.name}\` **-** ${m.description}`).join('\n')}`).join('\n\n')}`
    ).setTimestamp();

    message.channel.send(embed);
  }
};
