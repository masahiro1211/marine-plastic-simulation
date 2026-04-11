# Marine Cleanup Robot Simulation

---

## 1. Project Goal

- Build a game-like simulation for ocean cleanup robots
- Show the tradeoff between trash collection and ecosystem safety
- Keep the structure easy for multiple team members to extend

---

## 2. Core Actors

- Scout robots search and share trash positions
- Collector robots move to targets and collect trash
- Marine life avoids robots and accumulates stress
- Trash objects drift or remain in the field

---

## 3. System Structure

- FastAPI backend for config, control, and streaming
- Simulation engine for turn-based updates
- React frontend for controls, canvas, and stats
- Shared agent schema for all robot types

---

## 4. Extensibility Rules

- Common I/O for every robot
- Role-specific logic isolated by components
- Renderer registry for visual changes
- Future DB support through event-based records

---

## 5. What The Team Can Change

- Visual design and colors
- Robot motion and parameters
- Sensors, battery, and communication logic
- Additional robot-specific components

---

## 6. Success Criteria

- Clear game loop
- Stable API and WebSocket contract
- Easy onboarding for new contributors
- Presentation-ready explanation materials
