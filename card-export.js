// Builds the shareable per-player artifacts: a self-contained HTML card and a
// 1200x630 link-preview PNG. Both are downloaded and committed to the repo.

const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const POS_CODES = {
  goalkeeper: "GK", keeper: "GK", "goal keeper": "GK",
  sweeper: "SW", "center back": "CB", "centre back": "CB", "centre-back": "CB", "center-back": "CB",
  "left back": "LB", "right back": "RB", "full back": "FB", "wing back": "WB", defender: "CB", "center half": "CB",
  "defensive midfielder": "CDM", "center defensive midfielder": "CDM", "holding midfielder": "CDM",
  "center midfielder": "CM", "centre midfielder": "CM", midfielder: "CM", "central midfielder": "CM",
  "attacking midfielder": "CAM", "left midfielder": "LM", "right midfielder": "RM",
  "left wing": "LW", "left winger": "LW", "right wing": "RW", "right winger": "RW", winger: "W",
  striker: "ST", forward: "ST", "center forward": "CF", "second striker": "SS"
};
function inkOn(hex) {
  var h = String(hex || "").replace("#", "");
  if (h.length !== 6) return "#f3f2f2";
  var c = [0, 2, 4].map(function (i) {
    var v = parseInt(h.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  var lum = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  return lum > 0.42 ? "#201e1d" : "#f3f2f2";
}
function posCodeFor(text) {
  return String(text || "").split(/[\/,&]|\bor\b/).map(function (part) {
    var k = part.trim().toLowerCase().replace(/\s+/g, " ");
    if (!k) return "";
    if (POS_CODES[k]) return POS_CODES[k];
    if (/^[a-z]{2,4}$/.test(k)) return k.toUpperCase();
    return k.split(" ").map(function (w) { return w[0]; }).join("").toUpperCase().slice(0, 3);
  }).filter(Boolean).join(" / ");
}

export const slugify = (p) =>
  ((p.first || "") + "-" + (p.last || "") + "-" + (p.gradYear || "")).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "player";

const num = (v) => {
  const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ""));
  return isFinite(n) ? n : 0;
};
const pct = (st) => {
  const mx = num(st.max);
  return mx > 0 ? Math.max(3, Math.min(100, (num(st.value) / mx) * 100)) : 0;
};
const lines = (s) => String(s || "").split("\n").map((l) => l.trim()).filter(Boolean);

function embedUrl(film) {
  const yt = String(film || "").match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([A-Za-z0-9_-]{6,})/);
  if (yt) return "https://www.youtube.com/embed/" + yt[1] + "?rel=0";
  const vm = String(film || "").match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) return "https://player.vimeo.com/video/" + vm[1];
  return "";
}

export function buildCardHtml(p, photo, siteUrl) {
  const slug = slugify(p);
  const base = String(siteUrl || "").replace(/\/+$/, "");
  const pageUrl = base + "/cards/" + slug + ".html";
  const imgUrl = base + "/cards/" + slug + ".png";
  const name = ((p.first || "") + " " + (p.last || "")).trim();
  const title = name + " — " + (p.positions || "") + ", Class of " + (p.gradYear || "");
  const desc = [p.hs, p.club, p.height + " · " + p.weight, "GPA " + p.gpa].filter(Boolean).join(" · ");
  const stats = (p.stats || []).filter((s) => s.label);
  const film = embedUrl(p.film);
  const games = parseInt(String(p.gamesPlayed || "0").replace(/[^0-9]/g, ""), 10) || 0;
  const statsMode = p.showStats || "auto";
  const showStats = statsMode === "on" || (statsMode === "auto" && games >= (p.statsMinGames || 6));
  const teamData = ["hs", "club"].reduce(function (acc, id) {
    const fill = p[id + "Color"] || (id === "club" ? "#ec3013" : "#1b2a4a");
    acc[id] = {
      number: "#" + (p[id + "Number"] || ""),
      code: String(p[id + "PosShort"] || "").trim() || posCodeFor(p[id + "Positions"]),
      positions: p[id + "Positions"] || "",
      color: fill, ink: inkOn(fill)
    };
    return acc;
  }, {});
  const posCode = teamData.hs.code;
  const frontFacts = [
    ["Class", p.gradYear], ["Height", p.height],
    ["Weight", String(p.weight || "").replace(/\s*(lb|lbs|pounds)\.?$/i, "")],
    ["Foot", p.foot], ["GPA", p.gpa]
  ].filter(function (r) { return r[1]; });

  const statCell = (s) => `<div class="cell"><div class="big">${esc(s.value)}</div><div class="lbl">${esc(s.label)}</div></div>`;
  const bar = (s) => `<div class="row"><div class="rowtop"><span class="lbl">${esc(s.label)}</span><span class="val">${esc(s.value)}</span></div><div class="track"><i style="width:${pct(s).toFixed(1)}%"></i></div></div>`;
  const teamBlock = (kicker, name, bits, cls, coach) => !name ? "" :
    '<div class="tb' + (cls ? " " + cls : "") + '">' + (kicker ? '<div class="lbl">' + esc(kicker) + "</div>" : "") +
    '<div class="tn">' + esc(name) + '</div><div class="td">' + esc(bits.filter(Boolean).join(" · ")) + "</div>" +
    (coach && coach.name ? '<div class="tc"><div class="tcn">' + esc(coach.name) + "</div>" +
      (coach.email ? '<a href="mailto:' + esc(coach.email) + '">' + esc(coach.email) + "</a>" : "") +
      (coach.phone ? '<a href="tel:' + esc(String(coach.phone).replace(/[^0-9+]/g, "")) + '">' + esc(coach.phone) + "</a>" : "") +
      "</div>" : "") + "</div>";
  const fact = (l, v) => `<div><div class="lbl">${esc(l)}</div><div class="fact">${esc(v)}</div></div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:type" content="profile">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(pageUrl)}">
<meta property="og:image" content="${esc(imgUrl)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${esc(imgUrl)}">
<meta name="theme-color" content="#201e1d">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;800;900&display=swap" rel="stylesheet">
<style>
:root{--bg:#f3f2f2;--ink:#201e1d;--red:#ec3013;--act:${teamData.hs.color};--acti:${teamData.hs.ink};--n3:#d7d3d3;--n6:#7d7979;--n7:#605d5d;--div:rgba(32,30,29,.4)}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font-family:Archivo,system-ui,sans-serif;font-size:15px;line-height:1.55;
 display:flex;flex-direction:column;align-items:center;gap:14px;padding:clamp(10px,3.5vw,40px)}
.stage{width:min(380px,100%);perspective:1400px}
.flipper{position:relative;height:clamp(500px,80vh,600px);transform-style:preserve-3d;transition:transform .62s cubic-bezier(.22,.61,.36,1)}
.flipped{transform:rotateY(180deg)}
.face{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;border:2px solid var(--ink);background:var(--bg);
 box-shadow:0 3px 10px rgba(45,43,43,.16);display:flex;flex-direction:column;overflow:hidden}
.back{transform:rotateY(180deg)}
.band{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 16px;background:var(--ink);color:var(--bg)}
.band2{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(0,1fr);background:var(--ink);color:var(--bg)}
.bcell{appearance:none;font-family:inherit;text-align:left;cursor:pointer;border:0;padding:8px 16px 10px;min-width:0;min-height:44px;
 background:transparent;color:var(--bg);transition:background 200ms ease}
.bcell+.bcell{border-left:1px solid rgba(243,242,242,.32)}
.bcell[aria-pressed=true]{background:var(--act);color:var(--acti);box-shadow:inset 0 3px 0 var(--acti)}
.bcell[aria-pressed=false]{opacity:.62}
.bcell[aria-pressed=true] .bk{opacity:.85}
.bk{font-size:8px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;opacity:.7}
.bn{font-weight:800;font-size:11px;line-height:1.2;letter-spacing:.04em;text-transform:uppercase;margin-top:2px}
.bs{font-size:9px;letter-spacing:.1em;text-transform:uppercase;opacity:.7;margin-top:2px}
.gh{display:flex;align-items:baseline;justify-content:space-between;gap:8px;border-bottom:2px solid var(--ink);padding-bottom:5px;margin:0 0 12px}
.gh b{font-weight:800;font-size:11px;letter-spacing:.14em;text-transform:uppercase}
.gh span{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--n6)}
.tb{padding-left:12px;border-left:2px solid var(--ink);margin-bottom:12px}
.tb.club{border-left-color:var(--red)}
.tb .tn{font-weight:800;font-size:14px;line-height:1.25;margin-top:2px}
.tb .td{font-size:12px;color:var(--n7);margin-top:1px}
.tc{margin-top:5px;display:flex;flex-direction:column}
.tcn{font-size:12px;font-weight:600}
.tc a{font-size:12px;display:inline-block;padding:5px 0;width:fit-content}
.band b{font-weight:800;font-size:12px;letter-spacing:.14em;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.band span{font-size:11px;letter-spacing:.12em;text-transform:uppercase;opacity:.75;white-space:nowrap}
.shot{position:relative;flex:1 1 auto;min-height:0;overflow:hidden;background:var(--n3);cursor:pointer}
.shot img{width:100%;height:100%;object-fit:cover;object-position:50% 22%;filter:grayscale(1) contrast(1.08);display:block}
.no{position:absolute;left:0;bottom:0;background:var(--act);color:var(--acti);transition:background 200ms ease;font-weight:900;font-size:34px;line-height:1;padding:8px 12px 9px}
.nrow{display:flex;align-items:flex-end;justify-content:space-between;gap:12px}
.pcode{flex:0 0 auto;text-align:right}
.pk{font-size:8px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:var(--n6)}
.pv{font-weight:900;line-height:.92;letter-spacing:-.03em;white-space:nowrap;margin-top:1px}
.name{padding:16px 16px 12px;border-top:2px solid var(--ink)}
.name .f{font-weight:900;font-size:15px;letter-spacing:.16em;text-transform:uppercase;color:var(--n6)}
.name .l{font-weight:900;font-size:34px;line-height:.98;letter-spacing:-.02em;text-transform:uppercase;margin-top:2px}
.meta{display:flex;flex-wrap:wrap;gap:4px 10px;margin-top:8px;font-size:12px;color:var(--n7)}
.strip{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(0,1fr);border-top:2px solid var(--ink)}
.cell{padding:9px 8px 11px;border-left:1px solid var(--div)}
.big{font-weight:900;font-size:17px;line-height:1;white-space:nowrap}
.cell .lbl{font-size:8px;margin-top:4px}
.lbl{font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:var(--n6);margin-top:3px}
.flipbtn{appearance:none;cursor:pointer;border:0;border-top:2px solid var(--ink);background:var(--ink);color:var(--bg);font-family:inherit;
 font-weight:800;font-size:11px;letter-spacing:.14em;text-transform:uppercase;text-align:left;padding:13px 16px;min-height:44px}
.flipbtn:hover{background:var(--act);color:var(--acti)}
.tabs{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(0,1fr);border-bottom:2px solid var(--ink)}
.tab{appearance:none;cursor:pointer;background:transparent;border:0;border-left:1px solid var(--div);border-bottom:3px solid transparent;color:var(--n6);
 font-family:inherit;font-weight:800;font-size:11px;letter-spacing:.12em;text-transform:uppercase;text-align:left;padding:12px;min-height:44px}
.tab[aria-selected=true]{color:var(--ink);border-bottom-color:var(--red)}
.pane{flex:1 1 auto;min-height:0;overflow-y:auto;padding:16px;-webkit-overflow-scrolling:touch}
.pane[hidden]{display:none}
.pane p{font-size:13.5px;line-height:1.6;margin:0 0 12px;text-wrap:pretty}
.rule{height:2px;background:var(--div);margin:12px 0}
.facts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.fact{font-weight:800;font-size:14px;margin-top:2px}
.row{margin-bottom:12px}
.rowtop{display:flex;align-items:baseline;justify-content:space-between;gap:8px}
.rowtop .lbl{margin:0;font-size:10px;color:var(--n7)}
.val{font-weight:900;font-size:15px}
.track{height:8px;background:var(--n3);margin-top:5px}
.track i{display:block;height:100%;background:var(--red)}
.frame{position:relative;width:100%;aspect-ratio:16/9;border:1px solid var(--ink);background:var(--ink)}
.frame iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
.empty{border:2px dashed #bab6b6;padding:24px 16px;font-size:12px;color:var(--n7)}
ul{margin:6px 0 0;padding:0;list-style:none;display:flex;flex-direction:column;gap:5px}
li{font-size:12.5px;padding-left:12px;border-left:2px solid var(--red)}
.sheet{width:min(380px,100%);display:flex;flex-direction:column;gap:8px}
.act{appearance:none;cursor:pointer;font-family:inherit;font-weight:800;font-size:13px;letter-spacing:.02em;text-align:left;
 padding:14px 16px;min-height:48px;border:1px solid var(--div);background:transparent;color:var(--ink);text-decoration:none;display:block}
.act:hover{background:rgba(32,30,29,.07)}
.act.primary{background:var(--red);color:var(--bg);border-color:var(--red)}
.act.primary:hover{background:#dd2b0f}
.crow{display:flex;flex-wrap:wrap;gap:8px 12px;align-items:center;justify-content:space-between;border:1px solid var(--div);padding:12px 16px}
.cmeta{min-width:0}
.cn{font-weight:800;font-size:15px;margin-top:2px}
.ct{font-size:12px;color:var(--n7)}
.cacts{display:flex;gap:8px;flex:0 0 auto}
.cacts .act{border:1px solid var(--div);padding:10px 18px;min-height:44px;font-size:12px}
.foot{width:min(380px,100%);font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--n6)}
:focus{outline:none}:focus-visible{outline:2px solid var(--red);outline-offset:2px}
::selection{background:rgba(236,48,19,.3)}
</style>
</head>
<body>
<div class="stage">
  <div class="flipper" id="flipper">
    <div class="face">
      <div class="band2" role="group" aria-label="Choose team">
        <button class="bcell" type="button" data-team="hs" aria-pressed="true"><div class="bk">School</div><div class="bn">${esc(p.hsTeam)}</div><div class="bs">${esc(p.hsSeason)}</div></button>
        <button class="bcell" type="button" data-team="club" aria-pressed="false"><div class="bk">Club</div><div class="bn">${esc(p.clubTeam)}</div><div class="bs">${esc(p.clubSeason)}</div></button>
      </div>
      <div class="shot" id="shot" role="button" tabindex="0" aria-label="Flip card">
        <img src="${photo}" alt="${esc(name)}">
        <div class="no" id="jersey">${esc(teamData.hs.number)}</div>
      </div>
      <div class="name">
        <div class="nrow">
          <div style="min-width:0">
            <div class="f">${esc(p.first)}</div>
            <div class="l">${esc(p.last)}</div>
          </div>
          <div class="pcode">
            <div class="pk">Position</div>
            <div class="pv" id="poscode" style="font-size:${posCode.length > 3 ? "24px" : "42px"}">${esc(posCode)}</div>
          </div>
        </div>
        <div class="meta"><span>${esc(p.city)}</span><span>/</span><span>Age ${esc(p.age)}</span><span>/</span><span>${esc(p.height)} · ${esc(p.weight)}</span></div>
      </div>
      <div class="strip">${frontFacts.map(function (r) { return '<div class="cell"><div class="big">' + esc(r[1]) + '</div><div class="lbl">' + esc(r[0]) + "</div></div>"; }).join("")}</div>
      <button class="flipbtn" type="button" data-flip>${["Bio", showStats ? "Stats" : "", "Film"].filter(Boolean).join(" · ")} →</button>
    </div>
    <div class="face back">
      <div class="band"><b>${esc(name.toUpperCase())}</b><span>#${esc(p.number)}</span></div>
      <div class="tabs" role="tablist">
        <button class="tab" type="button" role="tab" aria-selected="true" data-tab="bio">Bio</button>
        ${showStats ? '<button class="tab" type="button" role="tab" aria-selected="false" data-tab="stats">Stats</button>' : ""}
        <button class="tab" type="button" role="tab" aria-selected="false" data-tab="film">Film</button>
      </div>
      <div class="pane" data-pane="bio">
        <p>${esc(p.bio)}</p>
        <div class="rule"></div>
        ${teamBlock("School", p.hsTeam, [p.hsRole, p.hsSeason], "", { name: p.hsCoachName, email: p.hsCoachEmail, phone: p.hsCoachPhone })}
        ${teamBlock("Club", p.clubTeam, [p.clubRole, p.clubSeason], "club", { name: p.clubCoachName, email: p.clubCoachEmail, phone: p.clubCoachPhone })}
        ${lines(p.otherTeams).filter(function (l) {
          var key = l.split("|")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
          return !["hsTeam", "clubTeam"].some(function (k) {
            var team = String(p[k] || "").toLowerCase().replace(/[^a-z0-9]/g, "");
            return team && key && (team.indexOf(key) === 0 || key.indexOf(team) === 0);
          });
        }).map((l) => teamBlock("", l.split("|")[0], [(l.split("|")[1] || "")])).join("")}
        <div class="rule"></div>
        <div class="lbl">Awards</div>
        <ul>${lines(p.awards).map((l) => "<li>" + esc(l) + "</li>").join("")}</ul>
      </div>
      ${!showStats ? "" : `<div class="pane" data-pane="stats" hidden>
        ${[["hs", "School", p.hsSeason], ["club", "Club", p.clubSeason]].map(function (g) {
          var rows = stats.filter(function (st) { return (st.team || "hs") === g[0]; });
          if (!rows.length) return "";
          return '<div class="gh"><b>' + esc(g[1]) + "</b><span>" + esc(g[2]) + "</span></div>" + rows.map(bar).join("");
        }).join("")}
        <div class="lbl">${esc([p.season, games ? "through " + games + (games === 1 ? " game" : " games") : ""].filter(Boolean).join(" · "))}</div>
      </div>`}
      <div class="pane" data-pane="film" hidden>
        ${film ? `<div class="frame"><iframe src="${esc(film)}" title="Highlights" allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture" allowfullscreen></iframe></div>`
               : `<div class="empty">No highlight reel linked yet.</div>`}
      </div>
      <button class="flipbtn" type="button" data-flip>← Back to front</button>
    </div>
  </div>
</div>

<div class="sheet">
  ${[["hs", "School"], ["club", "Club"]].map(function (g, i) {
    var cn = p[g[0] + "CoachName"], ce = p[g[0] + "CoachEmail"], cp = p[g[0] + "CoachPhone"];
    if (!cn) return "";
    var subj = encodeURIComponent(name + " — " + (teamData[g[0]].code || "") + ", Class of " + (p.gradYear || ""));
    return '<div class="crow">' +
      '<div class="cmeta"><div class="lbl">' + esc(g[1]) + ' coach</div><div class="cn">' + esc(cn) + "</div>" +
      '<div class="ct">' + esc(p[g[0] + "CoachTitle"] || "") + "</div></div>" +
      '<div class="cacts">' +
      (ce ? '<a class="act' + (i === 0 ? " primary" : "") + '" href="mailto:' + esc(ce) + "?subject=" + subj + '">Email</a>' : "") +
      (cp ? '<a class="act" href="tel:' + esc(String(cp).replace(/[^0-9+]/g, "")) + '">Call</a>' : "") +
      "</div></div>";
  }).join("")}
  <button class="act" type="button" id="share">Share this card</button>
</div>
<div class="foot">${esc(p.hs)} · ${esc(p.city)} · Tap the photo to flip</div>

<script>
(function () {
  var f = document.getElementById("flipper");
  function flip() { f.classList.toggle("flipped"); }
  document.querySelectorAll("[data-flip]").forEach(function (b) { b.addEventListener("click", flip); });
  var shot = document.getElementById("shot");
  shot.addEventListener("click", flip);
  shot.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flip(); } });
  document.querySelectorAll(".tab").forEach(function (t) {
    t.addEventListener("click", function () {
      document.querySelectorAll(".tab").forEach(function (o) { o.setAttribute("aria-selected", String(o === t)); });
      document.querySelectorAll("[data-pane]").forEach(function (pn) { pn.hidden = pn.getAttribute("data-pane") !== t.getAttribute("data-tab"); });
    });
  });
  var stage = document.querySelector(".stage");
  if (matchMedia("(hover: hover) and (pointer: fine)").matches) {
    stage.addEventListener("mousemove", function (e) {
      var r = stage.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      f.style.setProperty("--tx", (x * 9).toFixed(2) + "deg");
      stage.style.transform = "rotateY(" + (x * 9).toFixed(2) + "deg) rotateX(" + (-y * 9).toFixed(2) + "deg)";
      stage.style.transformStyle = "preserve-3d";
      stage.style.transition = "transform 140ms ease-out";
    });
    stage.addEventListener("mouseleave", function () { stage.style.transform = ""; });
  }
  var TEAMS = ${JSON.stringify(teamData)};
  var jersey = document.getElementById("jersey"), poscode = document.getElementById("poscode");
  document.querySelectorAll(".bcell").forEach(function (cell) {
    cell.addEventListener("click", function () {
      var t = TEAMS[cell.getAttribute("data-team")];
      if (!t) return;
      document.querySelectorAll(".bcell").forEach(function (o) { o.setAttribute("aria-pressed", String(o === cell)); });
      document.documentElement.style.setProperty("--act", t.color);
      document.documentElement.style.setProperty("--acti", t.ink);
      jersey.textContent = t.number;
      poscode.textContent = t.code;
      poscode.style.fontSize = t.code.length > 3 ? "24px" : "42px";
    });
  });
  var btn = document.getElementById("share");
  btn.addEventListener("click", function () {
    var url = location.href, title = document.title;
    if (navigator.share) { navigator.share({ title: title, text: title, url: url }).catch(function () {}); return; }
    try { navigator.clipboard.writeText(url); btn.textContent = "Link copied"; setTimeout(function () { btn.textContent = "Share this card"; }, 1800); } catch (e) {}
  });
})();
</script>
</body>
</html>`;
}

// 1200x630 link preview: the image texts/Slack/Twitter show above the link.
export async function buildPreviewPng(p, photo) {
  const W = 1200, H = 630;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const x = c.getContext("2d");
  x.fillStyle = "#f3f2f2"; x.fillRect(0, 0, W, H);

  const photoW = 430;
  try {
    const img = await new Promise((res, rej) => {
      const i = new Image();
      i.crossOrigin = "anonymous";
      i.onload = () => res(i); i.onerror = rej; i.src = photo;
    });
    const s = Math.max(photoW / img.width, H / img.height);
    const dw = img.width * s, dh = img.height * s;
    x.save();
    x.beginPath(); x.rect(0, 0, photoW, H); x.clip();
    x.filter = "grayscale(1) contrast(1.08)";
    x.drawImage(img, (photoW - dw) / 2, (H - dh) * 0.18, dw, dh);
    x.restore();
  } catch (e) {
    x.fillStyle = "#d7d3d3"; x.fillRect(0, 0, photoW, H);
  }
  x.fillStyle = "#ec3013"; x.fillRect(0, H - 96, 150, 96);
  x.fillStyle = "#f3f2f2"; x.font = "900 62px Archivo, sans-serif";
  x.textBaseline = "alphabetic";
  x.fillText("#" + (p.number || ""), 24, H - 26);

  const L = photoW + 56;
  x.fillStyle = "#201e1d";
  x.font = "800 20px Archivo, sans-serif";
  x.fillText([p.hsTeam, p.clubTeam].filter(Boolean).join("   ·   ").toUpperCase(), L, 96);
  x.fillStyle = "#7d7979";
  x.font = "600 18px Archivo, sans-serif";
  x.fillText(String(p.season || "").toUpperCase(), L, 126);

  x.fillStyle = "#201e1d";
  x.font = "900 46px Archivo, sans-serif";
  x.fillText(String(p.first || "").toUpperCase(), L, 224);
  x.font = "900 92px Archivo, sans-serif";
  x.fillText(String(p.last || "").toUpperCase(), L, 306);

  x.fillStyle = "#ec3013"; x.fillRect(L, 340, 620, 4);
  x.fillStyle = "#201e1d";
  x.font = "600 24px Archivo, sans-serif";
  x.fillText([posCode, "Class of " + (p.gradYear || ""), p.height, p.weight].filter(Boolean).join("  ·  "), L, 386);
  x.fillStyle = "#605d5d";
  x.font = "400 22px Archivo, sans-serif";
  x.fillText([p.hs, p.city].filter(Boolean).join("  ·  "), L, 424);

  const stats = (p.stats || []).filter((s) => s.label).slice(0, 3);
  stats.forEach((s, i) => {
    const cx = L + i * 210;
    x.fillStyle = "#bab6b6"; x.fillRect(cx - 20, 480, 2, 84);
    x.fillStyle = "#201e1d"; x.font = "900 44px Archivo, sans-serif";
    x.fillText(String(s.value), cx, 522);
    x.fillStyle = "#7d7979"; x.font = "600 15px Archivo, sans-serif";
    x.fillText(String(s.label).toUpperCase().slice(0, 18), cx, 552);
  });

  return await new Promise((res) => c.toBlob(res, "image/png"));
}
