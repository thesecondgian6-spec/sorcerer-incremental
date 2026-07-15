// ============================================
// AUTH PAGE LOGIC (index.html)
// ============================================

let mode = "signin"; // or "signup"

const usernameField = document.getElementById("usernameField");
const usernameInput = document.getElementById("usernameInput");
const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const submitBtn = document.getElementById("submitBtn");
const authError = document.getElementById("authError");
const toggleBtn = document.getElementById("toggleBtn");
const toggleText = document.getElementById("toggleText");
const formTitle = document.getElementById("formTitle");
const formEyebrow = document.getElementById("formEyebrow");

toggleBtn.addEventListener("click", () => {
  mode = mode === "signin" ? "signup" : "signin";
  updateFormMode();
});

function updateFormMode() {
  authError.style.display = "none";
  if (mode === "signup") {
    usernameField.style.display = "block";
    submitBtn.textContent = "Create Sorcerer";
    toggleText.textContent = "Already have an account?";
    toggleBtn.textContent = "Sign in";
    formTitle.textContent = "Awaken your cursed energy";
    formEyebrow.textContent = "CREATE ACCOUNT";
  } else {
    usernameField.style.display = "none";
    submitBtn.textContent = "Sign In";
    toggleText.textContent = "Don't have an account?";
    toggleBtn.textContent = "Create one";
    formTitle.textContent = "Welcome back, sorcerer";
    formEyebrow.textContent = "SIGN IN";
  }
}

function showError(msg) {
  authError.textContent = msg;
  authError.style.display = "block";
}

submitBtn.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    showError("Enter both an email and password.");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = mode === "signup" ? "Creating..." : "Signing in...";

  if (mode === "signup") {
    const username = usernameInput.value.trim();
    if (!username || username.length < 3) {
      showError("Sorcerer name must be at least 3 characters.");
      submitBtn.disabled = false;
      updateFormMode();
      return;
    }

    const { data, error } = await supabaseClient.auth.signUp({ email, password });

    if (error) {
      showError(error.message);
      submitBtn.disabled = false;
      updateFormMode();
      return;
    }

    // Create the profile row. If email confirmation is ON in your Supabase
    // project, data.user will exist but data.session may be null until they
    // confirm — the profile insert still works because the user id exists.
    const userId = data.user?.id;
    if (userId) {
      const { error: profileError } = await supabaseClient.from("profiles").insert({
        id: userId,
        username: username,
        coins: 100,
        cursed_shards: 500
      });
      if (profileError) {
        showError("Account created, but profile setup failed: " + profileError.message);
        submitBtn.disabled = false;
        updateFormMode();
        return;
      }
    }

    if (!data.session) {
      showError("Account created! Check your email to confirm, then sign in.");
      submitBtn.disabled = false;
      mode = "signin";
      updateFormMode();
      return;
    }

    window.location.href = "game.html";
  } else {
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) {
      showError(error.message);
      submitBtn.disabled = false;
      updateFormMode();
      return;
    }
    window.location.href = "game.html";
  }
});

// If already logged in, skip straight to the game
(async () => {
  const { data } = await supabaseClient.auth.getSession();
  if (data.session) window.location.href = "game.html";
})();
