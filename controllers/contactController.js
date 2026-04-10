exports.getContact = (request, response) => {
  response.render("contact", {
    title: "Contact",
    error: null,
    success: null,
    formData: {
      email: "",
      reason: "",
      feedback: "",
    },
  });
};

exports.postContact = async (request, response) => {
  try {
    const { email, reason, feedback } = request.body;
    const formData = {
      email: email || "",
      reason: reason || "",
      feedback: feedback || "",
    };

    if (!email || !reason || !feedback) {
      return response.status(400).render("contact", {
        title: "Contact",
        error: "All fields are required.",
        success: null,
        formData,
      });
    }

    return response.render("contact", {
      title: "Contact",
      success: "Your message has been sent successfully.",
      error: null,
      formData: {
        email: "",
        reason: "",
        feedback: "",
      },
    });
  } catch (error) {
    console.error("Error submitting contact form:", error);
    return response.status(500).render("contact", {
      title: "Contact",
      error: "Something went wrong while sending your message.",
      success: null,
      formData: {
        email: request.body?.email || "",
        reason: request.body?.reason || "",
        feedback: request.body?.feedback || "",
      },
    });
  }
};

