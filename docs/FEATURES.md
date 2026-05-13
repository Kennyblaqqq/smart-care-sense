# Key Features

Smart Care Sense provides a comprehensive suite of tools for health monitoring and management.

## 1. Live Health Dashboard
The central hub for all your vitals.
- **Real-Time Vitals**: Track Heart Rate (BPM), Blood Pressure (mmHg), SpO2 (%), Respiratory Rate, Steps, and Calories.
- **Dynamic Charts**: Interactive history sparklines for each metric to visualize trends over the last 24 hours.
- **ECG Visualization**: A dedicated live-streaming ECG wave component for monitoring heart rhythm.
- **Live Status Indicators**: Visual feedback when data is streaming live from a device.

## 2. AI Health Assistant
A personalized medical-grade chat interface.
- **Vitals Integration**: The assistant "sees" your recent vitals to provide context-aware answers.
- **Natural Language Querying**: Ask questions like "What does my heart rate trend mean?" or "How can I improve my sleep?"
- **Evidence-Based Guidance**: Powered by RAG (Retrieval-Augmented Generation) to ensure advice is grounded in curated medical guidelines.
- **Markdown Support**: Richly formatted responses for better readability.

## 3. Advanced Device Management
Flexible connectivity options for any hardware.
- **Bluetooth LE (BLE)**: Connect standard heart rate monitors and smartwatches directly from the browser using the Web Bluetooth API.
- **Wi-Fi / HTTP Ingestion**: Register custom IoT devices (like ESP32/Arduino) to send data over the internet.
- **API Key Management**: Securely generate and manage one-time API keys for Wi-Fi devices.
- **Device Status Tracking**: Monitor "Last Seen" timestamps and connectivity health for all paired hardware.

## 4. Intelligent Alerts System
Proactive monitoring for your safety.
- **Threshold Detection**: Automatically detects abnormal readings based on predefined medical ranges.
- **Alert Categories**: Categorizes alerts into Critical, Warning, and Info for better prioritization.
- **History Log**: Keeps a record of past alerts for clinical review.

## 5. Secure User Profiles
Personalized and private data management.
- **Secure Authentication**: Robust login and registration powered by Supabase Auth.
- **Profile Customization**: Manage personal details and health goals.
- **Protected Routes**: Ensures your health data is only accessible to you.
