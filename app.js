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

function normalizeRequirement(req = {}) {
  return {
    ...req,
    id: req.id || generateId(),
    type: req.type || 'direct_deposit_total',
    description: req.description || '',
    targetAmount: Number(req.targetAmount) || 0,
    currentProgress: Number(req.currentProgress) || 0,
    perUnitMinimum: req.perUnitMinimum != null ? Number(req.perUnitMinimum) : null,
    completed: Boolean(req.completed)
  };
}

function normalizeBonus(bonus = {}) {
  const minimumOpenLength = bonus.minimumOpenLength && Number(bonus.minimumOpenLength.value) > 0
    ? {
        value: Number(bonus.minimumOpenLength.value),
        unit: bonus.minimumOpenLength.unit === 'weeks' ? 'weeks' : 'months'
      }
    : null;

  return {
    ...bonus,
    id: bonus.id || generateId(),
    bankName: bonus.bankName || '',
    accountType: bonus.accountType || 'personal_checking',
    dateOpened: bonus.dateOpened || '',
    bonusAmount: Number(bonus.bonusAmount) || 0,
    bonusDeadline: bonus.bonusDeadline || '',
    accountCloseDate: bonus.accountCloseDate || '',
    minimumOpenLength,
    earlyTerminationFee: bonus.earlyTerminationFee != null ? Number(bonus.earlyTerminationFee) : null,
    minimumBalanceRequirement: bonus.minimumBalanceRequirement != null ? Number(bonus.minimumBalanceRequirement) : null,
    notes: bonus.notes || '',
    requirements: Array.isArray(bonus.requirements) ? bonus.requirements.map(normalizeRequirement) : [],
    directDepositDates: Array.isArray(bonus.directDepositDates)
      ? bonus.directDepositDates.filter(d => typeof d === 'string' && d)
      : [],
    status: bonus.status === 'completed' ? 'completed' : 'active',
    createdAt: bonus.createdAt || new Date().toISOString()
  };
}

async function reloadBonuses() {
  bonuses = (await getAll()).map(normalizeBonus);
  expandedCardId = null;
  render();
}

async function persistBonus(bonus) {
  try {
    await save(bonus);
    return true;
  } catch (err) {
    console.error('[DB] Failed to save bonus:', err);
    alert('Could not save that change. The app will reload your stored data.');
    try {
      await reloadBonuses();
    } catch (reloadErr) {
      console.error('[DB] Failed to reload bonuses:', reloadErr);
    }
    return false;
  }
}

async function removeBonus(id) {
  try {
    await deleteById(id);
    return true;
  } catch (err) {
    console.error('[DB] Failed to delete bonus:', err);
    alert('Could not delete that bonus. Your stored data was not changed.');
    return false;
  }
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
      return escapeHtml(req.description);
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

  const accountTypeLabel = {
    personal_checking: 'Personal Checking',
    personal_savings: 'Personal Savings',
    business_checking: 'Business Checking'
  }[bonus.accountType] || 'Personal Checking';

  let html = `
    <div class="card-close-btn">
      <button class="btn-icon" data-action="close" aria-label="Close">&times;</button>
    </div>
    <hr class="expanded-divider">
    <div class="expanded-details">
      <div class="detail-row">
        <span class="detail-label">Account Type</span>
        <span class="detail-value">${accountTypeLabel}</span>
      </div>
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
  try {
    bonuses = (await getAll()).map(normalizeBonus);
  } catch (err) {
    console.error('[DB] Failed to load bonuses:', err);
    document.getElementById('active-cards').innerHTML =
      '<p style="padding:20px;color:#ff3b30;text-align:center">Could not load data. Please check that your browser supports IndexedDB and is not in private mode.</p>';
    return;
  }
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
      if (!(await persistBonus(bonus))) return;
      expandedCardId = null;
      render();
    }
    return;
  }

  if (action === 'reactivate') {
    const bonus = bonuses.find(b => b.id === bonusId);
    if (bonus) {
      bonus.status = 'active';
      if (!(await persistBonus(bonus))) return;
      expandedCardId = null;
      render();
    }
    return;
  }

  if (action === 'delete') {
    if (confirm('Delete this bonus? This cannot be undone.')) {
      if (!(await removeBonus(bonusId))) return;
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
      if (!(await persistBonus(bonus))) return;
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
      if (!(await persistBonus(bonus))) return;
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
        if (!(await persistBonus(bonus))) return;
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
      if (!(await persistBonus(bonus))) return;
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
        if (!(await persistBonus(bonus))) return;
        render();
      } else if (date) {
        alert('Please enter a date in YYYY-MM-DD format.');
      }
    }
    return;
  }

  if (action === 'remove-deposit-date') {
    const bId = actionEl.dataset.bonusId;
    const sortedIndex = Number(actionEl.dataset.index);
    const bonus = bonuses.find(b => b.id === bId);
    if (bonus) {
      // Build sorted list, find the target date value
      const sorted = [...bonus.directDepositDates].sort();
      const targetDate = sorted[sortedIndex];
      // Count how many times this date appears before sortedIndex in the sorted array
      const precedingCount = sorted.slice(0, sortedIndex).filter(d => d === targetDate).length;
      // Remove the (precedingCount+1)th occurrence of targetDate from the original array
      let occurrences = 0;
      for (let i = 0; i < bonus.directDepositDates.length; i++) {
        if (bonus.directDepositDates[i] === targetDate) {
          if (occurrences === precedingCount) {
            bonus.directDepositDates.splice(i, 1);
            break;
          }
          occurrences++;
        }
      }
      if (!(await persistBonus(bonus))) return;
      render();
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
    if (bonus) await persistBonus(bonus);
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
      await persistBonus(bonus);
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

// === Modal ===
function openModal() {
  modalOverlay.hidden = false;
  // Force reflow for CSS transition
  modalOverlay.offsetHeight;
  modalOverlay.classList.add('visible');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  modalOverlay.classList.remove('visible');
  document.body.style.overflow = '';
  setTimeout(() => {
    modalOverlay.hidden = true;
    bonusForm.reset();
    requirementsList.innerHTML = '';
    editingBonusId = null;
    etfRow.hidden = true;
  }, 300);
}

modalCloseBtn.addEventListener('click', closeModal);
formCancel.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal();
});

// Hide/show ETF field based on open length
openLengthInput.addEventListener('input', () => {
  const val = Number(openLengthInput.value) || 0;
  etfRow.hidden = val <= 0;
});

// === Add New button ===
addNewBtn.addEventListener('click', () => {
  editingBonusId = null;
  modalTitle.textContent = 'Add New Bonus';
  bonusForm.reset();
  requirementsList.innerHTML = '';
  etfRow.hidden = true;
  openModal();
});

// === Requirement Rows ===
function addRequirementRow(existing = null) {
  const row = document.createElement('div');
  row.className = 'requirement-form-row';
  const reqId = existing?.id || generateId();

  row.innerHTML = `
    <button type="button" class="btn-remove-req" aria-label="Remove requirement">&times;</button>
    <input type="hidden" name="req-id" value="${reqId}">
    <label>
      Type
      <select name="req-type">
        <option value="direct_deposit_total" ${existing?.type === 'direct_deposit_total' ? 'selected' : ''}>Direct Deposit (Total $)</option>
        <option value="direct_deposit_count" ${existing?.type === 'direct_deposit_count' ? 'selected' : ''}>Direct Deposit (Count)</option>
        <option value="debit_transactions" ${existing?.type === 'debit_transactions' ? 'selected' : ''}>Debit Transactions</option>
        <option value="minimum_balance" ${existing?.type === 'minimum_balance' ? 'selected' : ''}>Minimum Balance</option>
      </select>
    </label>
    <label>
      Description
      <input type="text" name="req-description" required placeholder="e.g. $4,000 in direct deposits"
             value="${existing ? escapeHtml(existing.description) : ''}">
    </label>
    <label>
      Target Amount
      <input type="number" name="req-target" min="0" step="1" required placeholder="e.g. 4000"
             value="${existing?.targetAmount ?? ''}">
    </label>
    <label>
      Min. Per Unit ($) <small style="font-weight:400">(optional, for count types)</small>
      <input type="number" name="req-perUnit" min="0" step="1" placeholder="Leave blank if N/A"
             value="${existing?.perUnitMinimum ?? ''}">
    </label>
  `;

  row.querySelector('.btn-remove-req').addEventListener('click', () => row.remove());
  requirementsList.appendChild(row);
}

addRequirementBtn.addEventListener('click', () => addRequirementRow());

// === Open Edit Form ===
function openEditForm(bonusId) {
  const bonus = bonuses.find(b => b.id === bonusId);
  if (!bonus) return;

  editingBonusId = bonusId;
  modalTitle.textContent = 'Edit Bonus';

  document.getElementById('f-bankName').value = bonus.bankName;
  document.getElementById('f-accountType').value = bonus.accountType || 'personal_checking';
  document.getElementById('f-dateOpened').value = bonus.dateOpened;
  document.getElementById('f-bonusAmount').value = bonus.bonusAmount;
  document.getElementById('f-bonusDeadline').value = bonus.bonusDeadline;
  document.getElementById('f-accountCloseDate').value = bonus.accountCloseDate || '';
  document.getElementById('f-notes').value = bonus.notes || '';

  if (bonus.minimumOpenLength && bonus.minimumOpenLength.value > 0) {
    openLengthInput.value = bonus.minimumOpenLength.value;
    document.getElementById('f-openLengthUnit').value = bonus.minimumOpenLength.unit;
    etfRow.hidden = false;
    document.getElementById('f-earlyTermFee').value = bonus.earlyTerminationFee ?? '';
  } else {
    openLengthInput.value = '';
    etfRow.hidden = true;
  }

  const minBal = document.getElementById('f-minBalance');
  minBal.value = bonus.minimumBalanceRequirement != null ? bonus.minimumBalanceRequirement : '';

  requirementsList.innerHTML = '';
  bonus.requirements.forEach(req => addRequirementRow(req));

  openModal();
}

// === Form Submission ===
bonusForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const openLenVal = Number(openLengthInput.value) || 0;
  const openLenUnit = document.getElementById('f-openLengthUnit').value;
  const minBalStr = document.getElementById('f-minBalance').value;

  // Gather requirements
  const reqRows = requirementsList.querySelectorAll('.requirement-form-row');
  const existingBonus = editingBonusId ? bonuses.find(b => b.id === editingBonusId) : null;

  const requirements = Array.from(reqRows).map(row => {
    const reqId = row.querySelector('[name="req-id"]').value;
    const type = row.querySelector('[name="req-type"]').value;
    const description = row.querySelector('[name="req-description"]').value.trim();
    const targetAmount = Number(row.querySelector('[name="req-target"]').value);
    const perUnitVal = row.querySelector('[name="req-perUnit"]').value;

    // Preserve progress and completed state when editing
    const existingReq = existingBonus?.requirements.find(r => r.id === reqId);

    return {
      id: reqId,
      type,
      description,
      targetAmount,
      currentProgress: existingReq?.currentProgress ?? 0,
      perUnitMinimum: perUnitVal !== '' ? Number(perUnitVal) : null,
      completed: existingReq?.completed ?? false
    };
  });

  const bonus = {
    id: editingBonusId || generateId(),
    bankName: document.getElementById('f-bankName').value.trim(),
    accountType: document.getElementById('f-accountType').value,
    dateOpened: document.getElementById('f-dateOpened').value,
    bonusAmount: Number(document.getElementById('f-bonusAmount').value),
    bonusDeadline: document.getElementById('f-bonusDeadline').value,
    accountCloseDate: document.getElementById('f-accountCloseDate').value || '',
    minimumOpenLength: openLenVal > 0 ? { value: openLenVal, unit: openLenUnit } : null,
    earlyTerminationFee: openLenVal > 0
      ? (document.getElementById('f-earlyTermFee').value !== ''
          ? Number(document.getElementById('f-earlyTermFee').value)
          : null)
      : null,
    minimumBalanceRequirement: minBalStr !== '' ? Number(minBalStr) : null,
    notes: document.getElementById('f-notes').value.trim(),
    requirements,
    directDepositDates: existingBonus?.directDepositDates ?? [],
    status: existingBonus?.status ?? 'active',
    createdAt: existingBonus?.createdAt ?? new Date().toISOString()
  };

  if (!(await persistBonus(bonus))) return;

  // Update local state
  const idx = bonuses.findIndex(b => b.id === bonus.id);
  if (idx >= 0) {
    bonuses[idx] = bonus;
  } else {
    bonuses.push(bonus);
  }

  closeModal();
  expandedCardId = null;
  render();
});

init();

// === Service Worker ===
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js')
      .then(reg => console.log('[SW] Registered:', reg.scope))
      .catch(err => console.error('[SW] Registration failed:', err));
  });
}
