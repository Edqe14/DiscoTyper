const { MessageEmbed } = require('discord.js');

module.exports = exports = {
  name: 'about',
  description: 'Show about me',
  cooldown: 10,
  permissions: null,
  aliases: ['what', 'describe'],
  args: false,
  usage: '',
  category: 'miscellaneous',
  async run (bot, message, args, config) {
    const col = config.var.colDefEmbed[Math.floor(Math.random() * config.var.colDefEmbed.length)];
    const embed = new MessageEmbed()
      .setColor(col)
      .setTitle('About Me')
      .setDescription(
        `**Hello there!**

My name is **${bot.user.username}** 🎉 *\`if you don't know yet\`*, currently developed by <@326966683187281922>. I'm a bot heavily inspired by [Typeracer](https://play.typeracer.com), created for you and your friend to play typeracer on Discord!

There is some things that you're **not** allowed to do while playing, which is:
    **1**. Cheating (Copy Paste, Macro, etc.)
    **2**. Trolling
    **3**. Spamming (Text, New Game, etc.)
My developer added a small anti-cheat to prevent cheating but I believe you players to **not** cheat by any means 😃.

You found a bug? or, You're a developer interested to contribute? Join my [Discord Server](https://discord.gg/GMRk6fw)`
      ).setTimestamp();

    message.channel.send(embed);
  }
};
