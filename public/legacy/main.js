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

const authModal = document.getElementById("authModal");
const authModalTitle = document.getElementById("authModalTitle");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const loginSubmitLabel = document.getElementById("loginSubmitLabel");
const registerSubmitLabel = document.getElementById("registerSubmitLabel");
const loginEmailInput = document.getElementById("loginEmail");
const loginPasswordInput = document.getElementById("loginPassword");
const loginPasswordToggle = document.getElementById("loginPasswordToggle");
const googleSignInButton = document.getElementById("googleSignInButton");
const registerUsernameInput = document.getElementById("registerUsername");
const registerEmailInput = document.getElementById("registerEmail");
const registerPasswordInput = document.getElementById("registerPassword");
const registerConfirmPasswordInput = document.getElementById(
  "registerConfirmPassword",
);
const openModalButtons = document.querySelectorAll("[data-open-modal]");
const closeModalButtons = document.querySelectorAll("[data-close-auth]");
const switchAuthButtons = document.querySelectorAll("[data-switch-auth]");
if (authModal && authModalTitle && loginForm && registerForm) {
  let loginInFlight = false;
  let registerInFlight = false;
  const loginSubmitButton = loginForm.querySelector('button[type="submit"]');
  const registerSubmitButton = registerForm.querySelector('button[type="submit"]');

  const setLoginBusy = (busy) => {
    loginInFlight = busy;
    if (loginSubmitButton) loginSubmitButton.disabled = busy;
    if (loginSubmitLabel) loginSubmitLabel.textContent = busy ? "Logging in..." : "Log in";
    if (googleSignInButton) {
      googleSignInButton.toggleAttribute("aria-disabled", busy);
      googleSignInButton.setAttribute("aria-busy", String(busy));
    }
  };

  const setRegisterBusy = (busy) => {
    registerInFlight = busy;
    if (registerSubmitButton) registerSubmitButton.disabled = busy;
    if (registerSubmitLabel) {
      registerSubmitLabel.textContent = busy ? "Creating..." : "Create account";
    }
  };

  // The public landing is rendered inside a same-origin iframe. A successful
  // login must therefore navigate the top-level application, not only iframe.
  const workspacePathForRole = (role) => {
    const normalized = String(role || "").toLowerCase();
    if (normalized === "teacher" || normalized === "instructor") return "/teacher";
    if (["content_manager", "admin", "super_admin"].includes(normalized)) return "/admin";
    return "/student";
  };

  const openDashboard = (path = "/student") => {
    const target = window.top && window.top !== window ? window.top : window;
    target.location.assign(path);
  };

  let loginError = document.getElementById("loginError");
  if (!loginError) {
    loginError = document.createElement("p");
    loginError.id = "loginError";
    loginError.className = "auth-link";
    loginError.style.color = "#dc2626";
    loginError.style.display = "none";
    loginForm.appendChild(loginError);
  }

  let registerError = document.getElementById("registerError");
  if (!registerError) {
    registerError = document.createElement("p");
    registerError.id = "registerError";
    registerError.className = "auth-link";
    registerError.style.color = "#dc2626";
    registerError.style.display = "none";
    registerForm.appendChild(registerError);
  }

  const showForm = (mode) => {
    const showRegister = mode === "register";
    loginForm.hidden = showRegister;
    registerForm.hidden = !showRegister;
    authModalTitle.textContent = showRegister ? "Create account" : "Log in";
    if (loginSubmitLabel) loginSubmitLabel.textContent = "Log in";
    if (registerSubmitLabel) registerSubmitLabel.textContent = "Create account";
    if (loginError) {
      loginError.textContent = "";
      loginError.style.display = "none";
    }
    if (registerError) {
      registerError.textContent = "";
      registerError.style.display = "none";
    }
  };

  const openModal = (mode = "login") => {
    showForm(mode);
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
    button.addEventListener("click", (event) => {
      event.preventDefault();
      const mode = button.getAttribute("data-switch-auth");
      if (mode === "login" || mode === "register") {
        showForm(mode);
      }
    });
  });

  if (loginPasswordToggle && loginPasswordInput) {
    loginPasswordToggle.addEventListener("click", () => {
      const nextType =
        loginPasswordInput.type === "password" ? "text" : "password";
      loginPasswordInput.type = nextType;
      loginPasswordToggle.textContent = nextType === "password" ? "👁" : "🙈";
      loginPasswordToggle.setAttribute(
        "aria-label",
        nextType === "password" ? "Show password" : "Hide password",
      );
    });
  }

  if (googleSignInButton) {
    googleSignInButton.addEventListener("click", async (event) => {
      event.preventDefault();
      if (loginInFlight) return;
      setLoginBusy(true);

      try {
        const csrfResponse = await fetch("/api/auth/csrf", {
          credentials: "same-origin",
          cache: "no-store",
        });
        const { csrfToken } = await csrfResponse.json();
        if (!csrfResponse.ok || typeof csrfToken !== "string") {
          throw new Error("Unable to prepare Google sign-in.");
        }

        const callbackUrl = new URL("/auth/complete", window.location.origin);
        callbackUrl.searchParams.set("next", "/dashboard");

        const form = document.createElement("form");
        form.method = "post";
        form.action = "/api/auth/signin/google";
        form.target = "_top";
        form.hidden = true;

        for (const [name, value] of Object.entries({
          csrfToken,
          callbackUrl: callbackUrl.toString(),
        })) {
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = name;
          input.value = value;
          form.appendChild(input);
        }

        document.body.appendChild(form);
        form.submit();
      } catch {
        if (loginError) {
          loginError.textContent = "Google sign-in could not be started. Please try again.";
          loginError.style.display = "block";
        }
        setLoginBusy(false);
      }
    });
  }

  closeModalButtons.forEach((button) => {
    button.addEventListener("click", closeModal);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && authModal.classList.contains("is-open")) {
      closeModal();
    }
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (loginInFlight) return;

    const identifier = loginEmailInput?.value?.trim() || "";
    const password = loginPasswordInput?.value || "";

    if (!identifier || !password) return;

    setLoginBusy(true);
    if (loginError) {
      loginError.textContent = "";
      loginError.style.display = "none";
    }

    let redirectStarted = false;
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ identifier, password }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        if (loginError) {
          loginError.textContent = payload?.error || "Login failed";
          loginError.style.display = "block";
        }
        return;
      }

      redirectStarted = true;
      openDashboard(workspacePathForRole(payload?.user?.role));
    } catch {
      if (loginError) {
        loginError.textContent = "Network error. Please try again.";
        loginError.style.display = "block";
      }
    } finally {
      if (!redirectStarted) setLoginBusy(false);
    }
  });

  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (registerInFlight) return;

    const username = registerUsernameInput?.value?.trim() || "";
    const email = registerEmailInput?.value?.trim() || "";
    const password = registerPasswordInput?.value || "";
    const confirmPassword = registerConfirmPasswordInput?.value || "";

    if (!username || !email || !password || !confirmPassword) return;
    if (password !== confirmPassword) {
      if (registerError) {
        registerError.textContent = "Passwords do not match.";
        registerError.style.display = "block";
      }
      return;
    }

    setRegisterBusy(true);
    if (registerError) {
      registerError.textContent = "";
      registerError.style.display = "none";
    }

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        if (registerError) {
          registerError.textContent = payload?.error || "Registration failed";
          registerError.style.display = "block";
        }
        return;
      }

      // Fallback for environments where register might not issue a session cookie.
      const meResponse = await fetch("/api/auth/me", {
        method: "GET",
        credentials: "include",
      });
      if (!meResponse.ok) {
        const loginResponse = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier: email, password }),
        });

        if (!loginResponse.ok) {
          const loginPayload = await loginResponse.json().catch(() => null);
          if (registerError) {
            registerError.textContent =
              loginPayload?.error ||
              "Account created, but auto-login failed. Please log in.";
            registerError.style.display = "block";
          }
          showForm("login");
          return;
        }
      }

      openDashboard();
    } catch {
      if (registerError) {
        registerError.textContent = "Network error. Please try again.";
        registerError.style.display = "block";
      }
    } finally {
      setRegisterBusy(false);
    }
  });
}
