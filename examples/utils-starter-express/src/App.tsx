import React from "react";

export default function App() {  
  const [times, setTimes] = React.useState(0);
  return (
    <div>
      <h1>Utils Starter Express.js x {times}</h1>
      <button onClick={() => setTimes((times) => times + 1)}>ADD ONE</button>
    </div>
  );
}
