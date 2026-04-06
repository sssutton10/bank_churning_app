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

// Placeholder — will be implemented in Task 5
function renderExpandedContent(bonus) {
  return '<p style="padding:12px;color:#8e8e93">Loading…</p>';
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

init();
