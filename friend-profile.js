(function() {
  document.addEventListener('DOMContentLoaded', init);

  function showToast(text, tone = 'muted') {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = text;
    el.style.color = tone === 'error' ? '#f7b2a5' : '#c9d5d1';
    el.style.position = 'fixed';
    el.style.bottom = '16px';
    el.style.left = '50%';
    el.style.transform = 'translateX(-50%)';
    el.style.background = 'rgba(0,0,0,0.55)';
    el.style.padding = '10px 14px';
    el.style.borderRadius = '10px';
  }

  async function init() {
    const params = new URLSearchParams(window.location.search);
    const nickname = params.get('nickname');
    if (!nickname) {
      showToast('No nickname provided', 'error');
      return;
    }
    initBackgroundParticles();
    document.getElementById('back-to-friends')?.addEventListener('click', () => {
      window.location.href = 'friends.html';
    });
    await loadProfile(nickname);
  }

  async function loadProfile(nickname) {
    try {
      const res = await fetchProfileByNickname(nickname);
      const { user, progress } = res;
      document.getElementById('player-name').textContent = user.nickname;
      const meta = user.createdAt ? `Member since ${new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}` : '';
      document.getElementById('player-meta').textContent = meta;
      renderStats(progress);
      renderProgress(progress);
      renderFish(progress);
      renderLegacies(progress);
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Failed to load profile', 'error');
    }
  }

  function renderStats(progress) {
    const container = document.getElementById('profile-stats');
    if (!container) return;
    container.innerHTML = `
      <div class="stat">
        <div class="stat-label">Fish Caught</div>
        <div class="stat-value">${progress.total_fish_caught || 0}</div>
      </div>
      <div class="stat">
        <div class="stat-label">Legacies</div>
        <div class="stat-value">${progress.total_legacies || 0}</div>
      </div>
      <div class="stat">
        <div class="stat-label">Unique Fish</div>
        <div class="stat-value">${progress.unique_fish_count || 0}</div>
      </div>
      <div class="stat">
        <div class="stat-label">Story Completed</div>
        <div class="stat-value">${progress.story_completed ? 'Yes' : 'No'}</div>
      </div>
    `;
  }

  function renderProgress(progress) {
    const body = document.getElementById('progress-body');
    if (!body) return;
    const fish = (progress.fish_collection || []).slice(0, 5).map(f => `${f.fish_name} (${f.times_caught}×)`).join(', ') || 'No fish yet';
    const legacies = (progress.legacies_unlocked || []).slice(0, 5).map(l => l.legacy_name).join(', ') || 'No legacies yet';
    body.innerHTML = `
      <div class="friend-stats">Fish Collection: ${fish}</div>
      <div class="friend-stats">Legacies: ${legacies}</div>
      <div class="friend-stats">Play Time: ${(progress.play_time_minutes || 0)} minutes</div>
    `;
  }

  function renderFish(progress) {
    const list = document.getElementById('fish-list');
    if (!list) return;
    const fish = progress.fish_collection || [];
    if (!fish.length) {
      list.innerHTML = '<div class="friend-stats">No fish yet.</div>';
      return;
    }
    list.innerHTML = fish.slice(0, 6).map(f => `
      <div class="friend-card" style="cursor:default;">
        <div class="friend-meta">
          <div class="friend-avatar">🐟</div>
          <div>
            <div class="friend-name">${f.fish_name}</div>
            <div class="friend-stats">Caught ${f.times_caught}× • First: ${formatShortDate(f.first_caught)}</div>
          </div>
        </div>
      </div>
    `).join('');
  }

  function renderLegacies(progress) {
    const list = document.getElementById('legacy-list');
    if (!list) return;
    const legacies = progress.legacies_unlocked || [];
    if (!legacies.length) {
      list.innerHTML = '<div class="friend-stats">No legacies yet.</div>';
      return;
    }
    list.innerHTML = legacies.slice(0, 6).map(l => `
      <div class="friend-card" style="cursor:default;">
        <div class="friend-meta">
          <div class="friend-avatar">✨</div>
          <div>
            <div class="friend-name">${l.legacy_name}</div>
            <div class="friend-stats">Unlocked ${formatShortDate(l.unlocked_at)}</div>
          </div>
        </div>
      </div>
    `).join('');
  }

  function formatShortDate(dateString) {
    if (!dateString) return '-';
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  // Background particles for ambience
  function initBackgroundParticles() {
    const canvas = document.getElementById('friends-bg');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w, h;
    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.4 + Math.random() * 1.6,
      s: 0.0008 + Math.random() * 0.0015,
      a: 0.08 + Math.random() * 0.14
    }));

    const resize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    function tick() {
      ctx.clearRect(0, 0, w, h);
      particles.forEach(p => {
        p.y += p.s * 16;
        p.x += (Math.sin(Date.now() * 0.0002 + p.y * 2) * 0.0005);
        if (p.y > 1) p.y = 0;
        if (p.x > 1) p.x = 0;
        if (p.x < 0) p.x = 1;
        ctx.globalAlpha = p.a;
        ctx.fillStyle = '#dcefe4';
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, p.r, 0, Math.PI * 2);
        ctx.fill();
      });
      requestAnimationFrame(tick);
    }
    tick();
  }
})();
