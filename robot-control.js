async function askGemmaDecision() {
  if (robot.isThinking || !robot.controlEnabled) return;
  robot.isThinking = true;

  // 型の不一致を防ぐためのクレンジング
  const payload = {
    // 必ず数値（float）として送る
    front_distance: Number(window.state?.lastObstacleScore || 100),
    speed: Number(robot.vLin || 0),
    // 必ず配列（List[str]）として送る。nullやundefinedは422の原因
    ml_results: window.state?.mlLastClass ? [String(window.state.mlLastClass)] : []
  };

  try {
    const res = await fetch("/decide", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (res.status === 422) {
      // 422が出た場合、どこがエラーか詳細をコンソールに出す
      const detail = await res.json();
      console.error("422詳細内容:", JSON.stringify(detail, null, 2));
      return;
    }

    const json = await res.json();
    // ...以下、応答処理
  } catch (e) {
    console.error("通信失敗:", e);
  } finally {
    robot.isThinking = false;
  }
}
