// Auto-hide scrollbar after 2 seconds of inactivity

let scrollbarTimeout = null;

export function initScrollbarAutoHide() {
  // Only run on desktop screens (> 1024px)
  if (window.innerWidth <= 1024) {
    return;
  }

  const root = document.documentElement;
  
  // Hide scrollbar initially
  root.style.setProperty('--scrollbar-opacity', '0');

  const showScrollbar = () => {
    root.style.setProperty('--scrollbar-opacity', '1');

    // Clear existing timeout
    if (scrollbarTimeout) {
      clearTimeout(scrollbarTimeout);
    }

    // Hide scrollbar after 2 seconds of inactivity
    scrollbarTimeout = setTimeout(() => {
      root.style.setProperty('--scrollbar-opacity', '0');
    }, 2000);
  };

  // Update scrollbar track color based on footer visibility
  const updateScrollbarTrackColor = () => {
    const footer = document.querySelector('.site-footer');
    if (footer) {
      const footerRect = footer.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      
      // Check if footer is visible in viewport
      if (footerRect.top < windowHeight && footerRect.bottom > 0) {
        // Footer is visible - change track to black
        root.style.setProperty('--scrollbar-track-color', '#0b0b0b');
      } else {
        // Footer not visible - keep track transparent
        root.style.setProperty('--scrollbar-track-color', 'transparent');
      }
    }
  };

  // Handle scroll with track color update
  const handleScroll = () => {
    updateScrollbarTrackColor();
    showScrollbar();
  };

  // Show scrollbar on scroll
  window.addEventListener('scroll', handleScroll, { passive: true });
  
  // Update on resize
  window.addEventListener('resize', updateScrollbarTrackColor, { passive: true });

  // Show scrollbar on mouse move near the scrollbar area
  window.addEventListener('mousemove', (e) => {
    // Check if mouse is near the right edge (within 20px)
    if (window.innerWidth - e.clientX <= 20) {
      showScrollbar();
    }
  }, { passive: true });

  // Initial calculation
  updateScrollbarTrackColor();
}

