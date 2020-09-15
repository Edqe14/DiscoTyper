/**
* Make a confirmation using reaction
* @param {User} user
* @param {Message} msg
* @param {Number=30000} time
*/
module.exports = async (user, msg, time = 30000) => {
  await msg.react('🇾');
  await msg.react('🇳');
  const data = await msg.awaitReactions(reaction => reaction.users.cache.has(typeof user === 'string' ? user : user.id), { time: time, max: 1 });
  if (data.firstKey() === '🇾') return true;
  return false;
};
