(() => {
  const yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }

  const scrollRoot = document.querySelector(".site-shell");
  const toggle = document.querySelector(".nav__toggle");
  const backdrop = document.querySelector(".nav-backdrop");
  const navLinks = document.querySelectorAll("[data-nav-link]");
  const brandLink = document.querySelector(".nav__brand");

  const setOpen = (open) => {
    document.body.classList.toggle("nav-open", open);
    if (toggle) {
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    }
    if (backdrop) {
      backdrop.hidden = !open;
    }
  };

  const setActive = (id) => {
    navLinks.forEach((link) => {
      const active = link.getAttribute("href") === `#${id}`;
      link.classList.toggle("is-active", active);
      if (active) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    });
  };

  const scrollToId = (id) => {
    const section = document.getElementById(id);
    if (!section) return;
    section.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "start",
    });
  };

  if (toggle) {
    toggle.addEventListener("click", () => {
      setOpen(!document.body.classList.contains("nav-open"));
    });
  }

  if (backdrop) {
    backdrop.addEventListener("click", () => setOpen(false));
  }

  navLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      const id = link.getAttribute("href")?.slice(1);
      if (!id) return;
      event.preventDefault();
      setActive(id);
      scrollToId(id);
      history.pushState(null, "", `#${id}`);
      setOpen(false);
    });
  });

  if (brandLink) {
    brandLink.addEventListener("click", (event) => {
      event.preventDefault();
      setActive("intro");
      scrollToId("intro");
      history.pushState(null, "", "#intro");
      setOpen(false);
    });
  }

  document.querySelectorAll('.site-shell a[href^="#"]').forEach((link) => {
    if (link.hasAttribute("data-nav-link") || link.classList.contains("nav__brand")) {
      return;
    }
    link.addEventListener("click", (event) => {
      const id = link.getAttribute("href")?.slice(1);
      if (!id || !document.getElementById(id)) return;
      event.preventDefault();
      setActive(id);
      scrollToId(id);
      history.pushState(null, "", `#${id}`);
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setOpen(false);
  });

  window.addEventListener("resize", () => {
    if (window.matchMedia("(min-width: 901px)").matches) {
      setOpen(false);
    }
  });

  initScrollSpy(navLinks, scrollRoot, setActive);

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const reveals = document.querySelectorAll(".reveal");

  const showReveals = () => {
    reveals.forEach((el) => el.classList.add("is-visible"));
  };

  if (reduceMotion) {
    showReveals();
  } else if (!("IntersectionObserver" in window)) {
    showReveals();
  } else {
    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            obs.unobserve(entry.target);
          }
        });
      },
      {
        root: scrollRoot || null,
        rootMargin: "0px 0px -8% 0px",
        threshold: 0.12,
      }
    );

    reveals.forEach((el) => observer.observe(el));
  }

  // Honor deep links after layout
  const hashId = window.location.hash.slice(1);
  if (hashId && document.getElementById(hashId)) {
    requestAnimationFrame(() => {
      setActive(hashId);
      scrollToId(hashId);
    });
  }

  initHeroCanvas(reduceMotion);
})();

function initScrollSpy(navLinks, scrollRoot, setActive) {
  if (!navLinks.length) return;

  const sections = [...navLinks]
    .map((link) => {
      const id = link.getAttribute("href")?.slice(1);
      return id ? document.getElementById(id) : null;
    })
    .filter(Boolean);

  if (!sections.length) return;

  setActive(sections[0].id);

  const getScrollTop = () =>
    scrollRoot ? scrollRoot.scrollTop : window.scrollY || window.pageYOffset;

  const getViewportHeight = () =>
    scrollRoot ? scrollRoot.clientHeight : window.innerHeight;

  if (!("IntersectionObserver" in window)) {
    const onScroll = () => {
      const marker = getScrollTop() + getViewportHeight() * 0.35;
      let current = sections[0].id;
      for (const section of sections) {
        if (section.offsetTop <= marker) current = section.id;
      }
      setActive(current);
    };
    (scrollRoot || window).addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return;
  }

  const ratios = new Map();

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        ratios.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0);
      });

      let bestId = sections[0].id;
      let bestRatio = -1;
      for (const section of sections) {
        const ratio = ratios.get(section.id) || 0;
        if (ratio > bestRatio) {
          bestRatio = ratio;
          bestId = section.id;
        }
      }

      if (bestRatio < 0.08) {
        const marker = getScrollTop() + getViewportHeight() * 0.3;
        for (const section of sections) {
          if (section.offsetTop <= marker) bestId = section.id;
        }
      }

      setActive(bestId);
    },
    {
      root: scrollRoot || null,
      rootMargin: "-20% 0px -45% 0px",
      threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
    }
  );

  sections.forEach((section) => observer.observe(section));
}

function initHeroCanvas(reduceMotion) {
  const canvas = document.querySelector(".page-canvas");
  if (!canvas || reduceMotion) return;

  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return;

  const ORB_COUNT = 7;
  const colors = [
    "rgba(122, 143, 110, 0.22)",
    "rgba(95, 111, 85, 0.16)",
    "rgba(68, 80, 61, 0.12)",
    "rgba(226, 231, 219, 0.55)",
  ];

  let width = 0;
  let height = 0;
  let dpr = 1;
  let rafId = 0;
  let running = false;
  let pointerX = 0.35;
  let pointerY = 0.45;
  let targetX = 0.35;
  let targetY = 0.45;

  const orbs = Array.from({ length: ORB_COUNT }, (_, i) => ({
    x: 0.15 + (i % 4) * 0.22,
    y: 0.2 + Math.floor(i / 4) * 0.35 + (i % 3) * 0.08,
    vx: (Math.random() - 0.5) * 0.00018,
    vy: (Math.random() - 0.5) * 0.00018,
    r: 0.08 + (i % 3) * 0.035,
    color: colors[i % colors.length],
    drift: 0.35 + (i % 4) * 0.12,
  }));

  const resize = () => {
    width = Math.max(1, window.innerWidth);
    height = Math.max(1, window.innerHeight);
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const draw = () => {
    if (!running) return;

    pointerX += (targetX - pointerX) * 0.06;
    pointerY += (targetY - pointerY) * 0.06;

    ctx.clearRect(0, 0, width, height);

    for (const orb of orbs) {
      orb.x += orb.vx;
      orb.y += orb.vy;

      if (orb.x < -0.1 || orb.x > 1.1) orb.vx *= -1;
      if (orb.y < -0.1 || orb.y > 1.1) orb.vy *= -1;

      const px = (orb.x + (pointerX - 0.5) * orb.drift * 0.35) * width;
      const py = (orb.y + (pointerY - 0.5) * orb.drift * 0.35) * height;
      const radius = orb.r * Math.min(width, height);

      const gradient = ctx.createRadialGradient(px, py, 0, px, py, radius);
      gradient.addColorStop(0, orb.color);
      gradient.addColorStop(1, "rgba(246, 247, 242, 0)");

      ctx.beginPath();
      ctx.fillStyle = gradient;
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    const hx = pointerX * width;
    const hy = pointerY * height;
    const hr = Math.min(width, height) * 0.22;
    const glow = ctx.createRadialGradient(hx, hy, 0, hx, hy, hr);
    glow.addColorStop(0, "rgba(122, 143, 110, 0.14)");
    glow.addColorStop(1, "rgba(122, 143, 110, 0)");
    ctx.beginPath();
    ctx.fillStyle = glow;
    ctx.arc(hx, hy, hr, 0, Math.PI * 2);
    ctx.fill();

    rafId = requestAnimationFrame(draw);
  };

  const start = () => {
    if (running || document.hidden) return;
    running = true;
    rafId = requestAnimationFrame(draw);
  };

  const stop = () => {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
  };

  const onPointerMove = (event) => {
    if (!width || !height) return;
    targetX = event.clientX / width;
    targetY = event.clientY / height;
  };

  resize();
  window.addEventListener("resize", resize, { passive: true });
  window.addEventListener("pointermove", onPointerMove, { passive: true });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else start();
  });

  start();
}
