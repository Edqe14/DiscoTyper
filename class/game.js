const crypto = require('crypto');
const fs = require('fs');
const { TextChannel, MessageEmbed, Message, User, GuildMember, MessageAttachment } = require('discord.js');
const sleep = require('../utils/sleep.js');
const verify = require('../utils/verify.js');
const GameHistory = require('../models/gameHistory.js');
const { EventEmitter } = require('events');
const { dbs: { gameHistory, userProfile } } = require('../handlers/message.js');
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
    defIdle,
    defMinPlayer,
    defStartTime,
    defDeleteTime,
    defPlayerLimit,
    defStartTimeReminder,
    defMinAfterStart,
    LEVEL_UP_EMOJIS
  }
} = require('../config.json');
const generateImage = require('../utils/generateImage.js');

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
    this.ops = ops ?? {};
    this.isStarted = false;
    this.isFinished = false;
    this.startTimer = undefined;
    this.timeout = setTimeout(() => {
      if (!this.isStarted && !this.isFinished) this.emit('game:timeout', this.code);
    }, 5 * 60 * 1000);

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
  addPlayer (user) {
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
    clearTimeout(this.timeout);
    this.isStarted = true;
    this.emit('game:start', this.code);

    let msg = await Game.log(this.code, this.channel, 'Hands on your keyboard!', true, 'Ready?!', colError);
    await sleep(1000);
    await Game.log(this.code, msg, 'F - J', true, 'Get Set!', colSet);
    await sleep(800);
    // await Game.log(this.code, msg, `Type this text:\n\`\`\`${this.text}\`\`\``, true, 'Go!', colSuccess);
    await msg.delete();
    msg = await Game.log(this.code, this.channel, null, true, 'Go!', colSuccess, null, null, await generateImage(this.text));

    this.finished = [];
    this.collector = this.channel.createMessageCollector(m => this.players.some(u => u.id === m.author.id) && !this.finished.some(u => u.id === m.author.id), {
      time: defIdle + this.ms_max_done
    });
    this.start_time = Date.now();
    this.failPoints = new Map();

    this.collector.on('collect', async m => {
      if (this.finished.some(u => u.id === m.author.id)) return Game.log(this.code, this.channel, 'You already finish this sentence!', false, 2, null, defDeleteTime);
      const finish = m.createdTimestamp;
      const duration = finish - (this.failPoints.has(m.author.id) ? this.failPoints.get(m.author.id) : this.start_time); // OK when immidietly start
      const wpm = this.text_len / (duration / 1000) * 60 / 4.7; // OK
      if (duration < defMinAfterStart || m.content.length < this.text.length / 8) {
        m.delete();
        return m.reply('I think you typed that by accident. You can try again 🙂');
      }

      const { errors, str } = (Game.compare(this.text, m.content) || {});
      if (!errors && !str) return Game.log(this.code, this.channel, 'Oops, something went wrong! Please try again.');
      await m.react('✅');
      const acc = (this.text_len - errors) / this.text_len * 100;

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

      Game.log(this.code, m.author, `Congrats! You finished the race and took the **#${this.finished.findIndex(u => u.id === m.author.id) + 1}** spot!\n\n\`\`\`Stats:\n> Errors: ${prep.errors}\n> Accuracy: ${prep.acc.toFixed(2)}%\n> WPM: ${wpm.toFixed(2)}\n> Time taken: ${duration / 1000} seconds\`\`\`\n${str}`, true);

      if (this.finished.length >= this.players.length) this.collector.stop('done');

      if (this.players.length <= 1) return;
      const u = await userProfile.findOne({ id: m.author.id });
      if (!u) return;

      await sleep(Math.random() * 500);
      userProfile.update({ id: m.author.id }, {
        $inc: {
          'stats.playCount': 1,
          'stats.rawAccuracy': acc,
          'stats.totalWPM': wpm
        },
        $set: {
          'stats.accuracy': (u.stats.rawAccuracy + acc) / (u.stats.playCount + 1),
          'stats.wpm': (u.stats.totalWPM + wpm) / (u.stats.playCount + 1)
        }
      });
    });

    this.collector.on('end', async () => {
      this.finish(msg);
    });
  }

  /**
   * Finish the game
   * @param {Message} msg
   */
  async finish (msg) {
    this.isFinished = true;

    const solo = this.players.length <= 1;
    if (!solo) {
      this.finished.forEach(async (f) => {
        await sleep(Math.random() * 1000);
        const u = await userProfile.findOne({ id: f.id });
        if (u) {
          const xp = Math.random() * 80 + 20;

          let level = u.xp.level;
          let next = u.xp.next;
          let uxp = u.xp.current + xp;
          if (uxp >= next) {
            uxp = uxp - next;
            level++;
            next += Math.floor(23 / 100 * next);
            this.channel.guild.member(f.id).send(`${LEVEL_UP_EMOJIS[Math.floor(Math.random() * LEVEL_UP_EMOJIS.length)]} **Level Up!** You're now level \`${level}\``);
          }

          const $set = {
            'stats.WLR': (u.stats.winCount - (Math.abs(u.stats.playCount - u.stats.winCount))) / u.stats.playCount,
            'xp.level': level,
            'xp.current': uxp,
            'xp.next': next
          };

          await userProfile.findOneAndUpdate({ id: f.id }, {
            $set
          });
        }
      });
    }

    this.top3 = this.finished.slice(0, 3);
    let prep = '';
    for (let i = 0; i < this.top3.length; i++) {
      const t = this.top3[i];

      if (!solo) {
        const u = await userProfile.findOne({ id: t.id });
        if (u) {
          await userProfile.findOneAndUpdate({ id: t.id }, {
            $set: {
              'stats.WLR': ((u.stats.winCount + 1) - (Math.abs(u.stats.playCount - u.stats.winCount))) / u.stats.playCount
            },
            $inc: {
              'stats.winCount': 1
            }
          });
        }
      }

      let header = `> %emoji **${t.username}** with ${t.wpm.toFixed(2)} WPM\n`;
      switch (i) {
        case 0: {
          header = header.replace(/%emoji/gi, '🥇');
          if (solo) break;
          userProfile.findOneAndUpdate({ id: t.id }, {
            $inc: {
              'stats.winSpots.first': 1
            }
          });
          break;
        }

        case 1: {
          header = header.replace(/%emoji/gi, '🥈');
          if (solo) break;
          userProfile.findOneAndUpdate({ id: t.id }, {
            $inc: {
              'stats.winSpots.second': 1
            }
          });
          break;
        }

        case 2: {
          header = header.replace(/%emoji/gi, '🥉');
          if (solo) break;
          userProfile.findOneAndUpdate({ id: t.id }, {
            $inc: {
              'stats.winSpots.third': 1
            }
          });
          break;
        }

        default: {
          header = header.replace(/%emoji/gi, '🏅');
          break;
        }
      }
      prep += header;
    }

    const noFin = this.players.filter(u => !this.finished.some(f => f.id === u.id));
    noFin.forEach(u => {
      Game.log(this.code, u.user, 'You didn\'t finish the text on time', true);
    });

    await msg.delete();
    if (this.top3.length === 0 || this.finished.length <= 0) {
      Game.clean(this);
      return Game.log(this.code, this.channel, 'Nobody typed the text on time...', true, 2, null, null, 'This game is ended, please make or join another game to play again!');
    }
    this.emit('game:end', this.code);
    Game.clean(this);
    Game.log(this.code, this.channel, `**Congratulations to all players!**\n\nHere is **Top 3** players in this game:\n${prep}`, true, 2, null, null, 'This game is ended, please make or join another game to play again!');

    const timestamps = this.finished.map((p) => p.timestamp).sort();
    const durations = this.finished.map((p) => p.duration).sort();
    gameHistory.insert(new GameHistory(
      this,
      this.finished.map((p) => p.wpm).sort((a, b) => b - a)[0],
      timestamps[0],
      timestamps[timestamps.length - 1],
      durations[0],
      durations[durations.length - 1],
      this.finished.map((p) => p.acc).sort()[0]
    ));
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
    let str = '```css\n';
    let errors = 0;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) {
        str += `[${a[i]}]`;
        errors++;
        continue;
      }
      str += a[i];
    }
    str += '```';
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
   * @param {Buffer} image
   */
  static async log (code, t, message, embed = false, type = 2, color = 'RANDOM', del, footer, image) {
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
    if (image && image instanceof Buffer) {
      const attachment = new MessageAttachment(image, 'image.webp');
      mbed.attachFiles([attachment]).setImage('attachment://image.webp');
    }
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
  sanitize (_, wpm, duration) {
    const estDur = this.text_len / (wpm * 5 / 60) * 1000; // OK
    // console.log(wpm, this.text_len, estDur, this.ms_min_done, duration)
    return {
      durationStartFinish: duration,
      estimatedDuration: estDur,
      minRangeTyping: Math.abs(duration - estDur)
    };
  }
};
