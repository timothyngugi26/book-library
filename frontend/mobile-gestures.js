// Mobile gesture support
class MobileGestures {
  constructor() {
    this.startX = 0;
    this.startY = 0;
    this.currentX = 0;
    this.currentY = 0;
    this.swipeThreshold = 50;
    
    this.init();
  }
  
  init() {
    // Only enable on mobile devices
    if (!this.isMobile()) return;
    
    document.addEventListener('touchstart', this.handleTouchStart.bind(this), false);
    document.addEventListener('touchmove', this.handleTouchMove.bind(this), false);
    document.addEventListener('touchend', this.handleTouchEnd.bind(this), false);
    
    // Add pull-to-refresh prevention
    this.preventPullToRefresh();
  }
  
  isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }
  
  handleTouchStart(event) {
    this.startX = event.touches[0].clientX;
    this.startY = event.touches[0].clientY;
  }
  
  handleTouchMove(event) {
    if (!this.startX || !this.startY) return;
    
    this.currentX = event.touches[0].clientX;
    this.currentY = event.touches[0].clientY;
  }
  
  handleTouchEnd(event) {
    if (!this.startX || !this.startY) return;
    
    const diffX = this.currentX - this.startX;
    const diffY = this.currentY - this.startY;
    
    // Horizontal swipe (for navigation)
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > this.swipeThreshold) {
      if (diffX > 0) {
        this.onSwipeRight();
      } else {
        this.onSwipeLeft();
      }
    }
    
    // Reset values
    this.startX = 0;
    this.startY = 0;
    this.currentX = 0;
    this.currentY = 0;
  }
  
  onSwipeRight() {
    // Go back in history or show previous page
    console.log('Swiped right - navigate back');
  }
  
  onSwipeLeft() {
    // Go forward in history or show next page  
    console.log('Swiped left - navigate forward');
  }
  
  preventPullToRefresh() {
    // Prevent pull-to-refresh on mobile
    document.body.style.overscrollBehavior = 'none';
  }
}

// Initialize mobile gestures
document.addEventListener('DOMContentLoaded', () => {
  new MobileGestures();
});
