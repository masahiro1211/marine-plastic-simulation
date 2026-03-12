import React, { useEffect, useRef } from "react";

const COLORS = {
  fish: "#4fc3f7",
  predator: "#ef5350",
  plastic: "#a1887f",
};

const SIZES = {
  fish: 5,
  predator: 9,
  plastic: 4,
};

export default function Canvas({ agents, width = 800, height = 600 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    // Background — ocean gradient
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, "#0d47a1");
    grad.addColorStop(1, "#1a237e");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    for (const agent of agents) {
      ctx.save();
      ctx.translate(agent.x, agent.y);
      ctx.rotate(agent.angle);

      const color = COLORS[agent.agent_type] || "#fff";
      const size = SIZES[agent.agent_type] || 4;

      if (agent.agent_type === "plastic") {
        // Draw plastic as a small square
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.7;
        ctx.fillRect(-size / 2, -size / 2, size, size);
      } else {
        // Draw fish / predator as a triangle pointing in the direction of travel
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(size, 0);
        ctx.lineTo(-size, -size * 0.6);
        ctx.lineTo(-size, size * 0.6);
        ctx.closePath();
        ctx.fill();
      }

      ctx.restore();
    }
  }, [agents, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ border: "2px solid #1565c0", borderRadius: 8 }}
    />
  );
}
