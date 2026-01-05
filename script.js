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
  SCROLL_SPEED: 1.5,
  LERP_FACTOR: 0.12,
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

// Function to update container position
const updateContainerPosition = () => {
  if (state.containerSection && !state.containerOriginalTop) {
    // Only calculate original position if not already set
    // Temporarily remove fixed positioning to get real position
    const wasFixed = state.containerSection.style.position === 'fixed';
    if (wasFixed) {
      state.containerSection.style.position = '';
      state.containerSection.style.top = '';
      state.containerSection.style.left = '';
      state.containerSection.style.width = '';
      // Force a reflow to get accurate position
      state.containerSection.offsetHeight;
    }
    const rect = state.containerSection.getBoundingClientRect();
    state.containerOriginalTop = rect.top + window.scrollY;
    if (wasFixed) {
      state.containerSection.style.position = 'fixed';
      state.containerSection.style.top = '0px';
      state.containerSection.style.left = '0px';
      state.containerSection.style.width = '100%';
    }
  }
  // Always use the stored original top
  if (state.containerOriginalTop) {
    state.containerTop = state.containerOriginalTop;
  }
};

// Check if we're in the container section and if it should be stuck
const checkIfInContainer = () => {
  if (!state.containerSection) {
    state.isInContainer = false;
    state.isStuck = false;
    return false;
  }
  
  const viewportHeight = window.innerHeight;
  const containerOriginalTop = state.containerOriginalTop || state.containerTop;
  
  // Calculate total scroll needed for all projects
  const totalProjectsHeight = projectData.length * state.projectHeight;
  // Max scroll is when the last project is fully visible
  // We need to scroll: (number of projects - 1) * projectHeight to see the last project
  const maxInternalScroll = (projectData.length - 1) * state.projectHeight;
  
  // Check if we've scrolled through all projects (allow reaching the last item)
  // Use a more lenient check to ensure release happens
  const allProjectsScrolled = state.targetY <= -(maxInternalScroll - 10);
  
  // Check if we're at the beginning (can scroll up to header)
  const atBeginning = state.targetY >= -1;
  
  // IMPORTANT: If we've scrolled through all projects, NEVER stick
  // And DON'T activate container scroll if we've scrolled past the container
  if (allProjectsScrolled) {
    if (state.isStuck) {
      state.isStuck = false;
      state.stuckScrollY = 0;
      // Immediately reset container positioning to allow normal scroll
      if (state.containerSection) {
        state.containerSection.style.position = '';
        state.containerSection.style.top = '';
        state.containerSection.style.left = '';
        state.containerSection.style.width = '';
        state.containerSection.style.zIndex = '';
      }
      const spacer = document.querySelector('.container-spacer');
      if (spacer) {
        spacer.style.height = '0';
      }
    }
    // Check if we're at the absolute bottom of the page
    // If at bottom, never activate container scroll
    const currentScrollY = window.scrollY;
    const documentHeight = document.documentElement.scrollHeight;
    const atAbsoluteBottom = currentScrollY + viewportHeight >= documentHeight - 10;
    
    // Also check if footer's bottom is at the bottom of viewport
    const footerSection = document.querySelector('.footer-section');
    let atFooterBottom = false;
    if (footerSection) {
      const footerRect = footerSection.getBoundingClientRect();
      // If footer's bottom is at or near the bottom of viewport, we're at footer bottom
      atFooterBottom = footerRect.bottom >= viewportHeight - 10 && footerRect.bottom <= viewportHeight + 10;
    }
    
    // If at absolute bottom OR at footer bottom, never activate container
    if (atAbsoluteBottom || atFooterBottom) {
      state.isInContainer = false;
      return false;
    }
    
    // Check if we've scrolled PAST the container (to footer)
    // Once past the container, don't activate container scroll
    const containerOriginalTop = state.containerOriginalTop || state.containerTop;
    const rect = state.containerSection.getBoundingClientRect();
    const containerHeight = state.containerSection?.offsetHeight || viewportHeight;
    const containerBottom = containerOriginalTop + containerHeight;
    
    // Check if footer is actually in view - only then disable container scroll
    let atFooter = false;
    if (footerSection) {
      const footerRect = footerSection.getBoundingClientRect();
      // Only consider at footer if footer is actually visible in viewport
      atFooter = footerRect.top < viewportHeight && footerRect.bottom > 0;
    }
    
    // If we've scrolled past the container's bottom AND footer is in view, don't activate
    const scrolledPastContainer = currentScrollY > containerBottom - 50;
    
    if (scrolledPastContainer && atFooter) {
      // Scrolled past container AND footer is visible - don't activate container scroll
      state.isInContainer = false;
      return false;
    }
    
    // Container is still in view and we haven't scrolled past it (or footer not visible)
    // But since all projects are scrolled, don't activate custom scroll
    // Only allow if container is still in the main viewport
    const isInView = rect.top < viewportHeight && rect.bottom > 0;
    state.isInContainer = isInView;
    return state.isInContainer;
  }
  
  // At beginning: Only prevent sticking if we're trying to scroll UP past the beginning
  // Allow sticking when at beginning if container reaches top (for initial stick)
  if (atBeginning) {
    // Only release if already stuck AND we're trying to scroll up
    // This allows initial sticking when container reaches top
    // The event handlers will handle preventing scroll up at beginning
    if (state.isStuck) {
      // Keep stuck state - event handlers will release if needed
    }
  }
  
  // Get the actual position of the container relative to viewport
  const scrollY = window.scrollY;
  let containerTopPosition;
  
  // Always use the original position to calculate, regardless of current state
  // This ensures consistent behavior every time
  if (state.containerSection.style.position === 'fixed') {
    // If fixed, calculate where it would be: original position - current scroll
    containerTopPosition = containerOriginalTop - scrollY;
  } else {
    // If not fixed, get actual position from DOM (most accurate)
    const rect = state.containerSection.getBoundingClientRect();
    containerTopPosition = rect.top;
    
    // Verify against calculated position for consistency
    const calculatedPosition = containerOriginalTop - scrollY;
    // If positions differ significantly, trust DOM but log for debugging
    if (Math.abs(containerTopPosition - calculatedPosition) > 5) {
      // Use DOM position as it's more accurate in real-time
      containerTopPosition = rect.top;
    }
  }
  
  // Container should stick when its top edge reaches or passes the top of viewport (0)
  // Use a reasonable threshold (5px) to account for rounding and ensure it sticks reliably
  // This allows sticking when close to top but prevents sticking at middle
  const containerTopReached = containerTopPosition <= 5;
  
  // Container should be stuck when:
  // 1. Container top has reached viewport top, AND
  // 2. We haven't scrolled through all projects yet
  // Note: atBeginning check is handled separately - we allow initial sticking
  const shouldBeStuck = containerTopReached && !allProjectsScrolled;
  
  // Update stuck state
  if (shouldBeStuck !== state.isStuck) {
    state.isStuck = shouldBeStuck;
    
    if (state.isStuck) {
      // Store the scroll position when first getting stuck
      if (state.stuckScrollY === 0) {
        state.stuckScrollY = scrollY;
      }
    } else {
      // Only reset stuckScrollY when actually releasing
      state.stuckScrollY = 0;
    }
  }
  
  // Check if all projects are scrolled first
  const totalProjectsHeightCheck = projectData.length * state.projectHeight;
  const maxInternalScrollCheck = (projectData.length - 1) * state.projectHeight;
  const allProjectsScrolledCheck = state.targetY <= -(maxInternalScrollCheck - 10);
  
  // CRITICAL: Only check for bottom if all projects are scrolled
  // This prevents blocking container scroll when container is still active
  if (allProjectsScrolledCheck) {
    const currentScrollY = window.scrollY;
    const documentHeight = document.documentElement.scrollHeight;
    const currentViewportHeight = window.innerHeight;
    const atAbsoluteBottom = currentScrollY + currentViewportHeight >= documentHeight - 10;
    
    // Also check if footer's bottom is at the bottom of viewport
    const footerSection = document.querySelector('.footer-section');
    let atFooterBottom = false;
    if (footerSection) {
      const footerRect = footerSection.getBoundingClientRect();
      // If footer's bottom is at or near the bottom of viewport, we're at footer bottom
      atFooterBottom = footerRect.bottom >= currentViewportHeight - 10 && footerRect.bottom <= currentViewportHeight + 10;
    }
    
    // If at absolute bottom of page OR at footer bottom AND all projects scrolled, NEVER activate container
    // This prevents container from reactivating when user reaches bottom of footer
    if (atAbsoluteBottom || atFooterBottom) {
      // Always prevent container activation when at bottom and all projects scrolled
      state.isInContainer = false;
      // Keep targetY at the end to prevent scrolling back
      state.targetY = -maxInternalScrollCheck;
      return false;
    }
  }
  
  // CRITICAL: Check if we're at the absolute bottom BEFORE setting isInContainer
  // This must be checked regardless of allProjectsScrolled to prevent reactivation
  const currentScrollY = window.scrollY;
  const documentHeight = document.documentElement.scrollHeight;
  const currentViewportHeight = window.innerHeight;
  const atAbsoluteBottom = currentScrollY + currentViewportHeight >= documentHeight - 10;
  
  const footerSection = document.querySelector('.footer-section');
  let atFooterBottom = false;
  if (footerSection) {
    const footerRect = footerSection.getBoundingClientRect();
    atFooterBottom = footerRect.bottom >= currentViewportHeight - 10 && footerRect.bottom <= currentViewportHeight + 10;
  }
  
  // If at absolute bottom AND all projects scrolled, NEVER activate container
  if ((atAbsoluteBottom || atFooterBottom) && allProjectsScrolledCheck) {
    state.isInContainer = false;
    state.targetY = -maxInternalScrollCheck;
    return false;
  }
  
  // Container is active when it's visible in viewport (for scroll and minimap to work)
  // Use a more lenient threshold to ensure container scroll works when container is in view
  const rect = state.containerSection.getBoundingClientRect();
  const threshold = viewportHeight * 0.5; // More lenient threshold
  const isInView = rect.top < viewportHeight && rect.bottom > 0; // Container is in viewport
  // Container is active if it's in view OR stuck (stuck means it's definitely active)
  // BUT only if not at bottom with all projects scrolled
  state.isInContainer = (isInView || state.isStuck) && !((atAbsoluteBottom || atFooterBottom) && allProjectsScrolledCheck);
  
  return state.isInContainer;
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
  
  // Calculate project positions relative to container
  const totalProjectsHeight = projectData.length * state.projectHeight;
  const projectScrollY = state.currentY;
  const minimapy = (projectScrollY * state.minimapHeight) / state.projectHeight;
  
  // Update projects position (always update for smooth transitions)
  state.projects.forEach((item, index) => {
    const y = index * state.projectHeight + projectScrollY;
    item.el.style.transform = `translateY(${y}px)`;
    if (item.parallax) {
      item.parallax.update(projectScrollY, index);
    }
  });
  
  // Update minimap visibility
  const minimap = document.querySelector(".minimap");
  if (minimap) {
    minimap.style.opacity = state.isInContainer ? "1" : "0";
  }
  
  // Update minimap positions
  state.minimap.forEach((item, index) => {
    const y = index * state.minimapHeight + minimapy;
    item.el.style.transform = `translateY(${y}px)`;
    if (item.parallax) {
      item.parallax.update(minimapy, index);
    }
  });
  
  state.minimapInfo.forEach((item, index) => {
    const y = index * state.minimapHeight + minimapy + 40;
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

window.addEventListener(
  "wheel",
  (e) => {
    // Calculate boundaries first
    const totalProjectsHeight = projectData.length * state.projectHeight;
    // Max scroll allows viewing the last project: (n-1) * height
    const maxScroll = -((projectData.length - 1) * state.projectHeight);
    const atBeginning = state.targetY >= -1;
    const atEnd = state.targetY <= maxScroll + 1;
    
    // CRITICAL: Check boundaries FIRST before any other checks
    // This ensures we release and allow normal scroll before checking container state
    // If at end and scrolling down, ALWAYS allow normal scroll FIRST
    // This must happen before any other checks to ensure footer is accessible
    if (atEnd && e.deltaY > 0) {
      // Check if we're at the absolute bottom of the page
      const scrollY = window.scrollY;
      const documentHeight = document.documentElement.scrollHeight;
      const viewportHeight = window.innerHeight;
      const atAbsoluteBottom = scrollY + viewportHeight >= documentHeight - 10;
      
      const footerSection = document.querySelector('.footer-section');
      let atFooterBottom = false;
      if (footerSection) {
        const footerRect = footerSection.getBoundingClientRect();
        atFooterBottom = footerRect.bottom >= viewportHeight - 10 && footerRect.bottom <= viewportHeight + 10;
      }
      
      // If at absolute bottom, never reactivate container
      if (atAbsoluteBottom || atFooterBottom) {
        // At bottom - allow normal scroll only, never reactivate container
        return; // Allow normal page scroll
      }
      
      // Force release if stuck - do this immediately
      if (state.isStuck) {
        state.isStuck = false;
        state.stuckScrollY = 0;
        // Reset container positioning immediately
        if (state.containerSection) {
          state.containerSection.style.position = '';
          state.containerSection.style.top = '';
          state.containerSection.style.left = '';
          state.containerSection.style.width = '';
          state.containerSection.style.zIndex = '';
        }
        const spacer = document.querySelector('.container-spacer');
        if (spacer) {
          spacer.style.height = '0';
        }
      }
      // CRITICAL: Never prevent default when at end - always allow normal scroll
      // Don't use smooth scroll here - let the user's natural scroll work
      return; // Allow normal page scroll - DO NOT prevent default
    }
    
    // Get current container position for remaining checks
    const containerOriginalTop = state.containerOriginalTop || state.containerTop;
    const scrollY = window.scrollY;
    let containerTopPosition;
    
    if (state.containerSection) {
      if (state.containerSection.style.position === 'fixed') {
        containerTopPosition = containerOriginalTop - scrollY;
      } else {
        const rect = state.containerSection.getBoundingClientRect();
        containerTopPosition = rect.top;
      }
    }
    
    // Check container state FIRST - this updates isStuck and isInContainer
    checkIfInContainer();
    
    // CRITICAL: If container is stuck, use custom scroll (including reverse scrolling)
    if (state.isStuck) {
      // Check boundaries - only release when at beginning AND scrolling up
      if (atBeginning && e.deltaY < 0) {
        // At beginning and scrolling up - release to show header
        state.isStuck = false;
        state.stuckScrollY = 0;
        // Reset container positioning immediately
        if (state.containerSection) {
          state.containerSection.style.position = '';
          state.containerSection.style.top = '';
          state.containerSection.style.left = '';
          state.containerSection.style.width = '';
          state.containerSection.style.zIndex = '';
        }
        const spacer = document.querySelector('.container-spacer');
        if (spacer) {
          spacer.style.height = '0';
        }
        // Allow normal scroll to header
        return; // Allow normal page scroll
      }
      
      // Container is stuck and not at beginning - use custom scroll (allows reverse scrolling)
      e.preventDefault();
      state.isSnapping = false;
      state.lastScrollTime = Date.now();
      const delta = Math.max(
        Math.min(e.deltaY * config.SCROLL_SPEED, config.MAX_VELOCITY),
        -config.MAX_VELOCITY
      );
      state.targetY -= delta; // This allows reverse scrolling when deltaY is negative (scrolling up)
      return;
    }
    
    // Not stuck - check if container is in view
    if (!state.isInContainer) {
      // Container not in view - allow normal page scrolling
      return;
    }
    
    // Container is in view but not stuck yet
    // Check if container is at/near top - if so, use custom scroll to make it stick
    if (containerTopPosition !== undefined) {
      if (containerTopPosition <= 10) {
        // Container at/near top - use custom scroll to make it stick
        // Allow custom scroll when scrolling down (deltaY > 0) even at beginning
        // Only prevent when at end and scrolling down, or at beginning and scrolling up
        const scrollingDown = e.deltaY > 0;
        const scrollingUp = e.deltaY < 0;
        
        if (atEnd && scrollingDown) {
          // At end and scrolling down - allow normal scroll to footer
          return;
        }
        
        if (atBeginning && scrollingUp) {
          // At beginning and scrolling up - allow normal scroll to header
          return;
        }
        
        // Use custom scroll - this will make container stick and items scroll
        e.preventDefault();
        state.isSnapping = false;
        state.lastScrollTime = Date.now();
        const delta = Math.max(
          Math.min(e.deltaY * config.SCROLL_SPEED, config.MAX_VELOCITY),
          -config.MAX_VELOCITY
        );
        state.targetY -= delta;
        // Force check again to ensure container sticks
        // The animate loop will handle the actual sticking via checkIfInContainer
        return;
      } else {
        // Container in view but not at top yet (> 10px) - allow normal scroll to bring it to top
        return;
      }
    } else {
      // Can't determine position - allow normal scroll
      return;
    }
  },
  { passive: false }
);

window.addEventListener("keydown", (e) => {
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    // Calculate boundaries first (needed for all checks)
    const containerOriginalTop = state.containerOriginalTop || state.containerTop;
    const scrollAmount = state.projectHeight * 0.8;
    
    // Calculate boundaries
    const totalProjectsHeight = projectData.length * state.projectHeight;
    // Max scroll allows viewing the last project: (n-1) * height
    const maxScroll = -((projectData.length - 1) * state.projectHeight);
    const atBeginning = state.targetY >= -1;
    const atEnd = state.targetY <= maxScroll + 1;
    
    // Get current container position
    const scrollY = window.scrollY;
    let containerTopPosition;
    if (state.containerSection) {
      if (state.containerSection.style.position === 'fixed') {
        containerTopPosition = containerOriginalTop - scrollY;
      } else {
        const rect = state.containerSection.getBoundingClientRect();
        containerTopPosition = rect.top;
      }
    }
    
    // Check container state FIRST - this updates isStuck and isInContainer
    checkIfInContainer();
    
    // CRITICAL: If container is stuck, use custom scroll FIRST (before boundary checks)
    // This ensures keyboard scrolling works when container is locked/stuck
    if (state.isStuck) {
      // Check boundaries to prevent scrolling past limits
      if (atEnd && e.key === "ArrowDown") {
        // At end and scrolling down - release and allow normal scroll to footer
        state.isStuck = false;
        state.stuckScrollY = 0;
        // Reset container positioning
        if (state.containerSection) {
          state.containerSection.style.position = '';
          state.containerSection.style.top = '';
          state.containerSection.style.left = '';
          state.containerSection.style.width = '';
          state.containerSection.style.zIndex = '';
        }
        const spacer = document.querySelector('.container-spacer');
        if (spacer) {
          spacer.style.height = '0';
        }
        
        // Smoothly scroll past container to show footer
        const containerHeight = state.containerSection?.offsetHeight || window.innerHeight;
        const targetScroll = containerOriginalTop + containerHeight;
        
        window.scrollTo({
          top: targetScroll,
          behavior: 'smooth'
        });
        return; // Allow normal scroll to footer
      }
      
      if (atBeginning && e.key === "ArrowUp") {
        // At beginning and scrolling up - release and allow normal scroll to header
        state.isStuck = false;
        state.stuckScrollY = 0;
        // Reset container positioning
        if (state.containerSection) {
          state.containerSection.style.position = '';
          state.containerSection.style.top = '';
          state.containerSection.style.left = '';
          state.containerSection.style.width = '';
          state.containerSection.style.zIndex = '';
        }
        const spacer = document.querySelector('.container-spacer');
        if (spacer) {
          spacer.style.height = '0';
        }
        
        // Smoothly scroll up to show header
        const targetScroll = Math.max(0, containerOriginalTop - 100);
        
        window.scrollTo({
          top: targetScroll,
          behavior: 'smooth'
        });
        return; // Allow normal scroll to header
      }
      
      // Container is stuck and not at boundaries - use custom scroll
      e.preventDefault();
      state.isSnapping = false;
      state.lastScrollTime = Date.now();
      const delta = e.key === "ArrowDown" ? scrollAmount : -scrollAmount;
      state.targetY -= delta;
      return;
    }
    
    // If at end and pressing ArrowDown, smoothly transition to footer
    if (atEnd && e.key === "ArrowDown") {
      return; // Allow normal scroll to footer
    }
    
    // If at beginning and pressing ArrowUp, smoothly transition to header
    if (atBeginning && e.key === "ArrowUp") {
      return; // Allow normal scroll to header
    }
    
    // Not stuck - check if container is in view
    if (!state.isInContainer) {
      // Container not in view - allow normal page scrolling
      return;
    }
    
    // Container is in view but not stuck yet
    // Check if container is at/near top - if so, use custom scroll to make it stick
    if (containerTopPosition !== undefined && containerTopPosition <= 10) {
      // Container at/near top - use custom scroll to make it stick
      // Allow custom scroll when scrolling down (ArrowDown) even at beginning
      // Only prevent when at end and scrolling down, or at beginning and scrolling up
      if (atEnd && e.key === "ArrowDown") {
        // At end and scrolling down - allow normal scroll to footer
        return;
      }
      
      if (atBeginning && e.key === "ArrowUp") {
        // At beginning and scrolling up - allow normal scroll to header
        return;
      }
      
      // Use custom scroll - this will make container stick and items scroll
      e.preventDefault();
      state.isSnapping = false;
      state.lastScrollTime = Date.now();
      const delta = e.key === "ArrowDown" ? scrollAmount : -scrollAmount;
      state.targetY -= delta;
      return;
    }
    
    // Container in view but not at top yet - allow normal scroll to bring it to top
    // If container is above viewport or not yet at top, allow normal scroll
    if (containerTopPosition !== undefined && containerTopPosition > 10) {
      // Allow normal page scroll to bring container to top
      // Simulate scroll by programmatically scrolling
      if (e.key === "ArrowDown") {
        window.scrollBy({ top: scrollAmount, behavior: 'auto' });
      } else {
        window.scrollBy({ top: -scrollAmount, behavior: 'auto' });
      }
      e.preventDefault();
      // Recheck after allowing scroll
      setTimeout(() => {
        checkIfInContainer();
      }, 10);
      return;
    }
    
    // Can't determine position - allow normal scroll
    return;
  }
});

window.addEventListener("touchstart", (e) => {
  // FIRST: Check if we're at the footer - if so, never activate container scroll
  const footerSection = document.querySelector('.footer-section');
  if (footerSection) {
    const footerRect = footerSection.getBoundingClientRect();
    const scrollY = window.scrollY;
    const documentHeight = document.documentElement.scrollHeight;
    const viewportHeight = window.innerHeight;
    
    // If footer is in view or we're near the bottom of the page, don't activate container
    const atFooter = footerRect.top < viewportHeight * 0.8 || scrollY + viewportHeight >= documentHeight - 100;
    
    if (atFooter) {
      // We're at the footer - release and allow normal scroll
      state.isDragging = false;
      return; // Allow normal page scroll
    }
  }
  
  // Check container state FIRST - this updates isStuck and isInContainer
  checkIfInContainer();
  
  // Get container position to check if it's at/near top or in view
  const containerOriginalTop = state.containerOriginalTop || state.containerTop;
  const scrollY = window.scrollY;
  let containerTopPosition;
  if (state.containerSection) {
    const rect = state.containerSection.getBoundingClientRect();
    containerTopPosition = rect.top;
  }
  
  // Allow touch drag if container is in viewport (similar to wheel handler)
  // This allows dragging even if container is not stuck yet, so it can stick during scroll
  const containerInView = containerTopPosition !== undefined && 
                          containerTopPosition < window.innerHeight && 
                          (containerTopPosition + (state.containerSection?.offsetHeight || window.innerHeight)) > 0;
  
  // Always allow dragging if container is stuck (container is active)
  // This ensures touch scroll works when container is active
  if (state.isStuck) {
    state.isDragging = true;
    state.isSnapping = false;
    state.dragStart = { y: e.touches[0].clientY, scrollY: state.targetY };
    state.lastScrollTime = Date.now();
  } else if (state.isInContainer || containerInView) {
    // Container is in view but not stuck yet - allow dragging so it can stick
    state.isDragging = true;
    state.isSnapping = false;
    state.dragStart = { y: e.touches[0].clientY, scrollY: state.targetY };
    state.lastScrollTime = Date.now();
  }
  // If container not in view and not stuck, allow normal touch scrolling
}, { passive: true });

window.addEventListener("touchmove", (e) => {
  if (!state.isDragging) return;
  
  // FIRST: Check if we're at the absolute bottom of the page
  // If at bottom, NEVER activate container scroll
  const scrollY = window.scrollY;
  const documentHeight = document.documentElement.scrollHeight;
  const viewportHeight = window.innerHeight;
  const atAbsoluteBottom = scrollY + viewportHeight >= documentHeight - 10;
  
  const footerSection = document.querySelector('.footer-section');
  let atFooterBottom = false;
  if (footerSection) {
    const footerRect = footerSection.getBoundingClientRect();
    atFooterBottom = footerRect.bottom >= viewportHeight - 10 && footerRect.bottom <= viewportHeight + 10;
  }
  
  // If at absolute bottom, never activate container scroll
  if (atAbsoluteBottom || atFooterBottom) {
    // At bottom - release drag and allow normal scroll only
    state.isDragging = false;
    return; // Allow normal page scroll
  }
  
  // Calculate boundaries
  const totalProjectsHeight = projectData.length * state.projectHeight;
  // Max scroll allows viewing the last project: (n-1) * height
  const maxScroll = -((projectData.length - 1) * state.projectHeight);
  const atBeginning = state.targetY >= -1;
  const atEnd = state.targetY <= maxScroll + 1;
  
  // Calculate new target position
  const newTargetY = state.dragStart.scrollY - (e.touches[0].clientY - state.dragStart.y) * 2.0;
  const scrollingDown = newTargetY < state.targetY;
  const scrollingUp = newTargetY > state.targetY;
  
  // Check container state FIRST - this updates isStuck and isInContainer
  checkIfInContainer();
  
  // CRITICAL: If container is stuck, use custom scroll (including reverse scrolling)
  // This is the main case when container is active - touch scroll should work here
  if (state.isStuck) {
    // Check boundaries - only release when at beginning AND scrolling up
    if (atBeginning && scrollingUp) {
      // At beginning and scrolling up - release to show header
      state.isStuck = false;
      state.stuckScrollY = 0;
      // Reset container positioning immediately
      if (state.containerSection) {
        state.containerSection.style.position = '';
        state.containerSection.style.top = '';
        state.containerSection.style.left = '';
        state.containerSection.style.width = '';
        state.containerSection.style.zIndex = '';
      }
      const spacer = document.querySelector('.container-spacer');
      if (spacer) {
        spacer.style.height = '0';
      }
      
      // Smoothly scroll up to show header
      const containerOriginalTop = state.containerOriginalTop || state.containerTop;
      const targetScroll = Math.max(0, containerOriginalTop - 100);
      
      window.scrollTo({
        top: targetScroll,
        behavior: 'smooth'
      });
      
      state.isDragging = false;
      return; // Allow normal scroll to header
    }
    
    // Check if at end and scrolling down - release to show footer
    if (atEnd && scrollingDown) {
      state.isStuck = false;
      state.stuckScrollY = 0;
      // Reset container positioning
      if (state.containerSection) {
        state.containerSection.style.position = '';
        state.containerSection.style.top = '';
        state.containerSection.style.left = '';
        state.containerSection.style.width = '';
        state.containerSection.style.zIndex = '';
      }
      const spacer = document.querySelector('.container-spacer');
      if (spacer) {
        spacer.style.height = '0';
      }
      
      // Smoothly scroll past container to show footer
      const containerOriginalTop = state.containerOriginalTop || state.containerTop;
      const containerHeight = state.containerSection?.offsetHeight || window.innerHeight;
      const targetScroll = containerOriginalTop + containerHeight;
      
      window.scrollTo({
        top: targetScroll,
        behavior: 'smooth'
      });
      
      state.isDragging = false;
      return; // Allow normal scroll to footer
    }
    
    // Container is stuck and not at boundaries - use custom scroll (allows reverse scrolling)
    // THIS IS WHERE TOUCH SCROLL SHOULD WORK WHEN CONTAINER IS ACTIVE
    e.preventDefault();
    state.isSnapping = false;
    state.targetY = newTargetY; // This allows reverse scrolling when scrolling up
    state.lastScrollTime = Date.now();
    return;
  }
  
  // Not stuck - check if container is in view
  if (!state.isInContainer) {
    // Container not in view - allow normal page scrolling
    state.isDragging = false;
    return;
  }
  
  // Container is in view but not stuck yet
  // Check if container should be stuck now (might have reached top during touch scroll)
  const containerOriginalTop = state.containerOriginalTop || state.containerTop;
  // scrollY is already declared at line 1022
  let containerTopPosition;
  if (state.containerSection) {
    if (state.containerSection.style.position === 'fixed') {
      containerTopPosition = containerOriginalTop - scrollY;
    } else {
      const rect = state.containerSection.getBoundingClientRect();
      containerTopPosition = rect.top;
    }
  }
  
  // If container is at/near top and in view, it should stick
  if (containerTopPosition !== undefined && containerTopPosition <= 10) {
    // Container at/near top - should stick and use custom scroll
    // Check boundaries - only prevent when at end and scrolling down, or at beginning and scrolling up
    if (atEnd && scrollingDown) {
      // At end and scrolling down - allow normal scroll to footer
      state.isDragging = false;
      return;
    }
    
    if (atBeginning && scrollingUp) {
      // At beginning and scrolling up - allow normal scroll to header
      state.isDragging = false;
      return;
    }
    
    // Ensure container is stuck (might not be stuck yet if just reached top)
    if (!state.isStuck) {
      // Force container to stick
      // scrollY is already declared above at line 1137
      state.isStuck = true;
      if (state.stuckScrollY === 0) {
        state.stuckScrollY = scrollY;
      }
      // Apply fixed positioning
      if (state.containerSection) {
        state.containerSection.style.position = 'fixed';
        state.containerSection.style.top = '0';
        state.containerSection.style.left = '0';
        state.containerSection.style.width = '100%';
        state.containerSection.style.zIndex = '10';
      }
      // Add spacer to prevent content jump
      const spacer = document.querySelector('.container-spacer');
      if (spacer && state.containerSection) {
        spacer.style.height = state.containerSection.offsetHeight + 'px';
      }
      // Update state to ensure container is recognized as in container
      state.isInContainer = true;
      // Force sync elements to ensure items are created when container sticks
      syncElements();
    }
    
    // Use custom scroll - this will make container stick and items scroll (forward or reverse)
    e.preventDefault();
    state.targetY = newTargetY; // Allows reverse scrolling when scrolling up
    state.lastScrollTime = Date.now();
    return;
  }
  
  // Container in view but not at top yet
  // Similar to wheel handler - if container is close to top, use custom scroll to make it stick
  // This allows smooth transition when container reaches top during initial scroll
  if (containerTopPosition !== undefined && containerTopPosition > 10 && containerTopPosition <= 50) {
    // Container is close to top (within 50px) - use custom scroll to help it stick smoothly
    // This matches wheel handler behavior - it uses custom scroll when container is at/near top
    e.preventDefault();
    state.targetY = newTargetY;
    state.lastScrollTime = Date.now();
    // Force check to see if container should stick now
    checkIfInContainer();
    // If container reached top, it will stick via checkIfInContainer
    return;
  }
  
  // Container is far from top (> 50px) - allow normal scroll to bring it to top
  // Don't prevent default - let normal scroll work
  // Keep isDragging true so we can catch it when it gets closer
  return;
}, { passive: false });

window.addEventListener("touchend", () => {
  // Check boundaries on touch end to ensure proper release
  const totalProjectsHeight = projectData.length * state.projectHeight;
  // Max scroll allows viewing the last project: (n-1) * height
  const maxScroll = -((projectData.length - 1) * state.projectHeight);
  const atBeginning = state.targetY >= -1;
  const atEnd = state.targetY <= maxScroll + 1;
  
  // Force release if at boundaries
  if (atEnd || atBeginning) {
    if (state.isStuck) {
      state.isStuck = false;
      state.stuckScrollY = 0;
      // Reset container positioning immediately
      if (state.containerSection) {
        state.containerSection.style.position = '';
        state.containerSection.style.top = '';
        state.containerSection.style.left = '';
        state.containerSection.style.width = '';
        state.containerSection.style.zIndex = '';
      }
      const spacer = document.querySelector('.container-spacer');
      if (spacer) {
        spacer.style.height = '0';
      }
    }
  }
  
  state.isDragging = false;
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