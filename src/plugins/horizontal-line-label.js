const defaultOptions = {
  color: 'blue',
  text: '',
  font: '12px sans-serif',
  // Gap in pixels between the line and the bottom of the text.
  offset: 4,
  padding: 4,
  backgroundColor: 'rgba(5, 5, 5, 0.6)',
};

class HorizLineLabelPaneRenderer {
  constructor(x, y, options) {
    this._x = x;
    this._y = y;
    this._options = options;
  }

  draw(target) {
    target.useMediaCoordinateSpace(scope => {
      if (this._x === null || this._y === null || !this._options.text) return;
      const ctx = scope.context;
      const { text, font, padding, offset } = this._options;

      ctx.font = font;
      const metrics = ctx.measureText(text);
      const width = metrics.width;
      const height =
        metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;

      // Right-aligned so the label ends at the line's right endpoint, and
      // clamped so it stays inside the pane at either edge.
      const right = Math.min(
        Math.max(this._x, width + padding * 2),
        scope.mediaSize.width
      );
      const left = right - width - padding * 2;
      const bottom = this._y - offset;
      const top = bottom - height - padding * 2;

      ctx.fillStyle = this._options.backgroundColor;
      ctx.fillRect(left, top, width + padding * 2, height + padding * 2);

      ctx.fillStyle = this._options.color;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText(text, left + padding, bottom - padding);
    });
  }
}

class HorizLineLabelPaneView {
  constructor(source, options) {
    this._source = source;
    this._options = options;
    this._x = null;
    this._y = null;
  }

  update() {
    this._x = this._source._chart.timeScale().timeToCoordinate(this._source._time);
    this._y = this._source._series.priceToCoordinate(this._source._price);
  }

  renderer() {
    return new HorizLineLabelPaneRenderer(this._x, this._y, this._options);
  }
}

/**
 * Draws a text annotation just above a horizontal line, anchored to the
 * right-hand end of the line (`time` is the line's end index).
 */
export class HorizLineLabel {
  constructor(chart, series, time, price, options) {
    this._chart = chart;
    this._series = series;
    this._time = time;
    this._price = price;
    this._paneViews = [
      new HorizLineLabelPaneView(this, { ...defaultOptions, ...options }),
    ];
  }

  updateAllViews() {
    this._paneViews.forEach(pw => pw.update());
  }

  paneViews() {
    return this._paneViews;
  }
}
