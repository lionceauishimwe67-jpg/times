import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { smartTimetableApi, timetableApi } from '../../services/api';
import { TimetableCardsGrid, mapIdEntriesToLessons } from '../../components/TimetableCards';
import { SchoolTimetableGrid } from '../../components/SchoolTimetableGrid';
import { FIXED_SCHOOL_CHRONO_SLOTS, STANDARD_SCHOOL_SLOTS } from '../../config/schoolTimetableFormat';
import './SmartTimetableSystem.css';

interface UploadResult {
  uploadId: number;
  chronogram: any;
  meta: any;
}

interface ValidationResult {
  isValid: boolean;
  errors: any[];
  warnings: string[];
  matchedTeachers: any[];
  matchedSubjects: any[];
}

interface GenerationResult {
  generationId: number;
  entries: any[];
  conflicts: string[];
  warnings: string[];
  entryCount: number;
  className: string;
}

interface CurrentActivity {
  currentActivity: string;
  currentLesson: any;
  nextLesson: any;
  breakTime: any;
  lunchTime: any;
  endOfClasses: boolean;
  scheduleEmpty: boolean;
  remainingMinutes: number;
}

type UploadMode = 'file' | 'chrono' | 'template';

const STS: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard'|'upload'|'analyze'|'generate'|'preview'|'activity'>('dashboard');
  const [uploadMode, setUploadMode] = useState<UploadMode>('chrono');
  const [file, setFile] = useState<File|null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<UploadResult|null>(null);
  const [validation, setValidation] = useState<ValidationResult|null>(null);
  const [validating, setValidating] = useState(false);
  const [generation, setGeneration] = useState<GenerationResult|null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [err, setErr] = useState('');
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<number|''>('');
  const [refData, setRefData] = useState<any>(null);
  const [currentActivity, setCurrentActivity] = useState<CurrentActivity|null>(null);
  const [realTime, setRealTime] = useState<string>('');
  const [history, setHistory] = useState<any[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<'none'|'history'|'timetable'|'full'>('none');
  const [deletingId, setDeletingId] = useState<number|null>(null);
  const [deleting, setDeleting] = useState(false);
  const [isJsonFile, setIsJsonFile] = useState(false);
  const [previewView, setPreviewView] = useState<'school' | 'cards'>('school');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadRefData();
    loadHistory();
  }, []);

  useEffect(() => {
    if (selectedClass && activeTab === 'activity') {
      fetchActivity();
      const id = setInterval(fetchActivity, 30000);
      return () => clearInterval(id);
    }
  }, [selectedClass, activeTab]);

  useEffect(() => {
    const id = setInterval(() => {
      const now = new Date();
      setRealTime(now.toLocaleTimeString('en-GB', { hour12: false }));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const loadRefData = async () => {
    try {
      const r = await timetableApi.getReferenceData();
      const d = r.data?.data || r.data;
      setClasses(d?.classes || []);
      setRefData(d);
    } catch (e: any) {
      setErr('Failed to load reference data');
    }
  };

  const loadHistory = async () => {
    try {
      const r = await smartTimetableApi.getHistory();
      setHistory(r.data?.data || []);
    } catch { /* ignore */ }
  };

  const fetchActivity = async () => {
    if (!selectedClass) return;
    try {
      const r = await smartTimetableApi.getCurrentActivity(selectedClass as number);
      setCurrentActivity(r.data?.data || null);
    } catch { setCurrentActivity(null); }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setErr('');
      setUploadResult(null);
      setValidation(null);
      setGeneration(null);
      const json = f.name.toLowerCase().endsWith('.json');
      setIsJsonFile(json);
      if (json) setUploadMode('template');
    }
  };

  const downloadTemplate = () => {
    const a = document.createElement('a');
    a.href = '/timetable-template.json';
    a.download = 'timetable-template.json';
    a.click();
  };

  const exportChronogramJson = () => {
    const blob = new Blob([JSON.stringify({ timeSlots: FIXED_SCHOOL_CHRONO_SLOTS, classId: selectedClass || undefined, note: 'Amasaha ntahinduka — format y\'ishuri ifite agaciro gusa' }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chronogram-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const applyGenerationResponse = async (data: GenerationResult | null) => {
    if (!data) return;
    setGeneration(data);
    setActiveTab('preview');
    loadHistory();
    if (data.generationId) {
      setSaving(true);
      try {
        await smartTimetableApi.saveTimetable(data.generationId);
        setSaveMsg('Timetable yakozwe kandi yabitswe — reba mu Full Timetable View');
      } catch (e: any) {
        setSaveMsg(e.response?.data?.error || 'Yakozwe ariko kubika byanze — kanda Save');
      } finally {
        setSaving(false);
      }
    }
  };

  const doGenerateFromSlots = async () => {
    if (!selectedClass) { setErr('Hitamo ishuri (class) mbere yo gukora timetable'); return; }
    setGenerating(true); setErr('');
    try {
      const r = await smartTimetableApi.generateFromChronogram({
        classId: selectedClass,
      });
      await applyGenerationResponse(r.data?.data || null);
    } catch (e: any) {
      setErr(e.response?.data?.error || 'Gukora timetable byanze');
    } finally { setGenerating(false); }
  };

  const doUpload = async () => {
    if (uploadMode === 'chrono') {
      await doGenerateFromSlots();
      return;
    }
    if (!file) { setErr('Hitamo dosiye ya chronogram'); return; }
    if (!selectedClass && uploadMode === 'template') {
      setErr('Hitamo ishuri (class) mbere yo gukora timetable');
      return;
    }
    setUploading(true); setErr(''); setUploadProgress(0);
    try {
      if (uploadMode === 'template') {
        const jsonContent = await file.text();
        const payload = JSON.parse(jsonContent);
        if (!payload.classId && selectedClass) payload.classId = selectedClass;
        if (!payload.classId) {
          setErr('JSON template igomba kugira classId cyangwa hitamo ishuri hejuru');
          return;
        }
        setUploadProgress(50);
        const r = await smartTimetableApi.generateFromChronogram(payload);
        await applyGenerationResponse(r.data?.data || null);
      } else {
        const r = await smartTimetableApi.uploadChronogram(file, (p) => setUploadProgress(p));
        setUploadResult(r.data);
        if (r.data?.chronogram?.className) {
          const match = classes.find((c) =>
            c.name?.toLowerCase() === r.data.chronogram.className?.toLowerCase() ||
            c.name?.toLowerCase().includes(r.data.chronogram.className?.toLowerCase())
          );
          if (match) setSelectedClass(match.id);
        }
        setActiveTab('analyze');
      }
    } catch (e: any) {
      setErr(e.response?.data?.error || 'Upload failed');
    } finally { setUploading(false); }
  };

  const doValidate = async () => {
    if (!uploadResult?.uploadId) { setErr('Upload a chronogram first'); return; }
    setValidating(true); setErr('');
    try {
      const r = await smartTimetableApi.validateChronogram(uploadResult.uploadId);
      setValidation(r.data?.data || null);
      setActiveTab('generate');
    } catch (e: any) {
      setErr(e.response?.data?.error || 'Validation failed');
    } finally { setValidating(false); }
  };

  const doGenerate = async () => {
    if (!uploadResult?.uploadId || !selectedClass) { setErr('Select a class and upload a chronogram'); return; }
    setGenerating(true); setErr(''); setGeneration(null);
    try {
      const r = await smartTimetableApi.generateTimetable(uploadResult.uploadId, selectedClass as number);
      await applyGenerationResponse(r.data?.data || null);
    } catch (e: any) {
      setErr(e.response?.data?.error || 'Generation failed');
    } finally { setGenerating(false); }
  };

  const doSave = async () => {
    if (!generation?.generationId) return;
    setSaving(true); setSaveMsg('');
    try {
      await smartTimetableApi.saveTimetable(generation.generationId);
      setSaveMsg('Timetable saved successfully!');
      loadHistory();
    } catch (e: any) {
      setSaveMsg(e.response?.data?.error || 'Save failed');
    } finally { setSaving(false); }
  };

  const doExport = async (format: 'excel'|'csv'|'pdf') => {
    if (!generation?.generationId && !selectedClass) { setErr('Nothing to export'); return; }
    try {
      const res = await smartTimetableApi.exportTimetable({ generationId: generation?.generationId, classId: selectedClass ? +selectedClass : undefined, format });
      const blob = res.data as Blob;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `timetable.${format === 'excel' ? 'xlsx' : format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setErr('Export failed');
    }
  };

  const doDeleteAllHistory = async () => {
    setDeleting(true); setErr('');
    try {
      await smartTimetableApi.deleteAllHistory(selectedClass ? +selectedClass : undefined);
      setHistory([]);
      setSaveMsg('All history deleted successfully');
      setShowDeleteConfirm('none');
    } catch (e: any) {
      setErr(e.response?.data?.error || 'Failed to delete history');
    } finally { setDeleting(false); }
  };

  const doDeleteAllTimetable = async () => {
    setDeleting(true); setErr('');
    try {
      await smartTimetableApi.deleteAllTimetable(selectedClass ? +selectedClass : undefined);
      setSaveMsg('All timetable entries deleted successfully');
      setShowDeleteConfirm('none');
      loadHistory();
    } catch (e: any) {
      setErr(e.response?.data?.error || 'Failed to delete timetable');
    } finally { setDeleting(false); }
  };

  const doFullReset = async () => {
    setDeleting(true); setErr('');
    try {
      await smartTimetableApi.fullReset(selectedClass ? +selectedClass : undefined);
      setHistory([]);
      setGeneration(null);
      setUploadResult(null);
      setValidation(null);
      setSaveMsg('Full timetable reset completed successfully');
      setShowDeleteConfirm('none');
    } catch (e: any) {
      setErr(e.response?.data?.error || 'Failed to reset timetable');
    } finally { setDeleting(false); }
  };

  const getSubjectName = (subjectId: number) => refData?.subjects?.find((s: any) => s.id === subjectId)?.name || 'Unknown';
  const getTeacherName = (teacherId: number) => refData?.teachers?.find((t: any) => t.id === teacherId)?.name || 'Unassigned';
  const getClassroomName = (classroomId: number) => refData?.classrooms?.find((c: any) => c.id === classroomId)?.name || '';

  const previewLessons = useMemo(() => {
    if (!generation?.entries?.length || !refData) return [];
    return mapIdEntriesToLessons(generation.entries, refData);
  }, [generation, refData]);

  const dashboardStats = useMemo(() => [
    { icon: '🏫', label: 'Amashuri (Classes)', value: String(classes.length), color: '#3b82f6' },
    { icon: '👨‍🏫', label: 'Abarimu', value: String(refData?.teachers?.length ?? 0), color: '#10b981' },
    { icon: '📚', label: 'Amasomo', value: String(refData?.subjects?.length ?? 0), color: '#8b5cf6' },
    {
      icon: '📋',
      label: 'Generations',
      value: String(history.length),
      color: '#f59e0b',
    },
  ], [classes.length, refData, history.length]);

  const workflowSteps = useMemo(
    () => [
      { id: 'upload' as const, num: 1, label: 'Chronogram', done: !!uploadResult || !!generation },
      { id: 'analyze' as const, num: 2, label: 'Analysis', done: !!validation },
      { id: 'generate' as const, num: 3, label: 'Generate', done: !!generation },
      { id: 'preview' as const, num: 4, label: 'Preview & Save', done: !!generation?.generationId },
    ],
    [uploadResult, validation, generation]
  );

  const lastHistory = history[0];

  const workflowProgress = useMemo(() => {
    const done = workflowSteps.filter((s) => s.done).length;
    return Math.round((done / workflowSteps.length) * 100);
  }, [workflowSteps]);

  return (
    <div className="sts-container">
      <header className="sts-header">
        <div>
          <h1>Smart School Timetable System</h1>
          <p className="sts-subtitle">Shyiramo chronogram — sisitemu ikora timetable</p>
        </div>
        <div className="sts-clock">{realTime}</div>
      </header>

      {err && <div className="sts-alert sts-alert-err" onClick={() => setErr('')}>{err} <span className="sts-close">×</span></div>}
      {saveMsg && <div className={`sts-alert ${saveMsg.includes('success') || saveMsg.includes('neza') ? 'sts-alert-ok' : 'sts-alert-err'}`} onClick={() => setSaveMsg('')}>{saveMsg} <span className="sts-close">×</span></div>}

      <nav className="sts-tabs">
        <button type="button" className={activeTab==='dashboard'?'active':''} onClick={()=>setActiveTab('dashboard')}>Dashboard</button>
        <button type="button" className={activeTab==='upload'?'active':''} onClick={()=>setActiveTab('upload')}>1. Chronogram</button>
        <button type="button" className={activeTab==='analyze'?'active':''} onClick={()=>setActiveTab('analyze')} disabled={!uploadResult}>2. Analysis</button>
        <button type="button" className={activeTab==='generate'?'active':''} onClick={()=>setActiveTab('generate')} disabled={!validation}>3. Generate</button>
        <button type="button" className={activeTab==='preview'?'active':''} onClick={()=>setActiveTab('preview')} disabled={!generation}>4. Preview</button>
        <button type="button" className={activeTab==='activity'?'active':''} onClick={()=>setActiveTab('activity')}>Live</button>
      </nav>

      <div className="sts-main">
        {activeTab === 'dashboard' && (
          <section className="sts-panel sts-dashboard-panel">
            <div className="sts-dash-hero">
              <div className="sts-dash-hero-text">
                <span className="sts-dash-badge">AI Timetable</span>
                <h2>Professional Timetable Control</h2>
                <p>Generate, preview, and publish school timetables using the official period format (Mon–Fri grid).</p>
              </div>
              <div className="sts-dash-hero-actions">
                <div className="sts-form-row sts-dash-class">
                  <label>Active class</label>
                  <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value ? +e.target.value : '')}>
                    <option value="">Select class...</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                {selectedClass && (
                  <Link className="sts-btn sts-btn-outline" to={`/admin/timetable/view?classId=${selectedClass}`}>
                    Open Full Timetable
                  </Link>
                )}
              </div>
            </div>

            <div className="sts-dash-progress">
              <div className="sts-dash-progress-head">
                <span>Workflow completion</span>
                <strong>{workflowProgress}%</strong>
              </div>
              <div className="sts-dash-progress-bar">
                <div className="sts-dash-progress-fill" style={{ width: `${workflowProgress}%` }} />
              </div>
            </div>

            <div className="sts-stats-grid">
              {dashboardStats.map((stat, i) => (
                <div key={i} className="sts-stat-card" style={{ '--sts-stat-color': stat.color } as React.CSSProperties}>
                  <span className="sts-stat-icon">{stat.icon}</span>
                  <div>
                    <div className="sts-stat-label">{stat.label}</div>
                    <div className="sts-stat-value">{stat.value}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="sts-workflow">
              <h3>Workflow steps</h3>
              <div className="sts-workflow-steps">
                {workflowSteps.map((step) => (
                  <button
                    key={step.id}
                    type="button"
                    className={`sts-workflow-step ${step.done ? 'done' : ''}`}
                    onClick={() => setActiveTab(step.id)}
                    disabled={step.id === 'analyze' && !uploadResult}
                  >
                    <span className="sts-step-num">{step.done ? '✓' : step.num}</span>
                    <span>{step.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="sts-dash-actions-grid">
              <button
                type="button"
                className="sts-dash-action-card"
                onClick={() => { setUploadMode('chrono'); setActiveTab('upload'); }}
              >
                <span className="sts-dash-action-icon">⏰</span>
                <strong>Amasaha (Chronogram)</strong>
                <p>Andika periods, ukande Kora Timetable</p>
              </button>
              <button
                type="button"
                className="sts-dash-action-card"
                onClick={() => { setUploadMode('file'); setActiveTab('upload'); }}
              >
                <span className="sts-dash-action-icon">📄</span>
                <strong>Upload PDF/Excel</strong>
                <p>AI isuzuma chronogram yawe</p>
              </button>
              <button
                type="button"
                className="sts-dash-action-card"
                onClick={() => { setUploadMode('template'); setActiveTab('upload'); }}
              >
                <span className="sts-dash-action-icon">📋</span>
                <strong>JSON Template</strong>
                <p>Upload template yuzuye</p>
              </button>
              <button
                type="button"
                className="sts-dash-action-card"
                onClick={() => setActiveTab('preview')}
                disabled={!generation}
              >
                <span className="sts-dash-action-icon">👁</span>
                <strong>Preview Timetable</strong>
                <p>{generation ? `${generation.entryCount} entries` : 'Banza ukore timetable'}</p>
              </button>
              <button
                type="button"
                className="sts-dash-action-card"
                onClick={() => setActiveTab('activity')}
              >
                <span className="sts-dash-action-icon">📡</span>
                <strong>Live Activity</strong>
                <p>Reba icyo bigenda ubu</p>
              </button>
              <button
                type="button"
                className="sts-dash-action-card sts-dash-action-outline"
                onClick={() => window.open('/display', '_blank')}
              >
                <span className="sts-dash-action-icon">📺</span>
                <strong>Display Screen</strong>
                <p>Fungura ecran y&apos;ishuri</p>
              </button>
            </div>

            {generation && (
              <div className="sts-dash-summary sts-dash-summary-pro">
                <div>
                  <h3>Latest generation</h3>
                  <p className="sts-dash-summary-meta">
                    <span className="sts-pill">{generation.className}</span>
                    <span>{generation.entryCount} lessons</span>
                    <span className={generation.conflicts.length ? 'sts-pill-warn' : 'sts-pill-ok'}>
                      {generation.conflicts.length} conflicts
                    </span>
                  </p>
                </div>
                <div className="sts-actions">
                  <button type="button" className="sts-btn-primary" onClick={() => setActiveTab('preview')}>Preview grid</button>
                  {selectedClass && (
                    <Link className="sts-btn" to={`/admin/timetable/view?classId=${selectedClass}`}>Full view</Link>
                  )}
                  <button type="button" className="sts-btn-success" onClick={doSave} disabled={saving}>
                    {saving ? 'Saving...' : 'Save again'}
                  </button>
                </div>
              </div>
            )}

            {lastHistory && (
              <div className="sts-dash-recent">
                <h3>Iheruka (Recent)</h3>
                <p>
                  <strong>{lastHistory.class_name}</strong> — {new Date(lastHistory.created_at).toLocaleString()}
                  {' · '}{lastHistory.chronogram_name || 'Chronogram'}
                </p>
              </div>
            )}
          </section>
        )}

        {activeTab==='upload' && (
          <section className="sts-panel">
            <h2>1. Shyiramo Chronogram</h2>
            <p className="sts-hint">Amasaha ni format y&apos;ishuri gusa (ntibihinduka). Upload PDF/Excel cyangwa JSON kugira ngo ushyiremo amasomo.</p>

            <div className="sts-mode-tabs">
              <button type="button" className={uploadMode==='chrono'?'active':''} onClick={()=>setUploadMode('chrono')}>Amasaha (Chronogram)</button>
              <button type="button" className={uploadMode==='file'?'active':''} onClick={()=>setUploadMode('file')}>Upload PDF/Excel</button>
              <button type="button" className={uploadMode==='template'?'active':''} onClick={()=>setUploadMode('template')}>JSON Template</button>
            </div>

            <div className="sts-form-row">
              <label>Ishuri (Class) *</label>
              <select value={selectedClass} onChange={e=>setSelectedClass(e.target.value?+e.target.value:'')}>
                <option value="">Hitamo ishuri...</option>
                {classes.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            {uploadMode === 'chrono' && (
              <>
                <p className="sts-hint sts-hint-locked">
                  Amasaha ni format y&apos;ishuri — ntibishobora guhindurwa. Hitamo class ukande Kora Timetable.
                </p>
                <div className="sts-chrono-table-wrap sts-chrono-readonly">
                  <table className="sts-chrono-table">
                    <thead><tr><th>Izina</th><th>Guhera</th><th>Gusoza</th><th>Break</th><th>Lunch</th></tr></thead>
                    <tbody>
                      {FIXED_SCHOOL_CHRONO_SLOTS.map((slot, i) => (
                        <tr key={i} className={slot.isBreak ? 'sts-chrono-break' : slot.isLunch ? 'sts-chrono-lunch' : ''}>
                          <td>{slot.label}</td>
                          <td>{slot.startTime}</td>
                          <td>{slot.endTime}</td>
                          <td>{slot.isBreak ? '✓' : ''}</td>
                          <td>{slot.isLunch ? '✓' : ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="sts-actions">
                  <button type="button" className="sts-btn" onClick={exportChronogramJson}>Export JSON</button>
                  <button type="button" className="sts-btn-primary" onClick={doGenerateFromSlots} disabled={generating||!selectedClass}>
                    {generating ? 'Birimo gukorwa...' : 'Kora Timetable'}
                  </button>
                </div>
              </>
            )}

            {uploadMode === 'file' && (
              <>
                <div className="sts-instructions">
                  <h4>Dosiye yemewe (PDF / Excel / Word / image)</h4>
                  <ul>
                    <li><strong>Excel/CSV:</strong> Grid ifite amasaha n&apos;amasomo (urugero: MATH(19))</li>
                    <li><strong>PDF/Word:</strong> Chronogram cyangwa timetable y&apos;ishuri</li>
                    <li><strong>Images:</strong> Scan — OCR izagerageza gusoma</li>
                  </ul>
                  <p><em>Nyuma yo gusuzuma: Validate → Generate → Preview → Save</em></p>
                </div>
                <div
                  className="sts-upload-zone"
                  onClick={() => fileRef.current?.click()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const f = e.dataTransfer.files[0];
                    if (f) {
                      setFile(f);
                      setErr('');
                      setIsJsonFile(false);
                    }
                  }}
                  onDragOver={(e) => e.preventDefault()}
                >
                  <input
                    type="file"
                    ref={fileRef}
                    style={{ display: 'none' }}
                    accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.txt,.png,.jpg,.jpeg,.bmp,.webp,.tiff"
                    onChange={handleFile}
                  />
                  <div className="sts-upload-icon">Upload</div>
                  <p>{file ? file.name : 'Kurura dosiye hano cyangwa kanda'}</p>
                  {file && <span className="sts-meta">{Math.round(file.size / 1024)} KB</span>}
                </div>
                {uploading && (
                  <div className="sts-progress">
                    <div className="sts-progress-bar" style={{ width: `${uploadProgress}%` }} />
                    <span>Gusuzuma chronogram... {uploadProgress}%</span>
                  </div>
                )}
                <div className="sts-actions">
                  <button type="button" className="sts-btn-primary" onClick={doUpload} disabled={!file || uploading}>
                    {uploading ? 'Birimo...' : 'Suzuma Chronogram (AI)'}
                  </button>
                </div>
                {uploadResult && (
                  <div className="sts-result-box">
                    <h4>Byabonetse</h4>
                    <p><strong>Amasomo:</strong> {uploadResult.chronogram?.subjects?.length || 0}</p>
                    <p><strong>Amasaha (format y&apos;ishuri):</strong> {STANDARD_SCHOOL_SLOTS.length} slots — ntibishobora guhindurwa</p>
                    <p><strong>Class:</strong> {uploadResult.chronogram?.className || 'Ntabwo byabonetse'}</p>
                  </div>
                )}
              </>
            )}

            {uploadMode === 'template' && (
              <>
                <div className="sts-instructions">
                  <h4>JSON Template</h4>
                  <p>Upload <code>timetable-template.json</code> — hitamo ishuri (class) hejuru.</p>
                  <ul>
                    <li><strong>classes</strong>, <strong>subjects</strong>, <strong>time_slots</strong>, <strong>classId</strong></li>
                  </ul>
                  <button type="button" className="sts-btn" onClick={downloadTemplate}>Download template</button>
                </div>
                <div className="sts-upload-zone" onClick={() => fileRef.current?.click()}>
                  <input type="file" ref={fileRef} style={{ display: 'none' }} accept=".json" onChange={handleFile} />
                  <p>{file ? file.name : 'Hitamo fichier JSON'}</p>
                </div>
                {uploading && (
                  <div className="sts-progress">
                    <div className="sts-progress-bar" style={{ width: `${uploadProgress}%` }} />
                    <span>Gukora timetable... {uploadProgress}%</span>
                  </div>
                )}
                <div className="sts-actions">
                  <button type="button" className="sts-btn-primary" onClick={doUpload} disabled={!file || uploading || !selectedClass}>
                    {uploading ? 'Birimo...' : 'Kora Timetable'}
                  </button>
                </div>
              </>
            )}
          </section>
        )}

        {activeTab==='analyze' && (
          <section className="sts-panel">
            <h2>AI Analysis & Validation</h2>
            <div className="sts-actions">
              <button className="sts-btn-primary" onClick={doValidate} disabled={validating}>{validating?'Validating...':'✅ Validate Against Database'}</button>
            </div>
            {validation && (
              <div className="sts-validation">
                <div className={`sts-val-status ${validation.isValid?'ok':'warn'}`}>
                  {validation.isValid ? 'All data validated successfully' : `${validation.errors.length} issues found`}
                </div>
                {validation.warnings.length > 0 && (
                  <div className="sts-val-section">
                    <h4>Warnings ({validation.warnings.length})</h4>
                    <ul>{validation.warnings.map((w,i)=><li key={i}>{w}</li>)}</ul>
                  </div>
                )}
                {validation.errors.length > 0 && (
                  <div className="sts-val-section sts-val-err">
                    <h4>Errors ({validation.errors.length})</h4>
                    <ul>{validation.errors.map((e,i)=><li key={i}><strong>{e.type}:</strong> {e.message}</li>)}</ul>
                  </div>
                )}
                {validation.matchedTeachers.length > 0 && (
                  <div className="sts-val-section">
                    <h4>Matched Teachers ({validation.matchedTeachers.length})</h4>
                    <ul>{validation.matchedTeachers.map((m,i)=><li key={i}>{m.dbTeacher?.name} → {m.chronogramSubject?.name}</li>)}</ul>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {activeTab==='generate' && (
          <section className="sts-panel">
            <h2>Smart Generation Settings</h2>
            <div className="sts-form-row">
              <label>Target Class</label>
              <select value={selectedClass} onChange={e=>setSelectedClass(e.target.value?+e.target.value:'')}>
                <option value="">Select class...</option>
                {classes.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="sts-form-row">
              <label>Chronogram</label>
              <div className="sts-readonly">{uploadResult?.meta?.originalName || 'Uploaded file'}</div>
            </div>
            <div className="sts-actions">
              <button className="sts-btn-primary" onClick={doGenerate} disabled={generating||!selectedClass}>{generating?'Generating...':'⚡ Generate Smart Timetable'}</button>
            </div>
            {generation && (
              <div className="sts-gen-summary">
                <p><strong>Entries:</strong> {generation.entryCount}</p>
                <p><strong>Conflicts:</strong> {generation.conflicts.length}</p>
                <p><strong>Warnings:</strong> {generation.warnings.length}</p>
              </div>
            )}
          </section>
        )}

        {activeTab==='preview' && generation && (
          <section className="sts-panel">
            <h2>Timetable Preview</h2>
            <div className="sts-actions">
              <button className="sts-btn-success" onClick={doSave} disabled={saving}>{saving?'Saving...':'Save Again'}</button>
              {selectedClass && (
                <Link className="sts-btn" to={`/admin/timetable/view?classId=${selectedClass}`}>
                  Reba Full Timetable
                </Link>
              )}
              <button className="sts-btn" onClick={()=>doExport('excel')}>Excel</button>
              <button className="sts-btn" onClick={()=>doExport('csv')}>CSV</button>
              <button className="sts-btn" onClick={()=>doExport('pdf')}>PDF</button>
              <span className="sts-view-toggle">
                <button type="button" className={previewView==='school'?'active':''} onClick={()=>setPreviewView('school')}>School Grid</button>
                <button type="button" className={previewView==='cards'?'active':''} onClick={()=>setPreviewView('cards')}>Cards</button>
              </span>
            </div>
            {generation.conflicts.length > 0 && (
              <div className="sts-conflicts">
                <h4>Conflicts ({generation.conflicts.length})</h4>
                <ul>{generation.conflicts.map((c,i)=><li key={i}>{c}</li>)}</ul>
              </div>
            )}
            {previewView === 'cards' && (
              <TimetableCardsGrid
                lessons={previewLessons}
                groupByDay
                emptyMessage="Nta masomo yabonetse mu timetable."
                className="mt-4"
              />
            )}
            {previewView === 'school' && (
              <SchoolTimetableGrid
                entries={generation.entries}
                className={generation.className}
                getSubjectName={getSubjectName}
                getTeacherName={getTeacherName}
                getClassroomName={getClassroomName}
              />
            )}
          </section>
        )}

        {activeTab==='activity' && (
          <section className="sts-panel">
            <h2>Live Activity Monitor</h2>
            <div className="sts-form-row">
              <label>Class</label>
              <select value={selectedClass} onChange={e=>{setSelectedClass(e.target.value?+e.target.value:'');}}>
                <option value="">Select class...</option>
                {classes.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            {currentActivity && !currentActivity.scheduleEmpty && (
              <div className="sts-activity-cards">
                <div className={`sts-activity-card ${currentActivity.currentActivity==='lesson'?'active':''}`}>
                  <h3>Current Lesson</h3>
                  {currentActivity.currentLesson ? (
                    <>
                      <div className="sts-big">{currentActivity.currentLesson.subject_name}</div>
                      <div>Teacher: {currentActivity.currentLesson.teacher_name}</div>
                      <div>Room: {currentActivity.currentLesson.classroom_name}</div>
                      <div className="sts-time">{currentActivity.currentLesson.start_time} - {currentActivity.currentLesson.end_time}</div>
                      <div className="sts-remaining">{currentActivity.remainingMinutes} min remaining</div>
                    </>
                  ) : <div className="sts-none">No active lesson</div>}
                </div>
                <div className={`sts-activity-card ${currentActivity.currentActivity==='break'?'active':''}`}>
                  <h3>Break / Lunch</h3>
                  {currentActivity.breakTime ? (
                    <>
                      <div className="sts-big">Break Time</div>
                      <div>{currentActivity.breakTime.start} - {currentActivity.breakTime.end}</div>
                      <div>{Math.round(currentActivity.breakTime.durationMinutes)} min</div>
                    </>
                  ) : currentActivity.lunchTime ? (
                    <>
                      <div className="sts-big">Lunch Break</div>
                      <div>{currentActivity.lunchTime.start} - {currentActivity.lunchTime.end}</div>
                      <div>{Math.round(currentActivity.lunchTime.durationMinutes)} min</div>
                    </>
                  ) : <div className="sts-none">Not in break</div>}
                </div>
                <div className={`sts-activity-card ${currentActivity.nextLesson?'active':''}`}>
                  <h3>Next Lesson</h3>
                  {currentActivity.nextLesson ? (
                    <>
                      <div className="sts-big">{currentActivity.nextLesson.subject_name}</div>
                      <div>Teacher: {currentActivity.nextLesson.teacher_name}</div>
                      <div className="sts-time">{currentActivity.nextLesson.start_time} - {currentActivity.nextLesson.end_time}</div>
                      {currentActivity.remainingMinutes > 0 && currentActivity.currentActivity !== 'lesson' && (
                        <div className="sts-remaining">Starts in {currentActivity.remainingMinutes} min</div>
                      )}
                    </>
                  ) : <div className="sts-none">No more lessons today</div>}
                </div>
                <div className={`sts-activity-card ${currentActivity.endOfClasses?'active':''}`}>
                  <h3>End of Day</h3>
                  {currentActivity.endOfClasses ? (
                    <><div className="sts-big">Classes Over</div><div>Have a great day!</div></>
                  ) : <div className="sts-none">School day in progress</div>}
                </div>
              </div>
            )}
            {currentActivity?.scheduleEmpty && <div className="sts-empty">No schedule found for this class today.</div>}
          </section>
        )}
      </div>

      {history.length > 0 && (
        <section className="sts-history">
          <div className="sts-history-header">
            <h3>Generation History</h3>
            <div className="sts-history-actions">
              <button className="sts-btn sts-btn-sm" onClick={() => setShowDeleteConfirm('history')}>Delete History</button>
              <button className="sts-btn sts-btn-sm" onClick={() => setShowDeleteConfirm('timetable')}>Delete Timetable</button>
              <button className="sts-btn-sm sts-btn-danger" onClick={() => setShowDeleteConfirm('full')}>Full Reset</button>
            </div>
          </div>
          <div className="sts-table-wrap">
            <table className="sts-history-table">
              <thead><tr><th>Date</th><th>Class</th><th>Chronogram</th><th>Entries</th><th>Status</th><th /></tr></thead>
              <tbody>
                {history.slice(0,10).map((h,i)=>{
                  const gen = h.generated_timetable ? JSON.parse(h.generated_timetable) : [];
                  return (
                    <tr key={i}>
                      <td>{new Date(h.created_at).toLocaleString()}</td>
                      <td><span className="sts-pill">{h.class_name}</span></td>
                      <td>{h.chronogram_name || 'Manual'}</td>
                      <td className="sts-num">{Array.isArray(gen)?gen.length:0}</td>
                      <td><span className={`sts-tag ${h.validation_status==='valid'?'sts-tag-ok':'sts-tag-warn'}`}>{h.validation_status}</span></td>
                      <td><button className="sts-btn-icon" title="Delete entry" onClick={async () => { await smartTimetableApi.deleteHistory(h.id); loadHistory(); }}>✕</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {showDeleteConfirm !== 'none' && (
        <div className="sts-delete-confirm-overlay">
          <div className="sts-delete-confirm">
            <h3>Confirm Delete</h3>
            {showDeleteConfirm === 'history' && (
              <p>Are you sure you want to delete <strong>all generation history</strong>?{selectedClass ? ` (for selected class)` : ''} This cannot be undone.</p>
            )}
            {showDeleteConfirm === 'timetable' && (
              <p>Are you sure you want to delete <strong>all timetable entries</strong>?{selectedClass ? ` (for selected class)` : ''} This cannot be undone.</p>
            )}
            {showDeleteConfirm === 'full' && (
              <p>Are you sure you want to <strong>fully reset</strong> the timetable system?{selectedClass ? ` (for selected class)` : ''} This will delete ALL history, timetable entries, and uploads.</p>
            )}
            <div className="sts-delete-confirm-actions">
              <button className="sts-btn" onClick={() => setShowDeleteConfirm('none')}>Cancel</button>
              {showDeleteConfirm === 'history' && (
                <button className="sts-btn-danger" onClick={doDeleteAllHistory} disabled={deleting}>
                  {deleting ? 'Deleting...' : 'Delete All History'}
                </button>
              )}
              {showDeleteConfirm === 'timetable' && (
                <button className="sts-btn-danger" onClick={doDeleteAllTimetable} disabled={deleting}>
                  {deleting ? 'Deleting...' : 'Delete All Timetable'}
                </button>
              )}
              {showDeleteConfirm === 'full' && (
                <button className="sts-btn-danger" onClick={doFullReset} disabled={deleting}>
                  {deleting ? 'Resetting...' : 'Full Reset'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default STS;
