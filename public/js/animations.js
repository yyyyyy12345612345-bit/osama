const Animations = {
  // Page Transition
  pageTransition(contentElement) {
    if (!window.gsap) return;
    
    gsap.fromTo(contentElement, 
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }
    );
  },

  // Stagger cards or list items
  staggerItems(selector) {
    if (!window.gsap) return;
    
    gsap.fromTo(selector,
      { opacity: 0, y: 30, scale: 0.95 },
      { opacity: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.1, ease: "back.out(1.2)" }
    );
  },

  // Highlight an updated row
  highlightRow(rowElement) {
    if (!window.gsap) return;

    gsap.fromTo(rowElement,
      { backgroundColor: "rgba(59, 130, 246, 0.3)" },
      { backgroundColor: "transparent", duration: 1.5, ease: "power2.out" }
    );
  },

  // Form modal opening
  modalOpen(modalContent) {
    if (!window.gsap) return;
    
    gsap.fromTo(modalContent,
      { opacity: 0, scale: 0.8, y: -50 },
      { opacity: 1, scale: 1, y: 0, duration: 0.4, ease: "back.out(1.5)" }
    );
  }
};

// Hook into router to animate pages
document.addEventListener('DOMContentLoaded', () => {
  const contentArea = document.getElementById('contentArea');
  
  // Create a MutationObserver to detect when a page renders
  const observer = new MutationObserver((mutations) => {
    let triggered = false;
    for (const mutation of mutations) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        triggered = true;
        break;
      }
    }
    
    if (triggered) {
      // Small timeout to let the DOM settle before animating
      setTimeout(() => {
        // Find elements to stagger if they exist
        const cards = contentArea.querySelectorAll('.stat-card, .card, table tr');
        if (cards.length > 0) {
          Animations.staggerItems(cards);
        } else {
          Animations.pageTransition(contentArea);
        }
      }, 50);
    }
  });

  if (contentArea) {
    observer.observe(contentArea, { childList: true });
  }

  // Hook into Modal openings
  const modalOverlay = document.getElementById('modalOverlay');
  const modalContainer = document.getElementById('modalContainer');
  
  if (modalOverlay && modalContainer) {
    const modalObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          if (modalOverlay.classList.contains('active')) {
            Animations.modalOpen(modalContainer);
          }
        }
      });
    });
    modalObserver.observe(modalOverlay, { attributes: true });
  }
});
