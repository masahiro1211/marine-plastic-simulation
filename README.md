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
│       ├── main.py                 # FastAPI エントリ (REST + WebSocket)
│       ├── models/
│       │   └── schemas.py          # Pydantic データモデル
│       └── simulation/
│           ├── agents.py           # エージェント定義
│           └── engine.py           # シミュレーションエンジン
└── frontend/
    ├── Dockerfile
    ├── package.json
    └── src/
        ├── App.js
        ├── hooks/useSimulation.js  # WebSocket 通信
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
  └─ agents: list[Agent]
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

`backend/app/simulation/agents.py` に新しいクラスを追加します。

#### 1. Agent を継承したクラスを作成

```python
class Turtle(Agent):
    """ウミガメ: プラスチックを食べてしまい体力が減る"""

    PERCEPTION_RADIUS = 80.0

    def __init__(self, x: float, y: float, speed: float = 1.0):
        super().__init__(x, y, "turtle")
        self.speed = speed

    def update(self, agents: list[Agent], width: float, height: float):
        if not self.alive:
            return

        # ここに行動ロジックを書く
        # 例: 近くのプラスチックに向かって泳ぐ
        nearest_plastic = None
        nearest_dist = float("inf")
        for a in agents:
            if a.agent_type == "plastic" and a.alive:
                d = self.distance_to(a)
                if d < self.PERCEPTION_RADIUS and d < nearest_dist:
                    nearest_plastic = a
                    nearest_dist = d

        if nearest_plastic and nearest_dist < 10:
            nearest_plastic.alive = False  # プラスチックを食べる
            self.energy -= 10              # 体に悪い

        # 移動処理
        self.x += math.cos(self.angle) * self.speed
        self.y += math.sin(self.angle) * self.speed
        self.wrap_position(width, height)
```

#### 2. エンジンに登録

`backend/app/simulation/engine.py` の `_init_agents()` にスポーン処理を追加:

```python
for _ in range(5):
    self.agents.append(Turtle(random.uniform(0, w), random.uniform(0, h)))
```

#### 3. フロントエンドで描画

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

#### 4. (任意) パラメータを設定可能にする

`backend/app/models/schemas.py` の `SimulationConfig` にフィールドを追加:

```python
class SimulationConfig(BaseModel):
    # ... 既存フィールド
    num_turtles: int = 5
    turtle_speed: float = 1.0
```

### Agent 基底クラスの主なメソッド

| メソッド | 説明 |
|---------|------|
| `distance_to(other)` | 他エージェントとの距離を返す |
| `angle_to(other)` | 他エージェントへの角度を返す |
| `wrap_position(w, h)` | 画面端で反対側にワープ (トーラス空間) |
| `to_dict()` | JSON シリアライズ用の辞書を返す |

## API エンドポイント

| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/api/config` | 現在の設定を取得 |
| POST | `/api/config` | 設定を更新してリセット |
| POST | `/api/reset` | シミュレーションをリセット |
| GET | `/api/snapshot` | 現在のスナップショットを取得 |
| WS | `/ws/simulation` | リアルタイムシミュレーション配信 |

## ライセンス

MIT
