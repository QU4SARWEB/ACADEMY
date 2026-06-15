document.addEventListener('DOMContentLoaded', () => {
  const loadingOverlay = document.getElementById('loadingOverlay');

  const hideLoader = () => {
    loadingOverlay.classList.add('hidden');
  };

  // Max timeout: hide loader after 3s no matter what
  const maxTimeout = setTimeout(hideLoader, 3000);

  // Normal flow: hide when all assets are loaded
  window.addEventListener('load', () => {
    clearTimeout(maxTimeout);
    setTimeout(hideLoader, 400);
  });

  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
});