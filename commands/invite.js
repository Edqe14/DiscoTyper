const { MessageEmbed, Permissions } = require('discord.js');

module.exports = exports = {
  name: 'invite',
  description: 'Invite this bot',
  cooldown: 15,
  permissions: null,
  aliases: ['inv'],
  args: false,
  usage: '',
  category: 'miscellaneous',
  async run (bot, message, args, config) {
    const col = config.var.colDefEmbed[Math.floor(Math.random() * config.var.colDefEmbed.length)];
    const perm = new Permissions(config.var.defInvitePerms || []);
    const link = await bot.generateInvite(perm);

    const embed = new MessageEmbed()
      .setColor(col)
      .setTitle('Invite Me!')
      .setDescription(
        `[Click here](${link}) to invite me to your server(s)! 
        \`You need 'Manage Server' or greater permission to invite me\`
        
        These permissions will be **granted** on inviting me:
        \`\`\`${perm.toArray().join('\n')}\`\`\`
        *PS: Permissions written above could be shown differently on Discord when inviting me*
        
        Thank you to everyone for inviting me to their server(s)!`)
      .setTimestamp();

    message.channel.send(embed);
  }
};
