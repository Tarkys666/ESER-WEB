(() => {
  const footer = document.querySelector('.site-footer');
  if (!footer) return;

  const stores = [
    ['trendyol', 'Trendyol', 'https://www.trendyol.com/magaza/dilek-makina-m-1264532?sst=0&channelId=1'],
    ['idefix', 'idefix', 'https://www.idefix.com/satici/dilek-makina-26070'],
    ['hepsiburada', 'Hepsiburada', 'https://www.hepsiburada.com/magaza/dilek-makina'],
    ['pazarama', 'Pazarama', 'https://www.pazarama.com/magaza/dilek-makina'],
    ['n11', 'n11', 'https://www.n11.com/magaza/dilekmakina'],
  ];
  const navigation = document.createElement('nav');
  navigation.className = 'footer-marketplaces';
  navigation.setAttribute('aria-label', 'Pazaryeri mağazalarımız');
  const label = document.createElement('span');
  label.className = 'footer-marketplaces-label';
  label.textContent = 'Mağazalarımız';
  navigation.append(label);

  for (const [mark, name, url] of stores) {
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.title = `${name} mağazamız`;
    link.setAttribute('aria-label', `${name} mağazamız (yeni sekmede açılır)`);
    const logo = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    logo.classList.add('footer-store-mark', `footer-store-${mark}`);
    logo.setAttribute('aria-hidden', 'true');
    logo.setAttribute('focusable', 'false');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', `assets/platform-marks.svg#${mark}`);
    logo.append(use);
    link.append(logo);
    navigation.append(link);
  }
  footer.append(navigation);
})();
