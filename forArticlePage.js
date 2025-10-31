// ********************************************************** 'data-name' to Group Details **********************************************************
(function() {
    'use strict';

    // Wait for DOM to be fully loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function init() {
        const allDetails = document.querySelectorAll('details');
        const stepContainer = document.getElementById('tsgstepsV202504');
        const groupedDetails = new Map();

        // Group details by data-name or container
        allDetails.forEach(detail => {
            let groupName = detail.dataset.name;
            
            // If no data-name but inside step container, group them together
            if (!groupName && stepContainer && stepContainer.contains(detail)) {
                groupName = 'tsgstepsV202504-group';
            }
            
            if (groupName) {
                if (!groupedDetails.has(groupName)) {
                    groupedDetails.set(groupName, []);
                }
                groupedDetails.get(groupName).push(detail);
            }
        });

        // Set up mutual exclusivity for each group
        groupedDetails.forEach(details => {
            details.forEach(detail => {
                detail.addEventListener('toggle', () => {
                    if (detail.open) {
                        // Close all other details in the same group
                        details.forEach(other => {
                            if (other !== detail && other.open) {
                                other.open = false;
                            }
                        });
                    }
                });
            });
        });

        // Handle URL fragment and ID-based opening
        const hash = window.location.hash.substring(1);
        if (hash) {
            const targetDetail = document.getElementById(hash);
            if (targetDetail && targetDetail.tagName === 'DETAILS') {
                targetDetail.open = true;
                
                // Scroll to the element after a short delay to ensure layout is ready
                setTimeout(() => {
                    targetDetail.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 100);
            }
        }

        // Update URL when details are opened/closed
        allDetails.forEach(detail => {
            if (detail.id) {
                detail.addEventListener('toggle', function() {
                    // Only update URL when opening (not closing)
                    if (this.open) {
                        history.replaceState(null, '', `#${this.id}`);
                    } else {
                        // Remove hash when closing (optional - uncomment if desired)
                        // history.replaceState(null, '', window.location.pathname + window.location.search);
                    }
                });
            }
        });
    }
})();

/***************************** New Carousel Step Nav *****************************/
// Track which stepList-wrapper was most recently interacted with
let activeWrapper = null;

// Function to initialize all step lists
function initializeAllStepLists() {
  document.querySelectorAll('.stepList-wrapper').forEach(wrapper => {
    if (wrapper.dataset.initialized) return;
    initializeStepList(wrapper);
    wrapper.dataset.initialized = 'true';
  });
}

// Process each stepList-wrapper independently
function initializeStepList(wrapper) {
  const stepList = wrapper.querySelector('.stepList');
  const steps = Array.from(wrapper.querySelectorAll('.stepInfo'));
  const navPrev = wrapper.querySelector('.navPrev');
  const navNext = wrapper.querySelector('.navNext');
  const navProgress = wrapper.querySelector('.navProgress');
  const navHint = wrapper.querySelector('.navHint');

  if (!stepList || steps.length === 0) return;

  let currentIndex = 0;
  let isAnimating = false;

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  navHint.textContent = isMobile
    ? '← Swipe left or right to move between steps →'
    : 'Press < or > to move between steps';

  // Find hidden ancestors (for accurate height measurement)
  function findHiddenAncestor(element) {
    let current = element;
    const hiddenElements = [];
    while (current && current !== document.body) {
      const computedStyle = window.getComputedStyle(current);
      if (computedStyle.display === 'none') {
        hiddenElements.push(current);
      }
      current = current.parentElement;
    }
    return hiddenElements;
  }

  // Equalize heights and vertically center short content
  function equalizeHeights() {
    const maxAllowedHeight = window.innerHeight * 0.9;

    const hiddenAncestors = findHiddenAncestor(wrapper);
    const originalDisplayValues = [];

    hiddenAncestors.forEach(el => {
      originalDisplayValues.push(el.style.display);
      el.style.display = 'block';
      el.style.visibility = 'hidden';
      el.style.position = 'absolute';
      el.style.left = '-9999px';
    });

    let finalHeight = 0;

    try {
      // Temporarily show all steps for measurement WITHOUT inline display
      const originallyHidden = [];
      steps.forEach(step => {
        if (step.classList.contains('hidden')) {
          originallyHidden.push(step);
          step.classList.remove('hidden');
        }
        step.style.position = 'relative';
        step.style.visibility = 'hidden';
        step.style.opacity = '0';
        step.style.pointerEvents = 'none';
        step.style.overflowY = 'visible';
        // DO NOT set display inline — rely on class
      });

      let maxHeight = 0;
      steps.forEach(step => {
        const h = step.scrollHeight;
        if (h > maxHeight) maxHeight = h;
      });

      finalHeight = Math.min(maxHeight, maxAllowedHeight);
      stepList.style.height = `${finalHeight}px`;

      steps.forEach(step => {
        step.style.height = `${finalHeight}px`;
        step.style.position = 'absolute';
        step.style.visibility = '';
        step.style.opacity = '';
        step.style.pointerEvents = '';
        step.style.overflowY = 'auto';
        // Again, no inline display — let CSS handle it
      });

      // Re-hide steps that were originally hidden
      originallyHidden.forEach(step => {
        step.classList.add('hidden');
      });

      // Ensure active step is visible
      steps[currentIndex].classList.add('active');
      steps[currentIndex].classList.remove('hidden');

    } finally {
      hiddenAncestors.forEach((el, index) => {
        el.style.display = originalDisplayValues[index] || '';
        el.style.visibility = '';
        el.style.position = '';
        el.style.left = '';
      });
    }
  }

  // Robustly center nav buttons only when .stepList is visible
  function centerNavButtons() {
    if (!stepList.offsetParent && !stepList.getClientRects().length) {
      requestAnimationFrame(centerNavButtons);
      return;
    }

    const rect = stepList.getBoundingClientRect();
    const wrapperRect = wrapper.getBoundingClientRect();
    const buttonHeight = 40;

    if (rect.width <= 0 || rect.height <= 0 || wrapperRect.width <= 0) {
      requestAnimationFrame(centerNavButtons);
      return;
    }

    const topPos = rect.top - wrapperRect.top + (rect.height / 2) - (buttonHeight / 2);
    navPrev.style.top = `${topPos}px`;
    navNext.style.top = `${topPos}px`;
  }

  // Build progress bar
  function buildProgressBar() {
    const frag = document.createDocumentFragment();
    const fill = document.createElement('div');
    fill.className = 'progress-fill';
    frag.appendChild(fill);

    steps.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.className = 'dot';
      dot.setAttribute('aria-label', `Go to step ${i + 1}`);
      dot.dataset.index = i;
      dot.addEventListener('click', () => {
        activeWrapper = wrapper;
        goToStep(i);
      });
      frag.appendChild(dot);
    });

    navProgress.innerHTML = '';
    navProgress.appendChild(frag);
    updateProgress();
  }

  function updateProgress() {
    const total = steps.length;
    const percent = total > 1 ? (currentIndex / (total - 1)) * 100 : 0;
    const fill = navProgress.querySelector('.progress-fill');
    if (fill) fill.style.width = `${percent}%`;

    navProgress.querySelectorAll('.dot').forEach((dot, i) => {
      dot.classList.toggle('completed', i <= currentIndex);
    });
  }

  function updateNavButtons() {
    navPrev.disabled = currentIndex === 0;
    navNext.disabled = currentIndex === steps.length - 1;
  }

  // ✅ NEW: Instant step switch with .hidden (no inline display)
  function goToStep(index) {
    if (isAnimating || index === currentIndex || index < 0 || index >= steps.length) return;
    isAnimating = true;

    steps[currentIndex].classList.add('hidden');
    steps[currentIndex].classList.remove('active');

    steps[index].classList.remove('hidden');
    steps[index].classList.add('active');

    currentIndex = index;
    updateProgress();
    updateNavButtons();
    isAnimating = false;
  }

  // Set icons
  navPrev.innerHTML = '<i class="fas fa-chevron-left"></i>';
  navNext.innerHTML = '<i class="fas fa-chevron-right"></i>';

  // Click handlers
  navPrev.addEventListener('click', () => {
    activeWrapper = wrapper;
    goToStep(currentIndex - 1);
  });
  navNext.addEventListener('click', () => {
    activeWrapper = wrapper;
    goToStep(currentIndex + 1);
  });

  // Mobile swipe
  if (isMobile) {
    steps.forEach(step => {
      let startX = 0;
      step.addEventListener('touchstart', e => {
        startX = e.touches[0].clientX;
      }, { passive: true });

      step.addEventListener('touchend', e => {
        if (!startX) return;
        const endX = e.changedTouches[0].clientX;
        const diff = startX - endX;
        const threshold = 50;
        if (Math.abs(diff) < threshold) return;

        if (diff > 0 && currentIndex < steps.length - 1) {
          activeWrapper = wrapper;
          goToStep(currentIndex + 1);
        } else if (diff < 0 && currentIndex > 0) {
          activeWrapper = wrapper;
          goToStep(currentIndex - 1);
        }
      }, { passive: true });
    });
  }

  // Initialize steps visibility
  steps.forEach((step, i) => {
    if (i === 0) {
      step.classList.add('active');
      step.classList.remove('hidden');
    } else {
      step.classList.add('hidden');
      step.classList.remove('active');
    }
  });

  equalizeHeights();
  centerNavButtons();
  buildProgressBar();
  updateNavButtons();

  // Re-center on resize
  const onResize = () => {
    equalizeHeights();
    centerNavButtons();
  };
  window.addEventListener('resize', onResize);

  // Keyboard handling
  function handleKeyDown(e) {
    if (activeWrapper !== wrapper) return;

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      goToStep(currentIndex - 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      goToStep(currentIndex + 1);
    }
  }
  document.addEventListener('keydown', handleKeyDown);

  // Handle <details> toggle
  const details = wrapper.closest('details');
  if (details) {
    const refresh = () => {
      setTimeout(() => {
        equalizeHeights();
      }, 50);
    };
    details.addEventListener('toggle', () => details.open && refresh());
    if (details.open) refresh();
  }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', initializeAllStepLists);
