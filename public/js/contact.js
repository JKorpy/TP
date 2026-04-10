const contactForm = document.getElementById("contactForm");
const clearContactFormBtn = document.getElementById("clearContactForm");

if (contactForm) {
  contactForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const formData = new FormData(contactForm);
    const email = formData.get("email").trim();
    const reason = formData.get("reason").trim();
    const feedback = formData.get("feedback").trim();

    const subject = encodeURIComponent(`Contact Form: ${reason}`);
    const body = encodeURIComponent(
      `Email: ${email}\nReason for Contact: ${reason}\n\nFeedback:\n${feedback}`
    );

    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
  });
}

if (clearContactFormBtn) {
  clearContactFormBtn.addEventListener("click", () => {
    contactForm.reset();
  });
}
