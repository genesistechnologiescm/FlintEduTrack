// Offline lessons renderer — deliberately plain JavaScript with no framework
// dependency, so this page works even when the app bundle can't load (no
// network). Reads lessons saved on-device by the student dashboard and builds
// DOM via textContent only (never innerHTML with data — XSS-safe).
(function () {
  var KEY = "edutrack.offline.lessons";
  var root = document.getElementById("offline-root");
  if (!root) return;

  var L = {
    en: {
      title: "My offline lessons",
      savedOn: "Saved",
      empty: "No lessons saved on this device yet. Open EduTrack while online and tap “Save lessons for offline”.",
      linkNeedsNet: "Link: open when you have internet",
      back: "← Dashboard",
    },
    fr: {
      title: "Mes leçons hors ligne",
      savedOn: "Enregistré",
      empty: "Aucune leçon enregistrée sur cet appareil. Ouvrez EduTrack en ligne et touchez « Enregistrer les leçons hors ligne ».",
      linkNeedsNet: "Lien : à ouvrir avec Internet",
      back: "← Tableau de bord",
    },
  };

  function el(tag, className, text) {
    var n = document.createElement(tag);
    if (className) n.className = className;
    if (text) n.textContent = text;
    return n;
  }

  var data = null;
  try {
    var raw = localStorage.getItem(KEY);
    if (raw) data = JSON.parse(raw);
  } catch (e) {
    data = null;
  }
  var t = L[(data && data.locale) === "fr" ? "fr" : "en"];

  var back = el("a", "font-mono text-xs uppercase tracking-widest text-flint-blue hover:underline", t.back);
  back.href = "/student";
  root.appendChild(back);
  root.appendChild(el("h1", "mt-1 font-display text-2xl font-bold text-flint-black", t.title));

  if (!data || !data.lessons || data.lessons.length === 0) {
    var empty = el("p", "mt-4 rounded-2xl border border-black/10 bg-white px-4 py-6 text-center text-muted", t.empty);
    root.appendChild(empty);
    return;
  }

  var meta = el(
    "p",
    "font-mono text-xs text-muted",
    (data.studentName ? data.studentName + " · " : "") + t.savedOn + " " + (data.savedAt || "").slice(0, 10)
  );
  root.appendChild(meta);

  for (var g = 0; g < data.lessons.length; g++) {
    var group = data.lessons[g];
    var section = el("section", "mt-4 rounded-2xl border border-black/10 bg-white p-5");
    section.appendChild(el("h2", "mb-2 font-mono text-xs uppercase tracking-widest text-muted", group.subject));
    for (var i = 0; i < (group.items || []).length; i++) {
      var item = group.items[i];
      var card = el("div", "mt-2 rounded-xl border border-black/10 bg-black/[0.02] p-3");
      card.appendChild(el("div", "font-medium text-flint-black", item.title));
      if (item.type === "NOTE" && item.body) {
        card.appendChild(el("p", "mt-1 whitespace-pre-wrap text-sm text-flint-black", item.body));
      } else if (item.type === "LINK") {
        var hint = el("p", "mt-1 font-mono text-xs text-muted", t.linkNeedsNet + (item.url ? " · " + item.url : ""));
        card.appendChild(hint);
      }
      section.appendChild(card);
    }
    root.appendChild(section);
  }
})();
