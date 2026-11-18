"use strict";

const products = [
  { id: "fragrance", name: "Sample Eau de Parfum", category: "Fragrance", art: "Scent", cents: 3900 },
  { id: "footwear", name: "Sample Everyday Sneaker", category: "Footwear", art: "Move", cents: 6500 },
  { id: "accessories", name: "Sample Everyday Watch", category: "Accessories", art: "Time", cents: 2900 },
];
const storageKey = "sky-shop-preview-bag";
const maxQuantity = 20;
const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const price = (cents) => money.format(cents / 100);
const find = (selector) => document.querySelector(selector);
const dialog = find("#bag-dialog");
const form = find("#request-form");
const bag = new Map();
let category = "All";

try {
  const saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
  for (const { id } of products) {
    const quantity = saved?.[id];
    if (Number.isInteger(quantity) && quantity > 0 && quantity <= maxQuantity) {
      bag.set(id, quantity);
    }
  }
} catch {
  // Browsing still works if storage is unavailable.
}

function make(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

function button(text, onClick, className = "") {
  const element = make("button", className, text);
  element.type = "button";
  element.addEventListener("click", onClick);
  return element;
}

function changeQuantity(product, change) {
  const quantity = (bag.get(product.id) || 0) + change;
  if (quantity > maxQuantity) {
    find("#status").textContent = "The bag limit is 20 of each item.";
    return;
  }
  if (quantity > 0) bag.set(product.id, quantity);
  else bag.delete(product.id);
  try {
    localStorage.setItem(storageKey, JSON.stringify(Object.fromEntries(bag)));
  } catch {
    // The current bag remains available without storage.
  }
  find("#status").textContent = quantity
    ? product.name + " quantity: " + quantity + "."
    : product.name + " removed.";
  renderBag();
}

function renderCatalog() {
  const visible = products.filter((product) => category === "All" || product.category === category);
  const cards = visible.map((product) => {
    const card = make("article", "product");
    const art = make("div", "product-art " + product.id);
    art.setAttribute("aria-hidden", "true");
    art.append(make("span", "", product.art));
    const details = make("div", "details");
    const add = button("Add to bag", () => changeQuantity(product, 1), "primary");
    add.setAttribute("aria-label", "Add " + product.name + " to bag");
    details.append(
      make("p", "category", product.category),
      make("h3", "", product.name),
      make("p", "", price(product.cents)),
      add,
    );
    card.append(art, details);
    return card;
  });
  find("#products").replaceChildren(...cards);
}

function renderBag() {
  const active = document.activeElement?.dataset.bagControl;
  let count = 0;
  let subtotal = 0;
  const rows = products.filter(({ id }) => bag.has(id)).map((product) => {
    const quantity = bag.get(product.id);
    count += quantity;
    subtotal += product.cents * quantity;
    const row = make("div", "bag-row");
    const title = make("div");
    title.append(make("strong", "", product.name), make("p", "", price(product.cents * quantity)));
    const controls = make("div", "quantity");
    const less = button("−", () => changeQuantity(product, -1));
    const more = button("+", () => changeQuantity(product, 1));
    less.dataset.bagControl = product.id + "-less";
    more.dataset.bagControl = product.id + "-more";
    less.setAttribute("aria-label", "Remove one " + product.name);
    more.setAttribute("aria-label", "Add one " + product.name);
    more.disabled = quantity === maxQuantity;
    controls.append(less, make("output", "", String(quantity)), more);
    row.append(title, controls);
    return row;
  });
  if (!rows.length) rows.push(make("p", "", "Your bag is empty."));
  find("#bag-items").replaceChildren(...rows);
  find("#bag-count").textContent = count;
  find("#subtotal").textContent = price(subtotal);
  form.hidden = count === 0;
  if (active && dialog.open) {
    const replacement = [...dialog.querySelectorAll("[data-bag-control]")]
      .find((control) => control.dataset.bagControl === active && !control.disabled);
    (replacement || find("#close-bag")).focus();
  }
}

const filters = ["All", ...new Set(products.map((product) => product.category))]
  .map((name) => {
    const filter = button(name, () => {
      category = name;
      for (const option of filters) {
        option.setAttribute("aria-pressed", String(option === filter));
      }
      renderCatalog();
    });
    filter.setAttribute("aria-pressed", String(name === category));
    return filter;
  });
find("#filters").append(...filters);

find("#open-bag").addEventListener("click", () => dialog.showModal());
find("#close-bag").addEventListener("click", () => dialog.close());
form.addEventListener("submit", (event) => {
  event.preventDefault();
  const customer = new FormData(form).get("customer").trim();
  if (!customer || !bag.size) return;
  const selected = products.filter(({ id }) => bag.has(id));
  const lines = selected.map((product) => {
    const quantity = bag.get(product.id);
    return quantity + " × " + product.name + " — " + price(product.cents * quantity);
  });
  const subtotal = selected.reduce((sum, product) => sum + product.cents * bag.get(product.id), 0);
  const subject = encodeURIComponent("SKY Shop preview order — test only");
  const body = encodeURIComponent(
    ["Test order for " + customer, "", ...lines, "", "Sample subtotal: " + price(subtotal), "", "Preview only. Please do not fulfill."].join("\n"),
  );
  window.location.href = "mailto:?subject=" + subject + "&body=" + body;
});

renderCatalog();
renderBag();
