const menuButton = document.querySelector(".menu-toggle");
const navigation = document.querySelector(".primary-nav");
const categoryMenu = document.querySelector(".nav-product-categories");

const renderCategoryMenu = ({ categories }) => {
  if (!categoryMenu) return;
  categoryMenu.replaceChildren(...categories.map(({ id, name }) => {
    const link = document.createElement('a');
    link.href = `urunler.html?kategori=${encodeURIComponent(id)}`;
    link.textContent = name;
    return link;
  }));
};
renderCategoryMenu(window.DILEK_CATALOG);
window.DILEK_CATALOG_READY.then(renderCategoryMenu).catch((error) => console.error(error));

menuButton?.addEventListener("click", () => {
  const open = menuButton.getAttribute("aria-expanded") !== "true";
  menuButton.setAttribute("aria-expanded", String(open));
  menuButton.setAttribute("aria-label", open ? "Menüyü kapat" : "Menüyü aç");
  navigation.classList.toggle("is-open", open);
});

navigation?.addEventListener("click", (event) => {
  if (!event.target.closest("a")) return;
  menuButton.setAttribute("aria-expanded", "false");
  menuButton.setAttribute("aria-label", "Menüyü aç");
  navigation.classList.remove("is-open");
});

const year = document.querySelector("#year");
if (year) year.textContent = new Date().getFullYear();
