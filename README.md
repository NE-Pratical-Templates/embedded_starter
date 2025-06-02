# Automated Parking Management System

## Overview
The Automated Parking Management System is a modern solution developed by NEW MARS Company in Kigali City. It integrates Automatic Number Plate Recognition (ANPR), RFID payments, and proximity sensing to provide a seamless parking experience.

## Features

### 1. Vehicle Check-In System
- Automated license plate detection using YOLOv8 model
- Real-time video processing with OpenCV
- Proximity detection using ultrasonic sensors
- Automatic gate control system
- Entry validation and double-entry prevention
- Security incident logging for unauthorized attempts

### 2. RFID Payment System
- Contactless payment processing
- Real-time balance checking
- Automatic fee calculation (RWF 500 per hour)
- Secure card reading and writing
- Payment status verification

### 3. Vehicle Check-Out System
- Automated exit verification
- Payment status validation
- Unauthorized exit prevention
- Security alert system for unpaid exits
- Real-time logging of exit events

### 4. Security Features
- Unauthorized access prevention
- Security incident logging
- Alarm system for violations
- Double-entry detection
- Real-time monitoring capabilities

### 5. Dashboard Interface
- Real-time parking logs
- Security incident monitoring
- Payment status tracking
- Vehicle entry/exit records
- System status monitoring

## Technical Stack

### Hardware Requirements
- Arduino UNO with USB cable
- RFID Development Kit (MFRC522)
- Automated Gate Components:
  - Barrier Stand (x2)
  - Barrier Stick (x1)
  - Stepper Motor with ULN2003AN driver
  - Ultrasonic Sensor
  - Piezo Buzzer
  - LEDs (Red and Green)
  - Breadboard and Jumper Wires

### Software Stack
- **Backend:**
  - Python 3.13.3
  - Flask web framework
  - PostgreSQL database
  - OpenCV for image processing
  - YOLOv8 for license plate detection
  - Pytesseract for OCR

- **Frontend:**
  - React 19.1.0
  - TypeScript 5.8.3
  - TailwindCSS 4.1.8
  - Chart.js 4.4.9 for data visualization

### Database Schema
- Parking Entries Table
- Security Incidents Table
- Payment Records Table

## Installation

1. Clone the repository
2. Install Python dependencies
3. Install Node.js dependencies
4. Configure PostgreSQL database
5. Set up Arduino components according to the wiring diagram

## Usage

1. Start the backend server:
2. Start the frontend development server:
3. Upload Arduino sketches:
- `reading_on_rfid.ino` for RFID reader
- `payment.ino` for payment processing

4. Run the entry system:
5. Run the process payment system:
6. Run the exit system:

## Contributing
Please read CONTRIBUTING.md for details on our code of conduct and the process for submitting pull requests.

## License
This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments
- NEW MARS Company, Kigali City
- Developed by [**_Jean de Dieu NSHYIMYUMUKIZA_**] 