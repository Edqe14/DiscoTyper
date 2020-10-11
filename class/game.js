const crypto = require('crypto');
const fs = require('fs');
const { TextChannel, MessageEmbed, Message, User, GuildMember } = require('discord.js');
const sleep = require('../utils/sleep.js');
const pad = require('../utils/pad.js');
const verify = require('../utils/verify.js');
const GameHistory = require('../models/gameHistory.js');
const { EventEmitter } = require('events');
const {
  paths: {
    text: path
  }, var: {
    colError,
    colSuccess,
    colInfo,
    colSet,
    defCPS,
    defMinCPS,
    defMaxWPM,
    defIdle,
    defMinFinishTime,
    defMinPlayer,
    defStartTime,
    defDeleteTime,
    defPlayerLimit,
    defStartTimeReminder,
    defEstimateAverage
  }
} = require('../config.json');

if (!fs.existsSync(`${__dirname.replace(/\\/gi, '/')}/../${path}`)) throw new Error('Invalid text path');
const { texts, length } = require(`${__dirname.replace(/\\/gi, '/')}/../${path}`);

module.exports = class Game extends EventEmitter {
  /**
   * Create new game
   * @param {?String} code
   * @param {?Array<Object>} players
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
    this.guild = this.channel.guild.id;
    this.ops = Object.assign({}, ops);
    this.isStarted = false;
    this.isFinished = false;
    this.startTimer = undefined;

    this.text = texts[Math.floor(Math.random() * length)];
    this.text_len = this.text.length;
    this.ms_min_done = this.text_len / defCPS * 1000;
    this.ms_max_done = this.text_len / defMinCPS * 1000;

    Game.log(this.code, this.channel, `Created a new game!\n\n**Code:** ${this.code}`, true, 1, null, null, `Type "${this.ops.prefix}join ${this.code}" to join the game!`);
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
   * @param {GuildMember|User} user
   */
  addPlayer (user, ws) {
    if (this.isStarted) return Game.log(this.code, this.channel, 'This game is already started', true, 0);
    if (!user) throw new Error('Invalid user');

    if (this.players.length >= this.limit) return Game.log(this.code, this.channel, 'This game is already full', true, 0);
    this.players.push({
      id: user.id,
      user,
      timestamp: Date.now()
    });

    Game.log(this.code, this.channel, `${user.toString()} has joined game`);
    this.emit('player:join', user);
    if (this.players.length >= defMinPlayer && typeof this.startTimer === 'undefined') this.startCountDown();
  }

  /**
   * Remove a player (user id) to the game
   * @param {GuildMember|User} user
   */
  removePlayer (user) {
    if (this.started) return Game.log(this.code, this.channel, 'This game is already started');
    if (!user) throw new Error('Invalid user');
    if (!this.players.some(u => u.id === (typeof user !== 'string' ? user.id : user))) throw new Error('This user is not in this game');

    const lenBef = this.players.length;
    this.players.splice(this.players.findIndex(u => u.id === user.id), 1);

    Game.log(this.code, this.channel, `${user.toString()} has left game`);
    this.emit('player:leave', user);
    if (this.players.length < defMinPlayer && lenBef >= defMinPlayer && typeof this.startTimer !== 'undefined') this.stopCountDown(true);
  }

  /**
   * Start automatic start countdown
   */
  async startCountDown () {
    const m = await Game.log(this.code, this.channel, `Game will start in ${defStartTime / 1000} seconds`, false, 2);
    this.startTimer = setTimeout(() => {
      this.startTimer = setTimeout(() => this.start(), defStartTimeReminder - 3000);
      Game.log(this.code, m, `Game will start in ${defStartTimeReminder / 1000} seconds`, false, 2, null, defStartTimeReminder - 3500);
    }, defStartTime - defStartTimeReminder);
  }

  /**
   * Stop automatic start countdown
   * @param {?Boolean} [auto=false]
   */
  stopCountDown (auto = false) {
    clearTimeout(this.startTimer);
    this.startTimer = null;
    if (auto) Game.log(this.code, this.channel, 'Timer has been stopped');
  }

  /**
   * Start the game
   * @param {?Boolean} [force=false]
   */
  async start (force = false) {
    this.stopCountDown();
    if (this.isStarted) throw new Error('This game is already started');
    if (this.players.length < defMinPlayer && !force) return Game.log(this.code, this.channel, 'Not enough player to start. Waiting for user to join...', true, 0);
    if (this.players.length === 1 && force) {
      const m = await Game.log(this.code, this.channel, 'There is only one player in this game, do you want to proceed?');
      const ver = await verify(this.owner, m);
      m.delete();
      if (!ver) return Game.log(this.code, this.channel, 'Cancelled');
    }
    this.isStarted = true;
    this.emit('game:start', this.code);

    const msg = await Game.log(this.code, this.channel, 'Hands on your keyboard!', true, 'Ready?!', colError);
    await sleep(1000);
    await Game.log(this.code, msg, 'F - J', true, 'Get Set!', colSet);
    await sleep(1000);
    await Game.log(this.code, msg, `Type this text:\n\`\`\`${this.text}\`\`\``, true, 'Go!', colSuccess);

    this.finished = [];
    this.collector = this.channel.createMessageCollector(m => this.players.some(u => u.id === m.author.id) && !this.finished.some(u => u.id === m.author.id), {
      time: defIdle + this.ms_max_done
    });
    this.start_time = Date.now();

    this.collector.on('collect', async m => {
      if (this.finished.some(u => u.id === m.author.id)) return Game.log(this.code, this.channel, 'You already finish this sentence!', false, 2, null, defDeleteTime);
      const finish = m.createdTimestamp;
      const duration = finish - this.start_time; // OK when immidietly start
      const wpm = this.text_len / (duration / 1000) * 60 / 5; // OK
      const legit = this.sanitize(m, wpm, duration);
      if (!legit) {
        await m.delete();
        return Game.log(this.code, this.channel, `Hey ${m.member.toString()}, it seems you didn't type it legitimately! Please try again.`, false, 2, null, defDeleteTime);
      }

      await m.react('✅');
      const { errors, str } = Game.compare(this.text, m.content);
      const acc = (this.text_len - errors) / this.text_len * 100;

      const prep = {
        username: m.author.username,
        id: m.author.id,
        errors,
        acc,
        wpm,
        duration,
        timestamp: finish,
        antiCheatData: legit
      };
      this.finished.push(prep);

      Game.log(this.code, m.author, `Congrats! You finished the race and took the **#${this.finished.findIndex(u => u.id === m.author.id) + 1}** spot!\n\n\`\`\`Stats:\n> Errors: ${prep.errors}\n> Accuracy: ${prep.acc.toFixed(2)}%\n> WPM: ${wpm.toFixed(2)}\n> Time taken: ${duration / 1000} seconds\`\`\`\n${str}`, true);
      if (this.finished.length >= this.players.length) this.collector.stop('done');
    });

    this.collector.on('end', async () => {
      this.finish(msg);
    });
  }

  /**
   * Finish the game
   * @param {Message} msg
   */
  finish (msg) {
    this.isFinished = true;
    this.emit('game.end', this.code);
    Game.clean(this);

    this.top3 = this.finished.slice(0, 3);
    let prep = '';
    this.top3.forEach((t, i) => {
      prep += `#${pad(i + 1)}. ${t.username} with ${t.wpm.toFixed(2)} WPM\n`;
    });

    const noFin = this.players.filter(u => !this.finished.some(f => f.id === u.id));
    noFin.forEach(u => {
      Game.log(this.code, u.user, 'You didn\'t finish the text on time', true);
    });

    if (this.top3.length === 0 || this.finished.length <= 0) return Game.log(this.code, (msg || this.channel), 'Nobody typed the text on time...', true, 2, null, null, 'This game is ended, please make or join another game to play again!');
    Game.log(this.code, (msg || this.channel), `**Congratulations to all players!**\n\nHere is **Top 3** players in this game:\n\`\`\`${prep}\`\`\``, true, 2, null, null, 'This game is ended, please make or join another game to play again!');

    this.ops.gameHistory.insert(new GameHistory(this, defMaxWPM, defMinFinishTime, defEstimateAverage));
  }
  
  /**
   * Clean listeners
   * @param {Object<this>} thisArgs
   */
  static clean (thisArgs) {
    thisArgs.collector.removeAllListeners();
    thisArgs.removeAllListeners();
  }

  /**
   * Compare 2 strings
   * @param {String} a
   * @param {String} b
   */
  static compare (a, b) {
    let str = '```css\n'
    let errors = 0;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) {
        str += `[${a[i]}]`;
        errors++;
        continue;
      }
      str += a[i];
    }
    str += '```'
    return {
      errors,
      str
    };
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
  static async log (code, t, message, embed = false, type = 2, color = 'RANDOM', del, footer) {
    if (!(t instanceof TextChannel) && !(t instanceof Message) && !(t instanceof User) && !(t instanceof GuildMember)) Array.prototype.unshift.call(arguments, this.channel);
    if (!embed) {
      message = (`\`[${code}]\` ${message}`).trim();
      if (!(t instanceof TextChannel) && t instanceof Message) {
        if (!del) return t.edit(message);
        return t.delete({ timeout: del });
      }
      if (!del) return await t.send(message);
      return t.send(message).then(m => m.delete({ timeout: del }));
    }

    footer = (`[${code}] ${footer || ''}`).trim();
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
   * @param {Number} ms
   * @param {Number} wpm
   */
  sanitize (m, wpm, duration) {
    const estDur = this.text_len / (wpm * 5 / 60) * 1000; // OK
    // console.log(wpm, this.text_len, estDur, this.ms_min_done, duration)
    return (wpm < defMaxWPM && duration >= this.ms_min_done && duration > defMinFinishTime && Math.abs(duration - estDur) < defEstimateAverage) ? {
      durationStartFinish: duration,
      estimatedDuration: estDur,
      minRangeTyping: Math.abs(duration - estDur)
    } : false;
  }
};
