const demoSubmit = document.getElementById("demoSubmit");
const demoAnswer = document.getElementById("demoAnswer");
const demoScore = document.getElementById("demoScore");

if (demoSubmit && demoAnswer && demoScore) {
  demoSubmit.addEventListener("click", () => {
    const value = demoAnswer.value.trim().toLowerCase();
    let score = 60;
    let feedback =
      "Nice start! Add more specific examples and a clear goal to improve your score.";

    if (value.includes("practice") || value.includes("daily")) score += 12;
    if (value.includes("listen") || value.includes("speaking")) score += 10;
    if (value.includes("confidence") || value.includes("goal")) score += 8;
    if (value.includes("english")) score += 5;

    score = Math.min(score, 96);

    if (score >= 85) {
      feedback =
        "Excellent! Your answer is clear, specific, and action-oriented.";
    } else if (score >= 70) {
      feedback =
        "Great job! You have a solid idea — add one more practical detail to make it stronger.";
    }

    demoScore.classList.add("show");
    demoScore.innerHTML = `<strong>Score: ${score}/100</strong><br>${feedback}`;
  });
}

document.querySelectorAll(".faq-item").forEach((item) => {
  const button = item.querySelector(".faq-question");
  if (!button) return;

  button.addEventListener("click", () => {
    const isActive = item.classList.contains("active");
    document
      .querySelectorAll(".faq-item")
      .forEach((faq) => faq.classList.remove("active"));
    if (!isActive) item.classList.add("active");
  });
});

const scrollToTopBtn = document.getElementById("scrollToTopBtn");

if (scrollToTopBtn) {
  const toggleScrollButton = () => {
    if (window.scrollY > 300) {
      scrollToTopBtn.classList.add("is-visible");
    } else {
      scrollToTopBtn.classList.remove("is-visible");
    }
  };

  scrollToTopBtn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  window.addEventListener("scroll", toggleScrollButton, { passive: true });
  toggleScrollButton();
}

const allCoursesTemplate = document.getElementById("allCoursesTemplate");
const levelCourseTargets = document.querySelectorAll(".js-level-courses");
const levelAccordions = document.querySelectorAll(".level-accordion");

if (allCoursesTemplate && levelCourseTargets.length) {
  levelCourseTargets.forEach((target) => {
    const clone = allCoursesTemplate.content.cloneNode(true);
    target.appendChild(clone);
  });
}

levelAccordions.forEach((accordion) => {
  accordion.addEventListener("toggle", () => {
    if (accordion.open) {
      levelAccordions.forEach((other) => {
        if (other !== accordion) other.open = false;
      });
    }
  });
});

const authModal = document.getElementById("authModal");
const authModalTitle = document.getElementById("authModalTitle");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const registerError = document.getElementById("registerError");
const registerPassword = document.getElementById("registerPassword");
const registerConfirmPassword = document.getElementById(
  "registerConfirmPassword",
);
const loginRole = document.getElementById("loginRole");
const authModeBadge = document.getElementById("authModeBadge");
const teacherWorkspaceField = document.getElementById("teacherWorkspaceField");
const teacherWorkspaceInput = document.getElementById("teacherWorkspace");
const loginSubmitLabel = document.getElementById("loginSubmitLabel");
const openModalButtons = document.querySelectorAll("[data-open-modal]");
const closeModalButtons = document.querySelectorAll("[data-close-auth]");
const switchAuthButtons = document.querySelectorAll("[data-switch-auth]");

if (authModal && authModalTitle && loginForm && registerForm) {
  const setLoginMode = (mode) => {
    const isTeacher = mode === "teacher";

    if (loginRole) loginRole.value = isTeacher ? "teacher" : "student";

    if (authModeBadge) {
      authModeBadge.textContent = isTeacher ? "Teacher mode" : "Student mode";
    }

    if (teacherWorkspaceField && teacherWorkspaceInput) {
      teacherWorkspaceField.hidden = !isTeacher;
      teacherWorkspaceInput.required = isTeacher;
      if (!isTeacher) teacherWorkspaceInput.value = "";
    }

    if (loginSubmitLabel) {
      loginSubmitLabel.textContent = isTeacher
        ? "Open Teacher Workspace"
        : "Log In";
    }

    authModalTitle.textContent = isTeacher ? "Teacher Sign In" : "Log In";
  };

  const showForm = (type) => {
    const isLogin = type !== "register";
    loginForm.hidden = !isLogin;
    registerForm.hidden = isLogin;
    if (type === "teacher") {
      setLoginMode("teacher");
    } else if (isLogin) {
      setLoginMode("login");
    } else {
      authModalTitle.textContent = "Sign Up";
    }
    if (registerError) registerError.hidden = true;
  };

  const openModal = (type) => {
    showForm(type);
    authModal.classList.add("is-open");
    authModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
  };

  const closeModal = () => {
    authModal.classList.remove("is-open");
    authModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
  };

  openModalButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      openModal(button.getAttribute("data-open-modal") || "login");
    });
  });

  switchAuthButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.getAttribute("data-switch-auth");
      if (target === "login" || target === "register") {
        showForm(target);
      }
    });
  });

  closeModalButtons.forEach((button) => {
    button.addEventListener("click", closeModal);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && authModal.classList.contains("is-open")) {
      closeModal();
    }
  });

  loginForm.addEventListener("submit", (event) => event.preventDefault());
  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (loginRole && loginRole.value === "teacher") {
      const workspaceValue = teacherWorkspaceInput
        ? teacherWorkspaceInput.value.trim()
        : "";

      if (!workspaceValue) {
        if (teacherWorkspaceInput) teacherWorkspaceInput.focus();
        return;
      }
    }
  });
  registerForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const password = registerPassword ? registerPassword.value : "";
    const confirmPassword = registerConfirmPassword
      ? registerConfirmPassword.value
      : "";

    if (password !== confirmPassword) {
      if (registerError) registerError.hidden = false;
      return;
    }

    if (registerError) registerError.hidden = true;
  });
}
