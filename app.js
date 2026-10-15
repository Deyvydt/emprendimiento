(() => {
  "use strict";

  /* ================= Datos / tracking ================= */
  const cfg = window.LANDING_CONFIG || {};
  const DB_ON = Boolean(cfg.supabaseUrl && cfg.supabaseAnonKey);
  const EMAIL_RE = /^[a-z0-9._%+-]+@utec\.edu\.pe$/i;
  const ref = new URLSearchParams(location.search).get("ref") || null;

  const safe = (fn, fallback = null) => { try { return fn(); } catch { return fallback; } };
  const sessionId = (() => {
    const make = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));
    let id = safe(() => sessionStorage.getItem("filtra_sid"));
    if (!id) { id = make(); safe(() => sessionStorage.setItem("filtra_sid", id)); }
    return id;
  })();

  if (!DB_ON) document.getElementById("demo-badge").hidden = false;

  // Las claves nuevas de Supabase (sb_publishable_…) no son JWT: van solo en `apikey`.
  function headers() {
    const h = { apikey: cfg.supabaseAnonKey, "Content-Type": "application/json", Prefer: "return=minimal" };
    if (!cfg.supabaseAnonKey.startsWith("sb_")) h.Authorization = `Bearer ${cfg.supabaseAnonKey}`;
    return h;
  }

  async function insert(table, row) {
    if (!DB_ON) {
      const key = `filtra_demo_${table}`;
      const rows = safe(() => JSON.parse(localStorage.getItem(key)), null) || [];
      if (table === "leads" && rows.some(r => r.email === row.email)) return { status: 409 };
      rows.push({ ...row, created_at: new Date().toISOString() });
      safe(() => localStorage.setItem(key, JSON.stringify(rows)));
      console.info(`[demo] ${table}`, row);
      return { status: 201 };
    }
    try {
      const res = await fetch(`${cfg.supabaseUrl.replace(/\/$/, "")}/rest/v1/${table}`, {
        method: "POST", headers: headers(), body: JSON.stringify(row), keepalive: true,
      });
      return { status: res.status };
    } catch {
      return { status: 0 };
    }
  }

  const track = (type, source = null) => insert("events", { type, source, ref, session_id: sessionId });

  track("visit");

  /* ================= Nav + reveal ================= */
  const nav = document.querySelector(".nav");
  addEventListener("scroll", () => nav.classList.toggle("scrolled", scrollY > 8), { passive: true });

  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("visible"); io.unobserve(e.target); } });
  }, { threshold: 0.15 });
  document.querySelectorAll(".reveal").forEach(el => io.observe(el));

  /* ================= Hero: mock animado ================= */
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const icons = {
    doc: '<svg viewBox="0 0 24 24"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></svg>',
    ok: '<svg viewBox="0 0 24 24"><path d="M5 12l5 5 9-10"/></svg>',
    bad: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  };
  const scenarios = [
    {
      q: "Cálculo de una variable", profs: ["Prof. Rivas", "Prof. Medina", "Prof. Salas"], pick: 0,
      files: [
        { n: "Examen Parcial 2025-II", m: "Prof. Rivas · 12 págs.", ok: true },
        { n: "Examen Final 2021", m: "Otro profesor · temario antiguo", ok: false, why: "Desactualizado" },
        { n: "Resumen Semanas 1–7", m: "Prof. Rivas · verificado", ok: true },
        { n: "resumen_final_v3.pdf", m: "Fuente desconocida", ok: false, why: "Sin fuente" },
        { n: "Solucionario PC2 2026-I", m: "Prof. Rivas · contrastado", ok: true },
      ],
    },
    {
      q: "Física I", profs: ["Prof. Quispe", "Prof. Torres"], pick: 1,
      files: [
        { n: "PC3 resuelta 2026-I", m: "Prof. Torres · verificado", ok: true },
        { n: "Banco de problemas 2019", m: "Otro sílabo", ok: false, why: "Otro sílabo" },
        { n: "Examen Parcial 2025-II", m: "Prof. Torres · 8 págs.", ok: true },
        { n: "Final (otra sección).jpg", m: "Prof. Quispe", ok: false, why: "Otro profe" },
      ],
    },
  ];

  const $q = document.getElementById("mock-query");
  const $chips = document.getElementById("mock-chips");
  const $files = document.getElementById("mock-files");
  const $time = document.getElementById("mock-time");
  const $sum = document.getElementById("mock-summary");
  const $stamp = document.getElementById("mock-stamp");

  async function playScenario(s) {
    $q.textContent = ""; $chips.innerHTML = ""; $files.innerHTML = "";
    $sum.textContent = "Buscando…"; $sum.classList.remove("done"); $stamp.classList.remove("show");
    const t0 = performance.now();
    const clock = setInterval(() => { $time.textContent = ((performance.now() - t0) / 1000).toFixed(1); }, 100);

    for (const ch of s.q) { $q.textContent += ch; await sleep(55 + Math.random() * 60); }
    await sleep(300);

    const rows = s.files.map(f => {
      const li = document.createElement("li");
      li.className = "file";
      li.innerHTML = `<span class="file-ic">${icons.doc}</span><span><span class="file-name"></span><br><span class="file-meta"></span></span><span class="tag">¿Sirve?</span>`;
      li.querySelector(".file-name").textContent = f.n;
      li.querySelector(".file-meta").textContent = f.m;
      $files.appendChild(li);
      return { li, f };
    });
    for (const r of rows) { r.li.classList.add("in"); await sleep(140); }
    await sleep(500);

    const chips = s.profs.map(p => {
      const c = document.createElement("span");
      c.className = "chip"; c.textContent = p;
      $chips.appendChild(c);
      return c;
    });
    for (const c of chips) { c.classList.add("in"); await sleep(120); }
    await sleep(450);
    chips[s.pick].classList.add("on");
    $sum.textContent = "Filtrando por profesor y sílabo…";
    await sleep(600);

    for (const { li, f } of rows) {
      li.classList.add(f.ok ? "ok" : "bad");
      li.querySelector(".file-ic").innerHTML = f.ok ? icons.ok : icons.bad;
      li.querySelector(".tag").textContent = f.ok ? "Sílabo 2026-II" : f.why;
      await sleep(260);
    }
    await sleep(700);
    rows.filter(r => !r.f.ok).forEach(r => r.li.classList.add("gone"));
    await sleep(450);

    clearInterval(clock);
    const good = rows.filter(r => r.f.ok).length;
    $sum.textContent = `${good} archivos vigentes ✓`;
    $sum.classList.add("done");
    $stamp.classList.add("show");
    await sleep(3800);
  }

  (async function loop() {
    for (let i = 0; ; i = (i + 1) % scenarios.length) await playScenario(scenarios[i]);
  })();

  /* ================= Caos → orden ================= */
  const papers = [
    { n: "Examen final 2022.pdf", s: "wa", e: "💬", ok: false, why: "2022" },
    { n: "Resumen PC1 · Prof. Rivas", s: "dr", e: "📁", ok: true },
    { n: "final_FINAL_v3.docx", s: "pdf", e: "📄", ok: false, why: "Sin fuente" },
    { n: "Solucionario PC2 verificado", s: "fi", e: "✓", ok: true },
    { n: "Foto pizarra (borrosa).jpg", s: "wa", e: "💬", ok: false, why: "Ilegible" },
    { n: "Parcial 2025-II · tu profe", s: "dr", e: "📁", ok: true },
    { n: "Examen de otra sección.pdf", s: "pdf", e: "📄", ok: false, why: "Otro profe" },
    { n: "Resumen alineado al sílabo", s: "fi", e: "✓", ok: true },
  ];
  const scatter = [[.02, .04, -8], [.55, .0, 6], [.3, .2, -3], [.68, .3, 10], [.0, .48, 5], [.45, .55, -7], [.12, .78, -2], [.62, .8, 4]];

  const $chaos = document.getElementById("chaos");
  const $card = $chaos.closest(".chaos-card");
  const $toggle = document.getElementById("chaos-toggle");
  const $hint = document.getElementById("chaos-hint");
  const paperEls = papers.map((p, i) => {
    const el = document.createElement("div");
    el.className = `paper ${p.ok ? "ok" : "bad"}`;
    el.innerHTML = `<span class="src ${p.s}"></span><span class="pn"></span><span class="pv">¿Sirve?</span>`;
    el.querySelector(".src").textContent = p.e;
    el.querySelector(".pn").textContent = p.n;
    el.style.setProperty("--j", `${(i % 4) * -0.7}s`);
    $chaos.appendChild(el);
    return el;
  });

  let sorted = false;
  function layoutChaos() {
    const W = $chaos.clientWidth, H = $chaos.clientHeight;
    const narrow = W < 520;
    const h = 52, gap = 10;
    const okCount = papers.filter(p => p.ok).length;
    let w;
    if (narrow) w = sorted ? W : Math.floor(W * 0.8);
    else w = sorted ? Math.min(400, Math.floor((W - 24) / 2)) : Math.min(260, Math.floor(W * 0.42));
    let iOk = 0, iBad = 0;
    paperEls.forEach((el, i) => {
      el.style.setProperty("--w", `${w}px`);
      let x, y, r;
      if (sorted) {
        const ok = papers[i].ok;
        const row = ok ? iOk++ : iBad++;
        // En móvil se apilan: primero los que sirven, luego los descartados.
        x = narrow || ok ? 0 : W - w;
        y = narrow && !ok ? (okCount + row) * (h + gap) + 24 : row * (h + gap) + 6;
        r = 0;
      } else {
        const [fx, fy, deg] = scatter[i];
        x = Math.min(fx * W, W - w);
        y = Math.min(fy * H, H - h);
        r = deg;
      }
      el.style.setProperty("--x", `${x}px`);
      el.style.setProperty("--y", `${y}px`);
      el.style.setProperty("--r", `${r}deg`);
      el.style.setProperty("--d", `${i * 0.05}s`);
    });
  }
  function setSorted(v) {
    sorted = v;
    $chaos.classList.toggle("sorted", v);
    $card.classList.toggle("sorted", v);
    $toggle.setAttribute("aria-pressed", String(v));
    $toggle.querySelector("span").textContent = v ? "Volver al caos" : "Ordenar con Filtra";
    $hint.textContent = v ? "4 archivos que sí te sirven. El resto, fuera. Así de simple." : "Toca el botón y mira qué pasa 👆";
    paperEls.forEach((el, i) => {
      el.querySelector(".pv").textContent = v ? (papers[i].ok ? "Vigente ✓" : papers[i].why) : "¿Sirve?";
    });
    layoutChaos();
  }
  $toggle.addEventListener("click", () => {
    setSorted(!sorted);
    if (sorted) track("demo_toggle", "caos");
  });
  addEventListener("resize", layoutChaos);
  layoutChaos();

  /* ================= Calculadora ================= */
  const $hours = document.getElementById("hours");
  const $hoursOut = document.getElementById("hours-out");
  const $sem = document.getElementById("sem-hours");
  const $equiv = document.getElementById("equiv");
  let calcTracked = false;
  function updateCalc() {
    const h = parseFloat($hours.value);
    const total = Math.round(h * 16);
    $hoursOut.textContent = h < 1 ? `${h * 60} min` : `${String(h).replace(".", ",")} h`;
    $sem.textContent = total;
    const pct = ((h - $hours.min) / ($hours.max - $hours.min)) * 100;
    $hours.style.setProperty("--fill", `${pct}%`);
    const movies = Math.max(1, Math.round(total / 2));
    $equiv.textContent = total >= 48
      ? `≈ ${Math.floor(total / 24)} días completos de tu vida 😵`
      : `≈ ${movies} ${movies === 1 ? "película" : "películas"} que no viste 🍿`;
    $sem.classList.add("bump");
    setTimeout(() => $sem.classList.remove("bump"), 180);
  }
  $hours.addEventListener("input", () => {
    updateCalc();
    if (!calcTracked) { calcTracked = true; track("calc_use", "calculadora"); }
  });
  updateCalc();

  /* ================= Modal + CTA ================= */
  const $modal = document.getElementById("modal");
  const $formView = document.getElementById("modal-form-view");
  const $success = document.getElementById("modal-success");
  let lastFocus = null;

  function openModal(view = "form") {
    lastFocus = document.activeElement;
    $formView.hidden = view !== "form";
    $success.hidden = view !== "success";
    $modal.hidden = false;
    document.body.style.overflow = "hidden";
    const target = view === "form" ? $formView.querySelector("input") : $success.querySelector("button");
    setTimeout(() => target && target.focus(), 50);
  }
  function closeModal() {
    $modal.hidden = true;
    document.body.style.overflow = "";
    if (lastFocus) lastFocus.focus();
  }
  $modal.addEventListener("click", e => { if (e.target.closest("[data-close]")) closeModal(); });
  addEventListener("keydown", e => { if (e.key === "Escape" && !$modal.hidden) closeModal(); });

  document.querySelectorAll("[data-cta]").forEach(btn => {
    btn.addEventListener("click", () => {
      track("cta_click", btn.dataset.cta);
      openModal("form");
    });
  });

  /* ================= Formularios ================= */
  document.querySelectorAll(".lead-form").forEach(form => {
    const email = form.elements.email;
    const course = form.elements.course;
    const msg = form.querySelector(".form-msg");
    const btn = form.querySelector("button[type=submit]");
    email.addEventListener("input", () => { email.classList.remove("invalid"); msg.textContent = ""; });

    form.addEventListener("submit", async e => {
      e.preventDefault();
      const value = email.value.trim().toLowerCase();
      msg.className = "form-msg";
      if (!EMAIL_RE.test(value)) {
        email.classList.remove("invalid"); void email.offsetWidth; email.classList.add("invalid");
        msg.classList.add("err");
        msg.textContent = "Usa tu correo institucional @utec.edu.pe";
        email.focus();
        return;
      }
      btn.disabled = true;
      const label = btn.textContent;
      btn.textContent = "Guardando…";
      const { status } = await insert("leads", {
        email: value,
        course: course.value.trim() || null,
        source: form.dataset.form,
        ref,
        session_id: sessionId,
      });
      btn.disabled = false;
      btn.textContent = label;

      if (status === 201 || status === 409) {
        form.reset();
        msg.textContent = "";
        document.getElementById("success-text").textContent = status === 409
          ? "¡Ya estabas en la lista! Te avisaremos apenas tu curso esté disponible."
          : "Te escribiremos a tu correo UTEC apenas tu curso esté disponible.";
        openModal("success");
        confetti();
      } else {
        msg.classList.add("err");
        msg.textContent = "Ups, no pudimos guardar tu correo. Inténtalo de nuevo en un momento.";
      }
    });
  });

  /* ================= Compartir ================= */
  const $share = document.getElementById("share-btn");
  $share.addEventListener("click", async () => {
    const url = `${location.origin}${location.pathname}?ref=compartido`;
    const data = { title: "Filtra", text: "Exámenes y resúmenes filtrados por tu profe y tu sílabo. Únete al piloto UTEC:", url };
    track("share", "modal");
    if (navigator.share) { safe(() => navigator.share(data).catch(() => {})); return; }
    const ok = await navigator.clipboard?.writeText(`${data.text} ${url}`).then(() => true, () => false);
    $share.querySelector("span").textContent = ok ? "¡Link copiado! Pégalo en tu grupo" : url;
  });

  /* ================= Confeti ================= */
  function confetti() {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const box = document.getElementById("confetti");
    const colors = ["#dc2626", "#00b5e2", "#0f1219", "#fca5a5", "#16a34a", "#fbbf24"];
    for (let i = 0; i < 90; i++) {
      const p = document.createElement("i");
      p.style.left = `${Math.random() * 100}vw`;
      p.style.background = colors[i % colors.length];
      p.style.setProperty("--dx", `${(Math.random() - 0.5) * 200}px`);
      p.style.setProperty("--rot", `${Math.random() * 900}deg`);
      p.style.animationDuration = `${1.6 + Math.random() * 1.6}s`;
      p.style.animationDelay = `${Math.random() * 0.3}s`;
      box.appendChild(p);
      setTimeout(() => p.remove(), 3800);
    }
  }
})();
