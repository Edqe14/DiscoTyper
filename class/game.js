const crypto = require('crypto');
const fs = require('fs');
const { TextChannel, MessageEmbed } = require('discord.js');

module.exports = ({ paths: { text: path }, var: { colError, colSuccess, colInfo, defCPS, defIdle, defCP } }) => {
  if (fs.existsSync(`${__dirname.replace(/\\/gi, '/')}/../${path}`)) return new Error('Invalid text path');
  const { texts, length } = require(`${__dirname.replace(/\\/gi, '/')}/../${path}`);

  return class Game {
    /**
     * Create new game
     * @param {String} code
     * @param {?Array<String>} players
     * @param {?Object} ops
     * @param {TextChannel} channel
     */
    constructor (code, players = [], channel, ops = {}) {
      if (!channel || !(channel instanceof TextChannel)) throw new TypeError('Invalid channel given');

      this.code = code || this.generateCode();
      this.players = players || [];
      this.channel = channel;
      this.ops = Object.assign({}, ops);
      this.started = false;

      this.text = texts[Math.floor(Math.random() * length)];
      this.text_len = this.text.length;
      this.ms_min_done = this.text_len / defCPS * 1000;
    }

    /**
     * Generate a random 5 character code
     */
    static generateCode () {
      const str = `discotype-${Date.now()}-${crypto.randomBytes(4).toString('base64')}`;

      return crypto.createHash('md5').update(str).digest('hex').substr(0, 5);
    }

    /**
     * Add a player (user id) to the game
     * @param {String} id
     */
    addPlayer (id) {
      if (this.started) return this.log('This game is already started', true, 0);
      if (!id || id.length !== 18) throw new Error('Invalid id');

      return this.players.push(id);
    }

    /**
     * Remove a player (user id) to the game
     * @param {String} id
     */
    removePlayer (id) {
      if (this.started) return this.log('This game is already started');
      if (!id || id.length !== 18) throw new Error('Invalid id');
      if (!this.players.includes(id)) throw new Error('This id is not in this game');

      return this.players.splice(this.players.indexOf(id), 1);
    }

    /**
     * Start the game
     */
    async start () {
      if (this.players.length <= 1) return this.log('Not enough player to start', true, 0);
      this.started = true;

      await this.log(`Type this text below and send it as soon as you can!\n\n\`\`\`${this.text}\`\`\``, true);

      this.finished = [];
      this.collector = this.channel.createMessageCollector(m => this.players.includes(m.author.id) && m.author.typingDurationIn(this.channel) >= this.ms_min_done, {
        idle: defIdle
      });
      this.start_time = Date.now();

      this.collector.on('collect', m => {
        m.delete({ timeout: 20 });
        if (this.finished.some(u => u.id === m.author.id)) return this.log('You already finish this sentence!');
        if (!this.sanitize(m)) return this.log(`Hey ${m.member.toString()}, it seems you didn't type this properly! Please try again.`);

        const finish = Date.now();
        const errors = this.compare(this.text, m.content);
        const acc = (this.text_len - errors) / this.text_len * 100;

        const prep = {
          id: m.author.id,
          errors,
          acc,
          duration: finish - this.start_time
        };
        this.finished.push(prep);

        this.log(m.author, `Congrats! You finished the race and took the **#${this.finished.findIndex(u => u.id === m.author.id) + 1}** spot!\n\n\`\`\`Stats:\n> Errors: ${prep.errors}\n> Accuracy: ${prep.acc.toFixed(2)}%\n> Time taken: ${prep.duration / 1000} seconds\`\`\``, true);
      });
    }

    /**
     * Compare 2 strings
     * @param {String} a
     * @param {String} b
     */
    compare (a, b) {
      let errors = 0;
      for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) errors++;
      }
      return errors;
    }

    /**
     * Log a message to a game channel
     * @param {*} message
     * @param {?Boolean} embed
     * @param {?Number} type
     * @param {?ColorResolvable} color
     */
    async log (channel = this.channel, message, embed = false, type = 2, color = 'RANDOM') {
      if (message.length === 0) return;
      if (!embed) return channel.send(message);

      const mbed = new MessageEmbed();
      switch (type) {
        case 0:
          mbed.setTitle('Error')
            .setColor(colError)
            .setDescription(message)
            .setTimestamp();
          break;

        case 1:
          mbed.setTitle('Success')
            .setColor(colSuccess)
            .setDescription(message)
            .setTimestamp();
          break;

        case 2:
          mbed.setTitle('Info')
            .setColor(colInfo)
            .setDescription(message)
            .setTimestamp();
          break;

        default:
          mbed.setColor(color);
          break;
      }

      return await channel.send(mbed);
    }

    /**
     * Check user legitimacy
     * @param {Message} m
     */
    sanitize (m) {
      return (m.author.typingDurationIn(this.channel) >= this.ms_min_done && Date.now() - this.start_time > defCP);
    }
  };
};
