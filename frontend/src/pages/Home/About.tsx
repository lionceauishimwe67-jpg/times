import React from 'react';
import { Link } from 'react-router-dom';
import './About.css';

const About: React.FC = () => {
  return (
    <div className="about-page">
      <header className="home-header">
        <nav className="home-nav">
          <div className="nav-logo">📚 Smart School</div>
          <div className="nav-links">
            <Link to="/" className="nav-link">Home</Link>
            <Link to="/about" className="nav-link active">About</Link>
            <Link to="/contact" className="nav-link">Contact</Link>
            <Link to="/display" className="nav-link">Timetable Display</Link>
            <Link to="/admin/login" className="nav-link nav-btn">Admin Login</Link>
          </div>
        </nav>
      </header>

      <main className="about-main">
        <div className="about-hero">
          <h1>About Smart School</h1>
          <p>Your complete digital school management solution</p>
        </div>

        <section className="about-section">
          <h2>Our Mission</h2>
          <p>
            Smart School is designed to modernize school operations by providing an integrated platform
            for timetable management, bell automation, student records, grade tracking, announcements,
            and real-time communication. We believe technology should make school administration simpler,
            not more complicated.
          </p>
        </section>

        <section className="about-section">
          <h2>What We Offer</h2>
          <div className="offer-grid">
            <div className="offer-card">
              <div className="offer-icon">📅</div>
              <h3>Smart Timetable</h3>
              <p>Automatically generated and managed class schedules with AI-powered optimization to minimize conflicts.</p>
            </div>
            <div className="offer-card">
              <div className="offer-icon">🔔</div>
              <h3>Automated Bell System</h3>
              <p>Integrated with ESP32 devices for precise, automatic bell ringing based on your timetable.</p>
            </div>
            <div className="offer-card">
              <div className="offer-icon">📢</div>
              <h3>Digital Announcements</h3>
              <p>Display announcements and news on digital screens throughout your school campus.</p>
            </div>
            <div className="offer-card">
              <div className="offer-icon">👨‍🎓</div>
              <h3>Student Management</h3>
              <p>Complete student records including enrollment, attendance, grades, and academic history.</p>
            </div>
            <div className="offer-card">
              <div className="offer-icon">📊</div>
              <h3>Grade Tracking</h3>
              <p>Record and analyze student performance across all subjects with comprehensive analytics.</p>
            </div>
            <div className="offer-card">
              <div className="offer-icon">🎓</div>
              <h3>Alumni Network</h3>
              <p>Maintain connections with graduated students and build a strong school community.</p>
            </div>
          </div>
        </section>

        <section className="about-section">
          <h2>Technology Stack</h2>
          <ul className="tech-list">
            <li><strong>Frontend:</strong> React with TypeScript for a modern, responsive user interface</li>
            <li><strong>Backend:</strong> Node.js with Express for reliable API services</li>
            <li><strong>Database:</strong> SQLite for efficient local data storage</li>
            <li><strong>Real-time:</strong> Socket.IO for instant updates across all displays</li>
            <li><strong>Hardware:</strong> ESP32 integration for smart bell control</li>
          </ul>
        </section>
      </main>

      <footer className="home-footer">
        <p>Smart School Management System &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
};

export default About;
