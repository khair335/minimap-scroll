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
  SCROLL_SPEED: window.innerWidth < 768 ? 2.2 : 1.5, 
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
  
  const checkIfInContainer = () => {
    if (!state.containerSection) return false;
    
    // Temporarily unfix to get the real page offset
    const wasFixed = state.containerSection.style.position === 'fixed';
    if (wasFixed) state.containerSection.style.position = '';
    
    const rect = state.containerSection.getBoundingClientRect();
    state.containerOriginalTop = rect.top + window.scrollY;
    
    if (wasFixed) state.containerSection.style.position = 'fixed';
  
    const isInView = rect.top < window.innerHeight && rect.bottom > 0;
    state.isInContainer = isInView;
    return isInView;
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
    checkIfInContainer();
    updateContainerPosition();
  
    const maxScroll = -((projectData.length - 1) * state.projectHeight);
    
    // Keep targetY clamped to project range
    state.targetY = Math.max(maxScroll, Math.min(0, state.targetY));
  
    if (state.isStuck && state.containerSection) {
      // FORCE FULL VIEWPORT VISIBILITY
      state.containerSection.style.position = 'fixed';
      state.containerSection.style.top = '0px';
      state.containerSection.style.left = '0px';
      state.containerSection.style.width = '100%';
      state.containerSection.style.height = '100vh';
      state.containerSection.style.zIndex = '100';
    } else if (state.containerSection) {
      // RESET WHEN NOT STUCK
      state.containerSection.style.position = '';
      state.containerSection.style.top = '';
      state.containerSection.style.height = '';
    }
  
    // Use a faster LERP for mobile touch so it follows the finger exactly
    const lerpFactor = state.isDragging ? 0.4 : config.LERP_FACTOR;
    state.currentY = lerp(state.currentY, state.targetY, lerpFactor);
  
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
  
  // Robust Touch Logic for Mobile
  // Robust Touch Logic using Delta Tracking
  let lastTouchY = 0;
  
  window.addEventListener("touchstart", (e) => {
    lastTouchY = e.touches[0].clientY;
    
    // Refresh state to see if we are in/near the container
    checkIfInContainer();
    
    // Allow dragging if we are stuck OR near the container to catch the scroll
    if (state.isStuck || state.isInContainer) {
      state.isDragging = true;
      state.isSnapping = false;
      state.lastScrollTime = Date.now();
      // Don't prevent default - allow normal page scroll
    }
  }, { passive: true });
  
  window.addEventListener("touchmove", (e) => {
    if (!state.isDragging) return;
  
    const currentTouchY = e.touches[0].clientY;
    const deltaY = lastTouchY - currentTouchY; 
    lastTouchY = currentTouchY;
  
    const maxScroll = -((projectData.length - 1) * state.projectHeight);
    const rect = state.containerSection.getBoundingClientRect();
  
    if (state.isStuck) {
      const atTopLimit = state.targetY >= -1 && deltaY < 0; // Scrolling up at first item
      const atBottomLimit = state.targetY <= maxScroll + 1 && deltaY > 0; // Scrolling down at last item
  
      if (atTopLimit || atBottomLimit) {
        // RELEASE: User reached the end of the projects and kept pulling
        state.isStuck = false;
        state.isDragging = false; 
      } else {
        if (e.cancelable) e.preventDefault();
        // Increase sensitivity for mobile (2.0 - 3.0)
        state.targetY -= deltaY * 2.5; 
        state.lastScrollTime = Date.now();
      }
    } else {
      // TRIGGER LOGIC:
      // If scrolling DOWN and container top reaches or passes top of screen
      if (deltaY > 0 && rect.top <= 10 && rect.bottom > window.innerHeight) {
          if (state.targetY > maxScroll) {
              state.isStuck = true;
              window.scrollTo(0, state.containerOriginalTop); // Align perfectly
          }
      }
      // If scrolling UP and container top is near 0 (coming from footer)
      else if (deltaY < 0 && rect.top >= -10 && rect.top < 50) {
          if (state.targetY < 0) {
              state.isStuck = true;
              window.scrollTo(0, state.containerOriginalTop);
          }
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