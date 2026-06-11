/*
 * Landing / predstavitvena stran — prevod potrjenega HTML predogleda
 * (mockupa landingpage2 / LandingPageAS) v Next.js.
 *
 * Namerno POPOLNOMA samostojna: brez importov, brez Tailwind razredov,
 * lasten CSS scopan s prefiksom .lp — stran se prevede pod katerokoli
 * konfiguracijo in ne more vplivati na ostale zaslone. Server komponenta,
 * nič JS na klientu. Naprave v heroju so narisane v CSS/SVG (brez slik).
 *
 * TODO(Alen): preveri spodnji konstanti, preden gre v produkcijo.
 */

export const metadata = {
  title: 'A-SPRINT Garage — Operacijski sistem za moderno servisno delavnico',
  description:
    'Delovni nalogi, stranke, vozila, skladišče, fotografije, delovni čas in portal stranke — vse na enem mestu.',
};

const LOGIN_URL = '/'; // potrjeno: root je vstop v aplikacijo (MarketingShell)
// Demo živi na ravni deploya (lib/demo), ne kot ruta — zato kaže na demo okolje.
// TODO: če lib/demo.ts pozna ?demo=1 ali podoben vklop, zamenjati s tem.
const DEMO_URL = 'https://workshop-os-delta.vercel.app';
const SIGNUP_URL = '/signup'; // potrjen — 14-dnevni preizkus (obstoječa ruta s stare strani)

const CSS = `
.lp{--navy:#0A1F3D;--navy2:#0E2950;--blue:#1A6BEF;--blue-dark:#1257C9;--blue-soft:#EAF1FD;
    --ink:#0F1B2D;--muted:#5B6B82;--line:#E3E9F2;--bg:#F5F7FB;--green:#16A34A;--amber:#F59E0B;
    font-family:'Inter',system-ui,-apple-system,sans-serif;color:var(--ink);background:#fff;line-height:1.55}
.lp,.lp *{box-sizing:border-box;margin:0;padding:0}
.lp a{text-decoration:none;color:inherit}
.lp .wrap{max-width:1180px;margin:0 auto;padding:0 24px}
.lp .btn{display:inline-flex;align-items:center;gap:8px;font-weight:700;font-size:14px;letter-spacing:.02em;white-space:nowrap;
  border-radius:10px;padding:13px 22px;border:1.5px solid transparent;cursor:pointer;transition:.15s}
.lp .btn:focus-visible{outline:3px solid #9CC0FF;outline-offset:2px}
.lp .btn-solid{background:var(--blue);color:#fff}
.lp .btn-solid:hover{background:var(--blue-dark)}
.lp .btn-outline{border-color:var(--blue);color:var(--blue);background:#fff}
.lp .btn-outline:hover{background:var(--blue-soft)}
.lp .btn-ghost{border-color:rgba(255,255,255,.45);color:#fff;background:transparent}
.lp .btn-ghost:hover{border-color:#fff;background:rgba(255,255,255,.08)}
.lp .btn-white{background:#fff;color:var(--blue)}
.lp .btn-white:hover{background:#EAF1FD}
.lp .micro{font-size:12px;color:var(--muted);margin-top:8px}

.lp .hd{position:sticky;top:0;z-index:50;background:var(--navy);color:#fff;box-shadow:0 2px 14px rgba(4,14,30,.35)}
.lp .nav{display:flex;align-items:center;gap:28px;height:68px}
.lp .nav nav{display:flex;gap:26px;margin-left:auto}
.lp .nav nav a{font-size:13px;font-weight:700;letter-spacing:.06em;color:#D7E2F2}
.lp .nav nav a:hover{color:#fff}
.lp .acts{display:flex;gap:10px;margin-left:18px}
.lp .acts .btn{padding:10px 16px;font-size:13px}
.lp .logo{display:flex;align-items:center;gap:10px}
.lp .logo-mark{width:38px;height:38px;border-radius:9px;background:linear-gradient(135deg,#2D7DFF,#5AA2FF);
  display:grid;place-items:center;font-weight:900;font-style:italic;font-size:22px;color:#fff;
  transform:skewX(-6deg);box-shadow:0 4px 12px rgba(45,125,255,.45)}
.lp .logo-text{line-height:1.05}
.lp .logo-text b{display:block;font-size:17px;font-weight:900;font-style:italic;letter-spacing:.02em;white-space:nowrap}
.lp .logo-text i{display:block;font-size:9px;letter-spacing:.42em;color:#9DB6D8;font-weight:700;font-style:normal;white-space:nowrap}

.lp .hero{background:linear-gradient(180deg,#E9F1FC 0%,#F7FAFE 70%,#fff 100%);overflow:hidden}
.lp .hero .wrap{display:grid;grid-template-columns:1.05fr 1fr;gap:48px;align-items:center;padding-top:64px;padding-bottom:72px}
.lp .hero h1{font-size:54px;font-weight:900;letter-spacing:-.02em;line-height:1.05}
.lp .hero h1 span{color:var(--blue)}
.lp .hero h2{font-size:21px;font-weight:800;margin-top:18px}
.lp .lead{margin-top:14px;color:var(--muted);font-size:16px;max-width:46ch}
.lp .cta{display:flex;gap:14px;margin-top:28px;flex-wrap:wrap}
.lp .cta>div{display:flex;flex-direction:column;align-items:center}
.lp .checks{display:grid;grid-template-columns:repeat(3,auto);gap:14px 28px;margin-top:34px;font-size:14px;font-weight:600}
.lp .checks li{list-style:none;display:flex;align-items:center;gap:9px}
.lp .checks svg{flex:0 0 auto}

.lp .device{position:relative;filter:drop-shadow(0 26px 40px rgba(10,31,61,.22))}
.lp .laptop{background:#0D1726;border-radius:18px 18px 6px 6px;padding:12px 12px 18px}
.lp .screen{background:#F3F6FB;border-radius:8px;overflow:hidden;display:grid;grid-template-columns:118px 1fr;min-height:330px}
.lp .side{background:#fff;border-right:1px solid var(--line);padding:12px 10px;font-size:9px;color:var(--muted)}
.lp .side .it{padding:7px 9px;border-radius:7px;margin-bottom:3px;font-weight:600;display:flex;gap:6px;align-items:center}
.lp .side .on{background:var(--blue-soft);color:var(--blue);font-weight:800}
.lp .dmain{padding:12px}
.lp .dmain h4{font-size:11px;font-weight:800;margin-bottom:9px}
.lp .stat3{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.lp .stat{background:#fff;border:1px solid var(--line);border-radius:9px;padding:9px 10px}
.lp .stat .l{font-size:8px;color:var(--muted);font-weight:700;letter-spacing:.04em}
.lp .stat .v{font-size:17px;font-weight:900;margin-top:2px}
.lp .stat .d{font-size:8px;font-weight:700;margin-top:2px}
.lp .up{color:var(--green)}
.lp .panel2{display:grid;grid-template-columns:1.15fr 1fr;gap:8px;margin-top:8px}
.lp .panel{background:#fff;border:1px solid var(--line);border-radius:9px;padding:10px}
.lp .panel .t{font-size:8.5px;font-weight:800;letter-spacing:.05em;color:var(--muted)}
.lp .rowi{display:flex;justify-content:space-between;align-items:center;font-size:8.5px;padding:5px 0;border-bottom:1px solid #EFF3F9}
.lp .rowi:last-child{border-bottom:0}
.lp .rowi b{font-weight:800}
.lp .chip{font-size:7.5px;font-weight:800;padding:2px 7px;border-radius:99px}
.lp .chip.go{background:#E5F6EC;color:#15803D}
.lp .chip.work{background:#FFF1E0;color:#B45309}
.lp .chip.new{background:var(--blue-soft);color:var(--blue)}
.lp .rev{font-size:15px;font-weight:900;margin-top:6px}
.lp .phone{position:absolute;right:-26px;bottom:-34px;width:148px;background:#0D1726;border-radius:22px;padding:8px;box-shadow:0 18px 36px rgba(10,31,61,.3)}
.lp .pscreen{background:#F3F6FB;border-radius:15px;padding:9px;min-height:208px}
.lp .pscreen h5{font-size:9px;font-weight:900;margin-bottom:7px}
.lp .pcard{background:#fff;border:1px solid var(--line);border-radius:8px;padding:7px 8px;margin-bottom:6px}
.lp .pcard .a{display:flex;justify-content:space-between;font-size:8px;font-weight:800}
.lp .pcard .b{font-size:7.5px;color:var(--muted);margin-top:1px}
.lp .pbtn{background:var(--blue);color:#fff;font-size:8px;font-weight:800;text-align:center;border-radius:7px;padding:6px;margin-top:2px}

.lp section{padding:72px 0}
.lp .sec-h{font-size:30px;font-weight:900;letter-spacing:-.01em;text-align:center}
.lp .cards3{display:grid;grid-template-columns:repeat(3,1fr);gap:22px;margin-top:38px}
.lp .role{background:var(--bg);border:1px solid var(--line);border-radius:14px;padding:26px}
.lp .role .ic{width:46px;height:46px;border-radius:11px;background:var(--blue);display:grid;place-items:center;margin-bottom:14px}
.lp .role h3{font-size:17px;font-weight:800}
.lp .role p{font-size:13.5px;color:var(--muted);margin-top:8px;min-height:64px}
.lp .role a{display:inline-flex;align-items:center;gap:6px;color:var(--blue);font-weight:800;font-size:13px;margin-top:10px}

.lp .feats{display:grid;grid-template-columns:repeat(9,1fr);gap:14px;margin-top:36px}
.lp .feat{background:#fff;border:1px solid var(--line);border-radius:12px;padding:18px 12px;text-align:center;transition:.15s}
.lp .feat:hover{box-shadow:0 10px 30px rgba(10,31,61,.08);transform:translateY(-2px);border-color:#CBD9F0}
.lp .feat .fi{color:var(--blue);display:grid;place-items:center;margin-bottom:10px}
.lp .feat b{display:block;font-size:12.5px;font-weight:800}
.lp .feat i{display:block;font-style:normal;font-size:10.5px;color:var(--muted);margin-top:5px;line-height:1.45}

.lp .why{background:linear-gradient(135deg,var(--navy) 0%,var(--navy2) 100%);color:#fff;padding:72px 0}
.lp .why .wrap{display:grid;grid-template-columns:1fr 1fr;gap:54px;align-items:center}
.lp .why h2{font-size:30px;font-weight:900}
.lp .cmp{width:100%;border-collapse:collapse;margin-top:26px;font-size:13.5px}
.lp .cmp th,.lp .cmp td{padding:10px 12px;text-align:center}
.lp .cmp th{font-size:11px;letter-spacing:.08em;color:#9DB6D8;font-weight:800}
.lp .cmp th:first-child,.lp .cmp td:first-child{text-align:left}
.lp .cmp tbody tr{border-top:1px solid rgba(255,255,255,.12)}
.lp .cmp td:first-child{font-weight:600}
.lp .cmp .as{background:var(--blue);font-weight:900;color:#fff}
.lp .cmp thead .as{border-radius:9px 9px 0 0}
.lp .cmp tbody tr:last-child .as{border-radius:0 0 9px 9px}
.lp .x{color:#6E84A6}
.lp .tri{color:var(--amber)}
.lp .tabwrap{display:grid;place-items:center}
.lp .tablet{width:88%;background:#101B2C;border-radius:20px;padding:11px;transform:rotate(-3deg);box-shadow:0 34px 60px rgba(0,0,0,.45)}
.lp .tscreen{background:#F3F6FB;border-radius:12px;padding:13px;color:var(--ink)}
.lp .tscreen h5{font-size:11px;font-weight:900;display:flex;justify-content:space-between;align-items:center}
.lp .tag{font-size:8px;background:var(--blue-soft);color:var(--blue);font-weight:800;padding:2px 8px;border-radius:99px}
.lp .trow{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px;font-size:9px}
.lp .tf{background:#fff;border:1px solid var(--line);border-radius:8px;padding:8px}
.lp .tf .l{color:var(--muted);font-size:7.5px;font-weight:700;letter-spacing:.05em}
.lp .tf .v{font-weight:800;margin-top:2px}
.lp .fotos{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}
.lp .foto{height:56px;border-radius:8px;display:grid;place-items:center;color:#3D5475;
  background:linear-gradient(135deg,#2D7DFF33,#0A1F3D22),repeating-linear-gradient(45deg,#D9E4F4 0 8px,#E8EFF9 8px 16px)}

.lp .band{background:var(--blue);color:#fff;padding:46px 0}
.lp .band .wrap{display:flex;align-items:center;justify-content:space-between;gap:26px;flex-wrap:wrap}
.lp .band h2{font-size:26px;font-weight:900}
.lp .band p{opacity:.92;margin-top:6px;font-size:14.5px}
.lp .band .bb{display:flex;gap:14px;flex-wrap:wrap}

.lp .ft{background:var(--navy);color:#C9D7EA;padding:46px 0 28px}
.lp .frow{display:grid;grid-template-columns:auto 1fr 1fr auto;gap:40px;align-items:start}
.lp .ft .b{color:#fff;font-weight:800}
.lp .ft small{display:block;font-size:12.5px;line-height:1.7}
.lp .fsoc{display:flex;gap:10px;margin-top:10px}
.lp .fsoc a{width:34px;height:34px;border:1px solid rgba(255,255,255,.25);border-radius:8px;display:grid;place-items:center}
.lp .fsoc a:hover{background:rgba(255,255,255,.08)}
.lp .fbot{border-top:1px solid rgba(255,255,255,.14);margin-top:34px;padding-top:18px;display:flex;justify-content:space-between;font-size:12px;color:#8AA2C4;flex-wrap:wrap;gap:8px}
.lp .fbot a{text-decoration:underline}

@media (prefers-reduced-motion:no-preference){
  .lp .rise{opacity:0;transform:translateY(14px);animation:lp-rise .6s ease forwards}
  .lp .d1{animation-delay:.08s}.lp .d2{animation-delay:.16s}.lp .d3{animation-delay:.24s}
  @keyframes lp-rise{to{opacity:1;transform:none}}
}
@media (max-width:1040px){
  .lp .hero .wrap{grid-template-columns:1fr;padding-top:44px}
  .lp .device{max-width:560px;margin:8px auto 30px}
  .lp .hero h1{font-size:42px}
  .lp .feats{grid-template-columns:repeat(3,1fr)}
  .lp .why .wrap{grid-template-columns:1fr}
  .lp .frow{grid-template-columns:1fr 1fr}
  .lp .nav nav{display:none}
}
@media (max-width:640px){
  .lp .cards3{grid-template-columns:1fr}
  .lp .feats{grid-template-columns:repeat(2,1fr)}
  .lp .checks{grid-template-columns:repeat(2,auto)}
  .lp .hero h1{font-size:34px}
  .lp .phone{right:-6px;width:124px}
  .lp .frow{grid-template-columns:1fr}
  .lp .nav{gap:10px;height:60px}
  .lp .acts{margin-left:auto;gap:7px}
  .lp .acts .btn{padding:8px 10px;font-size:11px;letter-spacing:0}
  .lp .logo{gap:7px}
  .lp .logo-mark{width:31px;height:31px;font-size:18px;border-radius:8px}
  .lp .logo-text b{font-size:13.5px}
  .lp .logo-text i{font-size:7px;letter-spacing:.3em}
}
`;

const Check = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1A6BEF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12.5 9.5 18 20 6.5" /></svg>
);
const Lock = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
);
const Play = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
);
const Cam = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="7" width="18" height="13" rx="2.5" /><circle cx="12" cy="13.5" r="3.4" /></svg>
);

const Logo = ({ light = false }: { light?: boolean }) => (
  <span className="logo">
    <span className="logo-mark">A</span>
    <span className="logo-text"><b style={light ? { color: '#fff' } : undefined}>A-SPRINT</b><i>G A R A G E</i></span>
  </span>
);

export default function Predstavitev() {
  return (
    <div className="lp">
      <style>{CSS}</style>

      {/* ====== glava ====== */}
      <div className="hd">
        <div className="wrap nav">
          <a href="/predstavitev" aria-label="A-SPRINT Garage — domov"><Logo light /></a>
          <nav aria-label="Glavna navigacija">
            <a href="#funkcionalnosti">FUNKCIONALNOSTI</a>
            <a href="#prednosti">PREDNOSTI</a>
            <a href="/cenik">CENIK</a>
            <a href="#kontakt">KONTAKT</a>
          </nav>
          <div className="acts">
            <a className="btn btn-ghost" href={LOGIN_URL}><Lock /> PRIJAVA V SISTEM</a>
            <a className="btn btn-solid" href={DEMO_URL}>DEMO</a>
          </div>
        </div>
      </div>

      {/* ====== hero ====== */}
      <div className="hero">
        <div className="wrap">
          <div>
            <h1 className="rise">A-SPRINT <span>Garage</span></h1>
            <h2 className="rise d1">Operacijski sistem za moderno servisno delavnico.</h2>
            <p className="lead rise d1">Delovni nalogi, stranke, vozila, material, skladišče, fotografije, delovni čas in portal stranke — vse na enem mestu.</p>
            <div className="cta rise d2">
              <div>
                <a className="btn btn-solid" href={SIGNUP_URL}><Play /> PREIZKUSI 14 DNI BREZPLAČNO</a>
                <span className="micro">Brez kartice · podatki ostanejo vaši</span>
              </div>
              <div>
                <a className="btn btn-outline" href={DEMO_URL}>PREIZKUSI DEMO</a>
                <span className="micro">Brez prijave · Takoj dostopno</span>
              </div>
            </div>
            <ul className="checks rise d3" aria-label="Ključne zmožnosti">
              <li><Check />Delovni nalogi</li>
              <li><Check />OCR tablic</li>
              <li><Check />Fotografije</li>
              <li><Check />Skladišče</li>
              <li><Check />Portal stranke</li>
              <li><Check />AI pomočnik</li>
            </ul>
          </div>

          {/* CSS prenosnik + telefon */}
          <div className="device rise d2" aria-hidden="true">
            <div className="laptop">
              <div className="screen">
                <div className="side">
                  <div className="it on">▦ Nadzorna plošča</div>
                  <div className="it">▤ Delovni nalogi</div>
                  <div className="it">▥ Vozila</div>
                  <div className="it">◉ Stranke</div>
                  <div className="it">▣ Skladišče</div>
                  <div className="it">▤ Računi</div>
                  <div className="it">◫ Portal stranke</div>
                  <div className="it">◷ Moj delovni čas</div>
                  <div className="it">⚙ Nastavitve</div>
                </div>
                <div className="dmain">
                  <h4>Nadzorna plošča</h4>
                  <div className="stat3">
                    <div className="stat"><div className="l">ODPRTI NALOGI</div><div className="v">24</div><div className="d up">↑ 12 % ta teden</div></div>
                    <div className="stat"><div className="l">V DELU</div><div className="v">8</div><div className="d up">↑ 5 % ta teden</div></div>
                    <div className="stat"><div className="l">ZAKLJUČENO</div><div className="v">36</div><div className="d up">↑ 18 % ta teden</div></div>
                  </div>
                  <div className="panel2">
                    <div className="panel">
                      <div className="t">ZADNJI NALOGI</div>
                      <div className="rowi"><span><b>DN-2026-00124</b><br />LJ-55-ZMK · Volvo FH Electric</span><span className="chip work">V delu</span></div>
                      <div className="rowi"><span><b>DN-2026-00123</b><br />LJ-77-ABC · Mercedes Actros</span><span className="chip new">Nov</span></div>
                      <div className="rowi"><span><b>DN-2026-00122</b><br />NM-86-DEF · MAN TGX</span><span className="chip go">Zaključeno</span></div>
                      <div className="rowi"><span><b>DN-2026-00121</b><br />KP-44-GHI · Scania R500</span><span className="chip work">V delu</span></div>
                    </div>
                    <div className="panel">
                      <div className="t">PRIHODKI</div>
                      <div className="rev">€ 23.450,00</div>
                      <div className="d up" style={{ fontSize: '8.5px', fontWeight: 700 }}>↑ 15 % ta mesec</div>
                      <svg width="100%" height="64" viewBox="0 0 180 64" preserveAspectRatio="none" style={{ marginTop: 6 }}>
                        <polyline points="0,52 22,46 44,49 66,38 88,42 110,28 132,33 154,18 180,12" fill="none" stroke="#1A6BEF" strokeWidth="2.5" strokeLinecap="round" />
                        <polyline points="0,52 22,46 44,49 66,38 88,42 110,28 132,33 154,18 180,12 180,64 0,64" fill="#1A6BEF18" stroke="none" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="phone">
              <div className="pscreen">
                <h5>Delovni nalogi</h5>
                <div className="pcard"><div className="a"><span>LJ-55-ZMK</span><span className="chip work">V delu</span></div><div className="b">Volvo FH Electric</div></div>
                <div className="pcard"><div className="a"><span>LJ-77-ABC</span><span className="chip new">Nov</span></div><div className="b">Mercedes Actros</div></div>
                <div className="pcard"><div className="a"><span>NM-86-DEF</span><span className="chip go">Zaključeno</span></div><div className="b">MAN TGX</div></div>
                <div className="pbtn">+ Nov nalog</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ====== za koga ====== */}
      <section>
        <div className="wrap">
          <h2 className="sec-h">Za koga je A-SPRINT Garage?</h2>
          <div className="cards3">
            <div className="role">
              <div className="ic"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><circle cx="9" cy="8" r="3.2" /><path d="M3.5 19c.6-3 2.8-4.5 5.5-4.5S13.9 16 14.5 19" /><circle cx="17" cy="9" r="2.4" /><path d="M15.5 14.6c2.5.1 4 1.5 4.5 3.9" /></svg></div>
              <h3>Servisni svetovalec</h3>
              <p>Od sprejema vozila do računa. Vse informacije, nalogi in stranke na enem mestu.</p>
              <a href="#funkcionalnosti">Več <span aria-hidden="true">→</span></a>
            </div>
            <div className="role">
              <div className="ic"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M14.5 6.5a4 4 0 0 0-5.6 4.9L4 16.3a2 2 0 1 0 2.8 2.8l4.9-4.9a4 4 0 0 0 4.9-5.6l-2.6 2.6-2.1-2.1z" /></svg></div>
              <h3>Mehanik</h3>
              <p>Urejanje delovnih nalogov, beleženje ur, dodajanje materiala in fotografij neposredno v delavnici.</p>
              <a href="#funkcionalnosti">Več <span aria-hidden="true">→</span></a>
            </div>
            <div className="role">
              <div className="ic"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M4 20V10M10 20V4M16 20v-7M21 20H3" /></svg></div>
              <h3>Lastnik</h3>
              <p>Pregled poslovanja v realnem času. Nadzorna plošča, poročila in statistike.</p>
              <a href="#prednosti">Več <span aria-hidden="true">→</span></a>
            </div>
          </div>
        </div>
      </section>

      {/* ====== funkcionalnosti ====== */}
      <section id="funkcionalnosti" style={{ paddingTop: 24 }}>
        <div className="wrap">
          <h2 className="sec-h">Vse funkcionalnosti na enem mestu</h2>
          <div className="feats">
            <div className="feat"><div className="fi"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2.5" y="8" width="17" height="9" rx="2.5" /><circle cx="7" cy="17.5" r="1.8" /><circle cx="16" cy="17.5" r="1.8" /><path d="M5 8l1.6-3h7l1.8 3" /></svg></div><b>Vozila</b><i>Evidence vozil in zgodovina servisov</i></div>
            <div className="feat"><div className="fi"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4.5V3h6v1.5M9 10h6M9 14h6M9 18h4" /></svg></div><b>Delovni nalogi</b><i>Ustvarjanje, sledenje in zaključevanje</i></div>
            <div className="feat"><div className="fi"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" /><path d="M4 7.5l8 4.5 8-4.5M12 12v9" /></svg></div><b>Skladišče</b><i>Zaloga, prevzem in dobavitelji</i></div>
            <div className="feat"><div className="fi"><Cam /></div><b>Fotografije</b><i>Fotografiraj vozila, poškodbe in dokumente</i></div>
            <div className="feat"><div className="fi"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3.5 2" /></svg></div><b>Evidenca ur</b><i>Natančno beleženje ur mehanikov</i></div>
            <div className="feat"><div className="fi"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M7 3h7l5 5v13H7z" /><path d="M14 3v5h5M10 13h6M10 17h6" /></svg></div><b>Računi</b><i>Hitro fakturiranje in izdaja računov</i></div>
            <div className="feat"><div className="fi"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="3.4" /><path d="M5 20c.8-3.6 3.4-5.4 7-5.4s6.2 1.8 7 5.4" /></svg></div><b>Portal stranke</b><i>Stranke imajo pregled nad svojimi vozili</i></div>
            <div className="feat"><div className="fi"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="4" y="7" width="16" height="12" rx="3" /><circle cx="9" cy="13" r="1.4" fill="currentColor" stroke="none" /><circle cx="15" cy="13" r="1.4" fill="currentColor" stroke="none" /><path d="M12 7V4M8 4h8" /></svg></div><b>AI pomočnik</b><i>Pametna pomoč pri nalogih in iskanju</i></div>
            <div className="feat"><div className="fi"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="6" width="18" height="12" rx="2.5" /><path d="M7 12h4" /><rect x="13.5" y="9.5" width="5" height="5" rx="1" /></svg></div><b>OCR tablic</b><i>Registrska tablica odpre nalog v sekundi</i></div>
          </div>
        </div>
      </section>

      {/* ====== zakaj ====== */}
      <section id="prednosti" className="why">
        <div className="wrap">
          <div>
            <h2>Zakaj A-SPRINT Garage?</h2>
            <table className="cmp">
              <thead>
                <tr><th>FUNKCIJA</th><th>EXCEL</th><th>PAPIR</th><th className="as">A-SPRINT</th></tr>
              </thead>
              <tbody>
                <tr><td>Delovni nalogi</td><td className="x">✕</td><td className="tri">△</td><td className="as">✓</td></tr>
                <tr><td>Fotografije</td><td className="x">✕</td><td className="x">✕</td><td className="as">✓</td></tr>
                <tr><td>OCR registrskih tablic</td><td className="x">✕</td><td className="x">✕</td><td className="as">✓</td></tr>
                <tr><td>Skladišče</td><td className="tri">△</td><td className="x">✕</td><td className="as">✓</td></tr>
                <tr><td>Portal stranke</td><td className="x">✕</td><td className="x">✕</td><td className="as">✓</td></tr>
                <tr><td>AI pomočnik</td><td className="x">✕</td><td className="x">✕</td><td className="as">✓</td></tr>
                <tr><td>Dostop od kjerkoli</td><td className="tri">△</td><td className="x">✕</td><td className="as">✓</td></tr>
                <tr><td>Varnost podatkov</td><td className="tri">△</td><td className="x">✕</td><td className="as">✓</td></tr>
              </tbody>
            </table>
          </div>
          <div className="tabwrap" aria-hidden="true">
            <div className="tablet">
              <div className="tscreen">
                <h5>Delovni nalog <span className="tag">LJ-55-ZMK</span></h5>
                <div className="trow">
                  <div className="tf"><div className="l">VOZILO</div><div className="v">Volvo FH Electric</div></div>
                  <div className="tf"><div className="l">STATUS</div><div className="v" style={{ color: '#B45309' }}>V delu</div></div>
                  <div className="tf"><div className="l">STRANKA</div><div className="v">Alpe Logistika d.o.o.</div></div>
                  <div className="tf"><div className="l">PREVZEM</div><div className="v">08.06.2026</div></div>
                </div>
                <div className="fotos">
                  <div className="foto"><Cam /></div>
                  <div className="foto"><Cam /></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====== zaupanje ====== */}
      <section>
        <div className="wrap">
          <h2 className="sec-h">Vaši podatki so vaši. Pika.</h2>
          <div className="cards3">
            <div className="role">
              <h3>Ločenost najemnikov</h3>
              <p>Vsaka delavnica je strogo izolirana na ravni baze (RLS), vsak dostop revidiran.</p>
            </div>
            <div className="role">
              <h3>Izvoz kadar koli</h3>
              <p>Celoten posnetek podatkov (GDPR) na en klik — tudi če naročnino prekinete.</p>
            </div>
            <div className="role">
              <h3>Zasnovano za EU</h3>
              <p>Gostovanje in AI obdelava sta načrtovana znotraj EU; pogodba o obdelavi (DPA) na voljo.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ====== CTA ====== */}
      <div className="band">
        <div className="wrap">
          <div>
            <h2>Pripravljeni na digitalno delavnico?</h2>
            <p>Registracija traja dve minuti. Prvi delovni nalog lahko odprete še danes.</p>
          </div>
          <div className="bb">
            <a className="btn btn-ghost" href="#kontakt">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3.5" y="5" width="17" height="16" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /></svg>
              ZAHTEVAJ PREDSTAVITEV
            </a>
            <a className="btn btn-white" href={SIGNUP_URL}>ZAČNI BREZPLAČNI PREIZKUS →</a>
          </div>
        </div>
      </div>

      {/* ====== noga ====== */}
      <footer className="ft" id="kontakt">
        <div className="wrap">
          <div className="frow">
            <a href="/predstavitev" aria-label="A-SPRINT Garage"><Logo light /></a>
            <small><span className="b">A-SPRINT d.o.o.</span><br />Železničarska cesta 28, 8340 Črnomelj, Slovenija</small>
            <small><a href="mailto:info@a-sprint.si">info@a-sprint.si</a><br /><a href="tel:+38640328279">+386 40 328 279</a></small>
            <div>
              <small><a className="b" href="https://www.a-sprint.si">www.a-sprint.si</a></small>
              <div className="fsoc">
                <a href="#" aria-label="Facebook"><svg width="15" height="15" viewBox="0 0 24 24" fill="#C9D7EA"><path d="M13.5 21v-7h2.4l.4-3h-2.8V9.1c0-.9.3-1.5 1.6-1.5h1.3V5c-.2 0-1-.1-1.9-.1-2 0-3.4 1.2-3.4 3.5V11H8.5v3h2.6v7z" /></svg></a>
                <a href="#" aria-label="LinkedIn"><svg width="15" height="15" viewBox="0 0 24 24" fill="#C9D7EA"><path d="M6.4 8.6H3.7V20h2.7zM5 7.4a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2zM20.3 13.7c0-3-1.6-4.4-3.7-4.4-1.7 0-2.5 1-2.9 1.6V8.6H11V20h2.7v-6c0-1.6.8-2.4 2-2.4s1.9.8 1.9 2.4v6h2.7z" /></svg></a>
              </div>
            </div>
          </div>
          <div className="fbot">
            <span>© 2026 A-SPRINT d.o.o. Vse pravice pridržane. · <a href="/pravno/pogoji">Pogoji uporabe</a> · <a href="/pravno/zasebnost">Zasebnost</a></span>
            <span>Powered by A-SPRINT d.o.o.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
