# 3Dcap Robot Vision Add-ons

## 概要
エッジ検出 + COCO-SSDベースの障害物検知に、以下を追加しました。
- 音声挨拶: Web Speech API で人・動物検出時に自動挨拶（HでON/OFF、Tでテスト）
- ロボット制御: 差動駆動の抽象レイヤーとCanvasシミュレーター（RでON/OFF、OでAUTO/MAN、WASD/矢印で手動、Xで即停止）
- Gemini Nano（Prompt API）初期化（Gで起動）

## ファイル
- `index.html` : 入口。新規JSを読み込み、UI/ML設定を更新。
- `speech-greeting.js` : 挨拶機能。10秒履歴＋3秒クールダウンで重複抑制。
- `robot-control.js` : 制御レイヤーと右下400x400pxのシミュレーター。AUTOは障害物率に応じた減速・停止。
- `gemini-nano.js` : Prompt API(Gemini Nano)初期化ラッパー。
- `semantic-map.js` : 既存のセマンティックマップ（無変更）。

## 使い方
1. ブラウザで `index.html` を開く（HTTPS/CDNにアクセスできる環境）。
2. 必要なショートカットを押下:
   - `M`: COCO-SSDロード/ON（人・動物検出で挨拶発火）
   - `H`: 音声ON/OFF、`T`: 挨拶テスト
   - `R`: ロボット制御ON/OFF、`O`: AUTO/MAN、`WASD/↑↓←→`: 手動走行、`X`: 緊急停止
   - `G`: Gemini Nano初期化
3. UI表示をONにするには `U` を押す（デフォルト非表示）。状態欄に speech/robot が出ます。

## AUTO走行ロジック
- セマンティックマップの障害物率 ≥30%: 停止
- 15〜30%: 減速＋ステアリング回避
- <15%: 前進（hazard.bestSteerを弱めに反映）

## 実機連携メモ
- `robot-control.js` の `sendRobotCommand()` で抽象化。ここに WebSocket/シリアル等を書き足せば実機へ送信可能。
- 挨拶は `window.speak()` に文言を渡せば任意発話できます。

## 確認チェック
- COCO-SSD有効時に person/dog/cat/bird/horse/cow/elephant/bear を検出すると挨拶する。
- `R` でシミュレーターが右下に表示され、`WASD` で移動する。
- UIの speech/robot 表示が状態に追従する。
