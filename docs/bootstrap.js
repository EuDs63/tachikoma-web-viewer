const dialog = document.querySelector("#guide-dialog");
const guideOpen = document.querySelector("#guide-open");
guideOpen.addEventListener("click", () => dialog.showModal());
document
  .querySelector("#guide-close")
  .addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  const bounds = dialog.getBoundingClientRect();
  if (
    event.target === dialog &&
    (event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom)
  )
    dialog.close();
});
dialog.addEventListener("close", () =>
  guideOpen.focus({ preventScroll: true }),
);
document.querySelectorAll("[data-explore-mode]").forEach((button) => {
  button.addEventListener("click", () => {
    document
      .querySelector(`.mode[data-mode="${button.dataset.exploreMode}"]`)
      .click();
    document
      .querySelector("#exhibit")
      .scrollIntoView({
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
  });
});
const navigation = [...document.querySelectorAll(".primary-nav a")];
new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting)
        navigation.forEach((link) =>
          link.classList.toggle(
            "nav-active",
            link.hash === `#${entry.target.id}`,
          ),
        );
    }
  },
  { rootMargin: "-10% 0px -45% 0px" },
).observe(document.querySelector("#dossier"));
new IntersectionObserver(([entry]) => {
  if (entry.isIntersecting)
    navigation.forEach((link) =>
      link.classList.toggle("nav-active", link.hash === "#exhibit"),
    );
}).observe(document.querySelector(".title-row"));
try {
  const { initViewer } = await import("./app.js?v=22-archive");
  await initViewer();
} catch (error) {
  console.error("The interactive exhibit could not start.", error);
  document.querySelector("#load-state").classList.add("is-error");
  document.querySelector("#load-label").textContent = "暂时无法开启 3D 观察室";
  document.querySelector("#load-percent").textContent = "";
  document.querySelector("#viewer-status").textContent =
    "三维展品启动失败，可以重试或观看巡逻录像。";
  const retry = document.querySelector("#retry-load");
  retry.hidden = false;
  retry.addEventListener("click", () => location.reload());
  document.querySelector(".load-fallback").hidden = false;
}
