async function askGemmaDecision() {
  if (robot.isThinking || !robot.controlEnabled) return;
  robot.isThinking = true;

  const payload = {
    front_distance: Number(window.state?.lastObstacleScore || 100),
    speed: Number(robot.vLin || 0),
    ml_results: []
  };

  try {
    const res = await fetch("https://kgninja-functiongemmabotdemo-docker.hf.space/decide", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const json = await res.json();
    const rawText = json.data[0];
    console.log("🤖 Raw AI Text:", rawText); // デバッグ用

    // JSON部分を探す
    const match = rawText.match(/\{.*\}/s);
    if (match) {
      const data = JSON.parse(match[0]);
      console.log("✅ Decided Action:", data.action);

      if (data.action === "move_forward") { 
        robot.vLin = 0.6; robot.vAng = 0; 
      } else if (data.action.includes("turn") || data.action === "stop") { 
        robot.vLin = 0.1; robot.vAng = 1.0; 
      }
    } else {
      console.warn("⚠️ JSON not found in response, retrying...");
    }
  } catch (e) {
    console.error("Gemma Error:", e);
  } finally {
    robot.isThinking = false;
  }
}
