const fishRenderer = {
  color: "#4fc3f7",
  size: 5,
  draw(ctx, size) {
    ctx.beginPath();
    ctx.moveTo(size, 0);
    ctx.lineTo(-size, -size * 0.6);
    ctx.lineTo(-size, size * 0.6);
    ctx.closePath();
    ctx.fill();
  },
};

export default fishRenderer;
