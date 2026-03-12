const plasticRenderer = {
  color: "#a1887f",
  size: 4,
  alpha: 0.7,
  draw(ctx, size) {
    ctx.globalAlpha = this.alpha;
    ctx.fillRect(-size / 2, -size / 2, size, size);
  },
};

export default plasticRenderer;
