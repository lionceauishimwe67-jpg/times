import React, { useState } from 'react';
import BreakTimeEditor from '../../components/BreakTimeEditor/BreakTimeEditor';
import DynamicEventCreator from '../../components/DynamicEventCreator/DynamicEventCreator';
import './ScheduleManagement.css';

const ScheduleManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'breaks' | 'events'>('breaks');

  return (
    <div className="schedule-management">
      <div className="schedule-header">
        <h1>⏰ Schedule Management</h1>
        <p>Manage break times and add dynamic events for urgent or unplanned activities</p>
      </div>

      <div className="schedule-tabs">
        <div className="schedule-tabs-nav">
          <button
            onClick={() => setActiveTab('breaks')}
            className={`schedule-tab-btn ${activeTab === 'breaks' ? 'active' : ''}`}
          >
            🕐 Break Times
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={`schedule-tab-btn ${activeTab === 'events' ? 'active' : ''}`}
          >
            📅 Dynamic Events
          </button>
        </div>

        <div className="schedule-content">
          {activeTab === 'breaks' ? (
            <div className="break-time-editor">
              <BreakTimeEditor />
            </div>
          ) : (
            <div className="dynamic-event-creator">
              <DynamicEventCreator />
            </div>
          )}
        </div>
      </div>

      <div className="tips-section">
        <h3>💡 Quick Tips</h3>
        <ul className="tips-list">
          <li><strong>Break Times:</strong> Configure standard break periods (morning, lunch, afternoon) that apply to specific days of the week.</li>
          <li><strong>Dynamic Events:</strong> Quickly add urgent or unplanned activities like emergency assemblies, staff meetings, or special events.</li>
          <li><strong>Notifications:</strong> When creating dynamic events, choose to notify teachers and/or students automatically.</li>
          <li><strong>Class Selection:</strong> For dynamic events, select specific affected classes or leave empty to apply to all classes.</li>
        </ul>
      </div>
    </div>
  );
};

export default ScheduleManagement;
