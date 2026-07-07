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
function initNavbar() {
  sideMenu = document.getElementById("sideMenu");

  // Add auto-close listener and dynamic active class checking
  if (sideMenu) {
    const links = sideMenu.querySelectorAll("a");
    const currentPath = window.location.pathname;
    const cleanPath = currentPath.split("/").pop() || "index.html";

    // Helper to clean active classes
    const clearActive = () => links.forEach(l => l.classList.remove("active"));

    links.forEach(link => {
      link.addEventListener("click", () => {
        closeMenu();
        clearActive();
        link.classList.add("active");
      });

      // Clean href check to highlight active navigation link
      const href = link.getAttribute("href") || "";
      if (cleanPath === "projects.html" && href === "projects.html") {
        link.classList.add("active");
      } else if (cleanPath === "certs.html" && href === "certs.html") {
        link.classList.add("active");
      } else if (cleanPath === "contact.html" && href === "contact.html") {
        link.classList.add("active");
      } else if (cleanPath === "index.html" || cleanPath === "" || cleanPath === "/") {
        if (href === "index.html#header" || href === "index.html") {
          link.classList.add("active");
        }
      }
    });
  }
}

const navbarEl = document.getElementById("navbar");
if (navbarEl) {
  if (navbarEl.children.length > 0 || navbarEl.innerHTML.trim() !== "") {
    initNavbar();
  } else {
    fetch("navbar.html")
      .then(response => response.text())
      .then(data => {
        navbarEl.innerHTML = data;
        initNavbar();
      });
  }
}

// ------------------- Footer -------------------
const footerEl = document.getElementById("footer");
if (footerEl) {
  if (footerEl.children.length > 0 || footerEl.innerHTML.trim() !== "") {
    // Already populated
  } else {
    fetch("footer.html")
      .then(response => response.text())
      .then(data => {
        footerEl.innerHTML = data;
      });
  }
}

// ------------------- Mobile Menu -------------------
// NOTE: #sideMenu exists inside navbar.html, so it becomes available only AFTER the fetch() above.
// We assign it after navbar injection.
var sideMenu = null;

function openMenu() {
    if (!sideMenu) sideMenu = document.getElementById("sideMenu");
    if (sideMenu) {
        sideMenu.style.right = "0";
        document.body.classList.add("menu-open");
    }
}

function closeMenu() {
    if (!sideMenu) sideMenu = document.getElementById("sideMenu");
    if (sideMenu) {
        sideMenu.style.right = "-170px";
        document.body.classList.remove("menu-open");
    }
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

  const roles = ["Web Developer", "App Developer"];

  let roleIndex = 0;
  let charIndex = 0;
  let deleting = false;

  const typingSpeed = 70;
  const deletingSpeed = 40;
  const pauseAfterType = 1800;
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


// ------------------- Glowing Neon Slash Mouse Trail -------------------
(function () {
  // Create and style canvas dynamically
  const canvas = document.createElement("canvas");
  canvas.id = "mouse-trail-canvas";
  canvas.style.position = "fixed";
  canvas.style.top = "0";
  canvas.style.left = "0";
  canvas.style.width = "100vw";
  canvas.style.height = "100vh";
  canvas.style.pointerEvents = "none";
  canvas.style.zIndex = "999999";
  document.body.appendChild(canvas);

  const ctx = canvas.getContext("2d");

  let points = [];
  let particles = [];
  let hue = 0;

  // Resize handler to maintain exact pixel density
  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();

  // Helper to generate values within a range
  function random(min, max) {
    return Math.random() * (max - min) + min;
  }

  // Particle class for the glowing sparks/embers
  class Particle {
    constructor(x, y, color) {
      this.x = x;
      this.y = y;
      this.vx = random(-2.5, 2.5);
      this.vy = random(-2.5, 2.5);
      this.size = random(2, 6);
      this.color = color;
      this.alpha = 1.0;
      this.decay = random(0.03, 0.06);
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.alpha -= this.decay;
      if (this.size > 0.1) this.size -= 0.1;
    }

    draw() {
      ctx.save();
      ctx.globalAlpha = this.alpha;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.shadowBlur = 12;
      ctx.shadowColor = this.color;
      ctx.fill();
      ctx.restore();
    }
  }

  // Track position and add points to the slash trail
  function addPoint(x, y) {
    // Dynamically cycle through vibrant neon hues
    hue = (hue + 6) % 360;
    const color = `hsla(${hue}, 100%, 60%, 1)`;

    points.push({
      x: x,
      y: y,
      age: 0,
      color: color,
      hue: hue
    });

    // Spawn 1-2 sparks per trail segment to give it a premium, energetic feeling
    const sparkCount = Math.floor(random(1, 3));
    for (let i = 0; i < sparkCount; i++) {
      particles.push(new Particle(x, y, color));
    }
  }

  window.addEventListener("mousemove", (e) => {
    addPoint(e.clientX, e.clientY);
  });

  window.addEventListener("touchmove", (e) => {
    if (e.touches.length > 0) {
      addPoint(e.touches[0].clientX, e.touches[0].clientY);
    }
  });

  // Animation Loop
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Draw the glowing neon slash (Fruit Ninja style with tapering, glowing curves)
    if (points.length > 1) {
      for (let i = 1; i < points.length; i++) {
        const p1 = points[i - 1];
        const p2 = points[i];

        const ratio = i / points.length; // 0 at tail, 1 at cursor
        const width = ratio * 15; // wide at cursor, tapering to a sharp point at the tail
        const alpha = ratio * (1 - p2.age / 20); // fade out over age and array position

        if (alpha <= 0) continue;

        // Draw outer thick glow layer
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = p2.color;
        ctx.lineWidth = width;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.globalAlpha = alpha;
        ctx.shadowBlur = 20;
        ctx.shadowColor = p2.color;
        ctx.stroke();
        ctx.restore();

        // Draw inner bright neon core layer (gives that intense laser/slash look)
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = `hsla(${p2.hue}, 100%, 92%, 1)`;
        ctx.lineWidth = width * 0.35;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.globalAlpha = alpha * 0.95;
        ctx.stroke();
        ctx.restore();
      }
    }

    // Advance point ages
    for (let i = points.length - 1; i >= 0; i--) {
      points[i].age += 1.5; // fast-paced decay
      if (points[i].age > 18 || points.length > 20) {
        points.splice(0, i + 1);
        break;
      }
    }

    // 2. Draw and update particles (floating neon sparks)
    for (let i = particles.length - 1; i >= 0; i--) {
      particles[i].update();
      if (particles[i].alpha <= 0 || particles[i].size <= 0.1) {
        particles.splice(i, 1);
      } else {
        particles[i].draw();
      }
    }

    requestAnimationFrame(animate);
  }

  animate();
})();


// ------------------- Blinking Red Stars Effect -------------------
const setupSparkles = () => {
  const existingContainer = document.getElementById('sparkle-container');
  if (existingContainer) existingContainer.remove();

  const container = document.createElement('div');
  container.id = 'sparkle-container';
  document.body.appendChild(container);

  const sparkleEmoji = '✧'; 
  // Desktop: 67 sparkles, Mobile (<1024px): 25 sparkles – strict user preference
  const sparkleCount = window.innerWidth > 1024 ? 67 : 25; 

  for (let i = 0; i < sparkleCount; i++) {
    const sparkle = document.createElement('div');
    sparkle.className = 'sparkle';
    sparkle.textContent = sparkleEmoji;
    
    // Random position (0-100% left/top)
    const x = Math.random() * 100;
    const y = Math.random() * 100;
    const size = 8 + Math.random() * 12;      // px
    const delay = Math.random() * 15;         // seconds
    const duration = 2 + Math.random() * 3;   // seconds
    const initialRotate = Math.random() * 360;
    
    sparkle.style.left = `${x}%`;
    sparkle.style.top = `${y}%`;
    sparkle.style.fontSize = `${size}px`;
    sparkle.style.setProperty('--sparkle-rotate', `${initialRotate}deg`);
    sparkle.style.animationDelay = `${delay}s`;
    sparkle.style.animationDuration = `${duration}s`;
    
    container.appendChild(sparkle);
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupSparkles);
} else {
  setupSparkles();
}

window.addEventListener('resize', () => {
  const currentCount = document.querySelectorAll('.sparkle').length;
  const expectedCount = window.innerWidth > 1024 ? 67 : 25;
  if ((currentCount > 25 && expectedCount === 25) || (currentCount <= 25 && expectedCount === 67)) {
    setupSparkles();
  }
});


// ------------------- Carousel Mobile Tap-to-Toggle -------------------
const initMobileCarouselToggle = () => {
  const cards = document.querySelectorAll('.carousel-card');
  const track = document.querySelector('.carousel-track');
  if (!cards.length) return;
  
  const updateTrackPauseState = () => {
    if (!track) return;
    const hasActive = Array.from(cards).some(c => c.classList.contains('active-mobile'));
    if (hasActive) {
      track.classList.add('paused');
      track.style.animationPlayState = 'paused';
    } else {
      track.classList.remove('paused');
      track.style.animationPlayState = '';
    }
  };

  cards.forEach(card => {
    card.addEventListener('click', (e) => {
      // If the clicked element or its parent is the link button, let it navigate normally
      if (e.target.closest('.explore-btn')) {
        return; 
      }
      
      // Check if we are on a mobile/tablet touch view (width <= 1024px)
      if (window.innerWidth <= 1024) {
        e.preventDefault();
        const isActive = card.classList.contains('active-mobile');
        
        // Remove active class from all cards
        cards.forEach(c => c.classList.remove('active-mobile'));
        
        if (!isActive) {
          card.classList.add('active-mobile');
        }
        
        updateTrackPauseState();
        // Stop event from bubbling to document click
        e.stopPropagation();
      }
    });
  });
  
  // Clicking anywhere else on the document closes any active mobile card details
  document.addEventListener('click', () => {
    cards.forEach(c => c.classList.remove('active-mobile'));
    updateTrackPauseState();
  });
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMobileCarouselToggle);
} else {
  initMobileCarouselToggle();
}


// ------------------- Back to Top Button -------------------
const initBackToTop = () => {
  // Create button element
  const backToTopBtn = document.createElement('button');
  backToTopBtn.id = 'backToTopBtn';
  backToTopBtn.className = 'back-to-top-btn';
  backToTopBtn.innerHTML = '<i class="fa-solid fa-arrow-up"></i>';
  backToTopBtn.setAttribute('aria-label', 'Back to top');
  document.body.appendChild(backToTopBtn);

  // Monitor scroll to show/hide button
  window.addEventListener('scroll', () => {
    // Show when scrolled past 350px (e.g. past hero section)
    if (window.scrollY > 350) {
      backToTopBtn.classList.add('visible');
    } else {
      backToTopBtn.classList.remove('visible');
    }
  });

  // Smooth scroll back to top on click
  backToTopBtn.addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initBackToTop);
} else {
  initBackToTop();
}


// ------------------- Terminal Dynamic Typing Effect -------------------
const initTerminalTyping = () => {
  const terminal = document.querySelector('.cmd-terminal');
  if (!terminal) return;

  const body = terminal.querySelector('.cmd-body');
  const para2 = document.getElementById('cmd-para-2');
  const para3 = document.getElementById('cmd-para-3');
  if (!para2 || !para3) return;

  const text2 = para2.getAttribute('data-text') || '';
  const text3 = para3.getAttribute('data-text') || '';

  // Clear initially
  para2.innerHTML = '';
  para3.innerHTML = '';

  let started = false;

  const typeText = (element, text, callback) => {
    let index = 0;
    // Create cursor using the red premium class
    const cursor = document.createElement('span');
    cursor.className = 'cmd-cursor';
    element.appendChild(cursor);

    const typeNextChar = () => {
      if (index < text.length) {
        const char = text.charAt(index);
        const charNode = document.createTextNode(char);
        element.insertBefore(charNode, cursor);
        index++;

        // Auto-scroll body so typed text is always visible
        if (body) {
          body.scrollTop = body.scrollHeight;
        }

        // Determine dynamic, natural typing speed delay (human-like cadence)
        let delay = 20 + Math.random() * 25; // base delay of 20-45ms (natural, pleasant speed)

        // Add pauses at punctuation
        if (char === '.' || char === '!' || char === '?') {
          delay += 250 + Math.random() * 150; // human pause at end of sentence
        } else if (char === ',') {
          delay += 120 + Math.random() * 80;  // pause at comma
        } else if (char === ' ') {
          if (Math.random() < 0.15) {
            delay += 40 + Math.random() * 40; // natural space pause
          }
        }

        // Introduce random slight hesitations
        if (Math.random() < 0.03) {
          delay += 200 + Math.random() * 100;
        }

        setTimeout(typeNextChar, delay);
      } else {
        if (callback) {
          cursor.remove();
          callback();
        }
      }
    };

    // Kickoff typing
    typeNextChar();
  };

  const startTyping = () => {
    if (started) return;
    started = true;

    // Start with para 2
    typeText(para2, text2, () => {
      // Then type para 3
      typeText(para3, text3, null); // Keep the red cursor blinking at the end of para 3
    });
  };

  // IntersectionObserver to start typing on scroll
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        startTyping();
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.15
  });

  observer.observe(terminal);
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTerminalTyping);
} else {
  initTerminalTyping();
}



