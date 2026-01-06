const projectData = [
  {
    title: "Redroom Gesture 142",
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRlndpwDalSNF8TzBG6T7kGv73l0IOReNJpKw&s",
    category: "Concept Series",
    year: "2025",
  },
  {
    title: "Shadowwear 6AM",
    image: "https://d2v5dzhdg4zhx3.cloudfront.net/web-assets/images/storypages/primary/ProductShowcasesampleimages/JPEG/Product+Showcase-1.jpg",
    category: "Photography",
    year: "2024",
  },
  {
    title: "Blur Formation 034",
    image: "https://cdn.shopify.com/s/files/1/2303/2711/files/2_e822dae0-14df-4cb8-b145-ea4dc0966b34.jpg?v=1617059123",
    category: "Kinetic Study",
    year: "2024",

  },
  {
    title: "Sunglass Operator",
    image: "https://www.shutterstock.com/image-photo/facial-cosmetic-products-containers-on-600nw-2566963627.jpg",
    category: "Editorial Motion",
    year: "2024",
  },
  {
    title: "Sunglass Operator 2",
    image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQbqGt6i4lobomuPqTGoVaAE_W9VaqUAHTGNg&s",
    category: "Editorial Motion",
    year: "2024",
  },
  {
    title: "Sunglass Operator 3",
    image: "https://cdn.prod.website-files.com/622488277ab5ee818d179d9f/6851ef69b64528a9ee3e9b26_6633f57bd5f74992577ce513_web_Matthew_Copelovitch_r1_0463.webp",
    category: "Editorial Motion",
    year: "2024",
  },
];

const config = {
// Base speed for wheel/keyboard
SCROLL_SPEED: window.innerWidth < 768 ? 0.5 : 1.5, 
// Lower factor = smoother but "laggier", Higher = more responsive
LERP_FACTOR: window.innerWidth < 768 ? 0.25 : 0.1,
  BUFFER_SIZE: 5,
  MAX_VELOCITY: 250,
  SNAP_DURATION: 350,
};
const state = {
  currentY: 0,
  targetY: 0,
  isDragging: false,
  projects: new Map(),
  minimap: new Map(),
  minimapInfo: new Map(),
  projectHeight: window.innerHeight,
  minimapHeight: 250,
  isSnapping: false,
  snapStart: { time: 0, y: 0, target: 0 },
  dragStart: { y: 0, scrollY: 0 },
  lastScrollTime: Date.now(),
  container: null,
  containerSection: null,
  containerTop: 0,
  containerOriginalTop: null,
  isInContainer: false,
  scrollOffset: 0,
  isStuck: false,
  stuckScrollY: 0,
};

const lerp = (start, end, factor) => start + (end - start) * factor;
const createParallax = (img, height) => {
  let current = 0;
  return {
    update: (scroll, index) => {
      const target = (-scroll - index * height) * 0.2;
      current = lerp(current, target, 0.15);
      if (Math.abs(current - target) > 0.01) {
        img.style.transform = `translateY(${current}px) scale(1.5)`;
      }
    }
  }
}

const getProjectData = (index) => {
  const i =
    ((Math.abs(index) % projectData.length) + projectData.length) %
    projectData.length;
  return projectData[i];
};

const createElement = (index, type) => {
  const maps = {
    main: state.projects,
    minimap: state.minimap,
    info: state.minimapInfo,
  };
  if (maps[type].has(index)) return;
  const data = getProjectData(index);
  const num = (
    (((Math.abs(index) % projectData.length) + projectData.length) %
      projectData.length) +
    1
  )
    .toString()
    .padStart(2, "0");
  if (type === "main") {
    const el = document.createElement("div");
    el.className = "project";
    el.innerHTML = `<img src="${data.image}" alt="${data.title}" />`;
    document.querySelector(".project-list").appendChild(el);
    state.projects.set(index, {
      el,
      parallax: createParallax(el.querySelector("img"), state.projectHeight),
    });
  } else if (type === "minimap") {
    const el = document.createElement("div");
    el.className = "minimap-img-item";
    el.innerHTML = `<img src="${data.image}" alt="${data.title}" />`;
    document.querySelector(".minimap-img-preview").appendChild(el);
    state.minimap.set(index, {
      el,
      parallax: createParallax(el.querySelector("img"), state.minimapHeight),
    });
  } else {
    const el = document.createElement("div");
    el.className = "minimap-item-info";
    el.innerHTML = `
<div class="minimap-item-info-row">
<p>${num}</p>
<p>${data.title}</p>
</div>
<div class="minimap-item-info-row">
<p>${data.category}</p>
<p>${data.year}</p>
</div>
`;
    document.querySelector(".minimap-info-list").appendChild(el);
    state.minimapInfo.set(index, { el });
  }
};


// Initialize container
state.container = document.querySelector(".container");
state.containerSection = document.querySelector(".infinite-scroll-section");

// Helper function to ensure container allows touch events
const ensureContainerTouchHandling = () => {
  if (state.containerSection) {
    // Ensure container and its children don't block touch events
    state.containerSection.style.pointerEvents = 'auto';
    if (state.container) {
      state.container.style.pointerEvents = 'auto';
    }
  }
};

// Touch event handlers for container when stuck
let containerTouchStartHandler = null;
let containerTouchMoveHandler = null;
let containerTouchEndHandler = null;

const setupContainerTouchHandlers = () => {
  if (!state.containerSection || containerTouchStartHandler) return;
  
  containerTouchStartHandler = (e) => {
    if (!state.isStuck) return;
    state.isDragging = true;
    state.isSnapping = false;
    state.dragStart = { y: e.touches[0].clientY, scrollY: state.targetY };
    state.lastScrollTime = Date.now();
  };
  
  containerTouchMoveHandler = (e) => {
    if (!state.isDragging || !state.isStuck) return;
    
    // Calculate boundaries
    const maxScroll = -((projectData.length - 1) * state.projectHeight);
    const atBeginning = state.targetY >= -1;
    const atEnd = state.targetY <= maxScroll + 1;
    
    // Calculate new target position
    const newTargetY = state.dragStart.scrollY - (e.touches[0].clientY - state.dragStart.y) * 2.0;
    const scrollingDown = newTargetY < state.targetY;
    const scrollingUp = newTargetY > state.targetY;
    
    // Check boundaries
    if (atBeginning && scrollingUp) {
      state.isDragging = false;
      state.isStuck = false;
      state.stuckScrollY = 0;
      if (state.containerSection) {
        state.containerSection.style.position = '';
        state.containerSection.style.top = '';
        state.containerSection.style.left = '';
        state.containerSection.style.width = '';
        state.containerSection.style.zIndex = '';
        state.containerSection.style.touchAction = '';
      }
      removeContainerTouchHandlers();
      const spacer = document.querySelector('.container-spacer');
      if (spacer) spacer.style.height = '0';
      const containerOriginalTop = state.containerOriginalTop || state.containerTop;
      window.scrollTo({ top: Math.max(0, containerOriginalTop - 100), behavior: 'smooth' });
      return;
    }
    
    if (atEnd && scrollingDown) {
      state.isDragging = false;
      state.isStuck = false;
      state.stuckScrollY = 0;
      if (state.containerSection) {
        state.containerSection.style.position = '';
        state.containerSection.style.top = '';
        state.containerSection.style.left = '';
        state.containerSection.style.width = '';
        state.containerSection.style.zIndex = '';
        state.containerSection.style.touchAction = '';
      }
      removeContainerTouchHandlers();
      const spacer = document.querySelector('.container-spacer');
      if (spacer) spacer.style.height = '0';
      const containerOriginalTop = state.containerOriginalTop || state.containerTop;
      const containerHeight = state.containerSection?.offsetHeight || window.innerHeight;
      window.scrollTo({ top: containerOriginalTop + containerHeight, behavior: 'smooth' });
      return;
    }
    
    // Handle scroll - prevent default to stop native scrolling
    e.preventDefault();
    // Don't stop propagation - let it bubble but we've already handled it
    state.isSnapping = false;
    const constrainedTargetY = Math.max(maxScroll, Math.min(0, newTargetY));
    state.targetY = constrainedTargetY;
    state.lastScrollTime = Date.now();
    state.currentY = lerp(state.currentY, state.targetY, 0.3);
    updatePositions();
  };
  
  containerTouchEndHandler = () => {
    state.isDragging = false;
  };
  
  // Add event listeners to container - events will bubble from children
  state.containerSection.addEventListener('touchstart', containerTouchStartHandler, { passive: true });
  state.containerSection.addEventListener('touchmove', containerTouchMoveHandler, { passive: false });
  state.containerSection.addEventListener('touchend', containerTouchEndHandler, { passive: true });
};

const removeContainerTouchHandlers = () => {
  if (!state.containerSection || !containerTouchStartHandler) return;
  
  state.containerSection.removeEventListener('touchstart', containerTouchStartHandler);
  state.containerSection.removeEventListener('touchmove', containerTouchMoveHandler);
  state.containerSection.removeEventListener('touchend', containerTouchEndHandler);
  
  containerTouchStartHandler = null;
  containerTouchMoveHandler = null;
  containerTouchEndHandler = null;
};

// Function to update container position
function updateContainerPosition() {
  if (state.isStuck) {
    state.containerSection.style.position = 'fixed';
    state.containerSection.style.top = '0';
    state.containerSection.style.left = '0';
    state.containerSection.style.width = '100%';
  } else {
    state.containerSection.style.position = 'relative';
    state.containerSection.style.top = 'auto';
  }
}

// Helper to constrain scroll
const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

// 1. Added a direction tracker to the state
state.lastDeltaY = 0; 

// Add to your state object at the top
state.isProcessing = false; 

state.isProcessing = false;
state.touchStartY = 0;
state.touchThreshold = 40; // Pixels required to trigger a move

const checkIfInContainer = () => {
  if (!state.containerSection) return false;
  
  const rect = state.containerSection.getBoundingClientRect();
  const viewportHeight = window.innerHeight;
  const maxInternalScroll = -((projectData.length - 1) * state.projectHeight);
  
  // Use a slightly larger buffer for mobile to ensure the catch happens
  const atStart = state.targetY >= -5;
  const atEnd = state.targetY <= maxInternalScroll + 5;
  const scrollingDown = state.lastDeltaY > 0;
  const scrollingUp = state.lastDeltaY < 0;

  if (!state.isStuck) {
    // 1. ENTERING FROM TOP (Heading Down)
    if (rect.top <= 10 && rect.top >= -50 && scrollingDown && !atEnd) {
      state.isStuck = true;
      window.scrollTo(0, state.containerOriginalTop);
    } 
    // 2. ENTERING FROM BOTTOM (Heading Up)
    // We detect if the bottom of the container enters the viewport from below
    else if (rect.bottom >= viewportHeight - 10 && rect.bottom <= viewportHeight + 100 && scrollingUp && !atStart) {
      state.isStuck = true;
      
      // FORCE STATE TO LAST ITEM:
      // This prevents the jump to the first item when coming from the footer
      state.targetY = maxInternalScroll;
      state.currentY = maxInternalScroll; 
      
      window.scrollTo(0, state.containerOriginalTop);
    }
  } else {
    // RELEASE LOGIC: Only release if at the edges AND moving away from the container
    if (atStart && scrollingUp) {
      state.isStuck = false;
    } else if (atEnd && scrollingDown) {
      state.isStuck = false;
    }
  }
  
  state.isInContainer = state.isStuck || (rect.top < viewportHeight && rect.bottom > 0);
  return state.isStuck;
};

const moveToNextItem = (direction) => {
  const maxInternalScroll = -((projectData.length - 1) * state.projectHeight);
  let newY = state.targetY - (direction * state.projectHeight);
  state.targetY = Math.max(maxInternalScroll, Math.min(0, newY));
  state.lastScrollTime = Date.now();
};

// Update container position on load and resize
updateContainerPosition();

// Store original position after a short delay to ensure layout is complete
setTimeout(() => {
  if (state.containerSection && !state.containerOriginalTop) {
    // Ensure container is not fixed when getting original position
    const wasFixed = state.containerSection.style.position === 'fixed';
    if (wasFixed) {
      state.containerSection.style.position = '';
      state.containerSection.style.top = '';
      state.containerSection.style.left = '';
      state.containerSection.style.width = '';
      // Force a reflow
      state.containerSection.offsetHeight;
    }
    const rect = state.containerSection.getBoundingClientRect();
    state.containerOriginalTop = rect.top + window.scrollY;
    // Store it permanently - never recalculate unless resize
    if (wasFixed) {
      state.containerSection.style.position = 'fixed';
      state.containerSection.style.top = '0px';
      state.containerSection.style.left = '0px';
      state.containerSection.style.width = '100%';
    }
    updateContainerPosition();
  }
}, 100);

// Update on scroll and handle sticky positioning
window.addEventListener('scroll', () => {
  // Don't update original position if already set (prevent recalculation)
  if (!state.containerOriginalTop) {
    updateContainerPosition();
  }
  checkIfInContainer(); // This now handles release logic internally
  
  // Apply sticky positioning
  const spacer = document.querySelector('.container-spacer');
  if (state.containerSection) {
    if (state.isStuck) {
      // Keep container fixed at top of viewport (always at top: 0)
      // Force correct positioning to prevent sticking at wrong position
      state.containerSection.style.position = 'fixed';
      state.containerSection.style.top = '0px';
      state.containerSection.style.left = '0px';
      state.containerSection.style.width = '100%';
      state.containerSection.style.zIndex = '1';
      // Don't set touch-action: none - it blocks all touch events
      // Instead, we'll handle touch events in the window-level handlers
      ensureContainerTouchHandling();
      
      // Verify it's actually at top (safeguard against positioning errors)
      const rect = state.containerSection.getBoundingClientRect();
      if (Math.abs(rect.top) > 1) {
        // Force correct position if it drifted
        state.containerSection.style.top = '0px';
      }
      
      // Set spacer height to maintain layout (prevent content jump)
      if (spacer) {
        const containerHeight = state.containerSection.offsetHeight || window.innerHeight;
        spacer.style.height = `${containerHeight}px`;
      }
    } else {
      // Reset to normal positioning
      state.containerSection.style.position = '';
      state.containerSection.style.top = '';
      state.containerSection.style.left = '';
      state.containerSection.style.width = '';
      state.containerSection.style.zIndex = '';
      if (state.container) {
        state.container.style.pointerEvents = '';
      }
      
      // Reset spacer
      if (spacer) {
        spacer.style.height = '0';
      }
    }
  }
}, { passive: true });

// Also update on resize
window.addEventListener('resize', () => {
  updateContainerPosition();
});

// Initialize projects starting from index 0
for (let i = -config.BUFFER_SIZE; i <= config.BUFFER_SIZE; i++) {
  createElement(i, "main");
  createElement(i, "minimap");
  createElement(i, "info");
}

const syncElements = () => {
  // Sync elements when container is in view or stuck
  // This ensures elements are created/updated when container scroll is active
  if (!state.container) return;
  
  // If not in container and not stuck, don't sync (we're far from container)
  if (!state.isInContainer && !state.isStuck) return;
  
  // Calculate current project index
  const current = Math.round(-state.targetY / state.projectHeight);
  const min = current - config.BUFFER_SIZE;
  const max = current + config.BUFFER_SIZE;
  
  for (let i = min; i <= max; i++) {
    createElement(i, "main");
    createElement(i, "minimap");
    createElement(i, "info");
  }
  
  [state.projects, state.minimap, state.minimapInfo].forEach((map) => {
    map.forEach((item, index) => {
      if (index < min || index > max) {
        item.el.remove();
        map.delete(index);
      }
    });
  });
};

const snapToProject = () => {
  // Snap when container is active (in view or stuck)
  if (!state.isInContainer && !state.isStuck) return;
  
  state.isSnapping = true;
  state.snapStart.time = Date.now();
  state.snapStart.y = state.targetY;
  
  // Snap to nearest project
  const nearestProject = Math.round(-state.targetY / state.projectHeight);
  state.snapStart.target = -nearestProject * state.projectHeight;
};

const updateSnap = () => {
  const progress = Math.min(
    (Date.now() - state.snapStart.time) / config.SNAP_DURATION,
    1
  );
  const eased = 1 - Math.pow(1 - progress, 3);
  state.targetY =
    state.snapStart.y + (state.snapStart.target - state.snapStart.y) * eased;
  if (progress >= 1) state.isSnapping = false;
};

const updatePositions = () => {
  if (!state.container) return;
  
  // Smoothing: Move currentY toward targetY by 10% every frame
  const eased = 0.1; 
  state.currentY += (state.targetY - state.currentY) * eased;
  
  const projectScrollY = state.currentY;
  const minimapRatio = state.minimapHeight / state.projectHeight;
  const minimapY = projectScrollY * minimapRatio;
  
  // Update main project items
  state.projects.forEach((item, index) => {
    const y = (index * state.projectHeight) + projectScrollY;
    item.el.style.transform = `translateY(${y}px)`;
    if (item.parallax) {
      item.parallax.update(projectScrollY, index);
    }
  });
  
  // Update Minimap container visibility
  const minimap = document.querySelector(".minimap");
  if (minimap) {
    minimap.style.opacity = state.isInContainer ? "1" : "0";
    minimap.style.pointerEvents = state.isStuck ? "all" : "none";
  }
  
  // Update Minimap image items
  state.minimap.forEach((item, index) => {
    const y = (index * state.minimapHeight) + minimapY;
    item.el.style.transform = `translateY(${y}px)`;
    if (item.parallax) {
      item.parallax.update(minimapY, index);
    }
  });
  
  // Update Minimap text info
  state.minimapInfo.forEach((item, index) => {
    const y = (index * state.minimapHeight) + minimapY + 40;
    item.el.style.transform = `translateY(${y}px)`;
  });
};

const animate = () => {
  const now = Date.now();
  
  // Always update positions (even when outside container for smooth transitions)
  updateContainerPosition();
  checkIfInContainer();
  
  // Check if we should release (at end or beginning) - do this early
  const totalProjectsHeight = projectData.length * state.projectHeight;
  const maxScroll = -((projectData.length - 1) * state.projectHeight);
  const atEnd = state.targetY <= maxScroll + 5;
  const atBeginning = state.targetY >= -5;
  
  // Force release if at boundaries (ensures footer is accessible)
  // But only release if we're actually trying to scroll past
  // This prevents premature release
  if ((atEnd || atBeginning) && state.isStuck) {
    // Check if we should release based on scroll direction
    const scrollY = window.scrollY;
    const containerOriginalTop = state.containerOriginalTop || state.containerTop;
    
    // Only release if we're at the boundary AND trying to continue scrolling
    // This is handled in the event handlers, so we just ensure state is correct here
    // The actual release with smooth scroll happens in the event handlers
  }
  
  // Ensure container is at correct position when stuck
  if (state.isStuck && state.containerSection) {
    // Force correct positioning when stuck
    if (state.containerSection.style.position !== 'fixed' || state.containerSection.style.top !== '0px') {
      state.containerSection.style.position = 'fixed';
      state.containerSection.style.top = '0px';
      state.containerSection.style.left = '0px';
      state.containerSection.style.width = '100%';
      state.containerSection.style.zIndex = '1';
    }
  }
  
  // Always update positions for smooth transitions
  // Constrain targetY to valid scroll range (only negative values for scrolling down)
  // Max scroll allows viewing the last project: (n-1) * height
  state.targetY = Math.max(maxScroll, Math.min(0, state.targetY));
  
  if (!state.isInContainer) {
    // Don't reset immediately - allow smooth transition
    // Only reset if we're far from container
    const rect = state.containerSection?.getBoundingClientRect();
    if (rect && (rect.bottom < -100 || rect.top > window.innerHeight + 100)) {
      state.currentY = 0;
      state.targetY = 0;
    }
    // Still update positions even when not in container (for smooth transitions)
    if (!state.isDragging)
      state.currentY = lerp(state.currentY, state.targetY, config.LERP_FACTOR);
    updatePositions();
    requestAnimationFrame(animate);
    return;
  }
  
  // Container is in view - handle snapping and scrolling
  if (
    !state.isSnapping &&
    !state.isDragging &&
    now - state.lastScrollTime > 50
  ) {
    // Snap to nearest project
    const nearestProject = Math.round(-state.targetY / state.projectHeight);
    const snapPoint = -nearestProject * state.projectHeight;
    
    if (Math.abs(state.targetY - snapPoint) > 1) snapToProject();
  }
  
  if (state.isSnapping) updateSnap();
  if (!state.isDragging)
    state.currentY = lerp(state.currentY, state.targetY, config.LERP_FACTOR);
  syncElements();
  updatePositions();
  requestAnimationFrame(animate);
};
animate();

// Update the wheel listener to track delta
// --- WHEEL HANDLER ---
window.addEventListener("wheel", (e) => {
  state.lastDeltaY = e.deltaY;
  
  // 1. Check if we should be stuck
  const stuck = checkIfInContainer();
  
  if (stuck) {
    const maxInternalScroll = -((projectData.length - 1) * state.projectHeight);
    const atStart = state.targetY >= -1;
    const atEnd = state.targetY <= maxInternalScroll + 1;

    // 2. Break out check: If at edge and scrolling away, let page scroll
    if ((atEnd && e.deltaY > 0) || (atStart && e.deltaY < 0)) {
      state.isStuck = false;
      return; 
    }

    // 3. One item per scroll logic
    e.preventDefault();
    
    // Debounce: prevent "free spinning" wheel from flying through items
    if (Math.abs(e.deltaY) > 10 && !state.isProcessing) {
      state.isProcessing = true;
      moveToNextItem(Math.sign(e.deltaY));
      
      // Allow next scroll after a brief pause for the animation to feel solid
      setTimeout(() => { state.isProcessing = false; }, 400); 
    }
  }
}, { passive: false });
// --- KEYBOARD HANDLER ---
window.addEventListener("keydown", (e) => {
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    state.lastDeltaY = e.key === "ArrowDown" ? 1 : -1;
    const stuck = checkIfInContainer();
    
    if (stuck) {
      const maxInternalScroll = -((projectData.length - 1) * state.projectHeight);
      if ((state.targetY <= maxInternalScroll + 1 && e.key === "ArrowDown") || 
          (state.targetY >= -1 && e.key === "ArrowUp")) {
        state.isStuck = false;
        return;
      }
      e.preventDefault();
      moveToNextItem(Math.sign(state.lastDeltaY));
    }
  }
});

// Robust Touch Logic for Mobile
// Robust Touch Logic using Delta Tracking
let lastTouchY = 0;


window.addEventListener("touchstart", (e) => {
  state.touchStartY = e.touches[0].clientY;
}, { passive: true });

window.addEventListener("touchmove", (e) => {
  const currentY = e.touches[0].clientY;
  const diffY = state.touchStartY - currentY; // positive = swipe up (scroll down)
  state.lastDeltaY = diffY;

  // We check if we should be stuck before preventing default behavior
  const stuck = checkIfInContainer();

  if (stuck) {
    const maxInternalScroll = -((projectData.length - 1) * state.projectHeight);
    const atStart = state.targetY >= -5;
    const atEnd = state.targetY <= maxInternalScroll + 5;

    // RELEASE CHECK: If user is at the end and swipes up, or start and swipes down, 
    // we let the browser take over the scroll to show footer/header.
    if ((atEnd && diffY > 5) || (atStart && diffY < -5)) {
      state.isStuck = false;
      return; 
    }

    // LOCK: Prevent the background page from moving
    if (e.cancelable) e.preventDefault();

    // STEP LOGIC: Trigger one item move per swipe gesture
    if (!state.isProcessing && Math.abs(diffY) > state.touchThreshold) {
      state.isProcessing = true;
      
      const direction = Math.sign(diffY);
      const newTarget = state.targetY - (direction * state.projectHeight);
      
      // Keep it strictly within the bounds of the project list
      state.targetY = Math.max(maxInternalScroll, Math.min(0, newTarget));
      
      state.lastScrollTime = Date.now();
      state.touchStartY = currentY; // Reset pivot to allow continuous long swipes

      setTimeout(() => {
        state.isProcessing = false;
      }, 400); // Wait for animation to finish
    }
  }
}, { passive: false });

window.addEventListener("touchend", () => {
  if (state.isDragging) {
    state.isDragging = false;
    // Trigger the snapping logic you already have in animate()
    state.lastScrollTime = Date.now() - 100; 
  }
}, { passive: true });
window.addEventListener("resize", () => {
  state.projectHeight = window.innerHeight;
  // Reset original top on resize to recalculate (only if not stuck)
  if (state.containerSection && !state.isStuck) {
    // Temporarily remove fixed positioning to get real position
    const wasFixed = state.containerSection.style.position === 'fixed';
    if (wasFixed) {
      state.containerSection.style.position = '';
    }
    const rect = state.containerSection.getBoundingClientRect();
    state.containerOriginalTop = rect.top + window.scrollY;
    if (wasFixed) {
      state.containerSection.style.position = 'fixed';
    }
  }
  updateContainerPosition();
  updatePositions();
});

// Mobile Menu Toggle
const menuToggle = document.querySelector(".menu-toggle");
const menuList = document.querySelector(".menu-list");

if (menuToggle && menuList) {
  menuToggle.addEventListener("click", () => {
    menuToggle.classList.toggle("active");
    menuList.classList.toggle("active");
    document.body.style.overflow = menuList.classList.contains("active") ? "hidden" : "";
  });

  // Close menu when clicking on a link
  const menuLinks = menuList.querySelectorAll("a");
  menuLinks.forEach(link => {
    link.addEventListener("click", () => {
      menuToggle.classList.remove("active");
      menuList.classList.remove("active");
      document.body.style.overflow = "";
    });
  });

  // Close menu when clicking outside
  document.addEventListener("click", (e) => {
    if (!menuToggle.contains(e.target) && !menuList.contains(e.target)) {
      menuToggle.classList.remove("active");
      menuList.classList.remove("active");
      document.body.style.overflow = "";
    }
  });
}