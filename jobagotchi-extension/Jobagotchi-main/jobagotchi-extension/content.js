function showBadge(result, color) {

  const oldBadge =
    document.querySelector(".jobagotchi-badge");

  if (oldBadge) {
    oldBadge.remove();
  }

  const badge = document.createElement("div");

  badge.className = "jobagotchi-badge";

  badge.style.border = `4px solid ${color}`;

  badge.innerHTML = `
  
    <div style="
      display:flex;
      gap:12px;
      align-items:center;
    ">
    
      <div style="font-size:48px;">
        🧹
      </div>

      <div>
        <h2 style="margin:0;">
          Jobagotchi
        </h2>

        <div style="margin-top:8px;">
          ${result}
        </div>
      </div>

    </div>
  `;

  document.body.appendChild(badge);
}

function analyzeJob() {

  const text =
    document.body.innerText.toLowerCase();

  // fake scam detection
  if (
    text.includes("easy money") ||
    text.includes("whatsapp") ||
    text.includes("telegram")
  ) {

    showBadge(
      `
      🔴 Scam Risk High<br><br>
      Suspicious wording detected.<br>
      This posting may be fake.
      `,
      "red"
    );

  } else {

    showBadge(
      `
      🟢 Legit Score: 87%<br><br>
      Looks like a legitimate remote role.
      `,
      "green"
    );

  }
}

setTimeout(() => {

  showBadge(
    "🔍 Scanning this job posting...",
    "orange"
  );

  setTimeout(() => {

    analyzeJob();

  }, 2000);

}, 1000);