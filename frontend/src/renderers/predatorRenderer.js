const predatorRenderer = {
  color: "#ef5350",
  size: 9,
  draw(ctx, size) {
    ctx.beginPath();
    ctx.moveTo(size, 0);
    ctx.lineTo(-size, -size * 0.6);
    ctx.lineTo(-size, size * 0.6);
    ctx.closePath();
    ctx.fill();
  },
};

export default predatorRenderer;
