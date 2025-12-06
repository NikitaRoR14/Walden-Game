// Friends page script

(function() {
    document.addEventListener('DOMContentLoaded', () => {
        const searchInput = document.getElementById('search-input');
        const memberSince = document.getElementById('member-since');
        // Only run on friends page where these elements exist
        if (!searchInput || !memberSince) return;
        initFriendsPage();
    });

    function getAvatarGlyph(avatar, nickname) {
        if (typeof avatarEmojis !== 'undefined' && avatarEmojis && avatarEmojis[avatar]) {
            return avatarEmojis[avatar];
        }
        return (nickname || '?').charAt(0).toUpperCase();
    }

    // Minimal click sound using Web Audio (no external assets needed)
    const audioCtx = typeof AudioContext !== 'undefined' ? new AudioContext() : (typeof webkitAudioContext !== 'undefined' ? new webkitAudioContext() : null);
    function playClickSound() {
        if (!audioCtx) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 520;
        gain.gain.value = 0.08;
        osc.connect(gain).connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.12);
    }

    async function initFriendsPage() {
        if (!isAuthenticated()) {
            window.location.href = 'auth.html';
            return;
        }

        initBackgroundParticles();

        document.getElementById('back-to-menu')?.addEventListener('click', () => {
            playClickSound();
            window.location.href = 'index.html';
        });

        // Set member since
        const user = getCurrentUser();
        if (user && (user.createdAt || user.created_at)) {
            const date = new Date(user.createdAt || user.created_at);
            document.getElementById('member-since').textContent = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        }

        bindSearch();
        await loadSocial();
    }

    function renderList(containerId, items, emptyText, allowBadges = false) {
        const el = document.getElementById(containerId);
        if (!el) return;
        if (!items || !items.length) {
            el.innerHTML = `<div class="friend-stats">${emptyText}</div>`;
            return;
        }
        el.innerHTML = items.map(buildFriendCard(allowBadges)).join('');
        wireCardOpen(el, items);
    }

    function buildFriendCard(showBadge) {
        return (user) => {
            const avatar = getAvatarGlyph(user.avatar, user.nickname);
            const stats = `${user.totalFishCaught || 0} fish • ${user.totalLegacies || 0} legacies`;
            const badge = showBadge && user.isFriend ? '<span class="friend-pill">Friend</span>' : '';
            return `
                <div class="friend-card" data-nick="${user.nickname}" data-avatar="${user.avatar || ''}" data-fish="${user.totalFishCaught || 0}" data-legacies="${user.totalLegacies || 0}" data-story="${user.storyCompleted ? 'Yes' : 'No'}" data-created="${user.created_at || user.createdAt || ''}">
                    <div class="friend-meta">
                        <div class="friend-avatar">${avatar}</div>
                        <div>
                            <div class="friend-name">${user.nickname}</div>
                            <div class="friend-stats">${stats}</div>
                        </div>
                    </div>
                    ${badge || ''}
                </div>
            `;
        };
    }

    function wireCardOpen(container, items) {
        const userMap = new Map();
        items.forEach(u => userMap.set(u.nickname, u));
        container.querySelectorAll('.friend-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.classList.contains('friend-action')) return; // let buttons handle themselves
                const nick = card.dataset.nick;
                const user = userMap.get(nick);
                if (user) showModal(user);
            });
        });
    }

    async function loadSocial() {
        const status = document.getElementById('search-status');
        try {
            status.textContent = 'Loading...';
            const res = await fetchFriendsAndSubscriptions();
            document.getElementById('friends-count').textContent = res.friends?.length || 0;
            document.getElementById('subscriptions-count').textContent = res.subscriptions?.length || 0;
            renderList('friends-list', (res.friends || []).map(f => ({ ...f, isFriend: true })), 'No friends yet. Mutual subscriptions will appear here.', true);
            renderList('subs-list', res.subscriptions || [], 'Not following anyone yet.');
            status.textContent = '';
        } catch (err) {
            console.error(err);
            status.textContent = err.message || 'Failed to load friends';
            status.style.color = '#f7b2a5';
        }
    }

    function bindSearch() {
        const input = document.getElementById('search-input');
        const btn = document.getElementById('search-btn');
        const status = document.getElementById('search-status');
        const results = document.getElementById('search-results');

        const setStatus = (text, tone = 'muted') => {
            status.textContent = text || '';
            status.style.color = tone === 'error' ? '#f7b2a5' : '#c9d5d1';
        };

        const renderResults = (list) => {
            if (!list || !list.length) {
                results.innerHTML = '<div class="friend-stats">No players found. Try a different nickname.</div>';
                return;
            }
            results.innerHTML = '';
            list.forEach(user => {
                const card = document.createElement('div');
                card.className = 'friend-card';
                const avatar = getAvatarGlyph(user.avatar, user.nickname);
                const stats = `${user.totalFishCaught || 0} fish • ${user.totalLegacies || 0} legacies`;
                const mutual = !!user.subscribesToMe && !!user.isSubscribed;
                const buttonState = mutual ? 'Friends' : (user.isSubscribed ? 'Subscribed' : 'Subscribe');
                const disabled = buttonState !== 'Subscribe';

                card.innerHTML = `
                    <div class="friend-meta">
                        <div class="friend-avatar">${avatar}</div>
                        <div>
                            <div class="friend-name">${user.nickname}</div>
                            <div class="friend-stats">${stats}</div>
                            ${mutual ? '<span class="friend-pill">Friend</span>' : (user.subscribesToMe ? '<span class="friend-pill">Follows you</span>' : '')}
                        </div>
                    </div>
                `;

                const action = document.createElement('button');
                action.className = 'friend-action';
                action.textContent = buttonState;
                action.disabled = disabled;
                action.addEventListener('click', async () => {
                    playClickSound();
                    try {
                        action.disabled = true;
                        action.textContent = '...';
                        await subscribeToUser(user.nickname);
                        setStatus('Subscribed');
                        await loadSocial();
                        await doSearch();
                    } catch (err) {
                        console.error(err);
                        setStatus(err.message || 'Subscribe failed', 'error');
                        action.disabled = false;
                        action.textContent = buttonState;
                    }
                });

                card.appendChild(action);
                card.addEventListener('click', (e) => {
                    if (e.target === action) return;
                    showModal(user);
                });
                results.appendChild(card);
            });
        };

        const doSearch = async () => {
            const term = (input?.value || '').trim();
            if (term.length < 2) {
                setStatus('Type at least 2 characters to search');
                results.innerHTML = '';
                return;
            }
            setStatus('Searching...');
            try {
                playClickSound();
                const res = await searchUsersByNickname(term);
                renderResults(res.results || []);
                setStatus('');
            } catch (err) {
                console.error(err);
                setStatus(err.message || 'Search failed', 'error');
            }
        };

        btn?.addEventListener('click', doSearch);
        input?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') doSearch();
        });
    }

    // Simple floating particle background for ambience
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

    function showModal(user) {
        const modal = document.getElementById('player-modal');
        if (!modal) return;
        playClickSound();
        const avatarEl = document.getElementById('modal-avatar');
        const nameEl = document.getElementById('modal-name');
        const metaEl = document.getElementById('modal-meta');
        const statsEl = document.getElementById('modal-stats');
        const fullBtn = document.getElementById('modal-full-profile');

        avatarEl.textContent = getAvatarGlyph(user.avatar, user.nickname);
        nameEl.textContent = user.nickname;
        const created = user.created_at || user.createdAt;
        metaEl.textContent = created ? `Member since ${new Date(created).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}` : '';

        statsEl.innerHTML = `
            <div class="stat">
                <div class="stat-label">Fish Caught</div>
                <div class="stat-value">${user.totalFishCaught || 0}</div>
            </div>
            <div class="stat">
                <div class="stat-label">Legacies</div>
                <div class="stat-value">${user.totalLegacies || 0}</div>
            </div>
            <div class="stat">
                <div class="stat-label">Story Completed</div>
                <div class="stat-value">${user.storyCompleted ? 'Yes' : 'No'}</div>
            </div>
        `;

        modal.classList.remove('hidden');

        const close = document.getElementById('modal-close');
        const backdrop = modal.querySelector('.modal__backdrop');
        const closeModal = () => {
            modal.classList.add('hidden');
        };
        close?.addEventListener('click', closeModal, { once: true });
        backdrop?.addEventListener('click', closeModal, { once: true });

        if (fullBtn) {
            fullBtn.onclick = () => {
                playClickSound();
                window.location.href = `friend-profile.html?nickname=${encodeURIComponent(user.nickname)}`;
            };
        }
    }
})();
