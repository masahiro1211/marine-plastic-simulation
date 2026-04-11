const scoutRenderer = {
  color: "#38bdf8",
  size: 10,
  draw(ctx, size) {
    ctx.beginPath();
    ctx.moveTo(size, 0);
    ctx.lineTo(-size * 0.7, -size * 0.55);
    ctx.lineTo(-size * 0.35, 0);
    ctx.lineTo(-size * 0.7, size * 0.55);
    ctx.closePath();
    ctx.fill();
  },
};

export default scoutRenderer;
