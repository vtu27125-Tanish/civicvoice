-- CivicVoice Database Schema (MySQL)

CREATE DATABASE IF NOT EXISTS civicvoice;
USE civicvoice;

-- Users: citizens and officials
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('citizen', 'official', 'admin') DEFAULT 'citizen',
    language_pref VARCHAR(20) DEFAULT 'en',
    department_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Departments (Water, Electricity, Roads, Sanitation, etc.)
CREATE TABLE departments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category_mapping VARCHAR(100) NOT NULL,
    contact_email VARCHAR(150),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Reports: the core complaint/grievance table
CREATE TABLE reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    category ENUM('pothole', 'water', 'electricity', 'garbage', 'sewage', 'streetlight', 'other') DEFAULT 'other',
    description TEXT NOT NULL,
    transcript TEXT NULL,              -- raw voice-to-text transcript if voice used
    original_language VARCHAR(20) DEFAULT 'en',
    urgency_score ENUM('low', 'medium', 'high') DEFAULT 'medium',
    status ENUM('reported', 'verified', 'assigned', 'in_progress', 'resolved', 'rejected') DEFAULT 'reported',
    department_id INT NULL,
    lat DECIMAL(10, 8) NOT NULL,
    lng DECIMAL(11, 8) NOT NULL,
    address_text VARCHAR(255) NULL,
    is_duplicate BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
);

-- Status history: audit trail of status changes
CREATE TABLE report_status_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    report_id INT NOT NULL,
    status ENUM('reported', 'verified', 'assigned', 'in_progress', 'resolved', 'rejected') NOT NULL,
    updated_by INT NULL,               -- official's user_id, NULL if system-generated
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Images attached to reports
CREATE TABLE report_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    report_id INT NOT NULL,
    image_url VARCHAR(500) NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
);

-- Duplicate report links (merged complaints on same issue)
CREATE TABLE duplicate_links (
    id INT AUTO_INCREMENT PRIMARY KEY,
    original_report_id INT NOT NULL,
    duplicate_report_id INT NOT NULL,
    similarity_score DECIMAL(5, 4) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (original_report_id) REFERENCES reports(id) ON DELETE CASCADE,
    FOREIGN KEY (duplicate_report_id) REFERENCES reports(id) ON DELETE CASCADE
);

-- Precomputed hotspot clusters (updated periodically by ML service)
CREATE TABLE hotspots (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cluster_lat DECIMAL(10, 8) NOT NULL,
    cluster_lng DECIMAL(11, 8) NOT NULL,
    report_count INT DEFAULT 0,
    dominant_category VARCHAR(50) NULL,
    radius_meters INT DEFAULT 200,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Helpful indexes for common queries
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_category ON reports(category);
CREATE INDEX idx_reports_location ON reports(lat, lng);
CREATE INDEX idx_reports_user ON reports(user_id);

-- Seed default departments
INSERT INTO departments (name, category_mapping) VALUES
('Roads & Infrastructure', 'pothole'),
('Water Board', 'water'),
('Electricity Board', 'electricity'),
('Sanitation Dept', 'garbage'),
('Sewage Dept', 'sewage'),
('Street Lighting', 'streetlight');
