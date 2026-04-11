const trashRenderer = {
  color: "#fb923c",
  size: 8,
  draw(ctx, size) {
    ctx.beginPath();
    ctx.moveTo(-size * 0.9, -size * 0.2);
    ctx.lineTo(size * 0.7, -size * 0.7);
    ctx.lineTo(size, size * 0.3);
    ctx.lineTo(-size * 0.4, size);
    ctx.closePath();
    ctx.fill();
  },
};

export default trashRenderer;
