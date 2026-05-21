import json
import uuid
from datetime import datetime, timezone
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


class BankBonus(db.Model):
    __tablename__ = 'bonuses'

    id = db.Column(db.String(36), primary_key=True)
    bank_name = db.Column(db.String(255), nullable=False)
    account_type = db.Column(db.String(50), default='personal_checking')
    date_opened = db.Column(db.String(10), nullable=False)
    bonus_amount = db.Column(db.Float, nullable=False)
    bonus_deadline = db.Column(db.String(10), nullable=False)
    account_close_date = db.Column(db.String(10), default='')
    min_open_length_value = db.Column(db.Integer, nullable=True)
    min_open_length_unit = db.Column(db.String(10), nullable=True)
    early_termination_fee = db.Column(db.Float, nullable=True)
    min_balance_requirement = db.Column(db.Float, nullable=True)
    notes = db.Column(db.Text, default='')
    status = db.Column(db.String(20), default='active')
    created_at = db.Column(db.String(30), default=lambda: datetime.now(timezone.utc).isoformat())
    direct_deposit_dates = db.Column(db.Text, default='[]')

    requirements = db.relationship('Requirement', backref='bonus', lazy='joined', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'bankName': self.bank_name,
            'accountType': self.account_type,
            'dateOpened': self.date_opened,
            'bonusAmount': self.bonus_amount,
            'bonusDeadline': self.bonus_deadline,
            'accountCloseDate': self.account_close_date or '',
            'minimumOpenLength': (
                {'value': self.min_open_length_value, 'unit': self.min_open_length_unit}
                if self.min_open_length_value
                else None
            ),
            'earlyTerminationFee': self.early_termination_fee,
            'minimumBalanceRequirement': self.min_balance_requirement,
            'notes': self.notes or '',
            'requirements': [r.to_dict() for r in self.requirements],
            'directDepositDates': json.loads(self.direct_deposit_dates) if self.direct_deposit_dates else [],
            'status': self.status,
            'createdAt': self.created_at,
        }

    @classmethod
    def from_dict(cls, data):
        bonus_id = data.get('id', str(uuid.uuid4()))
        min_open = data.get('minimumOpenLength')
        return cls(
            id=bonus_id,
            bank_name=data.get('bankName', ''),
            account_type=data.get('accountType', 'personal_checking'),
            date_opened=data.get('dateOpened', ''),
            bonus_amount=float(data.get('bonusAmount', 0)),
            bonus_deadline=data.get('bonusDeadline', ''),
            account_close_date=data.get('accountCloseDate', ''),
            min_open_length_value=min_open['value'] if min_open and min_open.get('value') else None,
            min_open_length_unit=min_open['unit'] if min_open and min_open.get('value') else None,
            early_termination_fee=data.get('earlyTerminationFee'),
            min_balance_requirement=data.get('minimumBalanceRequirement'),
            notes=data.get('notes', ''),
            status=data.get('status', 'active'),
            created_at=data.get('createdAt', datetime.now(timezone.utc).isoformat()),
            direct_deposit_dates=json.dumps(data.get('directDepositDates', [])),
        )


class Requirement(db.Model):
    __tablename__ = 'requirements'

    id = db.Column(db.String(36), primary_key=True)
    bonus_id = db.Column(db.String(36), db.ForeignKey('bonuses.id'), nullable=False)
    type = db.Column(db.String(50), nullable=False)
    description = db.Column(db.String(500), nullable=False)
    target_amount = db.Column(db.Float, nullable=False)
    current_progress = db.Column(db.Float, default=0)
    per_unit_minimum = db.Column(db.Float, nullable=True)
    completed = db.Column(db.Boolean, default=False)

    def to_dict(self):
        return {
            'id': self.id,
            'type': self.type,
            'description': self.description,
            'targetAmount': self.target_amount,
            'currentProgress': self.current_progress,
            'perUnitMinimum': self.per_unit_minimum,
            'completed': self.completed,
        }
