import json
import uuid
import os
from datetime import datetime, timezone
from flask import Flask, render_template, request, jsonify

from db import db, BankBonus, Requirement
from scraper import scrape

app = Flask(__name__)

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{os.path.join(BASE_DIR, "bank_bonus.db")}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

with app.app_context():
    db.create_all()


# ── Helpers ──────────────────────────────────────────────

def _save_bonus_from_dict(data):
    """Create or update a BankBonus + Requirements from a camelCase dict."""
    bonus_id = data.get('id', str(uuid.uuid4()))
    existing = db.session.get(BankBonus, bonus_id)

    if existing:
        bonus = existing
    else:
        bonus = BankBonus.from_dict(data)
        bonus.id = bonus_id
        db.session.add(bonus)

    bonus.bank_name = data.get('bankName', '')
    bonus.account_type = data.get('accountType', 'personal_checking')
    bonus.date_opened = data.get('dateOpened', '')
    bonus.bonus_amount = float(data.get('bonusAmount', 0))
    bonus.bonus_deadline = data.get('bonusDeadline', '')
    bonus.account_close_date = data.get('accountCloseDate', '')
    min_open = data.get('minimumOpenLength')
    bonus.min_open_length_value = min_open['value'] if min_open and min_open.get('value') else None
    bonus.min_open_length_unit = min_open['unit'] if min_open and min_open.get('value') else None
    bonus.early_termination_fee = data.get('earlyTerminationFee')
    bonus.min_balance_requirement = data.get('minimumBalanceRequirement')
    bonus.notes = data.get('notes', '')
    bonus.status = data.get('status', 'active')
    bonus.direct_deposit_dates = json.dumps(data.get('directDepositDates', []))

    # Sync requirements
    incoming_ids = set()
    for req_data in data.get('requirements', []):
        req_id = req_data.get('id', str(uuid.uuid4()))
        incoming_ids.add(req_id)
        req = db.session.get(Requirement, req_id)
        if not req:
            req = Requirement(id=req_id, bonus_id=bonus.id)
            db.session.add(req)
        req.type = req_data.get('type', 'direct_deposit_total')
        req.description = req_data.get('description', '')
        req.target_amount = float(req_data.get('targetAmount', 0))
        req.current_progress = float(req_data.get('currentProgress', 0))
        req.per_unit_minimum = req_data.get('perUnitMinimum')
        req.completed = bool(req_data.get('completed', False))

    # Remove orphaned requirements
    for req in list(bonus.requirements):
        if req.id not in incoming_ids:
            db.session.delete(req)

    db.session.commit()
    return bonus


# ── Pages ─────────────────────────────────────────────────

@app.route('/')
def index():
    bonuses = BankBonus.query.order_by(BankBonus.created_at.desc()).all()
    initial_data = [b.to_dict() for b in bonuses]
    return render_template('index.html', initial_data_json=json.dumps(initial_data))


@app.route('/scraper')
def scraper_page():
    return render_template('scraper.html')


# ── API: Bonuses ──────────────────────────────────────────

@app.route('/api/bonuses', methods=['GET'])
def api_get_bonuses():
    bonuses = BankBonus.query.order_by(BankBonus.created_at.desc()).all()
    return jsonify([b.to_dict() for b in bonuses])


@app.route('/api/bonuses', methods=['POST'])
def api_create_bonus():
    data = request.get_json(force=True)
    bonus = _save_bonus_from_dict(data)
    return jsonify(bonus.to_dict()), 201


@app.route('/api/bonuses/<bonus_id>', methods=['PUT'])
def api_update_bonus(bonus_id):
    data = request.get_json(force=True)
    data['id'] = bonus_id
    bonus = _save_bonus_from_dict(data)
    return jsonify(bonus.to_dict())


@app.route('/api/bonuses/<bonus_id>', methods=['DELETE'])
def api_delete_bonus(bonus_id):
    bonus = db.session.get(BankBonus, bonus_id)
    if not bonus:
        return jsonify({'error': 'Not found'}), 404
    db.session.delete(bonus)
    db.session.commit()
    return jsonify({'ok': True})


# ── API: Scrape ────────────────────────────────────────────

@app.route('/api/scrape', methods=['POST'])
def api_scrape():
    try:
        results = scrape()
        return jsonify({'ok': True, 'results': results})
    except Exception as e:
        return jsonify({'ok': False, 'error': str(e)}), 500


# ── API: Import ────────────────────────────────────────────

@app.route('/api/import', methods=['POST'])
def api_import():
    data = request.get_json(force=True)
    if not isinstance(data, list):
        return jsonify({'error': 'Expected an array of bonuses'}), 400

    count = 0
    for item in data:
        _save_bonus_from_dict(item)
        count += 1

    return jsonify({'ok': True, 'imported': count})


# ── Run ────────────────────────────────────────────────────

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5002, debug=True)
