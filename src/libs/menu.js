document.getElementById('hamburger-checkbox')?.addEventListener('change', (e) => {
  const nav = document.querySelector('.nav');
  if (e.target?.checked) {
      nav?.classList.remove('hidden');
      nav?.classList.add('expanded');
  } else {
      nav?.classList.remove('expanded');
      nav?.classList.add('hidden');
  }
})
