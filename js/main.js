"use strict";

// Referencias estables compartidas por los componentes.
const rootElement = document.documentElement;
const header = document.querySelector("[data-header]");
const menuButton = document.querySelector("[data-menu-button]");
const navigation = document.querySelector("[data-nav]");
const navLinks = [...document.querySelectorAll("[data-nav] a")];
const themeButton = document.querySelector("[data-theme-toggle]");
const themeIcon = document.querySelector("[data-theme-icon]");
const themeColor = document.querySelector('meta[name="theme-color"]');
const sections = [...document.querySelectorAll("#acerca, #proyecto-1, #proyecto-2, #contacto")];
const revealItems = document.querySelectorAll(".reveal");
const contactForm = document.querySelector("[data-contact-form]");
const contactFields = [...contactForm.querySelectorAll("input, textarea")];
const formStatus = document.querySelector("[data-form-status]");
const yearElement = document.querySelector("[data-year]");
const galleryOpenButtons = [...document.querySelectorAll("[data-gallery-open]")];
const galleryModals = [...document.querySelectorAll("[data-gallery-modal]")];

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const prefersDarkTheme = window.matchMedia("(prefers-color-scheme: dark)");
const supportsTouchLayout = window.matchMedia("(max-width: 900px)");
const desktopNavigation = window.matchMedia("(min-width: 721px)");
const autoplayDelay = 4500;
const themeStorageKey = "portfolio-theme-mode";
let activeGallery = null;

// Mantiene vigente el año del footer sin editar contenido manualmente.
yearElement.textContent = new Date().getFullYear();

function readThemeMode() {
  try {
    const savedMode = localStorage.getItem(themeStorageKey);
    return ["system", "light", "dark"].includes(savedMode) ? savedMode : "system";
  } catch {
    return "system";
  }
}

function resolveTheme(mode) {
  if (mode === "system") return prefersDarkTheme.matches ? "dark" : "light";
  return mode;
}

function applyThemeMode(mode, persist = false) {
  const theme = resolveTheme(mode);
  const isDark = theme === "dark";
  const labels = {
    system: "Tema automático. Cambiar a modo claro",
    light: "Modo claro. Cambiar a modo oscuro",
    dark: "Modo oscuro. Cambiar a tema automático",
  };
  const icons = {
    system: "brightness_auto",
    light: "light_mode",
    dark: "dark_mode",
  };

  rootElement.dataset.themeMode = mode;
  rootElement.dataset.theme = theme;
  themeButton.setAttribute("aria-label", labels[mode]);
  themeButton.title = labels[mode].split(".")[0];
  themeIcon.textContent = icons[mode];
  themeColor.content = isDark ? "#071923" : "#081b2c";

  if (!persist) return;

  try {
    localStorage.setItem(themeStorageKey, mode);
  } catch {
    // El tema se conserva durante la sesión aunque no pueda persistirse.
  }
}

themeButton.addEventListener("click", () => {
  const currentMode = rootElement.dataset.themeMode || "system";
  const nextMode = {
    system: "light",
    light: "dark",
    dark: "system",
  }[currentMode];

  applyThemeMode(nextMode, true);
});

prefersDarkTheme.addEventListener("change", () => {
  if (rootElement.dataset.themeMode === "system") applyThemeMode("system");
});

applyThemeMode(rootElement.dataset.themeMode || readThemeMode());

function closeMenu() {
  navigation.classList.remove("is-open");
  menuButton.setAttribute("aria-expanded", "false");
  menuButton.setAttribute("aria-label", "Abrir menú");
  menuButton.querySelector(".material-symbols-rounded").textContent = "menu";
  document.body.classList.remove("menu-open");
}

function toggleMenu() {
  const isOpen = navigation.classList.toggle("is-open");

  menuButton.setAttribute("aria-expanded", String(isOpen));
  menuButton.setAttribute("aria-label", isOpen ? "Cerrar menú" : "Abrir menú");
  menuButton.querySelector(".material-symbols-rounded").textContent = isOpen
    ? "close"
    : "menu";
  document.body.classList.toggle("menu-open", isOpen);
}

menuButton.addEventListener("click", toggleMenu);
navLinks.forEach((link) => link.addEventListener("click", closeMenu));

// Cada modal mantiene su estado para que la galería sea reutilizable.
function createGallery(modal) {
  const closeButton = modal.querySelector("[data-gallery-close]");
  const previousButton = modal.querySelector("[data-gallery-prev]");
  const nextButton = modal.querySelector("[data-gallery-next]");
  const viewport = modal.querySelector("[data-gallery-viewport]");
  const track = modal.querySelector("[data-gallery-track]");
  const slides = [...modal.querySelectorAll("[data-gallery-slide]")];
  const dots = [...modal.querySelectorAll("[data-gallery-dot]")];
  const status = modal.querySelector("[data-gallery-status]");
  const lightbox = modal.querySelector("[data-image-lightbox]");
  const expandedImage = modal.querySelector("[data-expanded-image]");
  const expandedCaption = modal.querySelector("[data-expanded-caption]");
  const expandedCloseButton = modal.querySelector("[data-image-close]");
  let currentSlide = 0;
  let autoplayTimer = null;
  let lastFocused = null;
  let touchStartX = null;
  let touchStartY = null;
  let didSwipe = false;

  function update() {
    track.style.transform = `translateX(-${currentSlide * 100}%)`;

    slides.forEach((slide, index) => {
      const isActive = index === currentSlide;
      slide.setAttribute("aria-hidden", String(!isActive));
      slide.tabIndex = isActive && !slide.disabled ? 0 : -1;
    });

    dots.forEach((dot, index) => {
      dot.setAttribute("aria-current", String(index === currentSlide));
    });

    status.textContent = `Evidencia ${currentSlide + 1} de ${slides.length}`;
  }

  function loadImage(index, priority = "low") {
    const image = slides[index]?.querySelector("img");

    if (!image?.dataset.src || image.hasAttribute("src")) return;

    image.decoding = "async";
    image.fetchPriority = priority;
    image.src = image.dataset.src;
  }

  function goToSlide(index) {
    currentSlide = (index + slides.length) % slides.length;
    loadImage(currentSlide, "high");
    loadImage((currentSlide + 1) % slides.length);
    update();
  }

  function next() {
    goToSlide(currentSlide + 1);
  }

  function previous() {
    goToSlide(currentSlide - 1);
  }

  function stopAutoplay() {
    window.clearInterval(autoplayTimer);
    autoplayTimer = null;
  }

  function startAutoplay() {
    stopAutoplay();

    if (
      prefersReducedMotion.matches ||
      modal.hidden ||
      !lightbox.hidden ||
      document.hidden
    ) {
      return;
    }

    autoplayTimer = window.setInterval(next, autoplayDelay);
  }

  function restartAutoplay() {
    stopAutoplay();
    startAutoplay();
  }

  function closeExpandedImage(resumeAutoplay = true) {
    if (lightbox.hidden) return;

    lightbox.hidden = true;
    expandedImage.removeAttribute("src");
    expandedImage.alt = "";
    expandedCaption.textContent = "";
    slides[currentSlide].focus();

    if (resumeAutoplay) startAutoplay();
  }

  function openExpandedImage(index) {
    const slide = slides[index];
    const image = slide.querySelector("img");

    if (slide.classList.contains("is-missing")) return;

    stopAutoplay();
    expandedImage.src = image.currentSrc || image.src;
    expandedImage.alt = image.alt;
    expandedCaption.textContent = slide.dataset.caption || image.alt;
    lightbox.hidden = false;
    expandedCloseButton.focus();
  }

  function close() {
    stopAutoplay();
    closeExpandedImage(false);
    modal.hidden = true;
    document.body.classList.remove("modal-open");
    activeGallery = null;
    lastFocused?.focus();
  }

  function open(trigger) {
    if (activeGallery && activeGallery !== controller) activeGallery.close();

    lastFocused = trigger || document.activeElement;
    modal.hidden = false;
    document.body.classList.add("modal-open");
    activeGallery = controller;
    goToSlide(currentSlide);
    closeButton.focus();
    startAutoplay();
  }

  function trapFocus(event) {
    const focusScope = lightbox.hidden ? modal : lightbox;
    const focusableElements = [
      ...focusScope.querySelectorAll('button:not([disabled]), a[href]'),
    ].filter((element) => !element.closest("[hidden]") && element.tabIndex !== -1);

    if (!focusableElements.length) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }

  function markMissingEvidence(image) {
    const slide = image.closest("[data-gallery-slide]");
    image.hidden = true;
    slide.classList.add("is-missing");
    slide.disabled = true;
    update();
  }

  function resetTouch() {
    touchStartX = null;
    touchStartY = null;
  }

  function handleTouchStart(event) {
    if (!supportsTouchLayout.matches || !lightbox.hidden || event.touches.length !== 1) {
      return;
    }

    const touch = event.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    stopAutoplay();
  }

  function handleTouchEnd(event) {
    if (touchStartX === null || touchStartY === null || !event.changedTouches.length) {
      return;
    }

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStartX;
    const deltaY = touch.clientY - touchStartY;
    const isHorizontalSwipe = Math.abs(deltaX) >= 48 && Math.abs(deltaX) > Math.abs(deltaY);

    resetTouch();

    if (!isHorizontalSwipe) {
      startAutoplay();
      return;
    }

    didSwipe = true;
    if (deltaX < 0) {
      next();
    } else {
      previous();
    }
    restartAutoplay();
    window.setTimeout(() => {
      didSwipe = false;
    }, 350);
  }

  function handleTouchCancel() {
    resetTouch();
    startAutoplay();
  }

  const controller = {
    close,
    closeExpandedImage,
    isLightboxOpen: () => !lightbox.hidden,
    next,
    open,
    previous,
    restartAutoplay,
    startAutoplay,
    stopAutoplay,
    trapFocus,
  };

  closeButton.addEventListener("click", close);
  previousButton.addEventListener("click", () => {
    previous();
    restartAutoplay();
  });
  nextButton.addEventListener("click", () => {
    next();
    restartAutoplay();
  });

  dots.forEach((dot, index) => {
    dot.addEventListener("click", () => {
      goToSlide(index);
      restartAutoplay();
    });
  });

  slides.forEach((slide, index) => {
    const image = slide.querySelector("img");
    slide.addEventListener("click", () => {
      if (!didSwipe) openExpandedImage(index);
    });
    image.addEventListener("error", () => markMissingEvidence(image));

    if (image.hasAttribute("src") && image.complete && image.naturalWidth === 0) {
      markMissingEvidence(image);
    }
  });

  modal.addEventListener("click", (event) => {
    if (event.target === modal) close();
  });
  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) closeExpandedImage();
  });
  expandedCloseButton.addEventListener("click", () => closeExpandedImage());
  viewport.addEventListener("pointerenter", stopAutoplay);
  viewport.addEventListener("pointerleave", startAutoplay);
  viewport.addEventListener("touchstart", handleTouchStart, { passive: true });
  viewport.addEventListener("touchend", handleTouchEnd, { passive: true });
  viewport.addEventListener("touchcancel", handleTouchCancel, { passive: true });

  update();
  return controller;
}

const galleryControllers = new Map(
  galleryModals.map((modal) => [modal.id, createGallery(modal)]),
);

galleryOpenButtons.forEach((button) => {
  button.addEventListener("click", () => {
    galleryControllers.get(button.dataset.galleryOpen)?.open(button);
  });
});

// El teclado ofrece las mismas acciones disponibles con puntero.
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (activeGallery) {
      if (activeGallery.isLightboxOpen()) {
        activeGallery.closeExpandedImage();
      } else {
        activeGallery.close();
      }
      return;
    }

    closeMenu();
    return;
  }

  if (!activeGallery) return;

  if (event.key === "Tab") activeGallery.trapFocus(event);
  if (activeGallery.isLightboxOpen()) return;

  if (event.key === "ArrowRight") {
    event.preventDefault();
    activeGallery.next();
    activeGallery.restartAutoplay();
  }

  if (event.key === "ArrowLeft") {
    event.preventDefault();
    activeGallery.previous();
    activeGallery.restartAutoplay();
  }
});

desktopNavigation.addEventListener("change", (event) => {
  if (event.matches) closeMenu();
});

document.addEventListener("visibilitychange", () => {
  if (!activeGallery) return;

  if (document.hidden) {
    activeGallery.stopAutoplay();
  } else {
    activeGallery.startAutoplay();
  }
});

// El header gana elevación solo después de iniciar el desplazamiento.
function updateHeader() {
  header.classList.toggle("is-scrolled", window.scrollY > 16);
}

let headerUpdatePending = false;

function scheduleHeaderUpdate() {
  if (headerUpdatePending) return;

  headerUpdatePending = true;
  window.requestAnimationFrame(() => {
    updateHeader();
    headerUpdatePending = false;
  });
}

updateHeader();
window.addEventListener("scroll", scheduleHeaderUpdate, { passive: true });

// Cada elemento se observa una vez para evitar animaciones repetidas.
if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.14 },
  );

  revealItems.forEach((item) => revealObserver.observe(item));

  // Sincroniza el estado del menú con la sección visible.
  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        navLinks.forEach((link) => {
          const isCurrent = link.getAttribute("href") === `#${entry.target.id}`;
          link.classList.toggle("is-active", isCurrent);
        });
      });
    },
    { rootMargin: "-35% 0px -55%", threshold: 0 },
  );

  sections.forEach((section) => sectionObserver.observe(section));
} else {
  revealItems.forEach((item) => item.classList.add("is-visible"));
}

// Los mensajes propios no dependen del idioma configurado en el navegador.
function updateValidationMessage(field) {
  field.setCustomValidity("");

  if (field.validity.valueMissing) {
    field.setCustomValidity("Completa este campo.");
  } else if (field.validity.typeMismatch) {
    field.setCustomValidity("Ingresa un correo electrónico válido.");
  }
}

contactFields.forEach((field) => {
  field.addEventListener("invalid", () => updateValidationMessage(field));
  field.addEventListener("input", () => field.setCustomValidity(""));
});

// GitHub Pages no ejecuta backend; el formulario prepara una solicitud mailto.
contactForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!contactForm.reportValidity()) return;

  const formData = new FormData(contactForm);
  const name = formData.get("name").trim();
  const email = formData.get("email").trim();
  const message = formData.get("message").trim();
  const subject = encodeURIComponent(`Contacto desde el portafolio - ${name}`);
  const body = encodeURIComponent(
    `Hola Alejandro,\n\n${message}\n\nNombre: ${name}\nCorreo: ${email}`,
  );

  formStatus.textContent = "Abriendo tu aplicación de correo…";
  window.location.href = `mailto:qa@alejandrofernandez.mx?subject=${subject}&body=${body}`;
});
