document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // small helper to avoid inserting raw HTML
  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (s) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[s])
    );
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message / previous cards
      activitiesList.innerHTML = "";

      // Reset select options (keep placeholder)
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - (details.participants?.length || 0);

        // Build participants HTML (pills) or fallback text
        let participantsHtml;
        if (details.participants && details.participants.length) {
          // build pills with delete buttons
          const pills = details.participants
            .map(
              (p) =>
                `<li class="participant-pill" data-activity="${escapeHtml(name)}" data-email="${escapeHtml(
                  p
                )}"><span class="participant-email">${escapeHtml(p)}</span><button class="participant-delete" aria-label="Unregister ${escapeHtml(
                  p
                )}">&times;</button></li>`
            )
            .join("");
          participantsHtml = `<ul class="participants-list">${pills}</ul>`;
        } else {
          participantsHtml = `<p class="no-participants">No participants yet</p>`;
        }

        activityCard.innerHTML = `
          <h4>${escapeHtml(name)}</h4>
          <p>${escapeHtml(details.description || "")}</p>
          <p><strong>Schedule:</strong> ${escapeHtml(details.schedule || "")}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-section">
            <h5 class="participants-heading">Participants</h5>
            ${participantsHtml}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Event delegation for participant delete (unregister)
  activitiesList.addEventListener("click", async (e) => {
    const deleteBtn = e.target.closest(".participant-delete");
    if (!deleteBtn) return;

    const pill = deleteBtn.closest(".participant-pill");
    if (!pill) return;

    const activityName = pill.getAttribute("data-activity");
    const email = pill.getAttribute("data-email");

    if (!activityName || !email) return;

    // confirm quick UX (non-blocking requirement — minimal)
    if (!confirm(`Unregister ${email} from ${activityName}?`)) return;

    try {
      const resp = await fetch(
        `/activities/${encodeURIComponent(activityName)}/unregister?email=${encodeURIComponent(email)}`,
        { method: "POST" }
      );

      const json = await resp.json();
      if (resp.ok) {
        // remove pill from DOM for instant feedback
        pill.remove();

        // if there are no more pills, replace with "No participants yet"
        const list = activitiesList.querySelector(`[data-activity="${activityName}"]`);
        // easier: refresh full list to keep things consistent
        fetchActivities();
      } else {
        alert(json.detail || "Failed to unregister participant");
      }
    } catch (err) {
      console.error("Error unregistering:", err);
      alert("Failed to unregister. Please try again.");
    }
  });

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "message success";
        signupForm.reset();

        // Refresh activities so participants list updates immediately
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "message error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "message error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
