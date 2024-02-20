import React from "react";

export default function App() {
  const [times, setTimes] = React.useState(0);

  return (
    <div>
      <h1>Frames.js Express Starter x {times}</h1>
      <button onClick={() => setTimes((times) => times + 1)}>PLUS ONE</button>
    </div>
  );
}
