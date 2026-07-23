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
