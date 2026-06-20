"use strict";

// Selectores reutilizados para evitar búsquedas repetidas en el DOM.
const header = document.querySelector("[data-header]");
const menuButton = document.querySelector("[data-menu-button]");
const navigation = document.querySelector("[data-nav]");
const navLinks = [...document.querySelectorAll("[data-nav] a")];
// Observa solo los destinos reales del menú para marcar el enlace activo.
const sections = [...document.querySelectorAll("#acerca, #proyecto-1, #proyecto-2, #contacto")];
const revealItems = document.querySelectorAll(".reveal");
const contactForm = document.querySelector("[data-contact-form]");
const formStatus = document.querySelector("[data-form-status]");
const yearElement = document.querySelector("[data-year]");
const galleryOpenButtons = [...document.querySelectorAll("[data-gallery-open]")];
const galleryModals = [...document.querySelectorAll("[data-gallery-modal]")];

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const autoplayDelay = 4500;
let activeGallery = null;

// El año dinámico evita actualizar manualmente el footer.
yearElement.textContent = new Date().getFullYear();

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

// Cada modal administra su propio carrusel para poder reutilizar el componente.
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

  function goToSlide(index) {
    currentSlide = (index + slides.length) % slides.length;
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
    expandedCaption.textContent = image.alt;
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
    slide.addEventListener("click", () => openExpandedImage(index));
    image.addEventListener("error", () => markMissingEvidence(image));

    if (image.complete && image.naturalWidth === 0) markMissingEvidence(image);
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

// Teclado: Escape cierra capas y las flechas controlan el carrusel activo.
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

window.addEventListener("resize", () => {
  if (window.innerWidth > 720) closeMenu();
});

document.addEventListener("visibilitychange", () => {
  if (!activeGallery) return;

  if (document.hidden) {
    activeGallery.stopAutoplay();
  } else {
    activeGallery.startAutoplay();
  }
});

// Cambia el header solo después de iniciar el desplazamiento.
function updateHeader() {
  header.classList.toggle("is-scrolled", window.scrollY > 16);
}

updateHeader();
window.addEventListener("scroll", updateHeader, { passive: true });

// IntersectionObserver anima únicamente elementos que entran al viewport.
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

  // Resalta en el menú la sección que se encuentra visible.
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

// GitHub Pages no tiene backend; mailto prepara el mensaje en el dispositivo.
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
