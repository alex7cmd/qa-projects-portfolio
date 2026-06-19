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

// Escape también cierra el menú para navegación con teclado.
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeMenu();
});

window.addEventListener("resize", () => {
  if (window.innerWidth > 720) closeMenu();
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
