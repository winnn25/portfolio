/**
 * ==============================================
 * 3D Interactive Keyboard — vanilla JS version 
 * ==============================================
 */

import { Application } from "https://unpkg.com/@splinetool/runtime@1.12.0/build/runtime.js";
import { SKILLS } from "./skills-data.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Per-section scale/position/rotation targets are captured dynamically from the Spline scene

// --- Sound (Web Audio API, with synthetic oscillator fallbacks if decoding fails) ---
function createSoundPlayer(soundsPath) {
  let ctx = null;
  let pressBuffer = null;
  let releaseBuffer = null;
  let fallbackEnabled = false;

  (async () => {
    try {
      const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextCtor) return;
      ctx = new AudioContextCtor();

      const [pressRes, releaseRes] = await Promise.all([
        fetch(`${soundsPath}/press.mp3`),
        fetch(`${soundsPath}/release.mp3`),
      ]);
      const [pressBuf, releaseBuf] = await Promise.all([
        pressRes.arrayBuffer(),
        releaseRes.arrayBuffer(),
      ]);
      
      if (pressBuf.byteLength > 0 && releaseBuf.byteLength > 0) {
        pressBuffer = await ctx.decodeAudioData(pressBuf).catch(() => null);
        releaseBuffer = await ctx.decodeAudioData(releaseBuf).catch(() => null);
      }
      
      if (!pressBuffer || !releaseBuffer) {
        fallbackEnabled = true;
      }
    } catch (err) {
      console.warn("Failed to load keycap sound files, using synthetic fallback.", err);
      fallbackEnabled = true;
    }
  })();

  function getContext() {
    if (ctx?.state === "suspended") ctx.resume().catch(() => {});
    return ctx;
  }

  function playBuffer(buffer) {
    try {
      const c = getContext();
      if (!c || !buffer) return;
      const source = c.createBufferSource();
      source.buffer = buffer;
      source.detune.value = Math.random() * 200 - 100;
      const gain = c.createGain();
      gain.gain.value = 0.4;
      source.connect(gain);
      gain.connect(c.destination);
      source.start(0);
    } catch (err) {
      console.error(err);
    }
  }

  function playSyntheticPress() {
    try {
      const c = getContext();
      if (!c) return;
      
      const osc = c.createOscillator();
      const gain = c.createGain();
      const filter = c.createBiquadFilter();
      
      filter.type = "peaking";
      filter.frequency.setValueAtTime(800, c.currentTime);
      filter.Q.setValueAtTime(5, c.currentTime);
      
      osc.type = "triangle";
      osc.frequency.setValueAtTime(140 + Math.random() * 40, c.currentTime);
      osc.frequency.exponentialRampToValueAtTime(70, c.currentTime + 0.05);
      
      gain.gain.setValueAtTime(0.25, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.06);
      
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(c.destination);
      
      osc.start();
      osc.stop(c.currentTime + 0.08);
    } catch (e) {
      console.error("Failed to play synthetic press", e);
    }
  }

  function playSyntheticRelease() {
    try {
      const c = getContext();
      if (!c) return;
      
      const osc = c.createOscillator();
      const gain = c.createGain();
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(280 + Math.random() * 60, c.currentTime);
      osc.frequency.exponentialRampToValueAtTime(180, c.currentTime + 0.03);
      
      gain.gain.setValueAtTime(0.12, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.04);
      
      osc.connect(gain);
      gain.connect(c.destination);
      
      osc.start();
      osc.stop(c.currentTime + 0.05);
    } catch (e) {
      console.error("Failed to play synthetic release", e);
    }
  }

  return {
    playPress: () => {
      if (fallbackEnabled || !pressBuffer) {
        playSyntheticPress();
      } else {
        playBuffer(pressBuffer);
      }
    },
    playRelease: () => {
      if (fallbackEnabled || !releaseBuffer) {
        playSyntheticRelease();
      } else {
        playBuffer(releaseBuffer);
      }
    },
  };
}

/**
 * @param {Object} config
 * @param {HTMLCanvasElement} config.canvas
 * @param {string} config.scenePath - path to skills-keyboard.spline
 * @param {string} config.soundsPath - folder containing press.mp3/release.mp3
 * @param {(skill: object|null) => void} [config.onSkillChange] - called with
 *   the hovered/pressed skill object, or null when nothing is selected.
 * @param {number} [config.maxDpr] - pixel ratio cap, default 2
 */
export async function initKeyboardScene(config) {
  const {
    canvas,
    scenePath,
    soundsPath,
    onSkillChange = () => {},
    maxDpr = 2,
  } = config;

  const sounds = createSoundPlayer(soundsPath);

  // Helper check for active text input focus
  const isInputFocused = () => {
    const el = document.activeElement;
    return el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
  };

  const renderFallback = () => {
    if (canvas) {
      canvas.style.display = "none";
    }
    let fallback = document.getElementById("fallback-keyboard-image");
    if (fallback) return;

    fallback = document.createElement("img");
    fallback.id = "fallback-keyboard-image";
    fallback.src = "assets/images/keyboard.png";
    fallback.alt = "Keyboard Fallback";
    
    // Position and style the image beautifully and responsively inside the wrapper
    fallback.style.position = "absolute";
    fallback.style.bottom = "20px";
    fallback.style.left = "50%";
    fallback.style.transform = "translateX(-50%)";
    fallback.style.width = "90%";
    fallback.style.maxHeight = "70%";
    fallback.style.objectFit = "contain";
    fallback.style.pointerEvents = "none";
    fallback.style.zIndex = "5";
    fallback.style.opacity = "0.85";

    if (canvas && canvas.parentElement) {
      canvas.parentElement.appendChild(fallback);
    }
  };

  // Check if WebGL is supported
  const isWebGLSupported = () => {
    try {
      const c = document.createElement("canvas");
      return !!(window.WebGLRenderingContext && (c.getContext("webgl") || c.getContext("experimental-webgl")));
    } catch (e) {
      return false;
    }
  };

  if (!isWebGLSupported()) {
    console.warn("WebGL not supported. Switching to high-fidelity 2D interactive fallback.");
    renderFallback();
    return null;
  }

  // Monitor webgl context loss at runtime
  if (canvas) {
    canvas.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      console.warn("WebGL context lost. Rendering beautiful 2D fallback keyboard.");
      renderFallback();
    }, { once: true });
  }

  try {
    const app = new Application(canvas);
    let isMobile = window.matchMedia("(max-width: 767px)").matches;

    await app.load(scenePath);

    const kbd = app.findObjectByName("keyboard");
    if (!kbd) {
      console.error("❌ 'keyboard' object not found in the scene");
      renderFallback();
      return null;
    }

    // Capture original transform from Spline scene to keep user editor rotation/position intact
    const originalRotation = { x: kbd.rotation.x, y: kbd.rotation.y, z: kbd.rotation.z };
    const originalPosition = { x: kbd.position.x, y: kbd.position.y, z: kbd.position.z };
    const originalScale = { x: kbd.scale.x, y: kbd.scale.y, z: kbd.scale.z };

    function getScaleOffset() {
      const isMobileDevice = window.matchMedia("(max-width: 767px)").matches;
      const wrapper = canvas.parentElement;
      const wrapperWidth = wrapper ? wrapper.clientWidth : window.innerWidth;
      const wrapperHeight = wrapper ? wrapper.clientHeight : 480;

      const baseRefWidth = isMobileDevice ? 350 : 680;
      const baseRefHeight = isMobileDevice ? 300 : 460;

      const widthRatio = wrapperWidth / baseRefWidth;
      const heightRatio = wrapperHeight / baseRefHeight;

      let scaleOffset = Math.min(widthRatio, heightRatio);

      const minScale = isMobileDevice ? 0.55 : 0.65;
      const maxScale = isMobileDevice ? 0.85 : 1.05;
      scaleOffset = Math.min(Math.max(scaleOffset, minScale), maxScale);

      // Highly responsive fitting factor
      const fitFactor = isMobileDevice ? 0.35 : 0.50;
      return scaleOffset * fitFactor;
    }

    function updateKeyboardScale(instant = false) {
      const scaleOffset = getScaleOffset();
      if (instant) {
        kbd.scale.x = originalScale.x * scaleOffset;
        kbd.scale.y = originalScale.y * scaleOffset;
        kbd.scale.z = originalScale.z * scaleOffset;
      } else {
        gsap.to(kbd.scale, {
          x: originalScale.x * scaleOffset,
          y: originalScale.y * scaleOffset,
          z: originalScale.z * scaleOffset,
          duration: 0.35,
          overwrite: "auto",
          ease: "power2.out"
        });
      }
    }

    window.addEventListener("resize", () => {
      isMobile = window.matchMedia("(max-width: 767px)").matches;
      updateKeyboardScale(false);
    });

    let selectedSkillName = null;

    // --- Hover ---
    app.addEventListener("mouseHover", (e) => {
      if (selectedSkillName === e.target.name) return;

      if (e.target.name === "body" || e.target.name === "platform") {
        if (selectedSkillName) sounds.playRelease();
        selectedSkillName = null;
        onSkillChange(null);
        app.setVariable("heading", "");
        app.setVariable("desc", "");
      } else {
        const skill = SKILLS[e.target.name];
        if (skill) {
          if (selectedSkillName) sounds.playRelease();
          sounds.playPress();
          selectedSkillName = skill.name;
          onSkillChange(skill);
          app.setVariable("heading", skill.label);
          app.setVariable("desc", skill.shortDescription);
        }
      }
    });

    // --- Real keyboard type-along ---
    window.addEventListener("keyup", () => {
      if (isInputFocused()) return;
      sounds.playRelease();
    });

    app.addEventListener("keyDown", (e) => {
      if (isInputFocused()) return;
      const skill = SKILLS[e.target.name];
      if (skill) {
        sounds.playPress();
        onSkillChange(skill);
        app.setVariable("heading", skill.label);
        app.setVariable("desc", skill.shortDescription);
      }
    });

    // --- Reveal animation (elastic pop-in + staggered keycaps) ---
    async function revealKeyboard() {
      kbd.visible = false;
      await sleep(400);
      kbd.visible = true;

      const scaleOffset = getScaleOffset();

      gsap.set(kbd.position, originalPosition);
      gsap.set(kbd.rotation, originalRotation);
      
      gsap.fromTo(
        kbd.scale,
        { x: 0.01, y: 0.01, z: 0.01 },
        { 
          x: originalScale.x * scaleOffset, 
          y: originalScale.y * scaleOffset, 
          z: originalScale.z * scaleOffset, 
          duration: 1.5, 
          ease: "elastic.out(1, 0.65)" 
        }
      );

      const allObjects = app.getAllObjects();
      const keycaps = allObjects.filter((o) => o.name === "keycap");

      await sleep(900);

      const deviceGroupName = isMobile ? "keycap-mobile" : "keycap-desktop";
      const deviceKeycaps = allObjects.filter((o) => o.name === deviceGroupName);
      deviceKeycaps.forEach(async (k, idx) => {
        await sleep(idx * 70);
        k.visible = true;
      });

      keycaps.forEach(async (k, idx) => {
        k.visible = false;
        await sleep(idx * 70);
        k.visible = true;
        gsap.fromTo(k.position, { y: 200 }, { y: 50, duration: 0.5, delay: 0.1, ease: "bounce.out" });
      });
    }

    // --- Idle floating animation while in "hero" position ---
    const idleAnim = gsap.to(kbd.position, {
      y: originalPosition.y - 15,
      duration: 3,
      repeat: -1,
      yoyo: true,
      ease: "power1.inOut",
      delay: 2,
    });

    // --- Smooth idle sway ---
    const sway = {
      x: 0,
      y: 0
    };

    const idleSwayAnim = gsap.to(sway, {
      y: 0.15,
      x: -0.05,
      duration: 5,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
      delay: 2,
      onUpdate: () => {
        kbd.rotation.x = originalRotation.x + sway.x;
        kbd.rotation.y = originalRotation.y + sway.y;
      }
    });

    // --- Showcase spins ---
    const spin = {
      x: 0,
      y: 0
    };

    const showcaseSpin = gsap.timeline({
      repeat: -1,
      delay: 7
    });

    showcaseSpin
      .to(spin, {
        y: Math.PI * 2,
        duration: 3.5,
        ease: "power2.inOut",
        onUpdate: () => {
          kbd.rotation.y = originalRotation.y + sway.y + spin.y;
        }
      })
      .to(spin, {
        y: 0,
        duration: 0
      })
      .to({}, { duration: 10 })
      .to(spin, {
        x: Math.PI * 2,
        duration: 2.5,
        ease: "power2.inOut",
        onUpdate: () => {
          kbd.rotation.x = originalRotation.x + sway.x + spin.x;
        }
      })
      .to(spin, {
        x: 0,
        duration: 0
      })
      .to({}, { duration: 10 });

    // --- Perf: cap pixel ratio, pause when tab hidden ---
    try {
      const renderer = app._renderer;
      if (renderer?.setPixelRatio) {
        const apply = () => renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxDpr));
        apply();
        window.addEventListener("resize", apply, { passive: true });
      }
    } catch {
      /* fail silent, scene still renders */
    }

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        app.stop();
        idleAnim.pause();
        idleSwayAnim.pause();
        showcaseSpin.pause();
      } else {
        app.play();
        idleAnim.play();
        idleSwayAnim.play();
        showcaseSpin.play();
      }
    });

    await revealKeyboard();

    return app;
  } catch (err) {
    console.warn("Spline / WebGL failed to load or initialize. Rendering beautiful 2D fallback keyboard.", err);
    renderFallback();
    return null;
  }
}
