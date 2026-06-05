import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './Contact.css';

const Contact: React.FC = () => {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 5000);
    setForm({ name: '', email: '', subject: '', message: '' });
  };

  return (
    <div className="contact-page">
      <header className="home-header">
        <nav className="home-nav">
          <div className="nav-logo">📚 Smart School</div>
          <div className="nav-links">
            <Link to="/" className="nav-link">Home</Link>
            <Link to="/about" className="nav-link">About</Link>
            <Link to="/contact" className="nav-link active">Contact</Link>
            <Link to="/display" className="nav-link">Timetable Display</Link>
            <Link to="/admin/login" className="nav-link nav-btn">Admin Login</Link>
          </div>
        </nav>
      </header>

      <main className="contact-main">
        <div className="contact-hero">
          <h1>Contact Us</h1>
          <p>We would love to hear from you</p>
        </div>

        <div className="contact-grid">
          <div className="contact-info">
            <h2>Get in Touch</h2>
            <div className="info-items">
              <div className="info-item">
                <div className="info-icon">📍</div>
                <div>
                  <strong>Address</strong>
                  <p>School Administration Office<br />Kigali, Rwanda</p>
                </div>
              </div>
              <div className="info-item">
                <div className="info-icon">📞</div>
                <div>
                  <strong>Phone</strong>
                  <p>+250 700 000 000</p>
                </div>
              </div>
              <div className="info-item">
                <div className="info-icon">📧</div>
                <div>
                  <strong>Email</strong>
                  <p>info@smartschool.edu</p>
                </div>
              </div>
              <div className="info-item">
                <div className="info-icon">🕐</div>
                <div>
                  <strong>Office Hours</strong>
                  <p>Monday - Friday: 8:00 AM - 5:00 PM</p>
                </div>
              </div>
            </div>
          </div>

          <div className="contact-form-wrapper">
            <h2>Send a Message</h2>
            {submitted ? (
              <div className="success-message">
                <span>✅</span> Thank you for your message! We will get back to you soon.
              </div>
            ) : (
              <form className="contact-form" onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Name *</label>
                  <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" />
                </div>
                <div className="form-group">
                  <label>Email *</label>
                  <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Your email" />
                </div>
                <div className="form-group">
                  <label>Subject *</label>
                  <input required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Message subject" />
                </div>
                <div className="form-group">
                  <label>Message *</label>
                  <textarea required rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Your message..." />
                </div>
                <button type="submit" className="btn-submit">Send Message</button>
              </form>
            )}
          </div>
        </div>
      </main>

      <footer className="home-footer">
        <p>Smart School Management System &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
};

export default Contact;
