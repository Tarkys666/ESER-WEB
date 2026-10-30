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
  document.querySelector('#admin-slides').hidden = false;
  slideManager.load();
  refreshUsage();
}

usageButton.addEventListener('click', refreshUsage);
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
