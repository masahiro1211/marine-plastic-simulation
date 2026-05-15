/* Slide 2 (researcher / specialist) — merged voice consistent with Slide 1
   Sections:
   01 ABM & Modeling Cycle    — A panel card
   02 Algorithm Details (5)   — B editorial spread (the centerpiece)
   03 Emergent Phenomena      — C dark band
   04 References              — compact strip
*/

const dm2Styles = {
  poster: {
    position: 'relative',
    width: REEF_W,
    height: REEF_H,
    background: '#eef3f7',
    fontFamily: '"Hiragino Maru Gothic ProN", "Hiragino Kaku Gothic ProN", "Yu Gothic", "Meiryo", system-ui, sans-serif',
    color: '#0a2540',
    overflow: 'hidden',
    boxShadow: '0 30px 80px rgba(11,58,92,0.18)',
  },
  brandbar: {
    height: 38, background: '#0b3a5c', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 44px', fontSize: 11, letterSpacing: '0.22em',
  },
  hero: { position: 'relative', height: 110, overflow: 'hidden' },
};

function DirMergedS2() {
  return (
    <div style={dm2Styles.poster}>
      {/* === HEADER === */}
      <div style={dm2Styles.brandbar}>
        <span style={{ fontWeight: 800 }}>ロボットシミュレーションゲーム</span>
        <span>Agent-Based Modeling of an Ocean Plastic Cleanup System</span>
        
      </div>
      <div style={dm2Styles.hero}>
        <HeroScene palette="editorial" />
        <div style={{
          position: 'absolute', inset: 0,
          padding: '10px 44px',
          display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
          background: 'linear-gradient(180deg, rgba(11,58,92,0.55) 0%, rgba(11,58,92,0.2) 35%, rgba(11,58,92,0.55) 100%)',
        }}>
          <div style={{ color: '#ffd84d', fontSize: 10.5, letterSpacing: '0.32em', fontWeight: 700, marginBottom: 3 }}>
            EXHIBIT · DEEP DIVE · ABM
          </div>
          <h1 style={{ color: '#fff', fontSize: 30, fontWeight: 900, lineHeight: 1.0, margin: 0, textShadow: '0 4px 18px rgba(0,0,0,0.4)', letterSpacing: '-0.01em' }}>
            ABM で読み解く海洋ごみ生態系。
          </h1>
          <div style={{ color: '#cfe9f3', fontSize: 12, marginTop: 2, fontWeight: 500 }}>
            個体ルール → 相互作用 → 創発 を、5 種のエージェントで再現する。
          </div>
        </div>
      </div>

      {/* === BODY === */}
      <div style={{ padding: '10px 44px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* 01 ABM & Modeling Cycle (A) */}
        <SectionAS2 num="01" kicker="FRAMEWORK · ABM とモデル化サイクル" title="個体ルールから集団パターンへ。">
          <div style={{ background: '#fff', padding: '10px 12px', boxShadow: '0 2px 10px rgba(11,58,92,0.08)' }}>
            <div style={{ fontSize: 14, fontWeight: 900, color: '#0b3a5c', padding: '5px 8px', background: '#fff5cc', borderRadius: 3, display: 'inline-block' }}>
              個体ルール <span style={{ color: '#ff7a59', margin: '0 3px' }}>→</span> 相互作用 <span style={{ color: '#ff7a59', margin: '0 3px' }}>→</span> 創発
            </div>
            <div style={{ fontSize: 11, color: '#355f80', lineHeight: 1.55, marginTop: 6 }}>
              各エージェントに局所ルールのみを与え、中央集権的指令なしに集団パターンが立ち現れる過程を観察する手法<sup style={{ color: '#ff5d3b' }}>[4]</sup>。本作では <b style={{ color: '#0b3a5c' }}>5 種のエージェント</b>が連続 2D 空間で 1 tick ごとに状態更新し、個体スケール ↔ システムスケールの双方向影響を扱う。
            </div>
          </div>
        </SectionAS2>

        {/* 02 Algorithm Details (B editorial) */}
        <section>
          <SectionHeadBS2 tag="ALGORITHMS" no="02" title="各エージェントのアルゴリズム詳細。" sub="局所ルール → 状態遷移 → 集団効果。" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <AlgoCard
              accent="#f0a93c"
              emoji="🤖"
              title="Scout"
              tag="Albatross-inspired"
              cite="[1]"
              lead="アホウドリの食物探索を移植: 広域 scan ⇄ 局所 search を「見つけたか?」で切替える二相モデル。Lévy 飛行は希少資源探索で解析的に最適とされる<sup style={{ color: '#ff5d3b' }}>[1]</sup>。"
              bullets={[
                <>優先順位: <b>❶</b> 低エネルギーなら基地帰還 <b>❷</b> 検知ごみを <code style={algoCode}>shared_targets</code> へ push <b>❸</b> 二相探索</>,
                <>(a) <b style={{ color: '#ff5d3b' }}>scan</b>: <code style={algoCode}>Lévy flight</code> · <code style={algoCode}>P(L)∝L^-μ</code> (μ≈2), heading ~ <code style={algoCode}>U(0,2π)</code> — 長脚で広域カバー</>,
                <>(b) <b style={{ color: '#ff5d3b' }}>search</b>: <code style={algoCode}>ARS</code> · <code style={algoCode}>θ_t = θ_(t-1) + N(0,σ²)</code>, 短ステップ — 局所を密にスイープ</>,
                <>切替: (a)→(b) 検知半径 <code style={algoCode}>r_s</code> 内に発見 / (b)→(a) <code style={algoCode}>N_miss</code> tick 連続未検出</>,
                <>共有: 検知ごみを <code style={algoCode}>shared_targets</code> へ push、TTL 経過で eviction — Collector が即時利用</>,
                <>バッテリー: <code style={algoCode}>E(t+1)=E(t)-β·|v|</code>、<code style={algoCode}>E&lt;E_low</code> で基地帰還</>,
              ]}
            />
            <AlgoCard
              accent="#4aa3ff"
              emoji="🚤"
              title="Collector"
              tag="Priority FSM + Greedy Pickup"
              lead="Scout が共有したごみを最近接基準で 1 件選び、追跡・把持・帰還を排他的な優先順位で切替える FSM。"
              bullets={[
                <>優先順位: <b>❶</b> 満載なら帰還 <b>❷</b> 基地で <code style={algoCode}>E_max</code> まで充電 <b>❸</b> 低エネで帰還 <b>❹</b> 追跡 <b>❺</b> パトロール</>,
                <>選択: <code style={algoCode}>sensor_radius</code> 内の最近接、なければ <code style={algoCode}>shared_targets</code> の最近接</>,
                <>状態: <code style={algoCode}>patrolling → collecting → delivering → returning → charging</code>(各遷移に明示条件)</>,
                <>把持: <code style={algoCode}>‖p_c − p_t‖ &lt; r_grip</code> で回収 → <b style={{ color: '#ff5d3b' }}>+12 pt</b>。スコア ≥ 1000 で capacity が 2 に増強</>,
                <>手動: UI トグル ON で FSM を bypass、WASD/矢印キーで速度ベクトル直接指定</>,
              ]}
            />
            <AlgoCard
              accent="#2cc8b9"
              emoji="🐟"
              title="Marine Life"
              tag="Couzin 3-zone + Flash Expansion"
              cite="[2][3]"
              lead="魚は「脅威回避 → 群れ行動」の優先順位で動く。ロボットや捕食者が近いと最優先で回避し、いなければ近隣の魚との距離ルールで群れる。群れの<b>整列・誘引は同種のみ</b>、反発は他種にも働く。"
              bullets={[
                <>優先順位: <b>❶</b> ロボット/捕食者の回避 <b>❷</b> 壁回避・棲息深度ドリフト(常時加算) <b>❸</b> 同種との群れステアリング</>,
                <>3 ゾーン(<b style={{ color: '#0b3a5c' }}>同種間</b>): 近 <code style={algoCode}>d&lt;zor</code> → <b>反発</b> / 中 <code style={algoCode}>zor≤d&lt;zoo</code> → <b>向き整列</b> / 遠 <code style={algoCode}>zoo≤d&lt;zoa</code> → <b>引き寄せ</b></>,
                <>異種間: <code style={algoCode}>zor</code> 反発は<b>種を問わず</b>適用 + 中距離 <code style={algoCode}>inter_species_repulsion</code> で衝突回避</>,
                <>Panic 発火: ロボット/捕食者が <code style={algoCode}>r_alert</code> 内 ‖ <b>同種</b>の隣人が前 tick panic<sup style={{ color: '#ff5d3b' }}>[3]</sup>(伝播)</>,
                <>Panic 時: 速度 × <code style={algoCode}>panic_speed_factor</code> + heading ノイズ大 → 群れが一斉に <b style={{ color: '#ff5d3b' }}>flash expansion</b>(爆発的拡散)</>,
                <>誤飲: ごみに接触すると <code style={algoCode}>fish_eats_trash</code> 発火 → ゴミ消滅(Collector の回収を阻害)</>,
              ]}
            />
            <AlgoCard
              accent="#6f3f99"
              emoji="🦈"
              title="Predator"
              tag="Lévy Cruise + Cluster Chase"
              lead="魚群ホットスポットを探し当て、十分大きな塊を見つけると群中心へ突進。捕食はせず、群行動の緊張源として機能する。"
              bullets={[
                <>巡航: Scout と同型の <code style={algoCode}>Lévy flight</code>(μ≈2)</>,
                <>検知: <code style={algoCode}>predator_sensor_radius</code> 内の魚を <code style={algoCode}>zoa</code> 半径で近接連結しクラスタ化</>,
                <>chase: <code style={algoCode}>|C| ≥ predator_cluster_min_size</code> で群重心へ突進、未満なら最近接魚に fallback</>,
                <>速度: <code style={algoCode}>|v|×predator_chase_speed_factor</code>、追いついたら 0.7 倍に減速</>,
                <>影響: Marine Life の Panic を誘発 → 群が <b style={{ color: '#ff5d3b' }}>flash expansion</b>(直接捕食はしない)</>,
              ]}
            />
            <AlgoCard
              accent="#9aa1a8"
              emoji="🗑️"
              title="Trash"
              tag="Source-weighted Generation + Drift"
              lead="河口・沿岸・港・沖の 4 ソースから重み付きで生成し、海流と収束 pull で漂流させる受動アクター。garbage patch を擬似再現。"
              bullets={[
                <>生成: 4 ソースから <code style={algoCode}>w_i</code> 比で抽選、圧力蓄積でバースト出現、上限 <code style={algoCode}>max_trash</code></>,
                <>輸送: 海流 + ソース外向き流 + 収束点 pull + 一様ランダム拡散</>,
                <>収束: <code style={algoCode}>(convergence_x, convergence_y)</code> への弱い pull が <b style={{ color: '#ff5d3b' }}>ホットスポット</b> を形成</>,
                <>消滅: Collector 把持 / Marine Life 誤飲 の 2 経路のみ</>,
              ]}
              fullWidth
            />
          </div>
        </section>

        {/* 03 Emergent Phenomena (C dark band) */}
        <div style={{ position: 'relative' }}>
          <div style={{
            background: 'linear-gradient(120deg, #0b3a5c 0%, #134d7e 100%)', color: '#fff',
            padding: '10px 20px 12px',
            borderRadius: 4,
          }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
              <div style={{ fontFamily: '"Helvetica Neue", sans-serif', fontWeight: 200, fontSize: 30, lineHeight: 0.85, color: '#ffd84d', letterSpacing: '-0.04em' }}>03</div>
              <div>
                <div style={{ fontSize: 10, letterSpacing: '0.26em', fontWeight: 800, color: '#ffd84d' }}>EMERGENCE</div>
                <div style={{ fontSize: 17, fontWeight: 900, color: '#fff', lineHeight: 1.1 }}>創発する 3 つの現象。</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 8 }}>
              <EmergeM
                title="群行動 (Schooling)"
                desc="同種の近傍に 3 ゾーンが働き、自発的に整列・凝集する"
                cond="zoo > 0 ∧ zoa > zoo ∧ 同種個体数 ≥ 10"
                metric="polarization φ = ‖⟨v̂⟩‖, cohesion d̄"
                pict={EmergeSchooling}
              />
              <EmergeM
                title="パニック分離"
                desc="捕食者接近で群が爆発的に拡散 (flash expansion)"
                cond="predator が r_alert 内 ∨ 隣人 panic 伝播"
                metric="瞬間群半径 R(t)/R(t₀), 解散時間 τ"
                pict={EmergePanic}
              />
              <EmergeM
                title="分業 (Division of Labor)"
                desc="Scout が広域で検知した trash を shared_targets に push、Collector がそれを最近接で消化 — 中央指令なしに役割が分かれる"
                cond="Scout/Collector が共存 ∧ Scout の検知が Collector の sensor_radius 外を含む"
                metric="shared_targets 経由の回収比率, Scout 検知 → Collector 把持の平均遅延"
                pict={EmergeDivision}
              />
            </div>
          </div>
        </div>

        {/* 04 References */}
        <section>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, borderBottom: '1.5px solid #0b3a5c', paddingBottom: 4, marginBottom: 6 }}>
            <div style={{ fontFamily: '"Helvetica Neue", sans-serif', fontWeight: 200, fontSize: 30, lineHeight: 0.85, color: '#0b3a5c' }}>04</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, letterSpacing: '0.26em', fontWeight: 800, color: '#ff7a59' }}>REFERENCES</div>
              <div style={{ fontSize: 15, fontWeight: 900, color: '#0b3a5c', lineHeight: 1.1 }}>主要参考文献</div>
            </div>
          </div>
          <div style={{ background: '#fff', padding: '8px 14px', boxShadow: '0 2px 10px rgba(11,58,92,0.08)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 16px', fontSize: 10, lineHeight: 1.4, color: '#0a2540' }}>
            <RefRow n="[1]" body={<><b>Viswanathan, G. M., et al.</b> (1996). <i>Lévy flight search patterns of wandering albatrosses.</i> Nature, 381, 413–415.</>} />
            <RefRow n="[2]" body={<><b>Couzin, I. D., et al.</b> (2002). <i>Collective memory and spatial sorting in animal groups.</i> J. Theor. Biol., 218(1), 1–11.</>} />
            <RefRow n="[3]" body={<><b>Herbert-Read, J. E., et al.</b> (2011). <i>Inferring the rules of interaction of shoaling fish.</i> PNAS, 108(46), 18726–18731.</>} />
            <RefRow n="[4]" body={<><b>Grimm, V., et al.</b> (2006). <i>A standard protocol for describing IBM/ABM (ODD).</i> Ecological Modelling, 198(1–2), 115–126.</>} />
          </div>
        </section>

      </div>

      {/* footer */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '6px 44px',
        display: 'flex', justifyContent: 'space-between',
        color: '#5d7898', fontSize: 10, letterSpacing: '0.16em',
        borderTop: '1px solid rgba(11,58,92,0.12)',
        background: '#eef3f7',
      }}>
        <div>REEF PATROL · AGENT-BASED MODELING</div>
        <div>SLIDE&nbsp;2&nbsp;/&nbsp;2 · FOR&nbsp;RESEARCHERS</div>
      </div>
    </div>
  );
}

/* ============ Sub-components ============ */

const algoCode = {
  background: '#eef5fa',
  padding: '0 4px',
  borderRadius: 3,
  fontSize: 9.5,
  fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
  color: '#0b3a5c',
};

function SectionAS2({ num, kicker, title, children }) {
  return (
    <section style={{ display: 'grid', gridTemplateColumns: '52px 1fr', columnGap: 14, alignItems: 'start' }}>
      <div>
        <div style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', fontWeight: 200, fontSize: 42, lineHeight: 0.85, color: '#0b3a5c', letterSpacing: '-0.04em' }}>{num}</div>
        <div style={{ width: 32, height: 2, background: '#ff7a59', marginTop: 3 }} />
      </div>
      <div>
        <div style={{ fontSize: 10, letterSpacing: '0.26em', color: '#5d7898', fontWeight: 700 }}>{kicker}</div>
        <h2 style={{ fontSize: 17, fontWeight: 900, color: '#0b3a5c', margin: '1px 0 6px', lineHeight: 1.1 }}>{title}</h2>
        {children}
      </div>
    </section>
  );
}

function SectionHeadBS2({ tag, no, title, sub }) {
  return (
    <div style={{ marginBottom: 6, display: 'flex', alignItems: 'flex-end', gap: 12, borderBottom: '2px solid #0b3a5c', paddingBottom: 4 }}>
      <div style={{ fontFamily: '"Helvetica Neue", sans-serif', fontWeight: 200, fontSize: 34, lineHeight: 0.85, color: '#0b3a5c', letterSpacing: '-0.04em' }}>{no}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.26em', fontWeight: 800, color: '#ff7a59' }}>{tag}</div>
        <div style={{ fontSize: 17, fontWeight: 900, color: '#0b3a5c', lineHeight: 1.1, marginTop: 1 }}>{title}</div>
      </div>
      {sub && <div style={{ fontSize: 10.5, color: '#5d7898', maxWidth: 240, textAlign: 'right', lineHeight: 1.5 }}>{sub}</div>}
    </div>
  );
}

function AlgoCard({ accent, emoji, title, tag, cite, lead, bullets, fullWidth }) {
  return (
    <div style={{
      background: '#fff', padding: '8px 12px 10px',
      boxShadow: '0 2px 10px rgba(11,58,92,0.08)',
      borderLeft: `4px solid ${accent}`,
      gridColumn: fullWidth ? '1 / -1' : 'auto',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 16, lineHeight: 1 }}>{emoji}</span>
        <span style={{ fontSize: 14, fontWeight: 900, color: '#0b3a5c' }}>{title}</span>
        <span style={{
          fontSize: 9, color: '#fff', background: accent, padding: '1px 6px', borderRadius: 3, fontWeight: 700, letterSpacing: '0.04em',
        }}>{tag}</span>
        {cite && <span style={{ fontSize: 9, color: '#ff5d3b', fontWeight: 800 }}>{cite}</span>}
      </div>
      <div style={{ fontSize: 10.5, color: '#355f80', marginTop: 4, lineHeight: 1.45 }}>{lead}</div>
      <ul style={{ margin: '4px 0 0 14px', padding: 0 }}>
        {bullets.map((b, i) => (
          <li key={i} style={{ fontSize: 10.5, lineHeight: 1.45, color: '#0a2540', margin: '0 0 1px' }}>{b}</li>
        ))}
      </ul>
    </div>
  );
}

function EmergeM({ title, desc, cond, metric, pict: Pict }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.96)', padding: '6px 8px 8px', borderRadius: 4, color: '#0b3a5c' }}>
      <div style={{ height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Pict />
      </div>
      <div style={{ fontSize: 12, fontWeight: 900, marginTop: 2 }}>{title}</div>
      <div style={{ fontSize: 9.5, color: '#355f80', marginTop: 2, lineHeight: 1.35 }}>{desc}</div>
      {cond && (
        <div style={{ fontSize: 8.5, color: '#0b3a5c', marginTop: 3, lineHeight: 1.3 }}>
          <span style={{ color: '#ff5d3b', fontWeight: 800 }}>観測条件:</span> {cond}
        </div>
      )}
      {metric && (
        <div style={{ fontSize: 8.5, color: '#0b3a5c', marginTop: 1, lineHeight: 1.3 }}>
          <span style={{ color: '#ff5d3b', fontWeight: 800 }}>指標:</span> {metric}
        </div>
      )}
    </div>
  );
}

function EmergeSchooling() {
  return (
    <svg viewBox="0 0 100 50" width="100%" height="100%">
      <g fill="#2cc8b9">
        <ellipse cx="30" cy="25" rx="7" ry="3.5" /><polygon points="24,25 18,22 18,28" />
        <ellipse cx="50" cy="20" rx="7" ry="3.5" /><polygon points="44,20 38,17 38,23" />
        <ellipse cx="50" cy="32" rx="7" ry="3.5" /><polygon points="44,32 38,29 38,35" />
        <ellipse cx="72" cy="25" rx="7" ry="3.5" /><polygon points="66,25 60,22 60,28" />
      </g>
    </svg>
  );
}

function EmergePanic() {
  return (
    <svg viewBox="0 0 100 50" width="100%" height="100%">
      <g fill="#2cc8b9">
        <ellipse cx="20" cy="14" rx="5" ry="2.5" /><ellipse cx="80" cy="14" rx="5" ry="2.5" />
        <ellipse cx="20" cy="40" rx="5" ry="2.5" /><ellipse cx="80" cy="40" rx="5" ry="2.5" />
      </g>
      <g stroke="#ffd84d" strokeWidth="1.5" fill="none" strokeLinecap="round">
        <path d="M50 25 L 25 14" /><path d="M50 25 L 75 14" />
        <path d="M50 25 L 25 40" /><path d="M50 25 L 75 40" />
      </g>
      <circle cx="50" cy="25" r="4" fill="#6f3f99" />
    </svg>
  );
}

function EmergeDivision() {
  return (
    <svg viewBox="0 0 100 50" width="100%" height="100%">
      {/* Scout (上左) — 検知範囲付き */}
      <circle cx="14" cy="12" r="9" fill="none" stroke="#f0a93c" strokeWidth="1" strokeDasharray="2 2" />
      <circle cx="14" cy="12" r="3.5" fill="#f0a93c" />
      {/* Trash (中央) */}
      <rect x="48" y="22" width="6" height="6" rx="1" fill="#516573" />
      {/* Collector (下右) */}
      <path d="M78 38 l12 0 l-2 4 l-8 0 z" fill="#4aa3ff" />
      <rect x="82" y="32" width="4" height="6" fill="#4aa3ff" />
      {/* 検知 → 共有 (Scout → Trash, 破線) */}
      <path d="M22 16 L 46 24" stroke="#f0a93c" strokeWidth="1.2" strokeDasharray="2 2" fill="none" markerEnd="url(#arrD)" />
      {/* 把持 → 回収 (Collector → Trash, 実線) */}
      <path d="M80 36 L 56 28" stroke="#4aa3ff" strokeWidth="1.5" fill="none" markerEnd="url(#arrD)" />
      <defs>
        <marker id="arrD" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto">
          <path d="M0 0 L10 5 L0 10 z" fill="#0b3a5c" />
        </marker>
      </defs>
      <text x="26" y="10" fontSize="5.5" fill="#0b3a5c" fontWeight="700">push</text>
      <text x="58" y="40" fontSize="5.5" fill="#0b3a5c" fontWeight="700">pickup</text>
    </svg>
  );
}

function RefRow({ n, body }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '24px 1fr', columnGap: 6 }}>
      <span style={{ color: '#ff5d3b', fontWeight: 800 }}>{n}</span>
      <span>{body}</span>
    </div>
  );
}

Object.assign(window, { DirMergedS2 });
