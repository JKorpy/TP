const toggleBtn = document.getElementById("themeToggle");
const themeIcon = document.getElementById("themeIcon");

//Load saved theme
if (localStorage.getItem("theme") === "dark") {
  document.body.classList.add("dark");
  themeIcon.src = "/img/lightMode_svg.svg";
}

toggleBtn.addEventListener("click", () => {
  document.body.classList.toggle("dark");

  if (document.body.classList.contains("dark")) {
    localStorage.setItem("theme", "dark");
    themeIcon.src = "/img/lightMode_svg.svg";
  } else {
    localStorage.setItem("theme", "light");
    themeIcon.src = "/img/darkMode_svg.svg";
  }
});