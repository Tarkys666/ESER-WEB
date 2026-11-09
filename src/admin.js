const statusMessage = document.querySelector('#auth-status');
const loginButton = document.querySelector('#login-button');
const loginForm = document.querySelector('#login-form');
const sessionActions = document.querySelector('#session-actions');
const signOutButton = document.querySelector('#sign-out');
const catalogPanel = document.querySelector('#admin-catalog');
const usagePanel = document.querySelector('#admin-usage');
const usageMetrics = document.querySelector('#usage-metrics');
const usageStatus = document.querySelector('#usage-status');
const usageButton = document.querySelector('#refresh-usage');
const analyticsPanel = document.querySelector('#admin-analytics');
const analyticsStatus = document.querySelector('#analytics-status');
const analyticsList = document.querySelector('#analytics-products');
const analyticsRange = document.querySelector('#analytics-range');
const analyticsButton = document.querySelector('#refresh-analytics');
const legalProfilePanel = document.querySelector('#admin-legal-profile');
const legalProfileForm = document.querySelector('#legal-profile-form');
const legalProfileStatus = document.querySelector('#legal-profile-status');
const legalProfileButton = document.querySelector('#save-legal-profile');
const catalogManager = window.createCatalogManager(refreshUsage);
const slideManager = window.createSlideManager();
let refreshVersion = 0;

const showError = (error) => {
  statusMessage.textContent = error.message || 'İşlem tamamlanamadı. Yeniden deneyin.';
};

async function refreshUsage() {
  usageStatus.textContent = 'D1 ve R2 kullanımı alınıyor…';
  usageMetrics.hidden = true;
  try {
    const data = await window.DILEK_API.get('/api/admin/usage');
    document.querySelector('#usage-database').textContent = `${data.product_count} ürün · ${data.category_count} kategori`;
    document.querySelector('#usage-images').textContent = `${data.media_count} görsel · ${formatBytes(data.media_bytes)}`;
    document.querySelector('#usage-image-count').textContent = `${data.slide_count} vitrin görseli`;
    document.querySelector('#usage-database-note').textContent = 'Yerel D1 içerik sayacı';
    document.querySelector('#usage-database-progress').value = 0;
    usageStatus.textContent = `Yerel ölçüm · ${new Date(data.sampled_at).toLocaleString('tr-TR')}`;
    usageMetrics.hidden = false;
  } catch { usageStatus.textContent = 'Kullanım bilgisi alınamadı. Yenile düğmesiyle tekrar deneyin.'; }
}

async function refreshAnalytics() {
  analyticsStatus.textContent = 'Ürün görüntülenmeleri alınıyor…';
  analyticsList.replaceChildren();
  try {
    const data = await window.DILEK_API.get(`/api/admin/analytics/products?range=${encodeURIComponent(analyticsRange.value)}`);
    const items = data.items || [];
    if (!items.length) {
      analyticsStatus.textContent = 'Bu dönemde ürün görüntülenmesi yok.';
      return;
    }
    const format = new Intl.NumberFormat('tr-TR');
    for (const [index, item] of items.entries()) {
      const row = document.createElement('li');
      const rank = document.createElement('span');
      rank.className = 'analytics-rank';
      rank.textContent = String(index + 1).padStart(2, '0');
      const title = document.createElement('span');
      title.textContent = item.title;
      const views = document.createElement('strong');
      views.textContent = `${format.format(item.views)} görüntülenme`;
      row.append(rank, title, views);
      analyticsList.append(row);
    }
    analyticsStatus.textContent = 'Yayınlanan ürünlerin detay sayfası açılışları.';
  } catch {
    analyticsStatus.textContent = 'Analitik bilgisi alınamadı. Yenile düğmesiyle tekrar deneyin.';
  }
}

async function refreshLegalProfile() {
  legalProfileStatus.textContent = 'Kaydedilmiş bilgiler alınıyor…';
  try {
    const profile = await window.DILEK_API.get('/api/admin/legal-profile');
    for (const key of ['legal_name', 'business_address', 'privacy_email', 'privacy_phone', 'privacy_legal_basis', 'privacy_retention', 'privacy_transfer_details']) {
      legalProfileForm.elements.namedItem(key).value = profile[key] || '';
    }
    legalProfileForm.elements.namedItem('policy_published').checked = profile.policy_published === 1;
    legalProfileStatus.textContent = profile.updated_at
      ? `Son kayıt: ${new Date(`${profile.updated_at.replace(' ', 'T')}Z`).toLocaleString('tr-TR')}`
      : 'Henüz bilgi kaydedilmedi.';
  } catch {
    legalProfileStatus.textContent = 'Bilgiler alınamadı. Yenileyip tekrar deneyin.';
  }
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toLocaleString('tr-TR', { maximumFractionDigits: 1 })} KB`;
  return `${(bytes / 1024 ** 2).toLocaleString('tr-TR', { maximumFractionDigits: 1 })} MB`;
}

async function refreshAccess() {
  const version = ++refreshVersion;
  catalogPanel.hidden = true;
  document.querySelector('#admin-categories').hidden = true;
  usagePanel.hidden = true;
  analyticsPanel.hidden = true;
  legalProfilePanel.hidden = true;
  document.querySelector('#admin-slides').hidden = true;
  loginButton.disabled = true;
  let user;
  try { user = await window.DILEK_API.me(); }
  catch {
    if (version !== refreshVersion) return;
    window.DILEK_API.logout();
  }
  if (version !== refreshVersion) return;
  const authenticated = Boolean(user?.authenticated);
  sessionActions.hidden = !authenticated;
  loginForm.hidden = authenticated;
  document.querySelector('#account-email').textContent = user?.email || '';
  if (!authenticated) {
    catalogManager.reset();
    slideManager.reset();
    legalProfileForm.reset();
    document.body.classList.remove('is-admin');
    loginButton.disabled = false;
    statusMessage.textContent = 'E-posta adresiniz ve şifrenizle giriş yapabilirsiniz.';
    return;
  }
  statusMessage.textContent = 'Yönetici oturumunuz doğrulandı.';
  document.body.classList.add('is-admin');
  document.querySelector('#admin-title').textContent = 'Yönetim paneli';
  await catalogManager.load();
  if (version !== refreshVersion) return;
  catalogPanel.hidden = false;
  document.querySelector('#admin-categories').hidden = false;
  usagePanel.hidden = false;
  analyticsPanel.hidden = false;
  legalProfilePanel.hidden = false;
  document.querySelector('#admin-slides').hidden = false;
  slideManager.load();
  refreshUsage();
  refreshAnalytics();
  refreshLegalProfile();
}

usageButton.addEventListener('click', refreshUsage);
analyticsButton.addEventListener('click', refreshAnalytics);
analyticsRange.addEventListener('change', refreshAnalytics);
legalProfileForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  legalProfileButton.disabled = true;
  legalProfileStatus.textContent = 'Bilgiler kaydediliyor…';
  const data = Object.fromEntries(new FormData(legalProfileForm));
  data.policy_published = legalProfileForm.elements.namedItem('policy_published').checked;
  try {
    const saved = await window.DILEK_API.send('/api/admin/legal-profile', 'PUT', data);
    legalProfileStatus.textContent = `Kaydedildi · ${new Date(`${saved.updated_at.replace(' ', 'T')}Z`).toLocaleString('tr-TR')}`;
  } catch (error) {
    legalProfileStatus.textContent = error.message || 'Bilgiler kaydedilemedi.';
  } finally {
    legalProfileButton.disabled = false;
  }
});
loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  loginButton.disabled = true;
  statusMessage.textContent = 'Giriş yapılıyor…';
  try {
    await window.DILEK_API.login(
      document.querySelector('#login-email').value.trim(),
      document.querySelector('#login-password').value,
    );
    document.querySelector('#login-password').value = '';
    await refreshAccess();
  } catch (error) { showError(error); }
  finally { loginButton.disabled = false; }
});
signOutButton.addEventListener('click', async () => {
  signOutButton.disabled = true;
  window.DILEK_API.logout();
  signOutButton.disabled = false;
  await refreshAccess();
});
refreshAccess().catch(showError);
