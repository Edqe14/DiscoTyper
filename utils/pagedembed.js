const { MessageEmbed } = require('discord.js');

module.exports = exports.default = async (message, config, pages = []) => {
  if (!message) throw new Error('Invalid message');
  if (!config) throw new Error('Invalid config');

  if (pages.length === 0) throw new Error('No pages to load');
  let page = 0;

  const col = config.var.colDefEmbed[Math.floor(Math.random() * config.var.colDefEmbed.length)];
  const embed = new MessageEmbed()
    .setColor(col)
    .setTimestamp();

  const msg = await update();
  (async function () {
    await msg.react('◀');
    await msg.react('▶');
    await msg.react('🗑️');
  })();
  const collector = msg.createReactionCollector((r, u) => u.id === message.author.id && ['◀', '▶', '🗑️'].includes(r.emoji.name), {
    time: config.var.defTutorialEndTime
  });

  collector.on('collect', (r, u) => {
    r.users.remove(u);

    const bef = 0 + page;
    if (r.emoji.name === '🗑️') return collector.stop();
    if (r.emoji.name === '◀' && page > 0) page--;
    if (r.emoji.name === '▶' && page < pages.length) page++;

    if (bef === page) return;
    return update(msg);
  });

  collector.on('end', () => {
    collector.removeAllListeners();
    msg.reactions.removeAll();

    embed.setDescription('Session ended')
      .setFooter('Please re-run the command to view again')
      .setTimestamp();
    return msg.edit(embed).then(mm => mm.delete({ timeout: config.var.defDeleteTime }));
  });

  async function update (m) {
    const { title, description, image } = pages[page];
    if (title) embed.setTitle(title);
    if (description) embed.setDescription(description);
    embed.setImage(image);
    embed.setFooter(`Page ${page + 1} out of ${pages.length} pages`);

    if (m) return await m.edit(embed);
    return await message.channel.send(embed);
  }
};
