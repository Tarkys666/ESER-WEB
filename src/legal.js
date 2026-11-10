(() => {
  const content = document.querySelector('#policy-content');
  if (!content) return;

  window.DILEK_API.get('/api/legal-profile').then((profile) => {
    if (!profile.published) return;
    for (const field of document.querySelectorAll('[data-legal-field]')) {
      field.textContent = profile[field.dataset.legalField] || '';
    }
    for (const link of document.querySelectorAll('[data-legal-link]')) {
      const value = profile[link.dataset.legalLink] || '';
      if (!value) {
        document.querySelectorAll('[data-optional-contact]').forEach((field) => field.remove());
        continue;
      }
      link.textContent = value;
      link.href = `${link.dataset.legalLink === 'privacy_email' ? 'mailto:' : 'tel:'}${value}`;
    }
  }).catch(() => {});
})();
