const axios = require('axios');
const cheerio = require('cheerio');

module.exports = class TypeRacer {
  static async fetchDOM (url) {
    return await axios.get(url);
  }

  static async extractText (url) {
    try {
      const dom = (await this.fetchDOM(url)).data;
      const $ = cheerio.load(dom);

      const query = $('table tbody tr td a[href*="/text?"]');
      const texts = [];
      query.each((_, e) => {
        let str = $(e).html();
        if (!str) return;
        str = this.format(str);
        if (str.length > 1800) return;
        texts.push(str);
      });

      return {
        length: query.length,
        texts
      };
    } catch (e) {
      if (e) throw e;
    }
  }

  static format (txt) {
    'use strict';
    txt = txt.replace(/\n/gi, '');
    txt = txt.replace(/<br>/gi, '\n');
    txt = txt.replace(/<i>|<\/i>/gi, '*');
    txt = txt.replace(/&amp; /gi, '');
    txt = txt.replace(/&apos;/gi, '\'');
    txt = txt.replace(/&quot;/gi, '"');

    return txt;
  }
};
