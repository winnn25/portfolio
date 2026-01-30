// ------------------- Timeline -------------------
const reveals = document.querySelectorAll(".reveal");

window.addEventListener("scroll", () => {
  const windowHeight = window.innerHeight;
  reveals.forEach(el => {
    const top = el.getBoundingClientRect().top;
    if (top < windowHeight - 100) {
      el.classList.add("active");
    }
  });
});

// ------------------- Nav Bar -------------------
fetch("navbar.html")
    .then(response => response.text())
    .then(data => {
      document.getElementById("navbar").innerHTML = data;

      // Navbar is injected after page load, so grab sideMenu AFTER injection
      sideMenu = document.getElementById("sideMenu");
    });

// ------------------- Mobile Menu -------------------
// NOTE: #sideMenu exists inside navbar.html, so it becomes available only AFTER the fetch() above.
// We assign it after navbar injection.
var sideMenu = null;

function openMenu() {
    if (!sideMenu) sideMenu = document.getElementById("sideMenu");
    if (sideMenu) sideMenu.style.right = "0";
}

function closeMenu() {
    if (!sideMenu) sideMenu = document.getElementById("sideMenu");
    if (sideMenu) sideMenu.style.right = "-170px";
}

// ------------------- Google Form Logic -------------------
const form = document.forms ? document.forms['submit-to-google-sheet'] : null;

if (form) {
    const scriptURL = 'https://script.google.com/macros/s/AKfycbzZCaoOk7XdJLhijpgfrBizGWIscAWi7vDe-M1yDSnbDIVdJmRSMTNpvZCyBMWe5cg/exec';
    const msg = document.getElementById("msg");

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        fetch(scriptURL, { method: 'POST', body: new FormData(form) })
            .then(response => {
                msg.innerHTML = "Message sent successfully!";
                setTimeout(() => {
                    msg.innerHTML = "";
                }, 3000);
                form.reset();
            })
            .catch(error => console.error('Error!', error.message));
    });
}

// ------------------- Typing effect  -------------------
(function () {
  const el = document.getElementById("typed-role");
  if (!el) return; // only run on pages that have it

  const roles = ["Web/App Developer", "Software Engineer", "Data Analyst"];

  let roleIndex = 0;
  let charIndex = 0;
  let deleting = false;

  const typingSpeed = 70;
  const deletingSpeed = 40;
  const pauseAfterType = 1200;
  const pauseAfterDelete = 250;

  function tick() {
    const current = roles[roleIndex];

    if (!deleting) {
      // typing
      el.textContent = current.slice(0, charIndex + 1);
      charIndex++;

      if (charIndex === current.length) {
        // pause then start deleting
        setTimeout(() => {
          deleting = true;
          tick();
        }, pauseAfterType);
        return;
      }

      setTimeout(tick, typingSpeed);
    } else {
      // deleting
      el.textContent = current.slice(0, charIndex - 1);
      charIndex--;

      if (charIndex === 0) {
        // move to next word
        deleting = false;
        roleIndex = (roleIndex + 1) % roles.length;

        setTimeout(tick, pauseAfterDelete);
        return;
      }

      setTimeout(tick, deletingSpeed);
    }
  }

  tick();
})();


// ------------------- ChatBot Logic  -------------------


