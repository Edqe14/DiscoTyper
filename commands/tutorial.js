const PagedEmbed = require('../utils/pagedembed.js');
const pages = [
  {
    title: 'Tutorial',
    description: `**Welcome to tutorial!**

In here, you will learn how to play typeracer using this bot! React ▶ to continue.`
  },
  {
    description: 'First, create a new game using the `new` command to generate a **game code** so you can share it with your friends!',
    image: 'https://i.imgur.com/Tm6r5Dx.png'
  },
  {
    description: 'Or, you can join others game using the `join` command and the **game code** you want to join.',
    image: 'https://i.imgur.com/heZV9Xc.png'
  },
  {
    description: 'After creating or joining a game, it will automatically start when the minimum player count reached or if you\'re the **game author**, you can use the `forcestart` command to start immediately.',
    image: 'https://i.imgur.com/Isa03pp.png'
  },
  {
    description: 'Additionally, you can view the current game info using the `info` command.',
    image: 'https://i.imgur.com/kw1T4R7.png'
  },
  {
    description: '**Congratulations!** You reached the end of the tutorial.\n\nNow, try to play a game of typeracer using your new knowledge.\n\n**GLHF!**'
  }
];

module.exports = exports = {
  name: 'tutorial',
  description: 'Show a tutorial how to play',
  cooldown: 15,
  permissions: null,
  aliases: ['how', 'howto', 'htp', 'confused', 'explain'],
  args: false,
  usage: '',
  category: 'game',
  async run (bot, message, args, config) {
    PagedEmbed(message, config, pages);
  }
};
