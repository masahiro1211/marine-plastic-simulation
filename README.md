# Marine Plastic Simulation

海洋環境におけるマルチエージェントシミュレーションアプリです。魚、捕食者、プラスチックごみの相互作用をリアルタイムで可視化します。

## 技術スタック

| レイヤー | 技術 |
|----------|------|
| バックエンド | Python 3.12 / FastAPI / WebSocket |
| フロントエンド | React 19 / Canvas API |
| インフラ | Docker Compose |

## 環境構築

### 前提条件

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) がインストール済みであること
- Git がインストール済みであること

### セットアップ手順

```bash
# 1. リポジトリをクローン
git clone <repository-url>
cd marine-plastic-simulation

# 2. Docker で起動（初回はビルドが走るため数分かかります）
docker compose up --build
```

起動後、以下にアクセスできます:

| サービス | URL |
|----------|-----|
| フロントエンド | http://localhost:3000 |
| バックエンドAPI | http://localhost:8000 |
| APIドキュメント (Swagger) | http://localhost:8000/docs |

### Docker を使わずにローカルで起動する場合

**バックエンド:**

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**フロントエンド:**

```bash
cd frontend
npm install
npm start
```

### 環境変数

フロントエンド (`frontend/.env`):

| 変数名 | デフォルト値 | 説明 |
|--------|-------------|------|
| `REACT_APP_WS_URL` | `ws://localhost:8000/ws/simulation` | WebSocket 接続先 |
| `REACT_APP_API_URL` | `http://localhost:8000` | REST API 接続先 |

## 使い方

1. ブラウザで `http://localhost:3000` を開く
2. 左の **Controls** パネルでパラメータを調整
3. **Start** ボタンでシミュレーション開始
4. **Reset** で現在のパラメータを反映して再初期化
5. **Stop** で停止

## プロジェクト構成

```
marine-plastic-simulation/
├── docker-compose.yml
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py                 # FastAPI エントリ（ルーター登録のみ）
│       ├── dependencies.py         # エンジンのシングルトン管理
│       ├── models/
│       │   └── schemas.py          # Pydantic データモデル
│       ├── api/
│       │   ├── simulation.py       # /api/simulation/* (start/stop/reset/snapshot)
│       │   ├── config.py           # /api/config (GET/PUT)
│       │   ├── stats.py            # /api/stats/history
│       │   └── ws.py               # /ws/simulation (WebSocket)
│       └── simulation/
│           ├── engine.py           # シミュレーションエンジン
│           └── agents/
│               ├── __init__.py     # 全エージェントの re-export
│               ├── base.py         # BaseAgent (ABC)
│               ├── fish.py         # Fish
│               ├── predator.py     # Predator
│               └── plastic.py      # Plastic
└── frontend/
    ├── Dockerfile
    ├── package.json
    └── src/
        ├── App.js
        ├── hooks/useSimulation.js  # WebSocket / REST 通信
        └── components/
            ├── Canvas.js           # Canvas 描画
            ├── ControlPanel.js     # 操作パネル
            └── StatsPanel.js       # 統計表示
```

## マルチエージェントの仕組み

### アーキテクチャ

シミュレーションは **エージェントベースモデル (ABM)** を採用しています。各エージェントが独立したルールに従って行動し、全体として複雑な挙動が創発されます。

```
SimulationEngine
  └─ agents: list[BaseAgent]
       ├─ Fish      (群れ行動 + 回避)
       ├─ Predator  (追跡 + 捕食)
       └─ Plastic   (漂流)
```

毎ティック、エンジンが全エージェントの `update()` を呼び出し、状態をフロントエンドへ WebSocket で送信します。

### 既存のエージェント

| エージェント | 行動ルール |
|-------------|-----------|
| **Fish** | Boids アルゴリズム (分離・整列・結合) + 捕食者から逃走 + プラスチック接触でエネルギー減少 |
| **Predator** | 視野内の最寄り Fish を追跡・捕食してエネルギー回復 |
| **Plastic** | 海流を模したゆるやかなドリフト移動 |

### 新しいエージェントの作り方

#### 1. `BaseAgent` を継承したクラスを作成

`backend/app/simulation/agents/` に新しいファイルを作成:

```python
# backend/app/simulation/agents/turtle.py
from app.simulation.agents.base import BaseAgent

class Turtle(BaseAgent):
    """ウミガメ: プラスチックを食べてしまい体力が減る"""

    AGENT_TYPE = "turtle"
    PERCEPTION_RADIUS = 80.0

    def __init__(self, x: float, y: float, speed: float = 1.0):
        super().__init__(x, y)
        self.speed = speed

    def update(self, agents, width, height):
        if not self.alive:
            return

        nearby_plastic = self.neighbours_by_type(agents, "plastic", self.PERCEPTION_RADIUS)

        if nearby_plastic:
            nearest = min(nearby_plastic, key=lambda a: self.distance_to(a))
            if self.distance_to(nearest) < 10:
                nearest.alive = False  # プラスチックを食べる
                self.energy -= 10      # 体に悪い

        self.x += math.cos(self.angle) * self.speed
        self.y += math.sin(self.angle) * self.speed
        self.wrap_position(width, height)
```

#### 2. `agents/__init__.py` に re-export を追加

```python
from app.simulation.agents.turtle import Turtle
```

#### 3. エンジンに登録

`backend/app/simulation/engine.py` の `_init_agents()` にスポーン処理を追加:

```python
for _ in range(5):
    self.agents.append(Turtle(random.uniform(0, w), random.uniform(0, h)))
```

#### 4. フロントエンドで描画

`frontend/src/components/Canvas.js` の `COLORS` と `SIZES` に追加:

```js
const COLORS = {
  fish: "#4fc3f7",
  predator: "#ef5350",
  plastic: "#a1887f",
  turtle: "#66bb6a",   // 追加
};

const SIZES = {
  fish: 5,
  predator: 9,
  plastic: 4,
  turtle: 8,           // 追加
};
```

#### 5. (任意) パラメータを設定可能にする

`backend/app/models/schemas.py` の `SimulationConfig` にフィールドを追加:

```python
class SimulationConfig(BaseModel):
    # ... 既存フィールド
    num_turtles: int = 5
    turtle_speed: float = 1.0
```

### BaseAgent の主なメソッド

| メソッド | 説明 |
|---------|------|
| `distance_to(other)` | 他エージェントとの距離を返す |
| `angle_to(other)` | 他エージェントへの角度を返す |
| `wrap_position(w, h)` | 画面端で反対側にワープ (トーラス空間) |
| `neighbours_by_type(agents, type, radius)` | 指定タイプの近傍エージェントを取得 |
| `to_dict()` | JSON シリアライズ用の辞書を返す |

## API エンドポイント

| メソッド | パス | ファイル | 説明 |
|---------|------|---------|------|
| POST | `/api/simulation/start` | `api/simulation.py` | シミュレーション開始 |
| POST | `/api/simulation/stop` | `api/simulation.py` | 停止 |
| POST | `/api/simulation/reset` | `api/simulation.py` | リセット |
| GET | `/api/simulation/snapshot` | `api/simulation.py` | 現在のスナップショットを取得 |
| GET | `/api/config` | `api/config.py` | 設定を取得 |
| PUT | `/api/config` | `api/config.py` | 設定を更新してリセット |
| GET | `/api/stats/history` | `api/stats.py` | 個体数の時系列データ (グラフ用) |
| WS | `/ws/simulation` | `api/ws.py` | リアルタイムシミュレーション配信 |

## フロントエンドとバックエンドの通信

フロントエンドはバックエンドと **2つの経路** で通信します。

### 1. WebSocket（メイン）— リアルタイム配信

Start ボタンを押すと `useSimulation` フックが `/ws/simulation` に接続し、毎ティックのデータを受信します。

```
[バックエンド]                        [フロントエンド]
engine.step()                        ws.onmessage
  ↓                                    ↓
get_snapshot() → JSON →  WebSocket  → JSON.parse
                                       ↓
                                   agents → Canvas.js     (描画)
                                   stats  → StatsPanel.js (個体数表示)
                                   tick   → StatsPanel.js (ティック表示)
```

受信する JSON の形式:

```json
{
  "tick": 42,
  "agents": [
    { "id": 1, "agent_type": "fish", "x": 123.4, "y": 567.8, "angle": 1.2, "energy": 95.0, "alive": true }
  ],
  "stats": { "tick": 42, "fish": 45, "predators": 5, "plastics": 30, "total": 80 }
}
```

フロントエンドから WebSocket 経由でサーバーに操作を送ることもできます:

| action | 説明 | 追加パラメータ |
|--------|------|---------------|
| `"stop"` | シミュレーション停止 | なし |
| `"reset"` | リセット | `config` (任意) |
| `"update_config"` | 設定更新+リセット | `config` |

送信例:

```json
{ "action": "reset", "config": { "num_fish": 100, "num_predators": 10 } }
```

### 2. REST API（サブ）— 非接続時の操作

WebSocket 未接続の状態でも Reset ボタンや設定変更ができるよう、REST API をフォールバックとして使用します。

```js
// App.js での切り替え
const handleReset = (config) => {
  if (connected) {
    reset(config);       // → WebSocket で { action: "reset", config } を送信
  } else {
    resetViaApi(config); // → PUT /api/config に fetch
  }
};
```

`GET /api/stats/history` は `useSimulation` の `fetchStatsHistory()` で取得可能です（グラフ機能を追加する際に使
