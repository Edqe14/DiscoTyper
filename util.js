module.exports = {
  /**
     * Calculate and split text to multiple chunks that fits to the maximum width provided
     * @param {CanvasRenderingContext2D} ctx
     * @param {String} text
     * @param {Number} maxWidth
     *
     * @returns Array<String>
     */
  wrapText (ctx, text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const width = ctx.measureText(currentLine + ' ' + word).width;
      if (width < maxWidth) {
        currentLine += ' ' + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }

    lines.push(currentLine);
    return lines;
  }
};
