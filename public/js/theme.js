const toggleBtn = document.getElementById("themeToggle");
const themeIcon = document.getElementById("themeIcon");

// Load saved theme on page load
if (localStorage.getItem("theme") === "light") {     //light
  document.body.classList.add("light");      //light
  themeIcon.src = "/img/darkMode_svg.svg";     //dark mode icon
}

toggleBtn.addEventListener("click", () => {
  document.body.classList.toggle("light");       //light

  if (document.body.classList.contains("light")) {       //light
    localStorage.setItem("theme", "light");      //light
    themeIcon.src = "/img/darkMode_svg.svg";   //dark mode icon
  } else {
    localStorage.setItem("theme", "dark");     //dark
    themeIcon.src = "/img/lightMode_svg.svg";    //light mode icon
  }
});