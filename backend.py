from flask import Flask, jsonify
import psycopg2
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend access

# Database connection configuration
DB_CONFIG = {
    "dbname": "parking_system",
    "user": "jodos",
    "password": "jodos",
    "host": "localhost",
    "port": "5432",
}


def get_db_connection():
    return psycopg2.connect(**DB_CONFIG)


# Endpoint for vehicle check-ins and check-outs
@app.route("/api/parking_entries", methods=["GET"])
def get_parking_entries():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            """
            SELECT id, entry_time, exit_time, car_plate, due_payment, payment_status
            FROM parking_entries
            ORDER BY entry_time DESC
        """
        )
        rows = cur.fetchall()
        cur.close()
        conn.close()

        # Format data for JSON response
        entries = [
            {
                "id": row[0],
                "entry_time": row[1].isoformat() if row[1] else None,
                "exit_time": row[2].isoformat() if row[2] else None,
                "car_plate": row[3],
                "due_payment": float(row[4]) if row[4] is not None else None,
                "payment_status": row[5],
            }
            for row in rows
        ]
        return jsonify(entries)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Endpoint for security incidents (unauthorized exits, etc.)
@app.route("/api/security_incidents", methods=["GET"])
def get_security_incidents():
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            """
            SELECT id, car_plate, incident_type, incident_time, description, resolved, resolution_notes, additional_info
            FROM security_incidents
            ORDER BY incident_time DESC
        """
        )
        rows = cur.fetchall()
        cur.close()
        conn.close()

        # Format data for JSON response
        incidents = [
            {
                "id": row[0],
                "car_plate": row[1],
                "incident_type": row[2],
                "incident_time": row[3].isoformat(),
                "description": row[4],
                "resolved": row[5],
                "resolution_notes": row[6],
                "additional_info": row[7],
            }
            for row in rows
        ]
        return jsonify(incidents)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
