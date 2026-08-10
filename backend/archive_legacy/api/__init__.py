from flask import Blueprint

system_bp = Blueprint('system', __name__)
notes_bp = Blueprint('notes', __name__)
appointments_bp = Blueprint('appointments', __name__)
alerts_bp = Blueprint('alerts', __name__)
documents_bp = Blueprint('documents', __name__)

__all__ = ["system_bp", "notes_bp", "appointments_bp", "alerts_bp", "documents_bp"]
