const crypto = require('crypto');
const fs = require('fs');
const { TextChannel, MessageEmbed, Message, User, GuildMember } = require('discord.js');
const sleep = require('../utils/sleep.js');
const pad = require('../utils/pad.js');
const { EventEmitter } = require('events');
const { paths: { text: path }, var: { colError, colSuccess, colInfo, colSet, defCPS, defIdle, defCP, defMinPlayer, defStartTime, defDeleteTime, defPlayerLimit } } = require('../config.json');

if (!fs.existsSync(`${__dirname.replace(/\\/gi, '/')}/../${path}`)) throw new Error('Invalid text path');
const { texts, length } = require(`${__dirname.replace(/\\/gi, '/')}/../${path}`);

module.exports = class Game extends EventEmitter {
  /**
   * Create new game
   * @param {String} code
   * @param {?Array<String>} players
   * @param {?Object} ops
   * @param {TextChannel} channel
   */
  constructor (code, author, channel, players = [], ops = {}) {
    super();
    if (!channel || !(channel instanceof TextChannel)) throw new TypeError('Invalid channel given');
    if (!author || typeof author !== 'string') throw new TypeError('Invalid author user id');

    this.createdDate = new Date();
    this.owner = author;
    this.code = code || Game.generateCode();
    this.limit = defPlayerLimit;
    this.players = players || [];
    this.channel = channel;
    this.guild = this.channel.guild;
    this.ops = Object.assign({}, ops);
    this.isStarted = false;
    this.isFinished = false;
    this.startTimer = undefined;

    this.text = texts[Math.floor(Math.random() * length)];
    this.text_len = this.text.length;
    this.ms_min_done = this.text_len / defCPS * 1000;

    this.on('start', this.start);
  }

  /**
   * Generate a random 5 character code
   */
  static generateCode () {
    const str = `discotype-${Date.now()}-${crypto.randomBytes(4).toString('base64')}`;

    return crypto.createHash('md5').update(str).digest('hex').substr(0, 5).toUpperCase();
  }

  /**
   * Add a player (user id) to the game
   * @param {String|GuildMember|User} user
   * @param {Game} game
   * @param {TextChannel} channel
   */
  static addPlayer (user, game, channel) {
    if (game.isStarted) return Game.log(channel, 'This game is already started', true, 0);
    if (!user) throw new Error('Invalid user');

    if (game.players.length >= game.limit) return Game.log(channel, 'This game is already full', true, 0);
    game.players.push({
      id: typeof user !== 'string' ? user.id : user,
      user,
      timestamp: Date.now()
    });

    Game.log(channel, `${(typeof user !== 'string' ? user : channel.guild.member(user)).toString()} has joined game \`${game.code}\``);
    if (game.players.length >= defMinPlayer && typeof game.startTimer === 'undefined') game.startCountDown();
    return game;
  }

  /**
   * Remove a player (user id) to the game
   * @param {String|GuildMember|User} user
   */
  removePlayer (user, game, channel) {
    if (game.isStarted) return Game.log(channel, 'This game is already started');
    if (!user) throw new Error('Invalid user');
    if (!game.players.some(u => u.id === (typeof user !== 'string' ? user.id : user))) throw new Error('This user is not in this game');

    const lenBef = game.players.length;
    game.players.splice(game.players.findIndex(u => u.id === (typeof user !== 'string' ? user.id : user)), 1);

    Game.log(channel, `${(typeof user !== 'string' ? user : channel.guild.member(user)).toString()} has left game \`${game.code}\``);
    if (game.players.length < defMinPlayer && lenBef >= defMinPlayer && typeof game.startTimer !== 'undefined') game.stopCountDown();
    return game;
  }

  /**
   * Start automatic start countdown
   */
  startCountDown () {
    this.startTimer = setTimeout(() => this.emit('start', this.code), defStartTime);
    Game.log(this.channel, `Game will start in ${defStartTime / 1000} seconds`);
  }

  /**
   * Stop automatic start countdown
   */
  stopCountDown () {
    clearTimeout(this.startTimer);
    Game.log(this.channel, 'Timer has been stopped');
  }

  /**
   * Start the game
   */
  async start () {
    if (this.players.length < defStartTime) {
      this.stopCountDown();
      return Game.log(this.channel, 'Not enough player to start. Waiting for user to join...', true, 0);
    }
    this.isStarted = true;

    const msg = await Game.log(this.channel, true, 'Ready?!', colError);
    await sleep(2500);
    Game.log(msg, null, true, 'Get Set!', colSet);
    await sleep(2500);
    Game.log(msg, `Type this text:\n\`\`\`${this.text}\`\`\``, true, 'Go!', colSuccess);

    this.finished = [];
    this.collector = this.channel.createMessageCollector(m => this.players.some(u => u.id === m.author.id) && m.author.typingDurationIn(this.channel) >= this.ms_min_done, {
      idle: defIdle + this.ms_min_done
    });
    this.start_time = Date.now();

    this.collector.on('collect', async m => {
      m.delete();
      if (this.finished.some(u => u.id === m.author.id)) return Game.log(this.channel, 'You already finish this sentence!', false, 2, null, defDeleteTime);
      if (!this.sanitize(m)) return Game.log(this.channel, `Hey ${m.member.toString()}, it seems you didn't type this properly! Please try again.`, false, 2, null, defDeleteTime);

      const finish = m.createdTimestamp;
      const errors = Game.compare(this.text, m.content);
      const acc = (this.text_len - errors) / this.text_len * 100;
      const duration = finish - this.start_time;
      const wpm = this.text_len / duration * 60 / 5;

      const prep = {
        username: m.author.username,
        id: m.author.id,
        errors,
        acc,
        wpm,
        duration,
        timestamp: finish
      };
      this.finished.push(prep);

      Game.log(m.author, `Congrats! You finished the race and took the **#${this.finished.findIndex(u => u.id === m.author.id) + 1}** spot!\n\n\`\`\`Stats:\n> Errors: ${prep.errors}\n> Accuracy: ${prep.acc.toFixed(2)}%\n> WPM: ${Math.round(wpm)}\n> Time taken: ${duration / 1000} seconds\`\`\``, true);
      if (this.finished.length >= this.players.length) this.collector.stop('done');
    });

    this.collector.on('end', async () => {
      msg.delete();

      this.finish();
    });
  }

  finish () {
    this.isFinished = true;
    this.finished.sort((a, b) => a.wpm - b.wpm);

    this.top3 = this.finished.slice(0, 3);
    let prep = '';
    this.top3.forEach((t, i) => {
      prep += `#${pad(i + 1)}. ${t.username} with ${Math.round(t.wpm)} WPM\n`;
    });

    this.emit('end', this.code);
    Game.log(this.channel, `**Congratulations to all players!**\n\nHere is **Top 3** players in this game:\n\`\`\`${prep}\`\`\``, true, 2, null, null, 'This game is already ended, please make or join another game to play again!');

    const noFin = this.players.filter(u => !this.finished.some(f => f.id === u.id));
    noFin.forEach(u => {
      Game.log(u.user, 'You didn\'t finish the text on time', true);
    });
  }

  /**
   * Compare 2 strings
   * @param {String} a
   * @param {String} b
   */
  static compare (a, b) {
    let errors = 0;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) errors++;
    }
    return errors;
  }

  announceCreated () {
    Game.log(this.channel, `Created a new game!\n\n**Code:** ${this.code}`, true, 1);
  }

  /**
   * Log a message to a game channel
   * @param {TextChannel|Message|User|GuildMember} channel
   * @param {*} message
   * @param {?Boolean} embed
   * @param {?Number} type
   * @param {?ColorResolvable} color
   * @param {*} footer
   */
  static async log (t = this.channel, message, embed = false, type = 2, color = 'RANDOM', del, footer) {
    if (!(t instanceof TextChannel) && !(t instanceof Message) && !(t instanceof User) && !(t instanceof GuildMember)) Array.prototype.unshift.call(arguments, this.channel);
    if (message.length === 0) return;
    if (!embed) {
      if (!(t instanceof TextChannel) && t instanceof Message) {
        if (!del) return t.edit(message);
        return t.delete({ timeout: del });
      }
      if (!del) return await t.send(message);
      return t.send(message).then(m => m.delete({ timeout: del }));
    }

    const mbed = new MessageEmbed();
    switch (type) {
      case 0:
        mbed.setTitle('Error')
          .setColor(colError)
          .setDescription(message)
          .setFooter(footer)
          .setTimestamp();
        break;

      case 1:
        mbed.setTitle('Success')
          .setColor(colSuccess)
          .setDescription(message)
          .setFooter(footer)
          .setTimestamp();
        break;

      case 2:
        mbed.setTitle('Info')
          .setColor(colInfo)
          .setDescription(message)
          .setFooter(footer)
          .setTimestamp();
        break;

      default:
        mbed.setTitle(type)
          .setColor(color)
          .setDescription(message)
          .setFooter(footer)
          .setTimestamp();
        break;
    }

    if (!message) mbed.description = undefined;
    if (!footer) mbed.footer = undefined;
    if (!(t instanceof TextChannel) && t instanceof Message) {
      if (!del) return t.edit(mbed);
      return t.delete({ timeout: del });
    }
    if (!del) return await t.send(mbed);
    return t.send(message).then(m => m.delete({ timeout: del }));
  }

  /**
   * Check user legitimacy
   * @param {Message} m
   */
  sanitize (m) {
    return (m.author.typingDurationIn(this.channel) >= this.ms_min_done && Date.now() - this.start_time > defCP);
  }
};
