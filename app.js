import { getAll, save, deleteById } from './db.js';

// === State ===
let bonuses = [];
let expandedCardId = null;
let editingBonusId = null;

// === DOM References ===
const activeCards = document.getElementById('active-cards');
const completedCards = document.getElementById('completed-cards');
const activeEmpty = document.getElementById('active-empty');
const completedSection = document.getElementById('completed-section');
const completedToggle = document.getElementById('completed-toggle');
const modalOverlay = document.getElementById('modal-overlay');
const modalTitle = document.getElementById('modal-title');
const bonusForm = document.getElementById('bonus-form');
const addNewBtn = document.getElementById('add-new-btn');
const modalCloseBtn = document.getElementById('modal-close');
const formCancel = document.getElementById('form-cancel');
const requirementsList = document.getElementById('requirements-list');
const addRequirementBtn = document.getElementById('add-requirement-btn');
const openLengthInput = document.getElementById('f-openLengthValue');
const etfRow = document.getElementById('etf-row');

// === Utility Functions ===
function generateId() {
  return crypto.randomUUID();
}

function daysUntil(dateStr) {
  const target = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
}

function deadlineClass(dateStr) {
  const days = daysUntil(dateStr);
  if (days < 7) return 'deadline-urgent';
  if (days <= 30) return 'deadline-warning';
  return '';
}

function formatCurrency(n) {
  return '$' + Number(n).toLocaleString('en-US');
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function requirementSummary(req) {
  switch (req.type) {
    case 'direct_deposit_total':
      return `${formatCurrency(req.currentProgress)}/${formatCurrency(req.targetAmount)} DD`;
    case 'direct_deposit_count':
      return `${req.currentProgress}/${req.targetAmount}` +
        (req.perUnitMinimum ? ` $${req.perUnitMinimum}+ deposits` : ' deposits');
    case 'debit_transactions':
      return `${req.currentProgress}/${req.targetAmount} debit txns`;
    case 'minimum_balance':
      return `${formatCurrency(req.currentProgress)}/${formatCurrency(req.targetAmount)} balance`;
    default:
      return req.description;
  }
}

// === Card Rendering (Collapsed) ===
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderCollapsedCard(bonus) {
  const dlClass = bonus.status === 'completed' ? 'completed-card' : deadlineClass(bonus.bonusDeadline);
  const completedReqs = bonus.requirements.filter(r => r.completed).length;
  const totalReqs = bonus.requirements.length;
  const reqsSummary = bonus.requirements.map(requirementSummary).join(' · ');
  const daysLeft = daysUntil(bonus.bonusDeadline);
  const deadlineText = bonus.status === 'completed'
    ? 'Completed'
    : daysLeft < 0
      ? `${Math.abs(daysLeft)} days overdue`
      : daysLeft === 0
        ? 'Due today'
        : `${daysLeft} days left`;

  const isExpanded = bonus.id === expandedCardId;

  return `
    <div class="card ${dlClass} ${isExpanded ? 'expanded' : ''}" data-id="${bonus.id}">
      <button class="btn-icon card-close-btn" data-action="close" aria-label="Close">&times;</button>
      <div class="card-collapsed" data-action="expand">
        <div class="card-header">
          <span class="card-bank-name">${escapeHtml(bonus.bankName)}</span>
          <span class="card-bonus-amount">${formatCurrency(bonus.bonusAmount)}</span>
        </div>
        <div class="card-deadline">${deadlineText} — ${formatDate(bonus.bonusDeadline)}</div>
        <div class="card-requirements-summary">${reqsSummary || 'No requirements'}</div>
        <div class="card-progress">${completedReqs}/${totalReqs} requirements met</div>
      </div>
      <div class="card-expanded-content" ${isExpanded ? '' : 'aria-hidden="true"'}>
        ${isExpanded ? renderExpandedContent(bonus) : ''}
      </div>
    </div>
  `;
}

function renderDepositDates(bonus) {
  const sorted = [...bonus.directDepositDates].sort();
  return `
    <div class="deposit-dates">
      <h4>Direct Deposit Dates</h4>
      ${sorted.length > 0 ? `
        <ul class="deposit-date-list">
          ${sorted.map((d, i) => `
            <li>
              <span>${formatDate(d)}</span>
              <button class="deposit-date-remove" data-action="remove-deposit-date"
                      data-bonus-id="${bonus.id}" data-index="${i}" aria-label="Remove date">&times;</button>
            </li>
          `).join('')}
        </ul>
      ` : '<p style="font-size:13px;color:var(--color-text-secondary);padding:4px 0">None logged yet</p>'}
      <button class="btn-secondary btn-log-deposit" data-action="log-deposit" data-id="${bonus.id}">
        + Log Deposit Date
      </button>
    </div>`;
}

function renderRequirementBlock(req, bonusId) {
  const completedClass = req.completed ? 'req-completed' : '';
  let progressHtml = '';

  switch (req.type) {
    case 'direct_deposit_total':
      progressHtml = `
        <div class="req-progress-text">${formatCurrency(req.currentProgress)} / ${formatCurrency(req.targetAmount)}</div>
        <div class="req-slider-row">
          <input type="range" class="req-slider" min="0" max="${req.targetAmount}" step="1"
                 value="${req.currentProgress}"
                 data-action="slider-change" data-bonus-id="${bonusId}" data-req-id="${req.id}"
                 aria-label="Deposit amount">
          <span class="req-slider-value" data-action="slider-tap"
                data-bonus-id="${bonusId}" data-req-id="${req.id}">
            ${formatCurrency(req.currentProgress)}
          </span>
        </div>`;
      break;

    case 'direct_deposit_count':
    case 'debit_transactions':
      progressHtml = `
        <div class="req-progress-text">${req.currentProgress} / ${req.targetAmount}${
          req.type === 'direct_deposit_count' && req.perUnitMinimum
            ? ` ($${req.perUnitMinimum}+ each)`
            : req.type === 'debit_transactions' ? ' transactions' : ' deposits'
        }</div>
        <div class="req-increment-row">
          <button class="btn-decrement" data-action="decrement"
                  data-bonus-id="${bonusId}" data-req-id="${req.id}" aria-label="Decrease">−</button>
          <span style="font-size:16px;font-weight:600;min-width:30px;text-align:center">${req.currentProgress}</span>
          <button class="btn-increment" data-action="increment"
                  data-bonus-id="${bonusId}" data-req-id="${req.id}" aria-label="Increase">+</button>
        </div>`;
      break;

    case 'minimum_balance':
      progressHtml = `
        <div class="req-progress-text">${formatCurrency(req.currentProgress)} / ${formatCurrency(req.targetAmount)}</div>
        <input type="number" class="req-balance-input" value="${req.currentProgress}" min="0" step="0.01"
               data-action="balance-change" data-bonus-id="${bonusId}" data-req-id="${req.id}"
               aria-label="Current balance" placeholder="Current balance">`;
      break;
  }

  return `
    <div class="requirement-block ${completedClass}">
      <div class="req-header">
        <span class="req-description">${escapeHtml(req.description)}</span>
        <input type="checkbox" class="req-checkbox" ${req.completed ? 'checked' : ''}
               data-action="toggle-req" data-bonus-id="${bonusId}" data-req-id="${req.id}"
               aria-label="Mark complete">
      </div>
      ${progressHtml}
    </div>`;
}

function renderExpandedContent(bonus) {
  const allCompleted = bonus.requirements.length > 0 && bonus.requirements.every(r => r.completed);

  let html = `<hr class="expanded-divider">
    <div class="expanded-details">
      <div class="detail-row">
        <span class="detail-label">Date Opened</span>
        <span class="detail-value">${formatDate(bonus.dateOpened)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Bonus Amount</span>
        <span class="detail-value">${formatCurrency(bonus.bonusAmount)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Deadline</span>
        <span class="detail-value">${formatDate(bonus.bonusDeadline)}</span>
      </div>`;

  if (bonus.accountCloseDate) {
    html += `
      <div class="detail-row">
        <span class="detail-label">Account Close Date</span>
        <span class="detail-value">${formatDate(bonus.accountCloseDate)}</span>
      </div>`;
  }

  if (bonus.minimumOpenLength && bonus.minimumOpenLength.value > 0) {
    html += `
      <div class="detail-row">
        <span class="detail-label">Min. Open Length</span>
        <span class="detail-value">${bonus.minimumOpenLength.value} ${escapeHtml(bonus.minimumOpenLength.unit)}</span>
      </div>`;
    if (bonus.earlyTerminationFee != null) {
      html += `
        <div class="detail-row">
          <span class="detail-label">Early Termination Fee</span>
          <span class="detail-value">${formatCurrency(bonus.earlyTerminationFee)}</span>
        </div>`;
    }
  }

  if (bonus.minimumBalanceRequirement != null) {
    html += `
      <div class="detail-row">
        <span class="detail-label">Min. Balance Req.</span>
        <span class="detail-value">${formatCurrency(bonus.minimumBalanceRequirement)}</span>
      </div>`;
  }

  html += '</div>';

  if (bonus.notes) {
    html += `<div class="notes-block">${escapeHtml(bonus.notes)}</div>`;
  }

  // Requirement blocks
  if (bonus.requirements.length > 0) {
    html += bonus.requirements.map(req => renderRequirementBlock(req, bonus.id)).join('');
  }

  // Deposit dates
  html += renderDepositDates(bonus);

  // Mark Complete / Reactivate
  if (bonus.status === 'active' && allCompleted) {
    html += `<button class="btn-mark-complete" data-action="mark-complete" data-id="${bonus.id}">
      ✓ Mark Complete
    </button>`;
  } else if (bonus.status === 'completed') {
    html += `<button class="btn-reactivate" data-action="reactivate" data-id="${bonus.id}">
      Move Back to Active
    </button>`;
  }

  // Edit / Delete
  html += `
    <div class="card-actions">
      <button class="btn-secondary" data-action="edit" data-id="${bonus.id}">Edit</button>
      <button class="btn-danger" data-action="delete" data-id="${bonus.id}">Delete</button>
    </div>`;

  return html;
}

// === Main Render ===
function render() {
  const active = bonuses.filter(b => b.status === 'active');
  const completed = bonuses.filter(b => b.status === 'completed');

  activeCards.innerHTML = active.map(renderCollapsedCard).join('');
  activeEmpty.hidden = active.length > 0;

  if (completed.length > 0) {
    completedSection.hidden = false;
    completedCards.innerHTML = completed.map(renderCollapsedCard).join('');
  } else {
    completedSection.hidden = true;
  }
}

// === Init ===
async function init() {
  bonuses = await getAll();
  render();
}

// === Event Handlers ===
document.getElementById('app').addEventListener('click', async (e) => {
  const target = e.target;
  const actionEl = target.closest('[data-action]');
  const action = actionEl?.dataset.action;

  if (!action) {
    // No data-action — check if clicking collapsed card area to expand
    const collapsed = target.closest('.card-collapsed');
    if (collapsed) {
      const card = collapsed.closest('.card');
      const id = card?.dataset.id;
      if (id && id !== expandedCardId) {
        expandedCardId = id;
        render();
      }
    }
    return;
  }

  const bonusId = actionEl.dataset.id || actionEl.dataset.bonusId;

  if (action === 'expand') {
    const card = actionEl.closest('.card');
    const id = card?.dataset.id;
    if (id && id !== expandedCardId) {
      expandedCardId = id;
      render();
    }
    return;
  }

  if (action === 'close') {
    expandedCardId = null;
    render();
    return;
  }

  if (action === 'mark-complete') {
    const bonus = bonuses.find(b => b.id === bonusId);
    if (bonus) {
      bonus.status = 'completed';
      await save(bonus);
      expandedCardId = null;
      render();
    }
    return;
  }

  if (action === 'reactivate') {
    const bonus = bonuses.find(b => b.id === bonusId);
    if (bonus) {
      bonus.status = 'active';
      await save(bonus);
      expandedCardId = null;
      render();
    }
    return;
  }

  if (action === 'delete') {
    if (confirm('Delete this bonus? This cannot be undone.')) {
      await deleteById(bonusId);
      bonuses = bonuses.filter(b => b.id !== bonusId);
      if (expandedCardId === bonusId) expandedCardId = null;
      render();
    }
    return;
  }

  if (action === 'edit') {
    openEditForm(bonusId);
    return;
  }

  if (action === 'increment') {
    const reqId = actionEl.dataset.reqId;
    const bId = actionEl.dataset.bonusId;
    const bonus = bonuses.find(b => b.id === bId);
    const req = bonus?.requirements.find(r => r.id === reqId);
    if (req && req.currentProgress < req.targetAmount) {
      req.currentProgress++;
      await save(bonus);
      render();
    }
    return;
  }

  if (action === 'decrement') {
    const reqId = actionEl.dataset.reqId;
    const bId = actionEl.dataset.bonusId;
    const bonus = bonuses.find(b => b.id === bId);
    const req = bonus?.requirements.find(r => r.id === reqId);
    if (req && req.currentProgress > 0) {
      req.currentProgress--;
      await save(bonus);
      render();
    }
    return;
  }

  if (action === 'slider-tap') {
    const reqId = actionEl.dataset.reqId;
    const bId = actionEl.dataset.bonusId;
    const bonus = bonuses.find(b => b.id === bId);
    const req = bonus?.requirements.find(r => r.id === reqId);
    if (req) {
      const val = prompt(`Enter amount (0–${req.targetAmount}):`, req.currentProgress);
      if (val !== null) {
        const num = Math.max(0, Math.min(req.targetAmount, parseFloat(val) || 0));
        req.currentProgress = num;
        await save(bonus);
        render();
      }
    }
    return;
  }

  if (action === 'toggle-req') {
    const reqId = actionEl.dataset.reqId;
    const bId = actionEl.dataset.bonusId;
    const bonus = bonuses.find(b => b.id === bId);
    const req = bonus?.requirements.find(r => r.id === reqId);
    if (req) {
      req.completed = actionEl.checked;
      await save(bonus);
      render();
    }
    return;
  }

  if (action === 'log-deposit') {
    const bonus = bonuses.find(b => b.id === bonusId);
    if (bonus) {
      const today = new Date().toISOString().split('T')[0];
      const date = prompt('Deposit date (YYYY-MM-DD):', today);
      if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        bonus.directDepositDates.push(date);
        await save(bonus);
        render();
      } else if (date) {
        alert('Please enter a date in YYYY-MM-DD format.');
      }
    }
    return;
  }

  if (action === 'remove-deposit-date') {
    const bId = actionEl.dataset.bonusId;
    const index = Number(actionEl.dataset.index);
    const bonus = bonuses.find(b => b.id === bId);
    if (bonus) {
      const sorted = [...bonus.directDepositDates].sort();
      const dateToRemove = sorted[index];
      const origIndex = bonus.directDepositDates.indexOf(dateToRemove);
      if (origIndex > -1) {
        bonus.directDepositDates.splice(origIndex, 1);
        await save(bonus);
        render();
      }
    }
    return;
  }
});

document.getElementById('app').addEventListener('input', (e) => {
  const target = e.target;
  if (target.dataset.action !== 'slider-change') return;

  const bId = target.dataset.bonusId;
  const reqId = target.dataset.reqId;
  const bonus = bonuses.find(b => b.id === bId);
  const req = bonus?.requirements.find(r => r.id === reqId);
  if (!req) return;

  req.currentProgress = Number(target.value);

  // Update display inline without re-rendering entire card
  const block = target.closest('.requirement-block');
  if (block) {
    const progressText = block.querySelector('.req-progress-text');
    if (progressText) progressText.textContent = `${formatCurrency(req.currentProgress)} / ${formatCurrency(req.targetAmount)}`;
    const valueSpan = block.querySelector('.req-slider-value');
    if (valueSpan) valueSpan.textContent = formatCurrency(req.currentProgress);
  }
});

document.getElementById('app').addEventListener('change', async (e) => {
  const target = e.target;

  if (target.dataset.action === 'slider-change') {
    const bId = target.dataset.bonusId;
    const bonus = bonuses.find(b => b.id === bId);
    if (bonus) await save(bonus);
    return;
  }

  if (target.dataset.action === 'balance-change') {
    const bId = target.dataset.bonusId;
    const reqId = target.dataset.reqId;
    const bonus = bonuses.find(b => b.id === bId);
    const req = bonus?.requirements.find(r => r.id === reqId);
    if (req) {
      req.currentProgress = Math.max(0, parseFloat(target.value) || 0);
      const block = target.closest('.requirement-block');
      if (block) {
        const progressText = block.querySelector('.req-progress-text');
        if (progressText) progressText.textContent = `${formatCurrency(req.currentProgress)} / ${formatCurrency(req.targetAmount)}`;
      }
      await save(bonus);
    }
    return;
  }
});

completedToggle.addEventListener('click', () => {
  const arrow = completedToggle.querySelector('.toggle-arrow');
  const cards = document.getElementById('completed-cards');
  const isCollapsed = arrow.classList.contains('collapsed');
  arrow.classList.toggle('collapsed');
  cards.hidden = !isCollapsed ? true : false;
  completedToggle.setAttribute('aria-expanded', isCollapsed ? 'true' : 'false');
});

// Placeholder — will be replaced in Task 7
function openEditForm(bonusId) {
  console.warn('openEditForm not yet implemented', bonusId);
}

init();
