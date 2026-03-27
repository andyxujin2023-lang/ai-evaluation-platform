import sqlite3
import json
from contextlib import contextmanager
from typing import List, Dict, Any, Optional
from pathlib import Path
from .config import get_settings

settings = get_settings()


def get_db_path():
    db_url = settings.DATABASE_URL
    if db_url.startswith("sqlite:///"):
        return db_url.replace("sqlite:///", "")
    return "ai_evaluation.db"


@contextmanager
def get_db_connection():
    db_path = get_db_path()
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_database():
    db_path = get_db_path()
    schema_path = Path(__file__).parent.parent.parent / "init_db.sql"

    with open(schema_path, "r", encoding="utf-8") as f:
        schema = f.read()

    with sqlite3.connect(db_path) as conn:
        conn.executescript(schema)


def dict_factory(row: sqlite3.Row) -> Dict[str, Any]:
    d = dict(row)
    for key in d:
        if key in ["keywords"] and d[key]:
            try:
                d[key] = json.loads(d[key])
            except (json.JSONDecodeError, TypeError):
                pass
    return d
