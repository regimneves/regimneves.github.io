/*!
 * softia-track.js — rastreamento leve de visitas (Softia)
 * Mede: pageview (com UTM + canal + device) e cliques em WhatsApp / Telegram / CTA.
 * Sem dependência, sem cookie. Grava na tabela `visitas` do Supabase via REST (chave pública).
 *
 * COMO USAR: coloque antes de </body> em qualquer site:
 *   <script defer src="/softia-track.js" data-site="softia"></script>
 * O data-site identifica o site. Se omitir, é deduzido pelo domínio.
 * Marque um botão/link como conversão de CTA com: data-cta="Testar grátis"
 */
(function () {
  "use strict";
  var SB  = "https://biivpxfqjwkcuehukqsu.supabase.co";
  var KEY = "sb_publishable_d2-fXyumtHDpDTzFjGjhdw_kts5ke48"; // chave pública (anon) — pode ficar exposta

  try {
    var script = document.currentScript;
    var q = new URLSearchParams(location.search);

    function mapHost(h) {
      h = (h || "").toLowerCase();
      if (h.indexOf("bemtevi") > -1) return "bemtevi";
      if (h.indexOf("gestao-vendas") > -1 || h.indexOf("gestao") > -1) return "gestao-vendas";
      if (h.indexOf("pecaguia") > -1) return "pecaguia";
      if (h.indexOf("gymgest-aluno") > -1) return "gymgest-aluno";
      if (h.indexOf("gymgest") > -1) return "gymgest";
      if (h.indexOf("softia") > -1) return "softia";
      return h.replace(/^www\./, "").split(".")[0] || "desconhecido";
    }

    var site = (script && script.getAttribute("data-site")) || mapHost(location.hostname);

    // id anônimo persistente do visitante
    var anon = "";
    try { anon = localStorage.getItem("sft_anon") || ""; } catch (e) {}
    if (!anon) {
      anon = "a" + Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
      try { localStorage.setItem("sft_anon", anon); } catch (e) {}
    }

    function norm(x) {
      x = (x || "").toLowerCase();
      if (/tik/.test(x)) return "tiktok";
      if (/link/.test(x)) return "linkedin";
      if (/insta|^ig$/.test(x)) return "instagram";
      if (/whats|^wa$/.test(x)) return "whatsapp";
      if (/telegram|^tg$/.test(x)) return "telegram";
      if (/google|cpc|busca|search|bing/.test(x)) return "busca";
      if (/face|^fb$/.test(x)) return "facebook";
      if (/you/.test(x)) return "youtube";
      return x;
    }

    function canal() {
      var us = q.get("utm_source");
      if (us) return norm(us);
      var r = document.referrer || "";
      if (!r) return "direto";
      var rh = "";
      try { rh = new URL(r).hostname.toLowerCase(); } catch (e) {}
      if (!rh) return "direto";
      if (rh.indexOf(location.hostname) > -1) return "direto"; // navegação interna
      if (/tiktok/.test(rh)) return "tiktok";
      if (/linkedin|lnkd/.test(rh)) return "linkedin";
      if (/instagram/.test(rh)) return "instagram";
      if (/whatsapp|wa\.me/.test(rh)) return "whatsapp";
      if (/t\.me|telegram/.test(rh)) return "telegram";
      if (/google|bing|duckduckgo|yahoo/.test(rh)) return "busca";
      if (/facebook|fb\./.test(rh)) return "facebook";
      if (/youtube|youtu\.be/.test(rh)) return "youtube";
      return "referral";
    }

    var isMobile = false;
    try { isMobile = window.matchMedia && matchMedia("(max-width:768px)").matches; } catch (e) {}

    function send(tipo, extra) {
      var body = {
        site: site,
        tipo: tipo,
        path: location.pathname || "/",
        referrer: document.referrer || null,
        utm_source: q.get("utm_source"),
        utm_medium: q.get("utm_medium"),
        utm_campaign: q.get("utm_campaign"),
        canal: canal(),
        device: isMobile ? "mobile" : "desktop",
        anon: anon,
        props: extra || {}
      };
      try {
        fetch(SB + "/rest/v1/visitas", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: KEY,
            Authorization: "Bearer " + KEY,
            Prefer: "return=minimal"
          },
          body: JSON.stringify(body),
          keepalive: true
        }).catch(function () {});
      } catch (e) {}
    }

    // 1 pageview por carregamento
    send("pageview");

    // cliques de conversão
    document.addEventListener("click", function (ev) {
      var a = ev.target && ev.target.closest ? ev.target.closest("a,[data-cta]") : null;
      if (!a) return;
      var href = (a.getAttribute && (a.getAttribute("href") || "")) || "";
      if (/wa\.me|api\.whatsapp\.com|whatsapp:\/\/|chat\.whatsapp/i.test(href)) {
        send("whatsapp_click", { href: href });
      } else if (/t\.me|telegram\.me|tg:\/\//i.test(href)) {
        send("telegram_click", { href: href });
      } else if (a.hasAttribute && a.hasAttribute("data-cta")) {
        send("cta_click", { href: href, label: (a.getAttribute("data-cta") || a.textContent || "").trim().slice(0, 60) });
      }
    }, true);
  } catch (e) { /* nunca quebra a página */ }
})();
