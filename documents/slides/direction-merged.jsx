/* Merged direction — A (header + 01, 02) + B (03) + C (04, 05) */

const dmStyles = {
  poster: {
    position: 'relative',
    width: REEF_W,
    height: REEF_H,
    background: '#f3f7fa',
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
  hero: { position: 'relative', height: 220, overflow: 'hidden' },
};

function DirMerged() {
  return (
    <div style={dmStyles.poster}>
      {/* === HEADER (style A) === */}
      <div style={dmStyles.brandbar}>
        <span style={{ fontWeight: 800 }}>REEF&nbsp;PATROL</span>
        <span>海洋ごみ回収シミュレーション · 解説パネル</span>
        <span>2026 / FOR&nbsp;EVERYONE</span>
      </div>
      <div style={dmStyles.hero}>
        <HeroScene palette="panel" />
        <div style={{
          position: 'absolute', inset: 0,
          padding: '20px 44px',
          display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
          background: 'linear-gradient(180deg, rgba(11,58,92,0.18) 0%, rgba(11,58,92,0) 35%, rgba(11,58,92,0.35) 100%)',
        }}>
          <div style={{ color: '#fff', fontSize: 11, letterSpacing: '0.32em', fontWeight: 700, marginBottom: 6, textShadow: '0 2px 6px rgba(0,0,0,0.3)' }}>
            EXHIBIT · 海をきれいにするロボットたち
          </div>
          <h1 style={{ color: '#fff', fontSize: 38, fontWeight: 900, lineHeight: 1.0, margin: 0, textShadow: '0 4px 18px rgba(0,0,0,0.28)', letterSpacing: '-0.01em' }}>
            海をきれいにしよう。
          </h1>
          <div style={{ color: '#eaffff', fontSize: 14, marginTop: 4, fontWeight: 500, textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
            ロボットと海のいきものが、ひとつの海でくらすシミュレーション。
          </div>
        </div>
        <div style={{
          position: 'absolute', top: 16, right: 28,
          background: 'rgba(255,255,255,0.94)', padding: '5px 12px', borderRadius: 3,
          fontSize: 10.5, fontWeight: 800, color: '#0b3a5c', letterSpacing: '0.08em',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}>
          A1 / SLIDE&nbsp;1&nbsp;OF&nbsp;2
        </div>
      </div>

      {/* === BODY === */}
      <div style={{ padding: '14px 44px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* 01 Cast (A) */}
        <SectionA num="01" kicker="CAST · とうじょうじんぶつ" title="海でくらす 5 つの仲間">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
            {[
              { kind: 'scout', name: 'スカウト', role: '海面ロボット', desc: 'すばやく海を巡回し、ゴミの場所を仲間に伝える。' },
              { kind: 'collector', name: '回収ロボット', role: 'コレクター', desc: '知らせを受けてゴミを拾い、基地へ運ぶ。' },
              { kind: 'fish', name: '魚たち', role: '群れ', desc: '群れで泳ぐ。ときどきゴミを食べてしまう。' },
              { kind: 'orca', name: 'シャチ', role: '捕食者', desc: '魚を追いかける、海のハンター。' },
              { kind: 'trash', name: '海のごみ', role: '環境', desc: '川や港から海へ流れ込み、海流で集まる。' },
            ].map((a) => (
              <div key={a.name} style={{
                background: '#fff', padding: '8px 10px 10px',
                borderTop: '3px solid #0b3a5c',
                boxShadow: '0 2px 8px rgba(11,58,92,0.08)',
              }}>
                <div style={{ height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AgentChip kind={a.kind} size={42} />
                </div>
                <div style={{ marginTop: 4, fontSize: 9, color: '#5d7898', letterSpacing: '0.1em', fontWeight: 700 }}>{a.role}</div>
                <div style={{ fontSize: 12.5, fontWeight: 900, color: '#0b3a5c', marginTop: 1 }}>{a.name}</div>
                <div style={{ fontSize: 10, color: '#355f80', marginTop: 3, lineHeight: 1.4 }}>{a.desc}</div>
              </div>
            ))}
          </div>
        </SectionA>

        {/* 02 Relations (A) */}
        <SectionA num="02" kicker="RELATIONS · どうかかわるの?" title="5 つの矢印で読みとく、海の関係図">
          <div style={{ background: '#fff', padding: '10px 14px 6px', boxShadow: '0 2px 10px rgba(11,58,92,0.08)' }}>
            <RelMapMerged />
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 4, fontSize: 10.5, color: '#355f80' }}>
              <Legend num="①" label="場所を伝える" color="#0b3a5c" />
              <Legend num="②" label="基地へ運ぶ" color="#0b3a5c" />
              <Legend num="③" label="シャチが追う" color="#ff5d3b" />
              <Legend num="④" label="魚がよける" color="#1ea99c" />
              <Legend num="⑤" label="ゴミを食べてしまう" color="#516573" />
            </div>
          </div>
        </SectionA>

        {/* 03 Rules + Rank (B — editorial pull-quote) */}
        <section>
          <SectionHeadB tag="RULES" no="03" title="スコアとランクで競う。" sub="運ぶほど、海の主役になっていく。" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 10 }}>
            <div style={{ background: '#0b3a5c', color: '#fff', padding: '12px 14px' }}>
              <div style={{ fontSize: 10, letterSpacing: '0.26em', fontWeight: 800, color: '#ffd84d' }}>SCORING</div>
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <BigScoreM op="+12" label="ゴミを基地に運ぶ" tone="plus" />
                <BigScoreM op="+α" label="残エネルギーボーナス" tone="plus" />
                <BigScoreM op="−2" label="ロボット同士の衝突" tone="minus" />
              </div>
            </div>
            <div style={{ background: '#fff', padding: '12px 14px', boxShadow: '0 4px 16px rgba(11,58,92,0.10)' }}>
              <div style={{ fontSize: 10, letterSpacing: '0.26em', fontWeight: 800, color: '#5d7898' }}>5 RANKS · 成長していこう</div>
              <RankLadderM />
            </div>
          </div>
        </section>

        {/* === 04 + 05 rail (C) === */}
        <div style={{ position: 'relative', marginTop: 4 }}>
          <div style={{
            position: 'absolute', left: 30, top: 0, bottom: 0,
            width: 2, background: 'linear-gradient(180deg, rgba(11,58,92,0.6) 0%, rgba(11,58,92,0.2) 100%)',
          }} />

          {/* 04 Watch (C dark band) */}
          <StepM no="04" kicker="WATCH" title="観察してみよう、3つの瞬間。" theme="band">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <WatchM no="A" title="魚の群れ方" body="近くの仲間とそろうルールだけで、群れが立ち上がる。" />
              <WatchM no="B" title="シャチ接近" body="群れがぱっと散って、また集まる。" />
              <WatchM no="C" title="ごみのたまり場" body="海流に乗って同じ場所に集まる。" />
            </div>
            <div style={{
              marginTop: 8, padding: '8px 12px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px dashed rgba(255,255,255,0.35)',
              display: 'grid', gridTemplateColumns: '1.05fr 1fr', gap: 10, alignItems: 'center', borderRadius: 6,
            }}>
              <div>
                <div style={{ fontSize: 10, letterSpacing: '0.24em', fontWeight: 800, color: '#ffd84d' }}>QUESTION</div>
                <div style={{ fontSize: 14, fontWeight: 900, color: '#fff', marginTop: 2, lineHeight: 1.3 }}>
                  ロボットをたくさん出せば、もっと早くキレイになる?
                </div>
                <div style={{ fontSize: 10.5, color: '#cfe9f3', marginTop: 3, lineHeight: 1.45 }}>
                  増やしすぎると <b style={{ color: '#ffd84d' }}>ロボット同士の渋滞</b> が増える。
                </div>
              </div>
              <ParadoxGraphM />
            </div>
          </StepM>

          {/* 05 Play — friendlier */}
          <StepM no="05" kicker="PLAY" title="さあ、自分でも動かしてみよう!" theme="friendly" last>
            <PlayFriendly />
          </StepM>
        </div>

      </div>

      {/* footer */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '8px 44px',
        display: 'flex', justifyContent: 'space-between',
        color: '#5d7898', fontSize: 10, letterSpacing: '0.16em',
        borderTop: '1px solid rgba(11,58,92,0.12)',
        background: '#f3f7fa',
      }}>
        <div>REEF PATROL · OCEAN PLASTIC CLEANUP SIMULATION</div>
        <div>SLIDE&nbsp;1&nbsp;/&nbsp;2 · FOR&nbsp;EVERYONE</div>
      </div>
    </div>
  );
}

/* ============= Sub-components ============= */

function SectionA({ num, kicker, title, children }) {
  return (
    <section style={{ display: 'grid', gridTemplateColumns: '52px 1fr', columnGap: 14, alignItems: 'start' }}>
      <div>
        <div style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', fontWeight: 200, fontSize: 46, lineHeight: 0.85, color: '#0b3a5c', letterSpacing: '-0.04em' }}>{num}</div>
        <div style={{ width: 32, height: 2, background: '#ff7a59', marginTop: 3 }} />
      </div>
      <div>
        <div style={{ fontSize: 10, letterSpacing: '0.26em', color: '#5d7898', fontWeight: 700 }}>{kicker}</div>
        <h2 style={{ fontSize: 18, fontWeight: 900, color: '#0b3a5c', margin: '1px 0 6px', lineHeight: 1.1 }}>{title}</h2>
        {children}
      </div>
    </section>
  );
}

function Legend({ num, label, color }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <span style={{ width: 18, height: 18, borderRadius: '50%', background: color, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800 }}>{num}</span>
      <span style={{ fontSize: 10.5, color: '#0b3a5c', fontWeight: 700 }}>{label}</span>
    </span>
  );
}

function SectionHeadB({ tag, no, title, sub }) {
  return (
    <div style={{ marginBottom: 8, display: 'flex', alignItems: 'flex-end', gap: 12, borderBottom: '2px solid #0b3a5c', paddingBottom: 5 }}>
      <div style={{ fontFamily: '"Helvetica Neue", sans-serif', fontWeight: 200, fontSize: 38, lineHeight: 0.85, color: '#0b3a5c', letterSpacing: '-0.04em' }}>{no}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.26em', fontWeight: 800, color: '#ff7a59' }}>{tag}</div>
        <div style={{ fontSize: 18, fontWeight: 900, color: '#0b3a5c', lineHeight: 1.1, marginTop: 1 }}>{title}</div>
      </div>
      {sub && <div style={{ fontSize: 11, color: '#5d7898', maxWidth: 220, textAlign: 'right', lineHeight: 1.5 }}>{sub}</div>}
    </div>
  );
}

function BigScoreM({ op, label, tone }) {
  const pos = tone === 'plus';
  const bg = pos ? '#1ea99c' : '#ff7a59';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{
        fontFamily: 'ui-monospace, Menlo, monospace',
        fontWeight: 900, fontSize: 18,
        color: '#0b3a5c', background: bg,
        padding: '2px 8px', minWidth: 54, textAlign: 'center',
      }}>{op}</span>
      <span style={{ fontSize: 12.5, fontWeight: 700 }}>{label}</span>
    </div>
  );
}

function RankLadderM() {
  const ranks = [
    { icon: '🦀', name: 'ヤドカリ', th: '0' },
    { icon: '🐠', name: 'クマノミ', th: '40' },
    { icon: '🐢', name: 'ウミガメ', th: '80' },
    { icon: '🐬', name: 'イルカ', th: '120' },
    { icon: '🦈', name: 'シャチ', th: '160' },
  ];
  return (
    <div style={{ marginTop: 8, position: 'relative', height: 86 }}>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 18, height: 2, background: 'linear-gradient(90deg,#cfe9f3,#0b3a5c)' }} />
      {ranks.map((r, i) => {
        const y = 64 - i * 12;
        const x = `${i * 24 + 4}%`;
        return (
          <div key={r.name} style={{
            position: 'absolute', left: x, bottom: y,
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            transform: 'translateX(-50%)',
          }}>
            <div style={{ fontSize: 20, lineHeight: 1 }}>{r.icon}</div>
            <div style={{ fontSize: 10.5, fontWeight: 900, color: '#0b3a5c', marginTop: 1 }}>{r.name}</div>
            <div style={{ fontSize: 9, color: '#5d7898', fontFamily: 'ui-monospace,Menlo,monospace' }}>{r.th}+</div>
          </div>
        );
      })}
    </div>
  );
}

function StepM({ no, kicker, title, theme, children, last }) {
  const isBand = theme === 'band';
  const isFriendly = theme === 'friendly';

  const dot = (
    <div style={{
      position: 'absolute', left: 30, top: 0, transform: 'translate(-50%, -2px)',
      width: 36, height: 36, borderRadius: '50%',
      background: isBand ? '#ffd84d' : '#ff7a59',
      color: isBand ? '#0b3a5c' : '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: '"Helvetica Neue", sans-serif',
      fontWeight: 800, fontSize: 13, letterSpacing: '-0.02em',
      boxShadow: '0 4px 12px rgba(11,58,92,0.25)',
      border: '3px solid #f3f7fa',
      zIndex: 2,
    }}>{no}</div>
  );

  if (isBand) {
    return (
      <div style={{ position: 'relative', marginBottom: last ? 0 : 10 }}>
        {dot}
        <div style={{ background: 'linear-gradient(120deg, #0b3a5c 0%, #134d7e 100%)', color: '#fff', padding: '10px 24px 12px 70px', borderRadius: 4 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.26em', fontWeight: 800, color: '#ffd84d' }}>{kicker}</div>
          <div style={{ fontSize: 17, fontWeight: 900, color: '#fff', marginTop: 1, marginBottom: 7, lineHeight: 1.1 }}>{title}</div>
          {children}
        </div>
      </div>
    );
  }

  if (isFriendly) {
    return (
      <div style={{ position: 'relative', marginBottom: last ? 0 : 10 }}>
        {dot}
        <div style={{
          background: 'linear-gradient(135deg, #fff8e0 0%, #ffeec0 100%)',
          padding: '10px 24px 12px 70px',
          borderRadius: 4,
          border: '2px solid #ffd84d',
        }}>
          <div style={{ fontSize: 10, letterSpacing: '0.26em', fontWeight: 800, color: '#0b3a5c' }}>{kicker} · じゅんびできた?</div>
          <div style={{ fontSize: 19, fontWeight: 900, color: '#0b3a5c', marginTop: 1, marginBottom: 7, lineHeight: 1.1 }}>{title}</div>
          {children}
        </div>
      </div>
    );
  }
}

function WatchM({ no, title, body }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.96)', color: '#0b3a5c', padding: '6px 10px', borderRadius: 5 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontFamily: '"Helvetica Neue", sans-serif', fontWeight: 200, fontSize: 22, lineHeight: 0.85, color: '#ff7a59' }}>{no}</span>
        <div style={{ fontSize: 12, fontWeight: 900 }}>{title}</div>
      </div>
      <div style={{ fontSize: 10, color: '#355f80', marginTop: 2, lineHeight: 1.4 }}>{body}</div>
    </div>
  );
}

/* ===== Friendly Play (05) =====
   Big speech bubble from Scout robot, oversized chunky keys, 3 difficulty cards with mascots */
function PlayFriendly() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 14, alignItems: 'center' }}>
      {/* Friendly Scout mascot */}
      <div style={{ position: 'relative', height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg viewBox="0 0 110 110" width="110" height="110">
          {/* water splash backdrop */}
          <circle cx="55" cy="78" r="40" fill="#ffd84d" opacity="0.35" />
          <circle cx="55" cy="78" r="28" fill="#ffd84d" opacity="0.55" />
          {/* Big scout */}
          <g transform="translate(55,72)">
            <ellipse rx="34" ry="11" fill="#f0a93c" stroke="#0b3a5c" strokeWidth="2" />
            <rect x="-12" y="-22" width="24" height="16" rx="2" fill="#fff" stroke="#0b3a5c" strokeWidth="2" />
            <rect x="-3" y="-30" width="3" height="8" fill="#ff7a59" />
            <circle cx="-18" cy="-12" r="3" fill="#0b3a5c" />
            <circle cx="-17" cy="-13" r="0.8" fill="#fff" />
            <circle cx="18" cy="-12" r="3" fill="#0b3a5c" />
            <circle cx="19" cy="-13" r="0.8" fill="#fff" />
            <path d="M -6 -3 Q 0 1 6 -3" stroke="#0b3a5c" strokeWidth="1.6" fill="none" strokeLinecap="round" />
          </g>
          {/* wave */}
          <path d="M 10 96 q 12 -8 24 0 t 24 0 t 24 0 t 24 0" stroke="#0b3a5c" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.5" />
        </svg>
      </div>

      {/* Right side: speech bubble + keys + difficulty */}
      <div>
        {/* speech */}
        <div style={{
          position: 'relative',
          background: '#fff',
          padding: '8px 14px',
          borderRadius: 12,
          border: '2.5px solid #0b3a5c',
          display: 'inline-block',
          marginBottom: 8,
        }}>
          {/* tail */}
          <div style={{
            position: 'absolute', left: -10, top: 14,
            width: 0, height: 0,
            borderTop: '8px solid transparent',
            borderBottom: '8px solid transparent',
            borderRight: '11px solid #0b3a5c',
          }} />
          <div style={{
            position: 'absolute', left: -7, top: 16,
            width: 0, height: 0,
            borderTop: '6px solid transparent',
            borderBottom: '6px solid transparent',
            borderRight: '8px solid #fff',
          }} />
          <div style={{ fontSize: 13.5, fontWeight: 900, color: '#0b3a5c', lineHeight: 1.4 }}>
            キーで動かして、ゴミを基地まで運んでね! <span style={{ color: '#ff5d3b' }}>たのしいよ!</span>
          </div>
        </div>

        {/* Keys + difficulty in 1 row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 14, alignItems: 'center' }}>
          {/* Big chunky keys — WASD cluster */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <FriendlyKey label="W" />
            <FriendlyKey label="A" />
            <FriendlyKey label="S" />
            <FriendlyKey label="D" />
            <span style={{ fontSize: 11, color: '#5d7898', margin: '0 4px' }}>or</span>
            <FriendlyKey label="↑" tone="#74d6c7" />
            <FriendlyKey label="↓" tone="#74d6c7" />
            <FriendlyKey label="←" tone="#74d6c7" />
            <FriendlyKey label="→" tone="#74d6c7" />
          </div>
          {/* Difficulty mascot row */}
          <div style={{ display: 'flex', gap: 6 }}>
            <DiffFriendly emoji="🐚" name="やさしい" tone="#74d6c7" />
            <DiffFriendly emoji="🐟" name="ふつう" tone="#4aa3ff" />
            <DiffFriendly emoji="🦈" name="むずかしい" tone="#ff7a59" />
          </div>
        </div>
      </div>
    </div>
  );
}

function FriendlyKey({ label, tone = '#0b3a5c' }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 30, height: 30, padding: 0,
      background: '#fff',
      color: tone,
      border: `2px solid ${tone}`,
      borderBottomWidth: 4,
      borderRadius: 6,
      fontFamily: 'ui-monospace, Menlo, monospace',
      fontSize: 14, fontWeight: 900,
      boxShadow: '0 2px 0 rgba(11,58,92,0.08)',
    }}>{label}</span>
  );
}

function DiffFriendly({ emoji, name, tone }) {
  return (
    <div style={{
      flex: 1, background: '#fff',
      borderTop: `3px solid ${tone}`,
      padding: '4px 6px 5px',
      borderRadius: 4,
      textAlign: 'center',
      boxShadow: '0 1px 3px rgba(11,58,92,0.08)',
    }}>
      <div style={{ fontSize: 18, lineHeight: 1 }}>{emoji}</div>
      <div style={{ fontSize: 10.5, fontWeight: 900, color: '#0b3a5c', marginTop: 1 }}>{name}</div>
    </div>
  );
}

function ParadoxGraphM() {
  return (
    <svg viewBox="0 0 420 100" width="100%">
      <line x1="40" y1="80" x2="400" y2="80" stroke="#fff" strokeWidth="1.4" opacity="0.6" />
      <line x1="40" y1="80" x2="40" y2="10" stroke="#fff" strokeWidth="1.4" opacity="0.6" />
      <g fontSize="9" fill="#cfe9f3" textAnchor="middle">
        <text x="100" y="95">1台</text><text x="180" y="95">3台</text>
        <text x="260" y="95">5台</text><text x="340" y="95">7台</text>
      </g>
      <polyline points="100,72 180,56 260,36 340,16" fill="none" stroke="#ffd84d" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
      <g fill="#ffd84d">
        <circle cx="100" cy="72" r="3.5" /><circle cx="180" cy="56" r="3.5" />
        <circle cx="260" cy="36" r="3.5" /><circle cx="340" cy="16" r="3.5" />
      </g>
      <text x="340" y="8" textAnchor="middle" fontSize="9.5" fontWeight="800" fill="#ffd84d">渋滞↑</text>
    </svg>
  );
}

function RelMapMerged() {
  return (
    <svg viewBox="0 0 880 180" width="100%" style={{ display: 'block' }}>
      <defs>
        <marker id="arrM" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0,0 L10,5 L0,10 Z" fill="#0b3a5c" />
        </marker>
        <marker id="arrMc" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0,0 L10,5 L0,10 Z" fill="#ff5d3b" />
        </marker>
        <marker id="arrMt" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0,0 L10,5 L0,10 Z" fill="#1ea99c" />
        </marker>
      </defs>
      <RelNodeM x={120} y={50} accent="#f0a93c" iconKind="scout" label="スカウト" sub="観測" />
      <RelNodeM x={440} y={50} accent="#4aa3ff" iconKind="collector" label="回収ロボット" sub="行動" />
      <RelNodeM x={760} y={50} accent="#9aa1a8" iconKind="trash" label="海のごみ" sub="環境" />
      <RelNodeM x={300} y={140} accent="#2cc8b9" iconKind="fish" label="魚 (群れ)" sub="生態系" />
      <RelNodeM x={620} y={140} accent="#6f3f99" iconKind="orca" label="シャチ" sub="捕食者" />

      <path d="M 178 50 L 380 50" stroke="#0b3a5c" strokeWidth="2.2" fill="none" markerEnd="url(#arrM)" />
      <text x="279" y="40" textAnchor="middle" fontSize="11" fontWeight="800" fill="#0b3a5c">①ゴミの場所を伝える</text>

      <path d="M 500 50 L 700 50" stroke="#0b3a5c" strokeWidth="2.2" fill="none" markerEnd="url(#arrM)" />
      <text x="600" y="40" textAnchor="middle" fontSize="11" fontWeight="800" fill="#0b3a5c">②拾って基地へ運ぶ</text>

      <path d="M 560 140 L 360 140" stroke="#ff5d3b" strokeWidth="2.2" fill="none" markerEnd="url(#arrMc)" />
      <text x="460" y="132" textAnchor="middle" fontSize="11" fontWeight="800" fill="#ff5d3b">③シャチが魚を追う</text>

      <path d="M 305 112 C 340 90, 370 74, 400 72" stroke="#1ea99c" strokeWidth="2.2" strokeDasharray="5 3" fill="none" markerEnd="url(#arrMt)" />
      <text x="300" y="92" textAnchor="middle" fontSize="11" fontWeight="800" fill="#1ea99c">④よけられる</text>

      <path d="M 360 158 C 520 180, 680 130, 738 80" stroke="#516573" strokeWidth="2" strokeDasharray="4 3" fill="none" markerEnd="url(#arrM)" />
      <text x="560" y="178" textAnchor="middle" fontSize="11" fontWeight="800" fill="#516573">⑤魚がゴミを食べてしまう</text>
    </svg>
  );
}

function RelNodeM({ x, y, accent, iconKind, label, sub }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <rect x={-66} y={-24} width={132} height={48} rx={4} fill="#fff" stroke={accent} strokeWidth="2.5" />
      <foreignObject x={-62} y={-20} width={40} height={40}>
        <div style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <AgentChip kind={iconKind} size={40} />
        </div>
      </foreignObject>
      <text x={20} y={-2} textAnchor="middle" fontSize="12" fontWeight="900" fill="#0b3a5c">{label}</text>
      <text x={20} y={14} textAnchor="middle" fontSize="9" fill="#5d7898" style={{ letterSpacing: '0.12em' }}>{sub}</text>
    </g>
  );
}

Object.assign(window, { DirMerged });
