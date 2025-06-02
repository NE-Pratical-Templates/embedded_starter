import serial
import time
import serial.tools.list_ports
import platform
from datetime import datetime
import psycopg2
from psycopg2.extras import DictCursor

# Configuration
RATE_PER_HOUR = 500  # Amount charged per hour
DB_CONFIG = {
    "dbname": "parking_system",
    "user": "jodos",
    "password": "jodos",
    "host": "localhost",
    "port": "5432"
}

def get_db_connection():
    return psycopg2.connect(**DB_CONFIG)

def detect_arduino_port():
    ports = list(serial.tools.list_ports.comports())
    system = platform.system()
    for port in ports:
        if system == "Linux":
            if "ttyUSB" in port.device or "ttyACM" in port.device:
                return port.device
        elif system == "Darwin":
            if "usbmodem" in port.device or "usbserial" in port.device:
                return port.device
        elif system == "Windows":
            if "COM" in port.device:
                return port.device
    return None

def parse_arduino_data(line):
    try:
        parts = line.strip().split(",")
        print(f"[ARDUINO] Parsed parts: {parts}")
        if len(parts) != 2:
            return None, None
        plate = parts[0].strip()

        # Clean the balance string by removing non-digit characters
        balance_str = "".join(c for c in parts[1] if c.isdigit())
        print(f"[ARDUINO] Cleaned balance: {balance_str}")

        if balance_str:
            balance = int(balance_str)
            return plate, balance
        else:
            return None, None
    except ValueError as e:
        print(f"[ERROR] Value error in parsing: {e}")
        return None, None

def process_payment(plate, balance, ser):
    try:
        with get_db_connection() as conn:
            with conn.cursor(cursor_factory=DictCursor) as cur:
                # Find unpaid entry for the plate
                cur.execute("""
                    SELECT id, entry_time
                    FROM parking_entries
                    WHERE car_plate = %s AND payment_status = FALSE
                    ORDER BY entry_time DESC
                    LIMIT 1
                """, (plate,))
                
                entry = cur.fetchone()
                
                if not entry:
                    print("[PAYMENT] Plate not found or already paid.")
                    return

                entry_time = entry['entry_time']
                exit_time = datetime.now()

                # Calculate total seconds spent and convert to hours (rounded up)
                seconds_spent = (exit_time - entry_time).total_seconds()
                hours_spent = int(seconds_spent / 3600) + (1 if seconds_spent % 3600 > 0 else 0)
                amount_due = hours_spent * RATE_PER_HOUR  # Total fee

                if balance < amount_due:
                    print("[PAYMENT] Insufficient balance")
                    ser.write(b"I\n")  # Signal "Insufficient balance" to Arduino
                    return

                # Wait for Arduino to send "READY"
                print("[WAIT] Waiting for Arduino to be READY...")
                start_time = time.time()
                while True:
                    if ser.in_waiting:
                        arduino_response = ser.readline().decode().strip()
                        print(f"[ARDUINO] {arduino_response}")
                        if arduino_response == "READY":
                            break
                    if time.time() - start_time > 5:
                        print("[ERROR] Timeout waiting for Arduino READY")
                        return

                # Calculate new balance and send to Arduino
                new_balance = balance - amount_due
                ser.write(f"{new_balance}\r\n".encode())
                print(f"[PAYMENT] Sent new balance: {new_balance} RWF")

                # Wait for confirmation
                start_time = time.time()
                payment_confirmed = False
                while True:
                    if ser.in_waiting:
                        confirm = ser.readline().decode().strip()
                        print(f"[ARDUINO] {confirm}")
                        if "DONE" in confirm:
                            print("[PAYMENT] Payment confirmed!")
                            payment_confirmed = True
                            break
                    if time.time() - start_time > 10:
                        print("[ERROR] Timeout waiting for confirmation")
                        break
                    time.sleep(0.1)

                if payment_confirmed:
                    # Update the database record
                    cur.execute("""
                        UPDATE parking_entries
                        SET exit_time = %s,
                            due_payment = %s,
                            payment_status = TRUE
                        WHERE id = %s
                    """, (exit_time, amount_due, entry['id']))
                    conn.commit()
                    print(f"[DATABASE] Updated payment record for plate {plate}")

    except psycopg2.Error as e:
        print(f"[DATABASE ERROR] {e}")
        conn.rollback()
    except Exception as e:
        print(f"[ERROR] Payment processing failed: {e}")

def main():
    port = detect_arduino_port()
    if not port:
        print("[ERROR] Arduino not found")
        return

    try:
        # Test database connection
        with get_db_connection() as conn:
            print("[DATABASE] Successfully connected to PostgreSQL")

        ser = serial.Serial(port, 9600, timeout=1)
        print(f"[CONNECTED] Listening on {port}")
        time.sleep(2)

        # Flush any previous data
        ser.reset_input_buffer()

        while True:
            if ser.in_waiting:
                line = ser.readline().decode().strip()
                print(f"[SERIAL] Received: {line}")
                plate, balance = parse_arduino_data(line)
                if plate and balance is not None:
                    process_payment(plate, balance, ser)

    except KeyboardInterrupt:
        print("[EXIT] Program terminated")
    except Exception as e:
        print(f"[ERROR] {e}")
    finally:
        if 'ser' in locals():
            ser.close()

if __name__ == "__main__":
    main()