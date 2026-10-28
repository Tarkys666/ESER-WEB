const statusMessage = document.querySelector('#auth-status');
const loginButton = document.querySelector('#login-button');
const loginForm = document.querySelector('#login-form');
const sessionActions = document.querySelector('#session-actions');
const signOutButton = document.querySelector('#sign-out');
const catalogPanel = document.querySelector('#admin-catalog');
const config = window.DILEK_SUPABASE;
const recoveryForm = document.querySelector('#recovery-form');
let recoveryMode = new URLSearchParams(location.hash.slice(1)).get('type') === 'recovery';
const client = window.supabase.createClient(config.url, config.publishableKey, {
  auth: { detectSessionInUrl: true, persistSession: true, autoRefreshToken: true },
});
const usagePanel = document.querySelector('#admin-usage');
const usageMetrics = document.querySelector('#usage-metrics');
const usageStatus = document.querySelector('#usage-status');
const usageButton = document.querySelector('#refresh-usage');
let usageVersion = 0;
const formatBytes = (bytes) => bytes >= 1024 ** 3
  ? `${(bytes / 1024 ** 3).toLocaleString('tr-TR', { maximumFractionDigits: 2 })} GB`
  : `${(bytes / 1024 ** 2).toLocaleString('tr-TR', { maximumFractionDigits: 2 })} MB`;
async function refreshUsage() {
  const version = ++usageVersion;
  usageButton.disabled = true;
  usageMetrics.hidden = true;
  usageStatus.textContent = 'Güncel kullanım alınıyor…';
  try {
    const { data, error } = await client.rpc('admin_resource_usage');
    if (version !== usageVersion) return;
    if (error || !data || !['database_bytes', 'image_bytes', 'image_count'].every((key) => Number.isFinite(data[key]) && data[key] >= 0)) throw new Error('Invalid usage response');
    const percentage = data.database_bytes / (500 * 1024 ** 2) * 100;
    document.querySelector('#usage-database').textContent = `${formatBytes(data.database_bytes)} / 500 MB`;
    document.querySelector('#usage-database-progress').value = Math.min(100, percentage);
    document.querySelector('#usage-database-note').textContent = `%${percentage.toLocaleString('tr-TR', { maximumFractionDigits: 1 })} dolu${percentage >= 80 ? ' · Sınıra yaklaşılıyor' : ''}`;
    document.querySelector('#usage-database-progress').classList.toggle('near-limit', percentage >= 80);
    document.querySelector('#usage-images').textContent = formatBytes(data.image_bytes);
    document.querySelector('#usage-image-count').textContent = `${data.image_count.toLocaleString('tr-TR')} kayıtlı görsel`;
    usageStatus.textContent = `Son ölçüm: ${new Date(data.sampled_at).toLocaleString('tr-TR')} · Anlık proje ölçümü; aylık fatura özeti değildir.`;
    usageMetrics.hidden = false;
  } catch {
    if (version === usageVersion) usageStatus.textContent = 'Kullanım bilgisi alınamadı. Yenile düğmesiyle tekrar deneyin.';
  } finally {
    if (version === usageVersion) usageButton.disabled = false;
  }
}
usageButton.addEventListener('click', refreshUsage);
const catalogManager = window.createCatalogManager(client, refreshUsage);
const slideManager = window.createSlideManager(client);

let refreshVersion = 0;
const refreshAccess = async () => {
  const version = ++refreshVersion;
  catalogPanel.hidden = true;
  document.querySelector('#admin-categories').hidden = true;
  usagePanel.hidden = true;
  document.querySelector('#admin-slides').hidden = true;
  usageVersion++;
  usageMetrics.hidden = true;
  loginButton.disabled = true;
  const { data, error } = await client.auth.getUser();
  if (version !== refreshVersion) return;
  const user = data?.user;
  sessionActions.hidden = !user;
  loginForm.hidden = Boolean(user);
  document.querySelector('#account-email').textContent = user?.email ?? '';
  recoveryForm.hidden = !(user && recoveryMode);
  if (!user) {
    catalogManager.reset();
    slideManager.reset();
    document.body.classList.remove('is-admin');
    loginButton.disabled = false;
    statusMessage.textContent = 'E-posta adresiniz ve şifrenizle giriş yapabilirsiniz.';
    return;
  }
  if (error) throw new Error('Oturum doğrulanamadı. Yeniden giriş yapın.');
  if (recoveryMode) {
    statusMessage.textContent = 'Yeni şifrenizi en az 12 karakter olacak şekilde belirleyin.';
    return;
  }
  const { data: membership, error: membershipError } = await client.from('admin_users').select('user_id').eq('user_id', user.id).maybeSingle();
  if (version !== refreshVersion) return;
  if (membershipError) throw new Error('Yönetici yetkisi kontrol edilemedi.');
  if (!membership) {
    catalogManager.reset();
    slideManager.reset();
    document.body.classList.remove('is-admin');
    statusMessage.textContent = 'Bu hesabın yönetici yetkisi bulunmuyor.';
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
};

const showError = (error) => {
  statusMessage.textContent = error.message || 'Giriş işlemi tamamlanamadı. Yeniden deneyin.';
};
client.auth.onAuthStateChange((event) => {
  if (event === 'PASSWORD_RECOVERY') recoveryMode = true;
  if (event === 'SIGNED_OUT') recoveryMode = false;
  // Run outside the SDK callback to avoid locking subsequent Auth requests.
  setTimeout(() => refreshAccess().catch(showError), 0);
});
loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  loginButton.disabled = true;
  statusMessage.textContent = 'Giriş yapılıyor…';
  try {
    const { error } = await client.auth.signInWithPassword({
      email: document.querySelector('#login-email').value.trim(),
      password: document.querySelector('#login-password').value,
    });
    document.querySelector('#login-password').value = '';
    if (error) throw new Error('Giriş yapılamadı. E-posta ve şifrenizi kontrol edin.');
    await refreshAccess();
  } catch (error) { showError(error); }
  finally { loginButton.disabled = false; }
});
signOutButton.addEventListener('click', async () => {
  signOutButton.disabled = true;
  const { error } = await client.auth.signOut({ scope: 'local' });
  signOutButton.disabled = false;
  if (error) showError(new Error('Çıkış yapılamadı. Yeniden deneyin.'));
});
document.querySelector('#forgot-password').addEventListener('click', async (event) => {
  const email = document.querySelector('#login-email');
  if (!email.reportValidity()) return;
  const button = event.currentTarget;
  button.disabled = true;
  try {
    const { error } = await client.auth.resetPasswordForEmail(email.value.trim(), {
      redirectTo: new URL('admin.html', location.href).href,
    });
    if (error) throw new Error('Kurtarma e-postası gönderilemedi. Bir süre sonra tekrar deneyin.');
    statusMessage.textContent = 'Bu adrese kayıtlı bir hesap varsa şifre yenileme bağlantısı gönderildi.';
  } catch (error) { showError(error); }
  finally { button.disabled = false; }
});
recoveryForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const password = document.querySelector('#new-password');
  const confirmation = document.querySelector('#confirm-password');
  if (password.value !== confirmation.value) {
    statusMessage.textContent = 'Girilen şifreler eşleşmiyor.';
    return;
  }
  const button = document.querySelector('#update-password');
  button.disabled = true;
  try {
    const { error } = await client.auth.updateUser({ password: password.value });
    if (error) throw new Error('Şifre güncellenemedi. Farklı bir şifre veya yeni kurtarma bağlantısı deneyin.');
    recoveryForm.reset();
    recoveryMode = false;
    await refreshAccess();
    statusMessage.textContent = 'Şifreniz güncellendi.';
  } catch (error) { showError(error); }
  finally { button.disabled = false; }
});
refreshAccess().catch(showError);
