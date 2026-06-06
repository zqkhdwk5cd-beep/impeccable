'use strict';

const TOTAL = 29;
const state = {};

const CRITICAL = {
  'chk-activation-lock': 'قفل iCloud مفعل — الجهاز غير صالح للاستخدام',
  'chk-stolen':          'IMEI محجوب أو مسروق — لا تشتري',
  'chk-imei-apple':      'مشكلة في سجل Apple — تحقق قبل الشراء',
  'chk-water':           'تلف مياه — الجهاز قد يموت في أي وقت',
  'chk-faceid-genuine':  'Face ID / Touch ID معطل — مشكلة في الشاشة أو الحساس',
  'chk-screen-genuine':  'شاشة غير أصلية — جودة وألوان أقل',
  'chk-battery-genuine': 'بطارية غير أصلية — عمر أقصر وخطر انتفاخ',
};

// All check IDs for counting
const ALL_IDS = [
  'chk-imei-apple','chk-stolen','chk-serial-match',
  'chk-activation-lock','chk-mdm','chk-reset',
  'chk-screen-genuine','chk-battery-genuine','chk-camera-genuine','chk-faceid-genuine',
  'chk-battery-health','chk-battery-throttle','chk-ios-latest','chk-battery-cycles',
  'chk-display-dead','chk-true-tone','chk-touch','chk-speaker','chk-brightness',
  'chk-cam-back','chk-cam-front','chk-flash','chk-cam-lens',
  'chk-wifi','chk-cellular','chk-bluetooth','chk-gps',
  'chk-water','chk-body-bend','chk-buttons','chk-charging-port','chk-gap',
];

// Map sections to IDs for nav active state
const SECTION_IDS = {
  pre:     'chk-imei-apple',
  icloud:  'chk-activation-lock',
  parts:   'chk-screen-genuine',
  battery: 'chk-battery-health',
  screen:  'chk-display-dead',
  camera:  'chk-cam-back',
  network: 'chk-wifi',
  body:    'chk-water',
};

// ── Actions ───────────────────────────────────────────
function mark(id, status) {
  const card = document.getElementById(id);
  if (!card) return;
  card.classList.remove('ok','fail','skip','expanded');
  const bullet = card.querySelector('.check-bullet');

  if (state[id] === status) {
    delete state[id];
    bullet.textContent = '';
  } else {
    state[id] = status;
    card.classList.add(status);
    bullet.textContent = status === 'ok' ? '✓' : status === 'fail' ? '✗' : '–';
  }
  refresh();
}

function openImeiCheck() {
  const imei = document.getElementById('imeiInput').value.replace(/\s/g, '');
  if (imei.length >= 14) {
    window.open(`https://checkcoverage.apple.com/?sn=${imei}`, '_blank');
  } else {
    document.getElementById('imeiInput').focus();
    document.getElementById('imeiInput').style.borderColor = '#f85149';
    setTimeout(() => document.getElementById('imeiInput').style.borderColor = '', 1200);
  }
}

function scrollTo(section) {
  const el = document.getElementById(`section-${section}`);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  // update active nav
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active','nav-item--active'));
  const btn = document.querySelector(`.nav-item[data-section="${section}"]`);
  if (btn) btn.classList.add('active');
}

function resetAll() {
  if (!confirm('إعادة تعيين كل الإجابات؟')) return;
  for (const k of Object.keys(state)) delete state[k];
  document.querySelectorAll('.check-card').forEach(card => {
    card.classList.remove('ok','fail','skip','expanded');
    const b = card.querySelector('.check-bullet');
    if (b) b.textContent = '';
  });
  refresh();
}

// Click on check-head toggles tip
document.addEventListener('click', e => {
  const head = e.target.closest('.check-head');
  if (!head) return;
  // only toggle if not clicking an action button
  if (e.target.closest('.check-actions')) return;
  head.closest('.check-card').classList.toggle('expanded');
});

// ── Refresh UI ────────────────────────────────────────
function refresh() {
  const ok    = Object.values(state).filter(v => v === 'ok').length;
  const fail  = Object.values(state).filter(v => v === 'fail').length;
  const skip  = Object.values(state).filter(v => v === 'skip').length;
  const checked = ok + fail + skip;

  // Progress
  document.getElementById('progressText').textContent = `${checked} / ${TOTAL}`;

  // Score calc
  let score = 100;
  for (const [id, v] of Object.entries(state)) {
    if (v === 'fail') score -= CRITICAL[id] ? 20 : 8;
  }
  const unanswered = TOTAL - checked;
  score = Math.max(0, Math.min(100, score - Math.floor(unanswered * 0.4)));

  // Ring
  const ring = document.getElementById('ringFill');
  const circumference = 201;
  const offset = checked === 0 ? circumference : circumference - (score / 100) * circumference;
  ring.style.strokeDashoffset = String(offset);
  ring.className = `ring-fill${score < 50 ? ' danger' : score < 75 ? ' warn' : ''}`;

  // Score label
  const numEl = document.getElementById('scoreNum');
  const lblEl = document.getElementById('scoreLabel');
  if (checked === 0) {
    numEl.textContent = '—';
    lblEl.textContent = 'لم تبدأ';
  } else {
    numEl.textContent = String(score);
    if (score >= 90)      lblEl.textContent = 'ممتاز';
    else if (score >= 75) lblEl.textContent = 'جيد';
    else if (score >= 55) lblEl.textContent = 'تفاوض';
    else if (score >= 35) lblEl.textContent = 'احذر';
    else                  lblEl.textContent = 'ابعد';
  }

  // Verdict
  const banner = document.getElementById('verdictBanner');
  if (checked < 5) {
    banner.innerHTML = '';
  } else {
    const hasCritical = Object.entries(state).some(([id, v]) => v === 'fail' && CRITICAL[id]);
    let cls, icon, title, sub;
    if (hasCritical) {
      cls = 'bad'; icon = '🚨'; title = 'لا توصي بالشراء';
      sub = 'مشكلة حاسمة مكتشفة — راجع النقاط بالأحمر';
    } else if (fail >= 4) {
      cls = 'bad'; icon = '⛔'; title = 'مشاكل متعددة — ابعد';
      sub = `${fail} مشاكل مكتشفة`;
    } else if (fail >= 2) {
      cls = 'caution'; icon = '⚠️'; title = 'تفاوض على السعر';
      sub = `${fail} مشاكل — اطلب تخفيضاً`;
    } else if (fail === 1) {
      cls = 'caution'; icon = '🟡'; title = 'مقبول مع تحفظ';
      sub = 'مشكلة واحدة — ناقش مع البائع';
    } else {
      cls = 'good'; icon = '✅'; title = 'يبدو جيداً — اشتري';
      sub = 'لم تُكتشف مشاكل واضحة';
    }
    banner.innerHTML = `
      <div class="verdict-inner verdict-${cls}">
        <span class="verdict-icon">${icon}</span>
        <div><div class="verdict-title">${title}</div><div class="verdict-sub">${sub}</div></div>
      </div>`;
  }
}

// ── Intersection observer for nav highlight ───────────
const observer = new IntersectionObserver(entries => {
  for (const entry of entries) {
    if (entry.isIntersecting) {
      const secId = entry.target.id.replace('section-', '');
      document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active','nav-item--active'));
      const btn = document.querySelector(`.nav-item[data-section="${secId}"]`);
      if (btn) btn.classList.add('active');
    }
  }
}, { rootMargin: '-30% 0px -60% 0px' });

document.querySelectorAll('[id^="section-"]').forEach(el => observer.observe(el));

// Init
refresh();
