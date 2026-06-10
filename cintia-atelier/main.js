(function () {
  "use strict";

  /* ── Helpers ─────────────────────────────────────────────── */
  const data      = window.__CINTIA__ || {};
  const reduced   = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fineHover = matchMedia("(hover: hover) and (pointer: fine)").matches;

  const $  = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const escHTML = s => String(s == null ? "" : s).replace(/[&<>"']/g, c =>
    ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);

  function safe(fn, name) {
    try { fn(); } catch (e) { console.warn("[" + name + "]", e); }
  }

  /* ── Smooth scroll (anchor offset for nav) ───────────────── */
  function initSmoothScroll() {
    document.addEventListener("click", e => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute("href");
      if (!id || id === "#") return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      const navH = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--nav-h"), 10) || 68;
      const top = target.getBoundingClientRect().top + scrollY - navH;
      window.scrollTo({
        top: Math.max(0, top),
        behavior: reduced ? "auto" : "smooth"
      });
      // close mobile menu if open
      const menu = $("#nav-menu");
      const ham  = $("#nav-hamburger");
      if (menu && menu.classList.contains("is-open")) {
        menu.classList.remove("is-open");
        if (ham) { ham.classList.remove("is-open"); ham.setAttribute("aria-expanded", "false"); }
        document.body.style.overflow = "";
      }
    });
  }

  /* ── Nav: scroll solidify + hamburger ────────────────────── */
  function initNav() {
    const nav = $(".nav");
    if (!nav) return;

    // Solidify on scroll
    const observer = new IntersectionObserver(
      ([entry]) => nav.classList.toggle("is-scrolled", !entry.isIntersecting),
      { threshold: 0.02 }
    );
    const sentinel = document.createElement("div");
    sentinel.style.cssText = "position:absolute;top:80px;left:0;height:1px;width:1px;pointer-events:none";
    document.body.prepend(sentinel);
    observer.observe(sentinel);

    // Hamburger menu
    const ham  = $("#nav-hamburger");
    const menu = $("#nav-menu");
    if (!ham || !menu) return;
    ham.addEventListener("click", () => {
      const open = ham.classList.toggle("is-open");
      ham.setAttribute("aria-expanded", String(open));
      menu.classList.toggle("is-open", open);
      document.body.style.overflow = open ? "hidden" : "";
    });
  }

  /* ── Hero entrance ───────────────────────────────────────── */
  function initHero() {
    const hero = $(".hero");
    if (!hero) return;
    // Trigger reveal classes immediately for hero elements
    $$(".reveal", hero).forEach((el, i) => {
      setTimeout(() => el.classList.add("is-visible"), 200 + i * 120);
    });
    // Subtle ken-burns once loaded
    const img = hero.querySelector(".hero__bg img");
    if (img) {
      if (img.complete) hero.classList.add("is-loaded");
      else img.addEventListener("load", () => hero.classList.add("is-loaded"));
    }
  }

  /* ── Scroll reveals ──────────────────────────────────────── */
  function initReveals() {
    const els = $$(".reveal").filter(el => !el.closest(".hero"));
    if (!els.length) return;

    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const delay = parseInt(e.target.dataset.revealDelay || "0", 10);
        setTimeout(() => e.target.classList.add("is-visible"), delay);
        io.unobserve(e.target);
      });
    }, { threshold: 0.01, rootMargin: "0px 0px -3% 0px" });

    els.forEach(el => io.observe(el));

    // Safety net: reveal anything still hidden at 6s
    setTimeout(() => {
      $$(".reveal:not(.is-visible)").forEach(el => {
        if (el.getBoundingClientRect().top < window.innerHeight * 1.1) {
          el.classList.add("is-visible");
        }
      });
    }, 6000);
  }

  /* ── Portfolio: mount grid + lightbox ───────────────────── */
  function initPortfolio() {
    const grid = $(".portfolio__grid");
    if (!grid || !data.portfolio || grid.children.length > 0) return;

    grid.innerHTML = data.portfolio.map((item, i) => `
      <button
        class="portfolio-item reveal"
        data-portfolio-item="${i}"
        aria-label="Ver proyecto: ${escHTML(item.title)}"
        data-reveal-delay="${Math.min(i % 3, 2) * 100}"
      >
        <img
          src="${escHTML(item.photo)}"
          alt="${escHTML(item.title)}"
          loading="lazy"
          decoding="async"
        >
        <div class="portfolio-item__overlay" aria-hidden="true">
          <span class="portfolio-item__title">${escHTML(item.title)}</span>
        </div>
        <span class="portfolio-item__hint" aria-hidden="true">+</span>
      </button>
    `).join("");

    // Re-observe freshly mounted items
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const d = parseInt(e.target.dataset.revealDelay || "0", 10);
        setTimeout(() => e.target.classList.add("is-visible"), d);
        io.unobserve(e.target);
      });
    }, { threshold: 0.01 });
    $$(".portfolio-item").forEach(el => io.observe(el));

    initLightbox();
  }

  /* ── Lightbox ────────────────────────────────────────────── */
  function initLightbox() {
    const dialog  = $("#lightbox");
    const imgEl   = $("#lightbox-img");
    const caption = $("#lightbox-caption");
    const btnClose = $("#lightbox-close");
    const btnPrev  = $("#lightbox-prev");
    const btnNext  = $("#lightbox-next");
    if (!dialog || !imgEl) return;

    const items = data.portfolio || [];
    let current = 0;

    function open(i) {
      current = ((i % items.length) + items.length) % items.length;
      const item = items[current];
      imgEl.src = item.photo;
      imgEl.alt = item.title;
      caption.textContent = item.description;
      dialog.showModal();
      document.body.style.overflow = "hidden";
      btnClose.focus();
    }

    function close() {
      if (!dialog.open) return;
      dialog.close();
      document.body.style.overflow = "";
      const trigger = document.querySelector(`[data-portfolio-item="${current}"]`);
      if (trigger) trigger.focus();
    }

    document.addEventListener("click", e => {
      const btn = e.target.closest("[data-portfolio-item]");
      if (btn) open(parseInt(btn.dataset.portfolioItem, 10));
    });

    btnClose.addEventListener("click", e => { e.stopPropagation(); close(); });
    btnPrev.addEventListener("click",  e => { e.stopPropagation(); open(current - 1); });
    btnNext.addEventListener("click",  e => { e.stopPropagation(); open(current + 1); });

    dialog.addEventListener("click", e => { if (e.target === dialog) close(); });

    // Handle native Escape key via cancel event (fires before dialog closes itself)
    dialog.addEventListener("cancel", e => { e.preventDefault(); close(); });

    document.addEventListener("keydown", e => {
      if (!dialog.open) return;
      if (e.key === "ArrowLeft")  { e.preventDefault(); open(current - 1); }
      if (e.key === "ArrowRight") { e.preventDefault(); open(current + 1); }
    });
  }

  /* ── Testimonials: mount if data ready ──────────────────── */
  function initTestimonials() {
    const section = $(".testimonios");
    const grid    = $("[data-testimonios]");
    if (!section || !grid || !data.testimonials?.length) return;
    if (grid.children.length > 0) return;

    grid.innerHTML = data.testimonials.map(t => `
      <article class="testimonio-card">
        <p class="testimonio-card__text">"${escHTML(t.text)}"</p>
        <p class="testimonio-card__author">${escHTML(t.author)} · ${escHTML(t.location)}</p>
      </article>
    `).join("");

    // Uncomment when real testimonials are confirmed:
    // section.removeAttribute("hidden");
    // section.removeAttribute("aria-hidden");
  }

  /* ── Contact form ────────────────────────────────────────── */
  function initContactForm() {
    const form = $("[data-form]");
    if (!form) return;
    const submitBtn   = $("[data-submit-btn]", form);
    const successMsg  = $("[data-form-success]", form);
    const errorMsg    = $("[data-form-error]", form);

    form.addEventListener("submit", async e => {
      e.preventDefault();
      if (!form.reportValidity()) return;

      submitBtn.classList.add("is-sending");
      submitBtn.disabled = true;
      successMsg.hidden = true;
      errorMsg.hidden   = true;

      try {
        const res = await fetch(form.action, {
          method: "POST",
          body: new FormData(form),
          headers: { "Accept": "application/json" }
        });
        if (res.ok) {
          form.reset();
          successMsg.hidden = false;
          successMsg.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "nearest" });
        } else {
          throw new Error("Status " + res.status);
        }
      } catch (err) {
        errorMsg.hidden = false;
        console.warn("[form]", err);
      } finally {
        submitBtn.classList.remove("is-sending");
        submitBtn.disabled = false;
      }
    });
  }

  /* ── Image parallax (subtle, no library needed) ─────────── */
  function initHeroParallax() {
    if (reduced) return;
    const img = $(".hero__bg img");
    if (!img || !fineHover) return; // skip on touch devices — too risky

    let ticking = false;
    window.addEventListener("scroll", () => {
      if (ticking) return;
      requestAnimationFrame(() => {
        const y = Math.min(scrollY * 0.18, 60);
        img.style.transform = `scale(1) translateY(${y}px)`;
        ticking = false;
      });
      ticking = true;
    }, { passive: true });
  }

  /* ── WhatsApp FAB: show after 3s on mobile ───────────────── */
  function initWhatsApp() {
    const fab = $(".whatsapp-fab");
    if (!fab) return;
    // Always visible — just ensure it's styled properly
    fab.style.opacity = "0";
    fab.style.transition = "opacity .5s";
    setTimeout(() => { fab.style.opacity = "1"; }, 1200);
  }

  /* ── External links ──────────────────────────────────────── */
  function initExternalLinks() {
    $$('a[href^="http"]').forEach(a => {
      if (!a.getAttribute("target")) a.setAttribute("target", "_blank");
      if (!a.getAttribute("rel")) a.setAttribute("rel", "noopener noreferrer");
    });
    // Wire dynamic brand links
    const waLinks = $$('a[href*="wa.me/34677733480"]');
    waLinks.forEach(a => { a.href = data.wa || a.href; });
  }

  /* ── Boot ────────────────────────────────────────────────── */
  function boot() {
    safe(initSmoothScroll,  "initSmoothScroll");
    safe(initNav,           "initNav");
    safe(initHero,          "initHero");
    safe(initReveals,       "initReveals");
    safe(initPortfolio,     "initPortfolio");
    safe(initTestimonials,  "initTestimonials");
    safe(initContactForm,   "initContactForm");
    safe(initHeroParallax,  "initHeroParallax");
    safe(initWhatsApp,      "initWhatsApp");
    safe(initExternalLinks, "initExternalLinks");

    document.documentElement.classList.add("is-ready");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

})();
